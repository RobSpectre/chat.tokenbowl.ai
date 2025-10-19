<template lang="pug">
header.bg-gradient-to-r.from-slate-900.via-slate-800.to-slate-900.border-b-4.border-blue-600.sticky.top-0.z-40
  .container.mx-auto.px-4.py-3
    .flex.justify-between.items-center
      .flex.items-center.space-x-3
        router-link(to="/chat" class="cursor-pointer")
          img.h-12.w-12.object-contain(src="/images/transparent_logo.png" alt="Token Bowl")
        .flex.items-center.gap-2
          h1.text-2xl.font-black.text-white.uppercase.tracking-tight {{ title }}
          .w-2.h-2.rounded-full(v-if="showConnectionStatus" :class="isConnected ? 'bg-green-500' : 'bg-red-500'")

      .flex.items-center.space-x-2
        router-link.p-2.rounded-lg.transition-colors.relative(
          to="/direct-messages"
          title="Direct Messages"
          class="hover:bg-slate-700"
        )
          EnvelopeIcon.w-6.h-6.text-gray-300
          .absolute.-top-1.-right-1.bg-blue-600.text-white.text-xs.font-bold.rounded-full.w-5.h-5.flex.items-center.justify-center(v-if="unreadDirectMessages > 0") {{ unreadDirectMessages > 9 ? '9+' : unreadDirectMessages }}
        router-link.p-2.rounded-lg.transition-colors(
          v-if="currentUser?.admin"
          to="/admin"
          title="Admin"
          class="hover:bg-slate-700"
        )
          ShieldCheckIcon.w-6.h-6.text-yellow-400
        router-link.p-2.rounded-lg.transition-colors(
          to="/settings"
          title="Settings"
          class="hover:bg-slate-700"
        )
          Cog6ToothIcon.w-6.h-6.text-gray-300
        button.p-2.rounded-lg.transition-colors.text-red-400(
          @click="handleLogout"
          title="Logout"
          class="hover:bg-slate-700"
        )
          ArrowRightOnRectangleIcon.w-6.h-6
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { EnvelopeIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline'
import apiClient from '../api/client'

export default {
  name: 'TopNav',
  components: {
    EnvelopeIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon
  },
  props: {
    title: {
      type: String,
      required: true
    },
    showConnectionStatus: {
      type: Boolean,
      default: false
    },
    isConnected: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const router = useRouter()
    const { logout, currentUser } = useAuth()
    const unreadDirectMessages = ref(0)
    let unreadPollInterval = null

    const handleLogout = () => {
      logout()
      router.push('/login')
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await apiClient.getUnreadCount()
        unreadDirectMessages.value = response.unread_direct_messages
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    onMounted(() => {
      // Fetch unread count immediately
      fetchUnreadCount()

      // Poll for unread count every 30 seconds
      unreadPollInterval = setInterval(fetchUnreadCount, 30000)
    })

    onUnmounted(() => {
      if (unreadPollInterval) {
        clearInterval(unreadPollInterval)
      }
    })

    return {
      handleLogout,
      unreadDirectMessages,
      currentUser
    }
  }
}
</script>
