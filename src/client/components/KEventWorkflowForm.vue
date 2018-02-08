<template>
  <q-stepper flat ref="stepper" v-model="currentStep" color="primary" contractable @step="onStepSelected">
    <q-step v-for="(step, index) in steps" :name="step.name" :order="index" :title="step.title" :icon="step.icon.name" :active-icon="preview ? step.icon.name : 'edit'" :done-icon="step.icon.name">
      <k-form ref="stepForm" v-show="!preview" :schema="schema"/>
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
import { mixins } from 'kCore/client'
import { QStepper, QStep, QBtn, QTooltip, uid } from 'quasar'

const defaultStep = {
  title: 'New step',
  icon: { name: 'check', color: 'dark' },
  description: 'Step content',
  interaction: [],
  stakeholder: 'participant'
}

export default {
  name: 'k-event-workflow-form',
  components: {
    QStepper,
    QStep,
    QBtn,
    QTooltip
  },
  mixins: [
    mixins.schemaProxy,
    mixins.refsResolver()
  ],
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
      // If not possible the current form is invalid so do nothing
      if (!this.applyStepChanges()) return
      
      this.steps.push(this.generateStep())
      this.currentStep = this.steps[index + 1].name
      this.restoreStep()
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
    applyStepChanges () {
      if (this.preview) return false
      
      let form = this.$refs.stepForm[0].validate()
      if (form.isValid) {
        _.assign(this.getCurrentStep(), form.values)
      }
      return form.isValid
    },
    restoreStep () {
      if (this.preview) return
      
      let form = this.$refs.stepForm[0]
      form.fill(this.getCurrentStep())
    },
    build () {
      // Because our step form is under a v-if caused by the Quasar stepper
      // it is destroyed/recreated by Vue so that we need to restore the refs each time it is build
      this.setRefs(['stepForm'])
      // Build the internal form
      return Promise.all([
        this.loadSchema(),
        this.loadRefs()
      ])
      .then(_ => {
        return this.$refs.stepForm[0].build()
      })
    },
    fill (object) {
      // If no workflow given this will use default one
      if (object.workflow) {
        this.steps = object.workflow
        this.currentStep = this.steps[0].name
      }
      // Restore step form when editing
      this.restoreStep()
    },
    validate () {
      // Apply current form changes when editing
      let isValid = this.applyStepChanges()
      return { 
        isValid, 
        values: {
          workflow: this.steps
        }
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Initialize step data on creation so that local ref to form can be resolved
    this.steps = [ this.generateStep() ]
    this.currentStep = this.steps[0].name
  }
}
</script>
