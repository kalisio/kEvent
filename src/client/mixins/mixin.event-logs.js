import { mixins } from 'kCore/client'

let eventsMixin = {
  data () {
    return {
      userId: '',
      isParticipant: false,
      isCoordinator: false
    }
  },
  methods: {
    hasInteraction (step) {
      return !_.isEmpty(step.interaction)
    },
    waitingInteraction (step, state, stakeholder) {
      return (this.hasInteraction(step) && !this.hasInteraction(state) && (step.stakeholder === stakeholder))
    },
    getWorkflowStep (state = {}) {
      const currentStepIndex = this.item.workflow.findIndex(step => step.name === state.step)
      // No log yet, the user is at the first step of the workflow
      if (currentStepIndex < 0) {
        return this.item.workflow[0]
      }
      const currentStep = this.item.workflow[currentStepIndex]
      // For interacting steps check if interaction already recorded
      if (this.waitingInteraction(currentStep, state, state.stakeholder)) {
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
    getIcon(state = {}, step = {}) {
      // When last step was an interaction use it as icon
      if (state.interaction) return state.interaction.icon
      // If we wait for an interaction use previous state icon
      if (state.previous && state.previous.interaction) return state.previous.interaction.icon
      // Otherwise use workflow icon for current step
      if (step.icon) return step.icon
      return {}
    },
    createParticipantLog(step, baseLog = {}) {
      let log = {
        type: 'Feature',
        participant: this.userId,
        event: this.item._id,
        step: step.name,
        stakeholder: step.stakeholder || 'participant',
        properties: {}
      }
      // Participant position as geometry
      if (log.stakeholder === 'participant') {
        const position = this.$store.get('user.position')
        if (position) {
          log.geometry = {
            type: 'Point',
            coordinates: [position.longitude, position.latitude]
          }
        }
      }
      _.merge(log, baseLog)
      return log
    },
    generateSchemaForStep (step, baseSchema) {
      // Start from schema template and clone it because modifications
      // will be shared by all caller otherwise
      let schema = _.cloneDeep(baseSchema)
      // Then add step interaction
      const options = step.interaction.map(option => { return { label: option.value, value: option } })
      schema.properties['interaction'] = {
        type: 'object',
        default: options[0].value,
        field: {
          component: 'form/KSelectField',
          label: step.title,
          helper: step.description,
          options
        }
      }
      schema.required.push('interaction')
      return schema
    },
    logState (form, step, baseLog = {}) {
      let result = form.validate()
      if (result.isValid) {
        // Directly store as GeoJson objects
        // FIXME: what to store as feature properties for mapping ?
        let log = this.createParticipantLog(step, _.merge(result.values, baseLog))
        return this.serviceCreate(log)
      } else {
        return Promise.reject(new Error('Cannot log state because form is not valid'))
      }
    },
    refreshUser () {
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
      }
    }
  }
}

export default eventsMixin
