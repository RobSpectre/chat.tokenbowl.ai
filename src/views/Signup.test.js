import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Signup from './Signup.vue'

describe('Signup.vue - Invite Only Page', () => {
  const createWrapper = () => {
    return mount(Signup, {
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
    it('should render the invite-only message', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain('Invite Only')
      expect(wrapper.text()).toContain('Token Bowl Chat is invite-only')
      expect(wrapper.text()).toContain('contact an administrator to receive an invitation')
    })

    it('should display the lock icon', () => {
      const wrapper = createWrapper()

      // Check for SVG lock icon
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
    })

    it('should show instructions for invited users', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain('If you have received an invitation email')
      expect(wrapper.text()).toContain('Click the magic link in your invitation email')
      expect(wrapper.text()).toContain('You\'ll be automatically authenticated')
      expect(wrapper.text()).toContain('Start chatting immediately')
    })

    it('should have a "Go to Login" button', () => {
      const wrapper = createWrapper()

      const loginLink = wrapper.find('a')
      expect(loginLink.exists()).toBe(true)
      expect(loginLink.text()).toContain('Go to Login')
    })

    it('should display the Token Bowl logo', () => {
      const wrapper = createWrapper()

      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('/images/transparent_logo.png')
      expect(img.attributes('alt')).toBe('Token Bowl')
    })
  })

  describe('No Signup Form', () => {
    it('should not have any input fields', () => {
      const wrapper = createWrapper()

      const inputs = wrapper.findAll('input')
      expect(inputs).toHaveLength(0)
    })

    it('should not have a signup form', () => {
      const wrapper = createWrapper()

      const form = wrapper.find('form')
      expect(form.exists()).toBe(false)
    })

    it('should not have a submit button for signup', () => {
      const wrapper = createWrapper()

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('Card Animation', () => {
    it('should initialize with cardScale state', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.cardScale).toBeDefined()
      expect(typeof wrapper.vm.cardScale).toBe('number')
    })
  })
})
