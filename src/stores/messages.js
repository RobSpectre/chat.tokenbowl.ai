import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    publicMessages: [],
    directMessages: [],
    conversations: [],
    userLogos: {}
  }),

  getters: {
    getPublicMessages: (state) => state.publicMessages,
    getDirectMessages: (state) => state.directMessages,
    getConversations: (state) => state.conversations,
    getUserLogo: (state) => (username) => state.userLogos[username] || null,

    getConversationMessages: (state) => (username) => {
      const conversation = state.conversations.find(c => c.username === username)
      return conversation?.messages || []
    }
  },

  actions: {
    async loadPublicMessages(limit = 100, offset = 0) {
      try {
        const response = await apiClient.getMessages(limit, offset)
        this.publicMessages = response.messages

        // Extract user logos from messages
        response.messages.forEach(msg => {
          if (msg.from_username && msg.from_user_logo) {
            this.userLogos[msg.from_username] = msg.from_user_logo
          }
        })

        return response.messages
      } catch (error) {
        console.error('Failed to load public messages:', error)
        throw error
      }
    },

    async loadDirectMessages(limit = 100, offset = 0) {
      try {
        const response = await apiClient.getDirectMessages(limit, offset)
        const messages = response.messages

        // Group messages by conversation
        const convMap = {}

        // Get current username from auth store
        const { useAuthStore } = await import('./auth')
        const authStore = useAuthStore()
        const currentUsername = authStore.username

        messages.forEach(msg => {
          const otherUser = msg.from_username === currentUsername
            ? msg.to_username
            : msg.from_username

          if (!convMap[otherUser]) {
            convMap[otherUser] = {
              username: otherUser,
              lastMessage: msg.content,
              timestamp: msg.timestamp,
              messages: []
            }
          }

          convMap[otherUser].messages.push(msg)

          // Update last message if more recent
          if (new Date(msg.timestamp) > new Date(convMap[otherUser].timestamp)) {
            convMap[otherUser].lastMessage = msg.content
            convMap[otherUser].timestamp = msg.timestamp
          }

          // Extract user logos
          if (msg.from_username && msg.from_user_logo) {
            this.userLogos[msg.from_username] = msg.from_user_logo
          }
        })

        this.conversations = Object.values(convMap).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )

        return messages
      } catch (error) {
        console.error('Failed to load direct messages:', error)
        throw error
      }
    },

    async addPublicMessage(message) {
      // Skip messages with missing critical fields
      if (!message || !message.from_username || message.content === undefined) {
        console.warn('Skipping message with missing fields:', message)
        return
      }

      // Check if this is a real message that matches a temporary optimistic message
      if (message.id && !message.id.toString().startsWith('temp-')) {
        // Look for a matching temp message (same content and username)
        const tempMsgIndex = this.publicMessages.findIndex(
          m => m.id.toString().startsWith('temp-') &&
               m.content === message.content &&
               m.from_username === message.from_username
        )

        if (tempMsgIndex !== -1) {
          // Replace the temp message with the real one using splice for proper reactivity
          this.publicMessages.splice(tempMsgIndex, 1, message)
        } else if (!this.publicMessages.find(m => m.id === message.id)) {
          // No temp message found, add as new message
          this.publicMessages.push(message)
        }
      } else {
        // This is a temp message or doesn't have an ID
        if (!this.publicMessages.find(m => m.id === message.id)) {
          this.publicMessages.push(message)
        }
      }

      // Extract user logo
      if (message.from_username && message.from_user_logo) {
        this.userLogos[message.from_username] = message.from_user_logo
      }

      // Load user profile if we don't have it
      if (message.from_username) {
        const { useUsersStore } = await import('./users')
        const usersStore = useUsersStore()
        usersStore.loadUserProfiles([message.from_username])
      }
    },

    async addDirectMessage(message, currentUsername) {
      const otherUser = message.from_username === currentUsername
        ? message.to_username
        : message.from_username

      // Find or create conversation
      let conversation = this.conversations.find(c => c.username === otherUser)

      if (!conversation) {
        conversation = {
          username: otherUser,
          lastMessage: message.content,
          timestamp: message.timestamp,
          messages: []
        }
        this.conversations.unshift(conversation)
      }

      // Add message if it doesn't exist
      if (!conversation.messages.find(m => m.id === message.id)) {
        conversation.messages.push(message)
        conversation.lastMessage = message.content
        conversation.timestamp = message.timestamp

        // Move conversation to top
        this.conversations = [
          conversation,
          ...this.conversations.filter(c => c.username !== otherUser)
        ]
      }

      // Extract user logo
      if (message.from_username && message.from_user_logo) {
        this.userLogos[message.from_username] = message.from_user_logo
      }

      // Load user profiles if we don't have them
      const { useUsersStore } = await import('./users')
      const usersStore = useUsersStore()
      const usernamesToLoad = [message.from_username, message.to_username].filter(Boolean)
      usersStore.loadUserProfiles(usernamesToLoad)
    },

    updateMessageStatus(tempId, realMessage) {
      // Find and replace optimistic message with real one
      const index = this.directMessages.findIndex(m => m.id === tempId)
      if (index !== -1) {
        this.directMessages[index] = realMessage
      }

      // Also update in conversations
      this.conversations.forEach(conv => {
        const msgIndex = conv.messages.findIndex(m => m.id === tempId)
        if (msgIndex !== -1) {
          conv.messages[msgIndex] = realMessage
        }
      })
    },

    clearMessages() {
      this.publicMessages = []
      this.directMessages = []
      this.conversations = []
      this.userLogos = {}
    }
  },

  persist: {
    key: 'messages',
    storage: localStorage,
    paths: ['conversations', 'userLogos'],
    // Custom serializer to exclude temp messages from persistence
    serializer: {
      serialize: (state) => {
        const filtered = { ...state }
        // Don't persist publicMessages at all - always fetch fresh from server
        delete filtered.publicMessages
        delete filtered.directMessages
        return JSON.stringify(filtered)
      },
      deserialize: (value) => {
        return JSON.parse(value)
      }
    }
  }
})
