import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Login from './Login.vue'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    sendMagicLink: vi.fn()
  }
}))

import apiClient from '../api/client'

describe('Login.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return mount(Login, {
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>'
          }
        }
      }
    })
  }

  describe('UI Elements', () => {
    it('should render the login form', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain('Token Bowl Chat')
      expect(wrapper.text()).toContain('Welcome back! Please login to continue.')
    })

    it('should have an email input field', () => {
      const wrapper = createWrapper()

      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
      expect(emailInput.attributes('placeholder')).toBe('Enter your email')
    })

    it('should have a submit button', () => {
      const wrapper = createWrapper()

      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Send Magic Link')
    })

    it('should display the Token Bowl logo', () => {
      const wrapper = createWrapper()

      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('/images/transparent_logo.png')
      expect(img.attributes('alt')).toBe('Token Bowl')
    })

    it('should have a link to API key login', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain('Or login with API key')
      expect(wrapper.text()).toContain('Use API Key')
    })
  })

  describe('No Signup Link', () => {
    it('should not have a link to the signup page', () => {
      const wrapper = createWrapper()

      // Should not have any router-link with "signup" text
      const links = wrapper.findAll('a')
      const signupLinks = links.filter(link =>
        link.text().toLowerCase().includes('sign up')
      )
      expect(signupLinks).toHaveLength(0)
    })

    it('should display invite-only message instead of signup link', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain('Don\'t have an account?')
      expect(wrapper.text()).toContain('Contact an administrator for an invitation')
    })
  })

  describe('Form Submission', () => {
    it('should call sendMagicLink when form is submitted', async () => {
      apiClient.sendMagicLink.mockResolvedValue({})

      const wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')

      await emailInput.setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(apiClient.sendMagicLink).toHaveBeenCalledWith('test@example.com')
    })

    it('should show success message after sending magic link', async () => {
      apiClient.sendMagicLink.mockResolvedValue({})

      const wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')

      await emailInput.setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Check your email!')
      expect(wrapper.text()).toContain('We\'ve sent a magic link to test@example.com')
    })

    it('should show error message on failed login', async () => {
      apiClient.sendMagicLink.mockRejectedValue({
        response: {
          data: {
            detail: 'User not found'
          }
        }
      })

      const wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')

      await emailInput.setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('User not found')
    })

    it('should disable submit button while loading', async () => {
      apiClient.sendMagicLink.mockImplementation(() => new Promise(() => {}))

      const wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')
      const submitButton = wrapper.find('button[type="submit"]')

      await emailInput.setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Sending magic link...')
    })
  })

  describe('Email Sent State', () => {
    it('should allow user to send another link', async () => {
      apiClient.sendMagicLink.mockResolvedValue({})

      const wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')

      await emailInput.setValue('test@example.com')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Check your email!')

      const sendAnotherButton = wrapper.find('button.btn-secondary')
      expect(sendAnotherButton.exists()).toBe(true)
      expect(sendAnotherButton.text()).toContain('Send another link')

      await sendAnotherButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Form should be visible again
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    })
  })
})
