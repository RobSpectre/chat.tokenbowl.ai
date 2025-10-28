import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    ws: null,
    connected: false,
    messages: [],
    reconnectTimeout: null,
    reconnectAttempts: 0,
    maxReconnectDelay: 30000, // Cap at 30 seconds for better responsiveness
    connectionCheckInterval: null
  }),

  getters: {
    isConnected: (state) => state.connected,
    latestMessages: (state) => state.messages,
    connectionStatus: (state) => ({
      connected: state.connected,
      reconnectAttempts: state.reconnectAttempts,
      maxReconnectDelay: state.maxReconnectDelay
    })
  },

  actions: {
    connect() {
      try {
        // Don't reconnect if already connected
        if (this.ws && this.connected) {
          console.log('WebSocket already connected')
          return
        }

        this.ws = apiClient.createWebSocket()

        this.ws.onopen = () => {
          this.connected = true
          this.reconnectAttempts = 0
          console.log('WebSocket connected')

          // Clear any pending reconnection timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
          }
        }

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data)

          // Only add message if we don't already have this ID
          if (message.id && !this.messages.find(m => m.id === message.id)) {
            this.messages.push(message)
          } else if (!message.id) {
            // If message has no ID, add it anyway (shouldn't happen in normal operation)
            this.messages.push(message)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        this.ws.onclose = (event) => {
          this.connected = false
          console.log('WebSocket disconnected:', event.code, event.reason)

          // Clear the WebSocket reference
          this.ws = null

          // Don't reconnect if this was an intentional close (disconnect() was called)
          // Normal close code is 1000, abnormal closures will have different codes
          const wasIntentional = event.code === 1000 && event.wasClean

          if (!wasIntentional) {
            // Always attempt to reconnect with exponential backoff (infinite retries)
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)

            console.log(`Reconnecting in ${delay/1000} seconds... (attempt ${this.reconnectAttempts + 1})`)

            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++
              this.connect()
            }, delay)
          } else {
            console.log('WebSocket closed intentionally, not reconnecting')
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
      }
    },

    sendMessage(content, toUsername = null) {
      if (this.ws && this.connected) {
        this.ws.send(JSON.stringify({
          content,
          to_username: toUsername
        }))
      } else {
        console.warn('Cannot send message: WebSocket not connected')
      }
    },

    disconnect() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval)
        this.connectionCheckInterval = null
      }

      if (this.ws) {
        // Prevent reconnection on manual close
        this.ws.onclose = null
        // Close with code 1000 (normal closure) so onclose knows this was intentional
        this.ws.close(1000, 'User disconnected')
        this.ws = null
        this.connected = false
      }

      this.reconnectAttempts = 0 // Reset attempts
    },

    // Start periodic connection health check
    startConnectionHealthCheck() {
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval)
      }

      this.connectionCheckInterval = setInterval(() => {
        if (!this.connected && !this.reconnectTimeout) {
          console.log('Connection lost and not reconnecting. Attempting to reconnect...')
          this.reconnectAttempts = 0
          this.connect()
        }
      }, 10000) // Check every 10 seconds
    },

    clearMessages() {
      this.messages = []
    },

    // Reset reconnection attempts (useful for manual reconnection)
    resetReconnection() {
      this.reconnectAttempts = 0
    }
  }
})
