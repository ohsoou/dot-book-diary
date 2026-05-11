import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/actions/diary-entries', () => ({
  addDiaryEntryAction: vi.fn(),
  updateDiaryEntryAction: vi.fn(),
  deleteDiaryEntryAction: vi.fn(),
}))

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn(),
}))

import { useDiaryActions } from './useDiaryActions'
import {
  addDiaryEntryAction,
  updateDiaryEntryAction,
  deleteDiaryEntryAction,
} from '@/lib/actions/diary-entries'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError } from '@/lib/errors'
import type { DiaryEntry } from '@/types'

const mockEntry: DiaryEntry = {
  id: 'entry-1',
  bookId: 'book-1',
  entryType: 'quote',
  body: '인용 문장',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function makeMockStore(overrides: Partial<{
  listDiaryEntries: ReturnType<typeof vi.fn>
  getDiaryEntry: ReturnType<typeof vi.fn>
  addDiaryEntry: ReturnType<typeof vi.fn>
  updateDiaryEntry: ReturnType<typeof vi.fn>
  deleteDiaryEntry: ReturnType<typeof vi.fn>
}> = {}) {
  return {
    listDiaryEntries: vi.fn().mockResolvedValue([mockEntry]),
    getDiaryEntry: vi.fn().mockResolvedValue(mockEntry),
    addDiaryEntry: vi.fn().mockResolvedValue(mockEntry),
    updateDiaryEntry: vi.fn().mockResolvedValue(mockEntry),
    deleteDiaryEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useDiaryActions — 회원 경로 (server action 위임)', () => {
  let mockStore: ReturnType<typeof makeMockStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = makeMockStore()
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
  })

  it('addEntry: FormData 변환 후 addDiaryEntryAction을 호출하고 결과를 반환한다', async () => {
    vi.mocked(addDiaryEntryAction).mockResolvedValue({ ok: true, data: mockEntry })
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    await result.current.addEntry({ entryType: 'quote', body: '인용 문장', bookId: 'book-1' })

    expect(addDiaryEntryAction).toHaveBeenCalledOnce()
    const fdArg = vi.mocked(addDiaryEntryAction).mock.calls[0]?.[1] as FormData
    expect(fdArg.get('entryType')).toBe('quote')
    expect(fdArg.get('body')).toBe('인용 문장')
    expect(fdArg.get('bookId')).toBe('book-1')
  })

  it('addEntry: 빈 bookId는 FormData에 set하지 않는다', async () => {
    vi.mocked(addDiaryEntryAction).mockResolvedValue({ ok: true, data: mockEntry })
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    await result.current.addEntry({ entryType: 'quote', body: '내용', bookId: '' })

    const fdArg = vi.mocked(addDiaryEntryAction).mock.calls[0]?.[1] as FormData
    expect(fdArg.get('bookId')).toBeNull()
  })

  it('addEntry: page가 있으면 FormData에 string으로 추가된다', async () => {
    vi.mocked(addDiaryEntryAction).mockResolvedValue({ ok: true, data: mockEntry })
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    await result.current.addEntry({ entryType: 'quote', body: '내용', page: 42 })

    const fdArg = vi.mocked(addDiaryEntryAction).mock.calls[0]?.[1] as FormData
    expect(fdArg.get('page')).toBe('42')
  })

  it('updateEntry: id + FormData로 updateDiaryEntryAction을 호출한다', async () => {
    vi.mocked(updateDiaryEntryAction).mockResolvedValue({ ok: true, data: mockEntry })
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    await result.current.updateEntry('entry-1', { entryType: 'review', body: '독후감', bookId: 'book-1' })

    expect(updateDiaryEntryAction).toHaveBeenCalledOnce()
    const [idArg, , fdArg] = vi.mocked(updateDiaryEntryAction).mock.calls[0] as [string, null, FormData]
    expect(idArg).toBe('entry-1')
    expect(fdArg.get('entryType')).toBe('review')
    expect(fdArg.get('body')).toBe('독후감')
  })

  it('deleteEntry: id로 deleteDiaryEntryAction을 호출하고 결과를 반환한다', async () => {
    vi.mocked(deleteDiaryEntryAction).mockResolvedValue({ ok: true, data: undefined })
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    const res = await result.current.deleteEntry('entry-1')

    expect(deleteDiaryEntryAction).toHaveBeenCalledWith('entry-1')
    expect(res).toEqual({ ok: true, data: undefined })
  })

  it('listEntries: LocalStore에서 읽고 { ok: true, data }를 반환한다', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    const res = await result.current.listEntries()

    expect(res).toEqual({ ok: true, data: [mockEntry] })
    expect(mockStore.listDiaryEntries).toHaveBeenCalledOnce()
  })

  it('listEntries: 필터가 전달되면 store에 그대로 전달된다', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: true }))

    await result.current.listEntries({ bookId: 'book-1', entryType: 'quote' })

    expect(mockStore.listDiaryEntries).toHaveBeenCalledWith({ bookId: 'book-1', entryType: 'quote' })
  })
})

