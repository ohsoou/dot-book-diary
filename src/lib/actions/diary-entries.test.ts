import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storage', () => ({
  getStore: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { addDiaryEntryAction, updateDiaryEntryAction, deleteDiaryEntryAction } from './diary-entries'
import { getStore } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import type { DiaryEntry } from '@/types'
import type { Store } from '@/lib/storage'

function makeFormData(input: Record<string, string | undefined>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(input)) if (v !== undefined) fd.set(k, v)
  return fd
}

const mockEntry: DiaryEntry = {
  id: 'entry-1',
  bookId: 'book-1',
  entryType: 'quote',
  body: '인용 문장',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
    addReadingSession: vi.fn().mockResolvedValue(null),
    updateReadingSession: vi.fn().mockResolvedValue(null),
    deleteReadingSession: vi.fn().mockResolvedValue(undefined),
    listDiaryEntries: vi.fn().mockResolvedValue([]),
    getDiaryEntry: vi.fn().mockResolvedValue(null),
    addDiaryEntry: vi.fn().mockResolvedValue(mockEntry),
    updateDiaryEntry: vi.fn().mockResolvedValue(mockEntry),
    deleteDiaryEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Store
}

describe('addDiaryEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상(quote, bookId 있음): /diary와 /reading/[bookId]를 revalidate하고 { ok: true, data }를 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '인용 문장', bookId: 'book-1' })
    const result = await addDiaryEntryAction(null, fd)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockEntry)
    }
    expect(revalidatePath).toHaveBeenCalledWith('/diary')
    expect(revalidatePath).toHaveBeenCalledWith('/reading/[bookId]', 'page')
  })

  it('정상(review, bookId 없음): /diary만 revalidate하고 /reading/[bookId]는 호출하지 않는다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'review', body: '독후감 내용' })
    const result = await addDiaryEntryAction(null, fd)

    expect(result.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/diary')
    expect(revalidatePath).not.toHaveBeenCalledWith('/reading/[bookId]', 'page')
  })

  it('bookId가 빈 문자열이면 undefined로 정규화되어 /reading/[bookId]를 revalidate하지 않는다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', bookId: '' })
    const result = await addDiaryEntryAction(null, fd)

    expect(result.ok).toBe(true)
    expect(store.addDiaryEntry).toHaveBeenCalledWith(
      expect.not.objectContaining({ bookId: expect.any(String) }),
    )
    expect(revalidatePath).not.toHaveBeenCalledWith('/reading/[bookId]', 'page')
  })

  it('page가 빈 문자열이면 undefined로 정규화되어 store에 전달한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', page: '' })
    await addDiaryEntryAction(null, fd)

    const callArg = vi.mocked(store.addDiaryEntry).mock.calls[0]?.[0]
    expect(callArg?.page).toBeUndefined()
  })

  it('page가 비정수 문자열("abc")이면 NaN을 undefined로 처리하여 store에 전달한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', page: 'abc' })
    await addDiaryEntryAction(null, fd)

    const callArg = vi.mocked(store.addDiaryEntry).mock.calls[0]?.[0]
    expect(callArg?.page).toBeUndefined()
  })

  it('page가 소수("3.7")이면 Math.trunc로 3이 되어 store에 전달된다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', page: '3.7' })
    await addDiaryEntryAction(null, fd)

    const callArg = vi.mocked(store.addDiaryEntry).mock.calls[0]?.[0]
    expect(callArg?.page).toBe(3)
  })

  it('body 누락 시 VALIDATION_FAILED를 반환하고 fieldErrors에 body가 포함된다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote' })
    const result = await addDiaryEntryAction(null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.fieldErrors).toHaveProperty('body')
    }
    expect(store.addDiaryEntry).not.toHaveBeenCalled()
  })

  it('store가 AppError를 던지면 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      addDiaryEntry: vi.fn().mockRejectedValue(
        new AppError('UPSTREAM_FAILED', '저장에 실패했어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', bookId: 'book-1' })
    const result = await addDiaryEntryAction(null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
      expect(result.error.message).toBe('저장에 실패했어요')
    }
  })
})

describe('updateDiaryEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상: id를 store에 전달하고 revalidatePath를 호출하며 { ok: true, data }를 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'review', body: '독후감', bookId: 'book-1' })
    const result = await updateDiaryEntryAction('entry-1', null, fd)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockEntry)
    }
    expect(store.updateDiaryEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ entryType: 'review', body: '독후감' }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/diary')
  })

  it('bookId가 빈 문자열이면 undefined로 정규화되어 store에 전달한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용', bookId: '' })
    await updateDiaryEntryAction('entry-1', null, fd)

    expect(store.updateDiaryEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.not.objectContaining({ bookId: expect.any(String) }),
    )
  })

  it('zod 검증 실패 시 VALIDATION_FAILED + fieldErrors를 반환하고 store를 호출하지 않는다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'invalid_type', body: '내용' })
    const result = await updateDiaryEntryAction('entry-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.fieldErrors).toBeDefined()
    }
    expect(store.updateDiaryEntry).not.toHaveBeenCalled()
  })

  it('store가 AppError를 던지면 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      updateDiaryEntry: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '일기를 찾을 수 없어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'review', body: '내용' })
    const result = await updateDiaryEntryAction('entry-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('일기를 찾을 수 없어요')
    }
  })

  it('store가 일반 Error를 던지면 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      updateDiaryEntry: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const fd = makeFormData({ entryType: 'quote', body: '내용' })
    const result = await updateDiaryEntryAction('entry-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('본문이 5000자 초과이면 zod 검증에서 실패하여 VALIDATION_FAILED를 반환한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const longBody = 'a'.repeat(5001)
    const fd = makeFormData({ entryType: 'quote', body: longBody })
    const result = await updateDiaryEntryAction('entry-1', null, fd)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.fieldErrors).toHaveProperty('body')
    }
    expect(store.updateDiaryEntry).not.toHaveBeenCalled()
  })
})

describe('deleteDiaryEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상: store.deleteDiaryEntry(id)를 호출하고 /diary를 revalidate한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteDiaryEntryAction('entry-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeUndefined()
    }
    expect(store.deleteDiaryEntry).toHaveBeenCalledWith('entry-1')
    expect(revalidatePath).toHaveBeenCalledWith('/diary')
  })

  it('AppError를 { ok: false, error }로 매핑한다', async () => {
    const store = makeStore({
      deleteDiaryEntry: vi.fn().mockRejectedValue(
        new AppError('NOT_FOUND', '일기를 찾을 수 없어요'),
      ),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteDiaryEntryAction('entry-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('일기를 찾을 수 없어요')
    }
  })

  it('일반 Error를 UPSTREAM_FAILED로 매핑한다', async () => {
    const store = makeStore({
      deleteDiaryEntry: vi.fn().mockRejectedValue(new Error('DB connection error')),
    })
    vi.mocked(getStore).mockResolvedValue(store)

    const result = await deleteDiaryEntryAction('entry-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('빈 id 전달 시 store.deleteDiaryEntry("")를 그대로 호출한다', async () => {
    const store = makeStore()
    vi.mocked(getStore).mockResolvedValue(store)

    await deleteDiaryEntryAction('')

    expect(store.deleteDiaryEntry).toHaveBeenCalledWith('')
  })
})
