import makeDebug from 'debug'
import { getItems } from 'feathers-hooks-common'
const debug = makeDebug('kalisio:kEvent:event-logs:hooks')

export async function updatePreviousLog (hook) {
  let item = getItems(hook)
  const participant = item.participant
  const event = item.event
  if (event && participant) {
    let previousLogs = await hook.service.find({
      query: {
        $sort: { _id: -1 },
        $limit: 1,
        participant,
        event,
        lastInEvent: true
      },
      paginate: false
    })
    if (previousLogs.length > 0) {
      debug('Tagging previous log for participant ' + participant.toString() + ' on event ' + event.toString())
      await hook.service.patch(previousLogs[0]._id.toString(), { lastInEvent: false })
    }
  }
  
  return hook
}

export async function addLogDefaults (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'addLogDefaults' hook should only be used as a 'after' hook.`)
  }

  const participant = hook.data.participant
  const user = hook.params.user
  // By default we assume the user is the participant
  if (!participant && user) {
    hook.data.participant = user._id
  }
  hook.data.lastInEvent = true
  
  return hook
}

export async function sendStateNotifications (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendStateNotifications' hook should only be used as a 'after' hook.`)
  }

  let pusherService = hook.app.getService('pusher')
  if (!pusherService) return hook
  const participant = hook.result.participant
  const event = hook.result.event
  if (participant) {
    let result = await pusherService.create({
      action: 'message',
      message: hook.result.name,
      pushObject: participant.toString(),
      pushObjectService: 'users'
    })
    debug('Published event state notifications for participant ' + participant.toString() + ' on event ' + event.toString())
  }
  return hook
}
