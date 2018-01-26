import { populate } from 'feathers-hooks-common'
import { hooks } from 'kCore'
import { addLogDefaults, sendStateNotifications, updatePreviousLog } from '../../hooks'

module.exports = {
  before: {
    all: [ hooks.convertObjectIDs(['participant', 'event']) ],
    find: [],
    get: [],
    create: [ addLogDefaults, updatePreviousLog ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [ populate({ schema: hook => {
              return { include: { service: hook.service.getPath(true), nameAs: 'previous', parentField: 'previous', childField: '_id'} }
            }})
          ],
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
