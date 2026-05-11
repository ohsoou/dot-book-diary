import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/actions/reading-sessions', () => ({
  addReadingSessionAction: vi.fn(),
  updateReadingSessionAction: vi.fn(),
  deleteReadingSessionAction: vi.fn(),
}))

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn(),
}))

import { useReadingSessionActions } from './useReadingSessionActions'
import {
  addReadingSessionAction,
  updateReadingSessionAction,
  deleteReadingSessionAction,
} from '@/lib/actions/reading-sessions'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError } from '@/lib/errors'
import type { ReadingSession } from '@/types'

const mockSession: ReadingSession = {
  id: 'session-1',
  bookId: 'book-1',
  readDate: '2026-01-15',
  startPage: 10,
  endPage: 50,
  durationMinutes: 30,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
}

function makeMockStore(overrides: Partial<{
  addReadingSession: (input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ReadingSession>
  updateReadingSession: (id: string, patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ReadingSession>
  deleteReadingSession: (id: string) => Promise<void>
}> = {}) {
  return {
    listBooks: vi.fn().mockResolvedValue([]),
    getBook: vi.fn().mockResolvedValue(null),
    findBookByIsbn: vi.fn().mockResolvedValue(null),
    addBook: vi.fn().mockResolvedValue(null),
    updateBook: vi.fn().mockResolvedValue(null),
    deleteBook: vi.fn().mockResolvedValue(undefined),
    listReadingSessions: vi.fn().mockResolvedValue([]),
    getReadingSession: vi.fn().mockResolvedValue(null),
    addReadingSession: vi.fn().mockResolvedValue(mockSession),
    updateReadingSession: vi.fn().mockResolvedValue(mockSession),
    deleteReadingSession: vi.fn().mockResolvedValue(undefined),
    listDiaryEntries: vi.fn().mockResolvedValue([]),
    getDiaryEntry: vi.fn().mockResolvedValue(null),
    addDiaryEntry: vi.fn().mockResolvedValue(null),
    updateDiaryEntry: vi.fn().mockResolvedValue(null),
    deleteDiaryEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useReadingSessionActions — 회원 경로 (server action 위임)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(LocalStore).mockImplementation(() => makeMockStore() as unknown as LocalStore)
  })

  it('addSession이 FormData를 구성해 addReadingSessionAction을 호출한다', async () => {
    vi.mocked(addReadingSessionAction).mockResolvedValue({ ok: true, data: mockSession })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    await result.current.addSession({
      bookId: 'book-1',
      readDate: '2026-01-15',
      startPage: 10,
      endPage: 50,
      durationMinutes: 30,
    })

    expect(addReadingSessionAction).toHaveBeenCalledOnce()
    const fdArg = vi.mocked(addReadingSessionAction).mock.calls[0]?.[1] as FormData
    expect(fdArg.get('bookId')).toBe('book-1')
    expect(fdArg.get('readDate')).toBe('2026-01-15')
    expect(fdArg.get('startPage')).toBe('10')
    expect(fdArg.get('endPage')).toBe('50')
    expect(fdArg.get('durationMinutes')).toBe('30')
  })

  it('addSession: 옵셔널 필드가 undefined이면 FormData에 키를 set하지 않는다', async () => {
    vi.mocked(addReadingSessionAction).mockResolvedValue({ ok: true, data: mockSession })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    await result.current.addSession({
      bookId: 'book-1',
      readDate: '2026-01-15',
    })

    const fdArg = vi.mocked(addReadingSessionAction).mock.calls[0]?.[1] as FormData
    expect(fdArg.get('startPage')).toBeNull()
    expect(fdArg.get('endPage')).toBeNull()
    expect(fdArg.get('durationMinutes')).toBeNull()
  })

  it('updateSession이 id + FormData로 updateReadingSessionAction을 호출한다', async () => {
    vi.mocked(updateReadingSessionAction).mockResolvedValue({ ok: true, data: mockSession })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    await result.current.updateSession('session-1', {
      readDate: '2026-01-20',
      startPage: 20,
      endPage: 80,
    })

    expect(updateReadingSessionAction).toHaveBeenCalledOnce()
    const [idArg, , fdArg] = vi.mocked(updateReadingSessionAction).mock.calls[0] as [string, null, FormData]
    expect(idArg).toBe('session-1')
    expect(fdArg.get('readDate')).toBe('2026-01-20')
    expect(fdArg.get('startPage')).toBe('20')
    expect(fdArg.get('endPage')).toBe('80')
  })

  it('updateSession: 옵셔널 필드가 undefined이면 FormData에 키를 set하지 않는다', async () => {
    vi.mocked(updateReadingSessionAction).mockResolvedValue({ ok: true, data: mockSession })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    await result.current.updateSession('session-1', { readDate: '2026-01-20' })

    const [, , fdArg] = vi.mocked(updateReadingSessionAction).mock.calls[0] as [string, null, FormData]
    expect(fdArg.get('startPage')).toBeNull()
    expect(fdArg.get('endPage')).toBeNull()
    expect(fdArg.get('durationMinutes')).toBeNull()
  })

  it('deleteSession이 id로 deleteReadingSessionAction을 호출하고 결과를 반환한다', async () => {
    vi.mocked(deleteReadingSessionAction).mockResolvedValue({ ok: true, data: undefined })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    const res = await result.current.deleteSession('session-1')

    expect(deleteReadingSessionAction).toHaveBeenCalledWith('session-1')
    expect(res).toEqual({ ok: true, data: undefined })
  })

  it('addSession이 server action 결과를 그대로 반환한다', async () => {
    vi.mocked(addReadingSessionAction).mockResolvedValue({ ok: true, data: mockSession })
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: true }))

    const res = await result.current.addSession({ bookId: 'book-1', readDate: '2026-01-15' })

    expect(res).toEqual({ ok: true, data: mockSession })
  })
})

