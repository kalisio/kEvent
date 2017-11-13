import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import event, { hooks } from '../src'

describe('kEvent', () => {
  let app
  
  before(() => {
    chailint(chai, util)

    app = kalisio()
    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof event).to.equal('function')
  })

  // Cleanup
  after(() => {
  })
})
