<template lang="pug">
.dm-page.min-h-screen.bg-slate-950.flex.flex-col
  TopNav(title="Direct Messages")

  //- Main Content
  .flex-1.flex.overflow-hidden
    //- Conversations List
    aside.w-80.bg-slate-900.border-r.border-slate-800.overflow-y-auto
      .p-4
        .mb-4
          h2.text-lg.font-semibold.text-white Conversations
          p.text-sm.text-gray-400.mt-1 {{ username }}

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
              .w-10.h-10.flex.items-center.justify-center
                img(
                  v-if="getUserLogo(conv.username)"
                  :src="`${apiBaseUrl}/public/images/${getUserLogo(conv.username)}`"
                  :alt="conv.username"
                  class="w-full h-full object-contain"
                )
                span.text-xl(v-else-if="getUserEmoji(conv.username)") {{ getUserEmoji(conv.username) }}
                .w-10.h-10.rounded-full.bg-slate-700.flex.items-center.justify-center(v-else)
                  span.text-sm.font-medium.text-gray-300 {{ conv.username?.[0]?.toUpperCase() || '?' }}
              .flex-1
                .flex.items-center.gap-1
                  p.font-medium.text-white {{ conv.username }}
                  .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(conv.username)" style="padding: 2px 6px") BOT
                p.text-sm.text-gray-400.truncate {{ conv.lastMessage || 'No messages' }}
              .text-xs.text-gray-400(v-if="conv.unread")
                .w-2.h-2.rounded-full.bg-blue-500

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

      //- Messages
      .flex-1.overflow-y-auto.p-4.space-y-4(ref="messagesContainer")
        .text-center.text-gray-500.text-sm.mb-4(v-if="directMessages.length === 0")
          p No messages yet. Start the conversation!

        .message(
          v-for="(message, index) in directMessages"
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
                  svg.w-3.h-3.text-red-500(v-if="message.status === 'error'" fill="currentColor" viewBox="0 0 20 20")
                    path(fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd")
                  //- Sent indicator (gray check)
                  svg.w-3.h-3.text-gray-400(v-else-if="message.status === 'sent'" fill="currentColor" viewBox="0 0 20 20")
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
        form.flex.space-x-3(@submit.prevent="sendDirectMessage")
          input.input.flex-1(
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
          )
          button.btn.btn-primary(:disabled="!newMessage.trim()" type="submit") Send

    //- No conversation selected
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
        p.text-lg Select a conversation to start messaging
</template>

<script>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useMessagesStore, useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import { useWebSocket } from '../composables/useWebSocket'
import { animate } from 'motion'
import TopNav from '../components/TopNav.vue'

export default {
  name: 'DirectMessages',
  components: {
    TopNav
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
    const messagesContainer = ref(null)

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

          // Scroll if relevant to active conversation
          if (latestMessage.from_username === activeConversation.value ||
              latestMessage.to_username === activeConversation.value) {
            nextTick(() => {
              scrollToBottom()
              animateNewMessage()
            })
          }
        }
      }
    }, { deep: true })

    const selectConversation = (user) => {
      if (!user) return

      activeConversation.value = user

      nextTick(() => {
        scrollToBottom()
      })
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

      nextTick(() => {
        scrollToBottom()
      })

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

    return {
      apiBaseUrl,
      directMessages,
      conversations,
      filteredConversations,
      activeConversation,
      newMessage,
      messagesContainer,
      username,
      selectConversation,
      sendDirectMessage,
      messageOpacity,
      formatTimestamp,
      getUserLogo,
      getUserEmoji,
      isUserBot
    }
  }
}
</script>
