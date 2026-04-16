'use client'

import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // 열릴 때 트리거 기억, 취소 버튼으로 포커스
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      cancelRef.current?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  // 포커스 트랩
  useEffect(() => {
    if (!open) return
    const el = document.getElementById(titleId + '-dialog')
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

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
        id={titleId + '-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-[#3a2a1a] border border-[#1a100a] p-6 max-w-sm w-full z-40 shadow-[2px_2px_0_#1a100a]"
      >
        <h2 id={titleId} className="text-sm text-[#f4e4c1] mb-2">
          {title}
        </h2>
        {message && <p className="text-sm text-[#d7c199] leading-relaxed mb-4">{message}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}