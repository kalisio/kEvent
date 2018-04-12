<template>
  <div>
    <template v-for="org in items">
      <q-list :key="org._id" inset-separator no-border>
        <q-item>
          <q-item-side><avatar :username="org.name" :size="40" /></q-item-side>
          <q-item-main>
            <span class="organisation-title">{{org.name}}</span>
          </q-item-main>
        </q-item>
        <q-item>
          <q-item-main>
            <k-grid service="events" :renderer="renderer" :contextId="org._id" :filter-query="searchQuery" />
          </q-item-main>
        </q-item>
      </q-list>
    </template>
  </div>
</template>

<script>
import { QList, QItem, QItemMain, QItemSide, QItemSeparator } from 'quasar'
import { mixins as kCoreMixins } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'
import { Avatar } from 'vue-avatar'

export default {
  name: 'k-event-dashboard',
  components: {
    QList,
    QItem,
    QItemMain,
    QItemSide,
    QItemSeparator,
    Avatar
  },
  mixins: [
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    kMapMixins.geolocation
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
      this.setTitle(this.$t('KEventDashboard.DASHBOARD'))
      this.setSearchBar('name')
      this.refreshCollection()
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-grid'] = this.$load('collection/KGrid')
  }
}
</script>

<style>
.organisation-title {
  font-size: 18px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 2rem
}
</style>