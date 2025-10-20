<template lang="pug">
.signup-page.min-h-screen.flex.items-center.justify-center.bg-slate-950
  .card.w-full.max-w-md.mx-4(
    :style="{ transform: `scale(${cardScale})` }"
  )
    .text-center
      img.mx-auto.mb-6(src="/images/transparent_logo.png" alt="Token Bowl" style="height: 80px; width: auto;")

      //- Lock icon
      .mb-6
        svg.w-20.h-20.mx-auto.text-gray-400(xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor")
          path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z")

      h1.text-3xl.font-black.text-white.uppercase.tracking-tight.mb-4 Invite Only
      p.text-gray-400.mb-6 Token Bowl Chat is invite-only. Please contact an administrator to receive an invitation.

      .bg-slate-800.border.border-slate-700.rounded-lg.p-4.mb-6
        p.text-sm.text-gray-300.mb-3 If you have received an invitation email:
        ol.text-sm.text-gray-400.text-left.space-y-2.list-decimal.list-inside
          li Click the magic link in your invitation email
          li You'll be automatically authenticated
          li Start chatting immediately

      router-link.btn.btn-primary.w-full(to="/login") Go to Login
</template>

<script>
import { ref } from 'vue'
import { animate } from 'motion'

export default {
  name: 'Signup',
  setup() {
    const cardScale = ref(0.95)

    // Animate card on mount
    animate(
      (progress) => {
        cardScale.value = 0.95 + (progress * 0.05)
      },
      { duration: 0.3, easing: 'ease-out' }
    )

    return {
      cardScale
    }
  }
}
</script>
