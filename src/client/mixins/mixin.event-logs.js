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
      if (_.isEmpty(step)) return false
      else return !_.isEmpty(step.interaction)
    },
    waitingInteraction (step, state, stakeholder) {
      return (this.hasInteraction(step) && !this.hasInteraction(state) && (step.stakeholder === stakeholder))
    },
    getWorkflowStep (state = {}) {
      if (_.isNil(this.event.workflow)) return null

      const currentStepIndex = this.event.workflow.findIndex(step => step.name === state.step)
      // No log yet, the user is at the first step of the workflow
      if (currentStepIndex < 0) {
        return this.event.workflow[0]
      }
      const currentStep = this.event.workflow[currentStepIndex]
      // For interacting steps check if interaction already recorded
      if (this.waitingInteraction(currentStep, state, state.stakeholder)) {
        return currentStep
      }
      const nextStepIndex = currentStepIndex + 1
      // End of workflow or next step to be fulfilled ?
      if (nextStepIndex >= 0 && nextStepIndex < this.event.workflow.length) {
        return this.event.workflow[nextStepIndex]
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
      // Add a comment entry
      schema.properties['comment'] = {
        type: 'string', 
        field: {
          component: 'form/KTextareaField',
          label: 'Comment',
          helper: 'Enter your comment for this step'
        }
      }
      schema.required.push('comment')
      return schema
    },
    createParticipantLog(step = {}, state = {}) {
      let log = {
        type: 'Feature',
        participant: this.userId,
        event: this.event._id || this.event,
        // Set this as default in case of no workflow for read receipt
        stakeholder: 'participant',
        properties: {}
      }
      // Could be missing when no workflow
      if (step.name) {
        log.step = step.name
      }
      if (step.stakeholder) {
        log.stakeholder = step.stakeholder
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
      } else {
        // Copy geometry from previous state for coordinator so that we keep the last know user position
        if (state.geometry) log.geometry = state.geometry
        // Copy also participant ID so that the ID of the coordinator is not used
        if (state.participant) log.participant = state.participant._id || state.participant
      }
      return log
    },
    logStep (form, step, state = {}) {
      let result = form.validate()
      if (result.isValid) {
        // Directly store as GeoJson objects
        // FIXME: what to store as feature properties for mapping ?
        let log = this.createParticipantLog(step, state)
        _.merge(log, result.values)
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
        this.isParticipant = _.findIndex(this.event.participants, participant => {
          if (participant.service === 'members' && participant._id === user._id) return true
          if (participant.service === 'groups' || participant.service === 'organisations') {
            if (sift({ [participant.service + '._id']: participant._id }, [user])) return true
          }
          if (participant.service === 'tags') {
            if (user.tags.findIndex() >= 0) return true
          }
          return false
        }) >= 0
        this.isCoordinator = _.findIndex(this.event.coordinators, coordinator => {
          return (coordinator === user._id)
        }) >= 0
      }
    }
  }
}

export default eventsMixin
