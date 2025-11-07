import { defineStore } from 'pinia'
import { Centrifuge } from 'centrifuge'
import apiClient from '../api/client'
import { useUsersStore } from './users'

// Connection promise to ensure only one connection attempt at a time
let connectionPromise = null

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    centrifuge: null,
    roomSubscription: null,
    userSubscription: null,
    connected: false,
    connecting: false, // Flag to prevent concurrent connection attempts
    messages: [],
    reconnectTimeout: null,
    reconnectAttempts: 0,
    maxReconnectDelay: 30000 // Cap at 30 seconds for better responsiveness
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
    async connect() {
      // If already connected, return immediately
      if (this.connected) {
        return
      }

      // If a connection is in progress, return the existing promise
      if (connectionPromise) {
        return connectionPromise
      }

      // Create a new connection promise that all concurrent calls will share
      connectionPromise = this._doConnect()

      try {
        await connectionPromise
      } finally {
        // Clear the promise after completion (success or failure)
        connectionPromise = null
      }
    },

    async _doConnect() {
      // Set flag
      this.connecting = true

      try {
        // Clean up any existing connection before creating a new one
        if (this.centrifuge) {
          // Don't call disconnect() as it resets the connecting flag
          // Instead, manually cleanup
          if (this.roomSubscription) {
            this.roomSubscription.unsubscribe()
            this.roomSubscription.remove()
            this.roomSubscription = null
          }
          if (this.userSubscription) {
            this.userSubscription.unsubscribe()
            this.userSubscription.remove()
            this.userSubscription = null
          }
          this.centrifuge.disconnect()
          this.centrifuge = null
        }

        // Get connection token from server
        const connectionInfo = await apiClient.getCentrifugoConnectionToken()

        // Create Centrifugo client
        this.centrifuge = new Centrifuge(connectionInfo.url, {
          token: connectionInfo.token
        })

        // Set up connection event handlers
        this.centrifuge.on('connected', (ctx) => {
          console.log('WebSocket: Connected to Centrifugo')
          this.connected = true
          this.connecting = false
          this.reconnectAttempts = 0

          // Clear any pending reconnection timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
          }
        })

        this.centrifuge.on('disconnected', (ctx) => {
          this.connected = false
          this.connecting = false
        })

        this.centrifuge.on('error', (ctx) => {
          console.error('Centrifugo error:', ctx)
        })

        // Set up subscriptions
        for (const channel of connectionInfo.channels) {
          const subscription = this.centrifuge.newSubscription(channel)

          subscription.on('publication', (ctx) => {
            const message = ctx.data

            // Skip read receipts - they should be handled separately
            if (message.type === 'read_receipt') {
              // Could emit a separate event for read receipts if needed
              console.debug('WebSocket: Received read receipt for message', message.message_id)
              return
            }

            // Log the incoming message for debugging
            console.log('WebSocket: Received publication on channel', channel, ':', message)

            // Only add message if we don't already have this ID
            if (message.id && !this.messages.find(m => m.id === message.id)) {
              // Use array mutation method to ensure reactivity
              this.messages = [...this.messages, message]
              console.log('WebSocket: Added message to store, total messages:', this.messages.length)
            } else if (!message.id) {
              // If message has no ID, add it anyway (shouldn't happen in normal operation)
              this.messages = [...this.messages, message]
              console.log('WebSocket: Added message without ID to store')
            }
          })

          subscription.on('subscribed', (ctx) => {
            // Subscription successful
            console.log(`WebSocket: Successfully subscribed to channel ${channel}`)

            // Get initial presence state for room channel
            if (channel === 'room:main') {
              subscription.presence().then((ctx) => {
                const presentUsers = Object.keys(ctx.presence || {}).map(clientId => {
                  const info = ctx.presence[clientId]
                  return info.user || clientId
                })

                // Update online users in users store
                const usersStore = useUsersStore()
                usersStore.onlineUsers = presentUsers
                console.log(`WebSocket: Initial presence for ${channel}:`, presentUsers.length, 'users online')
              }).catch((err) => {
                console.warn('WebSocket: Failed to get presence:', err)
              })
            }
          })

          subscription.on('join', (ctx) => {
            // User joined the channel
            const username = ctx.info.user
            if (username && channel === 'room:main') {
              const usersStore = useUsersStore()
              if (!usersStore.onlineUsers.includes(username)) {
                usersStore.onlineUsers = [...usersStore.onlineUsers, username]
                console.log(`WebSocket: User joined: ${username}`)
              }
            }
          })

          subscription.on('leave', (ctx) => {
            // User left the channel
            const username = ctx.info.user
            if (username && channel === 'room:main') {
              const usersStore = useUsersStore()
              usersStore.onlineUsers = usersStore.onlineUsers.filter(u => u !== username)
              console.log(`WebSocket: User left: ${username}`)
            }
          })

          subscription.on('error', (ctx) => {
            // Ignore "already subscribed" errors - they're harmless
            const errorMsg = ctx.error?.message || ctx.message || JSON.stringify(ctx)
            if (errorMsg.includes('already subscribed')) {
              return
            }
            console.error('Subscription error on', channel, ':', ctx)
          })

          // Store subscriptions for cleanup
          if (channel === 'room:main') {
            this.roomSubscription = subscription
          } else if (channel.startsWith('user:')) {
            this.userSubscription = subscription
          }
        }

        // Connect to Centrifugo - this will establish the connection and activate subscriptions
        this.centrifuge.connect()
      } catch (error) {
        console.error('Failed to create Centrifugo connection:', error)
        this.connecting = false // Reset connecting flag on error

        // Retry connection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)

        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++
          // Clear any stale connection promise before reconnecting
          connectionPromise = null
          this.connect()
        }, delay)
      }
    },

    async sendMessage(content, toUsername = null) {
      // With Centrifugo, clients don't publish directly - they use the REST API
      // The server will publish to Centrifugo channels
      try {
        await apiClient.sendMessage(content, toUsername)
      } catch (error) {
        console.error('Failed to send message:', error)
        throw error
      }
    },

    disconnect() {
      // Clear any pending connection promise
      connectionPromise = null

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      // Unsubscribe from channels
      if (this.roomSubscription) {
        this.roomSubscription.unsubscribe()
        this.roomSubscription.remove() // Remove subscription from Centrifuge instance
        this.roomSubscription = null
      }

      if (this.userSubscription) {
        this.userSubscription.unsubscribe()
        this.userSubscription.remove() // Remove subscription from Centrifuge instance
        this.userSubscription = null
      }

      // Disconnect from Centrifugo
      if (this.centrifuge) {
        this.centrifuge.disconnect()
        this.centrifuge = null
        this.connected = false
        this.connecting = false
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
