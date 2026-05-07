import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme]     = useState(() => localStorage.getItem('hiris_theme') || 'light')

  /* ── Apply theme class to document root ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hiris_theme', theme)
  }, [theme])

  /* ── Restore session from JWT cookie on mount ── */
  useEffect(() => {
    // Clear any stale Phase-2 localStorage session
    localStorage.removeItem('hiris_user')

    apiFetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setUser(data.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res  = await apiFetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
