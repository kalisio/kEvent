<template>
  <k-card v-bind="$props" :itemActions="actions">
    <q-icon slot="card-icon" :name="iconName" :color="iconColor"></q-icon>
  </k-card>
</template>

<script>
import _ from 'lodash'
import { mixins } from '@kalisio/kdk-core/client'
import { Dialog, QIcon } from 'quasar'

export default {
  name: 'k-event-template-card',
  mixins: [ mixins.baseItem ],
  components: {
    QIcon
  },
  computed: {
    iconColor () {
      return _.get(this.item, 'icon.color', '')
    },
    iconName () {
      const icon = _.get(this.item, 'icon.name', '')
      // Backward compatibility with font awesome 4 icons
      return (icon.startsWith('fa-') ? `fas ${icon}` : icon)
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
        ok: {
          label: this.$t('OK'),
        },
        cancel: {
          label: this.$t('CANCEL')
        }
      }).onOk(() => {
        let eventTemplatesService = this.$api.getService('event-templates')
        eventTemplatesService.remove(template._id)
      })
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-card'] = this.$load('collection/KCard')
  }
}
</script>
