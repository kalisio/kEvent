import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import team, { teamHooks } from 'kTeam'
import event, { hooks } from '../src'

describe('kEvent', () => {
  let app, userService, userObject, orgService, eventService, eventTemplateService
  
  before(() => {
    chailint(chai, util)

    app = kalisio()
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

  it('registers the org services', () => {
    return orgService.create({ name: 'test-org' }, { user: userObject, checkAuthorisation: true })
    .then(org => {
      // This should create a service for organisation events
      eventService = app.getService('events', org)
      expect(eventService).toExist()
      // This should create a service for organisation event templates
      eventTemplateService = app.getService('event-templates', org)
      expect(eventTemplateService).toExist()
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

  // Cleanup
  after(() => {
    userService.Model.drop()
    orgService.Model.drop()
    eventService.Model.drop()
    eventTemplateService.Model.drop()
    app.db.instance.dropDatabase()
  })
})
