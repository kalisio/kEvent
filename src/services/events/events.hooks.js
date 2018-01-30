import { hooks } from 'kCore'
import { addCreatorAsCoordinator, sendNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ addCreatorAsCoordinator, hooks.convertDates(['expireAt']) ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [ sendNotifications ],
    update: [ sendNotifications ],
    patch: [ sendNotifications ],
    remove: [ sendNotifications ]
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
