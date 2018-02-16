import { hooks } from 'kCore'
import { setNow, discard } from 'feathers-hooks-common'
import { addCreatorAsCoordinator, sendNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    // Because expireAt comes from client convert it to Date object
    create: [ addCreatorAsCoordinator, setNow('createdAt', 'updatedAt'), hooks.convertDates(['expireAt']) ],
    update: [ discard('createdAt', 'updatedAt'), setNow('updatedAt'), hooks.convertDates(['expireAt']) ],
    patch: [ discard('createdAt', 'updatedAt'), setNow('updatedAt'), hooks.convertDates(['expireAt']) ],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [ sendNotifications('New') ],
    update: [ sendNotifications('Updated') ],
    patch: [ sendNotifications('Updated') ],
    // Because the notification ID is based on created/updated time we need to update it even on remove
    remove: [ setNow('updatedAt'), sendNotifications('Closed') ]
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