describe('useReadingSessionActions — 비회원 경로 (LocalStore 호출)', () => {
  let mockStore: ReturnType<typeof makeMockStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = makeMockStore()
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
  })

  it('addSession 정상 경로 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))
    const res = await result.current.addSession({ bookId: 'book-1', readDate: '2026-01-15' })

    expect(res).toEqual({ ok: true, data: mockSession })
    expect(mockStore.addReadingSession).toHaveBeenCalledWith({ bookId: 'book-1', readDate: '2026-01-15' })
  })

  it('updateSession 정상 경로 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))
    const patch = { readDate: '2026-01-20', startPage: 20 }
    const res = await result.current.updateSession('session-1', patch)

    expect(res).toEqual({ ok: true, data: mockSession })
    expect(mockStore.updateReadingSession).toHaveBeenCalledWith('session-1', patch)
  })

  it('deleteSession 정상 경로 → { ok: true, data: undefined }', async () => {
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))
    const res = await result.current.deleteSession('session-1')

    expect(res).toEqual({ ok: true, data: undefined })
    expect(mockStore.deleteReadingSession).toHaveBeenCalledWith('session-1')
  })

  it('addSession — AppError 던짐 → { ok: false, error: { code, message } }', async () => {
    mockStore = makeMockStore({
      addReadingSession: vi.fn().mockRejectedValue(
        new AppError('VALIDATION_FAILED', '유효하지 않은 세션이에요'),
      ),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))

    const res = await result.current.addSession({ bookId: 'book-1', readDate: '2026-01-15' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION_FAILED')
      expect(res.error.message).toBe('유효하지 않은 세션이에요')
    }
  })

  it('addSession — 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      addReadingSession: vi.fn().mockRejectedValue(new Error('IDB error')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))

    const res = await result.current.addSession({ bookId: 'book-1', readDate: '2026-01-15' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('deleteSession — AppError 던짐 → { ok: false, error }', async () => {
    mockStore = makeMockStore({
      deleteReadingSession: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '세션을 찾을 수 없어요'),
      ),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))

    const res = await result.current.deleteSession('session-1')

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('NOT_FOUND')
    }
  })

  it('updateSession — 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      updateReadingSession: vi.fn().mockRejectedValue(new Error('Write failed')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useReadingSessionActions({ isLoggedIn: false }))

    const res = await result.current.updateSession('session-1', { readDate: '2026-01-20' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})
