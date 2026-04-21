'use client'

interface ToggleTabsProps {
  variants: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ToggleTabs({ variants, value, onChange, className = '' }: ToggleTabsProps) {
  return (
    <div
      role="tablist"
      className={`flex border border-[var(--color-border)] ${className}`}
    >
      {variants.map((v) => {
        const isSelected = v === value
        return (
          <button
            key={v}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(v)}
            className={`flex-1 px-3 py-2 text-sm transition-colors duration-100 ease-linear ${
              isSelected
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                : 'bg-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}
