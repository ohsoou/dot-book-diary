import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookPicker } from './BookPicker'
import type { Book } from '@/types'

const mockListBooks = vi.fn()

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn().mockImplementation(() => ({
    listBooks: (...args: unknown[]) => mockListBooks(...args),
  })),
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
})

describe('BookPicker', () => {
  it('로딩 중에는 "불러오는 중..." 텍스트를 표시한다', () => {
    mockListBooks.mockReturnValue(new Promise(() => {})) // 미완료

    render(<BookPicker value={undefined} onChange={vi.fn()} />)

    expect(screen.getByText('불러오는 중...')).toBeDefined()
  })

  it('책이 없으면 "책장에 책이 없어요." 텍스트와 등록 링크를 표시한다', async () => {
    mockListBooks.mockResolvedValue([])

    render(<BookPicker value={undefined} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/책장에 책이 없어요/)).toBeDefined()
      expect(screen.getByRole('link', { name: '책 등록하기' })).toBeDefined()
    })
  })

  it('책이 있으면 select에 책 제목 옵션을 렌더한다', async () => {
    mockListBooks.mockResolvedValue([
      makeBook({ id: 'book-1', title: '첫 번째 책' }),
      makeBook({ id: 'book-2', title: '두 번째 책' }),
    ])

    render(<BookPicker value={undefined} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '연결할 책' })).toBeDefined()
      expect(screen.getByRole('option', { name: '첫 번째 책' })).toBeDefined()
      expect(screen.getByRole('option', { name: '두 번째 책' })).toBeDefined()
    })
  })

  it('value가 undefined이면 "책 선택 (선택)" 기본 옵션이 선택된다', async () => {
    mockListBooks.mockResolvedValue([makeBook({ id: 'book-1', title: '첫 번째 책' })])

    render(<BookPicker value={undefined} onChange={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('')
    })
  })

  it('value가 bookId이면 해당 옵션이 선택된다', async () => {
    mockListBooks.mockResolvedValue([
      makeBook({ id: 'book-1', title: '첫 번째 책' }),
      makeBook({ id: 'book-2', title: '두 번째 책' }),
    ])

    render(<BookPicker value="book-2" onChange={vi.fn()} />)

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('book-2')
    })
  })

  it('선택 변경 시 onChange를 bookId로 호출한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mockListBooks.mockResolvedValue([
      makeBook({ id: 'book-1', title: '첫 번째 책' }),
      makeBook({ id: 'book-2', title: '두 번째 책' }),
    ])

    render(<BookPicker value={undefined} onChange={onChange} />)

    await waitFor(() => screen.getByRole('combobox'))
    await user.selectOptions(screen.getByRole('combobox'), 'book-1')

    expect(onChange).toHaveBeenCalledWith('book-1')
  })

  it('빈 옵션 선택 시 onChange를 undefined로 호출한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mockListBooks.mockResolvedValue([makeBook({ id: 'book-1', title: '첫 번째 책' })])

    render(<BookPicker value="book-1" onChange={onChange} />)

    await waitFor(() => screen.getByRole('combobox'))
    await user.selectOptions(screen.getByRole('combobox'), '')

    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
