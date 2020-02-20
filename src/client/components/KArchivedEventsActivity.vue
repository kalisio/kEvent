<template>
  <q-page>
    <!--
      Time range selector
     -->
    <div class="row justify-center text-center text-h5">
      <div class="row items-center">
        <q-btn v-show="!showMap" round color="primary" icon="scatter_plot" @click="onShowMap">
          <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_MAP_LABEL') }}</q-tooltip>
        </q-btn>
        <q-btn v-show="showMap" round color="primary" icon="timelapse" @click="onShowHistory">
          <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_HISTORY_LABEL') }}</q-tooltip>
        </q-btn>
        &nbsp;&nbsp;{{$t('KArchivedEventsActivity.FROM_DATE')}} {{minDateTimeSelected}}
        <q-icon name="event" color="primary" class="cursor-pointer">
          <q-popup-proxy ref="minDatePopup" transition-show="scale" transition-hide="scale">
            <q-date v-model="minDateTimeSelected" @input="updateBaseQuery()" :options="checkTimeRange"/>
          </q-popup-proxy>
        </q-icon>
        &nbsp;{{$t('KArchivedEventsActivity.TO_DATE')}} {{maxDateTimeSelected}}
        <q-icon name="event" color="primary" class="cursor-pointer">
          <q-popup-proxy ref="maxDatePopup" transition-show="scale" transition-hide="scale">
            <q-date v-model="maxDateTimeSelected" @input="updateBaseQuery()" :options="checkTimeRange"/>
          </q-popup-proxy>
        </q-icon>
        <span v-show="!showMap" >&nbsp;{{$t('KArchivedEventsActivity.SORT_BY_LABEL')}}&nbsp;</span>
        <q-select v-show="!showMap" v-model="sortBy" class="text-h5" :options="sortOptions" @input="updateBaseQuery()"/>
      </div>
    </div>
    <!--
      Events history
     -->
    <k-history v-show="!showMap" service="archived-events" :nb-items-per-page="10" :base-query="baseQuery" :filter-query="searchQuery" :renderer="renderer" :contextId="contextId" :list-strategy="'smart'">
    </k-history>
    <!--
      Events map
     -->
    <div v-show="showMap">
      <div ref="map" :style="viewStyle">
        <q-resize-observer @resize="onMapResized" />
      </div>

      <q-page-sticky position="top" :offset="[0, 48]">
        <k-navigation-bar />
      </q-page-sticky>
    </div>
  </q-page>
</template>

<script>
import _ from 'lodash'
import L from 'leaflet'
import moment from 'moment'
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'

const activityMixin = kMapMixins.activity('archivedEvents')

