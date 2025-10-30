import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    confirmDialog: null,
    confirmResolve: null
  }),

  actions: {
    /**
     * Show a notification
     * @param {Object} options - Notification options
     * @param {string} options.type - Type of notification (success, error, warning, info)
     * @param {string} options.message - Message to display
     * @param {string} [options.title] - Optional title
     * @param {number} [options.duration] - Duration in ms (default 5000, 0 for persistent)
     */
    showNotification({ type = 'info', message, title = null, duration = 5000 }) {
      const id = Date.now() + Math.random()
      const notification = {
        id,
        type,
        message,
        title
      }

      this.notifications.push(notification)

      // Auto-remove after duration (unless duration is 0)
      if (duration > 0) {
        setTimeout(() => {
          this.removeNotification(id)
        }, duration)
      }

      return id
    },

    // Convenience methods
    success(message, title = null, duration = 5000) {
      return this.showNotification({ type: 'success', message, title, duration })
    },

    error(message, title = null, duration = 7000) {
      return this.showNotification({ type: 'error', message, title, duration })
    },

    warning(message, title = null, duration = 6000) {
      return this.showNotification({ type: 'warning', message, title, duration })
    },

    info(message, title = null, duration = 5000) {
      return this.showNotification({ type: 'info', message, title, duration })
    },

    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },

    clearAllNotifications() {
      this.notifications = []
    },

    /**
     * Show a confirmation dialog
     * @param {Object} options - Dialog options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} [options.type] - Dialog type (warning for destructive actions)
     * @param {string} [options.confirmText] - Confirm button text
     * @param {string} [options.cancelText] - Cancel button text
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    async confirm({
      title,
      message,
      type = 'info',
      confirmText = 'Confirm',
      cancelText = 'Cancel'
    }) {
      return new Promise((resolve) => {
        this.confirmDialog = {
          title,
          message,
          type,
          confirmText,
          cancelText
        }
        this.confirmResolve = resolve
      })
    },

    // Convenience method for destructive confirmations
    async confirmDelete(itemName = 'this item') {
      return this.confirm({
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
        type: 'warning',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      })
    },

    proceedConfirmation() {
      if (this.confirmResolve) {
        this.confirmResolve(true)
        this.confirmResolve = null
      }
      this.confirmDialog = null
    },

    cancelConfirmation() {
      if (this.confirmResolve) {
        this.confirmResolve(false)
        this.confirmResolve = null
      }
      this.confirmDialog = null
    }
  }
})