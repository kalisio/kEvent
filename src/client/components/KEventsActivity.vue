<template>
  <div>
    <!-- 
      Events collection
     -->
    <k-grid service="events" :base-query="baseQuery" :actions="actions.event" />
    <!-- 
      Router view to enable routing to modals
     -->
    <router-view service="events" backRoute="events-activity"></router-view>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { Dialog } from 'quasar'

export default {
  name: 'k-events-activity',
  mixins: [kCoreMixins.baseActivity],
  props: {
    contextId: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: '',
    },
    perspective: {
      type: String,
      default: '',
    }
  },
  computed: {
    baseQuery () {
      return {}
    }
  },
  methods: {
    refreshActivity () {
      this.clearActivity()
      this.setTitle(this.$store.get('context.name'))
      // Tabbar actions
      this.registerTabAction({ 
        name: 'events', label: 'Events', icon: 'playlist_play',
        route: { name: 'events-activity', params: { contextId: this.contextId } },
        default: true
      })
      this.registerTabAction({ 
        name: 'event-templates', label: 'Templates', icon: 'credit_card',
        route: { name: 'event-templates-activity', params: { contextId: this.contextId } } 
      })
      // Fab actions
      if (this.$can('create', 'events', this.contextId)) {
        const eventTemplatesService = this.$api.getService('event-templates')
        eventTemplatesService.find({ $select: ["title", "icon"] })
        .then(templates => {
          templates.data.forEach(template => {
            this.registerFabAction({ 
              name: 'create-' + template.name, label: template.name, icon: template.icon, 
              route: { name: 'create-event', params: { contextId: this.contextId, templateId: template._id } }
            })
          })
        })
      }
      // Item actions
      this.registerAction('event', { 
        name: 'remove-event', label: 'Remove', icon: 'remove_circle',
        permissions: { operation: 'remove', service: 'events', context: this.contextId },
        handler: this.removeEventTemplate
      })
      this.registerAction('event', { 
        name: 'edit-event', label: 'Edit', icon: 'description', 
        permissions: { operation: 'update', service: 'events', context: this.contextId },
        route: { name: 'edit-event', params: { contextId: this.contextId } }
      })
    },
    removeEvent (event) {
      Dialog.create({
        title: 'Remove \'' + event.name + '\' ?',
        message: 'Are you sure you want to remove the event <br>' + event.name + '</br> ?',
        buttons: [
          'Cancel',
          {
            label: 'Ok',
            handler: () => {
              let eventsService = this.$api.getService('events')
              eventsService.remove(event._id)
            }
          }
        ]
      })
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-grid'] = this.$load('collection/KGrid')
  }
}
</script>
