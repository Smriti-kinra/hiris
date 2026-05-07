/**
 * vite.config.base.js — Shared Vite config factory for all HIRIS portals.
 * Each portal config calls createPortalConfig({ portal, port, input, outDir })
 * and gets a fully configured Vite instance with:
 *  - correct dev port
 *  - /api and /uploads proxy to backend
 *  - portal-specific HTML entry point
 *  - isolated build output directory
 */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Custom Vite plugin: serves the portal's HTML file as the SPA root during dev.
 * Without this, Vite would always serve index.html regardless of which config is active.
 */
function portalHtmlPlugin(htmlFile) {
  return {
    name: 'portal-html-root',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve portal HTML for root and any unmatched non-asset route
        if (req.url === '/' || (!req.url.includes('.') && !req.url.startsWith('/api'))) {
          req.url = `/${htmlFile}`
        }
        next()
      })
    },
  }
}

export function createPortalConfig({ portal, port, htmlFile, outDir }) {
  return defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    // Resolve API proxy origin
    const apiOrigin =
      env.VITE_API_ORIGIN ||
      (env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : null) ||
      'http://localhost:3001'

    return {
      plugins: [
        react(),
        portalHtmlPlugin(htmlFile),
      ],
      server: {
        port: Number(env.VITE_DEV_PORT || port),
        strictPort: true,
        proxy: {
          '/api':     { target: apiOrigin, changeOrigin: true, secure: false },
          '/uploads': { target: apiOrigin, changeOrigin: true, secure: false },
        },
      },
      build: {
        outDir: outDir || `dist/${portal}`,
        emptyOutDir: true,
        rollupOptions: {
          input: htmlFile,
        },
      },
      // Inject portal ID as a compile-time constant
      define: {
        __PORTAL_ID__: JSON.stringify(portal),
      },
    }
  })
}
