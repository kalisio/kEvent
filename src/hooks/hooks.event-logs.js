import makeDebug from 'debug'
const debug = makeDebug('kalisio:kEvent:event-logs:hooks')

export async function sendStateNotifications (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendStateNotifications' hook should only be used as a 'after' hook.`)
  }

  let pusherService = hook.app.getService('pusher')
  if (!pusherService) return hook
  const participant = hook.result.participant
  if (participant) {
    let result = await pusherService.create({
      action: 'message',
      message: hook.result.name,
      pushObject: participant.toString(),
      pushObjectService: 'users'
    })
    debug('Published event state notifications for participant ' + participant.toString() + ' on event ' + hook.result.event.toString())
  }
  return hook
}
