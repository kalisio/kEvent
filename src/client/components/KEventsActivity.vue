<template>
  <div>
    <!-- 
      Events collection
     -->
    <k-grid service="events" :base-query="baseQuery" :renderer="renderer" :actions="actions.event" />
    <!-- 
      Router view to enable routing to modals
     -->
    <router-view service="events" :router="router()"></router-view>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import { Dialog } from 'quasar'

export default {
  name: 'k-events-activity',
  mixins: [kCoreMixins.baseActivity, kMapMixins.geolocation],
  props: {
    contextId: {
      type: String,
      default: ''
    }
  },
  computed: {
    baseQuery () {
      return {}
    }
  },
  data () {
    return {
      renderer: { 
        component: 'KEventCard', 
        props: {
          options: {
          }
        } 
      }
    }
  },
  methods: {
    router () {
      return { 
        onApply: { name: 'events-activity', params: { contextId: this.contextId } },
        onDismiss: { name: 'events-activity', params: { contextId: this.contextId } }
      }
    },
    refreshActivity () {
      this.clearActivity()
      this.setTitle(this.$store.get('context.name'))
      // Tabbar actions
      this.registerTabAction({ 
        name: 'events', label: 'Events', icon: 'whatshot',
        route: { name: 'events-activity', params: { contextId: this.contextId } },
        default: true
      })
      this.registerTabAction({ 
        name: 'event-templates', label: 'Templates', icon: 'widgets',
        route: { name: 'event-templates-activity', params: { contextId: this.contextId } } 
      })
      // Fab actions
      if (this.$can('create', 'events', this.contextId)) {
        const eventTemplatesService = this.$api.getService('event-templates')
        eventTemplatesService.find({ $select: ["name", "icon"] })
        .then(templates => {
          templates.data.forEach(template => {
            this.registerFabAction({ 
              name: 'create-' + template.name, label: template.name, icon: template.icon.icon, 
              route: { name: 'create-event', params: { contextId: this.contextId, templateId: template._id } }
            })
          })
        })
      }
      // Item actions
      this.registerAction('event', { 
        name: 'remove-event', label: 'Remove', icon: 'remove_circle', scope: 'menu',
        permissions: { operation: 'remove', service: 'events', context: this.contextId },
        handler: this.removeEvent
      })
      if (this.$can('update', 'events', this.contextId)) {
        this.registerAction('event', { 
          name: 'tag-member', label: 'Tag', icon: 'local_offer', scope: 'pane',
          route: { name: 'tag-event', params: { contextId: this.contextId } }
        })
      }
      this.registerAction('event', { 
        name: 'add-media', label: 'Add a photo', icon: 'add_a_photo', scope: 'pane',
        permissions: { operation: 'update', service: 'events', context: this.contextId },
        route: { name: 'add-media', params: { contextId: this.contextId } }
      })
      this.registerAction('event', { 
        name: 'run-event', label: 'Follow', icon: 'message', scope: 'pane',
        permissions: { operation: 'update', service: 'events', context: this.contextId },
        route: { name: 'run-event', params: { contextId: this.contextId } }
      })
      this.registerAction('event', { 
        name: 'map-event', label: 'Map', icon: 'map', scope: 'pane',
        permissions: { operation: 'update', service: 'events', context: this.contextId },
        route: { name: 'event-activity', params: { contextId: this.contextId } }
      })
    },
    removeEvent (event) {
      Dialog.create({
        title: 'Remove \'' + event.name + '\' ?',
        message: 'Are you sure you want to remove the event <b>' + event.name + '</b> ?',
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
