module.exports = function (app, options) {
  let db = options.db || app.db
  options.Model = db.collection('event-logs')
  options.Model.ensureIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
  // Use compound index so that we can easily filter by event then by participant
  options.Model.ensureIndex({ event: 1, participant: 1 })
  options.Model.ensureIndex({ geometry: '2dsphere' })
}
