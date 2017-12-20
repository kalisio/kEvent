<template>
  <div>
    <!-- Manage routing = event/template management -->
    <div v-if="operation === 'create-event'">
      <k-event-editor service="events" :templateId="id"/>
    </div>
    <div v-else-if="operation === 'edit-event'">
      <k-event-editor service="events" :id="id" />
    </div>
    <div v-else-if="operation === 'create-event-template'">
      <k-event-template-editor service="event-templates" />
    </div>
    <div v-else-if="operation === 'edit-event-template'">
      <k-event-template-editor service="event-templates" :id="id" />
    </div>
    <!-- Default routing = event/template list -->
    <div v-else>
      <k-nav-bar :tabs="actions.tab" :selected="operation" />
      <div v-if="operation === 'current-events'">
        <k-grid ref="eventsGrid" service="events" :renderer-options="{ nameField: 'title' }" :base-query="eventsGridQuery" :actions="actions.event" />
        <k-fab :actions="actions.events" />
      </div>
      <div v-else-if="operation === 'event-templates'">
        <k-grid ref="templatesGrid" service="event-templates" :renderer-options="{ nameField: 'title' }" :base-query="templatesGridQuery" :actions="actions.template" />
        <k-fab :actions="actions.templates" />
      </div>
      <!-- Create event dialog -->
      <k-dialog ref="createEventDialog" title="Select your template" :closable="false" :actions="createEventActions" @action-triggered="onCreateEventActionTriggered">
        <div slot="dialog-content">
          <k-item-chooser ref="templateChooser" :default-items="[]" :services="templateService" @item-selection-changed="onUpdateEventTemplate"/>
        </div>
      </k-dialog>
      <!-- Remove event dialog -->
      <k-confirm ref="removeEventDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="onRemoveEventConfirmed" />
      <!-- Remove template dialog -->
      <k-confirm ref="removeTemplateDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="onRemoveTemplateConfirmed" />
    </div>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'

export default {
  name: 'k-events-activity',
  mixins: [kCoreMixins.baseActivity],
  props: {
    contextId: {
      type: String,
      default: ''
    },
    operation: {
      type: String,
      default: '',
    },
    id : {
      type: String,
      default: '',
    },
    perspective: {
      type: String,
      default: '',
    }
  },
  computed: {
    selectionName () {
      return this.selection ? this.selection.title : ''
    },
    templateService () {
      return [{
        service: 'event-templates',
        field: 'title',
        icon: 'content_copy'
      }]
    },
    createEventActions () {
      return this.eventTemplate ? ['Continue', 'Cancel'] : ['Cancel']
    },
    eventsGridQuery () {
      return {}
    },
    templatesGridQuery () {
      return {}
    }
  },
  data () {
    return {
      selection: null,
      eventTemplate: null
    }
  },
  methods: {
    refreshActions () {
      this.clearActions()
      if (this.$can('create', 'events', this.contextId)) {
        this.registerAction('events', { name: 'create-event', label: 'Create', icon: 'add', handler: this.createEvent })
      }
      if (this.$can('update', 'events', this.contextId)) {
        this.registerAction('event', { name: 'edit-event', label: 'Edit', icon: 'description', route: {
          name: 'events-activity', params: { contextId: this.contextId, operation: 'edit-event-template' } }
        })
      }
      if (this.$can('remove', 'events', this.contextId)) {
        this.registerAction('event', { name: 'remove-event', label: 'Remove', icon: 'remove_circle', handler: this.removeEvent })
      }
      if (this.$can('create', 'event-templates', this.contextId)) {
        this.registerAction('templates', { name: 'create-event-template', label: 'Add', icon: 'add', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'create-event-template' } }
        })
      }
      if (this.$can('update', 'event-templates', this.contextId)) {
        this.registerAction('template', { name: 'edit-event-template', label: 'Edit', icon: 'edit', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'edit-event-template' } }
        })
      }
      if (this.$can('remove', 'event-templates', this.contextId)) {
        this.registerAction('template', { name: 'remove-event-template', label: 'Remove', icon: 'remove_circle', handler: this.removeTemplate })
      }
      if (this.$can('read', 'events', this.contextId)) {
        this.registerAction('tab', { name: 'current-events', label: 'Current events', icon: 'playlist_play', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'current-events' } } 
        })
      }
      if (this.$can('read', 'event-templates', this.contextId)) {
        this.registerAction('tab', { name: 'event-templates', label: 'Templates', icon: 'content_copy', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'event-templates' } } 
        })
      }
    },
    createEvent () {
      this.$refs.createEventDialog.open()
    },
    onUpdateEventTemplate (items) {
      this.eventTemplate = items.length > 0 ? items[0] : null
    },
    onCreateEventActionTriggered (action) {
      this.$refs.createEventDialog.close()
      if (action === 'Continue') {
        this.$router.push({ 
          name: 'events-activity', 
          params: { contextId: this.contextId, id: this.eventTemplate._id, operation: 'create-event' } 
        })
      }
    },
    removeEvent (event) {
      this.selection = event
      this.$refs.removeEventDialog.open()
    },
    onRemoveEventConfirmed () {
      this.$refs.removeEventDialog.close()
      this.$api.getService('events').remove(this.selection.id)
    },
    removeTemplate (template) {
      this.selection = template
      this.$refs.removeTemplateDialog.open()
    },
    onRemoveTemplateConfirmed () {
      this.$refs.removeTemplateDialog.close()
      this.$api.getService('event-templates').remove(this.selection.id)
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-nav-bar'] = this.$load('layout/KNavBar')
    this.$options.components['k-event-editor'] = this.$load('KEventEditor')
    this.$options.components['k-event-template-editor'] = this.$load('KEventTemplateEditor')
    this.$options.components['k-item-chooser'] = this.$load('form/KItemChooser')
    this.$options.components['k-grid'] = this.$load('collection/KGrid')
    this.$options.components['k-fab'] = this.$load('collection/KFab')
    this.$options.components['k-dialog'] = this.$load('frame/KDialog')
    this.$options.components['k-confirm'] = this.$load('frame/KConfirm')
  }
}
</script>