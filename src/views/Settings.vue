<template lang="pug">
.settings-page.min-h-screen.bg-slate-950
  //- Confirmation Modal
  ConfirmModal(
    :show="showRegenerateConfirm"
    title="Regenerate API Key"
    message="Are you sure you want to regenerate your API key? Your old key will stop working immediately and cannot be recovered."
    confirmText="Regenerate"
    cancelText="Cancel"
    confirmClass="bg-orange-600 text-white hover:bg-orange-700"
    :loading="regeneratingApiKey"
    @confirm="confirmRegenerateApiKey"
    @cancel="showRegenerateConfirm = false"
  )

  TopNav(title="Settings")

  .container.mx-auto.px-4.py-8
    .max-w-4xl.mx-auto

      .grid.gap-6

        //- User Information
        .card(:style="{ opacity: cardOpacity }")
          h2.text-xl.font-semibold.text-white.mb-4 User Information
          .space-y-4
            .flex.items-center.space-x-4
              .relative
                .w-24.h-24.rounded-full.bg-slate-700.flex.items-center.justify-center.overflow-hidden.cursor-pointer.transition-all.border-2.border-transparent(
                  @click="toggleLogoDropdown"
                  title="Click to change logo"
                  class="hover:border-blue-400"
                )
                  img(
                    v-if="currentUser?.logo"
                    :src="`${apiBaseUrl}/public/images/${currentUser.logo}`"
                    :alt="currentUser.username"
                    class="w-full h-full object-cover"
                  )
                  span.text-2xl.text-gray-300(v-else) {{ currentUser?.username?.[0]?.toUpperCase() }}

                //- Logo dropdown
                .absolute.top-full.left-0.mt-2.bg-slate-800.border.border-slate-700.rounded-lg.shadow-xl.z-10.p-3.w-64(
                  v-if="showLogoDropdown"
                  @click.stop
                )
                  p.text-sm.text-gray-400.mb-3 Select a logo
                  .grid.grid-cols-4.gap-2.max-h-64.overflow-y-auto
                    .cursor-pointer.border-2.rounded-lg.p-1.transition-all.bg-slate-700(
                      v-for="logo in availableLogos"
                      :key="logo"
                      :class="currentUser?.logo === logo ? 'border-blue-500' : 'border-slate-600'"
                      @click="selectLogo(logo)"
                      class="hover:border-blue-400"
                    )
                      img.w-full.h-auto(:src="`${apiBaseUrl}/public/images/${logo}`" :alt="logo")

                    .cursor-pointer.border-2.rounded-lg.p-1.transition-all.bg-slate-700.flex.items-center.justify-center(
                      :class="!currentUser?.logo ? 'border-blue-500' : 'border-slate-600'"
                      @click="selectLogo(null)"
                      class="hover:border-blue-400"
                    )
                      span.text-xs.text-gray-400 None
              .flex-1
                .mb-3
                  p.text-sm.text-gray-400 Username
                  //- Edit mode
                  form(v-if="isEditingUsername" @submit.prevent="handleUsernameUpdate")
                    .flex.items-center.space-x-2
                      input.input.flex-1(
                        ref="usernameInput"
                        v-model="newUsername"
                        type="text"
                        placeholder="Enter new username"
                        :disabled="usernameUpdateLoading"
                        minlength="1"
                        maxlength="50"
                        required
                        @blur="cancelUsernameEdit"
                        @keydown.esc="cancelUsernameEdit"
                      )
                      button.btn.btn-primary.py-1.px-3(
                        type="submit"
                        :disabled="usernameUpdateLoading || !newUsername || newUsername === currentUser?.username"
                      ) {{ usernameUpdateLoading ? '...' : '✓' }}
                  //- Display mode
                  p.text-lg.font-medium.text-white.cursor-pointer.transition-colors(
                    v-else
                    @click="startEditingUsername"
                    title="Click to edit"
                    class="hover:text-blue-400"
                  ) {{ currentUser?.username }}
                  .text-green-500.text-sm(v-if="usernameUpdateSuccess") Username updated successfully!
                  .text-red-500.text-sm(v-if="usernameUpdateError") {{ usernameUpdateError }}
                .mb-3(v-if="currentUser?.email")
                  p.text-sm.text-gray-400 Email
                  p.text-lg.font-medium.text-white {{ currentUser?.email }}

        //- API Key
        .card(:style="{ opacity: cardOpacity }")
          h2.text-xl.font-semibold.text-white.mb-4 API Key
          .space-y-4
            .bg-slate-800.p-4.rounded-lg.border.border-slate-700
              p.text-sm.text-gray-400.mb-2 Your API Key
              .flex.items-center.space-x-2
                input.input.font-mono.text-sm.flex-1(
                  :type="showApiKey ? 'text' : 'password'"
                  :value="apiKey"
                  readonly
                )
                button.btn.btn-secondary(@click="showApiKey = !showApiKey") {{ showApiKey ? 'Hide' : 'Show' }}
                button.btn.btn-secondary(@click="copyApiKey") {{ apiKeyCopied ? 'Copied!' : 'Copy' }}
              p.text-xs.text-gray-500.mt-2 Keep this key secure. Don't share it with others.
            button.btn.bg-orange-600.text-white(@click="handleRegenerateApiKey" :disabled="regeneratingApiKey" class="hover:bg-orange-700") {{ regeneratingApiKey ? 'Regenerating...' : 'Regenerate API Key' }}
            .text-green-500.text-sm(v-if="apiKeyRegenerateSuccess") API Key regenerated successfully! Please save your new key.
            .text-red-500.text-sm(v-if="apiKeyRegenerateError") {{ apiKeyRegenerateError }}
            p.text-xs.text-yellow-500(v-if="regeneratingApiKey || apiKeyRegenerateSuccess") Warning: Your old API key will no longer work after regeneration.

        //- Webhook Settings
        .card(:style="{ opacity: cardOpacity }")
          h2.text-xl.font-semibold.text-white.mb-4 Webhook Settings
          .space-y-4
            p.text-sm.text-gray-400 Webhook URL
            //- Edit mode
            form(v-if="isEditingWebhook" @submit.prevent="handleWebhookUpdate")
              .flex.items-center.space-x-2
                input.input.flex-1.font-mono.text-sm(
                  ref="webhookInput"
                  v-model="newWebhookUrl"
                  type="url"
                  placeholder="https://your-webhook-url.com/endpoint"
                  :disabled="webhookUpdateLoading"
                  @blur="cancelWebhookEdit"
                  @keydown.esc="cancelWebhookEdit"
                )
                button.btn.btn-primary.py-1.px-3(
                  type="submit"
                  :disabled="webhookUpdateLoading || newWebhookUrl === currentUser?.webhook_url"
                ) {{ webhookUpdateLoading ? '...' : '✓' }}
            //- Display mode
            .bg-slate-800.p-4.rounded-lg.border.border-slate-700.cursor-pointer.transition-colors(
              v-else
              @click="startEditingWebhook"
              title="Click to edit"
              class="hover:border-blue-500"
            )
              p.font-mono.text-sm.text-gray-300 {{ currentUser?.webhook_url || 'Not configured (click to add)' }}
            .text-green-500.text-sm(v-if="webhookUpdateSuccess") Webhook URL updated successfully!
            .text-red-500.text-sm(v-if="webhookUpdateError") {{ webhookUpdateError }}
            p.text-xs.text-gray-500 Messages will be sent to this URL when you receive them.

        //- Bot Management
        .card(:style="{ opacity: cardOpacity }")
          h2.text-xl.font-semibold.text-white.mb-4 Bots
          .space-y-4
            p.text-sm.text-gray-400 Create and manage bot users that can interact via webhooks

            //- Create Bot Form
            .bg-slate-800.p-4.rounded-lg.border.border-slate-700
              h3.text-sm.font-semibold.text-white.mb-3 Create New Bot
              form.space-y-3(@submit.prevent="handleCreateBot")
                .grid.grid-cols-2.gap-3
                  div
                    label.text-xs.text-gray-400 Bot Username
                    input.input.w-full(
                      v-model="newBotUsername"
                      type="text"
                      placeholder="my-bot"
                      required
                      minlength="1"
                      maxlength="50"
                      :disabled="creatingBot"
                    )
                  div
                    label.text-xs.text-gray-400 Webhook URL
                    input.input.w-full(
                      v-model="newBotWebhook"
                      type="url"
                      placeholder="https://..."
                      :disabled="creatingBot"
                    )
                .grid.grid-cols-2.gap-3
                  div
                    label.text-xs.text-gray-400 Logo (optional)
                    select.input.w-full(
                      v-model="newBotLogo"
                      :disabled="creatingBot"
                    )
                      option(:value="null") No logo
                      option(
                        v-for="logo in availableLogos"
                        :key="logo"
                        :value="logo"
                      ) {{ logo }}
                  div
                    label.text-xs.text-gray-400 Emoji (optional)
                    input.input.w-full(
                      v-model="newBotEmoji"
                      type="text"
                      placeholder="🤖"
                      maxlength="2"
                      :disabled="creatingBot"
                    )
                button.btn.btn-primary.w-full(
                  type="submit"
                  :disabled="creatingBot || !newBotUsername"
                ) {{ creatingBot ? 'Creating...' : 'Create Bot' }}
              .text-green-500.text-sm(v-if="botCreateSuccess") Bot created successfully! API Key: {{ lastCreatedBotApiKey }}
              .text-red-500.text-sm(v-if="botCreateError") {{ botCreateError }}

            //- Bots List
            .space-y-2(v-if="userBots.length > 0")
              h3.text-sm.font-semibold.text-white My Bots
              .bg-slate-800.p-3.rounded-lg.border.border-slate-700(
                v-for="bot in userBots"
                :key="bot.username"
              )
                .flex.items-center.justify-between
                  .flex.items-center.space-x-3
                    .w-10.h-10.flex.items-center.justify-center.bg-slate-700.rounded
                      img(
                        v-if="bot.logo"
                        :src="`${apiBaseUrl}/public/images/${bot.logo}`"
                        :alt="bot.username"
                        class="w-full h-full object-contain"
                      )
                      span(v-else-if="bot.emoji") {{ bot.emoji }}
                      span.text-sm.text-gray-300(v-else) 🤖
                    div
                      p.text-sm.font-medium.text-white {{ bot.username }}
                      p.text-xs.text-gray-400.font-mono(v-if="bot.webhook_url") {{ bot.webhook_url }}
                      p.text-xs.text-gray-500(v-else) No webhook configured
                  button.btn.btn-secondary.text-red-400.text-sm.px-3.py-1(
                    @click="handleDeleteBot(bot.username)"
                    :disabled="deletingBot === bot.username"
                    class="hover:bg-red-900"
                  ) {{ deletingBot === bot.username ? 'Deleting...' : 'Delete' }}
              .text-red-500.text-sm(v-if="botDeleteError") {{ botDeleteError }}
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import apiClient from '../api/client'
import ConfirmModal from '../components/ConfirmModal.vue'
import TopNav from '../components/TopNav.vue'

