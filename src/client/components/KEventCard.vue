<template>
  <k-card v-bind="$props" :itemActions="actions">
    <q-icon slot="card-icon" :name="icon.name" :color="icon.color"></q-icon>
    <div slot="card-content">
      <div v-if="isParticipant">
        {{participantLabel}}<br /><br />
      </div>
      <div v-if="comment">
        <k-text-area class="light-paragraph" :length="20" :text="comment" /><br />
      </div>
      <div v-if="isCoordinator">
        {{coordinatorLabel}}
      </div>
    </div>
    <k-modal ref="modal" v-if="hasParticipantInteraction" :title="title" :toolbar="toolbar" :buttons="buttons" :route="false" >
      <div slot="modal-content">
        <k-form ref="form" :schema="schema"/>
      </div>
    </k-modal>
  </k-card>
</template>

<script>
import _ from 'lodash'
import sift from 'sift'
import { Events, QIcon, Dialog } from 'quasar'
import { mixins as kCoreMixins } from 'kCore/client'
import { errors } from 'kMap/common'
import mixins from '../mixins'

export default {
  name: 'k-event-card',
  mixins: [
    kCoreMixins.baseItem,
    kCoreMixins.service,
    kCoreMixins.schemaProxy,
    kCoreMixins.refsResolver(['form']),
    mixins.eventLogs
  ],
  components: {
    QIcon
  },
  computed: {
    icon () {
      return this.getIcon(this.participantState, this.participantStep)
    },
    comment () {
      return this.getComment(this.participantState)
    },
    title () {
      return this.participantStep.title ? this.participantStep.title : 'Enter your choice'
    },
    hasParticipantInteraction () {
      return this.waitingInteraction(this.participantStep, this.participantState, 'participant')
    }
  },
  data () {
    return {
      participantStep: {},
      participantState: {},
      participantLabel: '',
      nbParticipantsWaitingCoordination: 0,
      coordinatorLabel: '',
      toolbar: [{ 
        name: 'close', 
        icon: 'close', 
        handler: () => this.$refs.modal.close()
      }],
      buttons: [{
        name: 'Save',
        color: 'primary',
        handler: (event, done) => this.logParticipantState(event, done),
      }]
    }
  },
  methods: {
    loadService () {
      return this._service = this.$api.getService('event-logs', this.contextId)
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
          name: 'remove-event', label: 'Remove', icon: 'remove_circle', handler: this.removeEvent
        })
      }
      if (this.$can('update', 'events', this.contextId, this.item)) {
        this.registerPaneAction({ 
          name: 'edit-event', label: 'Edit', icon: 'description',
          route: { name: 'edit-event', params: { contextId: this.contextId, id: this.item._id } }
        })
      }
      if (this.item.hasWorkflow && this.$can('read', 'events', this.contextId, this.item)) {
        let hasFollowUp = false
        let warning = ''
        if (this.isParticipant) {
          hasFollowUp = (this.waitingInteraction(this.participantStep, this.participantState, 'participant') ||
                         this.waitingInteraction(this.participantStep, this.participantState, 'coordinator'))
        }
        if (this.isCoordinator) {
          hasFollowUp = true
        }
        if (hasFollowUp) {
          if (this.isParticipant) {
            if (this.waitingInteraction(this.participantStep, this.participantState, 'participant')) {
              warning = 'Action required'
            } else if (this.waitingInteraction(this.participantStep, this.participantState, 'coordinator')) {
              warning = 'Waiting coordination'
            }
          }
          // Participant warning if any overrides coordinator warning
          if (!warning && this.isCoordinator) {
            if (this.nbParticipantsWaitingCoordination > 0) {
              warning = 'Action required'
            }
          }
          this.registerPaneAction({ 
            name: 'follow-up', label: 'Follow up', icon: 'message', handler: this.followUp, warning
          })
        }
      }
      if (this.$can('update', 'events', this.contextId, this.item)) {
        this.registerPaneAction({ 
          name: 'add-media', label: 'Add a photo', icon: 'add_a_photo',
          route: { name: 'add-media', params: { contextId: this.contextId, id: this.item._id } }
        })
      }
    },
    removeEvent (event) {
      Dialog.create({
        title: 'Remove \'' + event.name + '\' ?',
        message: 'Are you sure you want to remove the event <b>' + event.name + '</b> ?',
        buttons: [
          'Cancel',
          {
            label: 'Ok',
            handler: () => {
              let eventsService = this.$api.getService('events', this.contextId)
              eventsService.remove(event._id)
            }
          }
        ]
      })
    },
    followUp () {
      if (this.hasParticipantInteraction) {
        this.$refs.modal.open()
      } else if (this.isCoordinator) {
        this.$router.push({ name: 'event-activity', params: { id: this.item._id, contextId: this.contextId } })
      }
    },
    refreshParticipantState (logs) {
      if (logs.total === 0) {
        // No log yet => initiate the workflow by a log acting as a read receipt
        this.participantState = {}
        this.participantStep = this.getWorkflowStep() || {} // Use empty object by default to simplify display
        let log = this.createParticipantLog(this.participantStep, this.participantState)
        this.serviceCreate(log)
        // Real-time event should trigger a new refresh for current state
        return
      } else {
        this.participantState = logs.data[0]
        this.participantStep = this.getWorkflowStep(this.participantState) || {} // Use empty object by default to simplify display
        // When no workflow to be fulfilled
        if (_.isEmpty(this.participantStep)) return
        // When participant has just fullfilled a step we need to initiate the next one (if any) by a log acting as a read receipt
        // We know this when we get a different step from the current state
        if (this.participantState.step !== this.participantStep.name) {
          let log = this.createParticipantLog(this.participantStep, this.participantState)
          this.serviceCreate(log)
          // Real-time event should trigger a new refresh for current state
          return
        }
      }

      // Update actions according to user state
      this.refreshActions()
      this.participantLabel = ''
      if (this.waitingInteraction(this.participantStep, this.participantState, 'participant')) {
        this.participantLabel = 'Coordinator is waiting for your input'
        // We can then load the schema and local refs in parallel
        Promise.all([
          this.loadSchema(),
          this.loadRefs()
        ])
        .then(() => this.$refs.form.build())
      } else if (this.waitingInteraction(this.participantStep, this.participantState, 'coordinator')) {
        this.participantLabel = 'Waiting for coordinator feedback'
      }
    },
    subscribeParticipantLog () {
      // Remove previous listener if any
      this.unsubscribeParticipantLog()
      this.participantLogListener = this.loadService().find({
        rx: {
          listStrategy: 'always'
        }, query: {
          $sort: { _id: -1 },
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
      this.nbParticipantsWaitingCoordination = logs.data.filter(log => (log.stakeholder === 'coordinator') && !this.hasInteraction(log)).length
      // Update actions according to user state
      this.refreshActions()
      // Then label 
      if (this.nbParticipantsWaitingCoordination > 0) {
        this.coordinatorLabel = this.nbParticipantsWaitingCoordination + ' participants awaiting coordination'
      } else {
        this.coordinatorLabel = 'No participants awaiting coordination'
      }
    },
    subscribeCoordinatorLog () {
      // Remove previous listener if any
      this.unsubscribeCoordinatorLog()
      this.coordinatorLogListener = this.loadService().find({
        rx: {
          listStrategy: 'always'
        }, query: {
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
    refresh (error) {
      // We force a refresh anyway in case of geolocation error
      if (error && !(error instanceof errors.KPositionError)) return

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
    // Required alias for the event logs mixin
    this.event = this.item
    // Set the required actor
    // Because we can have multiple cards we need a listener per card
    // to have appropriate this binding
    this.refreshOnGeolocation = _ => this.refresh()
    if (this.$store.get('user.position')) this.refreshOnGeolocation()
    Events.$on('user-position-changed', this.refreshOnGeolocation)
    Events.$on('error', this.refreshOnGeolocation)
  },
  beforeDestroy() {
    Events.$off('user-position-changed', this.refreshOnGeolocation)
    Events.$off('error', this.refreshOnGeolocation)
    this.unsubscribeParticipantLog()
    this.unsubscribeCoordinatorLog()
  }
}
</script>
