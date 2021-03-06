<template>
  <div>
    <div ref="map" :style="viewStyle">
      <q-resize-observer @resize="onMapResized" />
    </div>

    <q-page-sticky position="top" :offset="[0, 18]">
      <k-navigation-bar />
    </q-page-sticky>

    <q-page-sticky position="left" :offset="[18, 0]">
      <k-feature-info-box style="min-width: 150px; width: 15vw; max-height: 40vh" />
    </q-page-sticky>

    <q-page-sticky position="top" :offset="[0, 0]">
      <k-location-time-series :variables="currentVariables" />
    </q-page-sticky>

    <q-page-sticky position="left" :offset="[18, 0]">
      <k-color-legend/>
    </q-page-sticky>

    <q-page-sticky position="bottom" :offset="[0, 40]">
      <k-timeline v-show="timelineEnabled"/>
    </q-page-sticky>

    <k-modal ref="uploaderModal" :toolbar="getUploaderToolbar()">
      <div slot="modal-content">
        <k-uploader ref="uploader" :resource="objectId" :base-query="uploaderQuery()"
          :options="uploaderOptions()" @uploader-ready="initializeMedias"/>
      </div>
    </k-modal>

    <k-media-browser ref="mediaBrowser" :options="mediaBrowserOptions()" />
    <router-view service="events" :router="router()"></router-view>
  </div>
</template>

<script>
import _ from 'lodash'
import L from 'leaflet'
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'
import mixins from '../mixins'

const activityMixin = kMapMixins.activity('event')

