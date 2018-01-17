import { hooks } from 'kCore'
import { sendStateNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [ hooks.convertObjectIDs(['participant', 'event']) ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [ sendStateNotifications ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
