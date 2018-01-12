<template>
  <div v-if="id !== ''" class="column justify-center full-width">
    <div class="full-width full-height">
      <k-map  />
    </div>
    <div>
      <router-view service="events" :router="router()"></router-view>
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
    }
  },
  methods: {
    router () {
      return { 
        onApply: { name: 'event-activity', params: { contextId: this.contextId, id: this.id } },
        onDismiss: { name: 'event-activity', params: { contextId: this.contextId, id: this.id } }
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
     /* this.registerTabAction({ 
        name: 'event-properties', label: 'Properties', icon: 'description',
        route: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: 'properties' } },
        default: true
      })
      this.registerTabAction({ 
        name: 'event-map', label: 'Map', icon: 'map',
        route: { name: 'event-activity', params: { contextId: this.contextId, id: this.id, pane: 'map' } },
        default: true
      }) */
      // Fab actions
      this.registerFabAction({ 
        name: 'browse-media', label: 'Browse media', icon: 'collections', 
        route: { name: 'browse-media', params: { contextId: this.contextId, id: this.id } } 
      })
      this.registerFabAction({ 
        name: 'edit-event', label: 'Properties', icon: 'description', 
        route: { name: 'edit-event', params: { contextId: this.contextId, service: 'events', id: this.id } } 
      })
      // Item actions
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-map'] = this.$load('KMap')
  }
}
</script>
