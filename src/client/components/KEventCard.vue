<template>
  <k-card v-bind="$props">
    <q-icon slot="card-icon" :name="icon"></q-icon>
    <div slot="card-content">
      <q-collapsible v-if="isParticipant" :opened="isFollowUpOpen" :label="followUpLabel">
        <k-form ref="participantForm" :schema="participantSchema"/>
        <q-btn id="save-button" color="primary" @click="logParticipantState" loader>Save</q-btn>
      </q-collapsible>
      <q-collapsible v-if="isCoordinator" :opened="isParticipantsOpen" :label="participantsLabel">
        TODO
      </q-collapsible>
    </div>
  </k-card>
</template>

<script>
import _ from 'lodash'
import sift from 'sift'
import { mixins } from 'kCore/client'
import { Events, QIcon, QBtn, QChip, QCollapsible } from 'quasar'

export default {
  name: 'k-event-card',
  mixins: [
    mixins.baseItem,
    mixins.service,
    mixins.schemaProxy,
    mixins.refsResolver(['participantForm'])
  ],
  components: {
    QIcon, QBtn, QChip, QCollapsible
  },
  computed: {
    icon () {
      if (this.participantState.icon) return this.participantState.icon.name
      if (this.participantStep.icon) return this.participantStep.icon.name
      return ''
    },
    participantSchema () {
      if (!this.schema || !this.hasInteraction(this.participantStep)) return null
      // Start from schema template
      let schema = _.merge({}, this.schema)
      // Then add step interaction
      const interaction = this.participantStep.interaction.map(option => { return { label: option, value: option } })
      schema.properties['interaction'] = {
        type: 'string',
        default: interaction[0].value,
        field: {
          component: 'form/KSelectField',
          label: this.participantStep.title,
          helper: this.participantStep.description,
          options: interaction
        }
      }
      schema.required.push('interaction')
      return schema
    }
  },
  data () {
    return {
      userId: '',
      isParticipant: false,
      isCoordinator: false,
      participantStep: {},
      participantState: {},
      isFollowUpOpen: false,
      followUpLabel: '',
      isParticipantsOpen: false,
      participantsLabel: ''
    }
  },
  methods: {
    loadService () {
      return this._service = this.$api.getService('event-logs')
    },
    getSchemaName () {
      return 'event-logs.create'
    },
    followUp () {
      if (this.isParticipant) this.isFollowUpOpen = !this.isFollowUpOpen
      if (this.isCoordinator) this.isParticipantsOpen = !this.isParticipantsOpen
    },
    hasInteraction (step) {
      return !_.isEmpty(step.interaction)
    },
    getParticipantStep (state = {}) {
      const currentStepIndex = this.item.workflow.findIndex(step => step.name === state.step)
      // No log yet, the user is at the first step of the workflow
      if (currentStepIndex < 0) {
        return this.item.workflow[0]
      }
      const currentStep = this.item.workflow[currentStepIndex]
      // For interacting steps check if interaction already recorded
      if (this.hasInteraction(currentStep) && !this.hasInteraction(state)) {
        return currentStep
      }
      const nextStepIndex = currentStepIndex + 1
      // End of workflow or next step to be fulfilled ?
      if (nextStepIndex >= 0 && nextStepIndex < this.item.workflow.length) {
        return this.item.workflow[nextStepIndex]
      } else {
        return currentStep
      }
    },
    refreshParticipantState (logs) {
      if (logs.total === 0) {
        // No log yet => initiate the workflow by a log acting as a read receipt
        this.participantState = {}
        this.participantStep = this.getParticipantStep()
        let log = this.createParticipantLog()
        this.serviceCreate(log)
        // Real-time event should trigger a new refresh for current state
        return
      } else {
        this.participantState = logs.data[0]
        this.participantStep = this.getParticipantStep(this.participantState)
        // When participant has just fullfilled a step we need to initiate the next one (if any) by a log acting as a read receipt
        // We know this when we get a different step from the current state
        if (this.participantState.step !== this.participantStep.name) {
          let log = this.createParticipantLog()
          this.serviceCreate(log)
          // Real-time event should trigger a new refresh for current state
          return
        }
      }
      let action = this.getAction('follow-up')
      if (!this.hasInteraction(this.participantStep)) {
        delete action.warning
      } else if (this.participantStep.stakeholder === 'participant') {
        this.followUpLabel = 'Coordinator is waiting for your input'
        action.warning = 'Action required'
        action.handler = this.followUp
        // We can then load the schema and local refs in parallel
        return Promise.all([
          this.loadSchema(),
          this.loadRefs()
        ])
        .then(_ => this.$refs.participantForm.build())
      } else if (this.participantStep.stakeholder === 'coordinator') {
        this.followUpLabel = 'Waiting for coordinator feedback'
        action.warning = 'Waiting coordination'
        action.handler = this.followUp
      }
    },
    refreshParticipantLog () {
      return this.loadService().find({
        query: {
          $sort: { _id: -1 },
          $limit: 1,
          participant: this.userId,
          event: this.item._id
        }
      })
      // We can then load the last state of the user
      .subscribe(this.refreshParticipantState)
    },
    refreshCoordinatorState (logs) {
      let action = this.getAction('follow-up')
      if (logs.total > 0) {
        this.participantsLabel = logs.total + ' awaiting participants'
        action.warning = 'Action required'
        action.handler = this.followUp
      } else {
        this.participantsLabel = 'No awaiting participants'
        delete action.warning
      }
    },
    refreshCoordinatorLog () {
      return this.loadService().find({
        query: {
          $limit: 0,
          stakeholder: 'coordinator',
          event: this.item._id
        }
      })
      // We can then load the last state of the user
      .subscribe(this.refreshCoordinatorState)
    },
    refresh () {
      const user = this.$store.get('user')
      if (user) {
        this.userId = user._id
        // Check user role in event
        this.isParticipant = _.findIndex(this.item.participants, participant => {
          if (participant.service === 'members' && participant._id === user._id) return true
          if (participant.service === 'groups' || participant.service === 'organisations') {
            if (sift({ [participant.service + '._id']: participant._id }, [user])) return true
          }
          if (participant.service === 'tags') {
            if (user.tags.findIndex() >= 0) return true
          }
          return false
        }) >= 0
        this.isCoordinator = _.findIndex(this.item.coordinators, coordinator => {
          return (coordinator === user._id)
        }) >= 0
        // Update according to user role
        if (this.isParticipant) this.refreshParticipantLog()
        if (this.isCoordinator) this.refreshCoordinatorLog()
      }
    },
    createParticipantLog(baseLog = {}) {
      let log = {
        type: 'Feature',
        participant: this.userId,
        event: this.item._id,
        step: this.participantStep.name,
        stakeholder: this.participantStep.stakeholder,
        properties: {}
      }
      // Participant position as geometry
      const position = this.$store.get('user.position')
      if (position) {
        log.geometry = {
          type: 'Point',
          coordinates: [position.longitude, position.latitude]
        }
      }
      return _.merge(log, baseLog)
    },
    async logParticipantState (event, done) {
      let form = this.$refs.participantForm
      let result = form.validate()
      if (result.isValid) {
        // Directly store as GeoJson objects
        // FIXME: what to store as feature properties for mapping ?
        let log = this.createParticipantLog(result.values)
        await this.serviceCreate(log)
      }
      done()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-card'] = this.$load('collection/KCard')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Set the required actor
    Events.$on('user-position-changed', this.refresh)
  },
  beforeDestroy() {
    Events.$off('user-position-changed', this.refresh)
  }
}
</script>
