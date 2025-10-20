import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useUnreadStore = defineStore('unread', {
  state: () => ({
    unreadDirectMessages: 0,
    consecutiveErrors: 0,
    maxConsecutiveErrors: 3
  }),

  actions: {
    async fetchUnreadCount() {
      try {
        const response = await apiClient.getUnreadCount()
        this.unreadDirectMessages = response.unread_direct_messages
        this.consecutiveErrors = 0 // Reset error count on success
        return response
      } catch (error) {
        this.consecutiveErrors++

        // Only log the first few errors to avoid console spam
        if (this.consecutiveErrors <= this.maxConsecutiveErrors) {
          console.warn(`Failed to fetch unread count (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error.message)

          if (this.consecutiveErrors === this.maxConsecutiveErrors) {
            console.warn('Suppressing further unread count errors. Backend may be unavailable.')
          }
        }

        // Don't throw - let the polling continue silently
        return null
      }
    },

    decrementUnreadCount() {
      if (this.unreadDirectMessages > 0) {
        this.unreadDirectMessages--
      }
    }
  }
})