describe('useDiaryActions — 비회원 경로 (LocalStore + zod 검증)', () => {
  let mockStore: ReturnType<typeof makeMockStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = makeMockStore()
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
  })

  it('addEntry 정상 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.addEntry({ entryType: 'quote', body: '인용 문장', bookId: 'book-1' })

    expect(res).toEqual({ ok: true, data: mockEntry })
    expect(mockStore.addDiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entryType: 'quote', body: '인용 문장', bookId: 'book-1' }),
    )
  })

  it('addEntry: body 누락 → VALIDATION_FAILED + fieldErrors.body', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.addEntry({ entryType: 'quote', body: '' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION_FAILED')
      expect(res.error.fieldErrors).toHaveProperty('body')
    }
    expect(mockStore.addDiaryEntry).not.toHaveBeenCalled()
  })

  it('addEntry: AppError 던짐 → { ok: false, error }', async () => {
    mockStore = makeMockStore({
      addDiaryEntry: vi.fn().mockRejectedValue(new AppError('UPSTREAM_FAILED', '저장에 실패했어요')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.addEntry({ entryType: 'quote', body: '내용' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
      expect(res.error.message).toBe('저장에 실패했어요')
    }
  })

  it('addEntry: 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      addDiaryEntry: vi.fn().mockRejectedValue(new Error('IDB error')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.addEntry({ entryType: 'quote', body: '내용' })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('updateEntry 정상 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.updateEntry('entry-1', { entryType: 'review', body: '독후감' })

    expect(res).toEqual({ ok: true, data: mockEntry })
    expect(mockStore.updateDiaryEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ entryType: 'review', body: '독후감' }),
    )
  })

  it('updateEntry: zod 실패(entryType 무효) → VALIDATION_FAILED + fieldErrors', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.updateEntry('entry-1', {
      entryType: 'invalid' as DiaryEntry['entryType'],
      body: '내용',
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION_FAILED')
      expect(res.error.fieldErrors).toBeDefined()
    }
    expect(mockStore.updateDiaryEntry).not.toHaveBeenCalled()
  })

  it('deleteEntry 정상 → { ok: true, data: undefined }', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.deleteEntry('entry-1')

    expect(res).toEqual({ ok: true, data: undefined })
    expect(mockStore.deleteDiaryEntry).toHaveBeenCalledWith('entry-1')
  })

  it('deleteEntry: AppError → { ok: false, error }', async () => {
    mockStore = makeMockStore({
      deleteDiaryEntry: vi.fn().mockRejectedValue(new AppError('NOT_FOUND', '일기를 찾을 수 없어요')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.deleteEntry('entry-1')

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('NOT_FOUND')
      expect(res.error.message).toBe('일기를 찾을 수 없어요')
    }
  })

  it('listEntries: 필터 전달 시 store에 그대로 전달된다', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    await result.current.listEntries({ bookId: 'book-1', entryType: 'review' })

    expect(mockStore.listDiaryEntries).toHaveBeenCalledWith({ bookId: 'book-1', entryType: 'review' })
  })

  it('listEntries: 일반 Error → UPSTREAM_FAILED', async () => {
    mockStore = makeMockStore({
      listDiaryEntries: vi.fn().mockRejectedValue(new Error('IDB read error')),
    })
    vi.mocked(LocalStore).mockImplementation(() => mockStore as unknown as LocalStore)
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.listEntries()

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('getEntry 정상 → { ok: true, data }', async () => {
    const { result } = renderHook(() => useDiaryActions({ isLoggedIn: false }))

    const res = await result.current.getEntry('entry-1')

    expect(res).toEqual({ ok: true, data: mockEntry })
    expect(mockStore.getDiaryEntry).toHaveBeenCalledWith('entry-1')
  })
})
