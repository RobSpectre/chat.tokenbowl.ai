<template lang="pug">
.dm-page.h-screen.bg-slate-950.flex.flex-col
  TopNav(title="Direct Messages")

  //- Main Content
  .flex-1.flex.overflow-hidden
    //- Conversations List
    aside.w-80.bg-slate-900.border-r.border-slate-800.overflow-y-auto(v-if="filteredConversations.length > 0")
      .p-4
        .mb-4
          h2.text-lg.font-semibold.text-white Conversations ({{ filteredConversations.length }})

        //- Conversation list
        .space-y-2
          .p-3.rounded-lg.cursor-pointer.transition-all(
            v-for="conv in filteredConversations"
            :key="conv.username"
            :class="activeConversation === conv.username ? 'bg-blue-600 border-2 border-blue-500' : 'bg-slate-800'"
            class="hover:bg-slate-700"
            @click="selectConversation(conv.username)"
          )
            .flex.items-center.space-x-3
              .w-12.h-12.flex.items-center.justify-center
                img(
                  v-if="getUserLogo(conv.username)"
                  :src="`${apiBaseUrl}/public/images/${getUserLogo(conv.username)}`"
                  :alt="conv.username"
                  class="w-full h-full object-contain"
                )
                span.text-2xl(v-else-if="getUserEmoji(conv.username)") {{ getUserEmoji(conv.username) }}
                .w-12.h-12.rounded-full.bg-slate-700.flex.items-center.justify-center(v-else)
                  span.text-lg.font-medium.text-gray-300 {{ conv.username?.[0]?.toUpperCase() || '?' }}
              .flex-1
                .flex.items-center.gap-2
                  p.font-medium.text-white {{ conv.username }}
                  .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(conv.username)" style="padding: 2px 6px") BOT

    //- Messages Area
    main.flex-1.flex.flex-col.overflow-hidden.bg-slate-950(v-if="activeConversation")
      //- Conversation Header
      .bg-slate-900.border-b.border-slate-800.p-4
        .flex.items-center.space-x-3
          .w-12.h-12.flex.items-center.justify-center
            img(
              v-if="getUserLogo(activeConversation)"
              :src="`${apiBaseUrl}/public/images/${getUserLogo(activeConversation)}`"
              :alt="activeConversation"
              class="w-full h-full object-contain"
            )
            span.text-2xl(v-else-if="getUserEmoji(activeConversation)") {{ getUserEmoji(activeConversation) }}
            .w-12.h-12.rounded-full.bg-slate-700.flex.items-center.justify-center(v-else)
              span.font-medium.text-gray-300 {{ activeConversation?.[0]?.toUpperCase() || '?' }}
          .flex-1
            .flex.items-center.gap-2
              h3.text-lg.font-semibold.text-white {{ activeConversation }}
              .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(activeConversation)" style="padding: 2px 6px") BOT
            p.text-sm.text-gray-400 Direct Message

      .flex-1.flex.flex-col.overflow-hidden
        ChatMessagesEnhanced(
          :messages="directMessages"
          :currentUsername="username"
          v-model="newMessage"
          :enableReadReceipts="true"
          :isLoadingMore="isLoadingMore"
          :hasMoreMessages="hasMoreMessages"
          :isDirectMessage="true"
          @send-message="sendDirectMessage"
          @load-more="loadMoreMessages"
          @messages-deleted="handleMessagesDeleted"
          @conversation-created="handleConversationCreated"
        )

    //- No conversation selected or no conversations at all
    .flex-1.flex.items-center.justify-center.bg-slate-950(v-else)
      .text-center.text-gray-500
        svg.w-16.h-16.mx-auto.mb-4(
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        )
          path(
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          )
        p.text-lg(v-if="filteredConversations.length > 0") Select a conversation to start messaging
        p.text-lg(v-else) No direct message conversations yet
        p.text-sm.text-gray-600.mt-2(v-if="filteredConversations.length === 0") Start a conversation from the main chat
</template>

<script>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useMessagesStore, useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import TopNav from '../components/TopNav.vue'
import ChatMessagesEnhanced from '../components/ChatMessagesEnhanced.vue'

