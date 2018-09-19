import path from 'path'
import makeDebug from 'debug'
const modelsPath = path.join(__dirname, '..', 'models')
const servicesPath = path.join(__dirname, '..', 'services')

const debug = makeDebug('kalisio:kEvent:services')

export function createEventService(organisation, db) {
  const app = this

  app.createService('events', {
    servicesPath,
    modelsPath,
    context: organisation,
    db
  })
  debug('Events service created for organisation ' + organisation.name)
}

export function removeEventService(organisation) {
  // TODO
}

export function createEventTemplateService(organisation, db) {
  const app = this
  
  app.createService('event-templates', {
    servicesPath,
    modelsPath,
    context: organisation,
    db
  })
  debug('Event templates service created for organisation ' + organisation.name)
}

export function removeEventTemplateService(organisation) {
  // TODO
}

export function createEventLogService(organisation, db) {
  const app = this

  app.createService('event-logs', {
    servicesPath,
    modelsPath,
    context: organisation,
    db,
    paginate: {
      default: 100,
      max: 100
    }
  })
  debug('Event logs service created for organisation ' + organisation.name)
}

export function removeEventLogService(organisation) {
  // TODO
}

export default async function () {
  const app = this

  // Reinstanciated services for all organisations
  const organisations = await app.getService('organisations').find({ paginate: false })

  organisations.forEach(organisation => {
    // Get org DB
    let db = app.db.instance.db(organisation._id.toString())
    createEventService.call(app, organisation, db)
    createEventTemplateService.call(app, organisation, db)
    createEventLogService.call(app, organisation, db)
  })
}
