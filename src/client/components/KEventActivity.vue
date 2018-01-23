<template>
  <div v-if="id !== ''" class="column justify-center full-width">
    <div class="full-width full-height">
      <div id="map" :style="mapStyle()"></div>
    </div>
    <div>
      <router-view service="events" :router="router()"></router-view>
    </div>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'

export default {
  name: 'k-event-activity',
  mixins: [
    kCoreMixins.baseActivity,
    kMapMixins.map.baseMap,
    kMapMixins.map.baseLayers,
    kMapMixins.map.geojsonLayers,
    kMapMixins.map.serviceLayers
  ],
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
      // Fab actions
      this.registerFabAction({ 
        name: 'browse-media', label: 'Browse media', icon: 'collections', 
        route: { name: 'browse-media', params: { contextId: this.contextId, id: this.id } } 
      })
      this.registerFabAction({ 
        name: 'edit-event', label: 'Properties', icon: 'description', 
        route: { name: 'edit-event', params: { contextId: this.contextId, service: 'events', id: this.id } } 
      })
    },
    mapStyle () {
      return { 
        width: '100%', 
        height: '100%',
        fontWeight: 'normal', 
        zIndex: 0, 
        position: 'absolute' 
      }
    }
  },
  mounted () {
    this.setupMap()
    this.addServiceLayer('Actors', 'event-logs', { event: this.id })
  },
  beforeDestroy () {
    this.removeServiceLayer('Actors')
  }
}
</script>
