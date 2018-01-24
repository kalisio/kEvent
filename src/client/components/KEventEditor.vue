<template>
  <k-modal ref="modal" title="New event" :toolbar="toolbar" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="eventForm" :schema="schema" @field-changed="onFieldChanged" />
    </div>
  </k-modal>
</template>

<script>
import _ from 'lodash'
import { mixins } from 'kCore/client'

export default {
  name: 'k-event-editor',
  mixins: [
    mixins.service,
    mixins.objectProxy,
    mixins.schemaProxy,
    mixins.baseEditor(['eventForm']),
    mixins.refsResolver(['eventForm'])
  ],
  props: {
    templateId: {
      type: String,
      required: true
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
    loadObject () {
      // When a template is provided use it as reference for object
      if (this.template) {
        this._object = Object.assign({}, this.template)
        // Remove id so that event has its own
        delete this._object._id
        // Setup hasWorkflow tag
        this._object.hasWorkflow = _.isNil(this.template.workflow)
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
            delete this.schema.properties.workflow
            _.pull(this.schema.required, 'workflow')
          }
        }
        return this.schema
      })
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
      this.$refs.modal.close(_ => this.$router.push({ name: 'events-activity' }))
    }
  },
  async created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // On creation wait for template first
    if (this.templateId) {
      this.template = await this.$api.getService('event-templates').get(this.templateId)
    }
    this.refresh()
    this.$on('applied', this.doClose)
  },
  beforeDestroy() {
    this.$off('applied', this.doClose)
  }
}
</script>
