import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'

// Function to get auth - always use localStorage to avoid circular dependency and require() issues
const getAuth = () => {
  return {
    apiKey: localStorage.getItem('apiKey'),
    sessionToken: localStorage.getItem('sessionToken')
  }
}

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add authentication headers to requests if available
    this.client.interceptors.request.use(config => {
      const { apiKey, sessionToken } = getAuth()

      // Prefer session token for authentication, fallback to API key
      if (sessionToken) {
        config.headers['Authorization'] = `Bearer ${sessionToken}`
      } else if (apiKey) {
        config.headers['X-API-Key'] = apiKey
      }

      return config
    })
  }

  // Auth endpoints
  async register(username, webhookUrl = null, logo = null, viewer = false) {
    const response = await this.client.post('/register', {
      username,
      webhook_url: webhookUrl,
      logo,
      viewer
    })
    return response.data
  }

  async createBot(username, webhookUrl = null, logo = null, emoji = null) {
    const response = await this.client.post('/register', {
      username,
      webhook_url: webhookUrl,
      logo,
      emoji,
      bot: true
    })
    return response.data
  }

  async deleteUser(userId) {
    const response = await this.client.delete(`/admin/users/${userId}`)
    return response.data
  }

  async getAllUsersAdmin() {
    const response = await this.client.get('/admin/users')
    return response.data
  }

  async updateUserAdmin(userId, updates) {
    const response = await this.client.patch(`/admin/users/${userId}`, updates)
    return response.data
  }

  async inviteUserByEmail(email, role = 'member', signupUrl) {
    const response = await this.client.post('/admin/invite', {
      email,
      role,
      signup_url: signupUrl
    })
    return response.data
  }

  async assignUserRole(userId, role) {
    const response = await this.client.patch(`/admin/users/${userId}/role`, {
      role
    })
    return response.data
  }

  // Stytch magic link endpoints
  async sendMagicLink(email, username = null) {
    const response = await this.client.post('/auth/magic-link/send', {
      email,
      username
    })
    return response.data
  }

  async authenticateMagicLink(token) {
    const response = await this.client.post('/auth/magic-link/authenticate', {
      token
    })
    return response.data
  }

  // Message endpoints
  async sendMessage(content, toUsername = null) {
    const response = await this.client.post('/messages', {
      content,
      to_username: toUsername
    })
    return response.data
  }

  async getMessages(limit = 50, offset = 0, since = null) {
    const response = await this.client.get('/messages', {
      params: { limit, offset, since }
    })
    return response.data
  }

  async getDirectMessages(limit = 50, offset = 0, since = null) {
    const response = await this.client.get('/messages/direct', {
      params: { limit, offset, since }
    })
    return response.data
  }

  async getUnreadMessages(limit = 50, offset = 0) {
    const response = await this.client.get('/messages/unread', {
      params: { limit, offset }
    })
    return response.data
  }

  async getUnreadDirectMessages(limit = 50, offset = 0) {
    const response = await this.client.get('/messages/direct/unread', {
      params: { limit, offset }
    })
    return response.data
  }

  async getUnreadCount() {
    const response = await this.client.get('/messages/unread/count')
    return response.data
  }

  async markMessageAsRead(messageId) {
    const response = await this.client.post(`/messages/${messageId}/read`)
    return response.data
  }

  async markAllMessagesAsRead() {
    const response = await this.client.post('/messages/mark-all-read')
    return response.data
  }

  // User endpoints
  async getUsers() {
    const response = await this.client.get('/users')
    return response.data
  }

  async getOnlineUsers() {
    const response = await this.client.get('/users/online')
    return response.data
  }

  async getUserProfile(username) {
    const response = await this.client.get(`/users/${username}`)
    return response.data
  }

  // Logo endpoints
  async getAvailableLogos() {
    const response = await this.client.get('/logos')
    return response.data
  }

  async updateLogo(logo) {
    const response = await this.client.patch('/users/me/logo', { logo })
    return response.data
  }

  // User profile endpoints
  async getCurrentUser() {
    const response = await this.client.get('/users/me')
    return response.data
  }

  async updateUsername(username) {
    const response = await this.client.patch('/users/me/username', { username })
    return response.data
  }

  async regenerateApiKey() {
    const response = await this.client.post('/users/me/regenerate-api-key')
    return response.data
  }

  async updateWebhook(webhookUrl) {
    const response = await this.client.patch('/users/me/webhook', { webhook_url: webhookUrl })
    return response.data
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health')
    return response.data
  }

  // WebSocket connection
  createWebSocket() {
    const wsUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_WS_URL || 'ws://localhost:8000'
    const { apiKey, sessionToken } = getAuth()

    // Use session token if available, otherwise use API key
    if (sessionToken) {
      return new WebSocket(`${wsUrl}/ws?token=${sessionToken}`)
    } else if (apiKey) {
      return new WebSocket(`${wsUrl}/ws?api_key=${apiKey}`)
    } else {
      throw new Error('No authentication credentials available')
    }
  }
}

export default new ApiClient()
