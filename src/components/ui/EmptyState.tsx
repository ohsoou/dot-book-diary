import Link from 'next/link'
import { Button } from './Button'

type EmptyStateCTA =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never }

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
        cta.href ? (
          <Link
            href={cta.href as never}
            className="text-sm px-3 py-2 bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] transition-colors duration-100 ease-linear"
          >
            {cta.label}
          </Link>
        ) : (
          <Button variant="primary" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )
      )}
    </div>
  )
}