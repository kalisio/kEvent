<template>
  <div>
    <q-window-resize-observable @resize="onWindowResized" />
    <div v-if="id !== ''" class="column justify-center full-width">
      <div class="row full-width">
        <div class="col-3 full-height" v-if="pane">
          <q-scroll-area :style="paneStyle">
            <q-list separator>
              <q-item v-for="actor in items" :key="actor._id">
                <q-item-side :icon="getIcon(actor).name"  :color="getIcon(actor).color" />
                <q-item-main :label="actor.participant.name" />
                <q-item-side right>
                  <q-btn flat round small color="primary" @click="onActorClicked(actor)"><q-icon name="remove_red_eye" /></q-btn>
                </q-item-side>
              </q-item>
            </q-list>
          </q-scroll-area>
        </div>      
        <div class="col-auto full-height">
          <div id="map" :style="mapStyle">
          </div>
        </div>
      </div>
      <div>
        <router-view service="events" :router="router()"></router-view>
      </div>
    </div>
  </div>
</template>

<script>
import { QWindowResizeObservable, QScrollArea, QBtn, QList, QItem, QItemSide, QItemMain, QItemTile, QItemSeparator, QIcon, dom } from 'quasar'
import { Store, mixins as kCoreMixins, utils as kCoreUtils } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import mixins from '../mixins'

const { offset } = dom

export default {
  name: 'k-event-activity',
  components: {
    QWindowResizeObservable,
    QScrollArea,
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
  computed: {
    paneStyle () {
      return 'width: 100%; height: ' + this.viewport.height + 'px'
    },
    mapStyle () {
      let width = this.pane === true ? 75 : 100
      return 'width: ' + width + '%; height: 100%; fontWeight: normal; zIndex: 0; position: absolute'
    }
  },
  data () {
    return {
      viewport: {
        width: 0,
        height: 0
      },
      mapOffset: {
        left: 0.0,
        top: 0
      },
      pane: true,
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
      return { event: this.id }
    },
    async refreshEvent () {
      this.event = await this.$api.getService('events', this.contextId).get(this.id)
      this.setTitle(this.event.name)
      // Located event ?
      if (this.event.location && this.event.location.longitude && this.event.location.latitude) {
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
        name: 'edit-event', label: 'Event properties', icon: 'description', 
        route: { name: 'edit-event', params: { contextId: this.contextId, service: 'events', id: this.id } } 
      })
      let label = this.pane === false ? 'View actors pane' : 'Hide actors pane'
      this.registerFabAction({ 
        name: 'toggle-pnae', label: label, icon: 'toc',
        handler: this.togglePane 
      })
      this.refreshCollection()
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
        return tooltip.setContent('<b>' + name + '<br>Action required' + '</b>')
      } else if (this.waitingInteraction(step, feature, 'participant')) {
        return tooltip.setContent('<b>' + name + '<br>Awaiting information' + '</b>')
      } else {
        return tooltip.setContent('<b>' + name + '</b>')
      }
    },
    togglePane () {
      this.pane = !this.pane
      this.$nextTick(() => {
        this.refreshMap()
      })
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
          if (feature.geometry && feature.geometry.coordinates) this.center(feature.geometry.coordinates[0], feature.geometry.coordinates[1])
        } 
      })
    },
    onWindowResized (size) {
      let mapElement = document.getElementById('map')
      this.viewport.width = size.width
      this.viewport.height = size.height - offset(mapElement).top
    }
  },
  mounted () {
    this.setupMap()
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
