<template>
  <k-item v-bind="$props" :itemActions="actions.pane" @item-selected="onItemSelected">
    <q-item-side slot="item-icon" :icon="icon.name" :color="icon.color"></q-item-side>
  </k-item>
</template>

<script>
import { mixins } from '@kalisio/kdk-core/client'
import { QItemSide } from 'quasar'

export default {
  name: 'k-event-template-item',
  mixins: [ mixins.baseItem ],
  components: {
    QItemSide
  },
  computed: {
    icon () {
      return this.item.icon
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-item'] = this.$load('collection/KItem')
  }
}
</script>
