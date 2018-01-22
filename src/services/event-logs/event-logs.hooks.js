import { hooks } from 'kCore'
import { sendStateNotifications, toFeatureCollection } from '../../hooks'

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
    find: [ toFeatureCollection ],
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
