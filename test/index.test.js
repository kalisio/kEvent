import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import event, { hooks } from '../src'

describe('kEvent', () => {
  let app, eventService
  
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
    app.configure(event)
    eventService = app.getService('events')
    expect(eventService).toExist()
  })

  // Cleanup
  after(() => {
  })
})
