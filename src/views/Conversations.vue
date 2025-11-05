<template lang="pug">
.conversations-page.min-h-screen.bg-slate-950.flex.flex-col
  TopNav(title="Conversations")

  //- Loading state
  .flex-1.flex.items-center.justify-center(v-if="isLoading")
    .flex.flex-col.items-center.space-y-4
      .animate-spin.rounded-full.h-12.w-12.border-b-2.border-white
      p.text-gray-400 Loading conversations...

  //- Empty state
  .flex-1.flex.items-center.justify-center(v-else-if="conversations.length === 0")
    .text-center.text-gray-500.max-w-md
      svg.w-24.h-24.mx-auto.mb-6.text-gray-600(
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
      h2.text-xl.font-semibold.text-white.mb-2 No Conversations Yet
      p.text-sm.mb-6 Conversations help organize related messages into topics. Select messages in the chat and create your first conversation!
      router-link.btn.btn-primary(to="/chat") Go to Chat

  //- Conversations list
  .flex-1.overflow-y-auto.bg-slate-950(v-else)
    .container.mx-auto.max-w-5xl.p-6
      //- Header with stats
      .mb-8
        .flex.items-center.justify-between.mb-4
          h1.text-2xl.font-bold.text-white Your Conversations
          .text-sm.text-gray-400
            span.font-semibold.text-white {{ conversations.length }}
            |  conversation{{ conversations.length === 1 ? '' : 's' }}

      //- Conversations displayed in full
      .space-y-8
        .conversation-section.bg-slate-900.rounded-lg.border.border-slate-800.overflow-hidden(
          v-for="conversation in sortedConversations"
          :key="conversation.id"
        )
          //- Conversation header
          .bg-slate-800.p-4.border-b.border-slate-700
            .flex.items-start.justify-between
              .flex-1
                .flex.items-center.space-x-3.mb-2
                  h3.text-lg.font-semibold.text-white
                    | {{ conversation.title || 'Untitled Conversation' }}
                  .text-xs.bg-blue-600.text-white.px-2.py-1.rounded
                    | {{ conversation.messages?.length || 0 }} messages
                p.text-sm.text-gray-400(v-if="conversation.description")
                  | {{ conversation.description }}
                .flex.items-center.space-x-4.mt-2.text-xs.text-gray-500
                  span Created {{ formatDate(conversation.created_at) }}
                  span(v-if="conversation.participants?.length")
                    | • {{ conversation.participants.length }} participants

              //- Admin actions
              .flex.items-center.space-x-2(v-if="isAdmin")
                button.p-2.text-gray-400.transition-colors(
                  @click="editConversation(conversation)"
                  class="hover:text-white hover:bg-slate-700 rounded"
                  title="Edit conversation"
                )
                  svg.w-4.h-4(fill="none" stroke="currentColor" viewBox="0 0 24 24")
                    path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z")

                button.p-2.text-red-400.transition-colors(
                  @click="deleteConversation(conversation)"
                  class="hover:text-red-300 hover:bg-red-900/20 rounded"
                  title="Delete conversation"
                )
                  svg.w-4.h-4(fill="none" stroke="currentColor" viewBox="0 0 24 24")
                    path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16")

          //- Messages section
          .p-4.space-y-3.max-h-96.overflow-y-auto.bg-slate-950(
            v-if="conversation.messages && conversation.messages.length > 0"
          )
            .message.relative.group(
              v-for="message in conversation.messages"
              :key="message.id"
            )
              .flex.items-start.space-x-3(
                :class="message.from_username === currentUsername ? 'flex-row-reverse space-x-reverse' : ''"
              )
                //- Avatar with logo/emoji support
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

                //- Message content
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

          //- Loading messages indicator
          .p-8.text-center.text-gray-500(v-else-if="conversation.loadingMessages")
            .animate-spin.rounded-full.h-8.w-8.border-b-2.border-white.mx-auto.mb-2
            p.text-sm Loading messages...

          //- No messages
          .p-8.text-center.text-gray-500(v-else)
            p.text-sm No messages in this conversation

  //- Create/Edit conversation dialog
  transition(
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  )
    .fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50(
      v-if="showEditDialog"
      @click.self="closeEditDialog"
    )
      .bg-slate-800.rounded-lg.p-6.max-w-md.w-full.mx-4.shadow-xl
        h3.text-lg.font-semibold.text-white.mb-4
          | {{ editingConversation ? 'Edit' : 'Create' }} Conversation

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

        .flex.justify-end.space-x-3.mt-6
          button.btn.btn-secondary(@click="closeEditDialog") Cancel
          button.btn.btn-primary(
            @click="saveConversation"
            :disabled="!conversationForm.title.trim() || isSaving"
          )
            span(v-if="!isSaving") {{ editingConversation ? 'Update' : 'Create' }}
            span(v-else) {{ editingConversation ? 'Updating...' : 'Creating...' }}
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useNotificationStore, useUsersStore } from '../stores'
import apiClient from '../api/client'
import TopNav from '../components/TopNav.vue'
import { marked } from 'marked'

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
})