export default {
  name: 'k-archived-events-activity',
  mixins: [
    kCoreMixins.refsResolver(['map']),
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    activityMixin,
    kMapMixins.map.baseMap,
    kMapMixins.map.geojsonLayers,
    kMapMixins.map.style,
    kMapMixins.map.tooltip,
    kMapMixins.map.popup,
    kMapMixins.map.activity
  ],
  provide () {
    return {
      kActivity: this,
      kMap: this
    }
  },
  props: {
    contextId: {
      type: String,
      default: ''
    }
  },
  data () {
    const now = moment()
    const lastMonth = now.clone().subtract(1, 'months')
    const nextMonth = now.clone().add(1, 'months')
    const lastYear = now.clone().subtract(1, 'years')
    const nextYear = now.clone().add(1, 'years')
    const minDateTime = lastYear.format('YYYY[/]MM[/]DD')
    const maxDateTime = nextYear.format('YYYY[/]MM[/]DD')
    const minDateTimeSelected = lastMonth.format('YYYY[/]MM[/]DD')
    const maxDateTimeSelected = nextMonth.format('YYYY[/]MM[/]DD')

    return {
      baseQuery: {
        $sort: {
          createdAt: -1
        },
        createdAt: {
          $gte: moment(minDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString(),
          $lte: moment(maxDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString()
        }
      },
      renderer: {
        component: 'KArchivedEventEntry',
        props: {
          options: {
          }
        }
      },
      minDateTime,
      maxDateTime,
      minDateTimeSelected,
      maxDateTimeSelected,
      sortBy: {
        label: this.$i18n.t('KArchivedEventsActivity.SORT_BY_CREATED_DATE_LABEL'),
        value: 'createdAt'
      },
      sortOptions: [
        {
          label: this.$i18n.t('KArchivedEventsActivity.SORT_BY_CREATED_DATE_LABEL'),
          value: 'createdAt'
        },
        {
          label: this.$i18n.t('KArchivedEventsActivity.SORT_BY_UPDATED_DATE_LABEL'),
          value: 'updatedAt'
        },
        {
          label: this.$i18n.t('KArchivedEventsActivity.SORT_BY_DELETED_DATE_LABEL'),
          value: 'deletedAt'
        },
        {
          label: this.$i18n.t('KArchivedEventsActivity.SORT_BY_EXPIRED_DATE_LABEL'),
          value: 'expireAt'
        }
      ],
      showMap: false
    }
  },
  methods: {
    async refreshActivity () {
      this.clearActivity()
      this.setTitle(this.$store.get('context.name'))
      // Search bar
      this.setSearchBar('name')
      // Setup the right drawer
      this.setRightDrawer('KCatalogPanel', this.$data)
      // Wait until map is ready
      await this.initializeMap()
      this.registerActivityActions()
    },
    async getCatalogLayers () {
      let layers = await activityMixin.methods.getCatalogLayers.call(this)
      // We only want base layers
      return _.filter(layers, { type: 'BaseLayer' })
    },
    checkTimeRange (date) {
      return moment(date).isSameOrAfter(this.minDateTime) &&
             moment(date).isSameOrBefore(this.maxDateTime)
    },
    updateBaseQuery() {
      // Close calendar popups in case it has been used
      this.$refs.minDatePopup.hide()
      this.$refs.maxDatePopup.hide()
      this.baseQuery = {
        $sort: {
          [this.sortBy.value]: -1
        },
        [this.sortBy.value]: {
          $gte: moment(this.minDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString(),
          $lte: moment(this.maxDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString()
        }
      }
    },
    loadService () {
      return this.$api.getService('archived-events')
    },
    getCollectionBaseQuery () {
      return { geoJson: true }
    },
    getCollectionPaginationQuery () {
      // No pagination on map items
      return {}
    },
    async refreshEventsLayers () {
      this.templates = _.uniq(this.items.map(item => item.template))
      for (let i = 0; i < this.templates.length; i++) {
        const template = this.templates[i]
        // Create an empty layer used as a container for events
        await this.addLayer({
          name: template,
          type: 'OverlayLayer',
          icon: 'whatshot',
          leaflet: {
            type: 'geoJson',
            realtime: true,
            isVisible: true,
            cluster: { spiderfyDistanceMultiplier: 5.0 }
          }
        })
        // Then update it
        this.updateLayer(template, { type: 'FeatureCollection', features: _.filter(this.items, { template }) })
      }
    },
    getEventMarker (feature, latlng, options) {
      if (!this.templates.includes(options.name)) return
      return this.createMarkerFromStyle(latlng, {
        icon: {
          type: 'icon.fontAwesome',
          options: {
            iconClasses: kCoreUtils.getIconName(feature) || 'fas fa-map-marker-alt',
            // Conversion from palette to RGB color is required for markers
            markerColor: kCoreUtils.getColorFromPalette(_.get(feature, 'icon.color', 'blue')),
            iconColor: '#FFFFFF'
          }
        }
      })
    },
    getEventPopup (feature, layer, options) {
      if (!this.templates.includes(options.name)) return
      const popup = L.popup({ autoPan: false }, layer)
      const name = _.get(feature, 'name')
      return popup.setContent('<b>' + name + '</b>')
    },
    getEventTooltip (feature, layer, options) {
      if (!this.templates.includes(options.name)) return
      const tooltip = L.tooltip({ permanent: true }, layer)
      const name = _.get(feature, 'name')
      return tooltip.setContent('<b>' + name + '</b>')
    },
    onCollectionRefreshed () {
      this.refreshEventsLayers()
    },
    onShowHistory () {
      this.showMap = false
      // Cleanup
      this.templates.forEach(template => {
        this.removeLayer(template)
      })
      this.templates = []
    },
    onShowMap () {
      this.showMap = true
      // Refresh layer data
      this.refreshCollection()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-history'] = this.$load('collection/KHistory')
    this.$options.components['k-navigation-bar'] = this.$load('KNavigationBar')
    this.registerLeafletStyle('tooltip', this.getEventTooltip)
    this.registerLeafletStyle('popup', this.getEventPopup)
    this.registerLeafletStyle('markerStyle', this.getEventMarker)
  },
  mounted () {
    this.$on('collection-refreshed', this.onCollectionRefreshed)
  },
  beforeDestroy () {
    this.$off('collection-refreshed', this.onCollectionRefreshed)
  }
}
</script>
