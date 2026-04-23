'use client'

import { useBearState } from './BearStateContext'

interface BearStatusBarProps {
  label?: string | null
}

export function BearStatusBar({ label: labelProp }: BearStatusBarProps) {
  const { bearLabel } = useBearState()
  const label = labelProp !== undefined ? labelProp : bearLabel
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="py-1 text-center text-sm text-[var(--color-text-secondary)]"
    >
      {label ?? ' '}
    </p>
  )
}
