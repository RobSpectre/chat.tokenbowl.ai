<template lang="pug">
.login-page.min-h-screen.flex.items-center.justify-center.bg-slate-950
  .card.w-full.max-w-md.mx-4(
    :style="{ transform: `scale(${cardScale})` }"
  )
    .text-center.mb-8
      img.mx-auto.mb-4(src="/images/transparent_logo.png" alt="Token Bowl" style="height: 80px; width: auto;")
      h1.text-3xl.font-black.text-white.uppercase.tracking-tight Token Bowl Chat
      p.text-gray-400.mt-2 Login with your API key

    form(@submit.prevent="handleLogin")
      .mb-6
        label.block.text-sm.font-medium.text-gray-300.mb-2(for="apiKey") API Key
        input.input(
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="Enter your API key"
          required
        )

      .text-red-500.text-sm.mb-4(v-if="error") {{ error }}

      button.btn.btn-primary.w-full(type="submit" :disabled="loading")
        span(v-if="loading") Logging in...
        span(v-else) Login

      .text-center.mt-4
        p.text-gray-400.text-sm Or use magic link
        router-link.text-blue-400.font-medium.text-sm(to="/login" class="hover:text-blue-300") Use Email

    .text-center.mt-6
      p.text-gray-400 Don't have an account?
      router-link.text-blue-400.font-medium(to="/signup" class="hover:text-blue-300") Sign up here
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import apiClient from '../api/client'
import { animate } from 'motion'

export default {
  name: 'LoginApiKey',
  setup() {
    const router = useRouter()
    const { login, fetchCurrentUser } = useAuth()

    const apiKey = ref('')
    const loading = ref(false)
    const error = ref('')
    const cardScale = ref(0.95)

    // Animate card on mount
    animate(
      (progress) => {
        cardScale.value = 0.95 + (progress * 0.05)
      },
      { duration: 0.3, easing: 'ease-out' }
    )

    const handleLogin = async () => {
      loading.value = true
      error.value = ''

      try {
        // Temporarily set API key for the API client to use
        const tempApiKey = apiKey.value

        // Set API key first so the next call can authenticate
        await login({ api_key: tempApiKey })

        // Fetch fresh user data to get admin status and other fields
        await fetchCurrentUser()

        // Redirect to chat
        router.push('/chat')
      } catch (err) {
        error.value = err.response?.data?.detail || 'Invalid API key. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      apiKey,
      loading,
      error,
      cardScale,
      handleLogin
    }
  }
}
</script>
