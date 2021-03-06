<template>
  <q-page>
    <!-- Invisible link used to download data -->
    <a ref="downloadLink" v-show="false" :href="currentDownloadLink" :download="currentDownloadName"></a>
    <!--
      Time range selector
     -->
    <q-page-sticky position="top" :offset="[0, 4]" style="z-index: 1">
      <div class="row justify-center text-center text-subtitle1">
        <div class="row items-center time-range-bar">
          <q-btn v-show="!showHistory" flat round color="primary" icon="timelapse" @click="onShowHistory">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_HISTORY_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="!showMap" flat round color="primary" icon="scatter_plot" @click="onShowMap">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_MAP_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="!showChart" flat round color="primary" icon="pie_chart" @click="onShowChart">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_CHART_LABEL') }}</q-tooltip>
          </q-btn>
          <q-separator vertical />
          &nbsp;{{minDateTimeSelected}}
          <q-icon name="event" color="primary" class="cursor-pointer">
            <q-tooltip>{{ $t('KArchivedEventsActivity.FROM_DATE') }}</q-tooltip>
            <q-popup-proxy ref="minDatePopup" transition-show="scale" transition-hide="scale">
              <q-date v-model="minDateTimeSelected" @input="updateBaseQuery()" :options="checkTimeRange"/>
            </q-popup-proxy>
          </q-icon>
          &nbsp;-&nbsp;{{maxDateTimeSelected}}&nbsp;
          <q-icon name="event" color="primary" class="cursor-pointer">
            <q-tooltip>{{ $t('KArchivedEventsActivity.TO_DATE') }}</q-tooltip>
            <q-popup-proxy ref="maxDatePopup" transition-show="scale" transition-hide="scale">
              <q-date v-model="maxDateTimeSelected" @input="updateBaseQuery()" :options="checkTimeRange"/>
            </q-popup-proxy>
          </q-icon>
          &nbsp;<q-separator vertical />
          <q-btn v-show="showHistory && ascendingSort" flat round color="primary" icon="arrow_upward" @click="onSortOrder">
            <q-tooltip>{{ $t('KArchivedEventsActivity.DESCENDING_SORT') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="showHistory && !ascendingSort" flat round color="primary" icon="arrow_downward" @click="onSortOrder">
            <q-tooltip>{{ $t('KArchivedEventsActivity.ASCENDING_SORT') }}</q-tooltip>
          </q-btn>
          <!--span v-show="showHistory" >&nbsp;{{$t('KArchivedEventsActivity.SORT_BY_LABEL')}}&nbsp;</span>
          <q-select v-show="showHistory" v-model="sortBy" class="text-h5" :options="sortOptions" @input="updateBaseQuery()"/-->
          <q-btn v-show="showMap && heatmap" flat round color="primary" icon="scatter_plot" @click="onHeatmap">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_MARKERS_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="showMap && !heatmap" flat round color="primary" icon="fas fa-bowling-ball" @click="onHeatmap">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_HEATMAP_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="showMap && byTemplate" flat round color="primary" icon="fas fa-object-group" @click="onByTemplate">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_ALL_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="showMap && !byTemplate" flat round color="primary" icon="fas fa-layer-group" @click="onByTemplate">
            <q-tooltip>{{ $t('KArchivedEventsActivity.SHOW_BY_TEMPLATE_LABEL') }}</q-tooltip>
          </q-btn>
          <q-btn v-show="!byTemplate" flat round color="primary" icon="cloud_download" @click="downloadEventsData"/>
        </div>
      </div>
    </q-page-sticky>
    <q-page-sticky v-show="showMap && heatmap" position="bottom" :offset="[0, 16]" style="z-index: 1">
      <div class="row">
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <div class="col-12">
      <q-slider v-model="heatmapRadius" :min="1" :max="100" :step="1"
        label-always :label-value="$t('KArchivedEventsActivity.HEATMAP_RADIUS_LABEL') + ': ' + heatmapRadius + ' Kms'" @change="onHeatmapRadius"></q-slider>
      </div>
      </div>
    </q-page-sticky>
    <!--
      Events history: switch append-items on to activate infinite scroll
     -->
    <k-history class="q-mt-lg" v-show="showHistory" service="archived-events" :nb-items-per-page="4" :append-items="false" :base-query="baseQuery" :filter-query="searchQuery" :renderer="renderer" :contextId="contextId" :list-strategy="'smart'">
    </k-history>
    <!--
      Events map
     -->
    <div v-show="showMap">
      <div ref="map" :style="viewStyle">
        <q-resize-observer @resize="onMapResized" />
      </div>

      <q-page-sticky position="top-right" :offset="[4, 4]">
        <k-navigation-bar />
      </q-page-sticky>
    </div>
    <!--
      Events graph
     -->
    <k-modal ref="chartModal" :title="$t('KArchivedEventsActivity.CHART_MODAL_TITLE')" :toolbar="toolbar" :buttons="[]" >
      <div slot="modal-content">
        <div class="row justify-center text-center">
          <q-select class="col-1" v-model="chartType" :label="$t('KArchivedEventsActivity.CHART_LABEL')" stack-label
          :options="chartOptions" @input="refreshChart"/>
          <q-select class="col-1" v-model="nbValuesPerChart" :label="$t('KArchivedEventsActivity.PAGINATION_LABEL')" stack-label
            :options="paginationOptions" @input="refreshChartAndPagination"/>
          <q-select class="col-1" v-model="render" :label="$t('KArchivedEventsActivity.RENDER_LABEL')" stack-label
            :options="renderOptions" @input="refreshChart"/>
          <q-pagination v-if="nbCharts > 1" v-model="currentChart" :max="nbCharts" @input="refreshChart" :input="true"/>
          <q-btn flat round color="primary" icon="cloud_download" @click="downloadChartData" />
        </div>
        <div class="row justify-center text-center">
          <canvas class="chart q-ma-lg" ref="chart"></canvas>
        </div>
      </div>
    </k-modal>
    <!--
      Router view to enable routing to modals
     -->
    <router-view service="archived-events" :router="router()"></router-view>
  </q-page>
</template>

<script>
import _ from 'lodash'
import L from 'leaflet'
import moment from 'moment'
import chroma from 'chroma-js'
import Chart from 'chart.js'
import 'chartjs-plugin-labels'
import Papa from 'papaparse'
import { Platform, QSlider } from 'quasar'
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'

// For mapping or statistics we get all events at once to avoid managing pagination
const MAX_EVENTS = 5000
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
    kMapMixins.map.heatmapLayers,
    kMapMixins.map.style,
    kMapMixins.map.tooltip,
    kMapMixins.map.popup,
    kMapMixins.map.activity
  ],
  components: {
    QSlider
  },
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
  computed: {
    showMap () {
      return this.mode === 'map'
    },
    showChart () {
      return this.mode === 'chart'
    },
    showHistory () {
      return this.mode === 'history'
    },
    nbCharts () {
      if (!this.chartData.length || (this.nbValuesPerChart.value === 0)) return 1
      else return Math.ceil(this.chartData.length / this.nbValuesPerChart.value)
    }
  },
  data () {
    const chartTypes = ['pie', 'polarArea', 'radar', 'bar']
    const chartOptions = chartTypes.map(
        type => ({ value: type, label: this.$i18n.t(`KArchivedEventsActivity.CHART_LABEL_${type.toUpperCase()}`) }))
    const paginationOptions = [{
      value: 0, label: this.$i18n.t('KArchivedEventsActivity.ALL_VALUES')
    }, {
      value: 5, label: '5'
    }, {
      value: 10, label: '10'
    }, {
      value: 20, label: '20'
    }]
    const renderOptions = [{
      value: 'value', label: this.$i18n.t('KArchivedEventsActivity.VALUE_LABEL')
    }, {
      value: 'percentage', label: this.$i18n.t('KArchivedEventsActivity.PERCENTAGE_LABEL')
    }]

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
      toolbar: [{ name: 'close', icon: 'close', handler: () => this.$refs.chartModal.close() }],
      baseQuery: {
        $sort: {
          createdAt: -1
        },
        createdAt: {
          $gte: moment(minDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString(),
          $lte: moment(maxDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString()
        },
        $skip: 0, $limit: MAX_EVENTS
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
      ascendingSort: false,
      mode: 'history',
      heatmap: false,
      byTemplate: false,
      heatmapRadius: 50,
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
      chartType: _.find(chartOptions, { value: 'pie' }),
      chartOptions,
      currentChart: 1,
      nbValuesPerChart: _.find(paginationOptions, { value: 10 }),
      paginationOptions,
      renderOptions,
      render: _.find(renderOptions, { value: 'value' }),
      chartData: [],
      currentDownloadLink: null,
      currentDownloadName: null
    }
  },
  methods: {
    router () {
      return {
        onApply: { name: 'archived-events-activity', params: { contextId: this.contextId } },
        onDismiss: { name: 'archived-events-activity', params: { contextId: this.contextId } }
      }
    },
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
    formatDate (date) {
      return date.toLocaleString(kCoreUtils.getLocale(),
        { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' })
    },
    getHeatmapOptions () {
      return {
        // The unit is in pixel, meaning
        // 1 pixel radius (2 pixel diameter) at zoom level 0
        // ...
        // 64 pixel radius (128 pixel diameter) at zoom level 6
        // ...
        // We'd like an event to cover a range expressed as Km
        // According to https://groups.google.com/forum/#!topic/google-maps-js-api-v3/hDRO4oHVSeM
        // this means 1 pixel at level 7 so at level 0 we get 1 / 2^7
        radius: this.heatmapRadius * 0.0078,
        minOpacity: 0,
        maxOpacity: 0.5,
        // scales the radius based on map zoom
        scaleRadius: true,
        // uses the data maximum within the current map boundaries
        // (there will always be a red spot with useLocalExtremas true)
        useLocalExtrema: true,
        // The higher the blur factor is, the smoother the gradients will be
        blur: 0.8
      }
    },
    updateBaseQuery() {
      // Close calendar popups in case it has been used
      this.$refs.minDatePopup.hide()
      this.$refs.maxDatePopup.hide()
      this.baseQuery = {
        $sort: {
          [this.sortBy.value]: (this.ascendingSort ? 1 : -1)
        },
        [this.sortBy.value]: {
          $gte: moment(this.minDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString(),
          $lte: moment(this.maxDateTimeSelected, 'YYYY[/]MM[/]DD').endOf('day').toISOString()
        }
      }

      // Refresh layer data
      if (this.mode === 'map') this.refreshCollection()
    },
    loadService () {
      return this.$api.getService('archived-events')
    },
    getCollectionBaseQuery () {
      // No pagination in this case (map) and filter required data
      return Object.assign({
        geoJson: true, $skip: 0, $limit: MAX_EVENTS,
        $select: ['_id', 'name', 'description', 'icon', 'template', 'location',
          'createdAt', 'updatedAt', 'expireAt', 'deletedAt']
      }, this.baseQuery)
    },
    getCollectionPaginationQuery () {
      // No pagination on map items
      return {}
    },
    async refreshEventsLayers () {
      await this.clearEventsLayers()
      this.templates = (this.byTemplate ?
        _.uniq(this.items.map(item => item.template)) :
        [ this.$t('KArchivedEventsActivity.EVENTS_LAYER_NAME') ])
      for (let i = 0; i < this.templates.length; i++) {
        const template = this.templates[i]
        if (this.heatmap) {
          // Create an empty layer used as a container for events
          await this.addLayer({
            name: template,
            type: 'OverlayLayer',
            icon: 'whatshot',
            leaflet: Object.assign({
              type: 'heatmap',
              isVisible: true
            }, this.getHeatmapOptions())
          })
          // Then update it
          this.updateHeatmap(template, { type: 'FeatureCollection',
            features: this.byTemplate ? _.filter(this.items, { template }) : this.items })
        } else {
          // Create an empty layer used as a container for events
          await this.addLayer({
            name: template,
            type: 'OverlayLayer',
            icon: 'whatshot',
            leaflet: {
              type: 'geoJson',
              realtime: true,
              cluster: { spiderfyDistanceMultiplier: 5.0 },
              isVisible: true
            }
          })// Then update it
          this.updateLayer(template, { type: 'FeatureCollection',
            features: this.byTemplate ? _.filter(this.items, { template }) : this.items })
        }
      }
    },
    async clearEventsLayers () {
      for (let i = 0; i < this.templates.length; i++) {
        const template = this.templates[i]
        await this.removeLayer(template)
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
      const description = _.get(feature, 'description')
      return popup.setContent(description)
    },
    getEventTooltip (feature, layer, options) {
      if (!this.templates.includes(options.name)) return
      const tooltip = L.tooltip({ permanent: true }, layer)
      const name = _.get(feature, 'name')
      const date = new Date(_.get(feature, 'createdAt'))
      return tooltip.setContent('<b>' + name + '</b> - ' + this.formatDate(date))
    },
    onCollectionRefreshed () {
      if (this.nbTotalItems > MAX_EVENTS) {
        this.$q.dialog({
          title: this.$t('KArchivedEventsActivity.MATCHING_RESULTS', { total: this.nbTotalItems }),
          message: this.$t('KArchivedEventsActivity.MAXIMUM_RESULTS', { max: MAX_EVENTS })
        })
      }
      this.refreshEventsLayers()
    },
    onSortOrder () {
      this.ascendingSort = !this.ascendingSort
      this.currentPage = 0
      this.updateBaseQuery()
    },
    onByTemplate () {
      this.byTemplate = !this.byTemplate
      this.refreshEventsLayers()
    },
    onHeatmap () {
      this.heatmap = !this.heatmap
      this.refreshEventsLayers()
    },
    onShowHistory () {
      this.mode = 'history'
      // Cleanup
      this.clearEventsLayers()
      this.templates = []
    },
    onShowMap () {
      this.mode = 'map'
      // Refresh layer data
      this.refreshCollection()
    },
    onHeatmapRadius (radius) {
      this.refreshEventsLayers()
    },
    async getChartData () {
      // Get possible values
      this.values = await this.loadService().find({ query: { $distinct: 'template' } })
      // Then count events for each value
      let data = await Promise.all(this.values.map(async value => {
        const response = await this.loadService()
          .find({ query: Object.assign({ $limit: 0, template: value }, this.baseQuery) })
        return { value, count: response.total }
      }))
      // Sort data so that we don't have charts mixin large and small numbers when paginating, go large first
      data = _.sortBy(data, item => -item.count)
      this.values = data.map(item => item.value)
      this.chartData = data.map(item => item.count)
    },
    getChartOptions (type) {
      const start = (this.currentChart - 1) * this.nbValuesPerChart.value
      const end = (this.nbValuesPerChart.value > 0 ? start + this.nbValuesPerChart.value : this.chartData.length)
      const colors = _.shuffle(chroma.scale('Spectral').colors(end - start))
      let config = {
        type,
        data: {
          labels: this.values.slice(start, end),
          datasets: [{
            data: this.chartData.slice(start, end)
          }]
        },
        options: {
          responsive: true,
          title:{
            display: true,
            text: this.$t('KArchivedEventsActivity.CHART_TITLE') + ' - ' +
                  this.$t(`KArchivedEventsActivity.CHART_LABEL_${type.toUpperCase()}`)
          }
        }
      }
      // ticks.precision = 0 means round displayed values to integers
      if (type === 'radar') {
        _.set(config, 'options.legend.display', false)
        _.set(config, 'data.datasets[0].fill', true)
        _.set(config, 'data.datasets[0].borderColor', colors[0])
        _.set(config, 'data.datasets[0].backgroundColor', chroma(colors[0]).alpha(0.5).hex())
        _.set(config, 'data.datasets[0].pointBorderColor', '#fff')
        _.set(config, 'data.datasets[0].pointBackgroundColor', colors[0])
        _.set(config, 'options.scale.ticks.beginAtZero', true)
        _.set(config, 'options.scale.ticks.precision', 0)
      } else {
        _.set(config, 'data.datasets[0].backgroundColor', colors)
        _.set(config, 'options.plugins.labels.render', this.render.value)
        _.set(config, 'options.plugins.labels.position', 'border')
        _.set(config, 'options.plugins.labels.overlap', false)
        _.set(config, 'options.plugins.labels.showActualPercentages', true)
        _.set(config, 'options.plugins.labels.precision', 0)
        _.set(config, 'options.plugins.labels.textShadow', true)
        _.set(config, 'options.plugins.labels.fontSize', 24)
        _.set(config, 'options.plugins.labels.fontColor', (type === 'bar' ? '#000' : '#fff'))
      }
      if (type === 'bar') {
        _.set(config, 'options.legend.display', false)
        _.set(config, 'options.scales.xAxes[0].ticks.maxRotation', 90)
        _.set(config, 'options.scales.xAxes[0].ticks.minRotation', 70)
        _.set(config, 'options.scales.yAxes[0].ticks.beginAtZero', true)
        _.set(config, 'options.scales.yAxes[0].ticks.precision', 0)
        //_.set(config, 'options.plugins.labels.fontSize', 0)
      } else if (type === 'polarArea') {
        // FIXME: does not work in this case
        //_.set(config, 'options.scale.display', false)
      }

      return config
    },
    onShowChart () {
      this.$refs.chartModal.openMaximized()
      // Refresh chart data
      this.refreshChart()
    },
    async refreshChart () {
      // Destroy previous graph if any
      if (this.chart) {
        this.chart.destroy()
      }
      // Retrieve data
      await this.getChartData()
      // We need to force a refresh so that the computed props are correctly updated by Vuejs
      await this.$nextTick()
      this.chart = new Chart(this.$refs.chart.getContext('2d'),
        this.getChartOptions(this.chartType.value))
    },
    async refreshChartAndPagination () {
      this.currentChart = 1
      await this.refreshChart()
    },
    downloadChartData () {
      const json = this.values.map((value, index) => ({
        [this.$t('KArchivedEventsActivity.CHART_VALUE_LABEL')]: value,
        [this.$t('KArchivedEventsActivity.CHART_COUNT_LABEL')]: this.chartData[index]
      }))
      const csv = Papa.unparse(json)
      // Need to convert to blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      this.currentDownloadLink = URL.createObjectURL(blob)
      this.currentDownloadName = this.$t('KArchivedEventsActivity.CHART_EXPORT_FILE')
      if (Platform.is.cordova) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
          fs.root.getFile(this.currentMedia.name, { create: true, exclusive: false }, (fileEntry) => {
            fileEntry.createWriter((fileWriter) => {
              fileWriter.write(blob)
              cordova.plugins.fileOpener2.open(fileEntry.nativeURL, mimeType)
            })
          })
        })
      } else {
        // We call Vue.nextTick() to let Vue update its DOM to get the download link ready
        this.$nextTick(() => this.$refs.downloadLink.click())
      }
    },
    async downloadEventsData () {
      // Need to convert to blob
      let blob
      if (this.showMap) {
        let geoJson = this.toGeoJson(this.$t('KArchivedEventsActivity.EVENTS_LAYER_NAME'))
        geoJson.features = geoJson.features.map(feature => {
          // Move required event information into properties
          let properties = _.omit(feature, ['type', 'geometry', 'icon', 'layer', 'properties',
            'participants', 'coordinators', 'workflow', 'hasWorkflow'])
          return Object.assign({ properties }, _.pick(feature, ['type', 'geometry']))
        })
        blob = new Blob([JSON.stringify(geoJson)], { type: 'application/json;charset=utf-8;' })
      } else {
        // Make full request to avoid pagination and filter required data
        const response = await this.loadService().find({
          query: Object.assign({
            $skip: 0, $limit: MAX_EVENTS,
            $select: ['_id', 'name', 'description', 'template', 'location',
                      'createdAt', 'updatedAt', 'expireAt', 'deletedAt']
          }, this.baseQuery)
        })
        // Check if overpass max limit
        if (response.total > MAX_EVENTS) {
          this.$q.dialog({
            title: this.$t('KArchivedEventsActivity.MATCHING_RESULTS', { total: response.total }),
            message: this.$t('KArchivedEventsActivity.MAXIMUM_RESULTS', { max: MAX_EVENTS })
          })
        }
        const json = response.data.map(item => {
          // No nested structure in CSV
          if (item.location) item.location = item.location.name
          return item
        })
        const csv = Papa.unparse(json)
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      }
      
      this.currentDownloadLink = URL.createObjectURL(blob)
      this.currentDownloadName = (this.showMap ?
        this.$t('KArchivedEventsActivity.MAP_EXPORT_FILE') :
        this.$t('KArchivedEventsActivity.EVENTS_EXPORT_FILE'))
      if (Platform.is.cordova) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
          fs.root.getFile(this.currentMedia.name, { create: true, exclusive: false }, (fileEntry) => {
            fileEntry.createWriter((fileWriter) => {
              fileWriter.write(blob)
              cordova.plugins.fileOpener2.open(fileEntry.nativeURL, mimeType)
            })
          })
        })
      } else {
        // We call Vue.nextTick() to let Vue update its DOM to get the download link ready
        this.$nextTick(() => this.$refs.downloadLink.click())
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-history'] = this.$load('collection/KHistory')
    this.$options.components['k-navigation-bar'] = this.$load('KNavigationBar')
    this.registerLeafletStyle('tooltip', this.getEventTooltip)
    this.registerLeafletStyle('popup', this.getEventPopup)
    this.registerLeafletStyle('markerStyle', this.getEventMarker)
    // Initialize private properties
    this.templates = []
  },
  mounted () {
    this.$on('collection-refreshed', this.onCollectionRefreshed)
  },
  beforeDestroy () {
    this.$off('collection-refreshed', this.onCollectionRefreshed)
  }
}
</script>

<style lang="stylus">
.time-range-bar {
  border: solid 1px lightgrey;
  border-radius: 8px;
  background: #ffffff
}

.time-range-bar:hover {
  border: solid 1px $primary;
}

.chart {
  border: solid 1px lightgrey;
  border-radius: 8px;
  background: #ffffff
}
</style>
