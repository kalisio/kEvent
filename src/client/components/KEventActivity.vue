<template>
  <div>
    <q-window-resize-observable @resize="onWindowResized" />
    <div v-if="objectId !== ''" class="column justify-center full-width">
      <div class="row full-width">
        <div class="col-3 full-height" v-if="pane">
          <q-scroll-area :style="paneStyle">
            <template v-for="actor in filteredItems">
              <div class="row justify-between no-wrap" style="overflow: auto" :key="actor._id">
                <div class="col-auto self-center">
                  <q-btn v-if="actor.icon" flat round small color="primary" @click="onStateClicked(actor)">
                    <q-icon :name="actor.icon.name"  :color="actor.icon.color" />
                  </q-btn>
                  {{actor.participant.name}}
                </div>
                <k-text-area v-if="actor.comment" style="flex-shrink: 0" class="col-auto light-paragraph self-center" :length="20" :text="actor.comment" />
                <div class="col-auto self-center">
                  <q-btn v-if="canFollowUp(actor)" flat round small color="primary" @click="onFollowUpClicked(actor)">
                    <q-icon name="message" color="red" />
                  </q-btn>
                  <q-btn flat round small color="primary" @click="onZoomClicked(actor)">
                    <q-icon name="remove_red_eye" />
                  </q-btn>
                </div>
              </div>
            </template>
          </q-scroll-area>
        </div>      
        <div class="col-auto full-height">
          <div id="map" :style="mapStyle">
            <q-resize-observable @resize="onMapResized" />
          </div>
        </div>
      </div>
      <k-uploader ref="uploader" :contextId="contextId" :resource="objectId" :base-query="uploaderQuery()" :options="uploaderOptions()"/>
      <k-media-browser ref="mediaBrowser" :contextId="contextId"/>
      <div>
        <router-view service="events" :router="router()"></router-view>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import L from 'leaflet'
import { Events, QWindowResizeObservable, QResizeObservable, QScrollArea, QBtn, QIcon, dom } from 'quasar'
import { mixins as kCoreMixins, utils as kCoreUtils } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import mixins from '../mixins'

const { offset } = dom