export default {
  name: 'DirectMessages',
  components: {
    TopNav,
    ChatMessagesEnhanced
  },
  setup() {
    const route = useRoute()
    const messagesStore = useMessagesStore()
    const usersStore = useUsersStore()
    const { username } = useAuth()
    const { connected, connect, sendMessage: wsSendMessage, messages: wsMessages, disconnect } = useWebSocket()

    const { conversations } = storeToRefs(messagesStore)

    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const activeConversation = ref(null)
    const newMessage = ref('')

    // Pagination state for infinite scroll
    const isLoadingMore = ref(false)
    const hasMoreMessages = ref(true)
    const messageOffset = ref(0)
    const PAGE_SIZE = 50

    // Computed property to filter conversations excluding logged in user and bots
    const filteredConversations = computed(() =>
      conversations.value.filter(conv =>
        conv.username !== username.value && !isUserBot(conv.username)
      )
    )

    // Computed property to get messages for active conversation
    const directMessages = computed(() =>
      activeConversation.value
        ? messagesStore.getConversationMessages(activeConversation.value)
        : []
    )

    // Load more messages for infinite scroll
    const loadMoreMessages = async () => {
      if (isLoadingMore.value || !hasMoreMessages.value || !activeConversation.value) return

      isLoadingMore.value = true
      try {
        // Load more direct messages with pagination
        const messages = await messagesStore.loadDirectMessages(PAGE_SIZE, messageOffset.value)

        // Since loadDirectMessages groups by conversation, we need to check
        // if we got new messages for the current conversation
        const conversationMessages = messagesStore.getConversationMessages(activeConversation.value)

        if (messages.length < PAGE_SIZE) {
          hasMoreMessages.value = false
        }

        messageOffset.value += messages.length
      } catch (error) {
        console.error('Failed to load more messages:', error)
      } finally {
        isLoadingMore.value = false
      }
    }

    onMounted(async () => {
      // Connect to WebSocket
      connect()

      // Load direct messages
      await messagesStore.loadDirectMessages()

      // Check if user is specified in query
      if (route.query.user) {
        selectConversation(route.query.user)
      }
    })

    // Watch for new WebSocket messages
    watch(wsMessages, (newMessages) => {
      if (newMessages.length > 0) {
        const latestMessage = newMessages[newMessages.length - 1]

        // Only process direct messages
        if (latestMessage.message_type === 'direct') {
          // Check if this is a confirmation of our sent message
          const currentMessages = messagesStore.getConversationMessages(activeConversation.value)
          const optimisticMessage = currentMessages.find(
            m => m.id.toString().startsWith('temp-') &&
                 m.content === latestMessage.content &&
                 m.from_username === latestMessage.from_username &&
                 m.to_username === latestMessage.to_username
          )

          if (optimisticMessage) {
            // Mark as delivered
            latestMessage.status = 'delivered'
          }

          // Add message to store
          messagesStore.addDirectMessage(latestMessage, username.value)

          // No need to scroll, ChatMessages component handles it
        }
      }
    }, { deep: true })

    const selectConversation = (user) => {
      if (!user) return
      activeConversation.value = user
      // Reset pagination state when switching conversations
      messageOffset.value = 0
      hasMoreMessages.value = true
    }

    const sendDirectMessage = async () => {
      if (!newMessage.value.trim() || !activeConversation.value) return

      const content = newMessage.value
      newMessage.value = ''

      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        from_username: username.value,
        to_username: activeConversation.value,
        timestamp: new Date().toISOString(),
        message_type: 'direct',
        status: 'sent'
      }

      // Add to store immediately for optimistic UI
      messagesStore.addDirectMessage(optimisticMessage, username.value)

      try {
        if (connected.value) {
          wsSendMessage(content, activeConversation.value)
        }
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

    // Handle message deletion
    const handleMessagesDeleted = (messageIds) => {
      // Remove deleted messages from the store
      messagesStore.conversations = messagesStore.conversations.map(conv => {
        if (conv.username === activeConversation.value) {
          return {
            ...conv,
            messages: conv.messages?.filter(msg => !messageIds.includes(msg.id)) || []
          }
        }
        return conv
      })

      // Adjust offset
      messageOffset.value = Math.max(0, messageOffset.value - messageIds.length)

      // Show success feedback
      console.log(`Deleted ${messageIds.length} message(s)`)
    }

    // Handle conversation creation
    const handleConversationCreated = (conversation) => {
      console.log('Conversation created from direct messages:', conversation)
      // Optionally, navigate to a conversations view or show a toast
    }

    return {
      apiBaseUrl,
      directMessages,
      conversations,
      filteredConversations,
      activeConversation,
      newMessage,
      username,
      selectConversation,
      sendDirectMessage,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      isLoadingMore,
      hasMoreMessages,
      loadMoreMessages,
      handleMessagesDeleted,
      handleConversationCreated
    }
  }
}
</script>
