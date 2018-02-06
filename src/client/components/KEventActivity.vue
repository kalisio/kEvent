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
        this.event = event
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
      let popup = L.popup({ autoPan: false }, layer)
      const step = this.getWorkflowStep(feature)
      // Check for any recorded interaction to be displayed
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        return popup.setContent('Action required')
      } else if (this.waitingInteraction(step, feature, 'participant')) {
        return popup.setContent('Awaiting information')
      } else if (this.hasInteraction(feature)) {
        return popup.setContent(feature.interaction.value)
      } else {
        return null
      }
    },
    getFeatureTooltip (feature, layer) {
      // Default content is participant name
      let tooltip = L.tooltip({ permanent: true }, layer)
      const step = this.getWorkflowStep(feature)
      const name = _.get(feature, 'participant.name', 'Unamed')
      // Check for any interaction to be performed
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        return tooltip.setContent('<b>' + name + ' - Action required' + '</b>')
      } else if (this.waitingInteraction(step, feature, 'participant')) {
        return tooltip.setContent('<b>' + name + ' - Awaiting information' + '</b>')
      } else {
        return tooltip.setContent('<b>' + name + '</b>')
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
      const feature = _.get(event, 'layer.feature')
      if (!feature) return
      const step = this.getWorkflowStep(feature)
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        this.$router.push({ name: 'event-log', params: { logId: event.layer.feature._id } })
      }
    }
  },
  mounted () {
    this.setupMap()
    let query = { lastInEvent: true, event: this.id }
    let clusterOptions = { spiderfyDistanceMultiplier: 5.0 }
    this.addServiceLayer('Actors', 'event-logs', query, null, clusterOptions)
    this.$on('popupopen', this.onPopupOpen)
  },
  beforeDestroy () {
    this.removeServiceLayer('Actors')
    this.$off('popupopen', this.onPopupOpen)
  }
}
</script>
