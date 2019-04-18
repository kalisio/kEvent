import { mixins } from '@kalisio/kdk-core/client'

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
    hasEnd (step) {
      return !_.isEmpty(step.end)
    },
    endWorkflow (step, state) {
      return (this.hasEnd(step) && this.hasInteraction(state) && step.end.includes(state.interaction.value))
    },
    isBeforeInWorkflow (stateName, stepName) {
      const stateIndex = this.event.workflow.findIndex(workflowStep => workflowStep.name === stateName)
      const stepIndex = this.event.workflow.findIndex(workflowStep => workflowStep.name === stepName)
      
      return (stepIndex > stateIndex)
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
      // Check if the last interaction was a workflow end
      if (this.endWorkflow(currentStep, state)) {
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
      // In case of no workflow
      if (this.event && this.event.icon) return this.event.icon
      return {}
    },
    getComment(state = {}) {
      // When last step had a recorded interaction use its comment if any
      if (state.comment) return state.comment
      // If we wait for an interaction use previous state comment if any
      if (state.previous && state.previous.comment) return state.previous.comment
      return ''
    },
    getInteraction(state = {}) {
      // When last step had a recorded interaction use it if any
      if (state.interaction) return state.interaction.value
      // If we wait for an interaction use previous state if any
      if (state.previous && state.previous.interaction) return state.previous.interaction.value
      return ''
    },
    generateSchemaForStep (step, baseSchema) {
      // Start from schema template and clone it because modifications
      // will be shared by all caller otherwise
      let schema = _.cloneDeep(baseSchema)
      // Then add step interaction
      if (step.interaction) {
        const options = step.interaction.map(option => { return { label: option.value, value: option } })
        schema.properties['interaction'] = {
          type: 'object',
          field: {
            component: 'form/KSelectField',
            label: step.title,
            helper: step.description,
            options
          }
        }
        if (options.length > 0) {
          schema.properties['interaction'].default = options[0].value
        }
        schema.required.push('interaction')
      }
      // Add a comment entry
      schema.properties['comment'] = {
        type: 'string', 
        field: {
          component: 'form/KTextareaField',
          label: 'Comment',
          helper: this.$t('schemas.EVENTS_LOG_COMMENT')
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
    hasRoleInEvent (user, roles) {
      return _.findIndex(roles, role => {
        if (role.service === 'members' && role._id === user._id) return true
        if (role.service === 'groups' || role.service === 'organisations') {
          if (sift({ [role.service + '._id']: user._id }, [user])) return true
        }
        if (role.service === 'tags') {
          if (user.tags) {
            if (_.findIndex(user.tags, { '_id': role._id } >= 0)) return true
          }
        }
        return false
      }) >= 0
    },
    refreshUser () {
      const user = this.$store.get('user')
      if (user) {
        this.userId = user._id
        // Check user role in event
        this.isParticipant = this.hasRoleInEvent(user, this.event.participants)
        this.isCoordinator = this.hasRoleInEvent(user, this.event.coordinators)
      }
    },
    uploaderOptions () {
      return {
        service: this.contextId + '/storage',
        acceptedFiles: 'image/*,application/pdf',
        multiple: true,
        maxFilesize: 10,
        autoProcessQueue: true,
        resourcesService: 'events',
        storagePath: '<%= id %>/<%= file.name %>'
      }
    },
    uploaderQuery () {
      return {
        notification: this.$t('KEventNotifications.UPDATE_MEDIA')
      }
    },
    mediaBrowserOptions () {
      return {
        service: this.contextId + '/storage'
      }
    }
  }
}

export default eventsMixin
