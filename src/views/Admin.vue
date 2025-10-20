<template lang="pug">
.admin-page.min-h-screen.bg-slate-950
  TopNav(title="Admin Dashboard")

  .container.mx-auto.px-4.py-8
    .max-w-6xl.mx-auto

      //- Admin Check
      .card(v-if="!currentUser?.admin")
        .text-center.py-8
          p.text-red-500.text-xl Access Denied
          p.text-gray-400.mt-2 You must be an administrator to access this page.

      //- Admin Content
      .space-y-6(v-else)
        //- Stats
        .grid.grid-cols-1.sm_grid-cols-2.lg_grid-cols-3.gap-4
          .card
            p.text-sm.text-gray-400 Total Users
            p.text-2xl.font-bold.text-white {{ allUsers.length }}
          .card
            p.text-sm.text-gray-400 Bot Users
            p.text-2xl.font-bold.text-white {{ allUsers.filter(u => u.bot).length }}
          .card
            p.text-sm.text-gray-400 Regular Users
            p.text-2xl.font-bold.text-white {{ allUsers.filter(u => !u.bot && !u.viewer).length }}

        //- Invite User Form
        .card
          h2.text-xl.font-semibold.text-white.mb-4 Invite User by Email

          .text-red-500.text-sm.mb-4(v-if="inviteError") {{ inviteError }}
          .text-green-500.text-sm.mb-4(v-if="inviteSuccess") {{ inviteSuccess }}

          form.space-y-4(@submit.prevent="handleInviteUser")
            .grid.grid-cols-1.md_grid-cols-3.gap-4
              div
                label.text-sm.text-gray-400.block.mb-2 Email Address
                input.input.w-full(
                  v-model="inviteForm.email"
                  type="email"
                  placeholder="user@example.com"
                  required
                )
              div
                label.text-sm.text-gray-400.block.mb-2 Role
                select.input.w-full(v-model="inviteForm.role" required)
                  option(value="member") Member
                  option(value="viewer") Viewer
                  option(value="admin") Admin
              div
                label.text-sm.text-gray-400.block.mb-2 Signup URL
                input.input.w-full(
                  v-model="inviteForm.signupUrl"
                  type="url"
                  placeholder="https://chat.tokenbowl.ai/signup"
                  required
                )

            .flex.justify-end
              button.btn.btn-primary.w-full.sm_w-auto(
                type="submit"
                :disabled="inviting"
              ) {{ inviting ? 'Sending Invite...' : 'Send Invite' }}

        //- Create Bot Form
        .card
          h2.text-xl.font-semibold.text-white.mb-4 Create Bot

          .text-red-500.text-sm.mb-4(v-if="botError") {{ botError }}
          .text-green-500.text-sm.mb-4(v-if="botSuccess") {{ botSuccess }}

          form.space-y-4(@submit.prevent="handleCreateBot")
            .grid.grid-cols-1.md_grid-cols-2.gap-4
              div
                label.text-sm.text-gray-400.block.mb-2 Bot Username
                input.input.w-full(
                  v-model="botForm.username"
                  type="text"
                  placeholder="my-bot"
                  required
                )
              div
                label.text-sm.text-gray-400.block.mb-2 Webhook URL
                input.input.w-full(
                  v-model="botForm.webhookUrl"
                  type="url"
                  placeholder="https://your-bot-endpoint.com/webhook"
                )

            .grid.grid-cols-1.md_grid-cols-2.gap-4
              div
                label.text-sm.text-gray-400.block.mb-2 Logo
                select.input.w-full(v-model="botForm.logo")
                  option(:value="null") No logo
                  option(
                    v-for="logo in availableLogos"
                    :key="logo"
                    :value="logo"
                  ) {{ logo }}
              div
                label.text-sm.text-gray-400.block.mb-2 Emoji
                input.input.w-full(
                  v-model="botForm.emoji"
                  type="text"
                  placeholder="🤖"
                  maxlength="2"
                )

            .flex.justify-end
              button.btn.btn-primary.w-full.sm_w-auto(
                type="submit"
                :disabled="creatingBot"
              ) {{ creatingBot ? 'Creating Bot...' : 'Create Bot' }}

        //- User List
        .card
          .flex.flex-col.sm_flex-row.items-start.sm_items-center.justify-between.mb-4.gap-3
            h2.text-xl.font-semibold.text-white All Users
            button.btn.btn-primary.w-full.sm_w-auto(@click="loadUsers" :disabled="loading") {{ loading ? 'Refreshing...' : 'Refresh' }}

          .text-red-500.text-sm.mb-4(v-if="error") {{ error }}

          //- Desktop Table View (hidden on mobile)
          .hidden.lg_block.overflow-x-auto
            table.w-full
              thead
                tr.border-b.border-slate-700
                  th.text-left.p-3.text-sm.text-gray-400 User
                  th.text-left.p-3.text-sm.text-gray-400 ID
                  th.text-left.p-3.text-sm.text-gray-400 Email
                  th.text-left.p-3.text-sm.text-gray-400 Type
                  th.text-left.p-3.text-sm.text-gray-400 Webhook
                  th.text-left.p-3.text-sm.text-gray-400 Created
                  th.text-right.p-3.text-sm.text-gray-400 Actions
              tbody
                tr.border-b.border-slate-800(
                  v-for="user in sortedUsers"
                  :key="user.id"
                  :class="editingUser === user.id ? 'bg-slate-800' : 'hover:bg-slate-900'"
                )
                  //- User Info
                  td.p-3
                    .flex.items-center.space-x-3
                      .w-10.h-10.flex.items-center.justify-center.bg-slate-700.rounded.flex-shrink-0
                        img(
                          v-if="user.logo"
                          :src="`${apiBaseUrl}/public/images/${user.logo}`"
                          :alt="user.username"
                          class="w-full h-full object-contain"
                        )
                        span(v-else-if="user.emoji") {{ user.emoji }}
                        span.text-sm.text-gray-300(v-else) {{ user.username?.[0]?.toUpperCase() }}
                      div
                        p.text-sm.font-medium.text-white {{ user.username }}
                        .flex.items-center.gap-1.mt-1
                          .text-xs.bg-purple-600.text-white.rounded(v-if="user.bot" class="px-2 py-0.5") BOT
                          .text-xs.bg-blue-600.text-white.rounded(v-if="user.admin" class="px-2 py-0.5") ADMIN
                          .text-xs.bg-gray-600.text-white.rounded(v-if="user.viewer" class="px-2 py-0.5") VIEWER

                  //- ID
                  td.p-3
                    p.text-xs.text-gray-400.font-mono.truncate.max-w-xs {{ user.id }}

                  //- Email
                  td.p-3
                    p.text-sm.text-gray-300 {{ user.email || '-' }}

                  //- Type
                  td.p-3
                    p.text-sm.text-gray-300(v-if="user.bot") Bot
                    p.text-sm.text-gray-300(v-else-if="user.viewer") Viewer
                    p.text-sm.text-gray-300(v-else) User

                  //- Webhook
                  td.p-3
                    p.text-xs.text-gray-400.font-mono.truncate.max-w-xs(v-if="user.webhook_url") {{ user.webhook_url }}
                    p.text-sm.text-gray-500(v-else) -

                  //- Created
                  td.p-3
                    p.text-sm.text-gray-400 {{ formatDate(user.created_at) }}

                  //- Actions
                  td.p-3
                    .flex.items-center.justify-end.gap-2
                      button.btn.btn-secondary.text-sm.px-3.py-1(
                        @click="startEditUser(user)"
                        :disabled="deleting === user.id"
                      ) Edit
                      button.btn.btn-secondary.text-red-400.text-sm.px-3.py-1(
                        @click="handleDeleteUser(user.id)"
                        :disabled="deleting === user.id || user.id === currentUser?.id"
                        class="hover:bg-red-900"
                      ) {{ deleting === user.id ? '...' : 'Delete' }}

          //- Mobile Card View (shown on mobile/tablet)
          .lg_hidden.space-y-3
            .bg-slate-800.rounded-lg.p-4.border.border-slate-700(
              v-for="user in sortedUsers"
              :key="user.id"
            )
              .flex.items-start.justify-between.mb-3
                .flex.items-center.space-x-3
                  .w-12.h-12.flex.items-center.justify-center.bg-slate-700.rounded.flex-shrink-0
                    img(
                      v-if="user.logo"
                      :src="`${apiBaseUrl}/public/images/${user.logo}`"
                      :alt="user.username"
                      class="w-full h-full object-contain"
                    )
                    span.text-xl(v-else-if="user.emoji") {{ user.emoji }}
                    span.text-gray-300(v-else) {{ user.username?.[0]?.toUpperCase() }}
                  div
                    p.font-medium.text-white {{ user.username }}
                    .flex.flex-wrap.items-center.gap-1.mt-1
                      .text-xs.bg-purple-600.text-white.rounded(v-if="user.bot" class="px-2 py-0.5") BOT
                      .text-xs.bg-blue-600.text-white.rounded(v-if="user.admin" class="px-2 py-0.5") ADMIN
                      .text-xs.bg-gray-600.text-white.rounded(v-if="user.viewer" class="px-2 py-0.5") VIEWER

              .space-y-2.text-sm
                div(v-if="user.email")
                  p.text-gray-400 Email
                  p.text-gray-300 {{ user.email }}
                div
                  p.text-gray-400 ID
                  p.text-xs.text-gray-300.font-mono.break-all {{ user.id }}
                div(v-if="user.webhook_url")
                  p.text-gray-400 Webhook
                  p.text-xs.text-gray-300.font-mono.break-all {{ user.webhook_url }}
                div
                  p.text-gray-400 Created
                  p.text-gray-300 {{ formatDate(user.created_at) }}

              .flex.gap-2.mt-4
                button.btn.btn-secondary.text-sm.flex-1(
                  @click="startEditUser(user)"
                  :disabled="deleting === user.id"
                ) Edit
                button.btn.btn-secondary.text-red-400.text-sm.flex-1(
                  @click="handleDeleteUser(user.id)"
                  :disabled="deleting === user.id || user.id === currentUser?.id"
                  class="hover:bg-red-900"
                ) {{ deleting === user.id ? '...' : 'Delete' }}

        //- Edit User Modal
        .fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50(
          v-if="editingUser"
          @click.self="cancelEdit"
        )
          .bg-slate-900.rounded-lg.p-6.max-w-2xl.w-full.mx-4.max-h-screen.overflow-y-auto
            h3.text-xl.font-semibold.text-white.mb-4 Edit User: {{ selectedUser?.username }}

            .text-red-500.text-sm.mb-4(v-if="editError") {{ editError }}
            .text-green-500.text-sm.mb-4(v-if="editSuccess") User updated successfully!

            form.space-y-4(@submit.prevent="handleUpdateUser")
              div
                label.text-sm.text-gray-400.block.mb-2 Username
                input.input.w-full(
                  v-model="editForm.username"
                  type="text"
                  placeholder="username"
                  maxlength="50"
                  required
                )
                p.text-xs.text-gray-500.mt-1 Changing username will update the user's identifier across the system

              .grid.grid-cols-1.sm_grid-cols-2.gap-4
                div
                  label.text-sm.text-gray-400 Email
                  input.input.w-full(
                    v-model="editForm.email"
                    type="email"
                    placeholder="user@example.com"
                  )
                div
                  label.text-sm.text-gray-400 Webhook URL
                  input.input.w-full(
                    v-model="editForm.webhook_url"
                    type="url"
                    placeholder="https://..."
                  )

              .grid.grid-cols-1.sm_grid-cols-2.gap-4
                div
                  label.text-sm.text-gray-400 Logo
                  select.input.w-full(v-model="editForm.logo")
                    option(:value="null") No logo
                    option(
                      v-for="logo in availableLogos"
                      :key="logo"
                      :value="logo"
                    ) {{ logo }}
                div
                  label.text-sm.text-gray-400 Emoji
                  input.input.w-full(
                    v-model="editForm.emoji"
                    type="text"
                    placeholder="🤖"
                    maxlength="2"
                  )

              .grid.grid-cols-1.sm_grid-cols-3.gap-4
                label.flex.items-center.space-x-2(:class="selectedUser?.bot ? 'opacity-50' : 'cursor-pointer'")
                  input(
                    type="checkbox"
                    v-model="editForm.bot"
                    class="w-4 h-4"
                    disabled
                  )
                  span.text-sm.text-gray-300 Bot
                  span.text-xs.text-gray-500(v-if="selectedUser?.bot") (read-only)
                label.flex.items-center.space-x-2.cursor-pointer
                  input(
                    type="checkbox"
                    v-model="editForm.admin"
                    class="w-4 h-4"
                  )
                  span.text-sm.text-gray-300 Admin
                label.flex.items-center.space-x-2.cursor-pointer
                  input(
                    type="checkbox"
                    v-model="editForm.viewer"
                    class="w-4 h-4"
                  )
                  span.text-sm.text-gray-300 Viewer

              .flex.flex-col.sm_flex-row.justify-end.gap-3.mt-6
                button.btn.btn-secondary.w-full.sm_w-auto(
                  type="button"
                  @click="cancelEdit"
                ) Cancel
                button.btn.btn-primary.w-full.sm_w-auto(
                  type="submit"
                  :disabled="updating"
                ) {{ updating ? 'Updating...' : 'Update User' }}
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '../stores'
import { useAuth } from '../composables/useAuth'
import apiClient from '../api/client'
import TopNav from '../components/TopNav.vue'

