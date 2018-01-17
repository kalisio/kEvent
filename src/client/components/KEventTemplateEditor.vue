<template>
  <k-modal ref="modal" title="New event template" :toolbar="toolbar" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="templateForm" :schema="schema" />
      </br>
      <p class="col-10 caption text-center">
        <strong>Event workflow for this template</strong>: you can manage below the different steps each participant of the event might be able to fulfill.
      </p>
      <k-event-workflow-form ref="workflowForm" schemaName="event-workflow" :id="id" />
    </div>
  </k-modal>
</template>

<script>
import { mixins } from 'kCore/client'

export default {
  name: 'k-event-template-editor',
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    mixins.baseEditor(['templateForm', 'workflowForm']),
    mixins.refsResolver(['templateForm', 'workflowForm'])
  ],
  data () {
    return {
      toolbar: [
        { name: 'Close', icon: 'close', handler: () => this.doClose() }
      ],
      buttons: [
        { name: 'Create', color: 'primary', handler: (event, done) => this.apply(event, done) }
      ],
    }
  },
  methods: {
    doClose () {
      this.$refs.modal.close(_ => this.$router.push({ name: 'event-templates-activity' }))
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-event-workflow-form'] = this.$load('KEventWorkflowForm')
    this.refresh()
    this.$on('applied', this.doClose)
  },
  beforeDestroy() {
    this.$off('applied', this.doClose)
  }
}
</script>
