<template>
  <k-layers-panel :layers="layers" :layerHandlers="layerHandlers" :categories="layerCategories" >
      <div slot="panel-footer" >
        <q-collapsible v-if="forecastModels.length > 0" icon="fa-globe" :label="$t('KCatalogPanel.FORECASTS_LABEL')">
          <k-forecast-models-selector :forecastModels="forecastModels" :forecastModelHandlers="forecastModelHandlers" :forecastModel="forecastModel" />
        </q-collapsible>
        <q-collapsible v-if="participants.length > 0" icon="fa-user" :label="$t('KEventActivityPanel.PARTICIPANTS_LABEL')">
          <!--q-scroll-area-->
            <template v-for="participant in participants">
              <div class="row justify-between no-wrap" style="overflow: auto" :key="participant._id">
                <div class="col-auto self-center">
                  <q-btn v-if="participant.icon" flat round small color="primary" @click="onStateClicked(participant)">
                    <q-icon :name="participant.icon.name"  :color="participant.icon.color" />
                  </q-btn>
                  {{participant.participant.name}}
                </div>
                <k-text-area v-if="participant.comment" style="flex-shrink: 0" class="col-auto light-paragraph self-center" :length="20" :text="participant.comment" />
                <div class="col-auto self-center">
                  <q-btn v-if="canFollowUp(participant)" flat round small color="primary" @click="doFollowUp(participant._id)">
                    <q-icon name="message" color="red" />
                  </q-btn>
                  <q-btn flat round small color="primary" @click="onZoomClicked(participant)">
                    <q-icon name="remove_red_eye" />
                  </q-btn>
                </div>
              </div>
            </template>
          <!--/q-scroll-area-->
        </q-collapsible>
      </div>
  </k-layers-panel>
</template>

<script>
import { Events, QBtn, QIcon, QCollapsible, QScrollArea } from 'quasar'
import mixins from '../mixins'

export default {
  name: 'k-event-activity-panel',
  components: {
    QBtn,
    QIcon, 
    QCollapsible,
    QScrollArea
  },
  mixins: [
    mixins.eventLogs
  ],
  props: {
    layers: {
      type: Object,
      default: () => {}
    },
    layerCategories: {
      type: Array,
      default: () => []
    },
    layerHandlers: {
      type: Object,
      default: () => {}
    },
    forecastModels: {
      type: Array,
      default: () => []
    },
    forecastModelHandlers: {
      type: Object,
      default: () => {}
    },
    forecastModel: {
      type: Object,
      default: () => {}
    },
    event: {
      type: Object,
      default: () => {}
    },
    participants: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    onZoomClicked (participant) {
      Events.$emit('zoom-to-participant', participant)
    },
    onStateClicked (participant) {
      Events.$emit('filter-participant-states', participant)
    }
  },
  created () {
    this.$options.components['k-text-area'] = this.$load('frame/KTextArea')
    this.$options.components['k-layers-panel'] = this.$load('KLayersPanel')
    this.$options.components['k-forecast-models-selector'] = this.$load('KForecastModelsSelector')
  }
}
</script>

