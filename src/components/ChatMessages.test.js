import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ChatMessages from './ChatMessages.vue'

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    markMessageAsRead: vi.fn()
  }
}))

describe('ChatMessages.vue', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ChatMessages, {
      props: {
        messages: [],
        currentUsername: 'testuser',
        modelValue: '',
        ...props
      },
      global: {
        plugins: [pinia]
      }
    })
  }

  describe('Markdown Rendering', () => {
    it('should render basic markdown headings', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '### Fantasy News Headline:\nBreece Hall injury elevates Israel Abanikanda to must-add status.',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.exists()).toBe(true)
      expect(messageContent.html()).toContain('<h3>')
      expect(messageContent.text()).toContain('Fantasy News Headline:')
      expect(messageContent.text()).toContain('Breece Hall injury')
    })

    it('should render bold text', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '**Source:** ESPN Fantasy Football News',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<strong>')
      expect(messageContent.text()).toContain('Source:')
    })

    it('should render italic text', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '*Published:* October 16, 2024',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<em>')
      expect(messageContent.text()).toContain('Published:')
    })

    it('should render inline code', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: 'Use the `const` keyword for constants.',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<code>')
      expect(messageContent.text()).toContain('const')
    })

    it('should render code blocks', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '```javascript\nconst x = 10;\nconsole.log(x);\n```',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      const html = messageContent.html()
      expect(html).toContain('<pre>')
      expect(html).toMatch(/<code/)
      expect(messageContent.text()).toContain('const x = 10')
    })

    it('should render lists', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '- Item 1\n- Item 2\n- Item 3',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<ul>')
      expect(messageContent.html()).toContain('<li>')
      expect(messageContent.text()).toContain('Item 1')
      expect(messageContent.text()).toContain('Item 2')
    })

    it('should render links', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: 'Visit [ESPN](https://espn.com) for more info.',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<a')
      expect(messageContent.html()).toContain('href="https://espn.com"')
      expect(messageContent.text()).toContain('ESPN')
    })

    it('should render blockquotes', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '> This is a quote\n> from someone',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<blockquote>')
      expect(messageContent.text()).toContain('This is a quote')
    })

    it('should sanitize potentially dangerous HTML', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: '<script>alert("XSS")</script>Hello',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      // DOMPurify should strip the script tag
      expect(messageContent.html()).not.toContain('<script>')
      expect(messageContent.html()).not.toContain('alert')
      expect(messageContent.text()).toContain('Hello')
    })

    it('should render complex markdown correctly', () => {
      const complexMarkdown = `### Fantasy News Headline:
Breece Hall injury elevates Israel Abanikanda to must-add status.

**Source:** ESPN Fantasy Football News
**Published:** October 16, 2024

**Subheadline (optional):** Hall's knee soreness could mean significant touches for Abanikanda; grab him off waivers now.`

      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'bot',
            content: complexMarkdown,
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.html()).toContain('<h3>')
      expect(messageContent.html()).toContain('<strong>')
      expect(messageContent.text()).toContain('Fantasy News Headline:')
      expect(messageContent.text()).toContain('ESPN Fantasy Football News')
      expect(messageContent.text()).toContain('October 16, 2024')
    })

    it('should render plain text messages without markdown formatting when no markdown is present', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'user',
            content: 'Hello, this is a plain text message.',
            timestamp: new Date().toISOString()
          }
        ]
      })

      const messageContent = wrapper.find('.markdown-content')
      expect(messageContent.text()).toContain('Hello, this is a plain text message.')
      // Should be wrapped in a <p> tag by marked
      expect(messageContent.html()).toContain('<p>')
    })
  })

  describe('Message Display', () => {
    it('should display messages from different users', () => {
      const wrapper = createWrapper({
        messages: [
          {
            id: 1,
            from_username: 'user1',
            content: 'Hello from user1',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            from_username: 'user2',
            content: 'Hello from user2',
            timestamp: new Date().toISOString()
          }
        ]
      })

      expect(wrapper.text()).toContain('user1')
      expect(wrapper.text()).toContain('user2')
      expect(wrapper.text()).toContain('Hello from user1')
      expect(wrapper.text()).toContain('Hello from user2')
    })

    it('should show empty message when no messages', () => {
      const wrapper = createWrapper({
        emptyMessage: 'No messages yet'
      })

      expect(wrapper.text()).toContain('No messages yet')
    })
  })
})
