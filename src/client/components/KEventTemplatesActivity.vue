<template>
  <div>
    <!-- 
      Templates collection
     -->
    <k-grid service="event-templates" :base-query="baseQuery" :actions="actions.template" />
    <!-- 
      Router view to enable routing to modals
     -->
    <router-view service="event-templates" router="router()"></router-view>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { Dialog } from 'quasar'

export default {
  name: 'k-event-templates-activity',
  mixins: [kCoreMixins.baseActivity],
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
  methods: {
    router () {
      return { 
        onApply: { name: 'event-templates-activity', params: { contextId: this.contextId } },
        onDismiss: { name: 'event-templates-activity', params: { contextId: this.contextId } }
      }
    },
    refreshActivity () {
      this.clearActivity()
      this.setTitle(this.$store.get('context.name'))
      // Tabbar actions
      this.registerTabAction({ 
        name: 'events', label: 'Events', icon: 'playlist_play',
        route: { name: 'events-activity', params: { contextId: this.contextId } } 
      })
      this.registerTabAction({ 
        name: 'event-templates', label: 'Templates', icon: 'credit_card',
        route: { name: 'event-templates-activity', params: { contextId: this.contextId } },
        default: true
      })
      // Fab actions
      if (this.$can('create', 'event-templates', this.contextId)) {
        this.registerFabAction({ 
          name: 'create-event-template', label: 'Create a template', icon: 'add', 
          route: { name: 'create-event-template', params: {} }
        })
      }
      // Item actions
      this.registerAction('template', { 
        name: 'remove-event-template', label: 'Remove', icon: 'remove_circle',
        permissions: { operation: 'remove', service: 'event-templates', context: this.contextId },
        handler: this.removeEventTemplate
      })
      this.registerAction('template', { 
        name: 'edit-event-template', label: 'Edit', icon: 'description', 
        permissions: { operation: 'update', service: 'event-templates', context: this.contextId },
        route: { name: 'edit-event-template', params: { contextId: this.contextId } }
      })
    },
    removeEventTemplate (template) {
      Dialog.create({
        title: 'Remove <b>' + template.name + '</b> ?',
        message: 'Are you sure you want to remove <b>' + template.name + '</b> ?',
        buttons: [
          {
            label: 'Ok',
            handler: () => {
              let eventTemplatesService = this.$api.getService('event-templates')
              eventTemplatesService.remove(template._id)
            }
          },
          'Cancel'
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
