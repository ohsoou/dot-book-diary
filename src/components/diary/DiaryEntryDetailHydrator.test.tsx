import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DiaryEntryDetailHydrator } from './DiaryEntryDetailHydrator'
import type { Book, DiaryEntry } from '@/types'

const mockGetDiaryEntry = vi.fn()
const mockGetBook = vi.fn()

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({ localArchived: false }),
}))

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn().mockImplementation(() => ({
    getDiaryEntry: (...args: unknown[]) => mockGetDiaryEntry(...args),
    getBook: (...args: unknown[]) => mockGetBook(...args),
  })),
}))

vi.mock('./DiaryEntryDetail', () => ({
  DiaryEntryDetail: ({ entry, book }: { entry: DiaryEntry; book?: Book }) => (
    <div>
      <span data-testid="entry-body">{entry.body}</span>
      <span data-testid="book-title">{book?.title ?? 'no-book'}</span>
    </div>
  ),
}))

const makeEntry = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 'entry-1',
  entryType: 'review',
  body: '테스트 일기',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...overrides,
})

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

describe('DiaryEntryDetailHydrator', () => {
  it('bookId가 있으면 book을 로드하여 DiaryEntryDetail에 전달한다', async () => {
    const entry = makeEntry({ bookId: 'book-1' })
    const book = makeBook()
    mockGetDiaryEntry.mockResolvedValue(entry)
    mockGetBook.mockResolvedValue(book)

    render(<DiaryEntryDetailHydrator id="entry-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('entry-body').textContent).toBe('테스트 일기')
      expect(screen.getByTestId('book-title').textContent).toBe('테스트 책')
    })
    expect(mockGetBook).toHaveBeenCalledWith('book-1')
  })

  it('getBook()이 실패해도 entry는 정상 렌더된다', async () => {
    const entry = makeEntry({ bookId: 'book-1' })
    mockGetDiaryEntry.mockResolvedValue(entry)
    mockGetBook.mockRejectedValue(new Error('not found'))

    render(<DiaryEntryDetailHydrator id="entry-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('entry-body').textContent).toBe('테스트 일기')
      expect(screen.getByTestId('book-title').textContent).toBe('no-book')
    })
  })

  it('bookId가 없으면 getBook()을 호출하지 않는다', async () => {
    mockGetDiaryEntry.mockResolvedValue(makeEntry())

    render(<DiaryEntryDetailHydrator id="entry-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('entry-body')).toBeDefined()
    })
    expect(mockGetBook).not.toHaveBeenCalled()
  })

  it('일기를 찾을 수 없으면 "기록을 찾을 수 없어요." 메시지를 표시한다', async () => {
    mockGetDiaryEntry.mockResolvedValue(null)

    render(<DiaryEntryDetailHydrator id="missing-id" />)

    await waitFor(() => {
      expect(screen.getByText('기록을 찾을 수 없어요.')).toBeDefined()
    })
  })

  it('localArchived=true이면 "기록을 찾을 수 없어요." 메시지를 표시한다', async () => {
    const { getPreferences } = await import('@/lib/storage/preferences')
    vi.mocked(getPreferences).mockResolvedValueOnce({ localArchived: true })

    render(<DiaryEntryDetailHydrator id="entry-1" />)

    await waitFor(() => {
      expect(screen.getByText('기록을 찾을 수 없어요.')).toBeDefined()
    })
    expect(mockGetDiaryEntry).not.toHaveBeenCalled()
  })
})