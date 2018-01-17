import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks as coreHooks, permissions as corePermissions } from 'kCore'
import team, { permissions as teamPermissions } from 'kTeam'
import event, { hooks, permissions } from '../src'

describe('kEvent', () => {
  let app, userService, userObject, orgManagerObject, orgObject, orgUserObject, orgService,
      authorisationService, eventService, eventObject, eventTemplateService
  
  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    corePermissions.defineAbilities.registerHook(corePermissions.defineUserAbilities)
    // Then rules for organisations
    corePermissions.defineAbilities.registerHook(teamPermissions.defineOrganisationAbilities)
    // Then rules for groups
    corePermissions.defineAbilities.registerHook(teamPermissions.defineGroupAbilities)
    // Then rules for events
    corePermissions.defineAbilities.registerHook(permissions.defineEventAbilities)
    
    app = kalisio()
    // Register authorisation hook
    app.hooks({
      before: { all: [coreHooks.processObjectIDs, coreHooks.authorise] }
      /* For debug
      before: { all: [coreHooks.log, coreHooks.authorise] },
      after: { all: coreHooks.log },
      error: { all: coreHooks.log }
      */
    })

    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof event).to.equal('function')
  })

  it('registers the global services', () => {
    app.configure(core)
    userService = app.getService('users')
    expect(userService).toExist()
    app.configure(team)
    app.configure(event)
    orgService = app.getService('organisations')
    expect(orgService).toExist()
    orgService.hooks({
      after: {
        create: [ hooks.createOrganisationServices ],
        remove: [ hooks.removeOrganisationServices ]
      }
    })
    authorisationService = app.getService('authorisations')
    expect(authorisationService).toExist()
  })

  it('creates a test user', () => {
    return userService.create({ email: 'test@test.org', name: 'test-user' }, { checkAuthorisation: true })
    .then(user => {
      userObject = user
      return userService.find({ query: { 'profile.name': 'test-user' }, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  })

  it('creates a org manager', () => {
    return userService.create({ email: 'manager@test.org', name: 'org-manager' }, { checkAuthorisation: true })
    .then(user => {
      orgManagerObject = user
      return userService.find({ query: { 'profile.name': 'org-manager' }, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  })

  it('creates the org', () => {
    return orgService.create({ name: 'test-org' }, { user: orgManagerObject, checkAuthorisation: true })
    .then(org => {
      orgObject = org
      // This should create a service for organisation events
      eventService = app.getService('events', org)
      expect(eventService).toExist()
      // This should create a service for organisation event templates
      eventTemplateService = app.getService('event-templates', org)
      expect(eventTemplateService).toExist()
    })
  })

  it('creates a org user', () => {
    return userService.create({ email: 'user@test.org', name: 'org-user' }, { checkAuthorisation: true })
    .then(user => {
      orgUserObject = user
      return userService.find({ query: { 'profile.name': 'org-user' }, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      return authorisationService.create({
        scope: 'organisations',
        permissions: 'member',
        subjects: orgUserObject._id.toString(),
        subjectsService: 'users',
        resource: orgObject._id.toString(),
        resourcesService: 'organisations'
      }, {
        user: orgManagerObject,
        checkAuthorisation: true
      })
    })
    .then(authorisation => {
      expect(authorisation).toExist()
      return userService.find({ query: { 'profile.name': orgUserObject.name }, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      orgUserObject = users.data[0]
      expect(orgUserObject.organisations[0].permissions).to.deep.equal('member')
    })
  })

  it('org manager can create events', () => {
    return eventService.create({ title: 'event', participants: [{ _id: userObject._id }] }, { user: orgManagerObject, checkAuthorisation: true })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'event' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
      eventObject = events.data[0]
      expect(eventObject.coordinators.length > 0).beTrue()
      expect(eventObject.coordinators[0].toString()).to.equal(orgManagerObject._id.toString())
    })
  })

  it('org manager can create event templates', () => {
    return eventTemplateService.create({ title: 'template' }, { user: orgManagerObject, checkAuthorisation: true })
    .then(template => {
      return eventTemplateService.find({ query: { title: 'template' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(templates => {
      expect(templates.data.length > 0).beTrue()
    })
  })

  it('non-members cannot access events', (done) => {
    eventService.find({ query: {}, user: userObject, checkAuthorisation: true })
    .catch(error => {
      expect(error).toExist()
      done()
    })
  })

  it('members cannot access events when they are not participants', () => {
    return eventService.find({ query: {}, user: orgUserObject, checkAuthorisation: true })
    .then(events => {
      expect(events.data.length === 0).beTrue()
    })
  })

  it('org manager can update events', () => {
    return eventService.patch(eventObject._id, { participants: [{ _id: orgUserObject._id }] }, { user: orgManagerObject, checkAuthorisation: true })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'event' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
      expect(events.data[0].participants).to.deep.equal([{ _id: orgUserObject._id }])
    })
  })

  it('members can access events when they are participants', () => {
    return eventService.find({ query: {}, user: orgUserObject, checkAuthorisation: true })
    .then(events => {
      expect(events.data.length === 1).beTrue()
    })
  })

  it('members cannot access event templates service', (done) => {
    eventTemplateService.find({ query: {}, user: orgUserObject, checkAuthorisation: true })
    .catch(error => {
      expect(error).toExist()
      done()
    })
  })

  it('removes test user', () => {
    return userService.remove(userObject._id, { user: userObject, checkAuthorisation: true })
    .then(user => {
      return userService.find({ query: { name: userObject.name }, user: userObject, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
  })

  it('removes org user', () => {
    return userService.remove(orgUserObject._id, { user: orgUserObject, checkAuthorisation: true })
    .then(user => {
      return userService.find({ query: { name: orgUserObject.name }, user: orgUserObject, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
  })

  it('removes org manager', () => {
    return userService.remove(orgManagerObject._id, { user: orgManagerObject, checkAuthorisation: true })
    .then(user => {
      return userService.find({ query: { name: orgManagerObject.name }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
  })

  // Cleanup
  after(() => {
    userService.Model.drop()
    orgService.Model.drop()
    eventService.Model.drop()
    eventTemplateService.Model.drop()
    app.db.instance.dropDatabase()
  })
})
