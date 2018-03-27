<template>
  <k-modal ref="modal" :title="editorTitle" :toolbar="toolbar()" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="eventForm" :contextId="contextId" :objectId="objectId" :schema="schema" @field-changed="onFieldChanged" />
    </div>
  </k-modal>
</template>

<script>
import _ from 'lodash'
import { mixins } from 'kCore/client'

const editorMixin = mixins.baseEditor(['eventForm'])

export default {
  name: 'k-event-editor',
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    editorMixin,
    mixins.refsResolver(['eventForm'])
  ],
  props: {
    templateId: {
      type: String,
      default: ''
    }
  },
  computed: {
    buttons () {
      return [
        { name: 'apply-button', label: this.applyButton, color: 'primary', handler: (event, done) => this.apply(event, done) }
      ]
    }
  },
  methods: {
    toolbar () {
      return [
        { name: 'close-action', label: this.$t('KEventEditor.CLOSE_ACTION'), icon: 'close', handler: () => this.doClose() }
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
      } else {
        // Otherwise proceed as usual to load the event object
        return mixins.objectProxy.methods.loadObject.call(this)
      }
    },
    loadSchema () {
      // Call super
      return mixins.schemaProxy.methods.loadSchema.call(this)
      .then(schema => {
        // When a template is provided check for workflow availability
        if (this.template) {
          // Start from schema template and clone it because it will be shared by all editors
          this.schema = _.cloneDeep(schema)
          // Remove workflow from schema if not present in template
          if (_.isNil(this.template.workflow)) {
            delete this.schema.properties.hasWorkflow
            _.pull(this.schema.required, 'hasWorkflow')
          }
        }
        return this.schema
      })
    },
    getBaseQuery () {
      // Overriden to handle notification messages
      let query = editorMixin.methods.getBaseQuery.call(this)
      if (this.getMode() === 'create') {
        query.notification = this.$t('KEventNotifications.CREATE')
      } else if (this.getMode() === 'update') {
        query.notification = this.$t('KEventNotifications.UPDATE')
      }
      return query
    },
    onFieldChanged (field, value) {
      // Setup workflow depending on field state
      if (field === 'hasWorkflow') {
        if (value) {
          this._object.workflow = this.template.workflow
        } else {
          delete this._object.workflow
        }
      }
    },
    doClose () {
      this.$refs.modal.close(() => this.$router.push({ name: 'events-activity' }))
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // On creation wait for template first
    if (this.templateId) {
      this.$api.getService('event-templates').get(this.templateId)
      .then(template => {
        this.template = template
        this.refresh()
      })
    }
    else {
      this.refresh()
    }
    this.$on('applied', this.doClose)
  },
  beforeDestroy() {
    this.$off('applied', this.doClose)
  }
}
</script>
