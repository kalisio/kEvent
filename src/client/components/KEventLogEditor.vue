<template>
  <k-modal ref="modal" :title="title" :toolbar="toolbar" :buttons="buttons" :route="router ? true : false" >
    <div slot="modal-content">
      <k-form ref="form" :schema="schema"/>
    </div>
  </k-modal>
</template>

<script>
import _ from 'lodash'
import sift from 'sift'
import { mixins as kCoreMixins } from 'kCore/client'
import mixins from '../mixins'

export default {
  name: 'k-event-card',
  mixins: [
    kCoreMixins.service,
    kCoreMixins.schemaProxy,
    kCoreMixins.refsResolver(['form']),
    mixins.eventLogs
  ],
  props: {
    id: {
      type: String,
      required: true
    },
    logId: {
      type: String,
      required: true
    },
    router: {
      type: Object,
      default: () => { return null }
    }
  },
  computed: {
    title () {
      return this.step.title ? this.step.title : 'Enter your choice'
    }
  },
  data () {
    return {
      step: {},
      toolbar: [{ 
        name: 'close', 
        icon: 'close', 
        handler: () => this.$refs.modal.close()
      }],
      buttons: [{
        name: 'Save',
        color: 'primary',
        handler: (event, done) => this.logCoordinatorState(event, done),
      }]
    }
  },
  methods: {
    loadService () {
      return this._service = this.$api.getService('event-logs', this.contextId)
    },
    getSchemaName () {
      return 'event-logs.create'
    },
    loadSchema () {
      // Call super
      return kCoreMixins.schemaProxy.methods.loadSchema.call(this)
      .then(schema => {
        // Start from schema template and clone it because it will be shared by all cards
        this.schema = this.generateSchemaForStep(this.step, schema)
        return this.schema
      })
    },
    async refresh () {
      this.refreshUser()
      if (this.userId) {
        // We can then load the schema and local refs in parallel
        await Promise.all([
          this.loadSchema(),
          this.loadRefs()
        ])
        await this.$refs.form.build()
      }
    },
    async logCoordinatorState (event, done) {
      await this.logStep(this.$refs.form, this.step, this.state)
      done()
    }
  },
  async created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Retrieve source log/event
    this.state = await this.loadService().get(this.logId)
    this.event = await this.$api.getService('events', this.contextId).get(this.id)
    this.step = this.getWorkflowStep(this.state)
    this.refresh()
  }
}
</script>
