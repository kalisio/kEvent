import { disallow, populate } from 'feathers-hooks-common'
import { hooks } from '@kalisio/kdk-core'

const populatePreviousLog = populate({
  schema: hook => {
    return {
      include: [
        { service: hook.service.getPath(true), nameAs: 'previous', parentField: 'previous', childField: '_id' }
      ]
    }
  }
})

module.exports = {
  before: {
    all: [hooks.convertObjectIDs(['participant', 'event'])],
    find: [],
    get: [],
    create: [disallow()],
    update: [disallow()],
    patch: [disallow()],
    remove: [disallow()]
  },

  after: {
    all: [],
    // Due to anonymization in archive we don't populate participant
    find: [populatePreviousLog],
    get: [],
    create: [],
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