export default {
  name: 'k-event-activity',
  inject: ['klayout'],
  provide () {
    return {
      kActivity: this,
      kMap: this
    }
  },
  mixins: [
    kCoreMixins.refsResolver(['map']),
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    kMapMixins.featureService,
    kMapMixins.weacast,
    kMapMixins.time,
    activityMixin,
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
    getUploaderToolbar () {
      return [{
        name: 'close-action',
        label: this.$t('KEventActivity.UPLOADER_MODAL_CLOSE_ACTION'),
        icon: 'close',
        handler: () => this.$refs.uploaderModal.close()
      }]
    },
    router () {
      return {
        onApply: { name: 'event-activity', params: { contextId: this.contextId, objectId: this.objectId } },
        onDismiss: { name: 'event-activity', params: { contextId: this.contextId, objectId: this.objectId } }
      }
    },
    loadService () {
      // Archived mode ?
      return this.$api.getService(this.archived ? 'archived-event-logs' : 'event-logs')
    },
    getCollectionBaseQuery () {
      return { lastInEvent: true, event: this.objectId }
    },
    getCollectionPaginationQuery () {
      // No pagination on map items
      return {}
    },
    async refreshActivity () {
      // Archived mode ?
      this.archived = _.get(this.$route, 'query.archived')
      this.clearActivity()
      this.event = await this.$api.getService(this.archived ? 'archived-events' : 'events', this.contextId).get(this.objectId)
      this.setTitle(this.event.name)
      // Setup the right drawer
      this.setRightDrawer('KEventActivityPanel', this.$data)
      // Wait until map is ready
      await this.initializeMap()
      // If we'd like to only work in real-time
      // this.setCurrentTime(moment.utc())
      this.registerActivityActions()
      // Custom actions
      if (this.$can('update', 'events', this.contextId, this.event)) {
        this.registerFabAction({
          name: 'add-media', label: this.$t('KEventActivity.ADD_MEDIA_LABEL'), icon: 'add_a_photo', handler: this.uploadMedia
        })
      }
      if (this.$can('read', 'events', this.contextId, this.event)) {
        if (this.hasMedias()) this.registerFabAction({
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
        const marker = L.marker([this.event.location.latitude, this.event.location.longitude], {
          icon: L.icon.fontAwesome({
            iconClasses: kCoreUtils.getIconName(this.event) || 'fas fa-circle',
            // Conversion from palette to RGB color is required for markers
            markerColor: kCoreUtils.getColorFromPalette(_.get(this.event, 'icon.color', 'blue')),
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
        icon: 'fas fa-user',
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
    uploadMedia () {
      this.$refs.uploaderModal.open()
      // If the modal has already been created the uploader is ready otherwise wait for event
      if (this.$refs.uploader) this.initializeMedias()
    },
    initializeMedias () {
      this.$refs.uploader.initialize(this.event.attachments)
      // Open file dialog the first time
      if (!this.event.attachments || (this.event.attachments.length === 0)) this.$refs.uploader.openFileInput()
    },
    browseMedia () {
      this.$refs.mediaBrowser.show(this.event.attachments)
    },
    filterItem (item) {
      // Is there any filter active ?
      if (!this.filter) return true
      // Is it the same step ?
      if (item.step !== this.filter.step) return false
      // Is it the same interaction ?
      if (this.hasStateUserInteraction(item)) {
        if (this.getUserInteraction(item) === this.filter.interaction) return true
        return false
      }
      if (this.hasStateUserInteraction(item.previous)) {
        if (this.getUserInteraction(item.previous) === this.filter.interaction) return true
        return false
      }
      return true
    },
    refreshParticipantsLayer () {
      this.participants.splice(0, this.participants.length)
      _.filter(this.items, (item) => this.filterItem(item)).forEach(item => this.participants.push(item))
      this.updateLayer(this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME'), { type: 'FeatureCollection', features: this.participants })
    },
    getParticipantMarker (feature, latlng, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      const icon = this.getUserIcon(feature, this.getWorkflowStep(feature))
      return this.createMarkerFromStyle(latlng, {
        icon: {
          type: 'icon.fontAwesome',
          options: {
            iconClasses: kCoreUtils.getIconName(icon, 'name') || 'fas fa-user',
            // Conversion from palette to RGB color is required for markers
            markerColor: kCoreUtils.getColorFromPalette(_.get(icon, 'color', 'blue')),
            iconColor: '#FFFFFF'
          }
        }
      })
    },
    getParticipantPopup (feature, layer, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      const popup = L.popup({ autoPan: false }, layer)
      const step = this.getWorkflowStep(feature)
      // Check for any recorded interaction to be displayed
      // Nothing visible because clicking on the marker opens a dialog in this case
      if (!this.archived && this.waitingInteraction(step, feature, 'coordinator')) {
        return null
      }
      // Already shown in tooltip
      /*
      if (this.waitingInteraction(step, feature, 'participant')) {
        return popup.setContent('Awaiting information')
      }
      */
      // Recall last interaction state
      const interaction = this.getUserInteraction(feature)
      if (interaction) {
        return popup.setContent(interaction)
      } else {
        // Feature interaction will be managed through standard properties popup
        return null
      }
    },
    getParticipantTooltip (feature, layer, options) {
      if (options.name !== this.$t('KEventActivity.PARTICIPANTS_LAYER_NAME')) return
      // Default content is participant name
      const tooltip = L.tooltip({ permanent: true }, layer)
      const step = this.getWorkflowStep(feature)
      const name = _.get(feature, 'participant.name', this.$t('KEventActivity.UNAMED'))
      // Check for any interaction to be performed
      if (!this.archived && this.waitingInteraction(step, feature, 'coordinator')) {
        return tooltip.setContent('<b>' + name + '<br>' + this.$t('KEventActivity.ACTION_REQUIRED') + '</b>')
      } else if (!this.archived && this.waitingInteraction(step, feature, 'participant')) {
        return tooltip.setContent('<b>' + name + '<br>' + this.$t('KEventActivity.AWAITING_INFORMATION') + '</b>')
      } else {
        return tooltip.setContent('<b>' + name + '</b>')
      }
    },
    getMeteoMarker (feature, latlng) {
      // Use wind barbs on weather probed features
      const windDirection = (this.forecastLevel ? `windDirection-${this.forecastLevel}` : 'windDirection')
      const windSpeed = (this.forecastLevel ? `windSpeed-${this.forecastLevel}` : 'windSpeed')
      const isWeatherProbe = (_.has(feature, `properties.${windDirection}`) &&
                              _.has(feature, `properties.${windSpeed}`))
      if (isWeatherProbe) {
        let marker = this.getProbedLocationForecastMarker(feature, latlng)
        if (marker) {
          marker.on('dragend', (event) => {
            const { start, end } = this.getTimeRange()
            this.getForecastForLocation(event.target.getLatLng().lng, event.target.getLatLng().lat, start, end)
          })
        }
        return marker
      }
      return null
    },
    getVigicruesTooltip (feature, layer) {
      const level = _.get(feature, 'properties.NivSituVigiCruEnt')
      if (level > 1) {
        let tooltip = L.tooltip({ permanent: false }, layer)
        return tooltip.setContent(this.$t('KEventActivity.VIGICRUES_LEVEL_' + level))
      }
      return null
    },
    getMeteoTooltip (feature, layer) {
      // Only wind/temperature can be available at different levels now
      const windDirection = (this.forecastLevel ? `windDirection-${this.forecastLevel}` : 'windDirection')
      const windSpeed = (this.forecastLevel ? `windSpeed-${this.forecastLevel}` : 'windSpeed')
      const temperature = (this.forecastLevel ? `temperature-${this.forecastLevel}` : 'temperature')
      const direction = _.get(feature, `properties.${windDirection}`)
      const speed = _.get(feature, `properties.${windSpeed}`)
      const gust = _.get(feature, 'properties.gust')
      const t = _.get(feature, `properties.${temperature}`)
      const precipitations = _.get(feature, 'properties.precipitations')
      let html = ''
      if (!_.isNil(speed)) {
        html += `${speed.toFixed(2)} m/s</br>`
      }
      if (!_.isNil(gust)) {
        html += `max ${gust.toFixed(2)} m/s</br>`
      }
      if (!_.isNil(direction)) {
        html += `${direction.toFixed(2)} °</br>`
      }
      if (!_.isNil(precipitations)) {
        html += `${precipitations.toFixed(2)} mm/h</br>`
      }
      if (!_.isNil(t)) {
        html += `${t.toFixed(2)} °C</br>`
      }
      return (html ? L.tooltip({ permanent: false }, layer).setContent(`<b>${html}</b>`) : null)
    },
    onPopupOpen (event) {
      const feature = _.get(event, 'layer.feature')
      if (!feature || this.archived) return // No edition in archive
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onFeatureClicked (options, event) {
      const feature = _.get(event, 'target.feature')
      if (!feature || this.archived) return // No edition in archive
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onZoomToParticipant (participant) {
      const coordinates = _.get(participant, 'geometry.coordinates')
      if (coordinates) this.center(coordinates[0], coordinates[1])
    },
    onFilterParticipantStates (participant) {
      const step = this.getWorkflowStep(participant)
      // Not applicable when no workflow
      if (!step) return
      // If a filter is alredy active then clear it
      if (!this.filter) {
        // Defines the filter to the participant's state
        this.filter = {
          step: step.name,
          interaction: undefined
        }
        if (this.hasStateUserInteraction(participant)) this.filter.interaction = this.getUserInteraction(participant)
        else if (this.hasStateUserInteraction(participant.previous)) this.filter.interaction = this.getUserInteraction(participant.previous)
      } else {
        this.filter = null
      }
      this.refreshParticipantsLayer()
    },
    onCollectionRefreshed () {
      this.items.forEach((item) => {
        item.icon = this.getUserIcon(item, this.getWorkflowStep(item) || {}) // Take care when no workflow
        item.comment = this.getUserComment(item)
      })
      this.refreshParticipantsLayer()
      // We do not manage pagination now
      if (this.items.length < this.nbTotalItems) {
        this.$events.$emit('error', new Error(this.$t('errors.EVENT_LOG_LIMIT')))
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-navigation-bar'] = this.$load('KNavigationBar')
    this.$options.components['k-feature-info-box'] = this.$load('KFeatureInfoBox')
    this.$options.components['k-color-legend'] = this.$load('KColorLegend')
    this.$options.components['k-timeline'] = this.$load('KTimeline')
    this.$options.components['k-location-time-series'] = this.$load('KLocationTimeSeries')
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-uploader'] = this.$load('input/KUploader')
    this.$options.components['k-media-browser'] = this.$load('media/KMediaBrowser')
    this.registerLeafletStyle('tooltip', this.getParticipantTooltip)
    this.registerLeafletStyle('popup', this.getParticipantPopup)
    this.registerLeafletStyle('markerStyle', this.getParticipantMarker)
    this.registerLeafletStyle('tooltip', this.getVigicruesTooltip)
    this.registerLeafletStyle('tooltip', this.getMeteoTooltip)
    this.registerLeafletStyle('markerStyle', this.getMeteoMarker)
    // Archived mode ?
    this.archived = _.get(this.$route, 'query.archived')
  },
  mounted () {
    // Setup event connections
    // this.$on('popupopen', this.onPopupOpen)
    this.$on('click', this.onFeatureClicked)
    this.$on('collection-refreshed', this.onCollectionRefreshed)
    // Emitted from panel
    this.$events.$on('zoom-to-participant', this.onZoomToParticipant)
    this.$events.$on('filter-participant-states', this.onFilterParticipantStates)
  },
  beforeDestroy () {
    // Remove event connections
    // this.$off('popupopen', this.onPopupOpen)
    this.$off('click', this.onFeatureClicked)
    this.$off('collection-refreshed', this.onCollectionRefreshed)
    this.$events.$off('zoom-to-participant', this.onZoomToParticipant)
    this.$events.$off('filter-participant-states', this.onFilterParticipantStates)
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
