import makeDebug from 'debug'
const debug = makeDebug('kalisio:kEvent:events:hooks')

export function addCreatorAsCoordinator (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'addCreatorAsCoordinator' hook should only be used as a 'before' hook.`)
  }

  const user = hook.params.user
  let coordinators = hook.data.coordinators
  if (user && Array.isArray(coordinators)) {
    // Add creator as coordinator if not already done
    if (!coordinators.find(coordinator => coordinator.toString() === user._id.toString())) {
      coordinators.push(user._id)
      debug('Added coordinator to event: ', user)
    }
  }
  return hook
}

export async function sendNotifications (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendNotifications' hook should only be used as a 'after' hook.`)
  }

  let pusherService = hook.app.getService('pusher')
  const actors = hook.result.actors
  let publishPromises = []
  actors.forEach(actor => {
    let actorService = actor.service
    if (hook.service.context) {
      actorService = (typeof hook.service.context === 'object' ? hook.service.context._id.toString() : hook.service.context) + '/' + actorService
    }
    publishPromises.push(pusherService.create({
      action: 'message',
      message: hook.result.name,
      pushObject: actor._id.toString(),
      pushObjectService: actorService
    }))
  })
  let results = await Promise.all(publishPromises)
  debug('Published notifications on ' + results.length + ' topics for event ' + hook.result._id.toString())
  return hook
}