export default {
  name: 'Admin',
  components: {
    TopNav
  },
  setup() {
    const usersStore = useUsersStore()
    const { currentUser } = useAuth()
    const { availableLogos } = storeToRefs(usersStore)

    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const allUsers = ref([])
    const loading = ref(false)
    const error = ref('')
    const editingUser = ref(null)
    const selectedUser = ref(null)
    const editForm = ref({
      username: '',
      email: null,
      webhook_url: null,
      logo: null,
      emoji: null,
      bot: false,
      admin: false,
      viewer: false
    })
    const updating = ref(false)
    const editError = ref('')
    const editSuccess = ref(false)
    const deleting = ref(null)

    // Invite form state
    const inviteForm = ref({
      email: '',
      role: 'member',
      signupUrl: window.location.origin + '/signup'
    })
    const inviting = ref(false)
    const inviteError = ref('')
    const inviteSuccess = ref('')

    // Bot form state
    const botForm = ref({
      username: '',
      webhookUrl: null,
      logo: null,
      emoji: null
    })
    const creatingBot = ref(false)
    const botError = ref('')
    const botSuccess = ref('')

    const sortedUsers = computed(() => {
      return [...allUsers.value].sort((a, b) => {
        // Sort by admin first, then bots, then regular users
        if (a.admin && !b.admin) return -1
        if (!a.admin && b.admin) return 1
        if (a.bot && !b.bot) return -1
        if (!a.bot && b.bot) return 1
        return a.username.localeCompare(b.username)
      })
    })

    const loadUsers = async () => {
      loading.value = true
      error.value = ''

      try {
        const users = await apiClient.getAllUsersAdmin()
        allUsers.value = users
      } catch (err) {
        error.value = err.response?.data?.detail || 'Failed to load users'
        console.error('Failed to load users:', err)
      } finally {
        loading.value = false
      }
    }

    const startEditUser = (user) => {
      selectedUser.value = user
      editingUser.value = user.id
      editForm.value = {
        username: user.username || '',
        email: user.email || null,
        webhook_url: user.webhook_url || null,
        logo: user.logo || null,
        emoji: user.emoji || null,
        bot: user.bot || false,
        admin: user.admin || false,
        viewer: user.viewer || false
      }
      editError.value = ''
      editSuccess.value = false
    }

    const cancelEdit = () => {
      editingUser.value = null
      selectedUser.value = null
      editForm.value = {
        username: '',
        email: null,
        webhook_url: null,
        logo: null,
        emoji: null,
        bot: false,
        admin: false,
        viewer: false
      }
      editError.value = ''
      editSuccess.value = false
    }

    const handleUpdateUser = async () => {
      updating.value = true
      editError.value = ''
      editSuccess.value = false

      try {
        // Build update payload with only changed fields
        const payload = {}

        if (editForm.value.username && editForm.value.username !== selectedUser.value.username) {
          payload.username = editForm.value.username
        }
        if (editForm.value.email !== selectedUser.value.email) {
          payload.email = editForm.value.email || null
        }
        if (editForm.value.webhook_url !== selectedUser.value.webhook_url) {
          payload.webhook_url = editForm.value.webhook_url || null
        }
        if (editForm.value.logo !== selectedUser.value.logo) {
          payload.logo = editForm.value.logo
        }
        if (editForm.value.emoji !== selectedUser.value.emoji) {
          payload.emoji = editForm.value.emoji || null
        }
        // Don't allow changing bot status - it's read-only
        // Bots must be created via POST /bots
        if (editForm.value.admin !== selectedUser.value.admin) {
          payload.admin = editForm.value.admin
        }
        if (editForm.value.viewer !== selectedUser.value.viewer) {
          payload.viewer = editForm.value.viewer
        }

        // Only update if there are changes
        if (Object.keys(payload).length > 0) {
          await apiClient.updateUserAdmin(selectedUser.value.id, payload)
        }

        editSuccess.value = true

        // Reload users
        await loadUsers()

        // Close modal after 1 second
        setTimeout(() => {
          cancelEdit()
        }, 1000)
      } catch (err) {
        editError.value = err.response?.data?.detail || 'Failed to update user'
      } finally {
        updating.value = false
      }
    }

    const handleDeleteUser = async (userId) => {
      // Find the user to get their username for confirmation
      const user = allUsers.value.find(u => u.id === userId)
      const username = user?.username || userId

      if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return
      }

      deleting.value = userId
      error.value = ''

      try {
        await apiClient.deleteUser(userId)
        await loadUsers()
      } catch (err) {
        error.value = err.response?.data?.detail || 'Failed to delete user'
      } finally {
        deleting.value = null
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const handleInviteUser = async () => {
      inviting.value = true
      inviteError.value = ''
      inviteSuccess.value = ''

      try {
        const response = await apiClient.inviteUserByEmail(
          inviteForm.value.email,
          inviteForm.value.role,
          inviteForm.value.signupUrl
        )

        inviteSuccess.value = response.message || `Invitation sent to ${inviteForm.value.email}`

        // Reset form after successful invite
        inviteForm.value.email = ''
        inviteForm.value.role = 'member'
        inviteForm.value.signupUrl = window.location.origin + '/signup'

        // Clear success message after 5 seconds
        setTimeout(() => {
          inviteSuccess.value = ''
        }, 5000)
      } catch (err) {
        inviteError.value = err.response?.data?.detail || 'Failed to send invitation'
      } finally {
        inviting.value = false
      }
    }

    const handleCreateBot = async () => {
      creatingBot.value = true
      botError.value = ''
      botSuccess.value = ''

      try {
        const response = await apiClient.createBot(
          botForm.value.username,
          botForm.value.webhookUrl,
          botForm.value.logo,
          botForm.value.emoji
        )

        botSuccess.value = `Bot "${botForm.value.username}" created successfully! API Key: ${response.api_key}`

        // Reset form after successful creation
        botForm.value.username = ''
        botForm.value.webhookUrl = null
        botForm.value.logo = null
        botForm.value.emoji = null

        // Reload users list to show the new bot
        await loadUsers()

        // Clear success message after 10 seconds (longer for API key)
        setTimeout(() => {
          botSuccess.value = ''
        }, 10000)
      } catch (err) {
        botError.value = err.response?.data?.detail || 'Failed to create bot'
      } finally {
        creatingBot.value = false
      }
    }

    onMounted(async () => {
      await loadUsers()
      await usersStore.loadAvailableLogos()
    })

    return {
      apiBaseUrl,
      currentUser,
      allUsers,
      sortedUsers,
      loading,
      error,
      editingUser,
      selectedUser,
      editForm,
      updating,
      editError,
      editSuccess,
      deleting,
      availableLogos,
      inviteForm,
      inviting,
      inviteError,
      inviteSuccess,
      botForm,
      creatingBot,
      botError,
      botSuccess,
      loadUsers,
      startEditUser,
      cancelEdit,
      handleUpdateUser,
      handleDeleteUser,
      handleInviteUser,
      handleCreateBot,
      formatDate
    }
  }
}
</script>
