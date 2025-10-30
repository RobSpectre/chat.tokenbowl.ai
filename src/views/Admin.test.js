import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Admin from './Admin.vue'
import apiClient from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    inviteUserByEmail: vi.fn(),
    getAllUsersAdmin: vi.fn(),
    updateUserAdmin: vi.fn(),
    deleteUser: vi.fn(),
    getWebSocketConnections: vi.fn()
  }
}))

// Mock the composables
vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      username: 'admin',
      admin: true,
      role: 'admin'
    }
  })
}))

// Mock the stores
vi.mock('../stores', () => ({
  useUsersStore: () => ({
    availableLogos: [],
    loadAvailableLogos: vi.fn()
  })
}))

describe('Admin.vue - Invite Functionality', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock getAllUsersAdmin to return empty array by default
    apiClient.getAllUsersAdmin.mockResolvedValue([])

    // Mock getWebSocketConnections to return empty connections by default
    apiClient.getWebSocketConnections.mockResolvedValue({
      total_connections: 0,
      connections: []
    })
  })

  const createWrapper = () => {
    return mount(Admin, {
      global: {
        stubs: {
          TopNav: true
        }
      }
    })
  }

  describe('Invite Form UI', () => {
    it('should render invite form for admin users', async () => {
      wrapper = createWrapper()
      await flushPromises()

      const inviteForm = wrapper.find('form')
      expect(inviteForm.exists()).toBe(true)

      // Check for email input
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
      expect(emailInput.attributes('placeholder')).toBe('user@example.com')

      // Check for role select
      const roleSelect = wrapper.find('select')
      expect(roleSelect.exists()).toBe(true)
    })

    it('should have correct role options', async () => {
      wrapper = createWrapper()
      await flushPromises()

      const roleSelect = wrapper.find('select')
      const options = roleSelect.findAll('option')

      expect(options).toHaveLength(3)
      expect(options[0].text()).toBe('Member')
      expect(options[0].element.value).toBe('member')
      expect(options[1].text()).toBe('Viewer')
      expect(options[1].element.value).toBe('viewer')
      expect(options[2].text()).toBe('Admin')
      expect(options[2].element.value).toBe('admin')
    })
  })

  describe('Invite Form Submission', () => {
    it('should call inviteUserByEmail with correct parameters', async () => {
      apiClient.inviteUserByEmail.mockResolvedValue({
        email: 'newuser@example.com',
        role: 'member',
        message: 'Invitation sent successfully'
      })

      wrapper = createWrapper()
      await flushPromises()

      // Fill in the form
      const emailInput = wrapper.find('input[type="email"]')
      const roleSelect = wrapper.find('select')

      await emailInput.setValue('newuser@example.com')
      await roleSelect.setValue('member')

      // Submit the form
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')
      await flushPromises()

      expect(apiClient.inviteUserByEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'member',
        window.location.origin + '/auth/callback'
      )
    })

    it('should show success message after successful invite', async () => {
      const successMessage = 'Invitation sent to newuser@example.com'
      apiClient.inviteUserByEmail.mockResolvedValue({
        message: successMessage
      })

      wrapper = createWrapper()
      await flushPromises()

      // Fill and submit form
      await wrapper.find('input[type="email"]').setValue('newuser@example.com')
      await wrapper.find('select').setValue('admin')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      // Check for success message
      const successDiv = wrapper.find('.text-green-500')
      expect(successDiv.exists()).toBe(true)
      expect(successDiv.text()).toContain(successMessage)
    })

    it('should reset form after successful invite', async () => {
      apiClient.inviteUserByEmail.mockResolvedValue({
        message: 'Invitation sent successfully'
      })

      wrapper = createWrapper()
      await flushPromises()

      // Fill and submit form
      const emailInput = wrapper.find('input[type="email"]')
      const roleSelect = wrapper.find('select')

      await emailInput.setValue('test@example.com')
      await roleSelect.setValue('admin')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      // Form should be reset
      expect(emailInput.element.value).toBe('')
      expect(roleSelect.element.value).toBe('member')
    })

    it('should show error message on failed invite', async () => {
      const errorMessage = 'Stytch is not enabled'
      apiClient.inviteUserByEmail.mockRejectedValue({
        response: {
          data: {
            detail: errorMessage
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()

      // Fill and submit form
      await wrapper.find('input[type="email"]').setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      // Check for error message
      const errorDiv = wrapper.find('.text-red-500')
      expect(errorDiv.exists()).toBe(true)
      expect(errorDiv.text()).toContain(errorMessage)
    })

    it('should disable submit button while inviting', async () => {
      // Create a promise we can control
      let resolveInvite
      const invitePromise = new Promise((resolve) => {
        resolveInvite = resolve
      })
      apiClient.inviteUserByEmail.mockReturnValue(invitePromise)

      wrapper = createWrapper()
      await flushPromises()

      const submitButton = wrapper.find('button[type="submit"]')

      // Initially button should be enabled
      expect(submitButton.attributes('disabled')).toBeUndefined()

      // Fill and submit form
      await wrapper.find('input[type="email"]').setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      // Button should now be disabled
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(submitButton.text()).toBe('Sending Invite...')

      // Resolve the promise
      resolveInvite({ message: 'Success' })
      await flushPromises()

      // Button should be enabled again
      expect(submitButton.attributes('disabled')).toBeUndefined()
      expect(submitButton.text()).toBe('Send Invite')
    })

    it('should send invite with viewer role', async () => {
      apiClient.inviteUserByEmail.mockResolvedValue({
        message: 'Invitation sent successfully'
      })

      wrapper = createWrapper()
      await flushPromises()

      await wrapper.find('input[type="email"]').setValue('viewer@example.com')
      await wrapper.find('select').setValue('viewer')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(apiClient.inviteUserByEmail).toHaveBeenCalledWith(
        'viewer@example.com',
        'viewer',
        window.location.origin + '/auth/callback'
      )
    })

    it('should handle generic error messages', async () => {
      apiClient.inviteUserByEmail.mockRejectedValue(new Error('Network error'))

      wrapper = createWrapper()
      await flushPromises()

      await wrapper.find('input[type="email"]').setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      const errorDiv = wrapper.find('.text-red-500')
      expect(errorDiv.exists()).toBe(true)
      expect(errorDiv.text()).toBe('Failed to send invitation')
    })
  })

  describe('Form Validation', () => {
    it('should require email field', async () => {
      wrapper = createWrapper()
      await flushPromises()

      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.attributes('required')).toBeDefined()
    })

    it('should require role field', async () => {
      wrapper = createWrapper()
      await flushPromises()

      const roleSelect = wrapper.find('select')
      expect(roleSelect.attributes('required')).toBeDefined()
    })

  })
})
