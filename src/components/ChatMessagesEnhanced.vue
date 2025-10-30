<template lang="pug">
.flex.flex-col.h-full
  //- Bulk actions toolbar (shown when messages are selected)
  transition(
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  )
    .bg-slate-800.border-b.border-slate-700.p-3.shadow-lg(v-if="selectedMessages.size > 0")
      .flex.items-center.justify-between
        .flex.items-center.space-x-4
          span.text-sm.text-gray-300 {{ selectedMessages.size }} message{{ selectedMessages.size === 1 ? '' : 's' }} selected
          button.text-xs.text-blue-400.hover_text-blue-300(@click="selectAll") Select All
          button.text-xs.text-gray-400.hover_text-gray-300(@click="clearSelection") Clear

        .flex.items-center.space-x-3
          //- Delete button (admin only)
          button.btn.btn-sm.bg-red-600.hover_bg-red-700.text-white.flex.items-center.space-x-1(
            v-if="isAdmin"
            @click="deleteSelectedMessages"
            :disabled="isDeletingMessages"
          )
            svg.w-4.h-4(fill="none" stroke="currentColor" viewBox="0 0 24 24")
              path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16")
            span Delete

          //- Create conversation button (available to all users)
          button.btn.btn-sm.bg-purple-600.hover_bg-purple-700.text-white.flex.items-center.space-x-1(
            @click="showConversationDialog = true"
          )
            svg.w-4.h-4(fill="none" stroke="currentColor" viewBox="0 0 24 24")
              path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z")
            span Create Conversation

  //- Messages
  .flex-1.overflow-y-auto.p-4.space-y-4#messages-container(ref="messagesContainer" @scroll="handleScroll")
    //- Loading indicator for older messages
    .flex.justify-center.py-4(v-if="isLoadingMore")
      .flex.items-center.space-x-2
        .animate-spin.rounded-full.h-4.w-4.border-b-2.border-white
        span.text-gray-400.text-sm Loading older messages...

    //- No more messages indicator
    .text-center.text-gray-500.text-xs.py-2(v-if="!hasMoreMessages && messages.length > 0")
      p Beginning of conversation

    .text-center.text-gray-500.text-sm.mb-4(v-if="messages.length === 0")
      p {{ emptyMessage }}

    .message.relative.group(
      v-for="(message, index) in messages"
      :key="message.id"
      :data-message-id="message.id"
      :style="{ opacity: messageOpacity(index) }"
      :class="{ 'bg-slate-800/30': selectedMessages.has(message.id) }"
    )
      .flex.items-start.space-x-3(
        :class="message.from_username === currentUsername ? 'flex-row-reverse space-x-reverse' : ''"
      )
        //- Selection checkbox
        .flex-shrink-0.mt-3(v-if="!isDirectMessage")
          input.checkbox(
            type="checkbox"
            :checked="selectedMessages.has(message.id)"
            @change="toggleMessageSelection(message.id)"
            :id="`select-${message.id}`"
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

            //- Individual delete button (show on hover - admin only)
            button.opacity-0.group-hover_opacity-100.transition-opacity.ml-2(
              v-if="isAdmin"
              @click="deleteMessage(message.id)"
              class="text-red-400 hover:text-red-300"
              title="Delete message"
            )
              svg.w-4.h-4(fill="none" stroke="currentColor" viewBox="0 0 24 24")
                path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16")

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

  //- Conversation creation dialog
  transition(
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  )
    .fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50(v-if="showConversationDialog" @click.self="closeConversationDialog")
      .bg-slate-800.rounded-lg.p-6.max-w-md.w-full.mx-4.shadow-xl
        h3.text-lg.font-semibold.text-white.mb-4 Create Conversation

        .space-y-4
          div
            label.block.text-sm.font-medium.text-gray-300.mb-1 Title
            input.input.w-full(
              v-model="conversationForm.title"
              type="text"
              placeholder="Conversation title"
              maxlength="200"
            )

          div
            label.block.text-sm.font-medium.text-gray-300.mb-1 Description
            textarea.input.w-full(
              v-model="conversationForm.description"
              placeholder="Brief description (optional)"
              rows="3"
            )

          .text-sm.text-gray-400
            p Creating conversation with {{ selectedMessages.size }} selected message{{ selectedMessages.size === 1 ? '' : 's' }}

        .flex.justify-end.space-x-3.mt-6
          button.btn.btn-secondary(@click="closeConversationDialog") Cancel
          button.btn.btn-primary(
            @click="createConversation"
            :disabled="!conversationForm.title.trim() || isCreatingConversation"
          )
            span(v-if="!isCreatingConversation") Create
            span(v-else) Creating...
</template>

<script>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useUsersStore, useUnreadStore, useAuthStore, useNotificationStore } from '../stores'
import { animate } from 'motion'
import apiClient from '../api/client'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'ChatMessagesEnhanced',
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
    isLoadingMore: {
      type: Boolean,
      default: false
    },
    hasMoreMessages: {
      type: Boolean,
      default: true
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
    },
    isDirectMessage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'send-message', 'load-more', 'messages-deleted', 'conversation-created'],
  setup(props, { emit }) {
    const usersStore = useUsersStore()
    const unreadStore = useUnreadStore()
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()
    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const messagesContainer = ref(null)
    const markedAsRead = new Set()
    let intersectionObserver = null
    let hasScrolledOnLoad = false

    // Selection state
    const selectedMessages = ref(new Set())
    const isDeletingMessages = ref(false)
    const showConversationDialog = ref(false)
    const isCreatingConversation = ref(false)
    const conversationForm = ref({
      title: '',
      description: ''
    })

    // Check if current user is admin
    const isAdmin = computed(() => {
      return authStore.currentUser?.admin === true || authStore.currentUser?.role === 'admin'
    })

    // Check if user can delete a specific message
    const canDeleteMessage = (message) => {
      // Admins can delete any message
      if (isAdmin.value) return true

      // Users can only delete their own messages
      return message.from_username === props.currentUsername
    }

    // Toggle message selection
    const toggleMessageSelection = (messageId) => {
      if (selectedMessages.value.has(messageId)) {
        selectedMessages.value.delete(messageId)
      } else {
        selectedMessages.value.add(messageId)
      }
      // Trigger reactivity
      selectedMessages.value = new Set(selectedMessages.value)
    }

    // Select all messages
    const selectAll = () => {
      props.messages.forEach(msg => {
        selectedMessages.value.add(msg.id)
      })
      // Trigger reactivity
      selectedMessages.value = new Set(selectedMessages.value)
    }

    // Clear selection
    const clearSelection = () => {
      selectedMessages.value.clear()
      selectedMessages.value = new Set()
    }

    // Delete single message
    const deleteMessage = async (messageId) => {
      const confirmed = await notificationStore.confirmDelete('this message')
      if (!confirmed) return

      try {
        isDeletingMessages.value = true

        await apiClient.deleteAdminMessage(messageId)

        emit('messages-deleted', [messageId])

        // Remove from selection if it was selected
        selectedMessages.value.delete(messageId)
        selectedMessages.value = new Set(selectedMessages.value)

        notificationStore.success('Message deleted successfully')
      } catch (error) {
        console.error('Failed to delete message:', error)
        notificationStore.error(error.message || 'Failed to delete message. Please try again.')
      } finally {
        isDeletingMessages.value = false
      }
    }

    // Delete selected messages
    const deleteSelectedMessages = async () => {
      const count = selectedMessages.value.size
      const confirmed = await notificationStore.confirmDelete(`${count} message${count === 1 ? '' : 's'}`)
      if (!confirmed) return

      try {
        isDeletingMessages.value = true
        const messageIds = Array.from(selectedMessages.value)
        let successCount = 0
        let failedCount = 0

        // Delete messages one by one (could be optimized with batch endpoint)
        const deletePromises = messageIds.map(async (messageId) => {
          try {
            await apiClient.deleteAdminMessage(messageId)
            successCount++
          } catch (error) {
            console.error(`Failed to delete message ${messageId}:`, error)
            failedCount++
          }
        })

        await Promise.all(deletePromises)

        if (successCount > 0) {
          emit('messages-deleted', messageIds.filter((_, index) => index < successCount))
          notificationStore.success(`${successCount} message${successCount === 1 ? '' : 's'} deleted successfully`)
        }

        if (failedCount > 0) {
          notificationStore.warning(`Failed to delete ${failedCount} message${failedCount === 1 ? '' : 's'}`)
        }

        clearSelection()
      } catch (error) {
        console.error('Failed to delete messages:', error)
        notificationStore.error('Failed to delete messages. Please try again.')
      } finally {
        isDeletingMessages.value = false
      }
    }

    // Create conversation from selected messages
    const createConversation = async () => {
      if (!conversationForm.value.title.trim()) return

      try {
        isCreatingConversation.value = true
        const messageIds = Array.from(selectedMessages.value)

        const conversation = await apiClient.createConversation(
          conversationForm.value.title.trim(),
          conversationForm.value.description.trim() || null,
          messageIds
        )

        emit('conversation-created', conversation)

        // Reset form and close dialog
        closeConversationDialog()
        clearSelection()

        // Show success message
        notificationStore.success(`Conversation "${conversation.title}" created successfully!`, 'Conversation Created')
      } catch (error) {
        console.error('Failed to create conversation:', error)
        notificationStore.error('Failed to create conversation. Please try again.')
      } finally {
        isCreatingConversation.value = false
      }
    }

    // Close conversation dialog
    const closeConversationDialog = () => {
      showConversationDialog.value = false
      conversationForm.value = {
        title: '',
        description: ''
      }
    }

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

    // Handle scroll event for infinite scroll
    const handleScroll = () => {
      if (!messagesContainer.value) return
      if (props.isLoadingMore) return // Don't trigger if already loading

      const { scrollTop } = messagesContainer.value
      const threshold = 100 // Load more when within 100px from top

      if (scrollTop < threshold && props.hasMoreMessages) {
        emit('load-more')
      }
    }

    const renderMarkdown = (content) => {
      if (!content) return ''
      try {
        // Strip surrounding backticks if present (both single ` and triple ```)
        let processedContent = content.trim()

        // Check if content looks like markdown (contains markdown syntax)
        const looksLikeMarkdown = (text) => {
          return /#{1,6}\s/.test(text) || /^\s*[*\-+]\s/.test(text) || /^\s*\d+\.\s/.test(text)
        }

        // Remove triple backticks if they wrap markdown
        if (processedContent.startsWith('```') && processedContent.endsWith('```')) {
          const innerContent = processedContent.slice(3, -3).trim()

          // Check for language identifier on the first line
          const firstNewline = innerContent.indexOf('\n')
          let langIdentifier = ''
          let contentWithoutLang = innerContent

          if (firstNewline !== -1 && firstNewline < 20) {
            const firstLine = innerContent.substring(0, firstNewline).trim()
            if (firstLine.length < 20 && !/\s/.test(firstLine)) {
              langIdentifier = firstLine.toLowerCase()
              contentWithoutLang = innerContent.substring(firstNewline + 1).trim()
            }
          }

          // Strip backticks if:
          // 1. Language is "markdown" or "md", OR
          // 2. No language identifier and content looks like markdown
          if (langIdentifier === 'markdown' || langIdentifier === 'md' ||
              (!langIdentifier && looksLikeMarkdown(contentWithoutLang))) {
            processedContent = contentWithoutLang
          }
          // Otherwise leave as-is for marked to handle as code block
        }
        // Remove single backticks if they wrap markdown
        else if (processedContent.startsWith('`') && processedContent.endsWith('`')) {
          const innerContent = processedContent.slice(1, -1).trim()
          if (looksLikeMarkdown(innerContent)) {
            processedContent = innerContent
          }
          // Otherwise leave as-is for marked to handle as inline code
        }

        // Remove common markdown prefix words that people might add
        processedContent = processedContent.replace(/^(markdown|md)\s+/i, '')

        // Add line breaks for inline markdown to render properly
        // Add newline before headers (##, ###, etc.)
        processedContent = processedContent.replace(/\s+(#{1,6})\s+/g, '\n\n$1 ')
        // Add newline before list items (*, -, +, or numbered lists)
        processedContent = processedContent.replace(/\s+([*\-+]|\d+\.)\s+/g, '\n$1 ')

        // Configure marked options
        marked.setOptions({
          breaks: true, // Convert line breaks to <br>
          gfm: true // Enable GitHub Flavored Markdown
        })

        // Parse markdown to HTML
        const rawHtml = marked.parse(processedContent)

        // Sanitize HTML to prevent XSS attacks
        return DOMPurify.sanitize(rawHtml)
      } catch (error) {
        console.error('[ChatMessages] Failed to parse markdown:', error, 'Content:', content)
        // Fallback to plain text if parsing fails
        return content
      }
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
      renderMarkdown,
      handleScroll,
      selectedMessages,
      isDeletingMessages,
      showConversationDialog,
      isCreatingConversation,
      conversationForm,
      isAdmin,
      canDeleteMessage,
      toggleMessageSelection,
      selectAll,
      clearSelection,
      deleteMessage,
      deleteSelectedMessages,
      createConversation,
      closeConversationDialog
    }
  }
}
</script>

<style scoped>
/* Checkbox styling */
.checkbox {
  @apply w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2;
}

/* Button sizes */
.btn-sm {
  @apply px-3 py-1.5 text-sm;
}

/* Selection highlight */
.message.bg-slate-800\/30 {
  background-color: rgba(30, 41, 59, 0.3);
}

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