<template lang="pug">
.modal-overlay(v-if="show" @click.self="onCancel")
  .modal-container
    .modal-content
      h3.text-xl.font-bold.text-white.mb-4 {{ title }}
      p.text-gray-300.mb-6 {{ message }}
      .flex.justify-end.space-x-3
        button.btn.btn-secondary(@click="onCancel" :disabled="loading") {{ cancelText }}
        button.btn(:class="confirmClass" @click="onConfirm" :disabled="loading") {{ loading ? 'Processing...' : confirmText }}
</template>

<script>
export default {
  name: 'ConfirmModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    confirmText: {
      type: String,
      default: 'Confirm'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    confirmClass: {
      type: String,
      default: 'bg-blue-600 text-white hover:bg-blue-700'
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    onConfirm() {
      this.$emit('confirm')
    },
    onCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 2px solid #334155;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content {
  position: relative;
}
</style>
