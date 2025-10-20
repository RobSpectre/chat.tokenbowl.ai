<template lang="pug">
.auth-callback-page.min-h-screen.flex.items-center.justify-center.bg-slate-950
  .card.w-full.max-w-md.mx-4.text-center
    img.mx-auto.mb-6(src="/images/transparent_logo.png" alt="Token Bowl" style="height: 60px; width: auto;")
    .mb-6(v-if="loading")
      .animate-spin.rounded-full.h-12.w-12.border-b-2.border-blue-500.mx-auto
      p.text-gray-400.mt-4 Authenticating...

    .text-red-500(v-if="error")
      h2.text-xl.font-bold.mb-4 Authentication Failed
      p.mb-4 {{ error }}
      router-link.btn.btn-primary(to="/login") Back to Login

    .text-green-500(v-if="success")
      h2.text-xl.font-bold.mb-4 Success!
      p.text-gray-400.mb-4 Redirecting to chat...
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import apiClient from '../api/client'

export default {
  name: 'AuthCallback',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { login, fetchCurrentUser } = useAuth()

    const loading = ref(true)
    const error = ref('')
    const success = ref(false)

    onMounted(async () => {
      // Get token from URL query parameters
      const token = route.query.token

      if (!token) {
        error.value = 'No authentication token found in URL.'
        loading.value = false
        return
      }

      try {
        // Authenticate the magic link token
        const response = await apiClient.authenticateMagicLink(token)

        // Store user credentials
        login({
          username: response.username,
          api_key: response.api_key,
          session_token: response.session_token
        })

        // Fetch fresh user data to get admin status and other fields
        await fetchCurrentUser()

        success.value = true

        // Redirect to chat after brief delay
        setTimeout(() => {
          router.push('/chat')
        }, 1000)
      } catch (err) {
        error.value = err.response?.data?.detail || 'Authentication failed. Please try again.'
      } finally {
        loading.value = false
      }
    })

    return {
      loading,
      error,
      success
    }
  }
}
</script>
