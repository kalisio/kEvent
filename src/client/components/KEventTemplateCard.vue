<template>
  <k-card v-bind="$props" :itemActions="actions">
  </k-card>
</template>

<script>
import { mixins } from 'kCore/client'
import { Dialog } from 'quasar'

export default {
  name: 'k-event-template-card',
  mixins: [ mixins.baseItem ],
  methods: {
    refreshActions () {
      // Item actions
      this.clearActions()
      if (this.$can('update', 'event-templates', this.contextId, this.item)) {
        this.registerPaneAction({ 
          name: 'edit-event-template', label: 'Edit', icon: 'description',
          route: { name: 'edit-event-template', params: { contextId: this.contextId } }
        })
      }
      if (this.$can('remove', 'event-templates', this.contextId, this.item)) {
        this.registerMenuAction({ 
          name: 'remove-event-template', label: 'Remove', icon: 'remove_circle', handler: this.removeEventTemplate
        })
      }
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
    this.$options.components['k-card'] = this.$load('collection/KCard')
  }
}
</script>
