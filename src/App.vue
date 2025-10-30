<template lang="pug">
.app.min-h-screen
  router-view
  NotificationModal
</template>

<script>
import NotificationModal from './components/NotificationModal.vue'

export default {
  name: 'App',
  components: {
    NotificationModal
  }
}
</script>
