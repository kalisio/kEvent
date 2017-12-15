// import makeDebug from 'debug'
// const debug = makeDebug('kalisio:kEvent:organisations:hooks')
import { createEventService, removeEventService, createEventTemplateService, removeEventTemplateService, createEventLogService, removeEventLogService } from '../services'

export function createOrganisationServices (hook) {
  let app = hook.app
  // Get org DB
  let db = app.db.instance.db(hook.result._id.toString())
  createEventService.call(app, hook.result, db)
  createEventTemplateService.call(app, hook.result, db)
  createEventLogService.call(app, hook.result, db)
  return hook
}

export function removeOrganisationServices (hook) {
  let app = hook.app
  removeEventService.call(app, hook.result)
  removeEventTemplateService.call(app, hook.result)
  removeEventLogService.call(app, hook.result)
  return hook
}
