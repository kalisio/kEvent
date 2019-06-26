<template>
  <div>
    <div ref="map" :style="viewStyle">
      <q-resize-observable @resize="onMapResized" />
      <k-widget ref="timeseriesWidget" :offset="{ minimized: [18,18], maximized: [0,0] }" :title="probedLocationName" @state-changed="onUpdateTimeseries">
        <div slot="widget-content">
          <k-location-time-series ref="timeseries"
            :feature="probedLocation" 
            :variables="variables"
            :current-time-format="currentTimeFormat"
            :current-formatted-time="currentFormattedTime" />
        </div>
      </k-widget>
    </div>
    <q-btn 
      id="map-panel-toggle"
      color="secondary"
      class="fixed"
      style="right: 18px; top: 72px"
      small
      round 
      icon="layers"
      @click="layout.toggleRight()" />
    <k-uploader ref="uploader" :resource="objectId" :base-query="uploaderQuery()" :options="uploaderOptions()"/>
    <k-media-browser ref="mediaBrowser" :options="mediaBrowserOptions()" />
    <k-color-legend v-if="colorLegend.visible"
      class="fixed"
      :style="colorLegendStyle"
      :unit="colorLegend.unit"
      :hint="colorLegend.hint"
      :colorMap="colorLegend.colorMap"
      :colors="colorLegend.colors"
      :values="colorLegend.values"
      :unitValues="colorLegend.unitValues"
      :showGradient="colorLegend.showGradient"
      @click="onColorLegendClick" />
    />

    <q-fixed-position corner="bottom-left" :offset="[110, 60]" :style="timelineContainerStyle">   
      <k-time-controller
        v-if="timelineEnabled"
        :key="timelineRefreshKey"
        :min="timeline.start" 
        :max="timeline.end"
        :step="'h'"
        :value="timeline.current"
        :timeInterval="timelineInterval"
        :timeFormatter="timelineFormatter"
        @change="onTimelineUpdated"
        pointerColor="#8bc34a" 
        pointerTextColor="white"
        style="width: 100%;"
      />
    </q-fixed-position>
    <div>
      <router-view service="events" :router="router()"></router-view>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import L from 'leaflet'
import { Events, QResizeObservable, QFixedPosition, QBtn, QIcon } from 'quasar'
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'
import mixins from '../mixins'

const activityMixin = kMapMixins.activity('event')

