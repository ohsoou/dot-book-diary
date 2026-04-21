import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Book } from '@/types'

const mockBooks: Book[] = [
  {
    id: '1',
    title: '테스트 책',
    author: '저자',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockListBooks = vi.fn()
const mockListReadingSessions = vi.fn().mockResolvedValue([])
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

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: class {
    listBooks() { return Promise.resolve([]) }
    listReadingSessions() { return Promise.resolve([]) }
  },
}))

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({ localArchived: false }),
}))

async function renderPage() {
  const { default: BookshelfPage } = await import('./page')
  const jsx = await BookshelfPage()
  return render(jsx as React.ReactElement)
}

describe('BookshelfPage', () => {
  beforeEach(() => {
    vi.resetModules()
    mockListBooks.mockResolvedValue(mockBooks)
  })

  describe('회원 경로', () => {
    beforeEach(() => {
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-1', email: 'test@example.com' } },
            }),
          },
        }),
      }))
    })

    it('회원은 서버에서 가져온 책 목록을 렌더한다', async () => {
      await renderPage()
      expect(screen.getByText('책장')).toBeDefined()
      expect(screen.getByText('테스트 책')).toBeDefined()
    })
  })

  describe('비회원 경로', () => {
    beforeEach(() => {
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
            }),
          },
        }),
      }))
    })

    it('비회원은 BookGridHydrator를 렌더한다', async () => {
      await renderPage()
      expect(screen.getByText('책장')).toBeDefined()
    })
  })
})
