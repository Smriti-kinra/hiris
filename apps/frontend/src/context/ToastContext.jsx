import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _id = 0

/**
 * Toast types: 'success' | 'error' | 'info' | 'warning'
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 3800) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  // Convenience shorthands
  toast.success = (msg, dur) => toast(msg, 'success', dur)
  toast.error   = (msg, dur) => toast(msg, 'error',   dur ?? 5500)
  toast.warning = (msg, dur) => toast(msg, 'warning', dur)
  toast.info    = (msg, dur) => toast(msg, 'info',    dur)

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ── Visual component ── */

const ICONS = {
  success: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  warning: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
}

const COLORS = {
  success: { bg: 'var(--accent-green)',  text: '#fff' },
  error:   { bg: 'var(--accent-red)',    text: '#fff' },
  warning: { bg: 'var(--accent-amber)',  text: '#fff' },
  info:    { bg: 'var(--brand)',         text: '#fff' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  const { bg, text } = COLORS[toast.type] || COLORS.info
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: bg, color: text,
        padding: '11px 16px', borderRadius: 10,
        fontSize: 13.5, fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        minWidth: 240, maxWidth: 380,
        pointerEvents: 'all',
        animation: 'toastIn 0.25s ease',
      }}
    >
      <span style={{ flexShrink: 0, opacity: 0.9 }}>{ICONS[toast.type]}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'inherit', opacity: 0.7, fontSize: 18, lineHeight: 1,
          padding: 0, flexShrink: 0,
        }}
      >×</button>
    </div>
  )
}
