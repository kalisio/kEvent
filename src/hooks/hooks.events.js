import logger from 'winston'
import makeDebug from 'debug'
const debug = makeDebug('kalisio:kEvent:events:hooks')

export function addCreatorAsCoordinator (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'addCreatorAsCoordinator' hook should only be used as a 'before' hook.`)
  }

  const user = hook.params.user
  let coordinators = hook.data.coordinators || []
  if (user && Array.isArray(coordinators)) {
    // Add creator as coordinator if not already done
    if (!coordinators.find(coordinator => coordinator._id.toString() === user._id.toString())) {
      coordinators.push({
        _id: user._id,
        service: 'members',
        name: user.name
      })
      hook.data.coordinators = coordinators
      debug('Added coordinator to event: ', user)
    }
  }
  return hook
}

export function sendNotifications (body) {
  return async function (hook) {
    if (hook.type !== 'after') {
      throw new Error(`The 'sendNotifications' hook should only be used as a 'after' hook.`)
    }

    let pusherService = hook.app.getService('pusher')
    if (!pusherService) return hook
    const participants = hook.result.participants || []
    let publishPromises = []
    participants.forEach(participant => {
      let participantService = participant.service
      if (hook.service.context) {
        participantService = (typeof hook.service.context === 'object' ? hook.service.context._id.toString() : hook.service.context) + '/' + participantService
      }
      publishPromises.push(pusherService.create({
        action: 'message',
        // The notification contains the event title + a given prefix
        message: {
          title: hook.result.name,
          body,
          createdAt: hook.result.createdAt,
          updatedAt: hook.result.updatedAt
        },
        pushObject: participant._id.toString(),
        pushObjectService: participantService
      }))
    })
    // We'd like to be tolerant here because the participants might have be removed from the system while the event is still alive
    //let results = await Promise.all(publishPromises)
    let results = []
    for (let i = 0; i < publishPromises.length; i++) {
      try {
        let result = await publishPromises[i]
        results.push(result)
      } catch (error) {
        logger.error(error.message, error)
      }
    }
    debug('Published event notifications on ' + results.length + ' topics/users for event ' + hook.result._id.toString())
    return hook
  }
}

