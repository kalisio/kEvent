<template>
  <k-modal title="New event" :toolbar="toolbar" :buttons="buttons">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="eventForm" :schema="schema" />
      </br>
      <p class="col-10 caption text-center">
        <strong>Event workflow</strong>: you can manage below the different steps each actor of the event might be able to fulfill.
      </p>
      <k-event-workflow-form ref="workflowForm" schemaName="event-template-step" :id="id" />
    </div>
  </k-modal>
</template>

<script>
import { mixins } from 'kCore/client'

export default {
  name: 'k-event-editor',
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    mixins.baseEditor(['eventForm', 'workflowForm']),
    mixins.refsResolver(['eventForm', 'workflowForm'])
  ],
  props: {
    templateId: {
      type: String,
      default: ''
    }
  },
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
      this.$router.push({ name: 'events-activity' })
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-event-workflow-form'] = this.$load('KEventWorkflowForm')
    this.refresh()
    .then(_ => {
      console.log(this.templateId)
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
    this.$on('applied', _ => this.doClose())
  }
}
</script>
