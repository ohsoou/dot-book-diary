import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('BottomNav', () => {
  it('renders 5 nav items', () => {
    render(<BottomNav />)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('책장')).toBeInTheDocument()
    expect(screen.getByText('캘린더')).toBeInTheDocument()
    expect(screen.getByText('일기')).toBeInTheDocument()
    expect(screen.getByText('설정')).toBeInTheDocument()
  })

  it('marks active link with aria-current="page"', () => {
    render(<BottomNav />)
    const homeLink = screen.getByText('홈').closest('a')
    expect(homeLink).toHaveAttribute('aria-current', 'page')
    const bookshelfLink = screen.getByText('책장').closest('a')
    expect(bookshelfLink).not.toHaveAttribute('aria-current')
  })

  it('has accessible nav landmark', () => {
    render(<BottomNav />)
    expect(screen.getByRole('navigation', { name: '전역 네비게이션' })).toBeInTheDocument()
  })

  it('returns null on auth routes', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/auth/callback')
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
  })
})
