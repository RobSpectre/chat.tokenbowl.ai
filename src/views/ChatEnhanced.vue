<template lang="pug">
.chat-page.h-screen.bg-slate-950.flex.flex-col
  TopNav(
    title="Token Bowl Chat"
    :showConnectionStatus="true"
    :isConnected="connected"
  )

  //- WebSocket Debug Component
  WebSocketDebug

  //- Main Content
  .flex-1.flex.overflow-hidden
    //- Sidebar - Online Users
    aside.w-64.bg-slate-900.border-r.border-slate-800.overflow-y-auto.hidden(class="lg:block")
      .p-4
        h2.text-lg.font-semibold.text-white.mb-4 All Users ({{ allUsers.length }})
        .space-y-2
          .flex.items-center.space-x-3.p-2.rounded-lg.cursor-pointer(
            v-for="user in allUsers.filter(u => u.username)"
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
      ChatMessagesEnhanced(
        :messages="messages"
        :currentUsername="username"
        v-model="newMessage"
        :disabled="!connected"
        :enableReadReceipts="true"
        :isLoadingMore="isLoadingMore"
        :hasMoreMessages="hasMoreMessages"
        :isDirectMessage="false"
        @send-message="sendMessage"
        @load-more="loadMoreMessages"
        @messages-deleted="handleMessagesDeleted"
        @conversation-created="handleConversationCreated"
      )
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMessagesStore, useUsersStore, useAuthStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import TopNav from '../components/TopNav.vue'
import ChatMessagesEnhanced from '../components/ChatMessagesEnhanced.vue'
import WebSocketDebug from '../components/WebSocketDebug.vue'

export default {
  name: 'ChatEnhanced',
  components: {
    TopNav,
    ChatMessagesEnhanced,
    WebSocketDebug
  },
  setup() {
    const router = useRouter()
    const messagesStore = useMessagesStore()
    const usersStore = useUsersStore()
    const authStore = useAuthStore()
    const { username, currentUser } = useAuth()
    const { connected, connect, sendMessage: wsSendMessage, messages: wsMessages, disconnect } = useWebSocket()

    const { publicMessages, userLogos } = storeToRefs(messagesStore)
    const { allUsers, onlineUsers } = storeToRefs(usersStore)

    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const newMessage = ref('')
    let userPollInterval = null

    // Pagination state
    const isLoadingMore = ref(false)
    const hasMoreMessages = ref(true)
    const messageOffset = ref(0)
    const PAGE_SIZE = 50

    // Computed property to filter users excluding current user and bots
    const filteredUsers = computed(() =>
      usersStore.getUsersExcludingCurrent(username).filter(user => !user.bot)
    )

    // Computed property to filter out invalid messages
    const validMessages = computed(() =>
      publicMessages.value.filter(msg => msg && msg.from_username && msg.content !== undefined)
    )

    // Load more messages for infinite scroll
    const loadMoreMessages = async () => {
      if (isLoadingMore.value || !hasMoreMessages.value) return

      isLoadingMore.value = true
      try {
        const messages = await messagesStore.loadPublicMessages(PAGE_SIZE, messageOffset.value)

        if (messageOffset.value === 0) {
          // Initial load - replace messages
          messageOffset.value = messages.length
          if (messages.length < PAGE_SIZE) {
            hasMoreMessages.value = false
          }
        } else {
          // Append older messages to the beginning
          messagesStore.publicMessages = [...messages, ...messagesStore.publicMessages]
          messageOffset.value += messages.length

          if (messages.length < PAGE_SIZE) {
            hasMoreMessages.value = false
          }
        }
      } catch (error) {
        console.error('Failed to load more messages:', error)
      } finally {
        isLoadingMore.value = false
      }
    }

    // Handle message deletion
    const handleMessagesDeleted = (messageIds) => {
      // Remove deleted messages from the store
      messagesStore.publicMessages = messagesStore.publicMessages.filter(
        msg => !messageIds.includes(msg.id)
      )

      // Adjust offset
      messageOffset.value = Math.max(0, messageOffset.value - messageIds.length)
    }

    // Handle conversation creation
    const handleConversationCreated = (conversation) => {
      // Conversation created successfully
    }

    onMounted(async () => {
      // Load initial messages from REST API
      await loadMoreMessages()

      // Load users
      await usersStore.loadUsers()

      // Connect to WebSocket for real-time updates
      connect()

      // Poll for online users every 30 seconds
      userPollInterval = setInterval(() => usersStore.loadUsers(), 30000)
    })

    onUnmounted(() => {
      if (userPollInterval) {
        clearInterval(userPollInterval)
      }
    })

    // Keep track of processed message IDs to avoid duplicates
    const processedMessageIds = ref(new Set())

    // Watch for new WebSocket messages
    watch(wsMessages, (newMessages, oldMessages) => {
      // Process all messages that haven't been processed yet
      newMessages.forEach(message => {
        // Skip if we've already processed this message
        if (message.id && processedMessageIds.value.has(message.id)) {
          return
        }

        // Skip read receipts and other non-chat message types
        if (message.type === 'read_receipt') {
          // Could handle read receipts here if needed for UI updates
          console.debug('Received read receipt:', {
            messageId: message.message_id,
            readBy: message.read_by,
            readAt: message.read_at
          })
          if (message.id) processedMessageIds.value.add(message.id)
          return
        }

        // Skip presence updates or other non-chat types
        if (message.type && message.type !== 'message' && message.type !== 'chat') {
          console.debug('Received non-chat message type:', message.type)
          if (message.id) processedMessageIds.value.add(message.id)
          return
        }

        // Log the message for debugging
        console.log('ChatEnhanced: Processing WebSocket message:', message)

        // Only process room messages (public chat) that have required fields
        if (!message.message_type || message.message_type === 'room') {
          // Validate message has required fields before processing
          if (message.from_username && message.content !== undefined) {
            // Set default status to 'delivered' for messages from server
            if (!message.status) {
              message.status = 'delivered'
            }

            messagesStore.addPublicMessage(message)
            // Mark as processed
            if (message.id) processedMessageIds.value.add(message.id)
            // Increment offset when new messages arrive via WebSocket
            messageOffset.value++
            console.log('ChatEnhanced: Added message to store')
          } else {
            // Log incomplete message for debugging but don't process it
            console.debug('Received incomplete chat message from WebSocket:', {
              hasFromUsername: !!message.from_username,
              hasContent: message.content !== undefined,
              messageType: message.message_type,
              type: message.type,
              keys: Object.keys(message)
            })
            if (message.id) processedMessageIds.value.add(message.id)
          }
        }
      })
    }, { deep: true, immediate: true })

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !connected.value) return

      const content = newMessage.value
      newMessage.value = ''

      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        from_username: currentUser.value?.username || username.value,
        to_username: null,
        timestamp: new Date().toISOString(),
        message_type: 'public',
        status: 'sent'
      }

      // Add to store immediately for optimistic UI
      messagesStore.addPublicMessage(optimisticMessage)

      try {
        wsSendMessage(content)
      } catch (err) {
        console.error('Failed to send message:', err)
        // Set error status
        optimisticMessage.status = 'error'
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
      messages: validMessages,
      newMessage,
      onlineUsers,
      allUsers: filteredUsers,
      connected,
      username,
      sendMessage,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      startDirectMessage,
      isUserOnline,
      isLoadingMore,
      hasMoreMessages,
      loadMoreMessages,
      handleMessagesDeleted,
      handleConversationCreated
    }
  }
}
</script>

