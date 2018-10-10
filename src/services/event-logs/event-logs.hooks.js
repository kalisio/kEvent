import { setNow, populate } from 'feathers-hooks-common'
import { hooks } from '@kalisio/kCore'
import { addLogDefaults, sendStateNotifications, linkWithPreviousLog, updatePreviousLog } from '../../hooks'

const populatePreviousLog = populate({
  schema: hook => {
    return {
      include: [
        { service: hook.service.getPath(true), nameAs: 'previous', parentField: 'previous', childField: '_id' }
      ]
    }
  }
})

const populateParticipant = populate({
  schema: hook => {
    const usersService = hook.app.getService('users')
    return {
      include: [
        { service: usersService.getPath(true), nameAs: 'participant', parentField: 'participant', childField: '_id',
          query: { $select: ['profile.name'] } }
      ]
    }
  }
})

module.exports = {
  before: {
    all: [ hooks.convertObjectIDs(['participant', 'event']) ],
    find: [],
    get: [],
    create: [ setNow('createdAt'), addLogDefaults, linkWithPreviousLog ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [ populatePreviousLog, populateParticipant ],
    get: [],
    create: [ updatePreviousLog, sendStateNotifications ],
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
