import makeDebug from 'debug'
import _ from 'lodash'
import logger from 'winston'
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
      await hook.service.patch(previousLog._id.toString(), { lastInEvent: false })
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
      debug('Tagging expiry date on log for participant ' + participant.toString() + ' on event ' + event.toString())
      item.expireAt = eventObject.expireAt
    }
  }
  
  return hook
}

export async function addLogDefaults (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'addLogDefaults' hook should only be used as a 'before' hook.`)
  }

  let participant = hook.data.participant
  let stakeholder = hook.data.stakeholder
  const event = hook.data.event
  const user = hook.params.user
  // By default we assume the user is the participant
  if (user) {
    if (!participant) hook.data.participant = participant = user._id
    if (!stakeholder) hook.data.stakeholder = stakeholder = 'participant'
  }
  hook.data.lastInEvent = true
  if (participant && event) {
    debug('Added default log properties for participant ' + hook.data.participant.toString() + ' on event ' + event.toString())
  }
  
  return hook
}

export async function sendStateNotifications (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendStateNotifications' hook should only be used as a 'after' hook.`)
  }

  // A notification occur only when we record the interaction of a given workflow step
  // from the coordinator toward the participant
  const interaction = _.get(hook, 'result.interaction')
  const stakeholder = _.get(hook, 'result.stakeholder')
  if (interaction && (stakeholder === 'coordinator')) {
    let pusherService = hook.app.getService('pusher')
    if (!pusherService) return hook
    const participant = hook.result.participant
    let event = hook.result.event
    if (participant && event) {
      // We need the event first to get its title
      const eventsService = hook.app.getService('events', hook.service.context)
      event = await eventsService.get(event.toString())
      // We'd like to be tolerant here because the participants might have be removed from the system while the event is still alive
      try {
        await pusherService.create({
          action: 'message',
          // The notification contains the event title + a prefix with recorded interaction
          message: '[' + interaction.value + '] - ' + event.name,
          pushObject: participant.toString(),
          pushObjectService: 'users'
        })
        debug('Published event state notifications for participant ' + participant.toString() + ' on event ' + event._id.toString())
      } catch (error) {
        logger.error(error.message, error)
      }
    }
  }
  return hook
}
