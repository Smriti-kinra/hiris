import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.VITE_API_ORIGIN || env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '')
  const proxy = apiOrigin
    ? {
        '/api': apiOrigin,
        '/uploads': apiOrigin,
      }
    : undefined

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT || 5176),
      proxy,
    },
  }
})
