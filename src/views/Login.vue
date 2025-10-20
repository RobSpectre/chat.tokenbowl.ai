<template lang="pug">
.login-page.min-h-screen.flex.items-center.justify-center.bg-slate-950
  .card.w-full.max-w-md.mx-4(
    :style="{ transform: `scale(${cardScale})` }"
  )
    .text-center.mb-8
      img.mx-auto.mb-4(src="/images/transparent_logo.png" alt="Token Bowl" style="height: 80px; width: auto;")
      h1.text-3xl.font-black.text-white.uppercase.tracking-tight Token Bowl Chat
      p.text-gray-400.mt-2 Welcome back! Please login to continue.

    form(@submit.prevent="handleLogin" v-if="!emailSent")
      .mb-6
        label.block.text-sm.font-medium.text-gray-300.mb-2(for="email") Email Address
        input.input(
          id="email"
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
        )

      .text-red-500.text-sm.mb-4(v-if="error") {{ error }}

      button.btn.btn-primary.w-full(type="submit" :disabled="loading")
        span(v-if="loading") Sending magic link...
        span(v-else) Send Magic Link

      .text-center.mt-4
        p.text-gray-400.text-sm Or login with API key
        router-link.text-blue-400.font-medium.text-sm(to="/login-api-key" class="hover:text-blue-300") Use API Key

    .text-center(v-if="emailSent")
      .text-green-500.mb-6
        svg.w-16.h-16.mx-auto.mb-4(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor")
          path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76")
        h2.text-xl.font-bold.text-white.mb-2 Check your email!
        p.text-gray-400.mb-4 We've sent a magic link to {{ email }}
        p.text-gray-400.text-sm Click the link in the email to log in.

      button.btn.btn-secondary.mt-4(@click="resetForm") Send another link

    .text-center.mt-6
      p.text-gray-400.text-sm Don't have an account? Contact an administrator for an invitation.
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '../api/client'
import { animate } from 'motion'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()

    const email = ref('')
    const loading = ref(false)
    const error = ref('')
    const emailSent = ref(false)
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
        // Send magic link to email
        await apiClient.sendMagicLink(email.value)
        emailSent.value = true

        // Animate success
        animate(
          (progress) => {
            cardScale.value = 1 + (Math.sin(progress * Math.PI) * 0.02)
          },
          { duration: 0.4, easing: 'ease-out' }
        )
      } catch (err) {
        error.value = err.response?.data?.detail || 'Failed to send magic link. Please try again.'
      } finally {
        loading.value = false
      }
    }

    const resetForm = () => {
      emailSent.value = false
      email.value = ''
      error.value = ''
    }

    return {
      email,
      loading,
      error,
      emailSent,
      cardScale,
      handleLogin,
      resetForm
    }
  }
}
</script>
