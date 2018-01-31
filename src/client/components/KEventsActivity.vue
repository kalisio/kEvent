<template>
  <div>
    <!-- 
      Events collection
     -->
    <k-grid service="events" :base-query="baseQuery" :renderer="renderer" :contextId="contextId" />
    <!-- 
      Router view to enable routing to modals
     -->
    <router-view service="events" :router="router()"></router-view>
  </div>
</template>

<script>
import { Store, mixins as kCoreMixins } from 'kCore/client'
import { mixins as kMapMixins } from 'kMap/client'

export default {
  name: 'k-events-activity',
  mixins: [kCoreMixins.baseActivity, kMapMixins.geolocation],
  props: {
    contextId: {
      type: String,
      default: ''
    }
  },
  computed: {
    baseQuery () {
      return {}
    }
  },
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
    router () {
      return { 
        onApply: { name: 'events-activity', params: { contextId: this.contextId } },
        onDismiss: { name: 'events-activity', params: { contextId: this.contextId } }
      }
    },
    refreshActivity () {
      this.clearActivity()
      this.setTitle(this.$store.get('context.name'))
      // Tabbar actions
      this.registerTabAction({ 
        name: 'events', label: 'Events', icon: 'whatshot',
        route: { name: 'events-activity', params: { contextId: this.contextId } },
        default: true
      })
      if (this.$can('create', 'event-templatess', this.contextId)) {
        this.registerTabAction({ 
          name: 'event-templates', label: 'Templates', icon: 'widgets',
          route: { name: 'event-templates-activity', params: { contextId: this.contextId } } 
        })
      }
      // Fab actions
      if (this.$can('create', 'events', this.contextId)) {
        const eventTemplatesService = this.$api.getService('event-templates')
        eventTemplatesService.find({ $select: ["name", "icon"] })
        .then(templates => {
          templates.data.forEach(template => {
            this.registerFabAction({ 
              name: 'create-' + template.name, label: template.name, icon: template.icon.name, 
              route: { name: 'create-event', params: { contextId: this.contextId, templateId: template._id } }
            })
          })
        })
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-grid'] = this.$load('collection/KGrid')
  }
}
</script>
