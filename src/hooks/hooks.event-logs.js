import makeDebug from 'debug'
import { getItems } from 'feathers-hooks-common'
const debug = makeDebug('kalisio:kEvent:event-logs:hooks')

export async function linkWithPreviousLog (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'linkWithPreviousLog' hook should only be used as a 'before' hook.`)
  }

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
      let previousLog = previousLogs[0]
      debug('Tagging previous log for participant ' + participant.toString() + ' on event ' + event.toString())
      item.previous = previousLog._id
      // We don't need to await this one
      hook.service.patch(previousLog._id.toString(), { lastInEvent: false })
      // Copy expiry date
      item.expireAt = previousLog.expireAt
    }
    // When the first log is created we need to extract it from the source event
    if (!item.expireAt) {
      // Event service is contextual, look for context on initiator service
      const eventService = hook.app.getService('events', hook.service.context)
      if (!eventService) return Promise.reject(new Error('No valid context found to retrieve event service for initiator service ' + hook.service.name))
      let eventObject = await eventService.get(event.toString())
      // Copy expiry date
      item.expireAt = eventObject.expireAt
    }
  }
  
  return hook
}

export async function addLogDefaults (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'addLogDefaults' hook should only be used as a 'before' hook.`)
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
    await pusherService.create({
      action: 'message',
      message: hook.result.name,
      pushObject: participant.toString(),
      pushObjectService: 'users'
    })
    debug('Published event state notifications for participant ' + participant.toString() + ' on event ' + event.toString())
  }
  return hook
}
