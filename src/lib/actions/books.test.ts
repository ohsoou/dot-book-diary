import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storage', () => ({
  getStore: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { listBooksAction, addBookAction, deleteBookAction, updateBookAction } from './books'
import { getStore } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'
import type { Store } from '@/lib/storage'

const mockBook: Book = {
  id: 'book-1',
  title: '테스트 책',
  isbn: '9780000000001',
  author: '저자',
  publisher: '출판사',
  coverUrl: 'https://example.com/cover.jpg',
  totalPages: 300,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockSearchResult: BookSearchResult = {
  isbn: '9780000000001',
  title: '테스트 책',
  author: '저자',
  publisher: '출판사',
  coverUrl: 'https://example.com/cover.jpg',
  totalPages: 300,
}

function makeStore(overrides: Partial<Record<keyof Store, ReturnType<typeof vi.fn>>> = {}): Store {
  return {
    listBooks: vi.fn().mockResolvedValue([mockBook]),
    getBook: vi.fn().mockResolvedValue(mockBook),
    findBookByIsbn: vi.fn().mockResolvedValue(null),
    addBook: vi.fn().mockResolvedValue(mockBook),
    updateBook: vi.fn().mockResolvedValue(mockBook),
    deleteBook: vi.fn().mockResolvedValue(undefined),
    listReadingSessions: vi.fn().mockResolvedValue([]),
    getReadingSession: vi.fn().mockResolvedValue(null),
    addReadingSession: vi.fn().mockResolvedValue(null),
    updateReadingSession: vi.fn().mockResolvedValue(null),
    deleteReadingSession: vi.fn().mockResolvedValue(undefined),
    listDiaryEntries: vi.fn().mockResolvedValue([]),
    getDiaryEntry: vi.fn().mockResolvedValue(null),
    addDiaryEntry: vi.fn().mockResolvedValue(null),
    updateDiaryEntry: vi.fn().mockResolvedValue(null),
    deleteDiaryEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Store
}

describe('listBooksAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('store.listBooks 결과를 { ok: true, data }로 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await listBooksAction()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual([mockBook])
    }
    expect(store.listBooks).toHaveBeenCalledOnce()
  })

  it('AppError를 { ok: false, error: { code, message, fieldErrors } }로 매핑한다', async () => {
    const store = makeStore({
      listBooks: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '책 목록을 찾을 수 없어요', undefined, { field: '에러' }),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await listBooksAction()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('책 목록을 찾을 수 없어요')
      expect(result.error.fieldErrors).toEqual({ field: '에러' })
    }
  })

  it('알 수 없는 에러는 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      listBooks: vi.fn().mockRejectedValue(new Error('Unexpected DB error')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await listBooksAction()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})

describe('addBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상 추가 시 /bookshelf와 /를 revalidate하고 { ok: true, data }를 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await addBookAction(mockSearchResult)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockBook)
    }
    expect(revalidatePath).toHaveBeenCalledWith('/bookshelf')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('isbn이 있고 findBookByIsbn이 기존 책을 반환하면 DUPLICATE_ISBN을 반환한다', async () => {
    const store = makeStore({
      findBookByIsbn: vi.fn().mockResolvedValue(mockBook),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await addBookAction(mockSearchResult)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('DUPLICATE_ISBN')
    }
    expect(store.addBook).not.toHaveBeenCalled()
  })

  it('isbn이 없으면 findBookByIsbn을 호출하지 않고 정상 추가한다', async () => {
    const inputWithoutIsbn: BookSearchResult = { ...mockSearchResult, isbn: undefined }
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await addBookAction(inputWithoutIsbn)

    expect(result.ok).toBe(true)
    expect(store.findBookByIsbn).not.toHaveBeenCalled()
    expect(store.addBook).toHaveBeenCalledOnce()
  })

  it('AppError를 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      addBook: vi.fn().mockRejectedValue(
        new AppError('VALIDATION_FAILED', '유효하지 않은 입력이에요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await addBookAction(mockSearchResult)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.message).toBe('유효하지 않은 입력이에요')
    }
  })

  it('알 수 없는 에러는 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      addBook: vi.fn().mockRejectedValue(new Error('Network timeout')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await addBookAction(mockSearchResult)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})

describe('deleteBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상 삭제 시 store.deleteBook을 호출하고 /bookshelf와 /를 revalidate한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteBookAction('book-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeUndefined()
    }
    expect(store.deleteBook).toHaveBeenCalledWith('book-1')
    expect(revalidatePath).toHaveBeenCalledWith('/bookshelf')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('AppError를 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      deleteBook: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '해당 책을 찾을 수 없어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteBookAction('book-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('해당 책을 찾을 수 없어요')
    }
  })

  it('알 수 없는 에러는 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      deleteBook: vi.fn().mockRejectedValue(new Error('Connection refused')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteBookAction('book-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('빈 bookId 전달 시 그대로 store.deleteBook에 위임한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteBookAction('')

    expect(store.deleteBook).toHaveBeenCalledWith('')
    expect(result.ok).toBe(true)
  })
})

describe('updateBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상 수정 시 /bookshelf와 /reading/${bookId}를 revalidate하고 { ok: true, data }를 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await updateBookAction('book-1', { title: '새 제목' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockBook)
    }
    expect(revalidatePath).toHaveBeenCalledWith('/bookshelf')
    expect(revalidatePath).toHaveBeenCalledWith('/reading/book-1')
  })

  it('patch 값이 그대로 store.updateBook에 전달된다', async () => {
    const patch = { title: '새 제목', totalPages: 350 }
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    await updateBookAction('book-1', patch)

    expect(store.updateBook).toHaveBeenCalledWith('book-1', patch)
  })

  it('AppError를 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      updateBook: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '수정할 책을 찾을 수 없어요', undefined, { id: '없는 id' }),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await updateBookAction('book-1', { title: '새 제목' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('수정할 책을 찾을 수 없어요')
      expect(result.error.fieldErrors).toEqual({ id: '없는 id' })
    }
  })

  it('알 수 없는 에러는 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      updateBook: vi.fn().mockRejectedValue(new Error('DB connection error')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await updateBookAction('book-1', { title: '새 제목' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})
