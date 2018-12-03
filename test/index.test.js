import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks as coreHooks, permissions as corePermissions } from '@kalisio/kdk-core'
import team, { permissions as teamPermissions, hooks as teamHooks } from '@kalisio/kdk-team'
import notify, { hooks as notifyHooks } from '@kalisio/kdk-notify'
import event, { hooks, permissions } from '../src'

describe('kEvent', () => {
  let app, userService, userObject, orgManagerObject, orgObject, orgUserObject, orgService,
    authorisationService, devicesService, pusherService, sns,
    storageService, storageObject, eventService, eventObject, eventTemplateService, eventLogService

  const managerDevice = {
    registrationId: 'managerFakeId',
    platform: 'ANDROID'
  }
  const memberDevice = {
    registrationId: 'memberFakeId',
    platform: 'ANDROID'
  }

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
    // Add hooks for contextual services
    app.on('service', service => {
      if (service.name === 'groups') {
        service.hooks({
          after: {
            create: [ teamHooks.createGroupAuthorisations ],
            remove: [ teamHooks.removeGroupAuthorisations ]
          }
        })
      }
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
    userService.hooks({
      before: {
        remove: [ notifyHooks.unregisterDevices ]
      }
    })
    app.configure(team)
    app.configure(notify)
    devicesService = app.getService('devices')
    expect(devicesService).toExist()
    pusherService = app.getService('pusher')
    expect(pusherService).toExist()
    // For now we only test 1 platform, should be sufficient due to SNS facade
    sns = pusherService.getSnsApplication('ANDROID')
    expect(sns).toExist()
    app.configure(event)
    orgService = app.getService('organisations')
    expect(orgService).toExist()
    orgService.hooks({
      after: {
        create: [ teamHooks.createOrganisationServices, hooks.createOrganisationServices, teamHooks.createOrganisationAuthorisations ],
        remove: [ teamHooks.removeOrganisationAuthorisations, teamHooks.createOrganisationServices, hooks.removeOrganisationServices ]
      }
    })
    authorisationService = app.getService('authorisations')
    expect(authorisationService).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a test user', () => {
    return userService.create({ email: 'test@test.org', name: 'test-user' }, { checkAuthorisation: true })
    .then(user => {
      userObject = user
      return userService.find({ query: { 'profile.name': 'test-user' }, checkAuthorisation: true, user: userObject })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a org manager', () => {
    return userService.create({ email: 'manager@test.org', name: 'org-manager' }, { checkAuthorisation: true })
    .then(user => {
      orgManagerObject = user
      return userService.find({ query: { 'profile.name': 'org-manager' }, checkAuthorisation: true, user: orgManagerObject })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      return devicesService.update(managerDevice.registrationId, managerDevice, { user: orgManagerObject })
    })
    .then(device => {
      return userService.get(orgManagerObject._id)
    })
    .then(user => {
      // Update user with registered device
      orgManagerObject = user
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates the org', async () => {
    orgObject = await orgService.create({ name: 'test-org' }, { user: orgManagerObject, checkAuthorisation: true })
    // This should create a service for organisation storage
    storageService = app.getService('storage', orgObject)
    expect(storageService).toExist()
    // This should create a service for organisation events
    eventService = app.getService('events', orgObject)
    expect(eventService).toExist()
    // This should create a service for organisation event templates
    eventTemplateService = app.getService('event-templates', orgObject)
    expect(eventTemplateService).toExist()
    // This should create a service for organisation event templates
    eventLogService = app.getService('event-logs', orgObject)
    expect(eventLogService).toExist()
  })

  it('creates a org user', () => {
    return userService.create({ email: 'user@test.org', name: 'org-user' }, { checkAuthorisation: true })
    .then(user => {
      orgUserObject = user
      return userService.find({ query: { 'profile.name': 'org-user' }, checkAuthorisation: true, user: orgUserObject })
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
      return userService.find({ query: { 'profile.name': orgUserObject.name }, checkAuthorisation: true, user: orgManagerObject })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      // Update user with authorisations
      orgUserObject = users.data[0]
      expect(orgUserObject.organisations[0].permissions).to.deep.equal('member')
      return devicesService.update(memberDevice.registrationId, memberDevice, { user: orgUserObject })
    })
    .then(device => {
      return userService.get(orgUserObject._id)
    })
    .then(user => {
      // Update user with registered device
      orgUserObject = user
    })
  })
  // Let enough time to process
  .timeout(10000)

  it('org manager can create event template', () => {
    return eventTemplateService.create({ title: 'template' }, { user: orgManagerObject, checkAuthorisation: true })
    .then(template => {
      return eventTemplateService.find({ query: { title: 'template' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(templates => {
      expect(templates.data.length > 0).beTrue()
    })
  })

  it('members can access event templates service', async () => {
    let templates = await eventTemplateService.find({ query: {}, user: orgUserObject, checkAuthorisation: true })
    expect(templates.data.length > 0).beTrue()
  })

  it('members cannot create event template', async () => {
    try {
      await eventTemplateService.create({ title: 'member-template' }, { user: orgUserObject, checkAuthorisation: true })
    } catch (error) {
      expect(error).toExist()
    }
  })

  it('org member can create event', () => {
    let operation = eventService.create({
      title: 'member event',
      participants: [{ _id: orgManagerObject._id, service: 'members' }]
    },
      {
        notification: 'event created',
        user: orgUserObject,
        checkAuthorisation: true
      })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'member event' }, user: orgUserObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
      eventObject = events.data[0]
      // Check for creator to be registered as coordinator
      expect(eventObject.coordinators.length > 0).beTrue()
      expect(eventObject.coordinators[0]._id.toString()).to.equal(orgUserObject._id.toString())
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgManagerObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })

  it('org member can update event', () => {
    let operation = eventService.patch(eventObject._id, {
      title: 'updated member event'
    }, {
      notification: 'event updated',
      user: orgUserObject,
      checkAuthorisation: true
    })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'updated member event' }, user: orgUserObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgManagerObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })
  
  it('org member can delete an event', async () => {
    await eventService.remove(eventObject._id, {
      notification: 'event updated',
      user: orgUserObject,
      checkAuthorisation: true
    })
    let events = await eventService.find({ query: { title: 'updated member event' }, user: orgUserObject, checkAuthorisation: true })
    expect(events.data.length === 0).beTrue()
  })  
  
  it('org manager can create event', () => {
    let operation = eventService.create({
      title: 'event',
      participants: [{ _id: orgUserObject._id, service: 'members' }]
    },
      {
        notification: 'event created',
        user: orgManagerObject,
        checkAuthorisation: true
      })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'event' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
      eventObject = events.data[0]
      // Check for creator to be registered as coordinator
      expect(eventObject.coordinators.length > 0).beTrue()
      expect(eventObject.coordinators[0]._id.toString()).to.equal(orgManagerObject._id.toString())
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgUserObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })
  // Let enough time to process
  .timeout(10000)

  it('non-members cannot access events', async () => {
    try {
      await eventService.find({ query: {}, user: userObject, checkAuthorisation: true })
    } catch (error) {
      expect(error).toExist()
    }
  })

  it('make test user member', async () => {
    let authorisation = await authorisationService.create({
      scope: 'organisations',
      permissions: 'member',
      subjects: userObject._id.toString(),
      subjectsService: 'users',
      resource: orgObject._id.toString(),
      resourcesService: 'organisations'
    }, {
      user: orgManagerObject,
      checkAuthorisation: true
    })
    expect(authorisation).toExist()
    let users = await userService.find({ query: { 'profile.name': userObject.name }, checkAuthorisation: true, user: orgManagerObject })
    expect(users.data.length > 0).beTrue()
    // Update user with authorisations
    userObject = users.data[0]
    expect(userObject.organisations[0].permissions).to.deep.equal('member')
  })

  it('members cannot access events when they are not participants', async () => {
    let events = await eventService.find({ query: {}, user: userObject, checkAuthorisation: true })
    expect(events.data.length === 0).beTrue()
  })

  it('event coordinators can update events', () => {
    let operation = eventService.patch(eventObject._id, {
      title: 'updated event'
    }, {
      notification: 'event updated',
      user: orgManagerObject,
      checkAuthorisation: true
    })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'updated event' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length > 0).beTrue()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgUserObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })

  it('event coordinators can add attachments to events', async () => {
    const content = Buffer.from('some buffered data')
    storageObject = await storageService.create({
      id: 'buffer.txt',
      contentType: 'text/plain',
      buffer: content,
      resource: eventObject._id.toString(),
      resourcesService: 'events'
    })
    expect(storageObject.size).to.equal(content.length)
    let events = await eventService.find({ query: { title: 'updated event' }, user: orgManagerObject, checkAuthorisation: true })
    expect(events.data.length > 0).beTrue()
    eventObject = events.data[0]
    expect(eventObject.attachments).toExist()
    expect(eventObject.attachments.length > 0).beTrue()
    expect(eventObject.attachments[0]._id).to.equal(storageObject._id)
    await storageService.get('buffer.txt')
  })

  it('members can access events when they are participants', async () => {
    let events = await eventService.find({ query: {}, user: orgUserObject, checkAuthorisation: true })
    expect(events.data.length === 1).beTrue()
  })

  it('participants can create event logs', async () => {
    await eventLogService.create({ event: eventObject._id }, { user: orgUserObject, checkAuthorisation: true })
    let logs = await eventLogService.find({ query: { lastInEvent: true }, user: orgUserObject, checkAuthorisation: true })
    expect(logs.data.length === 1).beTrue()
  })

  it('coordinators can create event logs', () => {
    let operation = eventLogService.create({
      event: eventObject._id,
      participant: orgUserObject._id,
      stakeholder: 'coordinator',
      interaction: { value: 'go' }
    }, { user: orgManagerObject, checkAuthorisation: true })
    .then(log => {
      return eventLogService.find({ query: { lastInEvent: true }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(logs => {
      expect(logs.data.length === 1).beTrue()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgUserObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })

  it('event coordinators can remove events', () => {
    let operation = eventService.remove(eventObject._id, {
      notification: 'event removed',
      user: orgManagerObject,
      checkAuthorisation: true
    })
    .then(event => {
      eventObject = event
      return eventService.find({ query: { title: 'updated event' }, user: orgManagerObject, checkAuthorisation: true })
    })
    .then(events => {
      expect(events.data.length === 0).beTrue()
      return storageService.get('buffer.txt')
    })
    .catch(error => {
      expect(error).toExist()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('messageSent',  (endpointArn, messageId) => {
        expect(orgUserObject.devices[0].arn).to.equal(endpointArn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })

  it('removes test user', async () => {
    await userService.remove(userObject._id, { user: userObject, checkAuthorisation: true })
    let users = await userService.find({ query: { name: userObject.name }, user: userObject, checkAuthorisation: true })
    expect(users.data.length === 0).beTrue()
  })

  it('removes org user', async () => {
    await userService.remove(orgUserObject._id, { user: orgUserObject, checkAuthorisation: true })
    let users = await userService.find({ query: { name: orgUserObject.name }, user: orgUserObject, checkAuthorisation: true })
    expect(users.data.length === 0).beTrue()
  })

  it('removes org', async () => {
    await orgService.remove(orgObject._id, { user: orgManagerObject, checkAuthorisation: true })
    let orgs = await orgService.find({ query: { name: 'test-org' }, user: orgManagerObject, checkAuthorisation: true })
    expect(orgs.data.length === 0).beTrue()
  })

  it('removes org manager', async () => {
    await userService.remove(orgManagerObject._id, { user: orgManagerObject, checkAuthorisation: true })
    let users = await userService.find({ query: { name: orgManagerObject.name }, user: orgManagerObject, checkAuthorisation: true })
    expect(users.data.length === 0).beTrue()
  })

  // Cleanup
  after(() => {
    app.db.instance.dropDatabase()
  })
})
