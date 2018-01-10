<template>
  <div v-if="id !== ''" class="row justify-center full-width">
    <div v-if="pane === 'properties'" class="col-11">
      <k-editor service="events" :id="id" />
    </div>
    <div v-if="pane === 'map'" class="col-12">
      <k-map  />
    </div>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { Dialog } from 'quasar'

export default {
  name: 'k-event-activity',
  mixins: [kCoreMixins.baseActivity],
  props: {
    contextId: {
      type: String,
      required: true
    },
    id: {
      type: String,
      required: true
    },
    pane: {
      type: String,
      required: true
    }
  },
  methods: {
    router () {
      return { 
        onApply: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: this.pane } },
        onDismiss: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: this.pane } }
      }
    },
    refreshActivity () {
      this.clearActivity()
      // Title
      this.$api.getService('events', this.contextId).get(this.id)
      .then(event => {
        this.setTitle(event.name)
      })
      // Tabbar actions
      this.registerTabAction({ 
        name: 'event-properties', label: 'Properties', icon: 'description',
        route: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: 'properties' } },
        default: true
      })
      this.registerTabAction({ 
        name: 'event-map', label: 'Map', icon: 'map',
        route: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: 'map' } },
        default: true
      })
      // Fab actions
      // Item actions
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-map'] = this.$load('KMap')
    this.$options.components['k-editor'] = this.$load('editor/KEditor')
  }
}
</script>
