import logger from 'loglevel'
import * as mixins from './mixins'

export { mixins }
// We faced a bug in babel so that transform-runtime with export * from 'x' generates import statements in transpiled code
// Tracked here : https://github.com/babel/babel/issues/2877
// We tested the workaround given here https://github.com/babel/babel/issues/2877#issuecomment-270700000 with success so far
export * from '../common'

// FIXME: we don't build vue component anymore, they are processed by webpack in the application template
// export * from './components'

export default function init () {
  const api = this

  logger.debug('Initializing kalisio event')

  api.declareService('events', { context: true })
  api.declareService('event-logs', { context: true })
  api.declareService('event-templates', { context: true })
  api.declareService('archived-events', { context: true })
}
