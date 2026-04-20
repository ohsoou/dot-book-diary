'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: '홈',
    icon: (
      <svg width="16" height="16" aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16" fill="currentColor">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="5" y="3" width="2" height="2" />
        <rect x="9" y="3" width="2" height="2" />
        <rect x="3" y="5" width="2" height="2" />
        <rect x="11" y="5" width="2" height="2" />
        <rect x="1" y="7" width="14" height="1" />
        <rect x="3" y="8" width="10" height="6" />
        <rect x="6" y="10" width="4" height="4" />
      </svg>
    ),
  },
  {
    href: '/bookshelf',
    label: '책장',
    icon: (
      <svg width="16" height="16" aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="2" height="12" />
        <rect x="4" y="4" width="2" height="10" />
        <rect x="7" y="3" width="2" height="11" />
        <rect x="10" y="5" width="2" height="9" />
        <rect x="13" y="2" width="2" height="12" />
        <rect x="1" y="13" width="14" height="1" />
      </svg>
    ),
  },
  {
    href: '/book-calendar',
    label: '캘린더',
    icon: (
      <svg width="16" height="16" aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="3" width="14" height="1" />
        <rect x="1" y="4" width="1" height="10" />
        <rect x="14" y="4" width="1" height="10" />
        <rect x="1" y="13" width="14" height="1" />
        <rect x="4" y="1" width="1" height="4" />
        <rect x="11" y="1" width="1" height="4" />
        <rect x="3" y="6" width="2" height="2" />
        <rect x="7" y="6" width="2" height="2" />
        <rect x="11" y="6" width="2" height="2" />
        <rect x="3" y="10" width="2" height="2" />
        <rect x="7" y="10" width="2" height="2" />
        <rect x="11" y="10" width="2" height="2" />
      </svg>
    ),
  },
  {
    href: '/diary',
    label: '일기',
    icon: (
      <svg width="16" height="16" aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16" fill="currentColor">
        <rect x="3" y="1" width="10" height="1" />
        <rect x="2" y="2" width="1" height="12" />
        <rect x="13" y="2" width="1" height="12" />
        <rect x="3" y="14" width="10" height="1" />
        <rect x="4" y="5" width="8" height="1" />
        <rect x="4" y="7" width="8" height="1" />
        <rect x="4" y="9" width="6" height="1" />
        <rect x="4" y="11" width="5" height="1" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: '설정',
    icon: (
      <svg width="16" height="16" aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16" fill="currentColor">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="7" y="13" width="2" height="2" />
        <rect x="1" y="7" width="2" height="2" />
        <rect x="13" y="7" width="2" height="2" />
        <rect x="3" y="3" width="2" height="2" />
        <rect x="11" y="3" width="2" height="2" />
        <rect x="3" y="11" width="2" height="2" />
        <rect x="11" y="11" width="2" height="2" />
        <rect x="5" y="5" width="6" height="6" />
        <rect x="6" y="6" width="4" height="4" fill="var(--color-bg-card)" />
        <rect x="7" y="7" width="2" height="2" />
      </svg>
    ),
  },
] as const

export function BottomNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/auth')) return null

  return (
    <nav
      aria-label="전역 네비게이션"
      className="fixed bottom-0 inset-x-0 z-10 bg-[#3a2a1a] border-t border-[#1a100a] grid grid-cols-5 h-[64px]"
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href as never}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex flex-col items-center justify-center gap-1 py-2 text-xs min-h-[48px]',
              isActive
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {icon}
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
