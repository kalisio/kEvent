import { permissions } from 'kCore/common'

// Hook computing event abilities for a given user
export function defineEventAbilities (subject, can, cannot) {
  if (subject) {
    if (subject.organisations) {
      subject.organisations.forEach(organisation => {
        const role = permissions.Roles[organisation.permissions]
        if (role >= permissions.Roles.member) {
          // The unique identifier of a service is its path not its name.
          // Indeed we have for instance a 'events' service in each organisation.
          can('service', organisation._id.toString() + '/events')
          can('service', organisation._id.toString() + '/event-logs')
          // A simple user can access events in which he is a participant or his group or his org
          if (role < permissions.Roles.manager) {
            can('read', 'events', { context: organisation._id, 'participants._id': subject._id })
            can('read', 'events', { context: organisation._id, 'participants._id': organisation._id })
            if (subject.groups) {
              subject.groups.forEach(group => {
                if (group.context.toString() === organisation._id.toString()) {
                  can('read', 'events', { context: organisation._id, 'participants._id': group._id })
                }
              })
            }
            can('read', 'event-logs', { context: organisation._id, 'participant': subject._id })
          }
        }
        if (role >= permissions.Roles.manager) {
          can('all', 'events', { context: organisation._id })
          can('all', 'event-logs', { context: organisation._id })
          // The unique identifier of a service is its path not its name.
          // Indeed we have for instance a 'events' service in each organisation.
          can('service', organisation._id.toString() + '/event-templates')
          can('all', 'event-templates', { context: organisation._id })
        }
      })
    }
  }
}
