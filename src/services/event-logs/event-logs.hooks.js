import { populate } from 'feathers-hooks-common'
import { hooks } from 'kCore'
import { addLogDefaults, sendStateNotifications, linkWithPreviousLog } from '../../hooks'

module.exports = {
  before: {
    all: [ hooks.convertObjectIDs(['participant', 'event']) ],
    find: [],
    get: [],
    create: [ addLogDefaults, linkWithPreviousLog ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [ populate({ schema: hook => {
              const usersService = hook.app.getService('users')
              return {
                        include: [
                          { service: hook.service.getPath(true), nameAs: 'previous', parentField: 'previous', childField: '_id' },
                          { service: usersService.getPath(true), nameAs: 'participant', parentField: 'participant', childField: '_id',
                            query: { $select: ['profile.name'] } }
                        ]
                      }
            }})],
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
