<template>
  <div class="websocket-debug" v-if="showDebug">
    <div class="debug-header" @click="expanded = !expanded">
      <span class="debug-title">🔧 WebSocket Debug</span>
      <span class="debug-status" :class="statusClass">{{ statusText }}</span>
    </div>
    <div v-if="expanded" class="debug-content">
      <div class="debug-info">
        <div><strong>Connected:</strong> {{ connected ? '✅' : '❌' }}</div>
        <div><strong>Messages in store:</strong> {{ messageCount }}</div>
        <div><strong>Last activity:</strong> {{ lastActivity }}</div>
      </div>
      <div class="debug-log">
        <div v-for="(log, index) in logs" :key="index" :class="`log-${log.type}`">
          [{{ log.time }}] {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import { storeToRefs } from 'pinia'
import { useWebSocketStore } from '../stores/websocket'

export default {
  name: 'WebSocketDebug',
  setup() {
    const wsStore = useWebSocketStore()
    const { connected, messages } = storeToRefs(wsStore)
    const expanded = ref(true)
    const showDebug = ref(true)
    const logs = ref([])
    const lastActivity = ref('Never')

    const addLog = (message, type = 'info') => {
      const now = new Date()
      logs.value.unshift({
        time: now.toLocaleTimeString(),
        message,
        type
      })
      if (logs.value.length > 20) {
        logs.value = logs.value.slice(0, 20)
      }
      lastActivity.value = now.toLocaleTimeString()
    }

    const statusText = computed(() => {
      return connected.value ? 'Connected' : 'Disconnected'
    })

    const statusClass = computed(() => {
      return connected.value ? 'status-connected' : 'status-disconnected'
    })

    const messageCount = computed(() => messages.value.length)

    // Watch connection status
    watch(connected, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog(`Connection status changed: ${newVal ? 'CONNECTED' : 'DISCONNECTED'}`, newVal ? 'success' : 'error')
      }
    })

    // Watch messages
    watch(messages, (newMessages, oldMessages) => {
      const newCount = newMessages.length
      const oldCount = oldMessages ? oldMessages.length : 0
      if (newCount > oldCount) {
        const lastMsg = newMessages[newCount - 1]
        addLog(`New message received from ${lastMsg.from_username}: "${lastMsg.content?.substring(0, 50)}${lastMsg.content?.length > 50 ? '...' : ''}"`, 'message')
      }
    }, { deep: true })

    onMounted(() => {
      addLog('WebSocket Debug component mounted', 'info')

      // Override console methods to capture logs
      const originalLog = console.log
      const originalError = console.error
      const originalDebug = console.debug

      console.log = (...args) => {
        originalLog(...args)
        const msg = args.join(' ')
        if (msg.includes('WebSocket:') || msg.includes('Centrifugo')) {
          addLog(msg, 'info')
        }
      }

      console.error = (...args) => {
        originalError(...args)
        const msg = args.join(' ')
        if (msg.includes('WebSocket:') || msg.includes('Centrifugo')) {
          addLog(msg, 'error')
        }
      }

      console.debug = (...args) => {
        originalDebug(...args)
        const msg = args.join(' ')
        if (msg.includes('WebSocket:') || msg.includes('Centrifugo') || msg.includes('Received')) {
          addLog(msg, 'debug')
        }
      }
    })

    return {
      connected,
      expanded,
      showDebug,
      logs,
      statusText,
      statusClass,
      messageCount,
      lastActivity
    }
  }
}
</script>

<style scoped>
.websocket-debug {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #444;
  border-radius: 8px;
  color: white;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.debug-header {
  padding: 10px;
  background: #222;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-title {
  font-weight: bold;
}

.debug-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-connected {
  background: #0f0;
  color: #000;
}

.status-disconnected {
  background: #f00;
  color: #fff;
}

.debug-content {
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.debug-info {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
}

.debug-info div {
  margin: 4px 0;
}

.debug-log {
  max-height: 200px;
  overflow-y: auto;
}

.debug-log > div {
  margin: 2px 0;
  padding: 2px 4px;
  border-radius: 2px;
}

.log-info {
  color: #aaa;
}

.log-success {
  color: #0f0;
  background: rgba(0, 255, 0, 0.1);
}

.log-error {
  color: #f00;
  background: rgba(255, 0, 0, 0.1);
}

.log-message {
  color: #0ff;
  background: rgba(0, 255, 255, 0.1);
}

.log-debug {
  color: #888;
  font-size: 11px;
}
</style>