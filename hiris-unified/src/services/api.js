/**
 * Shared API fetch helper.
 * - Uses VITE_API_BASE_URL when present, otherwise falls back to relative /api
 * - Always sends cookies (credentials: 'include') so the JWT cookie is forwarded
 * - Always sets Content-Type: application/json for POST/PUT/PATCH
 */
// Uses VITE_API_BASE_URL from .env or defaults to /api
export const API = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiFetch(path, options = {}) {
  const isBodyRequest = ['POST', 'PUT', 'PATCH'].includes((options.method || '').toUpperCase())

  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isBodyRequest ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  return res
}
