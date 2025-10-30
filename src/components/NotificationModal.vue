<template lang="pug">
//- Notification container
.fixed.top-4.right-4.z-50.space-y-2.pointer-events-none(v-if="notifications.length > 0")
  transition-group(
    name="notification"
    tag="div"
    @before-enter="beforeEnter"
    @enter="enter"
    @leave="leave"
  )
    .notification.pointer-events-auto(
      v-for="notification in notifications"
      :key="notification.id"
      :class="[notificationClasses(notification.type)]"
      class="min-w-[300px] max-w-md p-4 rounded-lg shadow-xl flex items-start space-x-3 transform transition-all duration-300"
    )
      //- Icon
      .flex-shrink-0
        //- Success icon
        svg.w-6.h-6(v-if="notification.type === 'success'" fill="currentColor" viewBox="0 0 20 20")
          path(fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd")

        //- Error icon
        svg.w-6.h-6(v-else-if="notification.type === 'error'" fill="currentColor" viewBox="0 0 20 20")
          path(fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd")

        //- Warning icon
        svg.w-6.h-6(v-else-if="notification.type === 'warning'" fill="currentColor" viewBox="0 0 20 20")
          path(fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd")

        //- Info icon
        svg.w-6.h-6(v-else fill="currentColor" viewBox="0 0 20 20")
          path(fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd")

      //- Content
      .flex-1
        h4.font-semibold.text-sm(v-if="notification.title") {{ notification.title }}
        p.text-sm(:class="notification.title ? 'mt-1' : ''") {{ notification.message }}

      //- Close button
      button.flex-shrink-0.ml-2.text-white.opacity-70.hover_opacity-100.transition-opacity(
        @click="removeNotification(notification.id)"
      )
        svg.w-4.h-4(fill="currentColor" viewBox="0 0 20 20")
          path(fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd")

//- Confirmation Modal
transition(
  enter-active-class="transition-opacity duration-200 ease-out"
  enter-from-class="opacity-0"
  enter-to-class="opacity-100"
  leave-active-class="transition-opacity duration-200 ease-in"
  leave-from-class="opacity-100"
  leave-to-class="opacity-0"
)
  .fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50(
    v-if="confirmDialog"
    @click.self="cancelConfirm"
  )
    .bg-slate-800.rounded-lg.p-6.max-w-md.w-full.mx-4.shadow-xl.transform.transition-all(
      :class="confirmDialog ? 'scale-100' : 'scale-95'"
    )
      .flex.items-start.space-x-3.mb-4
        //- Warning icon for destructive actions
        svg.w-6.h-6.text-yellow-500.flex-shrink-0(
          v-if="confirmDialog.type === 'warning'"
          fill="currentColor"
          viewBox="0 0 20 20"
        )
          path(fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd")

        //- Question icon for regular confirmations
        svg.w-6.h-6.text-blue-500.flex-shrink-0(
          v-else
          fill="currentColor"
          viewBox="0 0 20 20"
        )
          path(fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd")

        .flex-1
          h3.text-lg.font-semibold.text-white {{ confirmDialog.title }}
          p.text-sm.text-gray-300.mt-1 {{ confirmDialog.message }}

      .flex.justify-end.space-x-3
        button.btn.btn-secondary(@click="cancelConfirm") {{ confirmDialog.cancelText || 'Cancel' }}
        button.btn(
          @click="proceedConfirm"
          :class="confirmDialog.type === 'warning' ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'"
        ) {{ confirmDialog.confirmText || 'Confirm' }}
</template>

<script>
import { ref } from 'vue'
import { useNotificationStore } from '../stores/notification'
import { storeToRefs } from 'pinia'

export default {
  name: 'NotificationModal',
  setup() {
    const notificationStore = useNotificationStore()
    const { notifications, confirmDialog } = storeToRefs(notificationStore)

    const notificationClasses = (type) => {
      switch (type) {
        case 'success':
          return 'bg-green-600 text-white'
        case 'error':
          return 'bg-red-600 text-white'
        case 'warning':
          return 'bg-yellow-600 text-white'
        case 'info':
        default:
          return 'bg-blue-600 text-white'
      }
    }

    const removeNotification = (id) => {
      notificationStore.removeNotification(id)
    }

    const cancelConfirm = () => {
      notificationStore.cancelConfirmation()
    }

    const proceedConfirm = () => {
      notificationStore.proceedConfirmation()
    }

    // Animation helpers
    const beforeEnter = (el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateX(100%)'
    }

    const enter = (el, done) => {
      el.offsetHeight // trigger reflow
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s, transform 0.3s'
        el.style.opacity = '1'
        el.style.transform = 'translateX(0)'
        done()
      }, 10)
    }

    const leave = (el, done) => {
      el.style.transition = 'opacity 0.3s, transform 0.3s'
      el.style.opacity = '0'
      el.style.transform = 'translateX(100%)'
      setTimeout(done, 300)
    }

    return {
      notifications,
      confirmDialog,
      notificationClasses,
      removeNotification,
      cancelConfirm,
      proceedConfirm,
      beforeEnter,
      enter,
      leave
    }
  }
}
</script>

<style scoped>
/* Notification transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>