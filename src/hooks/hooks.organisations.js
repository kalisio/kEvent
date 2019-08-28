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
  createEventService.call(app, hook.result, db)
  createEventTemplateService.call(app, hook.result, db)
  createEventLogService.call(app, hook.result, db)
  return hook
}

export function removeOrganisationServices (hook) {
  const app = hook.app
  removeEventService.call(app, hook.result)
  removeEventTemplateService.call(app, hook.result)
  removeEventLogService.call(app, hook.result)
  return hook
}
