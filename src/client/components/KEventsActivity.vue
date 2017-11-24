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
      <k-nav-bar :tabs="eventsTabs()" :selected="operation" />
      <div v-if="operation === 'current-events'">
        <k-grid ref="eventsGrid" service="events" :renderer-options="{ nameField: 'title' }" :base-query="eventsGridQuery" :actions="eventItemActions()" />
        <k-fab :actions="eventActions()" />
      </div>
      <div v-else-if="operation === 'event-templates'">
        <k-grid ref="templatesGrid" service="event-templates" :renderer-options="{ nameField: 'title' }" :base-query="templatesGridQuery" :actions="templateItemActions()" />
        <k-fab :actions="templateActions()" />
      </div>
      <!-- Create event dialog -->
      <k-dialog ref="createEventDialog" title="Select your template" :closable="false" :actions="createEventactions" @action-triggered="onCreateEventActionTriggered">
        <div slot="dialog-content">
          <k-item-chooser ref="templateChooser" :default-items="[]" :services="templateService" @item-selection-changed="onUpdateEventTemplate"/>
        </div>
      </k-dialog>
      <!-- Remove event dialog -->
      <k-confirm ref="removeEventDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="onRemoveEventConfirmed" 
      />
      <!-- Remove template dialog -->
      <k-confirm ref="removeTemplateDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="onRemoveTemplateConfirmed" 
      />
    </div>
  </div>
</template>

<script>
import { mixins as kCoreMixins } from 'kCore/client'

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
    createEventactions () {
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
    eventsTabs () {
      return [ 
        { name: 'current-events', label: 'Current events', icon: 'playlist_play', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'current-events' } } 
        },
        { name: 'event-templates', label: 'Templates', icon: 'content_copy', route: { 
          name: 'events-activity', params: { contextId: this.contextId, operation: 'event-templates' } } 
        }       
      ]
    },
    eventActions () {
      return this.filterActions(['createEvent'])
    },
    eventItemActions () {
      return this.filterActions(['editEvent'])
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
          params: { context: this.contextId, id: this.eventTemplate._id, operation: 'create-event' } 
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
    editEvent (event) {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, id: event._id, operation: 'edit-event' } 
      })
    },
    templateActions () {
      return this.filterActions(['createTemplate'])
    },
    templateItemActions () {
      return this.filterActions(['editTemplate', 'removeTemplate'])
    },
    createTemplate () {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, operation: 'create-event-template' } 
      })
    },
    editTemplate (template) {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, id: template._id, operation: 'edit-event-template' } 
      })
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
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-nav-bar'] = loadComponent('layout/KNavBar')
    this.$options.components['k-event-editor'] = loadComponent('KEventEditor')
    this.$options.components['k-event-template-editor'] = loadComponent('KEventTemplateEditor')
    this.$options.components['k-item-chooser'] = loadComponent('form/KItemChooser')
    this.$options.components['k-grid'] = loadComponent('collection/KGrid')
    this.$options.components['k-fab'] = loadComponent('collection/KFab')
    this.$options.components['k-dialog'] = loadComponent('frame/KDialog')
    this.$options.components['k-confirm'] = loadComponent('frame/KConfirm')
    // Register the actions
    this.registerAction('createEvent', { label: 'Create', icon: 'add' })
    this.registerAction('editEvent', { label: 'Edit', icon: 'description' })
    this.registerAction('removeEvent', { label: 'Remove', icon: 'remove_circle' })
    this.registerAction('createTemplate', { label: 'Create', icon: 'add' })
    this.registerAction('editTemplate', { label: 'Edit', icon: 'edit' })
    this.registerAction('removeTemplate', { label: 'Remove', icon: 'remove_circle' })
  }
}
</script>