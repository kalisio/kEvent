<template>
  <div class="row justify-center full-width">
    <k-form class="col-10" ref="templateForm" :schema="schema" />
    </br>
    <p class="col-10 caption text-center">
      <strong>Event workflow for this template</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
    </p>
    <k-event-workflow-form ref="workflowForm" service="event-template-step" class="col-10" :id="id" />
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
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    mixins.baseEditor(['templateForm', 'workflowForm']),
    mixins.refsResolver(['templateForm', 'workflowForm'])
  ],
  created () {
    // Load the required components
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-event-workflow-form'] = this.$load('KEventWorkflowForm')
    this.refresh()
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
