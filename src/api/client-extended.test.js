import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock axios before importing the client
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((fn) => fn)
      },
      response: {
        use: vi.fn((fn) => fn)
      }
    }
  }

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance)
    }
  }
})

import axios from 'axios'
import apiClient from './client'

describe('ApiClient - Extended Endpoints', () => {
  let mockAxiosInstance

  beforeEach(() => {
    // Get the mock axios instance
    mockAxiosInstance = axios.create()

    // Clear all mocks
    vi.clearAllMocks()

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Bot Management', () => {
    describe('getMyBots', () => {
      it('should fetch all bots for current user', async () => {
        const mockResponse = {
          data: [
            { id: 'bot-1', username: 'bot1', owner_id: 'user-1' },
            { id: 'bot-2', username: 'bot2', owner_id: 'user-1' }
          ]
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getMyBots()

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bots/me')
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('updateBot', () => {
      it('should update bot configuration', async () => {
        const botId = 'bot-123'
        const updates = {
          webhook_url: 'https://example.com/webhook',
          logo: 'new-logo'
        }
        const mockResponse = {
          data: { id: botId, ...updates }
        }

        mockAxiosInstance.patch.mockResolvedValue(mockResponse)

        const result = await apiClient.updateBot(botId, updates)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/bots/${botId}`, updates)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('deleteBot', () => {
      it('should delete a bot', async () => {
        const botId = 'bot-123'
        const mockResponse = { data: {} }

        mockAxiosInstance.delete.mockResolvedValue(mockResponse)

        const result = await apiClient.deleteBot(botId)

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/bots/${botId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('regenerateBotApiKey', () => {
      it('should regenerate bot API key', async () => {
        const botId = 'bot-123'
        const mockResponse = {
          data: {
            message: 'API key regenerated',
            api_key: 'new-api-key-123'
          }
        }

        mockAxiosInstance.post.mockResolvedValue(mockResponse)

        const result = await apiClient.regenerateBotApiKey(botId)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/bots/${botId}/regenerate-api-key`)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })

  describe('Admin Endpoints', () => {
    describe('getAdminUser', () => {
      it('should fetch specific user by ID', async () => {
        const userId = 'user-123'
        const mockResponse = {
          data: {
            id: userId,
            username: 'testuser',
            email: 'test@example.com',
            role: 'member'
          }
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getAdminUser(userId)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/admin/users/${userId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('getAdminMessage', () => {
      it('should fetch specific message by ID', async () => {
        const messageId = 'msg-123'
        const mockResponse = {
          data: {
            id: messageId,
            content: 'Test message',
            from_username: 'user1'
          }
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getAdminMessage(messageId)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/admin/messages/${messageId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('updateAdminMessage', () => {
      it('should update message content', async () => {
        const messageId = 'msg-123'
        const newContent = 'Updated message content'
        const mockResponse = {
          data: {
            id: messageId,
            content: newContent
          }
        }

        mockAxiosInstance.patch.mockResolvedValue(mockResponse)

        const result = await apiClient.updateAdminMessage(messageId, newContent)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/admin/messages/${messageId}`,
          { content: newContent }
        )
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('deleteAdminMessage', () => {
      it('should delete a message', async () => {
        const messageId = 'msg-123'
        const mockResponse = { data: {} }

        mockAxiosInstance.delete.mockResolvedValue(mockResponse)

        const result = await apiClient.deleteAdminMessage(messageId)

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/admin/messages/${messageId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('deleteAdminConversation', () => {
      it('should delete a conversation', async () => {
        const conversationId = 'conv-123'
        const mockResponse = { data: {} }

        mockAxiosInstance.delete.mockResolvedValue(mockResponse)

        const result = await apiClient.deleteAdminConversation(conversationId)

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/admin/conversations/${conversationId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })

  describe('Conversation Endpoints', () => {
    describe('createConversation', () => {
      it('should create a new conversation', async () => {
        const mockResponse = {
          data: {
            id: 'conv-123',
            title: 'Test Conversation',
            description: 'A test conversation',
            message_ids: ['msg-1', 'msg-2']
          }
        }

        mockAxiosInstance.post.mockResolvedValue(mockResponse)

        const result = await apiClient.createConversation(
          'Test Conversation',
          'A test conversation',
          ['msg-1', 'msg-2']
        )

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversations', {
          title: 'Test Conversation',
          description: 'A test conversation',
          message_ids: ['msg-1', 'msg-2']
        })
        expect(result).toEqual(mockResponse.data)
      })

      it('should create conversation with defaults', async () => {
        const mockResponse = {
          data: {
            id: 'conv-123',
            title: null,
            description: null,
            message_ids: []
          }
        }

        mockAxiosInstance.post.mockResolvedValue(mockResponse)

        const result = await apiClient.createConversation()

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversations', {
          title: null,
          description: null,
          message_ids: []
        })
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('getConversations', () => {
      it('should fetch conversations with pagination', async () => {
        const mockResponse = {
          data: {
            conversations: [
              { id: 'conv-1', title: 'Conversation 1' },
              { id: 'conv-2', title: 'Conversation 2' }
            ],
            total: 2,
            limit: 50,
            offset: 0
          }
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getConversations(50, 0)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/conversations', {
          params: { limit: 50, offset: 0 }
        })
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('getConversation', () => {
      it('should fetch specific conversation by ID', async () => {
        const conversationId = 'conv-123'
        const mockResponse = {
          data: {
            id: conversationId,
            title: 'Test Conversation',
            messages: []
          }
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getConversation(conversationId)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/conversations/${conversationId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('updateConversation', () => {
      it('should update conversation', async () => {
        const conversationId = 'conv-123'
        const updates = {
          title: 'Updated Title',
          description: 'Updated description'
        }
        const mockResponse = {
          data: {
            id: conversationId,
            ...updates
          }
        }

        mockAxiosInstance.patch.mockResolvedValue(mockResponse)

        const result = await apiClient.updateConversation(conversationId, updates)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/conversations/${conversationId}`,
          updates
        )
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('deleteConversation', () => {
      it('should delete a conversation', async () => {
        const conversationId = 'conv-123'
        const mockResponse = { data: {} }

        mockAxiosInstance.delete.mockResolvedValue(mockResponse)

        const result = await apiClient.deleteConversation(conversationId)

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/conversations/${conversationId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })

  describe('User Endpoints', () => {
    describe('getUserById', () => {
      it('should fetch user by ID', async () => {
        const userId = 'user-123'
        const mockResponse = {
          data: {
            id: userId,
            username: 'testuser',
            email: 'test@example.com'
          }
        }

        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiClient.getUserById(userId)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/users/${userId}`)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })
})