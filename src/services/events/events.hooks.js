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
    create: [ sendNotifications('[New] - ') ],
    update: [ sendNotifications('[Updated] - ') ],
    patch: [ sendNotifications('[Updated] - ') ],
    remove: [ sendNotifications('[Closed] - ') ]
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
