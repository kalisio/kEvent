<template>
  <div class="row justify-center full-width">
    <k-form class="col-10" ref="eventForm" :schema="eventSchema"/>
    </br>
    <p class="col-10 caption text-center">
      <strong>Event workflow</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
    </p>
    <k-event-workflow-editor ref="workflow" class="col-10" :id="id" v-model="steps" />
    <!-- Buttons section -->
    <div class="col-10">
      <div class="row justify-around" style="padding: 18px">
        <q-btn color="primary" @click="apply" loader>{{ applyButton }}</q-btn>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { QBtn } from 'quasar'
import { mixins } from 'kCore/client'

export default {
  name: 'k-event-editor',
  components: {
    QBtn
  },
  props: {
    template: {
      type: Object,
      required: true
    }
  },
  mixins: [mixins.service, mixins.objectProxy],
  methods: {
    apply (event, done) {
      // check for both: global event form and current workflow form
      let eventForm = this.$refs.eventForm.validate()
      let workflowForm = this.$refs.workflow.validate()
      if (!eventForm.isValid || !workflowForm.isValid) {
        if (done) done()
        return
      }
      // Merge everything into one object
      let values = _.merge({ steps: this.steps }, eventForm.values)
      if (this.isServiceValid()) {
        // Update the item
        if (this.applyButton === 'Update') {
          this.servicePatch(this.id, values)
        } else {
          // Creation mode => create the item
          this.serviceCreate(values)
        }
      }
      this.$emit('applied')
    }
  },
  data () {
    return {
      steps: [],
      applyButton: 'Create'
    }
  },
  computed: {
    eventSchema () {
      return this.id ? 'events.update' : 'events.create'
    }
  },
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-form'] = loadComponent('form/KForm')
    this.$options.components['k-event-workflow-editor'] = loadComponent('KEventWorkflowEditor')
    if (this.template) {
      this.steps = this.template.steps
    }
    // In this case we are updating an existing object
    this.$on('object-changed', object => {
      this.applyButton = 'Update'
      this.$refs.eventForm.fill(object)
      this.steps = object.steps
    })
  }
}
</script>
