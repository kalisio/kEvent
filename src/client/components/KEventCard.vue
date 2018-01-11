<template>
  <k-card v-bind="$props">
    <q-icon v-if="!isCoordinator" slot="card-icon" :name="userState.icon" />
    <div slot="card-content">
    </div>
  </k-card>
</template>

<script>
import _ from 'lodash'
import { mixins as kCoreMixins } from 'kCore/client'
import { QIcon } from 'quasar'

export default {
  name: 'k-event-card',
  mixins: [kCoreMixins.baseItem],
  components: {
    QIcon
  },
  computed: {
    isCoordinator () {
      const user = this.$store.get('user')
      return _.find(this.item.coordinators, coordinatorId => coordinatorId === user._id)
    }
  },
  data () {
    return {
      userState: {
        icon: 'edit'
      }
    }
  },
  methods: {
  },
  created () {
    // Load the required components
    this.$options.components['k-card'] = this.$load('collection/KCard')
  }
}
</script>