export default {
  name: 'Conversations',
  components: {
    TopNav
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()
    const usersStore = useUsersStore()

    // API Base URL for images
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    // State
    const conversations = ref([])
    const isLoading = ref(true)
    const showCreateDialog = ref(false)
    const showEditDialog = ref(false)
    const editingConversation = ref(null)
    const isSaving = ref(false)
    const selectedMessages = ref([]) // For creating new conversations

    const conversationForm = ref({
      title: '',
      description: ''
    })

    // Get current username for message styling
    const currentUsername = computed(() => authStore.currentUser?.username || '')

    // Check if user is admin
    const isAdmin = computed(() => {
      return authStore.currentUser?.admin === true || authStore.currentUser?.role === 'admin'
    })

    // User helper functions
    const getUserLogo = (username) => {
      return usersStore.getUserLogo(username)
    }

    const getUserEmoji = (username) => {
      return usersStore.getUserEmoji(username)
    }

    const isUserBot = (username) => {
      return usersStore.isUserBot(username)
    }

    // Sort conversations by creation date (newest first)
    const sortedConversations = computed(() => {
      return [...conversations.value].sort((a, b) => {
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateB - dateA
      })
    })

    // Load conversations
    const loadConversations = async () => {
      try {
        isLoading.value = true
        const response = await apiClient.getConversations(100, 0) // Get first 100 conversations

        // Handle both array response and object with conversations array
        if (Array.isArray(response)) {
          conversations.value = response
        } else if (response.conversations) {
          conversations.value = response.conversations
        } else {
          conversations.value = []
        }

        // Fetch additional details for each conversation if needed
        // This could include message previews, participant info, etc.
        await enrichConversations()
      } catch (error) {
        console.error('Failed to load conversations:', error)
        notificationStore.error('Failed to load conversations. Please try again.')
      } finally {
        isLoading.value = false
      }
    }

    // Enrich conversations with additional data
    const enrichConversations = async () => {
      // For each conversation, we need to fetch the full details including messages
      try {
        const enrichedConversations = await Promise.all(
          conversations.value.map(async (conv) => {
            try {
              // Fetch full conversation details
              const details = await apiClient.getConversation(conv.id)

              // The API returns message_ids, not the actual messages
              // We need to fetch each message individually
              let messages = []
              if (details.message_ids && details.message_ids.length > 0) {
                // Only admins can fetch individual messages
                if (isAdmin.value) {
                  // Fetch messages in parallel for better performance
                  const messagePromises = details.message_ids.map(async (messageId) => {
                    try {
                      return await apiClient.getAdminMessage(messageId)
                    } catch (error) {
                      console.error(`Failed to fetch message ${messageId}:`, error)
                      return null
                    }
                  })

                  const fetchedMessages = await Promise.all(messagePromises)
                  messages = fetchedMessages.filter(msg => msg !== null)
                } else {
                  // Non-admins can't fetch individual messages directly
                  // Try to get recent messages and filter by IDs
                  try {
                    // Fetch a large batch of recent messages
                    const recentMessages = await apiClient.getMessages(500, 0)

                    // Filter to find messages that match our IDs
                    if (recentMessages.messages && recentMessages.messages.length > 0) {
                      const messageIdSet = new Set(details.message_ids)
                      messages = recentMessages.messages.filter(msg => messageIdSet.has(msg.id))

                      // Sort messages by timestamp to maintain order
                      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    }

                    // If we couldn't find the messages, show a placeholder
                    if (messages.length === 0) {
                      messages = [{
                        id: 'placeholder',
                        content: `This conversation contains ${details.message_ids?.length || 0} messages. Full content may not be available.`,
                        from_username: 'System',
                        timestamp: new Date().toISOString()
                      }]
                    }
                  } catch (error) {
                    console.error('Failed to fetch recent messages:', error)
                    // Fallback to placeholder
                    messages = [{
                      id: 'placeholder',
                      content: 'Unable to load conversation messages.',
                      from_username: 'System',
                      timestamp: new Date().toISOString()
                    }]
                  }
                }
              }

              const enrichedConv = {
                ...conv,
                ...details,
                messages: messages,
                message_count: messages.length || details.message_ids?.length || 0,
                preview: messages[0]?.content || null,
                participants: extractParticipants(messages)
              }

              return enrichedConv
            } catch (error) {
              console.error(`Failed to enrich conversation ${conv.id}:`, error)
              // Try to at least set empty messages array
              return {
                ...conv,
                messages: [],
                message_count: 0
              }
            }
          })
        )
        conversations.value = enrichedConversations
      } catch (error) {
        console.error('Failed to enrich conversations:', error)
        // Ensure all conversations have messages array
        conversations.value = conversations.value.map(conv => ({
          ...conv,
          messages: conv.messages || []
        }))
      }
    }

    // Extract unique participants from messages
    const extractParticipants = (messages) => {
      const participants = new Set()
      messages.forEach(msg => {
        if (msg.from_username) participants.add(msg.from_username)
        if (msg.to_username) participants.add(msg.to_username)
      })
      return Array.from(participants)
    }

    // View a conversation
    const viewConversation = (conversation) => {
      // Navigate to conversation detail view
      // For now, we'll just show a notification
      notificationStore.info(`Viewing conversation: ${conversation.title || 'Untitled'}`)

      // TODO: Create a conversation detail view and navigate to it
      // router.push({ name: 'ConversationDetail', params: { id: conversation.id } })
    }

    // Edit conversation
    const editConversation = (conversation) => {
      editingConversation.value = conversation
      conversationForm.value = {
        title: conversation.title || '',
        description: conversation.description || ''
      }
      showEditDialog.value = true
    }

    // Delete conversation
    const deleteConversation = async (conversation) => {
      const confirmed = await notificationStore.confirmDelete(
        `conversation "${conversation.title || 'Untitled'}"`
      )
      if (!confirmed) return

      try {
        if (isAdmin.value) {
          await apiClient.deleteAdminConversation(conversation.id)
        } else {
          await apiClient.deleteConversation(conversation.id)
        }

        // Remove from local list
        conversations.value = conversations.value.filter(c => c.id !== conversation.id)

        notificationStore.success('Conversation deleted successfully')
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        notificationStore.error('Failed to delete conversation. Please try again.')
      }
    }

    // Save conversation (create or update)
    const saveConversation = async () => {
      if (!conversationForm.value.title.trim()) return

      try {
        isSaving.value = true

        if (editingConversation.value) {
          // Update existing conversation
          const updated = await apiClient.updateConversation(
            editingConversation.value.id,
            {
              title: conversationForm.value.title.trim(),
              description: conversationForm.value.description.trim() || null
            }
          )

          // Update in local list
          const index = conversations.value.findIndex(c => c.id === editingConversation.value.id)
          if (index !== -1) {
            conversations.value[index] = { ...conversations.value[index], ...updated }
          }

          notificationStore.success('Conversation updated successfully')
        } else {
          // Create new conversation
          const newConversation = await apiClient.createConversation(
            conversationForm.value.title.trim(),
            conversationForm.value.description.trim() || null,
            selectedMessages.value
          )

          conversations.value.unshift(newConversation)
          notificationStore.success('Conversation created successfully')
        }

        closeEditDialog()
      } catch (error) {
        console.error('Failed to save conversation:', error)
        notificationStore.error('Failed to save conversation. Please try again.')
      } finally {
        isSaving.value = false
      }
    }

    // Close edit dialog
    const closeEditDialog = () => {
      showEditDialog.value = false
      editingConversation.value = null
      conversationForm.value = {
        title: '',
        description: ''
      }
    }

    // Format date
    const formatDate = (dateString) => {
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

    // Render markdown content
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
          if (firstNewline > 0) {
            const possibleLang = innerContent.substring(0, firstNewline).trim()
            // If it's a short identifier (likely a language), remove it
            if (possibleLang.length < 20 && !/\s/.test(possibleLang)) {
              processedContent = innerContent.substring(firstNewline + 1).trim()
            } else {
              processedContent = innerContent
            }
          } else {
            processedContent = innerContent
          }

          // Only render as markdown if it actually looks like markdown
          if (looksLikeMarkdown(processedContent)) {
            return marked.parse(processedContent)
          }
          // Otherwise return as plain text
          return processedContent.replace(/\n/g, '<br>')
        }

        // Handle single backtick wrapping
        if (processedContent.startsWith('`') && processedContent.endsWith('`') && processedContent.length > 2) {
          processedContent = processedContent.slice(1, -1)
        }

        // Convert to markdown
        return marked.parse(processedContent)
      } catch (error) {
        console.error('Error rendering markdown:', error)
        return content
      }
    }

    // Format timestamp for messages
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return ''

      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) {
        return 'Just now'
      } else if (diffMins < 60) {
        return `${diffMins}m ago`
      } else if (diffHours < 24) {
        return `${diffHours}h ago`
      } else if (diffDays === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      } else if (diffDays === 1) {
        return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
    }

    onMounted(() => {
      loadConversations()
    })

    return {
      conversations,
      sortedConversations,
      isLoading,
      isAdmin,
      currentUsername,
      showCreateDialog,
      showEditDialog,
      editingConversation,
      isSaving,
      selectedMessages,
      conversationForm,
      viewConversation,
      editConversation,
      deleteConversation,
      saveConversation,
      closeEditDialog,
      formatDate,
      formatTimestamp,
      renderMarkdown,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      apiBaseUrl
    }
  }
}
</script>

<style scoped>
.conversation-card {
  transition: all 0.2s ease;
}

.conversation-card:hover {
  transform: translateY(-2px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-sm {
  @apply px-3 py-1.5 text-sm;
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
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 0.875em;
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
  margin: 0.5em 0;
  opacity: 0.8;
}

.markdown-content :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #93c5fd;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 1em 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: rgba(0, 0, 0, 0.2);
  font-weight: 600;
}
</style>