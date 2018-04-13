<template>
  <k-card v-bind="$props" :itemActions="actions">
    <q-icon slot="card-icon" :name="icon.name" :color="icon.color"></q-icon>
  </k-card>
</template>

<script>
import { mixins } from 'kCore/client'
import { Dialog, QIcon } from 'quasar'

export default {
  name: 'k-event-template-card',
  mixins: [ mixins.baseItem ],
  components: {
    QIcon
  },
  computed: {
    icon () {
      return this.item.icon
    }
  },
  methods: {
    refreshActions () {
      // Item actions
      this.clearActions()
      if (this.$can('update', 'event-templates', this.contextId, this.item)) {
        this.registerPaneAction({
          name: 'edit-event-template',
          label: this.$t('KEventTemplateCard.EDIT_LABEL'),
          icon: 'description',
          route: { name: 'edit-event-template', params: { contextId: this.contextId, objectId: this.item._id } }
        })
      }
      if (this.$can('update', 'event-templates', this.contextId, this.item)) {
        this.registerPaneAction({
          name: 'copy-event-template',
          label: this.$t('KEventTemplateCard.COPY_LABEL'),
          icon: 'content_copy',
          route: { name: 'create-event-template', params: { contextId: this.contextId, templateId: this.item._id } }
        })
      }
      if (this.$can('remove', 'event-templates', this.contextId, this.item)) {
        this.registerMenuAction({
          name: 'remove-event-template', label: this.$t('KEventTemplateCard.REMOVE_LABEL'), icon: 'remove_circle', handler: this.removeEventTemplate
        })
      }
    },
    removeEventTemplate (template) {
      Dialog.create({
        title: this.$t('KEventTemplateCard.REMOVE_DIALOG_TITLE', { template: template.name }),
        message: this.$t('KEventTemplateCard.REMOVE_DIALOG_MESSAGE', { template: template.name }),
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
