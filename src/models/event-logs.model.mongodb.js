module.exports = function (app, options) {
  let db = options.db || app.db
  options.Model = db.collection('event-logs')
  options.Model.ensureIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
  options.Model.ensureIndex({ participant: 1 })
  options.Model.ensureIndex({ event: 1 })
  options.Model.ensureIndex({ lastInEvent: 1 })
  options.Model.ensureIndex({ geometry: '2dsphere' })
}
