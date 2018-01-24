<template>
  <k-modal ref="modal" :title="editorTitle" :toolbar="toolbar" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="templateForm" :schema="schema" />
      </br>
      <p class="col-10 caption pull-left">
        <q-toggle icon="fa-retweet" v-model="hasWorkflow" @change="onWorkflow"/>
        <strong v-show="!hasWorkflow">Add a workflow to this template</strong>
        <strong v-show="hasWorkflow">Workflow</strong>
        <span v-show="hasWorkflow">: manage below the different steps each participant of the event will have to fulfill.</span>
      </p>
      <k-event-workflow-form v-show="hasWorkflow" ref="workflowForm" schemaName="event-workflow" :id="id" />
    </div>
  </k-modal>
</template>

<script>
import lodash from 'lodash'
import { QToggle } from 'quasar'
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
  components: { QToggle },
  computed: {
    buttons () {
      return [
        { name: this.applyButton, color: 'primary', handler: (event, done) => this.apply(event, done) }
      ]
    }
  },
  data () {
    return {
      hasWorkflow: false,
      toolbar: [
        { name: 'Close', icon: 'close', handler: () => this.doClose() }
      ]
    }
  },
  methods: {
    onWorkflow (hasWorkflow) {
      // Activate workflow form accordingly
      this.setFormDisabled('workflowForm', !hasWorkflow)
    },
    doClose () {
      this.$refs.modal.close(_ => this.$router.push({ name: 'event-templates-activity' }))
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-event-workflow-form'] = this.$load('KEventWorkflowForm')
    // Default state
    this.refresh().then(_ => {
      // In edition mode activate workflow according to its existence
      if (this.id) {
        this.hasWorkflow = !lodash.isNil(this.getObject().workflow)
        this.setFormDisabled('workflowForm', !this.hasWorkflow)
      } else {
        // In creation mode disabled by default
        this.setFormDisabled('workflowForm', true)
      }
    })
    this.$on('applied', this.doClose)
  },
  beforeDestroy() {
    this.$off('applied', this.doClose)
  }
}
</script>
