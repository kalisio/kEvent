<template>
  <q-stepper flat ref="stepper" v-model="currentStep" color="primary" contractable @step="onStepSelected">
    <q-step v-for="(step, index) in steps" :key="step.name + '_' + index" :name="step.name" :order="index" :title="step.title" :icon="step.icon.name" :active-icon="preview ? step.icon.name : 'edit'" :done-icon="step.icon.name">
      <k-form ref="stepForm" v-show="!preview" :schema="schema" @form-ready="fillStepForm" @field-changed="onStepFieldChanged"/>
      <div v-show="preview">
        <k-form ref="previewForm" :schema="previewSchema"/>
      </div>
      <div class="row justify-end">
        <q-btn class="col-1" v-show="index > 0" flat color="primary" icon="navigate_before" @click="onPreviousStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{$t('KEventWorkflowForm.PREVIOUS_STEP_BUTTON')}}
          </q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="!preview" flat color="primary" icon="playlist_add" @click="onAddStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{$t('KEventWorkflowForm.ADD_STEP_BUTTON')}}
          </q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="!preview && (steps.length > 1)" flat color="primary" icon="delete_sweep" @click="onRemoveStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{$t('KEventWorkflowForm.REMOVE_STEP_BUTTON')}}
          </q-tooltip>
        </q-btn>
        <q-btn class="col-1" flat color="primary" :icon="preview ? 'edit' : 'play_arrow'" @click="onPreviewOrEdit">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{$t(!preview ? 'KEventWorkflowForm.PREVIEW_WORKFLOW_BUTTON': 'KEventWorkflowForm.EDIT_WORKFLOW_BUTTON')}}
          </q-tooltip>
        </q-btn>
        <q-btn class="col-1" v-show="index < (steps.length - 1)" flat color="primary" icon="navigate_next" @click="onNextStep(index)">
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{$t('KEventWorkflowForm.NEXT_STEP_BUTTON')}}
          </q-tooltip>
        </q-btn>
      </div>
    </q-step>
  </q-stepper>
</template>

<script>
import _ from 'lodash'
import { mixins as kCoreMixins } from '@kalisio/kdk-core/client'
import mixins from '../mixins'
import { QStepper, QStep, QBtn, QTooltip, Events, uid } from 'quasar'

export default {
  name: 'k-event-workflow-form',
  components: {
    QStepper,
    QStep,
    QBtn,
    QTooltip
  },
  mixins: [
    kCoreMixins.schemaProxy,
    kCoreMixins.refsResolver(),
    mixins.eventLogs
  ],
  props: {
    objectId: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      steps: [],
      currentStep: '',
      preview: false,
      previewSchema: null
    }
  },
  methods: {
    getForm (form) {
      return this.$refs[form][0]
    },
    generateStep () {
      let newStep = _.cloneDeep(this.defaultStep)
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
      // If not possible the current form is invalid so do nothing
      if (!this.applyStepChanges()) return
      this.currentStep = this.steps[index - 1].name
      this.restoreStep()
    },
    onNextStep (index) {
      // Apply current form changes when editing
      // If not possible the current form is invalid so do nothing
      if (!this.applyStepChanges()) return
      this.currentStep = this.steps[index + 1].name
      // Restore step form when editing
      this.restoreStep()
    },
    onStepSelected (step) {
      // Apply current form changes when editing
      // If not possible the current form is invalid so do nothing
      // FIXME: when called the step has already been changed in model
      // so that current step is not the right one anymore
      // For now we don't validate
      //if (!this.applyStepChanges()) return
      // Restore step form when editing
      this.restoreStep()
    },
    onPreviewOrEdit () {
      // Apply current form changes before previewing
      if (!this.preview) {
        // If not possible the current form is invalid so do nothing
        if (!this.applyStepChanges()) return
      }
      this.preview = !this.preview
      // Restore step form when editing
      this.restoreStep()
    },
    applyStepChanges () {
      if (this.preview) return false

      let form = this.getForm('stepForm').validate()
      if (form.isValid) {
        _.assign(this.getCurrentStep(), form.values)
      }
      return form.isValid
    },
    restoreStep () {
      // For preview we need to update the underlying schema to reflect step values
      if (this.preview) {
        this.previewSchema = this.generateSchemaForStep(this.getCurrentStep(), this.previewSchemaBase)
        // We need to force a refresh so that the schema is correctly transfered to child component by Vuejs
        this.$nextTick().then(() => {
          // Force form refresh to default values
          let form = this.getForm('previewForm')
          form.build().then(() => form.clear())
        })
      } else {
        // Otherwise simply fill the step form
        this.fillStepForm()
      }
    },
    loadPreviewSchema () {
      return this.$load('event-logs.create', 'schema')
      .then(schema => {
        this.previewSchemaBase = schema
        this.previewSchema = this.generateSchemaForStep(this.getCurrentStep(), this.previewSchemaBase)
        return schema
      })
      .catch(error => {
        Events.$emit('error', error)
        throw error
      })
    },
    onStepFieldChanged (field, value) {
      // Setup workflow ending values selector depending on interaction field state
      if (field === 'interaction') {
        this.setupEndField()
      }
    },
    fillStepForm () {
      let form = this.getForm('stepForm')
      // Skip validation so that place holder can be seen
      // Validation occur on add, next or previous step
      form.fill(this.getCurrentStep(), true)
      this.setupEndField()
    },
    setupEndField () {
      let form = this.getForm('stepForm')
      let interactionField = form.getField('interaction')
      let endField = form.getField('end')
      // Add required label field
      _.set(endField, 'properties.field.options', interactionField.model.map(option => Object.assign({ label: option.value }, option)))
    },
    build () {
      // Because our step form is under a v-if caused by the Quasar stepper
      // it is destroyed/recreated by Vue so that we need to restore the refs each time it is build
      this.setRefs(['stepForm'])
      // Build the internal form
      return Promise.all([
        this.loadSchema(),
        this.loadPreviewSchema(),
        this.loadRefs()
      ])
      .then(() => {
        return Promise.all([
          this.getForm('stepForm').build(),
          this.getForm('previewForm').build()
        ])
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
    clear () {
      this.fill({ workflow: [this.generateStep()] })
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
    },
    async apply (object) {
      object.workflow = this.steps
    },
    submitted (object) {
    }
  },
  created () {
    this.defaultStep = {
      title: '',
      icon: { name: 'check', color: 'dark' },
      description: '',
      interaction: [],
      end: [],
      stakeholder: 'participant'
    }
    // Load the required components
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Initialize step data on creation so that local ref to form can be resolved
    this.steps = [this.generateStep()]
    this.currentStep = this.steps[0].name
  }
}
</script>
