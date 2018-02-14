<template>
  <div>
    <template v-for="org in items">
      <q-list :key="org._id" no-border>
        <q-item>
          <q-item-side><avatar :username="org.name" :size="24" /></q-item-side>
          <q-item-main :label="org.name" />
        </q-item>
        <q-item>
          <q-item-main>
            <k-grid service="events" :renderer="renderer" :contextId="org._id" />
          </q-item-main>
        </q-item>
      </q-list>
    </template>
  </div>
</template>

<script>
import { QList, QItem, QItemMain, QItemSide } from 'quasar'
import { mixins } from 'kCore/client'
import Avatar from 'vue-avatar/dist/Avatar'

export default {
  name: 'k-event-dashboard',
  components: {
    QList,
    QItem,
    QItemMain,
    QItemSide,
    Avatar
  },
  mixins: [
    mixins.baseActivity,
    mixins.baseCollection
  ],
  data () {
    return {
      renderer: { 
        component: 'KEventCard', 
        props: {
          options: {
          }
        } 
      }
    }
  },
  methods: {
     loadService () {
      return this.$api.getService('organisations')
    },
    getCollectionBaseQuery () {
      return {}
    },
    refreshActivity () {
      this.clearActivity()
      this.setTitle('Dashboard')
      this.refreshCollection()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-grid'] = this.$load('collection/KGrid')
  }
}
</script>