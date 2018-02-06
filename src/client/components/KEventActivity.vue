<template>
  <div v-if="id !== ''" class="column justify-center full-width">
    <div class="row full-width">
      <div class="col-3">
        <q-list link separator>
          <q-item v-for="actor in items" :key="actor._id" @click="onActorClicked(actor)">
            <q-item-side :icon="getIcon(actor).name"  :color="getIcon(actor).color" />
            <q-item-main :label="actor.participant.name" />
          </q-item>
        </q-list>
      </div>      
      <div class="col-9 full-height">
        <div id="map" :style="mapStyle()"></div>
      </div>
    </div>
    <div>
      <router-view service="events" :router="router()"></router-view>
    </div>
  </div>
</template>

<script>
import { QBtn, QList, QItem, QItemSide, QItemMain, QItemTile, QItemSeparator, QIcon } from 'quasar'
import { Store, mixins as kCoreMixins, utils as kCoreUtils } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import mixins from '../mixins'

export default {
  name: 'k-event-activity',
  components: {
    QBtn,
    QList,
    QItem,
    QItemSide, 
    QItemMain,
    QItemTile,
    QItemSeparator,
    QIcon
  },
  mixins: [
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    kMapMixins.map.baseMap,
    kMapMixins.map.baseLayers,
    kMapMixins.map.geojsonLayers,
    kMapMixins.map.collectionLayer,
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
  data () {
    return {
      actors: false,
      actorRenderer: { 
        component: 'KActorCard', 
        props: {
          options: {
            layout: 'col-12'
          }
        } 
      }
    }
  },
  methods: {
    router () {
      return { 
        onApply: { name: 'event-activity', params: { contextId: this.contextId, id: this.id } },
        onDismiss: { name: 'event-activity', params: { contextId: this.contextId, id: this.id } }
      }
    },
    loadService () {
      return this.$api.getService('event-logs')
    },
    getCollectionBaseQuery () {
      return { lastInEvent: true, event: this.id }
    },
    async refreshEvent () {
      this.event = await this.$api.getService('events', this.contextId).get(this.id)
      this.setTitle(this.event.name)
      // Located event ?
      if (this.event.location) {
        // Recenter map
        this.center(this.event.location.longitude, this.event.location.latitude, 15)
        // And add event marker
        let marker = L.marker([this.event.location.latitude, this.event.location.longitude],{
          icon: L.icon.fontAwesome({
            iconClasses: 'fa ' + this.event.icon.name || 'fa-circle',
            markerColor: kCoreUtils.Colors[this.event.icon.color || 'blue'],
            iconColor: '#FFF'
          })
        })
        // Address as popup
        marker.bindPopup(this.event.location.name)
        marker.addTo(this.map)
      }
    },
    refreshActivity () {
      this.clearActivity()
      this.refreshEvent()
      // Fab actions
      this.registerFabAction({ 
        name: 'browse-media', label: 'Browse media', icon: 'collections', 
        route: { name: 'browse-media', params: { contextId: this.contextId, id: this.id } } 
      })
      this.registerFabAction({ 
        name: 'edit-event', label: 'Properties', icon: 'description', 
        route: { name: 'edit-event', params: { contextId: this.contextId, service: 'events', id: this.id } } 
      })
      this.refreshCollection()
    },
    getActorIcon (actor) {
      let icon = this.getIcon(actor)
      console.log(icon)
      return 'fa-' + icon
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
        width: '75%', 
        height: '100%',
        fontWeight: 'normal', 
        zIndex: 0, 
        position: 'absolute' 
      }
    },
    onPopupOpen (event) {
      const feature = _.get(event, 'layer.feature')
      if (!feature) return
      const step = this.getWorkflowStep(feature)
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        this.$router.push({ name: 'event-log', params: { logId: event.layer.feature._id } })
      }
    },
    onActorClicked (actor) {
      this.collectionLayer.eachLayer(layer => {
        if (layer.feature && layer.feature._id === actor._id) {
          let feature = layer.feature
          if (feature.geometry && feature.geometry.coordinates) {
            this.map.flyTo(L.GeoJSON.coordsToLatLng(layer.feature.geometry.coordinates), 14)  
          }
        } 
      })
    }
  },
  mounted () {
    if (! this.map) this.setupMap()
    this.addCollectionLayer('Actors', { spiderfyDistanceMultiplier: 5.0 })
    // Setup event connections
    this.$on('popupopen', this.onPopupOpen)
    this.$on('collection-refreshed', this.refreshLayer)
  },
  beforeDestroy () {
    this.removeCollectionLayer('Actors')
    // Remove event connections
    this.$off('popupopen', this.onPopupOpen)
    this.$off('collection-refreshed', this.refreshLayer)
  }
}
</script>
