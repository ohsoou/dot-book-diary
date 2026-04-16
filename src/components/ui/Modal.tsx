'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const titleId = useId()
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const el = document.getElementById(titleId + '-modal')
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open, titleId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center px-4">
      <div
        id={titleId + '-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId + '-title'}
        className="bg-[#3a2a1a] border border-[#1a100a] p-6 max-w-sm w-full z-40 shadow-[2px_2px_0_#1a100a] flex flex-col gap-4"
      >
        <h2 id={titleId + '-title'} className="text-sm text-[#f4e4c1]">
          {title}
        </h2>
        <div className="text-sm text-[#d7c199] leading-relaxed">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}