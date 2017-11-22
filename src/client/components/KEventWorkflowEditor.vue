<template>
  <q-stepper flat ref="stepper" v-model="currentStep" color="primary" contractable @step="onStepSelected">
    <q-step v-for="(step, index) in steps" :name="step.name" :order="index" :title="step.title" :icon="step.icon" :active-icon="preview ? step.icon : 'edit'" :done-icon="step.icon">
      <k-form ref="stepForm" @form-ready="onStepFormReady" v-show="!preview" :schema="stepSchema"/>
      <div v-show="preview">
        <p>{{step.description}}</p>
      </div>
      <div class="row justify-end">
        <q-btn class="col-1" v-show="index > 0" flat color="primary" icon="navigate_before" @click="onPreviousStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">Previous step</q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="!preview" flat color="primary" icon="playlist_add" @click="onAddStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">Add a new step</q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="!preview && (steps.length > 1)" flat color="primary" icon="delete_sweep" @click="onRemoveStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">Remove current step</q-tooltip>
        </q-btn>
        <q-btn class="col-1" flat color="primary" :icon="preview ? 'edit' : 'play_arrow'" @click="onPreviewOrEdit">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">{{!preview ? 'Preview workflow' : 'Edit workflow'}}</q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="index < (steps.length - 1)" flat color="primary" icon="navigate_next" @click="onNextStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">Next step</q-tooltip>
        </q-btn>
      </div>
    </q-step>
  </q-stepper>
</template>

<script>
import _ from 'lodash'
import { QStepper, QStep, QBtn, QTooltip, uid } from 'quasar'

const defaultStep = {
  title: 'New step',
  icon: 'check'
}

export default {
  name: 'k-event-workflow-editor',
  components: {
    QStepper,
    QStep,
    QBtn,
    QTooltip
  },
  props: {
    id: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      steps: [],
      currentStep: '',
      preview: false
    }
  },
  computed: {
    stepSchema () {
      return this.id ? 'event-template-step.update' : 'event-template-step.create'
    }
  },
  methods: {
    generateStep () {
      let newStep = _.cloneDeep(defaultStep)
      // We generate a UID so that we can identify each step uniquely,
      // indeed titles might be similar
      newStep.name = uid().toString()
      return newStep
    },
    getCurrentStep () {
      return this.steps.find(step => step.name === this.currentStep)
    },
    onAddStep (index) {
      // Apply current changes when editing
      if (!this.preview) {
        this.applyStepChanges()
      }
      this.steps.push(this.generateStep())
      this.onNextStep(index)
    },
    onRemoveStep (index) {
      // Before modifying array check if current step is the last one,
      // if so go back otherwise jump to previous
      if (index > 0) {
        this.currentStep = this.steps[index - 1].name
      } else {
        // when removing first step the second will replace it
        this.currentStep = this.steps[1].name
      }
      // Can't use splice because Vue does not detect the change
      this.steps = this.steps.filter((step, i) => i !== index)
      // Restore step form when editing
      this.restoreStep()
    },
    onPreviousStep (index) {
      // Apply current form changes when editing
      this.applyStepChanges()
      this.currentStep = this.steps[index - 1].name
      this.restoreStep()
    },
    onNextStep (index) {
      // Apply current form changes when editing
      this.applyStepChanges()
      this.currentStep = this.steps[index + 1].name
      // Restore step form when editing
      this.restoreStep()
    },
    onStepSelected (step) {
      // Apply current form changes when editing
      this.applyStepChanges()
      // Restore step form when editing
      this.restoreStep()
    },
    onPreviewOrEdit () {
      // Apply current form changes before previewing
      this.applyStepChanges()
      this.preview = !this.preview
      // Restore step form when editing
      this.restoreStep()
    },
    onStepFormReady () {
      this.restoreStep()
    },
    applyStepChanges () {
      if (this.preview) return
      // DOM not ready
      if (!this.$refs.stepForm) return

      let form = this.$refs.stepForm[0].validate()
      if (form.isValid) {
        _.assign(this.getCurrentStep(), form.values)
      }
    },
    restoreStep () {
      if (this.preview) return
      // DOM not ready
      if (!this.$refs.stepForm) return

      let form = this.$refs.stepForm[0]
      form.fill(this.getCurrentStep())
    },
    fill (steps) {
      this.steps = steps
      this.currentStep = this.steps[0].name
      // Restore step form when editing
      this.restoreStep()
    },
    validate () {
      let result = { 
        isValid: false, 
        steps: this.steps
      }
      // DOM not ready
      if (this.$refs.stepForm) {
        result.isValid = this.$refs.stepForm[0].validate()
      }
      return result
    }
  },
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-form'] = loadComponent('form/KForm')
    // Initialize step data on creation
    if (!this.id) {
      this.fill([ this.generateStep() ])
    }
  }
}
</script>
