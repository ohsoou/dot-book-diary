import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookSearchForm } from './BookSearchForm'
import type { ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'

// next/navigation mock
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

// Toast mock
const mockAddToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

// next/image mock
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const mockBook: BookSearchResult = {
  isbn: '9780000000001',
  title: '테스트 책',
  author: '저자명',
  publisher: '출판사',
}

const successAddBook = vi.fn(async (): Promise<ActionResult<Book>> => ({
  ok: true,
  data: {
    id: '1',
    isbn: mockBook.isbn,
    title: mockBook.title,
    author: mockBook.author,
    publisher: mockBook.publisher,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

describe('BookSearchForm', () => {
  it('검색 제출 시 API를 호출하고 결과를 렌더한다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockBook] }),
    })

    render(<BookSearchForm onAddBook={successAddBook} />)

    await user.type(screen.getByRole('searchbox'), '테스트')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => {
      expect(screen.getByText('테스트 책')).toBeInTheDocument()
    })
  })

  it('검색 결과 없을 때 EmptyState를 표시한다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    render(<BookSearchForm onAddBook={successAddBook} />)
    await user.type(screen.getByRole('searchbox'), '없는책')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => {
      expect(screen.getByText('검색 결과가 없어요')).toBeInTheDocument()
    })
  })

  it('검색어 없이 제출 시 FieldError를 표시한다', async () => {
    const user = userEvent.setup()
    render(<BookSearchForm onAddBook={successAddBook} />)
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => {
      expect(screen.getByText('검색어를 입력해 주세요')).toBeInTheDocument()
    })
  })

  it('추가 성공 시 toast를 띄우고 /bookshelf로 이동한다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockBook] }),
    })

    render(<BookSearchForm onAddBook={successAddBook} />)
    await user.type(screen.getByRole('searchbox'), '테스트')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => screen.getByText('테스트 책'))
    await user.click(screen.getByRole('button', { name: '내 책장에 추가' }))

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({ message: '책을 추가했어요', variant: 'success' })
      expect(mockPush).toHaveBeenCalledWith('/bookshelf')
    })
  })

  it('추가 실패 시 에러 toast를 띄운다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockBook] }),
    })
    const failAddBook = vi.fn(async (): Promise<ActionResult<Book>> => ({
      ok: false,
      error: { code: 'UPSTREAM_FAILED', message: '책 추가에 실패했어요' },
    }))

    render(<BookSearchForm onAddBook={failAddBook} />)
    await user.type(screen.getByRole('searchbox'), '테스트')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => screen.getByText('테스트 책'))
    await user.click(screen.getByRole('button', { name: '내 책장에 추가' }))

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({ message: '책 추가에 실패했어요', variant: 'error' })
    })
  })

  it('중복 ISBN 시 ConfirmDialog를 표시한다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockBook] }),
    })
    const duplicateAddBook = vi.fn(async (): Promise<ActionResult<Book>> => ({
      ok: false,
      error: { code: 'DUPLICATE_ISBN', message: '이미 책장에 있는 책이에요' },
    }))

    render(<BookSearchForm onAddBook={duplicateAddBook} />)
    await user.type(screen.getByRole('searchbox'), '테스트')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => screen.getByText('테스트 책'))
    await user.click(screen.getByRole('button', { name: '내 책장에 추가' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('이미 책장에 있는 책이에요')).toBeInTheDocument()
    })
  })

  it('중복 ISBN ConfirmDialog 확인 시 /bookshelf로 이동한다', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockBook] }),
    })
    const duplicateAddBook = vi.fn(async (): Promise<ActionResult<Book>> => ({
      ok: false,
      error: { code: 'DUPLICATE_ISBN', message: '이미 책장에 있는 책이에요' },
    }))

    render(<BookSearchForm onAddBook={duplicateAddBook} />)
    await user.type(screen.getByRole('searchbox'), '테스트')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => screen.getByText('테스트 책'))
    await user.click(screen.getByRole('button', { name: '내 책장에 추가' }))

    await waitFor(() => screen.getByRole('dialog'))
    await user.click(screen.getByRole('button', { name: '책장으로' }))

    expect(mockPush).toHaveBeenCalledWith('/bookshelf')
  })
})