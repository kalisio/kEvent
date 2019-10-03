import _ from 'lodash'
import { hooks as coreHooks } from '@kalisio/kdk-core'
import { hooks as mapHooks } from '@kalisio/kdk-map'
import { setNow, discard } from 'feathers-hooks-common'
import { addCreatorAsCoordinator, processNotification, sendEventNotifications } from '../../hooks'

module.exports = {
  before: {
    all: [coreHooks.convertObjectIDs(['layer', 'feature'])],
    find: [mapHooks.marshallSpatialQuery],
    get: [],
    // Because expireAt comes from client convert it to Date object
    create: [processNotification, addCreatorAsCoordinator, setNow('createdAt', 'updatedAt'), coreHooks.convertDates(['expireAt'])],
    update: [processNotification, discard('createdAt', 'updatedAt'), setNow('updatedAt'), coreHooks.convertDates(['expireAt'])],
    patch: [processNotification, discard('createdAt', 'updatedAt'), setNow('updatedAt'), coreHooks.convertDates(['expireAt'])],
    remove: [processNotification]
  },

  after: {
    all: [],
    find: [mapHooks.asGeoJson({
      longitudeProperty: 'location.longitude',
      latitudeProperty: 'location.latitude'
    })],
    get: [],
    create: [sendEventNotifications],
    update: [sendEventNotifications],
    patch: [sendEventNotifications],
    // Because the notification ID is based on created/updated time we need to update it even on remove
    remove: [setNow('updatedAt'), sendEventNotifications, coreHooks.removeAttachments('attachments')]
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