export default {
  name: 'k-event-activity',
  components: {
    QWindowResizeObservable,
    QResizeObservable,
    QScrollArea,
    QBtn,
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
    objectId: {
      type: String,
      required: true
    }
  },
  computed: {
    filteredItems () {
      return _.filter(this.items, (item) => this.filterItem(item))
    },
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
      filter: null,
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
    async refreshEvent () {
      this.event = await this.$api.getService('events', this.contextId).get(this.objectId)
      this.setTitle(this.event.name)
      // Located event ?
      if (this.event.location && this.event.location.longitude && this.event.location.latitude) {
        // Recenter map
        this.center(this.event.location.longitude, this.event.location.latitude, 15)
        // And add event marker
        let marker = L.marker([this.event.location.latitude, this.event.location.longitude], {
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
    async refreshActivity () {
      this.clearActivity()
      await this.refreshEvent()
      // Fab actions
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
      this.registerFabAction({
        name: 'toggle-pane', label: this.getPaneLabel(), icon: 'toc', handler: this.togglePane
      })
      this.refreshCollection()
    },
    uploadMedia () {
      this.$refs.uploader.open(this.event.attachments)
    },
    browseMedia () {
      this.$refs.mediaBrowser.open(this.event.attachments)
    },
    getPointMarker (feature, latlng) {
      const icon = feature.icon // this.getIcon(feature, this.getWorkflowStep(feature))
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
    getFeaturePopup (feature, layer) {
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
    getFeatureTooltip (feature, layer) {
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
    getPaneLabel () {
      return this.pane === false ? this.$t('KEventActivity.SHOW_PANE_LABEL') : this.$t('KEventActivity.HIDE_PANE_LABEL')
    },
    togglePane () {
      this.pane = !this.pane
      // Update label accordingly
      let action = this.getAction('toggle-pane')
      if (action) action.label = this.getPaneLabel()
    },
    canFollowUp (actor) {
      const step = this.getWorkflowStep(actor)
      return this.waitingInteraction(step, actor, 'coordinator')
    },
    doFollowUp (actorId) {
      this.$router.push({ name: 'event-log', params: { logId: actorId } })
    },
    onPopupOpen (event) {
      const feature = _.get(event, 'layer.feature')
      if (!feature) return
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onFeatureClicked (event) {
      const feature = _.get(event, 'target.feature')
      if (!feature) return
      if (this.canFollowUp(feature)) this.doFollowUp(feature._id)
    },
    onZoomClicked (actor) {
      this.collectionLayer.eachLayer(layer => {
        if (layer.feature && layer.feature._id === actor._id) {
          let feature = layer.feature
          if (feature.geometry && feature.geometry.coordinates) this.center(feature.geometry.coordinates[0], feature.geometry.coordinates[1])
        }
      })
    },
    onFollowUpClicked (actor) {
      this.doFollowUp(actor._id)
    },
    onStateClicked (actor) {
      const step = this.getWorkflowStep(actor)
      // Not applicable when no workflow
      if (!step) return
      // If a filter is alredy active then clear it
      if (!this.filter) {
        // Defines the filter to the actor's state
        this.filter = {
          'step': step.name,
          'interaction': undefined
        }
        if (actor.interaction) this.filter.interaction = actor.interaction.value
        else if (actor.previous && actor.previous.interaction) this.filter.interaction = actor.previous.interaction.value
      } else {
        this.filter = null
      }
      this.refreshLayer()
    },
    onCollectionRefreshed () {
      this.items.forEach((item) => {
        item.icon = this.getIcon(item, this.getWorkflowStep(item) || {}) // Will default to evnt icon when no workflow
        item.comment = this.getComment(item)
      })
      this.refreshLayer()
      if (this.items.length < this.nbTotalItems) {
        Events.$emit('error', new Error(this.$t('errors.EVENT_LOG_LIMIT')))
      }
    },
    onWindowResized (size) {
      // Avoid to refresh the layout when leaving the component
      if (this.observe) {
        let mapElement = document.getElementById('map')
        this.viewport.width = size.width
        this.viewport.height = size.height - offset(mapElement).top
      }
    },
    onMapResized (size) {
      // Avoid to refresh the layout when leaving the component
      if (this.observe) this.refreshMap()
    },
    uploaderOptions () {
      return {
        service: 'storage',
        acceptedFiles: 'image/*',
        multiple: true,
        maxFilesize: 5,
        autoProcessQueue: true,
        resourcesService: 'events',
        storagePath: '<%= id %>/<%= file.name %>'
      }
    },
    uploaderQuery () {
      return {
        notification: this.$t('KEventNotifications.UPDATE_MEDIA')
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-text-area'] = this.$load('frame/KTextArea')
    this.$options.components['k-uploader'] = this.$load('input/KUploader')
    this.$options.components['k-media-browser'] = this.$load('media/KMediaBrowser')
    // Enable the observers in order to refresh the layout
    this.observe = true
  },
  mounted () {
    this.setupMap()
    this.addCollectionLayer('Actors', { spiderfyDistanceMultiplier: 5.0 })
    // Setup event connections
    // this.$on('popupopen', this.onPopupOpen)
    this.$on('click', this.onFeatureClicked)
    this.$on('collection-refreshed', this.onCollectionRefreshed)
  },
  beforeDestroy () {
    // No need to refresh the layout when leaving the component
    this.observe = false
    this.removeCollectionLayer('Actors')
    // Remove event connections
    // this.$off('popupopen', this.onPopupOpen)
    this.$off('click', this.onFeatureClicked)
    this.$off('collection-refreshed', this.onCollectionRefreshed)
  }
}
</script>
