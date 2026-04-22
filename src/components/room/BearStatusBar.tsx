interface BearStatusBarProps {
  label: string | null
}

export function BearStatusBar({ label }: BearStatusBarProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="py-1 text-center text-sm text-[var(--color-text-secondary)]"
    >
      {label ?? ' '}
    </p>
  )
}