export default {
  name: 'k-event-activity',
  inject: ['layout'],
  components: {
    QResizeObservable,
    QFixedPosition,
    QBtn,
    QIcon
  },
  mixins: [
    kCoreMixins.refsResolver(['map']),
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    kMapMixins.featureService,
    kMapMixins.weacast,
    kMapMixins.time,
    kMapMixins.timeline,
    kMapMixins.timeseries,
    activityMixin,
    kMapMixins.legend,
    kMapMixins.locationIndicator,
    kMapMixins.map.baseMap,
    kMapMixins.map.geojsonLayers,
    kMapMixins.map.forecastLayers,
    kMapMixins.map.style,
    kMapMixins.map.tooltip,
    kMapMixins.map.popup,
    kMapMixins.map.activity,
    mixins.eventLogs
  ],
  props: {
    contextId: {
      type: String,
      required: true
    },
    objectId: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      filter: null,
      event: {},
      participants: []
    }
  },
  methods: {
    router () {
      return {
        onApply: { name: 'event-activity', params: { contextId: this.contextId, objectId: this.objectId } },
        onDismiss: { name: 'event-activity', params: { contextId: this.contextId, objectId: this.objectId } }
      }
    },
    loadService () {
      return this.$api.getService('event-logs')
    },
    getCollectionBaseQuery () {
      return { lastInEvent: true, event: this.objectId }
    },
    async refreshActivity () {
      this.clearActivity()
      this.event = await this.$api.getService('events', this.contextId).get(this.objectId)
      this.setTitle(this.event.name)
      // Setup the right pane
      this.setRightPanelContent('KEventActivityPanel', this.$data)
      // Wait until map is ready
      await this.initializeMap()
      // If we'd like to only work in real-time
      //this.setCurrentTime(moment.utc())
      this.registerActivityActions()
      // Custom actions
      if (this.$can('update', 'events', this.contextId, this.event)) {
        this.registerFabAction({
          name: 'add-media', label: this.$t('KEventActivity.ADD_MEDIA_LABEL'), icon: 'add_a_photo', handler: this.uploadMedia
        })
      }
      if (this.$can('read', 'events', this.contextId, this.event)) {
        this.registerFabAction({
          name: 'browse-media', label: this.$t('KEventActivity.BROWSE_MEDIA_LABEL'), icon: 'photo_library', handler: this.browseMedia
        })
      }
      if (this.$can('update', 'events', this.contextId, this.event)) {
        this.registerFabAction({
          name: 'edit-event',
          label: this.$t('KEventActivity.EDIT_LABEL'),
          icon: 'description',
          route: { name: 'edit-event', params: { contextId: this.contextId, service: 'events', objectId: this.objectId } }
        })
      }
      // Located event ?
      if (this.event.location && this.event.location.longitude && this.event.location.latitude) {
        // Recenter map
        this.center(this.event.location.longitude, this.event.location.latitude, 15)
        // And add event marker
        let marker = L.marker([this.event.location.latitude, this.event.location.longitude], {
          icon: L.icon.fontAwesome({
            iconClasses: 'fa ' + this.event.icon.name || 'fa-circle',
            markerColor: kCoreUtils.Colors[this.event.icon.color || 'blue'],
            iconColor: '#FFFFFF'
          })
        })
        // Address as popup
        marker.bindPopup(this.event.location.name)
        marker.addTo(this.map)
      }
      // Create an empty layer used as a container for participants
      this.addLayer({
        name: this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME'),
        type: 'OverlayLayer',
        icon: 'fa-user',
        featureId: 'participant._id',
        leaflet: {
          type: 'geoJson',
          realtime: true,
          isVisible: true,
          cluster: { spiderfyDistanceMultiplier: 5.0 }
        }
      })
      // Then update it
      this.refreshCollection()
    },
    async getCatalogLayers () {
      // We get layers coming from global catalog first
      let response = await this.$api.getService('catalog', '').find()
      let layers = response.data
      // Then merge layers coming from contextual catalog by calling super
      response = await activityMixin.methods.getCatalogLayers.call(this)
      layers = layers.concat(response)
      return layers
    },
    uploadMedia () {
      this.$refs.uploader.open(this.event.attachments)
    },
    browseMedia () {
      this.$refs.mediaBrowser.open(this.event.attachments)
    },
    filterItem (item) {
      // Is there any filter active ?
      if (!this.filter) return true
      // Is it the same step ?
      if (item.step !== this.filter.step) return false
      // Is it the same interaction ?
      if (item.interaction) {
        if (item.interaction.value === this.filter.interaction) return true
        return false
      }
      if (item.previous && item.previous.interaction) {
        if (item.previous.interaction.value === this.filter.interaction) return true
        return false
      }
      return true
    },
    refreshParticipantsLayer (name) {
      this.participants.splice(0, this.participants.length)
      _.filter(this.items, (item) => this.filterItem(item)).forEach(item => this.participants.push(item))
      this.updateLayer(this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME'), { type: 'FeatureCollection', features: this.participants })
    },
    getParticipantMarker (feature, latlng, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      return this.createMarkerFromStyle(latlng, {
        icon: {
          type: 'icon.fontAwesome',
          options: {
            iconClasses: 'fa ' + _.get(feature, 'icon.name', 'fa-user'),
            markerColor: kCoreUtils.Colors[_.get(feature, 'icon.color', 'blue')],
            iconColor: '#FFFFFF'
          }
        }
      })
    },
    getParticipantPopup (feature, layer, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      let popup = L.popup({ autoPan: false }, layer)
      const step = this.getWorkflowStep(feature)
      // Check for any recorded interaction to be displayed
      // Nothing visible because clicking on the marker opens a dialog in this case
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        return null
      }
      // Already shown in tooltip
      /*
      if (this.waitingInteraction(step, feature, 'participant')) {
        return popup.setContent('Awaiting information')
      }
      */
      // Recall last interaction state
      const interaction = this.getInteraction(feature)
      if (interaction) {
        return popup.setContent(interaction)
      } else {
        return null
      }
    },
    getParticipantTooltip (feature, layer, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      // Default content is participant name
      let tooltip = L.tooltip({ permanent: true }, layer)
      const step = this.getWorkflowStep(feature)
      const name = _.get(feature, 'participant.name', this.$t('KEventActivity.UNAMED'))
      // Check for any interaction to be performed
      if (this.waitingInteraction(step, feature, 'coordinator')) {
        return tooltip.setContent('<b>' + name + '<br>' + this.$t('KEventActivity.ACTION_REQUIRED') + '</b>')
      } else if (this.waitingInteraction(step, feature, 'participant')) {
        return tooltip.setContent('<b>' + name + '<br>' + this.$t('KEventActivity.AWAITING_INFORMATION') + '</b>')
      } else {
        return tooltip.setContent('<b>' + name + '</b>')
      }
    },
    onPopupOpen (event) {
      const feature = _.get(event, 'layer.feature')
      if (!feature) return
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onFeatureClicked (options, event) {
      const feature = _.get(event, 'target.feature')
      if (!feature) return
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onZoomToParticipant (participant) {
      const layer = this.getLeafletLayerByName(this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME'))
      if (!layer) return
      layer.eachLayer(layer => {
        const id = _.get(layer, 'feature._id')
        if (id === participant._id) {
          const coordinates = _.get(layer, 'feature.geometry.coordinates')
          if (coordinates) this.center(coordinates[0], coordinates[1])
        }
      })
    },
    onFilterParticipantStates (participant) {
      const step = this.getWorkflowStep(participant)
      // Not applicable when no workflow
      if (!step) return
      // If a filter is alredy active then clear it
      if (!this.filter) {
        // Defines the filter to the participant's state
        this.filter = {
          'step': step.name,
          'interaction': undefined
        }
        if (participant.interaction) this.filter.interaction = participant.interaction.value
        else if (participant.previous && participant.previous.interaction) this.filter.interaction = participant.previous.interaction.value
      } else {
        this.filter = null
      }
      this.refreshParticipantsLayer()
    },
    getCollectionPaginationQuery () {
      // No pagination on map items
      return {}
    },
    onCollectionRefreshed () {
      this.items.forEach((item) => {
        item.icon = this.getIcon(item, this.getWorkflowStep(item) || {}) // Take care when no workflow
        item.comment = this.getComment(item)
      })
      this.refreshParticipantsLayer()
      if (this.items.length < this.nbTotalItems) {
        Events.$emit('error', new Error(this.$t('errors.EVENT_LOG_LIMIT')))
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-uploader'] = this.$load('input/KUploader')
    this.$options.components['k-media-browser'] = this.$load('media/KMediaBrowser')
    this.registerLeafletStyle('tooltip', this.getParticipantTooltip)
    this.registerLeafletStyle('popup', this.getParticipantPopup)
    this.registerLeafletStyle('markerStyle', this.getParticipantMarker)
  },
  mounted () {
    // Setup event connections
    // this.$on('popupopen', this.onPopupOpen)
    this.$on('click', this.onFeatureClicked)
    this.$on('collection-refreshed', this.onCollectionRefreshed)
    // Emitted from panel
    Events.$on('zoom-to-participant', this.onZoomToParticipant)
    Events.$on('filter-participant-states', this.onFilterParticipantStates)
  },
  beforeDestroy () {
    // Remove event connections
    // this.$off('popupopen', this.onPopupOpen)
    this.$off('click', this.onFeatureClicked)
    this.$off('collection-refreshed', this.onCollectionRefreshed)
    Events.$off('zoom-to-participant', this.onZoomToParticipant)
    Events.$off('filter-participant-states', this.onFilterParticipantStates)
  }
}
</script>

<style>
.probe-cursor {
  cursor: crosshair;
}
.processing-cursor {
  cursor: wait;
}
</style>