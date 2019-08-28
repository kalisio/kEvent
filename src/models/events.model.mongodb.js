module.exports = function (app, options) {
  const db = options.db || app.db
  options.Model = db.collection('events')
  // Expire at a given date
  options.Model.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
}
