<template>
  <div class="row justify-center full-width">
    <k-form class="col-10" ref="eventForm" :schema="schema" />
    </br>
    <div v-show="templateId" >
      <p class="col-10 caption text-center">
        <strong>Event workflow</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
      </p>
      <k-event-workflow-form ref="workflowForm" service="event-template-step" class="col-10" :id="id" />
    </div>
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
      default: ''
    }
  },
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    mixins.baseEditor(['eventForm', 'workflowForm']),
    mixins.refsResolver(['eventForm', 'workflowForm'])
  ],
  created () {
    // Load the required components
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-form'] = loadComponent('form/KForm')
    this.$options.components['k-event-workflow-form'] = loadComponent('KEventWorkflowForm')
    this.refresh()
    .then(_ => {
      // Creation mode from a template
      if (this.templateId) {
        this.$api.getService('event-templates')
        .get(this.templateId)
        .then(template => {
          // Set the template as reference values
          this._object = template
          this.fillEditor()
        })
      }
    })
    // Manage return to activity once created/updated
    this.$on('applied', _ => {
      this.$router.push({ 
        name: 'events-activity', 
        params: { contextId: this.contextId, operation: 'current-events' } 
      })
    })
  }
}
</script>
