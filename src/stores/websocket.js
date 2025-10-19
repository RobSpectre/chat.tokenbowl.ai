import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    ws: null,
    connected: false,
    messages: [],
    reconnectTimeout: null,
    reconnectAttempts: 0,
    maxReconnectDelay: 300000 // 5 minutes in milliseconds
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
        }

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data)
          this.messages.push(message)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        this.ws.onclose = (event) => {
          this.connected = false
          console.log('WebSocket disconnected', event.code, event.reason)

          // Don't reconnect if this was an intentional close (disconnect() was called)
          // Normal close code is 1000, abnormal closures will have different codes
          const wasIntentional = event.code === 1000 && event.wasClean

          if (!wasIntentional) {
            // Attempt to reconnect with exponential backoff, capped at 5 minutes
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
            this.reconnectAttempts++

            const delaySeconds = (delay / 1000).toFixed(1)
            console.log(`Reconnecting in ${delaySeconds}s... (attempt ${this.reconnectAttempts})`)

            this.reconnectTimeout = setTimeout(() => {
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

      if (this.ws) {
        // Close with code 1000 (normal closure) so onclose knows this was intentional
        this.ws.close(1000, 'User disconnected')
        this.ws = null
        this.connected = false
      }

      this.reconnectAttempts = 0 // Reset attempts
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
