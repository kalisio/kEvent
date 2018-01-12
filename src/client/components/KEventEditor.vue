<template>
  <k-modal ref="modal" title="New event" :toolbar="toolbar" :buttons="buttons" :route="true">
    <div slot="modal-content" class="column xs-gutter">
      <k-form ref="eventForm" :schema="schema" />
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
    mixins.baseEditor(['eventForm']),
    mixins.refsResolver(['eventForm'])
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
      this.$refs.modal.close(_ => this.$router.push({ name: 'events-activity' }))
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-modal'] = this.$load('frame/KModal')
    this.$options.components['k-form'] = this.$load('form/KForm')
    this.refresh()
    .then(_ => {
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
    this.$on('applied', this.doClose)
  },
  beforeDestroy() {
    this.$off('applied', this.doClose)
  }
}
</script>
