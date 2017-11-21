<template>
  <div>
    <!-- Manage routing = event/template management -->
    <div v-if="operation === 'manage'">
      <div v-if="perspective === 'create-event'">
        <k-event-editor service="events" />
      </div>
      <div v-else-if="perspective === 'edit-event'">
        <k-event-editor service="events" :id="id" />
      </div>
      <div v-else-if="perspective === 'create-event-template'">
        <k-event-template-editor service="event-templates" />
      </div>
      <div v-else-if="perspective === 'edit-event-template'">
        <k-event-template-editor service="event-templates" :id="id" />
      </div>
    </div>
    <!-- Default routing = event/template list -->
    <div v-else>
      <k-nav-bar :tabs="eventsTabs()" :selected="perspective" />
      <div v-if="perspective === 'current-events'">
        <k-grid ref="eventsGrid" service="events" :base-query="eventsGridQuery" :actions="eventItemActions()" />
        <k-fab :actions="eventActions()" />
      </div>
      <div v-else-if="perspective === 'event-templates'">
        <k-grid ref="templatesGrid" service="event-templates" :base-query="templatesGridQuery" :actions="templateItemActions()" />
        <k-fab :actions="templateActions()" />
      </div>
      <!-- Create event dialog -->
      <k-dialog ref="createEventDialog" title="Select your template" :closable="false" :actions="createEventactions" @action-triggered="onCreateEventActionTriggered">
        <div slot="dialog-content">
          <k-item-chooser ref="templateChooser" :items="template" :services="templateService" />
        </div>
      </k-dialog>
      <!-- Remove event dialog -->
      <k-confirm ref="removeEventDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="removeEventConfirmed" 
      />
      <!-- Remove template dialog -->
      <k-confirm ref="removeTemplateDialog" 
        :title="`Are you sure you want to remove '${selectionName}' ?`"
        action="Yes"
        @confirmed="removeTemplateConfirmed" 
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
      return this.selection ? this.selection.name : ''
    },
    templateService () {
      return [{
        service: 'event-templates',
        field: 'title',
        icon: 'content_copy'
      }]
    },
    createEventactions () {
      return this.template.length > 0 ? ['Continue', 'Cancel'] : ['Cancel']
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
      template: []
    }
  },
  methods: {
    eventsTabs () {
      return [ 
        { name: 'current-events', label: 'Current events', icon: 'playlist_play', route: { 
          name: 'events-activity', params: { contextId: this.contextId, perspective: 'current-events' } } 
        },
        { name: 'event-templates', label: 'Templates', icon: 'content_copy', route: { 
          name: 'events-activity', params: { contextId: this.contextId, perspective: 'event-templates' } } 
        }       
      ]
    },
    eventActions () {
      return this.filterActions(['createEvent'])
    },
    eventItemActions () {
      return this.filterActions(['manageEventMap', 'manageEventProperties'])
    },
    createEvent () {
      this.$refs.createEventDialog.open()
    },
    onCreateEventActionTriggered (action) {
      this.$refs.createEventDialog.close()
      if (action === 'Continue') {
        this.$router.push({ 
          name: 'events-activity', 
          params: { context: this.contextId, operation: 'manage', perspective: 'create-event' } 
        })
      }
    },
    removeEvent (event) {
      this.selection = event
      this.$refs.removeEventDialog.open()
    },
    removeEventConfirmed () {
      this.$refs.removeEventDialog.close()
      this.$api.getService('events').remove(this.selection.id)
    },
    manageEventProperties (event) {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, operation: 'manage', id: event._id, perspective: 'properties' } 
      })
    },
    manageEventMap (event) {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, operation: 'manage', id: event._id, perspective: 'map' } 
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
        params: { context: this.contextId, operation: 'manage', perspective: 'create-event-template' } 
      })
    },
    editTemplate (template) {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, operation: 'manage', id: template._id, perspective: 'edit-event-template' } 
      })
    },
    removeTemplate (template) {
      this.selection = template
      this.$refs.removeTemplateDialog.open()
    },
    removeTemplateConfirmed () {
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
    this.registerAction('manageEventMap', { label: 'Map', icon: 'map' })
    this.registerAction('manageEventProperties', { label: 'Properties', icon: 'description' })
    this.registerAction('removeEvent', { label: 'Remove', icon: 'remove_circle' })
    this.registerAction('createTemplate', { label: 'Create', icon: 'add' })
    this.registerAction('editTemplate', { label: 'Edit', icon: 'edit' })
    this.registerAction('removeTemplate', { label: 'Remove', icon: 'remove_circle' })
  }
}
</script>