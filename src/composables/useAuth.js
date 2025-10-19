import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores'

export function useAuth() {
  const authStore = useAuthStore()
  const { currentUser, apiKey, sessionToken, username, isAuthenticated } = storeToRefs(authStore)

  return {
    currentUser,
    apiKey,
    sessionToken,
    username,
    isAuthenticated,
    login: authStore.login,
    logout: authStore.logout,
    initAuth: authStore.initAuth,
    fetchCurrentUser: authStore.fetchCurrentUser,
    updateUsername: authStore.updateUsername,
    updateLogo: authStore.updateLogo,
    updateWebhook: authStore.updateWebhook,
    regenerateApiKey: authStore.regenerateApiKey
  }
}
