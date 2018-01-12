import { addCreatorAsCoordinator, sendNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ addCreatorAsCoordinator ],
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
