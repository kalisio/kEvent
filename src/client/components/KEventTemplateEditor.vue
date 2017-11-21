<template>
  <div class="row justify-center full-width">
    <k-form class="col-10" ref="templateForm" :schema="templateSchema"/>
    </br>
    <p class="col-10 caption text-center">
      <strong>Event workflow for this template</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
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
  name: 'k-event-template-editor',
  components: {
    QBtn
  },
  mixins: [mixins.service, mixins.objectProxy],
  methods: {
    apply (event, done) {
      // check for both: global template form and current workflow form
      let templateForm = this.$refs.templateForm.validate()
      let workflowForm = this.$refs.workflow.validate()
      if (!templateForm.isValid || !workflowForm.isValid) {
        done()
        return
      }
      // Merge everything into one object
      let values = _.merge({ steps: this.steps }, templateForm.values)
      if (this.isServiceValid()) {
        // Update the item
        if (this.applyButton === 'Update') {
          this.servicePatch(this.id, values)
          .then(_ => done())
        } else {
          // Creation mode => create the item
          this.serviceCreate(values)
          .then(_ => done())
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
    templateSchema () {
      return this.id ? 'event-templates.update' : 'event-templates.create'
    }
  },
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-form'] = loadComponent('form/KForm')
    this.$options.components['k-event-workflow-editor'] = loadComponent('KEventWorkflowEditor')
    // In this case we are updating an existing object
    this.$on('object-changed', object => {
      this.applyButton = 'Update'
      this.$refs.templateForm.fill(object)
      this.steps = object.steps
    })
  }
}
</script>
