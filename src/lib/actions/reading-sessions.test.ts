import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storage', () => ({
  getStore: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import {
  addReadingSessionAction,
  updateReadingSessionAction,
  deleteReadingSessionAction,
} from './reading-sessions'
import { getStore } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import type { ReadingSession } from '@/types'
import type { Store } from '@/lib/storage'

function makeFormData(input: Record<string, string | undefined>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(input)) if (v !== undefined) fd.set(k, v)
  return fd
}

const mockSession: ReadingSession = {
  id: 'session-1',
  bookId: 'book-1',
  readDate: '2026-05-06',
  startPage: 1,
  endPage: 50,
  durationMinutes: 30,
  createdAt: '2026-05-06T00:00:00.000Z',
  updatedAt: '2026-05-06T00:00:00.000Z',
}

function makeStore(overrides: Partial<Record<keyof Store, ReturnType<typeof vi.fn>>> = {}): Store {
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
  } as unknown as Store
}

describe('addReadingSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상: bookId/readDate/숫자 필드가 store에 전달되고 두 경로를 revalidate한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({
      bookId: 'book-1',
      readDate: '2026-05-06',
      startPage: '1',
      endPage: '50',
      durationMinutes: '30',
    })
    const result = await addReadingSessionAction(null, fd)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockSession)
    }
    expect(store.addReadingSession).toHaveBeenCalledWith({
      bookId: 'book-1',
      readDate: '2026-05-06',
      startPage: 1,
      endPage: 50,
      durationMinutes: 30,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/reading/[bookId]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/book-calendar')
  })

  it('bookId 미설정 시 빈 문자열("")이 그대로 store에 넘어간다 (현재 동작 락인 — phase 11에서 개선 예정)', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    // bookId를 FormData에 추가하지 않음
    const fd = makeFormData({ readDate: '2026-05-06' })
    await addReadingSessionAction(null, fd)

    const callArg = vi.mocked(store.addReadingSession).mock.calls[0]?.[0]
    expect(callArg?.bookId).toBe('')
  })

  it('startPage/endPage/durationMinutes가 빈 문자열이면 undefined로 정규화되어 store에 전달된다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({
      bookId: 'book-1',
      readDate: '2026-05-06',
      startPage: '',
      endPage: '',
      durationMinutes: '',
    })
    await addReadingSessionAction(null, fd)

    const callArg = vi.mocked(store.addReadingSession).mock.calls[0]?.[0]
    expect(callArg?.startPage).toBeUndefined()
    expect(callArg?.endPage).toBeUndefined()
    expect(callArg?.durationMinutes).toBeUndefined()
  })

  it('endPage가 소수("12.9")이면 Math.trunc로 12가 되어 store에 전달된다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({
      bookId: 'book-1',
      readDate: '2026-05-06',
      endPage: '12.9',
    })
    await addReadingSessionAction(null, fd)

    const callArg = vi.mocked(store.addReadingSession).mock.calls[0]?.[0]
    expect(callArg?.endPage).toBe(12)
  })

  it('store가 AppError(VALIDATION_FAILED)를 던지면 fieldErrors까지 매핑된다', async () => {
    const store = makeStore({
      addReadingSession: vi.fn().mockRejectedValue(
        new AppError('VALIDATION_FAILED', '유효하지 않은 세션이에요', undefined, {
          endPage: 'endPage는 startPage 이상이어야 해요',
        }),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ bookId: 'book-1', readDate: '2026-05-06' })
    const result = await addReadingSessionAction(null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.message).toBe('유효하지 않은 세션이에요')
      expect(result.error.fieldErrors).toEqual({ endPage: 'endPage는 startPage 이상이어야 해요' })
    }
  })

  it('store가 일반 Error를 던지면 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      addReadingSession: vi.fn().mockRejectedValue(new Error('DB connection error')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ bookId: 'book-1', readDate: '2026-05-06' })
    const result = await addReadingSessionAction(null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})

describe('updateReadingSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상: id가 store에 전달되고 patch에 bookId가 포함되지 않는다 (현재 동작 락인)', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({
      readDate: '2026-05-06',
      startPage: '10',
      endPage: '60',
      durationMinutes: '45',
    })
    const result = await updateReadingSessionAction('session-1', null, fd)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockSession)
    }
    expect(store.updateReadingSession).toHaveBeenCalledWith(
      'session-1',
      expect.not.objectContaining({ bookId: expect.anything() }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/reading/[bookId]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/book-calendar')
  })

  it('빈 readDate("")도 그대로 patch에 포함되어 store에 전달된다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ readDate: '' })
    await updateReadingSessionAction('session-1', null, fd)

    const [, patch] = vi.mocked(store.updateReadingSession).mock.calls[0] ?? []
    expect(patch?.readDate).toBe('')
  })

  it('숫자 필드 정규화: 빈 문자열 → undefined, 소수 → Math.trunc', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({
      readDate: '2026-05-06',
      startPage: '',
      endPage: '99.9',
      durationMinutes: '',
    })
    await updateReadingSessionAction('session-1', null, fd)

    const [, patch] = vi.mocked(store.updateReadingSession).mock.calls[0] ?? []
    expect(patch?.startPage).toBeUndefined()
    expect(patch?.endPage).toBe(99)
    expect(patch?.durationMinutes).toBeUndefined()
  })

  it('store가 AppError를 던지면 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      updateReadingSession: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '해당 세션을 찾을 수 없어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ readDate: '2026-05-06' })
    const result = await updateReadingSessionAction('session-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('해당 세션을 찾을 수 없어요')
    }
  })

  it('store가 일반 Error를 던지면 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      updateReadingSession: vi.fn().mockRejectedValue(new Error('Network timeout')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ readDate: '2026-05-06' })
    const result = await updateReadingSessionAction('session-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})

describe('deleteReadingSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상: store.deleteReadingSession(id)를 호출하고 두 경로를 revalidate한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteReadingSessionAction('session-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeUndefined()
    }
    expect(store.deleteReadingSession).toHaveBeenCalledWith('session-1')
    expect(revalidatePath).toHaveBeenCalledWith('/reading/[bookId]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/book-calendar')
  })

  it('AppError를 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      deleteReadingSession: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '해당 세션을 찾을 수 없어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteReadingSessionAction('session-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('해당 세션을 찾을 수 없어요')
    }
  })

  it('일반 Error를 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      deleteReadingSession: vi.fn().mockRejectedValue(new Error('Connection refused')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteReadingSessionAction('session-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})
