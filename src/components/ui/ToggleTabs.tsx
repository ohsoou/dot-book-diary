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
      className={`flex border border-[#1a100a] ${className}`}
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
                ? 'bg-[#e89b5e] text-[#2a1f17]'
                : 'bg-transparent text-[#d7c199] hover:text-[#f4e4c1]'
            }`}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}
