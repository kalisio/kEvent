// import makeDebug from 'debug'
// const debug = makeDebug('kalisio:kEvent:organisations:hooks')
import {
  createEventService, removeEventService,
  createEventTemplateService, removeEventTemplateService,
  createEventLogService, removeEventLogService
} from '../services'

export function createOrganisationServices (hook) {
  const app = hook.app
  // Get org DB
  const db = app.db.instance.db(hook.result._id.toString())
  createEventService.call(app, { context: hook.result, db })
  createEventTemplateService.call(app, { context: hook.result, db })
  createEventLogService.call(app, { context: hook.result, db })
  return hook
}

export function removeOrganisationServices (hook) {
  const app = hook.app
  removeEventService.call(app, { context: hook.result })
  removeEventTemplateService.call(app, { context: hook.result })
  removeEventLogService.call(app, { context: hook.result })
  return hook
}
