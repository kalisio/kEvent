module.exports = function (data, connection, hook) { // eslint-disable-line no-unused-vars
  // Clients are only interested in create log events, others are used internally
  return (hook.method !== 'create' ? false : data)
}
