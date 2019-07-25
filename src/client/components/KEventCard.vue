<template>
  <div>
    <k-card v-bind="$props" :itemActions="actions">
      <q-icon slot="card-icon" :name="iconName" :color="iconColor"></q-icon>
      <div slot="card-content">
        <div v-if="location">
          {{ location }}
          <q-separator class="card-separator" />
        </div>
        <div v-if="participantLabel">
          {{ participantLabel }}
          <q-card-separator class="card-separator" />
        </div>
        <span v-if="comment">
          <k-text-area class="light-paragraph" :length="20" :text="comment" />
          <q-separator class="card-separator" />
        </span>
        <div v-if="coordinatorLabel">
          {{ coordinatorLabel }}
          <q-separator class="card-separator" />
        </div>
        <div v-if="createdAt || updatedAt">
          <cite v-if="createdAt"><small>{{$t('KEventCard.CREATED_AT_LABEL')}} {{createdAt.toLocaleString()}}</small></cite><br />
          <cite v-if="updatedAt"><small>{{$t('KEventCard.UPDATED_AT_LABEL')}} {{updatedAt.toLocaleString()}}</small></cite>
        </div>
        
      </div>
    </k-card>
    <k-modal ref="followUpModal" v-if="hasParticipantInteraction" :title="followUpTitle" :toolbar="getFollowUpToolbar()" :buttons="getFollowUpButtons()" :route="false" >
      <div slot="modal-content">
        <k-form ref="form" :schema="schema"/>
      </div>
    </k-modal>
    <k-uploader ref="uploader" :resource="item._id" :base-query="uploaderQuery()" :options="uploaderOptions()"/>
    <k-media-browser ref="mediaBrowser" :options="mediaBrowserOptions()" />
    <k-location-map ref="locationMap" />
  </div>
</template>

<script>
import _ from 'lodash'
import { Dialog } from 'quasar'
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'
import mixins from '../mixins'

