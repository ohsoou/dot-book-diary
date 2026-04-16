'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  addToast: (opts: { message: string; variant: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DISMISS_AFTER_MS = 3000

const variantIconColor: Record<ToastVariant, string> = {
  success: '#7ca972',
  error: '#c85a54',
  info: '#a08866',
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const color = variantIconColor[variant]
  if (variant === 'success') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="0" y="6" width="2" height="2" fill={color} />
        <rect x="2" y="8" width="2" height="2" fill={color} />
        <rect x="4" y="6" width="2" height="2" fill={color} />
        <rect x="6" y="4" width="2" height="2" fill={color} />
        <rect x="8" y="2" width="2" height="2" fill={color} />
      </svg>
    )
  }
  if (variant === 'error') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="2" width="2" height="2" fill={color} />
        <rect x="8" y="2" width="2" height="2" fill={color} />
        <rect x="4" y="4" width="4" height="4" fill={color} />
        <rect x="2" y="8" width="2" height="2" fill={color} />
        <rect x="8" y="8" width="2" height="2" fill={color} />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="4" y="2" width="4" height="2" fill={color} />
      <rect x="4" y="6" width="4" height="4" fill={color} />
    </svg>
  )
}

function ToastItemComponent({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(item.id), DISMISS_AFTER_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [item.id, onDismiss])

  return (
    <div className="flex items-start gap-2 bg-[#3a2a1a] border border-[#1a100a] shadow-[1px_1px_0_#1a100a] px-3 py-2 min-w-[200px] max-w-[320px]">
      <ToastIcon variant={item.variant} />
      <p className="flex-1 text-sm text-[#d7c199]">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="닫기"
        className="text-[#a08866] hover:text-[#f4e4c1] transition-colors duration-100 ease-linear ml-1 leading-none"
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ message, variant }: { message: string; variant: ToastVariant }) => {
      const id = crypto.randomUUID()
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
    },
    [],
  )

  const errorToasts = toasts.filter((t) => t.variant === 'error')
  const nonErrorToasts = toasts.filter((t) => t.variant !== 'error')

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* non-error toasts */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      >
        {nonErrorToasts.map((t) => (
          <ToastItemComponent key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
      {/* error toasts */}
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2"
        style={{ top: nonErrorToasts.length > 0 ? `${4 + nonErrorToasts.length * 60}px` : '' }}
      >
        {errorToasts.map((t) => (
          <ToastItemComponent key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}