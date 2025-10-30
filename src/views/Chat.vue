<template lang="pug">
.chat-page.h-screen.bg-slate-950.flex.flex-col
  TopNav(
    title="Token Bowl Chat"
    :showConnectionStatus="true"
    :isConnected="connected"
  )

  //- Main Content - Full Width Chat
  .flex-1.flex.flex-col.overflow-hidden.bg-slate-950
    ChatMessages(
      :messages="messages"
      :currentUsername="username"
      v-model="newMessage"
      :disabled="!connected"
      :enableReadReceipts="true"
      :isLoadingMore="isLoadingMore"
      :hasMoreMessages="hasMoreMessages"
      @send-message="sendMessage"
      @load-more="loadMoreMessages"
    )
</template>

<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useMessagesStore, useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import TopNav from '../components/TopNav.vue'
import ChatMessages from '../components/ChatMessages.vue'

export default {
  name: 'Chat',
  components: {
    TopNav,
    ChatMessages
  },
  setup() {
    const messagesStore = useMessagesStore()
    const usersStore = useUsersStore()
    const { username, currentUser } = useAuth()
    const { connected, connect, sendMessage: wsSendMessage, messages: wsMessages } = useWebSocket()

    const newMessage = ref('')
    let userPollInterval = null

    // Pagination state
    const isLoadingMore = ref(false)
    const hasMoreMessages = ref(true)
    const messageOffset = ref(0)
    const PAGE_SIZE = 50

    // Computed property to filter out invalid messages and ensure chronological order
    const validMessages = computed(() =>
      messagesStore.getPublicMessages.filter(msg => msg && msg.from_username && msg.content !== undefined)
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

    onMounted(async () => {
      // Load initial messages from REST API
      await loadMoreMessages()

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

    return {
      messages: validMessages,
      newMessage,
      connected,
      username,
      sendMessage,
      isLoadingMore,
      hasMoreMessages,
      loadMoreMessages
    }
  }
}
</script>
