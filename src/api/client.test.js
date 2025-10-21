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

describe('ApiClient - Admin Functions', () => {
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

  describe('inviteUserByEmail', () => {
    it('should send invite with email, role, and redirect URL', async () => {
      const mockResponse = {
        data: {
          email: 'newuser@example.com',
          role: 'member',
          message: 'Invitation sent successfully'
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await apiClient.inviteUserByEmail(
        'newuser@example.com',
        'member',
        'https://chat.tokenbowl.ai/auth/callback'
      )

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/invite', {
        email: 'newuser@example.com',
        role: 'member',
        signup_url: 'https://chat.tokenbowl.ai/auth/callback'
      })

      expect(result).toEqual(mockResponse.data)
    })

    it('should use default role as member when not specified', async () => {
      const mockResponse = {
        data: {
          email: 'newuser@example.com',
          role: 'member',
          message: 'Invitation sent successfully'
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      await apiClient.inviteUserByEmail(
        'newuser@example.com',
        undefined,
        'https://chat.tokenbowl.ai/auth/callback'
      )

      // Default parameter applies, so 'member' is sent instead of undefined
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/invite', {
        email: 'newuser@example.com',
        role: 'member',
        signup_url: 'https://chat.tokenbowl.ai/auth/callback'
      })
    })

    it('should send invite with admin role', async () => {
      const mockResponse = {
        data: {
          email: 'admin@example.com',
          role: 'admin',
          message: 'Invitation sent successfully'
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      await apiClient.inviteUserByEmail(
        'admin@example.com',
        'admin',
        'https://chat.tokenbowl.ai/auth/callback'
      )

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/invite', {
        email: 'admin@example.com',
        role: 'admin',
        signup_url: 'https://chat.tokenbowl.ai/auth/callback'
      })
    })

    it('should send invite with viewer role', async () => {
      const mockResponse = {
        data: {
          email: 'viewer@example.com',
          role: 'viewer',
          message: 'Invitation sent successfully'
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      await apiClient.inviteUserByEmail(
        'viewer@example.com',
        'viewer',
        'https://chat.tokenbowl.ai/auth/callback'
      )

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/invite', {
        email: 'viewer@example.com',
        role: 'viewer',
        signup_url: 'https://chat.tokenbowl.ai/auth/callback'
      })
    })

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'Stytch is not enabled'
          }
        }
      }

      mockAxiosInstance.post.mockRejectedValue(mockError)

      await expect(
        apiClient.inviteUserByEmail(
          'test@example.com',
          'member',
          'https://chat.tokenbowl.ai/auth/callback'
        )
      ).rejects.toEqual(mockError)
    })

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error')
      mockAxiosInstance.post.mockRejectedValue(mockError)

      await expect(
        apiClient.inviteUserByEmail(
          'test@example.com',
          'member',
          'https://chat.tokenbowl.ai/auth/callback'
        )
      ).rejects.toThrow('Network Error')
    })
  })

  describe('getAllUsersAdmin', () => {
    it('should fetch all users', async () => {
      const mockResponse = {
        data: [
          { id: '123e4567-e89b-12d3-a456-426614174000', username: 'user1', email: 'user1@example.com', role: 'member' },
          { id: '123e4567-e89b-12d3-a456-426614174001', username: 'user2', email: 'user2@example.com', role: 'admin' }
        ]
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await apiClient.getAllUsersAdmin()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/admin/users')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('updateUserAdmin', () => {
    it('should update user with provided fields using user ID', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockResponse = {
        data: {
          id: userId,
          username: 'testuser',
          email: 'updated@example.com',
          role: 'admin'
        }
      }

      const updates = {
        email: 'updated@example.com',
        admin: true
      }

      mockAxiosInstance.patch.mockResolvedValue(mockResponse)

      const result = await apiClient.updateUserAdmin(userId, updates)

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/admin/users/${userId}`,
        updates
      )
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('deleteUser', () => {
    it('should delete user by user ID', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockResponse = { data: {} }

      mockAxiosInstance.delete.mockResolvedValue(mockResponse)

      const result = await apiClient.deleteUser(userId)

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/admin/users/${userId}`)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('assignUserRole', () => {
    it('should assign role to user by user ID', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockResponse = {
        data: {
          id: userId,
          username: 'testuser',
          role: 'admin',
          message: 'Role assigned successfully'
        }
      }

      mockAxiosInstance.patch.mockResolvedValue(mockResponse)

      const result = await apiClient.assignUserRole(userId, 'admin')

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/admin/users/${userId}/role`,
        { role: 'admin' }
      )
      expect(result).toEqual(mockResponse.data)
    })
  })
})
