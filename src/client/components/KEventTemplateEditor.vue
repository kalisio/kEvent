<template>
  <k-modal ref="modal" :title="editorTitle" :toolbar="toolbar()" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form :class="{ 'light-dimmed': applyInProgress }" ref="templateForm" :schema="schema" />
      <p :class="{ 'light-dimmed': applyInProgress }" class="col-10 caption pull-left">
        <q-toggle icon="fa-retweet" v-model="hasWorkflow" @input="onWorkflow"/>
        <strong v-show="!hasWorkflow">{{$t('KEventTemplateEditor.ADD_WORKFLOW_LABEL')}}</strong>
        <span v-show="hasWorkflow">{{$t('KEventTemplateEditor.WORKFLOW_HELPER_LABEL')}}</span>
      </p>
      <k-event-workflow-form v-show="hasWorkflow" ref="workflowForm" schemaName="event-workflow" :objectId="objectId" />
      <q-spinner-cube color="primary" class="fixed-center" v-if="applyInProgress" size="4em"/>
    </div>
  </k-modal>
</template>

<script>
import _ from 'lodash'
import { QToggle } from 'quasar'
import { mixins } from '@kalisio/kdk-core/client'

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
  props: {
    templateId: {
      type: String,
      default: ''
    }
  },
  computed: {
    buttons () {
      return [
        { name: 'apply-button', label: this.applyButton, color: 'primary', handler: () => this.apply() }
      ]
    }
  },
  data () {
    return {
      hasWorkflow: false
    }
  },
  methods: {
    toolbar () {
      return [
        { name: 'close-action', label: this.$t('KEventTemplateEditor.CLOSE_ACTION'), icon: 'close', handler: () => this.doClose() }
      ]
    },
    loadObject () {
      // When a template is provided use it as reference for object
      if (this.template) {
        this._object = Object.assign({}, this.template)
        // Remove id so that event has its own
        delete this._object._id
        // Setup hasWorkflow tag
        this._object.hasWorkflow = !_.isNil(this.template.workflow)
        return Promise.resolve(this._object)
      } else if (this.objectId) {
        // Otherwise proceed as usual to load the event object
        return mixins.objectProxy.methods.loadObject.call(this)
      }
    },
    onWorkflow (hasWorkflow) {
      if (this.templateId) {
        if (hasWorkflow) this._object.workflow = this.template.workflow
        else delete this._object.workflow
      }
      // Activate workflow form accordingly
      this.setFormDisabled('workflowForm', !hasWorkflow)
    },
    doClose () {
      this.$refs.modal.close()
      this.$router.push({ name: 'event-templates-activity' })
    },
    async initialize () {
      await this.refresh()
      // In edition mode activate workflow according to its existence
      if (this.objectId || this.templateId) {
        this.hasWorkflow = !_.isNil(this.getObject().workflow)
        this.setFormDisabled('workflowForm', !this.hasWorkflow)
      } else {
        // In creation mode disabled by default
        this.setFormDisabled('workflowForm', true)
      }
    }
  },
  async created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.$options.components['k-event-workflow-form'] = this.$load('KEventWorkflowForm')
    // On creation check whether we copy or create a new template
    if (this.templateId) {
      this.template = await this.$api.getService('event-templates').get(this.templateId)
    }
    this.initialize()
    this.$on('applied', this.doClose)
  },
  beforeDestroy () {
    this.$off('applied', this.doClose)
  }
}
</script>