export default {
  name: 'Settings',
  components: {
    ConfirmModal,
    TopNav
  },
  setup() {
    const router = useRouter()
    const usersStore = useUsersStore()
    const { currentUser, apiKey, logout, fetchCurrentUser, updateUsername, updateLogo, updateWebhook, regenerateApiKey } = useAuth()

    const { availableLogos } = storeToRefs(usersStore)

    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const showApiKey = ref(false)
    const apiKeyCopied = ref(false)
    const logoUpdateSuccess = ref(false)
    const logoUpdateError = ref('')
    const cardOpacity = ref(1)
    const newUsername = ref('')
    const usernameUpdateLoading = ref(false)
    const usernameUpdateSuccess = ref(false)
    const usernameUpdateError = ref('')
    const isEditingUsername = ref(false)
    const usernameInput = ref(null)
    const showLogoDropdown = ref(false)
    const showRegenerateConfirm = ref(false)
    const regeneratingApiKey = ref(false)
    const apiKeyRegenerateSuccess = ref(false)
    const apiKeyRegenerateError = ref('')
    const isEditingWebhook = ref(false)
    const newWebhookUrl = ref('')
    const webhookUpdateLoading = ref(false)
    const webhookUpdateSuccess = ref(false)
    const webhookUpdateError = ref('')
    const webhookInput = ref(null)

    // Bot management
    const userBots = ref([])
    const newBotUsername = ref('')
    const newBotWebhook = ref('')
    const newBotLogo = ref(null)
    const newBotEmoji = ref('')
    const creatingBot = ref(false)
    const botCreateSuccess = ref(false)
    const botCreateError = ref('')
    const lastCreatedBotApiKey = ref('')
    const deletingBot = ref(null)
    const botDeleteError = ref('')

    const loadUserBots = async () => {
      try {
        const allUsers = await apiClient.getAllUsersAdmin()
        // Filter to only show bots (assuming there's a way to identify which bots belong to the current user)
        // For now, we'll show all bots. In production, you'd want to filter by creator/owner
        userBots.value = allUsers.filter(user => user.bot === true)
      } catch (err) {
        console.error('Failed to load bots:', err)
      }
    }

    onMounted(async () => {
      // If currentUser is not populated, fetch from API
      if (!currentUser.value) {
        try {
          await fetchCurrentUser()
        } catch (err) {
          console.error('Failed to load user:', err)
        }
      }

      try {
        await usersStore.loadAvailableLogos()
      } catch (err) {
        console.error('Failed to load logos:', err)
      }

      // Load user bots
      await loadUserBots()

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        showLogoDropdown.value = false
      })
    })

    const handleUpdateLogo = async (logo) => {
      logoUpdateSuccess.value = false
      logoUpdateError.value = ''

      try {
        await updateLogo(logo)
        logoUpdateSuccess.value = true

        // Clear success message after 3 seconds
        setTimeout(() => {
          logoUpdateSuccess.value = false
        }, 3000)
      } catch (err) {
        logoUpdateError.value = err.response?.data?.detail || 'Failed to update logo'
      }
    }

    const toggleLogoDropdown = (event) => {
      event.stopPropagation()
      showLogoDropdown.value = !showLogoDropdown.value
    }

    const selectLogo = async (logo) => {
      await handleUpdateLogo(logo)
      showLogoDropdown.value = false
    }

    const startEditingUsername = async () => {
      isEditingUsername.value = true
      newUsername.value = currentUser.value?.username || ''
      await nextTick()
      usernameInput.value?.focus()
    }

    const cancelUsernameEdit = () => {
      // Only cancel if not submitting
      if (!usernameUpdateLoading.value) {
        setTimeout(() => {
          isEditingUsername.value = false
          newUsername.value = ''
          usernameUpdateError.value = ''
        }, 200)
      }
    }

    const handleUsernameUpdate = async () => {
      usernameUpdateLoading.value = true
      usernameUpdateSuccess.value = false
      usernameUpdateError.value = ''

      try {
        await updateUsername(newUsername.value)

        usernameUpdateSuccess.value = true
        isEditingUsername.value = false
        newUsername.value = ''

        // Clear success message after 3 seconds
        setTimeout(() => {
          usernameUpdateSuccess.value = false
        }, 3000)
      } catch (err) {
        usernameUpdateError.value = err.response?.data?.detail || 'Failed to update username'
      } finally {
        usernameUpdateLoading.value = false
      }
    }

    const copyApiKey = async () => {
      try {
        await navigator.clipboard.writeText(apiKey.value)
        apiKeyCopied.value = true

        // Reset the button text after 2 seconds
        setTimeout(() => {
          apiKeyCopied.value = false
        }, 2000)
      } catch (err) {
        console.error('Failed to copy API key:', err)
      }
    }

    const handleRegenerateApiKey = () => {
      showRegenerateConfirm.value = true
    }

    const confirmRegenerateApiKey = async () => {
      regeneratingApiKey.value = true
      apiKeyRegenerateSuccess.value = false
      apiKeyRegenerateError.value = ''

      try {
        await regenerateApiKey()

        apiKeyRegenerateSuccess.value = true
        showRegenerateConfirm.value = false

        // Clear success message after 5 seconds
        setTimeout(() => {
          apiKeyRegenerateSuccess.value = false
        }, 5000)
      } catch (err) {
        apiKeyRegenerateError.value = err.response?.data?.detail || 'Failed to regenerate API key'
        showRegenerateConfirm.value = false
      } finally {
        regeneratingApiKey.value = false
      }
    }

    const startEditingWebhook = async () => {
      isEditingWebhook.value = true
      newWebhookUrl.value = currentUser.value?.webhook_url || ''
      await nextTick()
      webhookInput.value?.focus()
    }

    const cancelWebhookEdit = () => {
      if (!webhookUpdateLoading.value) {
        setTimeout(() => {
          isEditingWebhook.value = false
          newWebhookUrl.value = ''
          webhookUpdateError.value = ''
        }, 200)
      }
    }

    const handleWebhookUpdate = async () => {
      webhookUpdateLoading.value = true
      webhookUpdateSuccess.value = false
      webhookUpdateError.value = ''

      try {
        await updateWebhook(newWebhookUrl.value || null)

        webhookUpdateSuccess.value = true
        isEditingWebhook.value = false
        newWebhookUrl.value = ''

        // Clear success message after 3 seconds
        setTimeout(() => {
          webhookUpdateSuccess.value = false
        }, 3000)
      } catch (err) {
        webhookUpdateError.value = err.response?.data?.detail || 'Failed to update webhook URL'
      } finally {
        webhookUpdateLoading.value = false
      }
    }

    const handleCreateBot = async () => {
      creatingBot.value = true
      botCreateSuccess.value = false
      botCreateError.value = ''
      lastCreatedBotApiKey.value = ''

      try {
        const result = await apiClient.createBot(
          newBotUsername.value,
          newBotWebhook.value || null,
          newBotLogo.value,
          newBotEmoji.value || null
        )

        botCreateSuccess.value = true
        lastCreatedBotApiKey.value = result.api_key

        // Clear form
        newBotUsername.value = ''
        newBotWebhook.value = ''
        newBotLogo.value = null
        newBotEmoji.value = ''

        // Reload bots list
        await loadUserBots()

        // Clear success message after 10 seconds
        setTimeout(() => {
          botCreateSuccess.value = false
          lastCreatedBotApiKey.value = ''
        }, 10000)
      } catch (err) {
        botCreateError.value = err.response?.data?.detail || 'Failed to create bot'
      } finally {
        creatingBot.value = false
      }
    }

    const handleDeleteBot = async (username) => {
      deletingBot.value = username
      botDeleteError.value = ''

      try {
        await apiClient.deleteUser(username)

        // Reload bots list
        await loadUserBots()
      } catch (err) {
        botDeleteError.value = err.response?.data?.detail || 'Failed to delete bot'
      } finally {
        deletingBot.value = null
      }
    }

    return {
      apiBaseUrl,
      currentUser,
      apiKey,
      availableLogos,
      showApiKey,
      apiKeyCopied,
      logoUpdateSuccess,
      logoUpdateError,
      cardOpacity,
      newUsername,
      usernameUpdateLoading,
      usernameUpdateSuccess,
      usernameUpdateError,
      isEditingUsername,
      usernameInput,
      showLogoDropdown,
      showRegenerateConfirm,
      regeneratingApiKey,
      apiKeyRegenerateSuccess,
      apiKeyRegenerateError,
      isEditingWebhook,
      newWebhookUrl,
      webhookUpdateLoading,
      webhookUpdateSuccess,
      webhookUpdateError,
      webhookInput,
      toggleLogoDropdown,
      selectLogo,
      handleUsernameUpdate,
      startEditingUsername,
      cancelUsernameEdit,
      copyApiKey,
      handleRegenerateApiKey,
      confirmRegenerateApiKey,
      startEditingWebhook,
      cancelWebhookEdit,
      handleWebhookUpdate,
      userBots,
      newBotUsername,
      newBotWebhook,
      newBotLogo,
      newBotEmoji,
      creatingBot,
      botCreateSuccess,
      botCreateError,
      lastCreatedBotApiKey,
      deletingBot,
      botDeleteError,
      handleCreateBot,
      handleDeleteBot
    }
  }
}
</script>
