<template>
  <q-page padding>
    <template v-for="org in items">
      <q-list :key="org._id" separator>
        <q-item>
          <q-item-section><q-avatar color="primary" text-color="white" size="40px">{{getInitials(org)}}</q-avatar></q-item-section>
          <q-item-section>{{org.name}}</q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <k-grid service="events" :renderer="renderer" :contextId="org._id" :base-query="baseQuery" :filter-query="searchQuery" :list-strategy="'smart'" />
          </q-item-section>
        </q-item>
      </q-list>
    </template>
  </q-page>
</template>

<script>
import { mixins as kCoreMixins, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import { mixins as kMapMixins } from '@kalisio/kdk-map/client.map'

export default {
  name: 'k-event-dashboard',
  mixins: [
    kCoreMixins.baseActivity,
    kCoreMixins.baseCollection,
    kMapMixins.geolocation
  ],
  data () {
    return {
      baseQuery: {
        $sort: {
          'updatedAt': -1
        }
      },
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
    getInitials (org) {
      return kCoreUtils.getInitials(org.name)
    },
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