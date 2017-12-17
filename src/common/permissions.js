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
        }
        if (role >= permissions.Roles.manager) {
          can('all', 'events', { context: organisation._id })
          // The unique identifier of a service is its path not its name.
          // Indeed we have for instance a 'events' service in each organisation.
          can('service', organisation._id.toString() + '/event-templates')
          can('all', 'event-templates', { context: organisation._id })
        }
      })
    }

    // A user can access events in which he is an actor or his group or his org
    can('read', 'events', { 'actors._id': subject._id })
    if (subject.groups) {
      subject.groups.forEach(group => {
        can('read', 'events', { 'actors._id': group._id })
      })
    }
    if (subject.organisations) {
      subject.organisations.forEach(organisation => {
        can('read', 'events', { 'actors._id': organisation._id })
      })
    }
  }
}
