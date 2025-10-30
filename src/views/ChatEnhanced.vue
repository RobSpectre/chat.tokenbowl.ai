<template lang="pug">
.chat-page.h-screen.bg-slate-950.flex.flex-col
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
      //- Chat Messages (takes up 60% of vertical space)
      .flex-1.flex.flex-col.overflow-hidden(style="flex: 0 1 60%")
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

      //- Conversations Section (takes up 40% of vertical space)
      .overflow-hidden.border-t.border-slate-800(style="flex: 0 1 40%")
        .h-full.flex.flex-col
          //- Header
          .bg-slate-900.border-b.border-slate-800.px-4.py-3.flex.items-center.justify-between.flex-shrink-0
            .flex.items-center.gap-2
              h2.text-lg.font-semibold.text-white My Conversations
              .text-xs.bg-slate-700.text-gray-300.px-2.py-1.rounded(v-if="userConversations.length > 0")
                | {{ userConversations.length }}
            router-link.text-sm.text-blue-400.hover_text-blue-300(to="/conversations") View All →

          //- Conversations List or Empty State
          .flex-1.overflow-y-auto.p-4
            //- Loading state
            .flex.items-center.justify-center.h-full(v-if="loadingConversations")
              .animate-spin.rounded-full.h-8.w-8.border-b-2.border-white

            //- Empty state
            .flex.items-center.justify-center.h-full.text-center(v-else-if="userConversations.length === 0")
              .text-gray-500.max-w-sm
                svg.w-12.h-12.mx-auto.mb-3.text-gray-600(
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                )
                  path(
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  )
                p.text-sm No conversations yet
                p.text-xs.text-gray-600.mt-1 Select messages above and create one!

            //- Conversations
            .space-y-3(v-else)
              .conversation-card.bg-slate-900.rounded-lg.border.border-slate-800.p-3.cursor-pointer.transition-all(
                v-for="conversation in userConversations"
                :key="conversation.id"
                @click="viewConversationDetail(conversation.id)"
                class="hover:bg-slate-800 hover:border-slate-700"
              )
                .flex.items-start.justify-between
                  .flex-1.min-w-0
                    h3.text-sm.font-semibold.text-white.mb-1.truncate
                      | {{ conversation.title || 'Untitled Conversation' }}
                    p.text-xs.text-gray-400.line-clamp-2(v-if="conversation.description")
                      | {{ conversation.description }}
                    .flex.items-center.gap-2.mt-2.text-xs.text-gray-500
                      span {{ conversation.message_count || 0 }} messages
                      span •
                      span {{ formatConversationDate(conversation.created_at) }}
                  .flex-shrink-0.ml-2
                    .text-xs.bg-blue-600.text-white.px-2.py-1.rounded
                      | {{ conversation.message_count || 0 }}
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMessagesStore, useUsersStore, useAuthStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import apiClient from '../api/client'
import TopNav from '../components/TopNav.vue'
import ChatMessagesEnhanced from '../components/ChatMessagesEnhanced.vue'

export default {
  name: 'ChatEnhanced',
  components: {
    TopNav,
    ChatMessagesEnhanced
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

    // Conversations state
    const userConversations = ref([])
    const loadingConversations = ref(false)

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

      // Show success feedback
      console.log(`Deleted ${messageIds.length} message(s)`)
    }

    // Handle conversation creation
    const handleConversationCreated = (conversation) => {
      console.log('Conversation created:', conversation)

      // Reload conversations list to show the new one
      loadConversations()
    }

    // Load user's conversations
    const loadConversations = async () => {
      try {
        loadingConversations.value = true
        const response = await apiClient.getConversations(10, 0) // Get first 10 conversations

        // Handle both array response and object with conversations array
        if (Array.isArray(response)) {
          userConversations.value = response
        } else if (response.conversations) {
          userConversations.value = response.conversations
        } else {
          userConversations.value = []
        }

        // Sort by creation date (newest first)
        userConversations.value.sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateB - dateA
        })
      } catch (error) {
        console.error('Failed to load conversations:', error)
        userConversations.value = []
      } finally {
        loadingConversations.value = false
      }
    }

    // View conversation detail
    const viewConversationDetail = (conversationId) => {
      router.push({ name: 'Conversations', query: { id: conversationId } })
    }

    // Format conversation date
    const formatConversationDate = (dateString) => {
      if (!dateString) return 'Unknown'

      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return 'Today'
      } else if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks} week${weeks === 1 ? '' : 's'} ago`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} month${months === 1 ? '' : 's'} ago`
      } else {
        return date.toLocaleDateString()
      }
    }

    onMounted(async () => {
      // Load initial messages from REST API
      await loadMoreMessages()

      // Load conversations
      loadConversations()

      // Load users
      await usersStore.loadUsers()

      // Connect to WebSocket for real-time updates
      connect()

      // Start connection health check
      const wsStore = useWebSocket()
      if (wsStore.startConnectionHealthCheck) {
        wsStore.startConnectionHealthCheck()
      }

      // Poll for online users every 30 seconds
      userPollInterval = setInterval(() => usersStore.loadUsers(), 30000)
    })

    onUnmounted(() => {
      if (userPollInterval) {
        clearInterval(userPollInterval)
      }
    })

    // Watch for new WebSocket messages
    watch(wsMessages, (newMessages) => {
      if (newMessages.length > 0) {
        const latestMessage = newMessages[newMessages.length - 1]

        // Only process room messages (public chat)
        if (!latestMessage.message_type || latestMessage.message_type === 'room') {
          // Set default status to 'delivered' for messages from server
          if (!latestMessage.status) {
            latestMessage.status = 'delivered'
          }

          messagesStore.addPublicMessage(latestMessage)
          // Increment offset when new messages arrive via WebSocket
          messageOffset.value++
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
      userConversations,
      loadingConversations,
      viewConversationDetail,
      formatConversationDate,
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

<style scoped>
.conversation-card {
  transition: all 0.2s ease;
}

.conversation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>