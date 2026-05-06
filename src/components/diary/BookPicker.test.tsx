import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookPicker } from './BookPicker'
import type { Book } from '@/types'

const mockListBooks = vi.fn()

vi.mock('@/lib/client-actions/useBookActions', () => ({
  useBookActions: () => ({
    listBooks: (...args: unknown[]) => mockListBooks(...args),
    addBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    findBookByIsbn: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'book-1',
  title: '테스트 책',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockListBooks.mockResolvedValue({ ok: true, data: [] })
})

describe('BookPicker', () => {
  describe('비로그인 상태 (isLoggedIn={false})', () => {
    it('로딩 중에는 "불러오는 중..." 텍스트를 표시한다', () => {
      mockListBooks.mockReturnValue(new Promise(() => {}))

      render(<BookPicker value={undefined} onChange={vi.fn()} isLoggedIn={false} />)

      expect(screen.getByText('불러오는 중...')).toBeDefined()
    })

    it('책이 없으면 "책장에 책이 없어요." 텍스트와 등록 링크를 표시한다', async () => {
      mockListBooks.mockResolvedValue({ ok: true, data: [] })

      render(<BookPicker value={undefined} onChange={vi.fn()} isLoggedIn={false} />)

      await waitFor(() => {
        expect(screen.getByText(/책장에 책이 없어요/)).toBeDefined()
        expect(screen.getByRole('link', { name: '책 등록하기' })).toBeDefined()
      })
      expect(mockListBooks).toHaveBeenCalled()
    })

    it('책이 있으면 select에 책 제목 옵션을 렌더한다', async () => {
      mockListBooks.mockResolvedValue({
        ok: true,
        data: [
          makeBook({ id: 'book-1', title: '첫 번째 책' }),
          makeBook({ id: 'book-2', title: '두 번째 책' }),
        ],
      })

      render(<BookPicker value={undefined} onChange={vi.fn()} isLoggedIn={false} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: '연결할 책' })).toBeDefined()
        expect(screen.getByRole('option', { name: '첫 번째 책' })).toBeDefined()
        expect(screen.getByRole('option', { name: '두 번째 책' })).toBeDefined()
      })
    })

    it('선택 변경 시 onChange를 bookId로 호출한다', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      mockListBooks.mockResolvedValue({
        ok: true,
        data: [makeBook({ id: 'book-1', title: '첫 번째 책' })],
      })

      render(<BookPicker value={undefined} onChange={onChange} isLoggedIn={false} />)

      await waitFor(() => screen.getByRole('combobox'))
      await user.selectOptions(screen.getByRole('combobox'), 'book-1')

      expect(onChange).toHaveBeenCalledWith('book-1')
    })
  })

  describe('로그인 상태 (isLoggedIn={true})', () => {
    it('useBookActions을 통해 책 목록을 가져온다', async () => {
      const books = [makeBook({ id: 'remote-1', title: '서버 책' })]
      mockListBooks.mockResolvedValue({ ok: true, data: books })

      render(<BookPicker value={undefined} onChange={vi.fn()} isLoggedIn={true} />)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: '서버 책' })).toBeDefined()
      })
      expect(mockListBooks).toHaveBeenCalled()
    })

    it('에러 발생 시 빈 목록을 표시한다', async () => {
      mockListBooks.mockResolvedValue({ ok: false, error: { code: 'UPSTREAM_FAILED', message: '오류' } })

      render(<BookPicker value={undefined} onChange={vi.fn()} isLoggedIn={true} />)

      await waitFor(() => {
        expect(screen.getByText(/책장에 책이 없어요/)).toBeDefined()
      })
    })
  })
})
