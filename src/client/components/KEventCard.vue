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
      if (!this.schema || !this.participantStep.interaction) return null
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
      console.log(schema)
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
    refreshParticipantState (logs) {
      // No log yet, the user is at the first step of the workflow
      if (logs.total === 0) {
        this.participantStep = this.item.workflow[0]
        this.participantState = {}
      } else {
        this.participantState = logs.data[0]
        const previousStep = this.item.workflow.findIndex(step => step.name === this.participantState.step)
        const nextStep = (previousStep >= 0 ? previousStep + 1 : -1)
        // End of workflow or next step to be fulfilled ?
        if (nextStep >= 0 && nextStep < this.item.workflow.length) {
          this.participantStep = this.item.workflow[nextStep]
        } else {
          this.participantStep = {}
        }
      }
      console.log(this.participantState, this.participantStep)
      let action = this.getAction('follow-up')
      if (this.participantStep.stakeholder === 'participant') {
        this.followUpLabel = 'Coordinator is waiting for your input'
        action.warning = 'Action required'
        action.handler = this.followUp
      } else if (this.participantStep.stakeholder === 'coordinator') {
        this.followUpLabel = 'Coordinator will give you feedback'
        action.warning = 'Waiting coordination'
        action.handler = this.followUp
      } else {
        delete action.warning
      }
      // We can then load the schema and local refs in parallel
      return Promise.all([
        this.loadSchema(),
        this.loadRefs()
      ])
      .then(_ => this.$refs.participantForm.build())
    },
    refreshParticipantLog () {
      return this.loadService().find({
        query: {
          $sort: { _id: 1 },
          $limit: 1,
          participant: this.participant,
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
          //stakeholder: 'coordinator',
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
        if (this.isParticipant) this.refreshParticipantLog()
        if (this.isCoordinator) this.refreshCoordinatorLog()
      }
    },
    logParticipantState () {
      let form = this.$refs.participantForm
      let result = form.validate()
      if (result.isValid) {
        // Directly store as GeoJson objects
        let log = {
          type: 'Feature',
          participant: this.userId,
          event: this.item._id,
          step: this.step.name,
          stakeholder: 'participant',
          properties: {}
        }
        // Interaction stored as feature properties for mapping
        Object.assign(log.properties, result.values)
        // Participant position as geometry
        const position = this.$store.get('user.position')
        if (position) {
          log.geometry = {
            type: 'Point',
            coordinates: [position.longitude, position.latitude]
          }
        }
        this.serviceCreate(log) 
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-card'] = this.$load('collection/KCard')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Set the required actor
    this.refresh()
    Events.$on('user-changed', this.refresh)
  },
  beforeDestroy() {
    Events.$off('user-changed', this.refresh)
  }
}
</script>
