import makeDebug from 'debug'
const debug = makeDebug('kalisio:kEvent:events:hooks')

export function addCreatorAsCoordinator (hook) {
  const user = hook.params.user
  let coordinators = hook.data.coordinators
  console.log(user, hook.data)
  if (user && Array.isArray(coordinators)) {
    // Add creator as coordinator if not already done
    if (!coordinators.find(coordinator => coordinator.toString() === user._id.toString())) {
      coordinators.push(user._id)
      debug('Added coordinator to event: ', user)
    }
  }
  return hook
}
