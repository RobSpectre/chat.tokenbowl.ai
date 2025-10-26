<template lang="pug">
.flex.flex-col.h-full
  //- Messages
  .flex-1.overflow-y-auto.p-4.space-y-4#messages-container(ref="messagesContainer")
    .text-center.text-gray-500.text-sm.mb-4(v-if="messages.length === 0")
      p {{ emptyMessage }}

    .message(
      v-for="(message, index) in messages"
      :key="message.id"
      :data-message-id="message.id"
      :style="{ opacity: messageOpacity(index) }"
    )
      .flex.items-start.space-x-3(
        :class="message.from_username === currentUsername ? 'flex-row-reverse space-x-reverse' : ''"
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
            :class="message.from_username === currentUsername ? 'justify-end' : ''"
          )
            span.text-sm.font-medium.text-white {{ message.from_username }}
            .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(message.from_username)" style="padding: 2px 6px") BOT
            span.text-xs.text-gray-500 {{ formatTimestamp(message.timestamp) }}

          .p-3.rounded-lg.relative(
            :class="message.from_username === currentUsername ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-gray-200'"
          )
            .text-sm.break-words.markdown-content(v-html="renderMarkdown(message.content)")
            //- Message status indicator (only for sent messages)
            .absolute.bottom-1.right-2.flex.items-center.space-x-1(v-if="message.from_username === currentUsername")
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
    form.flex.space-x-3(@submit.prevent="$emit('send-message')")
      input.input.flex-1(
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
      )
      button.btn.btn-primary(:disabled="disabled || !modelValue.trim()" type="submit") Send
</template>

<script>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useUsersStore, useUnreadStore } from '../stores'
import { animate } from 'motion'
import apiClient from '../api/client'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'ChatMessages',
  props: {
    messages: {
      type: Array,
      required: true
    },
    currentUsername: {
      type: String,
      required: true
    },
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Type your message...'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    emptyMessage: {
      type: String,
      default: 'No messages yet. Start the conversation!'
    },
    enableReadReceipts: {
      type: Boolean,
      default: false
    },
    autoScroll: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'send-message'],
  setup(props, { emit }) {
    const usersStore = useUsersStore()
    const unreadStore = useUnreadStore()
    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const messagesContainer = ref(null)
    const markedAsRead = new Set()
    let intersectionObserver = null
    let hasScrolledOnLoad = false

    // Mark message as read when visible
    const markMessageAsRead = async (messageId) => {
      if (!props.enableReadReceipts) return
      if (markedAsRead.has(messageId)) return

      const message = props.messages.find(m => m.id === messageId)
      if (!message) return
      if (message.from_username === props.currentUsername) return
      if (messageId.toString().startsWith('temp-')) return

      try {
        await apiClient.markMessageAsRead(messageId)
        markedAsRead.add(messageId)

        // Refresh unread count after marking message as read
        unreadStore.fetchUnreadCount()
      } catch (error) {
        console.error('Failed to mark message as read:', error)
      }
    }

    // Setup intersection observer to detect visible messages
    const setupIntersectionObserver = () => {
      if (!props.enableReadReceipts) return

      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const messageId = entry.target.getAttribute('data-message-id')
              if (messageId) {
                markMessageAsRead(messageId)
              }
            }
          })
        },
        {
          root: messagesContainer.value,
          threshold: 0.5
        }
      )

      nextTick(() => {
        const messageElements = messagesContainer.value?.querySelectorAll('.message[data-message-id]')
        messageElements?.forEach((el) => {
          intersectionObserver.observe(el)
        })
      })
    }

    // Check if user is scrolled to bottom (within 100px threshold)
    const isScrolledToBottom = () => {
      if (!messagesContainer.value) return true

      const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
      const threshold = 100
      return scrollHeight - scrollTop - clientHeight < threshold
    }

    const scrollToBottom = (force = false) => {
      if (!messagesContainer.value) return

      // Only auto-scroll if user is already at bottom, or if forced
      if (force || (props.autoScroll && isScrolledToBottom())) {
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

    // Watch for initial messages load to scroll to bottom
    watch(() => props.messages.length, (newLength, oldLength) => {
      if (newLength > 0 && !hasScrolledOnLoad) {
        hasScrolledOnLoad = true
        nextTick(() => {
          scrollToBottom(true)
          setupIntersectionObserver()
        })
      } else if (newLength > oldLength) {
        // New message added
        nextTick(() => {
          scrollToBottom()
          animateNewMessage()
          setupIntersectionObserver()
        })
      }
    })

    onMounted(() => {
      if (props.messages.length > 0) {
        nextTick(() => {
          scrollToBottom(true)
          setupIntersectionObserver()
        })
      }
    })

    onUnmounted(() => {
      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }
    })

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
      return usersStore.getUserLogo(username)
    }

    const getUserEmoji = (username) => {
      return usersStore.getUserEmoji(username)
    }

    const isUserBot = (username) => {
      return usersStore.isUserBot(username)
    }

    const renderMarkdown = (content) => {
      if (!content) return ''

      // Configure marked options
      marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true // Enable GitHub Flavored Markdown
      })

      // Parse markdown to HTML
      const rawHtml = marked.parse(content)

      // Sanitize HTML to prevent XSS attacks
      return DOMPurify.sanitize(rawHtml)
    }

    return {
      apiBaseUrl,
      messagesContainer,
      messageOpacity,
      formatTimestamp,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      scrollToBottom,
      renderMarkdown
    }
  }
}
</script>

<style scoped>
/* Custom scrollbar styling for messages container */
#messages-container::-webkit-scrollbar {
  width: 8px;
}

#messages-container::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 4px;
}

#messages-container::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
  border-radius: 4px;
  transition: background 0.2s ease;
}

#messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.7);
}

/* Firefox scrollbar styling */
#messages-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) rgba(15, 23, 42, 0.3);
}

/* Markdown content styling */
.markdown-content {
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 600;
  margin-top: 0.75em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.15em;
}

.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-size: 1em;
}

.markdown-content :deep(p) {
  margin: 0.5em 0;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(strong) {
  font-weight: 700;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', Courier, monospace;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.75em 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.75em 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 0.85em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid rgba(255, 255, 255, 0.3);
  padding-left: 1em;
  margin: 0.75em 0;
  font-style: italic;
  opacity: 0.9;
}

.markdown-content :deep(a) {
  color: inherit;
  text-decoration: underline;
  opacity: 0.9;
}

.markdown-content :deep(a:hover) {
  opacity: 1;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 1em 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  font-weight: 600;
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
