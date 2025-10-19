import { defineStore } from 'pinia'
import apiClient from '../api/client'

export const useUsersStore = defineStore('users', {
  state: () => ({
    allUsers: [], // Array of user objects with {username, logo, emoji, bot, viewer}
    onlineUsers: [], // Array of user objects with {username, logo, emoji, bot, viewer}
    availableLogos: [],
    userProfiles: {} // Map of username -> user profile (for backwards compatibility)
  }),

  getters: {
    getAllUsers: (state) => state.allUsers,
    getOnlineUsers: (state) => state.onlineUsers,
    getAvailableLogos: (state) => state.availableLogos,

    isUserOnline: (state) => (username) => {
      // Check if username is in onlineUsers array
      // Handle both string array (old format) and object array (new format)
      if (state.onlineUsers.length === 0) return false

      const firstUser = state.onlineUsers[0]
      if (typeof firstUser === 'string') {
        // Old format: array of usernames
        return state.onlineUsers.includes(username)
      } else {
        // New format: array of user objects
        return state.onlineUsers.some(u => u.username === username)
      }
    },

    getUsersExcludingCurrent: (state) => (currentUsername) => {
      return state.allUsers.filter(u => u.username !== currentUsername)
    },

    getUserLogo: (state) => (username) => {
      // First check if we have a user object in allUsers
      const user = state.allUsers.find(u => u.username === username)
      if (user) return user.logo

      // Fallback to userProfiles cache
      return state.userProfiles[username]?.logo || null
    },

    getUserEmoji: (state) => (username) => {
      // First check if we have a user object in allUsers
      const user = state.allUsers.find(u => u.username === username)
      if (user) return user.emoji

      // Fallback to userProfiles cache
      return state.userProfiles[username]?.emoji || null
    },

    isUserBot: (state) => (username) => {
      // First check if we have a user object in allUsers
      const user = state.allUsers.find(u => u.username === username)
      if (user) return user.bot === true

      // Fallback to userProfiles cache
      return state.userProfiles[username]?.bot === true
    }
  },

  actions: {
    async loadUsers() {
      try {
        const [online, all] = await Promise.all([
          apiClient.getOnlineUsers(),
          apiClient.getUsers()
        ])

        this.onlineUsers = online
        this.allUsers = all // Now contains full user objects with logos

        // Store user profiles in cache for backwards compatibility
        all.forEach(user => {
          if (user.username) {
            this.userProfiles[user.username] = user
          }
        })

        return { online, all }
      } catch (error) {
        console.error('Failed to load users:', error)
        throw error
      }
    },

    async loadUserProfiles(usernames) {
      try {
        // Fetch profiles for users we don't have yet
        const profilesToFetch = usernames.filter(username => !this.userProfiles[username])

        if (profilesToFetch.length === 0) return

        // Fetch all profiles in parallel
        const profiles = await Promise.all(
          profilesToFetch.map(username =>
            apiClient.getUserProfile(username).catch(err => {
              console.warn(`Failed to load profile for ${username}:`, err)
              return null
            })
          )
        )

        // Store profiles
        profiles.forEach((profile, index) => {
          if (profile) {
            this.userProfiles[profilesToFetch[index]] = profile
          }
        })
      } catch (error) {
        console.error('Failed to load user profiles:', error)
      }
    },

    async loadAvailableLogos() {
      try {
        const logos = await apiClient.getAvailableLogos()
        this.availableLogos = logos
        return logos
      } catch (error) {
        console.error('Failed to load logos:', error)
        throw error
      }
    },

    clearUsers() {
      this.allUsers = []
      this.onlineUsers = []
    }
  },

  persist: {
    key: 'users',
    storage: localStorage,
    paths: ['availableLogos'] // Only persist logos, users should be fresh on load
  }
})
