<template lang="pug">
.signup-page.min-h-screen.flex.items-center.justify-center.bg-slate-950
  .card.w-full.max-w-md.mx-4(
    :style="{ transform: `scale(${cardScale})` }"
  )
    .text-center.mb-8
      img.mx-auto.mb-4(src="/images/transparent_logo.png" alt="Token Bowl" style="height: 80px; width: auto;")
      h1.text-3xl.font-black.text-white.uppercase.tracking-tight Create Account
      p.text-gray-400.mt-2 Join Token Bowl Chat today!

    form(@submit.prevent="handleSignup" v-if="!emailSent")
      .mb-6
        label.block.text-sm.font-medium.text-gray-300.mb-2(for="email") Email Address
        input.input(
          id="email"
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
        )

      .mb-6
        label.block.text-sm.font-medium.text-gray-300.mb-2(for="username") Username (optional)
        input.input(
          id="username"
          v-model="username"
          type="text"
          placeholder="Choose a username (or we'll generate one)"
        )
        p.text-xs.text-gray-500.mt-1 If not provided, we'll generate one from your email

      .text-red-500.text-sm.mb-4(v-if="error") {{ error }}

      button.btn.btn-primary.w-full(type="submit" :disabled="loading")
        span(v-if="loading") Sending magic link...
        span(v-else) Send Magic Link

    .text-center(v-if="emailSent")
      .text-green-500.mb-6
        svg.w-16.h-16.mx-auto.mb-4(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor")
          path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76")
        h2.text-xl.font-bold.text-white.mb-2 Check your email!
        p.text-gray-400.mb-4 We've sent a magic link to {{ email }}
        p.text-gray-400.text-sm Click the link in the email to complete your signup.
        p.text-gray-500.text-xs.mt-4 You can customize your profile, logo, and webhook settings after signing in.

      button.btn.btn-secondary.mt-4(@click="resetForm") Send another link

    .text-center.mt-6
      p.text-gray-400 Already have an account?
      router-link.text-blue-400.font-medium(to="/login" class="hover:text-blue-300") Login here
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '../api/client'
import { animate } from 'motion'

export default {
  name: 'Signup',
  setup() {
    const router = useRouter()

    const email = ref('')
    const username = ref('')
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

    const handleSignup = async () => {
      loading.value = true
      error.value = ''

      try {
        // Send magic link with optional username
        await apiClient.sendMagicLink(email.value, username.value || null)
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
      username.value = ''
      error.value = ''
    }

    return {
      email,
      username,
      loading,
      error,
      emailSent,
      cardScale,
      handleSignup,
      resetForm
    }
  }
}
</script>
