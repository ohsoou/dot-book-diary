import { Button } from './Button'

interface EmptyStateCTA {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  message: string
  cta?: EmptyStateCTA
}

export function EmptyState({ message, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      {/* 도트 아이콘 (16×16) */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="text-[#a08866]"
      >
        <rect x="6" y="2" width="4" height="2" fill="currentColor" />
        <rect x="4" y="4" width="8" height="2" fill="currentColor" />
        <rect x="2" y="6" width="12" height="6" fill="currentColor" />
        <rect x="4" y="12" width="8" height="2" fill="currentColor" />
      </svg>
      <p className="text-sm text-[#a08866]">{message}</p>
      {cta && (
        <Button variant="primary" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  )
}