import path from 'path'
import makeDebug from 'debug'
const modelsPath = path.join(__dirname, '..', 'models')
const servicesPath = path.join(__dirname, '..', 'services')

const debug = makeDebug('kalisio:kEvent:services')

export function createEventService (options = {}) {
  const app = this

  debug('Creating events service with options', options)
  app.createService('events', Object.assign({
    servicesPath,
    modelsPath
  }, options))
}

export function removeEventService (options) {
  // TODO
}

export function createEventTemplateService (options = {}) {
  const app = this

  debug('Creating event templates service with options', options)
  app.createService('event-templates', Object.assign({
    servicesPath,
    modelsPath
  }, options))
}

export function removeEventTemplateService (options) {
  // TODO
}

export function createEventLogService (options = {}) {
  const app = this

  debug('Creating event logs service with options', options)
  app.createService('event-logs', Object.assign({
    servicesPath,
    modelsPath,
    paginate: { default: 500, max: 500 }
  }, options))
}

export function removeEventLogService (options) {
  // TODO
}

export function createArchivedEventService (options = {}) {
  const app = this

  debug('Creating archived events service with options', options)
  app.createService('archived-events', Object.assign({
    servicesPath,
    modelsPath,
    paginate: { default: 20, max: 5000 }
  }, options))
}

export function removeArchivedEventService (options) {
  // TODO
}

export function createArchivedEventLogService (options = {}) {
  const app = this

  debug('Creating archived event logs service with options', options)
  app.createService('archived-event-logs', Object.assign({
    servicesPath,
    modelsPath,
    paginate: { default: 500, max: 500 }
  }, options))
}

export function removeArchivedEventLogService (options) {
  // TODO
}

export function createOrganisationServices (organisation, db) {
  const app = this
  createEventService.call(app, { context: organisation, db })
  createEventTemplateService.call(app, { context: organisation, db })
  createEventLogService.call(app, { context: organisation, db })
  createArchivedEventService.call(app, { context: organisation, db })
  createArchivedEventLogService.call(app, { context: organisation, db })
}

export function removeOrganisationServices (organisation) {
  const app = this
  removeEventService.call(app, { context: organisation })
  removeEventTemplateService.call(app, { context: organisation })
  removeEventLogService.call(app, { context: organisation })
  removeArchivedEventService.call(app, { context: organisation })
  removeArchivedEventLogService.call(app, { context: organisation })
}

export default function () {
  const app = this

  // Register services hook for organisations
  app.getService('organisations').registerOrganisationServicesHook({
    createOrganisationServices, removeOrganisationServices
  })
}
