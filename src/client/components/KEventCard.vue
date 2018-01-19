<template>
  <k-card v-bind="$props">
    <q-icon slot="card-icon" :name="icon"></q-icon>
    <div slot="card-content">
      <div v-if="isParticipant">{{participantLabel}}</div>
      </br>
      <div v-if="isCoordinator">{{coordinatorLabel}}</div>
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
import { mixins } from 'kCore/client'
import { Events, QIcon, QBtn, QChip, QCollapsible } from 'quasar'

export default {
  name: 'k-event-card',
  mixins: [
    mixins.baseItem,
    mixins.service,
    mixins.schemaProxy,
    mixins.refsResolver(['form'])
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
    title () {
      return this.participantStep.title ? this.participantStep.title : 'Enter your choice'
    },
    hasParticipantInteraction () {
      return this.waitingParticipantInteraction(this.participantStep, this.participantState)
    }
  },
  data () {
    return {
      userId: '',
      isParticipant: false,
      isCoordinator: false,
      participantStep: {},
      participantState: {},
      participantLabel: '',
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
      return this._service = this.$api.getService('event-logs')
    },
    getSchemaName () {
      return 'event-logs.create'
    },
    loadSchema () {
      // Call super
      return mixins.schemaProxy.methods.loadSchema.call(this)
      .then(schema => {
        // Start from schema template and clone it because it will be shared by all cards
        this.schema = _.cloneDeep(schema)
        // Then add step interaction
        const interaction = this.participantStep.interaction.map(option => { return { label: option, value: option } })
        this.schema.properties['interaction'] = {
          type: 'string',
          default: interaction[0].value,
          field: {
            component: 'form/KSelectField',
            label: this.participantStep.title,
            helper: this.participantStep.description,
            options: interaction
          }
        }
        this.schema.required.push('interaction')
        return this.schema
      })
    },
    followUp () {
      console.log(this.item, this.$route.params)
      if (this.hasParticipantInteraction) {
        this.$refs.modal.open()
      } else if (this.isCoordinator) {
        this.$router.push({ name: 'event-activity', params: { id: this.item._id, contextId: this.$route.params.contextId } })
      }
    },
    hasInteraction (step) {
      return !_.isEmpty(step.interaction)
    },
    waitingParticipantInteraction (step, state) {
      return (this.hasInteraction(step) && !this.hasInteraction(state) && (step.stakeholder === 'participant'))
    },
    getParticipantStep (state = {}) {
      const currentStepIndex = this.item.workflow.findIndex(step => step.name === state.step)
      // No log yet, the user is at the first step of the workflow
      if (currentStepIndex < 0) {
        return this.item.workflow[0]
      }
      const currentStep = this.item.workflow[currentStepIndex]
      // For interacting steps check if interaction already recorded
      if (this.waitingParticipantInteraction(currentStep, state)) {
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
      console.log('participant logs', logs)
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
      // Clear current card/action state
      let action = this.getAction('follow-up')
      delete action.warning
      action.handler = this.followUp
      this.participantLabel = ''
      if (this.waitingParticipantInteraction(this.participantStep, this.participantState)) {
        this.participantLabel = 'Coordinator is waiting for your input'
        action.warning = 'Action required'
        console.log('participant action', action)
        // We can then load the schema and local refs in parallel
        Promise.all([
          this.loadSchema(),
          this.loadRefs()
        ])
        .then(_ => this.$refs.form.build())
      } else if (this.participantStep.stakeholder === 'coordinator') {
          this.participantLabel = 'Waiting for coordinator feedback'
          action.warning = 'Waiting coordination'
      }
      console.log('participant action', action)
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
      console.log('coordinator logs', logs)
      // Clear current card/action state
      let action = this.getAction('follow-up')
      delete action.warning
      action.handler = this.followUp
      if (logs.total > 0) {
        this.coordinatorLabel = logs.total + ' participants awaiting coordination'
        action.warning = 'Action required'
      } else {
        this.coordinatorLabel = 'No participants awaiting coordination'
      }
      console.log('coordinator action', action)
    },
    refreshCoordinatorLog () {
      return this.loadService().find({
        query: {
          $limit: 0,
          stakeholder: 'coordinator',
          interaction: { $exists: false },
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
        console.log('refresh ', this.isParticipant, this.isCoordinator, user)
        // Update according to user role
        if (this.isParticipant) {
          this.refreshParticipantLog()
        }
        if (this.isCoordinator) {
          this.refreshCoordinatorLog()
        }
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
      _.merge(log, baseLog)
      console.log('creating log', log)
      return log
    },
    async logParticipantState (event, done) {
      let result = this.$refs.form.validate()
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
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Set the required actor
    // Because we can have multiple cards we need a listener per card
    this.refreshOnGeolocation = _ => this.refresh()
    Events.$on('user-position-changed', this.refreshOnGeolocation)
  },
  beforeDestroy() {
    Events.$off('user-position-changed', this.refreshOnGeolocation)
  }
}
</script>