export default {
  name: 'k-event-card',
  mixins: [
    kCoreMixins.baseItem,
    kCoreMixins.service,
    kCoreMixins.schemaProxy,
    kCoreMixins.refsResolver(['form']),
    kMapMixins.navigator,
    mixins.eventLogs
  ],
  computed: {
    icon () {
      return this.getIcon(this.participantState, this.participantStep)
    },
    iconColor () {
      return _.get(this.icon, 'color', '')
    },
    iconName () {
      return kCoreUtils.getIconName(this)
    },
    comment () {
      return this.getComment(this.participantState)
    },
    createdAt () {
      return this.item.createdAt ? new Date(this.item.createdAt) : null
    },
    updatedAt () {
      return this.item.updatedAt ? new Date(this.item.updatedAt) : null
    },
    followUpTitle () {
      return this.participantStep.title ? this.participantStep.title : 'Enter your choice'
    },
    hasParticipantInteraction () {
      return this.waitingInteraction(this.participantStep, this.participantState, 'participant')
    },
    location () {
      if (this.item.location) return this.item.location.name
      return ''
    }
  },
  data () {
    return {
      participantStep: {},
      participantState: {},
      participantLabel: '',
      nbParticipantsWaitingCoordination: 0,
      coordinatorLabel: ''
    }
  },
  methods: {
    hasGeoLocation () {
      return !_.isEmpty(this.item.location) && !_.isNil(this.item.location.longitude) && !_.isNil(this.item.location.latitude)
    },
    getFollowUpToolbar () {
      return [{
        name: 'close-action',
        label: this.$t('KEventCard.FOLLOWUP_MODAL_CLOSE_ACTION'),
        icon: 'close',
        handler: () => this.$refs.followUpModal.close()
      }]
    },
    getFollowUpButtons () {
      return [{
        name: 'save-button',
        label: this.$t('KEventCard.FOLLOWUP_MODAL_SAVE_BUTTON'),
        handler: (event, done) => this.logParticipantState(event, done)
      }]
    },
    loadService () {
      this._service = this.$api.getService('event-logs', this.contextId)
      return this._service
    },
    getSchemaName () {
      return 'event-logs.create'
    },
    loadSchema () {
      // Call super
      return kCoreMixins.schemaProxy.methods.loadSchema.call(this)
      .then(schema => {
        // Start from schema template and clone it because it will be shared by all cards
        this.schema = this.generateSchemaForStep(this.participantStep, schema)
        return this.schema
      })
    },
    refreshActions () {
      // Item actions
      this.clearActions()
      if (this.$can('remove', 'events', this.contextId, this.item)) {
        this.registerMenuAction({
          name: 'remove-event', label: this.$t('KEventCard.REMOVE_LABEL'), icon: 'remove_circle', handler: this.removeEvent
        })
      }
      if (this.$can('update', 'events', this.contextId, this.item)) {
        this.registerPaneAction({
          name: 'edit-event',
          label: this.$t('KEventCard.EDIT_LABEL'),
          icon: 'description',
          route: { name: 'edit-event', params: { contextId: this.contextId, objectId: this.item._id } }
        })
      }
      if (this.$can('read', 'events', this.contextId, this.item)) {
        let hasFollowUp = false
        let warning = ''
        if (this.isParticipant) {
          hasFollowUp = this.item.hasWorkflow &&
                        (this.waitingInteraction(this.participantStep, this.participantState, 'participant') ||
                         this.waitingInteraction(this.participantStep, this.participantState, 'coordinator'))
        }
        if (this.isCoordinator) {
          // If we'd like to always have a map even when no workflow available switch this value to true
          // Otherwise use the workflow flag
          hasFollowUp = true // this.item.hasWorkflow
        }
        if (hasFollowUp) {
          if (this.isParticipant) {
            if (this.waitingInteraction(this.participantStep, this.participantState, 'participant')) {
              warning = this.$t('KEventCard.ACTION_REQUIRED_WARNING')
            } else if (this.waitingInteraction(this.participantStep, this.participantState, 'coordinator')) {
              warning = this.$t('KEventCard.WAITING_COORDINATION_WARNING')
            }
          }
          // Participant warning if any overrides coordinator warning
          if (!warning && this.isCoordinator) {
            if (this.nbParticipantsWaitingCoordination > 0) {
              warning = this.$t('KEventCard.ACTION_REQUIRED_WARNING')
            }
          }
          this.registerPaneAction({
            name: 'follow-up', label: this.$t('KEventCard.FOLLOW_UP_LABEL'), icon: 'message', handler: this.followUp, warning
          })
        }
      }
      if (this.$can('read', 'events', this.contextId, this.item)) {
        this.registerPaneAction({
          name: 'add-media', label: this.$t('KEventCard.ADD_MEDIA_LABEL'), icon: 'add_a_photo', handler: this.uploadMedia
        })
        this.registerPaneAction({
          name: 'browse-media', label: this.$t('KEventCard.BROWSE_MEDIA_LABEL'), icon: 'photo_library', handler: this.browseMedia
        })
      }
      if (this.hasGeoLocation()) {
        this.registerPaneAction({
          name: 'locate', label: this.$t('KEventCard.LOCATE_LABEL'), icon: 'map', handler: this.displayLocationMap
        })
      }
      if (this.canNavigate() && this.hasGeoLocation()) {
        this.registerPaneAction({
          name: 'navigate', label: this.$t('KEventCard.NAVIGATE_LABEL'), icon: 'navigation', handler: this.launchNavigation
        })
      }
    },
    uploadMedia () {
      this.$refs.uploader.open(this.item.attachments)
    },
    browseMedia () {
      this.$refs.mediaBrowser.open(this.item.attachments)
    },
    displayLocationMap () {
      this.$refs.locationMap.open(this.item.location)
    },
    launchNavigation () {
      let longitude = this.item.location.longitude
      let latitude = this.item.location.latitude
      this.navigate(longitude, latitude)
    },
    removeEvent (event) {
      Dialog.create({
        title: this.$t('KEventCard.REMOVE_DIALOG_TITLE', { event: event.name }),
        message: this.$t('KEventCard.REMOVE_DIALOG_TITLE', { event: event.name }),
        ok: {
          label: this.$t('OK'),
        },
        cancel: {
          label: this.$t('CANCEL')
        }
      }).onOk(() => {
        let eventsService = this.$api.getService('events', this.contextId)
        eventsService.remove(event._id, { query: { notification: this.$t('KEventNotifications.REMOVE') } })
      })
    },
    followUp () {
      if (this.hasParticipantInteraction) {
        this.$refs.followUpModal.open()
      } else if (this.isCoordinator) {
        this.$router.push({ name: 'event-activity', params: { objectId: this.item._id, contextId: this.contextId } })
      }
    },
    async refreshParticipantState (logs) {
      if (logs.total === 0) {
        // No last log yet => initiate the workflow by a log acting as a read receipt
        // FIXME: don't know really why but it seems that during some temporary state
        // the refresh is raised without any active logs while they are tagged as is in the DB...
        // We just add a check to avoid initiate the workflow multiple times
        const count = await this.serviceFind({
          query: {
            $limit: 0,
            participant: this.userId,
            event: this.item._id
          }
        })
        if (count.total === 0) {
          this.participantState = {}
          this.participantStep = this.getWorkflowStep() || {} // Use empty object by default to simplify display
          let log = this.createParticipantLog(this.participantStep, this.participantState)
          this.serviceCreate(log)
          // Real-time event should trigger a new refresh for current state
        }
      } else if (logs.data.length > 0) {
        this.participantState = logs.data[0]
        this.participantStep = this.getWorkflowStep(this.participantState) || {} // Use empty object by default to simplify display
        // When no workflow to be fulfilled
        if (_.isEmpty(this.participantStep)) return
        // When participant has just fullfilled a step we need to initiate the next one (if any) by a log acting as a read receipt
        // We know this when we get a higher step in workflow from the current state
        if (this.isBeforeInWorkflow(this.participantState.step, this.participantStep.name)) {
          let log = this.createParticipantLog(this.participantStep, this.participantState)
          this.serviceCreate(log)
          // Real-time event should trigger a new refresh for current state
        }
      }

      // Update actions according to user state
      this.refreshActions()
      this.participantLabel = ''
      if (this.waitingInteraction(this.participantStep, this.participantState, 'participant')) {
        this.participantLabel = this.$t('KEventCard.WAITING_FOR_PARTICIPANT_LABEL')
        // We can then load the schema and local refs in parallel
        Promise.all([
          this.loadSchema(),
          this.loadRefs()
        ])
        .then(() => this.$refs.form.build())
      } else if (this.waitingInteraction(this.participantStep, this.participantState, 'coordinator')) {
        this.participantLabel = this.$t('KEventCard.WAITING_FOR_COORDINATOR_LABEL')
      }
    },
    subscribeParticipantLog () {
      // Remove previous listener if any
      this.unsubscribeParticipantLog()
      this.participantLogListener = this.loadService().watch({ listStrategy: 'always' })
      .find({
        query: {
          $sort: { createdAt: -1 }, // sort by newest ones
          $limit: 1,
          participant: this.userId,
          event: this.item._id,
          lastInEvent: true
        }
      })
      // We can then load the last state of the user
      .subscribe(this.refreshParticipantState)
    },
    unsubscribeParticipantLog () {
      if (this.participantLogListener) {
        this.participantLogListener.unsubscribe()
        this.participantLogListener = null
      }
    },
    refreshCoordinatorState (logs) {
      this.nbParticipantsWaitingCoordination = logs.data.filter(
        log => (log.stakeholder === 'coordinator') && !this.hasInteraction(log)
      ).length
      // Update actions according to user state
      this.refreshActions()
      // Then label
      if (this.nbParticipantsWaitingCoordination > 0) {
        this.coordinatorLabel = this.$t('KEventCard.PARTICPANTS_AWAITING_LABEL', { number: this.nbParticipantsWaitingCoordination })
      } else {
        this.coordinatorLabel = this.$t('KEventCard.NO_PARTICPANTS_AWAITING_LABEL')
      }
      if (logs.data.length < logs.total) {
        this.$events.$emit('error', new Error(this.$t('errors.EVENT_LOG_LIMIT')))
      }
    },
    subscribeCoordinatorLog () {
      // Remove previous listener if any
      this.unsubscribeCoordinatorLog()
      this.coordinatorLogListener = this.loadService().watch({ listStrategy: 'smart' })
      .find({
        query: {
          event: this.item._id,
          lastInEvent: true
        }
      })
      // We can then load the last state of the user
      .subscribe(this.refreshCoordinatorState)
    },
    unsubscribeCoordinatorLog () {
      if (this.coordinatorLogListener) {
        this.coordinatorLogListener.unsubscribe()
        this.coordinatorLogListener = null
      }
    },
    refresh () {
      this.refreshUser()
      if (this.userId) {
        // Update content according to user role
        if (this.isParticipant) {
          this.subscribeParticipantLog()
        }
        if (this.isCoordinator) {
          this.subscribeCoordinatorLog()
        }
      }
    },
    async logParticipantState (event, done) {
      await this.logStep(this.$refs.form, this.participantStep, this.participantState)
      done()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-card'] = this.$load('collection/KCard')
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-text-area'] = this.$load('frame/KTextArea')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-uploader'] = this.$load('input/KUploader')
    this.$options.components['k-media-browser'] = this.$load('media/KMediaBrowser')
    this.$options.components['k-location-map'] = this.$load('KLocationMap')
    // Required alias for the event logs mixin
    this.event = this.item
    // Set the required actor
    if (this.$store.get('user')) this.refresh()
    this.$events.$on('user-changed', this.refresh)
  },
  beforeDestroy () {
    this.$events.$off('user-changed', this.refresh)
    this.unsubscribeParticipantLog()
    this.unsubscribeCoordinatorLog()
  }
}
</script>

<style>
  .card-separator {
    margin: 8px
  }
</style>
