import { onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWebSocketStore } from '../stores/websocket'

export function useWebSocket() {
  const wsStore = useWebSocketStore()
  const { connected, messages } = storeToRefs(wsStore)

  // Cleanup on component unmount
  onUnmounted(() => {
    // Note: We don't automatically disconnect on unmount anymore
    // since the WebSocket is now shared across the app.
    // Call disconnect() manually when the app/user logs out if needed.
  })

  return {
    connected,
    messages,
    connect: wsStore.connect,
    sendMessage: wsStore.sendMessage,
    disconnect: wsStore.disconnect,
    clearMessages: wsStore.clearMessages,
    resetReconnection: wsStore.resetReconnection
  }
}
