import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockListReadingSessions = vi.fn().mockResolvedValue([])
const mockListBooks = vi.fn().mockResolvedValue([])

vi.mock('@/lib/storage', () => ({
  getStore: vi.fn().mockResolvedValue({
    listBooks: mockListBooks,
    listReadingSessions: mockListReadingSessions,
  }),
  useStore: vi.fn().mockReturnValue({
    listBooks: mockListBooks,
    listReadingSessions: mockListReadingSessions,
  }),
}))

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({ localArchived: false }),
}))

async function renderPage() {
  const { default: BookshelfPage } = await import('./page')
  const jsx = await BookshelfPage()
  return render(jsx as React.ReactElement)
}

describe('BookshelfPage — 헤더 CTA', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mock('next/link', () => ({
      default: ({
        href,
        children,
        className,
      }: {
        href: string
        children: React.ReactNode
        className?: string
      }) => (
        <a href={href} className={className}>
          {children}
        </a>
      ),
    }))
  })

  it('회원 분기 — 헤더에 /add-book Link가 노출됨', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      }),
    }))
    await renderPage()
    expect(screen.getByRole('link', { name: '책 등록' })).toHaveAttribute('href', '/add-book')
  })

  it('비회원 분기 — 동일한 헤더 Link가 노출됨', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      }),
    }))
    await renderPage()
    expect(screen.getByRole('link', { name: '책 등록' })).toHaveAttribute('href', '/add-book')
  })

  it('헤더 Link 텍스트가 "책 등록"임', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      }),
    }))
    await renderPage()
    expect(screen.getByRole('link', { name: '책 등록' })).toBeInTheDocument()
  })
})
