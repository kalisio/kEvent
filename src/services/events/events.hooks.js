import { hooks } from '@kalisio/kdk-core'
import { setNow, discard } from 'feathers-hooks-common'
import { addCreatorAsCoordinator, processNotification, sendEventNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [ ],
    find: [],
    get: [],
    // Because expireAt comes from client convert it to Date object
    create: [ processNotification, addCreatorAsCoordinator, setNow('createdAt', 'updatedAt'), hooks.convertDates(['expireAt']) ],
    update: [ processNotification, discard('createdAt', 'updatedAt'), setNow('updatedAt'), hooks.convertDates(['expireAt']) ],
    patch: [ processNotification, discard('createdAt', 'updatedAt'), setNow('updatedAt'), hooks.convertDates(['expireAt']) ],
    remove: [ processNotification ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [ sendEventNotifications ],
    update: [ sendEventNotifications ],
    patch: [ sendEventNotifications ],
    // Because the notification ID is based on created/updated time we need to update it even on remove
    remove: [ setNow('updatedAt'), sendEventNotifications, hooks.removeAttachments('attachments') ]
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
