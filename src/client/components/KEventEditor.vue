<template>
  <div class="row justify-center full-width">
    <k-form class="col-10" ref="eventForm" :schema="eventSchema" @form-ready="fillEventForm"/>
    </br>
    <p class="col-10 caption text-center">
      <strong>Event workflow</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
    </p>
    <k-event-workflow-editor ref="workflowForm" class="col-10" :id="id" />
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
    templateId: {
      type: String,
      required: true
    }
  },
  mixins: [mixins.service, mixins.objectProxy],
  methods: {
    fillEventForm () {
      if (this.$refs.eventForm && this.$refs.eventForm.isReady && this.getObject()) {
        this.$refs.templateForm.fill(this.getObject())
      }
    },
    fillWorkflowForm () {
      if (this.$refs.workflowForm && this.getObject()) {
        this.$refs.workflowForm.fill(this.getObject().steps)
      }
    },
    apply (event, done) {
      // check for both: global event form and current workflow form
      let eventForm = this.$refs.eventForm.validate()
      let workflowForm = this.$refs.workflowForm.validate()
      if (!eventForm.isValid || !workflowForm.isValid) {
        if (done) done()
        return
      }
      // Merge everything into one object
      let values = _.merge({ steps: workflowForm.steps }, eventForm.values)
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
    // Creation mode from a template
    if (this.templateId) {
      this.$api.getService('event-templates')
      .get(this.templateId)
      .then(template => {
        // Set the template as the target object
        this.setObject(template)
      })
    }
    // In this case we are updating an existing object
    this.$on('object-changed', object => {
      this.applyButton = 'Update'
      this.fillEventForm()
      this.fillWorkflowForm()
    })
  }
}
</script>
