<template lang="pug">
.chat-page.min-h-screen.bg-slate-950.flex.flex-col
  TopNav(
    title="Token Bowl Chat"
    :showConnectionStatus="true"
    :isConnected="connected"
  )

  //- Main Content
  .flex-1.flex.overflow-hidden
    //- Sidebar - Online Users
    aside.w-64.bg-slate-900.border-r.border-slate-800.overflow-y-auto.hidden(class="lg:block")
      .p-4
        h2.text-lg.font-semibold.text-white.mb-4 All Users ({{ allUsers.length }})
        .space-y-2
          .flex.items-center.space-x-3.p-2.rounded-lg.cursor-pointer(
            v-for="user in allUsers"
            :key="user.username"
            @click="startDirectMessage(user.username)"
            class="hover:bg-slate-800 transition-colors"
          )
            .relative
              .w-10.h-10.flex.items-center.justify-center
                img(
                  v-if="user.logo"
                  :src="`${apiBaseUrl}/public/images/${user.logo}`"
                  :alt="user.username"
                  class="w-full h-full object-contain"
                )
                span.text-xl(v-else-if="user.emoji") {{ user.emoji }}
                .w-10.h-10.rounded-full.bg-slate-700.flex.items-center.justify-center(v-else)
                  span.text-sm.font-medium.text-gray-300 {{ user.username?.[0]?.toUpperCase() || '?' }}
              .absolute.bottom-0.right-0.w-3.h-3.rounded-full.border-2.border-slate-900(:class="isUserOnline(user.username) ? 'bg-green-500' : 'bg-red-500'")
            .flex-1
              .flex.items-center.gap-1
                span.text-sm.font-medium(:class="isUserOnline(user.username) ? 'text-white' : 'text-gray-400'") {{ user.username }}
                .text-xs.bg-purple-600.text-white.rounded(v-if="user.bot" style="padding: 2px 6px") BOT

    //- Chat Area
    main.flex-1.flex.flex-col.overflow-hidden.bg-slate-950
      //- Messages
      .flex-1.overflow-y-auto.p-4.space-y-4#messages-container(ref="messagesContainer")
        .text-center.text-gray-500.text-sm.mb-4(v-if="messages.length === 0")
          p No messages yet. Start the conversation!

        .message(
          v-for="(message, index) in messages"
          :key="message.id"
          :style="{ opacity: messageOpacity(index) }"
        )
          .flex.items-start.space-x-3(
            :class="message.from_username === username ? 'flex-row-reverse space-x-reverse' : ''"
          )
            .w-10.h-10.flex.items-center.justify-center.flex-shrink-0
              img(
                v-if="getUserLogo(message.from_username)"
                :src="`${apiBaseUrl}/public/images/${getUserLogo(message.from_username)}`"
                :alt="message.from_username"
                class="w-full h-full object-contain"
              )
              span.text-xl(v-else-if="getUserEmoji(message.from_username)") {{ getUserEmoji(message.from_username) }}
              .w-10.h-10.rounded-full.bg-slate-700.flex.items-center.justify-center(v-else)
                span.text-sm.font-medium.text-gray-300 {{ message.from_username?.[0]?.toUpperCase() || '?' }}

            .flex-1.max-w-2xl
              .flex.items-center.space-x-2.mb-1(
                :class="message.from_username === username ? 'justify-end' : ''"
              )
                span.text-sm.font-medium.text-white {{ message.from_username }}
                .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(message.from_username)" style="padding: 2px 6px") BOT
                span.text-xs.text-gray-500 {{ formatTimestamp(message.timestamp) }}

              .p-3.rounded-lg.relative(
                :class="message.from_username === username ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-gray-200'"
              )
                p.text-sm.whitespace-pre-wrap.break-words {{ message.content }}
                //- Message status indicator (only for sent messages)
                .absolute.bottom-1.right-2.flex.items-center.space-x-1(v-if="message.from_username === username")
                  //- Error indicator
                  svg.w-3.h-3.text-red-300(v-if="message.status === 'error'" fill="currentColor" viewBox="0 0 20 20")
                    path(fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd")
                  //- Sent indicator (gray check)
                  svg.w-3.h-3.text-gray-300(v-else-if="message.status === 'sent'" fill="currentColor" viewBox="0 0 20 20")
                    path(fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd")
                  //- Delivered indicator (single white check)
                  svg.w-3.h-3.text-white(v-else-if="message.status === 'delivered'" fill="currentColor" viewBox="0 0 20 20")
                    path(fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd")
                  //- Read indicator (double white check)
                  template(v-else-if="message.status === 'read'")
                    svg.w-3.h-3.text-white(fill="currentColor" viewBox="0 0 20 20" style="margin-left: -6px;")
                      path(fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd")
                    svg.w-3.h-3.text-white(fill="currentColor" viewBox="0 0 20 20" style="margin-left: -6px;")
                      path(fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd")

      //- Message Input
      .bg-slate-900.border-t.border-slate-800.p-4
        form.flex.space-x-3(@submit.prevent="sendMessage")
          input.input.flex-1(
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            :disabled="!connected"
          )
          button.btn.btn-primary(:disabled="!connected || !newMessage.trim()" type="submit") Send
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMessagesStore, useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import { animate } from 'motion'
import TopNav from '../components/TopNav.vue'

export default {
  name: 'Chat',
  components: {
    TopNav
  },
  setup() {
    const router = useRouter()
    const messagesStore = useMessagesStore()
    const usersStore = useUsersStore()
    const { username } = useAuth()
    const { connected, connect, sendMessage: wsSendMessage, messages: wsMessages, disconnect } = useWebSocket()

    const { publicMessages, userLogos } = storeToRefs(messagesStore)
    const { allUsers, onlineUsers } = storeToRefs(usersStore)

    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const newMessage = ref('')
    const messagesContainer = ref(null)

    // Computed property to filter users excluding current user and bots
    const filteredUsers = computed(() =>
      usersStore.getUsersExcludingCurrent(username.value).filter(user => !user.bot)
    )

    onMounted(async () => {
      // Load initial messages from REST API
      await messagesStore.loadPublicMessages()

      // Load users
      await usersStore.loadUsers()

      // Connect to WebSocket for real-time updates
      connect()

      // Poll for online users every 30 seconds
      const interval = setInterval(() => usersStore.loadUsers(), 30000)

      onUnmounted(() => {
        clearInterval(interval)
        // Note: WebSocket is now shared across components and won't auto-disconnect
      })

      nextTick(() => {
        scrollToBottom()
      })
    })

    // Watch for new WebSocket messages
    watch(wsMessages, (newMessages) => {
      if (newMessages.length > 0) {
        const latestMessage = newMessages[newMessages.length - 1]

        // Only process public messages
        if (!latestMessage.message_type || latestMessage.message_type === 'public') {
          // Set default status to 'delivered' for messages from server
          if (!latestMessage.status) {
            latestMessage.status = 'delivered'
          }

          messagesStore.addPublicMessage(latestMessage)

          nextTick(() => {
            scrollToBottom()
            animateNewMessage()
          })
        }
      }
    }, { deep: true })

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !connected.value) return

      const content = newMessage.value
      newMessage.value = ''

      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        from_username: username.value,
        to_username: null,
        timestamp: new Date().toISOString(),
        message_type: 'public',
        status: 'sent'
      }

      // Add to store immediately for optimistic UI
      messagesStore.addPublicMessage(optimisticMessage)

      nextTick(() => {
        scrollToBottom()
      })

      try {
        wsSendMessage(content)
      } catch (err) {
        console.error('Failed to send message:', err)
        // Set error status
        optimisticMessage.status = 'error'
      }
    }

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    const animateNewMessage = () => {
      const lastMessage = messagesContainer.value?.lastElementChild
      if (lastMessage) {
        animate(
          lastMessage,
          { opacity: [0, 1], y: [20, 0] },
          { duration: 0.3, easing: 'ease-out' }
        )
      }
    }

    const messageOpacity = (index) => {
      return 1
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return ''

      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return ''

      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      if (isToday) {
        return time
      } else {
        const day = date.getDate()
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        return `${day} ${month}, ${time}`
      }
    }

    const getUserLogo = (username) => {
      // Try users store first (more reliable), fallback to messages store
      return usersStore.getUserLogo(username) || messagesStore.getUserLogo(username)
    }

    const getUserEmoji = (username) => {
      return usersStore.getUserEmoji(username)
    }

    const isUserBot = (username) => {
      return usersStore.isUserBot(username)
    }

    const startDirectMessage = (user) => {
      router.push({
        name: 'DirectMessages',
        query: { user }
      })
    }

    const isUserOnline = (user) => {
      return usersStore.isUserOnline(user)
    }

    return {
      apiBaseUrl,
      messages: publicMessages,
      newMessage,
      onlineUsers,
      allUsers: filteredUsers,
      connected,
      messagesContainer,
      username,
      sendMessage,
      messageOpacity,
      formatTimestamp,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      startDirectMessage,
      isUserOnline
    }
  }
}
</script>
