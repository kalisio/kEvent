import { permissions } from '@kalisio/kdk-core/common'

// Hook computing event abilities for a given user
export function defineEventAbilities (subject, can, cannot) {
  if (subject && subject._id) {
    if (subject.organisations) {
      subject.organisations.forEach(organisation => {
        const role = permissions.Roles[organisation.permissions]
        if (role >= permissions.Roles.member) {
          if (organisation._id) {
            // The unique identifier of a service is its path not its name.
            // Indeed we have for instance a 'events' service in each organisation.
            can('service', organisation._id.toString() + '/events')
            can('service', organisation._id.toString() + '/event-logs')
            // A user can access the templates to create an event
            can('service', organisation._id.toString() + '/event-templates')
            can('read', 'event-templates', { context: organisation._id })
            // A user can access events in which he is a participant or his group or his org
            // A coordinator can manage his events
            can('create', 'events', { context: organisation._id })
            can('read', 'events', { context: organisation._id, 'participants._id': subject._id })
            can('all', 'events', { context: organisation._id, 'coordinators._id': subject._id })
            // can('all', 'events', { context: organisation._id, 'coordinators._id': subject._id })
            // BUG: adding org level participant/coordinator generates a bug because the org owner
            // has the same ID than the org itself causing everybody accessing the event
            // can('read', 'events', { context: organisation._id, 'participants._id': organisation._id })
            // can('all', 'events', { context: organisation._id, 'coordinators._id': organisation._id })
          }
          if (subject.groups) {
            subject.groups.forEach(group => {
              if (group._id && group.context && (group.context.toString() === organisation._id.toString())) {
                can('read', 'events', { context: organisation._id, 'participants._id': group._id })
                can('all', 'events', { context: organisation._id, 'coordinators._id': group._id })
              }
            })
          }
          if (subject.tags) {
            subject.tags.forEach(tag => {
              if (tag._id && tag.context && (tag.context.toString() === organisation._id.toString())) {
                can('read', 'events', { context: organisation._id, 'participants._id': tag._id })
                can('all', 'events', { context: organisation._id, 'coordinators._id': tag._id })
              }
            })
          }
          if (organisation._id) {
            // A user can create event logs for himself and coordinator for everybody
            // FIXME: hard to express this with the permission system
            // can(['read', 'create'], 'event-logs', { context: organisation._id, 'participant': subject._id })
            can(['read', 'create'], 'event-logs', { context: organisation._id })
          }
        }
        if (role >= permissions.Roles.manager) {
          if (organisation._id) {
            // The unique identifier of a service is its path not its name.
            // Indeed we have for instance a 'events' service in each organisation.
            can('all', 'event-templates', { context: organisation._id })
          }
        }
      })
    }
  }
}
