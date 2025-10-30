import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebSocketStore } from './websocket'

// Mock WebSocket constants
global.WebSocket = {
  OPEN: 1,
  CONNECTING: 0,
  CLOSING: 2,
  CLOSED: 3
}

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    createWebSocket: vi.fn()
  }
}))

import apiClient from '../api/client'

describe('WebSocket Store - Heartbeat Mechanism', () => {
  let store
  let mockWebSocket
  let messageHandlers

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useWebSocketStore()

    // Create mock WebSocket
    messageHandlers = {}
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn((event, handler) => {
        messageHandlers[event] = handler
      })
    }

    // Set up handlers that will be called
    Object.defineProperty(mockWebSocket, 'onopen', {
      set: (handler) => { messageHandlers.open = handler },
      get: () => messageHandlers.open
    })
    Object.defineProperty(mockWebSocket, 'onmessage', {
      set: (handler) => { messageHandlers.message = handler },
      get: () => messageHandlers.message
    })
    Object.defineProperty(mockWebSocket, 'onerror', {
      set: (handler) => { messageHandlers.error = handler },
      get: () => messageHandlers.error
    })
    Object.defineProperty(mockWebSocket, 'onclose', {
      set: (handler) => { messageHandlers.close = handler },
      get: () => messageHandlers.close
    })

    apiClient.createWebSocket.mockReturnValue(mockWebSocket)

    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('Heartbeat - Ping/Pong', () => {
    it('should respond to ping messages with pong', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      expect(store.connected).toBe(true)

      // Clear any previous calls
      mockWebSocket.send.mockClear()

      // Simulate receiving a ping message
      const pingMessage = {
        type: 'ping',
        timestamp: '2024-01-20T15:30:45.123456+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

      // Verify pong was sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1)
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
    })

    it('should not add ping messages to the messages array', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      // Clear messages
      store.messages = []

      // Simulate receiving a ping message
      const pingMessage = {
        type: 'ping',
        timestamp: '2024-01-20T15:30:45.123456+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

      // Verify ping was not added to messages
      expect(store.messages).toHaveLength(0)
    })

    it('should handle regular messages after processing ping', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      // Clear messages
      store.messages = []

      // Simulate receiving a ping message
      const pingMessage = {
        type: 'ping',
        timestamp: '2024-01-20T15:30:45.123456+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

      // Simulate receiving a regular message
      const regularMessage = {
        id: 'msg-123',
        content: 'Hello world',
        from_username: 'test_user',
        timestamp: '2024-01-20T15:30:46.000000+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(regularMessage) })

      // Verify only regular message was added
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].id).toBe('msg-123')
      expect(store.messages[0].content).toBe('Hello world')
    })

    it('should log heartbeat activity', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      // Simulate receiving a ping message
      const pingMessage = {
        type: 'ping',
        timestamp: '2024-01-20T15:30:45.123456+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

      // Verify console.log was called
      expect(console.log).toHaveBeenCalledWith('Received ping, sent pong')
    })

    it('should send pong even when connection is busy', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      // Add some messages to the queue
      store.messages = [
        { id: 'msg-1', content: 'Message 1' },
        { id: 'msg-2', content: 'Message 2' },
        { id: 'msg-3', content: 'Message 3' }
      ]

      mockWebSocket.send.mockClear()

      // Simulate receiving a ping message
      const pingMessage = {
        type: 'ping',
        timestamp: '2024-01-20T15:30:45.123456+00:00'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

      // Verify pong was still sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1)
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
    })

    it('should handle multiple ping messages in sequence', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      mockWebSocket.send.mockClear()

      // Simulate receiving multiple ping messages
      for (let i = 0; i < 5; i++) {
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        }

        mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })
      }

      // Verify pong was sent for each ping
      expect(mockWebSocket.send).toHaveBeenCalledTimes(5)
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
    })

    it('should not interfere with duplicate message detection', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      // Clear messages
      store.messages = []

      // Add a message
      const message1 = {
        id: 'msg-123',
        content: 'Test message',
        from_username: 'user1'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(message1) })
      expect(store.messages).toHaveLength(1)

      // Send ping in between
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString()
      }

      mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })
      expect(store.messages).toHaveLength(1) // Still 1 message

      // Try to add the same message again (duplicate)
      mockWebSocket.onmessage({ data: JSON.stringify(message1) })
      expect(store.messages).toHaveLength(1) // Should not add duplicate

      // Add a different message
      const message2 = {
        id: 'msg-456',
        content: 'Another message',
        from_username: 'user2'
      }

      mockWebSocket.onmessage({ data: JSON.stringify(message2) })
      expect(store.messages).toHaveLength(2) // Should add new message
    })
  })

  describe('Connection State with Heartbeat', () => {
    it('should maintain connection state during heartbeat exchanges', () => {
      // Connect to WebSocket
      store.connect()

      // Trigger onopen
      mockWebSocket.onopen()

      expect(store.connected).toBe(true)

      // Simulate multiple ping/pong exchanges
      for (let i = 0; i < 10; i++) {
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        }

        mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })

        // Connection should remain stable
        expect(store.connected).toBe(true)
      }
    })

    it('should handle ping when not fully connected', () => {
      // Don't call connect yet
      expect(store.connected).toBe(false)

      // Connect
      store.connect()

      // Don't trigger onopen, simulate ping before connection is established
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString()
      }

      // This should not throw an error
      expect(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(pingMessage) })
      }).not.toThrow()

      // Should have attempted to send pong
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
    })
  })

  describe('Heartbeat with Regular Messages', () => {
    it('should interleave ping/pong with regular messages correctly', () => {
      // Connect to WebSocket
      store.connect()
      mockWebSocket.onopen()

      store.messages = []
      mockWebSocket.send.mockClear()

      // Regular message
      mockWebSocket.onmessage({
        data: JSON.stringify({
          id: 'msg-1',
          content: 'Message 1',
          from_username: 'user1'
        })
      })

      // Ping
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        })
      })

      // Regular message
      mockWebSocket.onmessage({
        data: JSON.stringify({
          id: 'msg-2',
          content: 'Message 2',
          from_username: 'user2'
        })
      })

      // Verify messages
      expect(store.messages).toHaveLength(2)
      expect(store.messages[0].id).toBe('msg-1')
      expect(store.messages[1].id).toBe('msg-2')

      // Verify pong was sent once
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1)
    })
  })
})
