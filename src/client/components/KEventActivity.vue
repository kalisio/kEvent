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
import { Store, mixins as kCoreMixins, utils as kCoreUtils } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import mixins from '../mixins'

export default {
  name: 'k-event-activity',
  mixins: [
    kCoreMixins.baseActivity,
    kMapMixins.map.baseMap,
    kMapMixins.map.baseLayers,
    kMapMixins.map.geojsonLayers,
    kMapMixins.map.serviceLayers,
    mixins.eventLogs
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
        this.item = event
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
    getPointMarker (feature, latlng) {
      const icon = this.getIcon(feature)
      return this.createMarkerFromStyle(latlng, {
        icon: {
          type: 'icon.fontAwesome',
          options: {
            iconClasses: 'fa ' + (icon.name || 'fa-user'),
            markerColor: kCoreUtils.Colors[(icon.color || 'blue')],
            iconColor: '#FFF'
          }
        }
      })
    },
    getFeaturePopup (feature, layer) {
      if (!this.waitingInteraction(this.getWorkflowStep(feature), feature, 'coordinator')) {
        return L.popup({ autoPan: false }, layer).setContent(feature.interaction.value)
      } else {
        // No popup because we redirect on editor when action is required
        return null
      }
    },
    getFeatureTooltip (feature, layer) {
      if (this.waitingInteraction(this.getWorkflowStep(feature), feature, 'coordinator')) {
        return L.tooltip({ permanent: true }, layer).setContent('Action required')
      } else {
        return L.tooltip({ permanent: true }, layer).setContent(feature.participant)
      }
    },
    mapStyle () {
      return { 
        width: '100%', 
        height: '100%',
        fontWeight: 'normal', 
        zIndex: 0, 
        position: 'absolute' 
      }
    },
    onPopupOpen(event) {
      if (this.waitingInteraction(this.getWorkflowStep(feature), feature, 'coordinator')) {
        this.$router.push({ name: 'event-log', params: { logId: event.layer.feature._id } })
      }
    }
  },
  mounted () {
    this.setupMap()
    this.addServiceLayer('Actors', 'event-logs', {
      lastInEvent: true,
      event: this.id
    })
    this.$on('popupopen', this.onPopupOpen)
  },
  beforeDestroy () {
    this.removeServiceLayer('Actors')
    this.$off('popupopen', this.onPopupOpen)
  }
}
</script>
