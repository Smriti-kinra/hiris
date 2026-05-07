/**
 * Shared API fetch helper.
 * - Uses VITE_API_BASE_URL when present, otherwise falls back to relative /api
 * - Always sends cookies (credentials: 'include') so the JWT cookie is forwarded
 * - Always sets Content-Type: application/json for POST/PUT/PATCH
 */
const apiBase = import.meta.env.VITE_API_BASE_URL
export const API = (apiBase || '/api').replace(/\/$/, '')

export function apiUrl(path = '') {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`
}

export function assetUrl(path = '') {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const assetBase = (import.meta.env.VITE_ASSET_BASE_URL || API.replace(/\/api$/, '') || '').replace(/\/$/, '')
  return `${assetBase}/${String(path).replace(/^\//, '')}`
}

export async function apiFetch(path, options = {}) {
  const isBodyRequest = ['POST', 'PUT', 'PATCH'].includes((options.method || '').toUpperCase())
  const isFormData = options.body instanceof FormData

  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      ...(isBodyRequest && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  return res
}
