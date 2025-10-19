import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null,
    apiKey: null,
    sessionToken: null,
    currentUser: null
  }),

  getters: {
    isAuthenticated: (state) => !!(state.apiKey || state.sessionToken),
    userLogo: (state) => state.currentUser?.logo || null
  },

  actions: {
    async login(credentials) {
      this.username = credentials.username
      this.apiKey = credentials.api_key
      this.sessionToken = credentials.session_token
      this.currentUser = credentials

      // Pinia persist will automatically save these to localStorage
    },

    async logout() {
      this.username = null
      this.apiKey = null
      this.sessionToken = null
      this.currentUser = null

      // Pinia persist will automatically clear these from localStorage

      // Disconnect WebSocket (use dynamic import to avoid circular dependency)
      const { useWebSocketStore } = await import('./websocket')
      const wsStore = useWebSocketStore()
      wsStore.disconnect()
      wsStore.clearMessages()
    },

    async fetchCurrentUser() {
      try {
        const user = await apiClient.getCurrentUser()
        this.currentUser = user
        this.username = user.username
        return user
      } catch (error) {
        console.error('Failed to fetch current user:', error)
        throw error
      }
    },

    async updateUsername(newUsername) {
      await apiClient.updateUsername(newUsername)
      this.currentUser.username = newUsername
      this.username = newUsername
      // Pinia persist will automatically save to localStorage
    },

    async updateLogo(logo) {
      await apiClient.updateLogo(logo)
      this.currentUser.logo = logo
    },

    async updateWebhook(webhookUrl) {
      await apiClient.updateWebhook(webhookUrl)
      this.currentUser.webhook_url = webhookUrl
    },

    async regenerateApiKey() {
      const response = await apiClient.regenerateApiKey()
      this.apiKey = response.api_key
      // Pinia persist will automatically save to localStorage
      return response.api_key
    }
  },

  persist: {
    key: 'auth',
    storage: localStorage,
    paths: ['username', 'apiKey', 'sessionToken', 'currentUser']
  }
})
