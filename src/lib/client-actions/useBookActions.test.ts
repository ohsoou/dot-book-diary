import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/actions/books', () => ({
  listBooksAction: vi.fn(),
  addBookAction: vi.fn(),
  updateBookAction: vi.fn(),
  deleteBookAction: vi.fn(),
}))

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn(),
}))

import { useBookActions } from './useBookActions'
import {
  listBooksAction,
  addBookAction,
  updateBookAction,
  deleteBookAction,
} from '@/lib/actions/books'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'

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

function makeMockStore(overrides: Partial<{
  listBooks: () => Promise<Book[]>
  findBookByIsbn: (isbn: string) => Promise<Book | null>
  addBook: (input: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Book>
  updateBook: (id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Book>
  deleteBook: (id: string) => Promise<void>
}> = {}) {
  return {
    listBooks: vi.fn().mockResolvedValue([mockBook]),
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
    getBook: vi.fn().mockResolvedValue(mockBook),
    ...overrides,
  }
}

describe('useBookActions — 회원 경로 (server action 위임)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(LocalStore).mockImplementation(() => makeMockStore() as unknown as LocalStore)
  })

  it('listBooks가 listBooksAction에 위임되고 결과를 그대로 반환한다', async () => {
    vi.mocked(listBooksAction).mockResolvedValue({ ok: true, data: [mockBook] })
    const { result } = renderHook(() => useBookActions({ isLoggedIn: true }))
    const res = await result.current.listBooks()
    expect(listBooksAction).toHaveBeenCalledOnce()
    expect(res).toEqual({ ok: true, data: [mockBook] })
  })

  it('addBook이 addBookAction에 위임되고 결과를 그대로 반환한다', async () => {
    vi.mocked(addBookAction).mockResolvedValue({ ok: true, data: mockBook })
    const { result } = renderHook(() => useBookActions({ isLoggedIn: true }))
    const res = await result.current.addBook(mockSearchResult)
    expect(addBookAction).toHaveBeenCalledWith(mockSearchResult)
    expect(res).toEqual({ ok: true, data: mockBook })
  })

  it('updateBook이 updateBookAction에 위임되고 결과를 그대로 반환한다', async () => {
    vi.mocked(updateBookAction).mockResolvedValue({ ok: true, data: mockBook })
    const { result } = renderHook(() => useBookActions({ isLoggedIn: true }))
    const res = await result.current.updateBook('book-1', { title: '새 제목' })
    expect(updateBookAction).toHaveBeenCalledWith('book-1', { title: '새 제목' })
    expect(res).toEqual({ ok: true, data: mockBook })
  })

  it('deleteBook이 deleteBookAction에 위임되고 결과를 그대로 반환한다', async () => {
    vi.mocked(deleteBookAction).mockResolvedValue({ ok: true, data: undefined })
    const { result } = renderHook(() => useBookActions({ isLoggedIn: true }))
    const res = await result.current.deleteBook('book-1')
    expect(deleteBookAction).toHaveBeenCalledWith('book-1')
    expect(res).toEqual({ ok: true, data: undefined })
  })
})

describe('useBookActions — 비회원 경로 (LocalStore 호출)', () => {
  let mockStore: ReturnType<typeof makeMockStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = makeMockStore()
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
  })

  it('listBooks 정상 경로 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.listBooks()
    expect(res).toEqual({ ok: true, data: [mockBook] })
    expect(mockStore.listBooks).toHaveBeenCalledOnce()
  })

  it('addBook 정상 경로 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.addBook(mockSearchResult)
    expect(res).toEqual({ ok: true, data: mockBook })
    expect(mockStore.addBook).toHaveBeenCalledOnce()
  })

  it('addBook — isbn 있고 기존 책 존재 → DUPLICATE_ISBN 반환', async () => {
    mockStore = makeMockStore({ findBookByIsbn: vi.fn().mockResolvedValue(mockBook) })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.addBook(mockSearchResult)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('DUPLICATE_ISBN')
    }
    expect(mockStore.addBook).not.toHaveBeenCalled()
  })

  it('addBook — AppError 던짐 → { ok: false, error: { code, message } }', async () => {
    mockStore = makeMockStore({
      addBook: vi.fn().mockRejectedValue(new AppError('VALIDATION_FAILED', '입력이 올바르지 않아요')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.addBook(mockSearchResult)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION_FAILED')
      expect(res.error.message).toBe('입력이 올바르지 않아요')
    }
  })

  it('addBook — 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      addBook: vi.fn().mockRejectedValue(new Error('Unknown error')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.addBook(mockSearchResult)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('updateBook 정상 경로 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.updateBook('book-1', { title: '새 제목' })
    expect(res).toEqual({ ok: true, data: mockBook })
    expect(mockStore.updateBook).toHaveBeenCalledWith('book-1', { title: '새 제목' })
  })

  it('deleteBook 정상 경로 → { ok: true, data: undefined }', async () => {
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.deleteBook('book-1')
    expect(res).toEqual({ ok: true, data: undefined })
    expect(mockStore.deleteBook).toHaveBeenCalledWith('book-1')
  })

  it('deleteBook — AppError 던짐 → { ok: false, error }', async () => {
    mockStore = makeMockStore({
      deleteBook: vi.fn().mockRejectedValue(new AppError('NOT_FOUND', '책을 찾을 수 없어요')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.deleteBook('book-1')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('NOT_FOUND')
    }
  })

  it('findBookByIsbn 정상 경로 → { ok: true, data: book }', async () => {
    mockStore = makeMockStore({ findBookByIsbn: vi.fn().mockResolvedValue(mockBook) })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.findBookByIsbn('9780000000001')
    expect(res).toEqual({ ok: true, data: mockBook })
  })

  it('findBookByIsbn — 없으면 { ok: true, data: null }', async () => {
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.findBookByIsbn('9999999999999')
    expect(res).toEqual({ ok: true, data: null })
  })

  it('listBooks — 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      listBooks: vi.fn().mockRejectedValue(new Error('IDB error')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useBookActions({ isLoggedIn: false }))
    const res = await result.current.listBooks()
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})
