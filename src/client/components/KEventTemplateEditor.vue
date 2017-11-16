<template>
  <div>
    <k-editor :context="contextId" service="event-templates" :id="id" />
    <div class="layout-padding row justify-center">
      <q-stepper flat ref="stepper" v-model="currentStep" color="primary" :contractable="true">
        <q-step v-for="(step, title) in steps" default name="title" title="title" icon="step.icon">
          <q-stepper-navigation>
            <q-btn color="primary" @click="$refs.stepper.next()">Continue</q-btn>
            <q-btn color="primary" flat @click="$refs.stepper.previous()">Back</q-btn>
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </div>
  </div>
</template>

<script>
import { QStepper, QStep, QStepperNavigation, QBtn } from 'quasar'
import { mixins as kCoreMixins } from 'kCore/client'
import mixins from '../mixins'

export default {
  name: 'k-event-template-editor',
  mixins: [kCoreMixins.baseActivity],
  components: {
    QStepper,
    QStep,
    QStepperNavigation,
    QBtn
  },
  props: {
    contextId: {
      type: String,
      default: ''
    },
    id : {
      type: String,
      default: '',
    }
  },
  data () {
    return {
      steps: {
        'First step': {
          icon: 'attach_money'
        }
      },
      currentStep: 'First step'
    }
  },
  methods: {
  },
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-editor'] = loadComponent('editor/KEditor')
  }
}
</script>
