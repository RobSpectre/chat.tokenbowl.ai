import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pugPlugin from 'vite-plugin-pug'

export default defineConfig({
  plugins: [
    vue({
      template: {
        preprocessOptions: {
          plugins: [
            {
              name: 'pug',
              transform(code, id) {
                if (id.endsWith('.pug')) {
                  return {
                    code: code,
                    map: null
                  }
                }
              }
            }
          ]
        }
      }
    }),
    pugPlugin()
  ],
  server: {
    port: 3000,
    proxy: {
      '/public/images': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  // For GitHub Pages deployment
  // If deploying to https://username.github.io/repository-name/, set base to '/repository-name/'
  // If deploying to https://username.github.io/, leave base as '/'
  base: process.env.GITHUB_PAGES_BASE || '/'
})
