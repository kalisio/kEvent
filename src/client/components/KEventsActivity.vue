<template>
  <div>
    <!-- Manage routing = event/template management -->
    <div v-if="operation === 'manage'">
    </div>
    <!-- Default routing = event/template list -->
    <div v-else>
      <k-nav-bar :tabs="eventsTabs()" :selected="perspective" />
      <div v-if="perspective === 'current-events'">
        <k-grid ref="eventsGrid" :context="contextId" service="events" :base-query="eventsGridQuery" :actions="eventItemActions()" />
        <k-fab :actions="eventActions()" />
      </div>
      <div v-else-if="perspective === 'event-templates'">
        <k-grid ref="templatesGrid" :context="contextId" service="event-templates" :base-query="templatesGridQuery" :actions="templateItemActions()" />
        <k-fab :actions="templateActions()" />
      </div>
      <!-- Create event dialog -->
      <k-popup-editor ref="createEventDialog" 
        title="Create a new Event ?" 
        :context="contextId" 
        service="events" 
      />
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
    eventsGridQuery () {
      return {}
    },
    templatesQuery () {
      return {}
    }
  },
  data () {
    return {
      selection: null
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
    removeEvent () {
      this.selection = event
      this.$refs.deleteEventDialog.open()
    },
    removeEventConfirmed (event) {
      this.$refs.deleteEventDialog.close()
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
        params: { context: this.contextId, operation: 'manage', perspective: 'create-template' } 
      })
    },
    editTemplate () {
      this.$router.push({ 
        name: 'events-activity', 
        params: { context: this.contextId, operation: 'manage', perspective: 'edit-template' } 
      })
    },
    removeTemplate () {
      this.selection = template
      this.$refs.deleteTemplateDialog.open()
    },
    removeTemplateConfirmed (template) {
      this.$refs.deleteTemplateDialog.close()
      this.$api.getService('event-templates').remove(this.selection.id)
    }
  },
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-nav-bar'] = loadComponent('layout/KNavBar')
    this.$options.components['k-popup-editor'] = loadComponent('editor/KPopupEditor')
    this.$options.components['k-grid'] = loadComponent('collection/KGrid')
    this.$options.components['k-fab'] = loadComponent('collection/KFab')
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