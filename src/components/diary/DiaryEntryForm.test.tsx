import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DiaryEntryForm } from './DiaryEntryForm'
import type { DiaryEntry } from '@/types'

// next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

// Toast
const mockAddToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

// useUnsavedChanges
const mockSetIsDirty = vi.fn()
vi.mock('@/lib/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({ isDirty: false, setIsDirty: mockSetIsDirty }),
}))

// Server Actions
const mockAddEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockDeleteEntry = vi.fn()

vi.mock('@/lib/actions/diary-entries', () => ({
  addDiaryEntryAction: (...args: unknown[]) => mockAddEntry(...args),
  updateDiaryEntryAction: (...args: unknown[]) => mockUpdateEntry(...args),
  deleteDiaryEntryAction: (...args: unknown[]) => mockDeleteEntry(...args),
}))

// storage preferences — 컴포넌트가 @/lib/storage/preferences에서 직접 import
const mockGetDraft = vi.fn()
const mockSetDraft = vi.fn()
const mockClearDraft = vi.fn()

vi.mock('@/lib/storage/preferences', () => ({
  getDiaryDraft: (...args: unknown[]) => mockGetDraft(...args),
  setDiaryDraft: (...args: unknown[]) => mockSetDraft(...args),
  clearDiaryDraft: (...args: unknown[]) => mockClearDraft(...args),
}))

// LocalStore mock (for guest path)
const mockLocalAddEntry = vi.fn()
const mockLocalUpdateEntry = vi.fn()
const mockLocalDeleteEntry = vi.fn()

vi.mock('@/lib/storage/LocalStore', () => ({
  LocalStore: vi.fn().mockImplementation(() => ({
    addDiaryEntry: (...args: unknown[]) => mockLocalAddEntry(...args),
    updateDiaryEntry: (...args: unknown[]) => mockLocalUpdateEntry(...args),
    deleteDiaryEntry: (...args: unknown[]) => mockLocalDeleteEntry(...args),
  })),
}))

const makeEntry = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 'entry-1',
  entryType: 'quote',
  body: '테스트 문장',
  createdAt: '2026-04-20T00:00:00Z',
  updatedAt: '2026-04-20T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDraft.mockResolvedValue(null)
  mockSetDraft.mockResolvedValue(undefined)
  mockClearDraft.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DiaryEntryForm', () => {
  describe('dirty 감지', () => {
    it('body 변경 시 setIsDirty(true)를 호출한다', async () => {
      const user = userEvent.setup()

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await user.type(screen.getByLabelText('내용'), '새 내용')

      expect(mockSetIsDirty).toHaveBeenCalledWith(true)
    })

    it('초기값과 동일하면 setIsDirty(false)를 호출한다', async () => {
      render(<DiaryEntryForm draftId="new" initialBody="기존 내용" isLoggedIn={false} />)

      // dirty=false → setIsDirty(false)
      await waitFor(() => {
        expect(mockSetIsDirty).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('autosave draft', () => {
    it('30초 경과 시 setDiaryDraft를 호출한다', async () => {
      const user = userEvent.setup()

      // setInterval을 spy하여 콜백을 직접 캡처
      let capturedCallback: (() => void) | null = null
      const setIntervalSpy = vi
        .spyOn(globalThis, 'setInterval')
        .mockImplementation((fn: TimerHandler) => {
          capturedCallback = fn as () => void
          return 1 as unknown as ReturnType<typeof setInterval>
        })

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await user.type(screen.getByLabelText('내용'), '자동저장 테스트')

      // autosave 콜백 직접 실행
      act(() => {
        capturedCallback?.()
      })

      expect(mockSetDraft).toHaveBeenCalledWith(
        'new',
        expect.objectContaining({ body: expect.stringContaining('자동저장') }),
      )

      setIntervalSpy.mockRestore()
    })

    it('dirty가 false이면 30초가 지나도 setDiaryDraft를 호출하지 않는다', async () => {
      vi.useFakeTimers()

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      act(() => {
        vi.advanceTimersByTime(30_000)
      })

      expect(mockSetDraft).not.toHaveBeenCalled()
    })
  })

  describe('draft 복원', () => {
    it('저장된 초안이 있으면 복원 confirm dialog를 표시한다', async () => {
      mockGetDraft.mockResolvedValue({
        entryType: 'review',
        body: '이전에 작성 중이던 내용',
      })

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined()
        expect(screen.getByText('이전에 작성 중이던 내용이 있어요. 불러올까요?')).toBeDefined()
      })
    })

    it('불러오기 선택 시 draft 내용을 폼에 적용한다', async () => {
      const user = userEvent.setup()
      mockGetDraft.mockResolvedValue({
        entryType: 'review',
        body: '복원할 내용',
      })

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await waitFor(() => screen.getByRole('dialog'))
      await user.click(screen.getByRole('button', { name: '불러오기' }))

      await waitFor(() => {
        const textarea = screen.getByLabelText('내용') as HTMLTextAreaElement
        expect(textarea.value).toBe('복원할 내용')
      })
    })

    it('버리기 선택 시 clearDiaryDraft를 호출하고 dialog를 닫는다', async () => {
      const user = userEvent.setup()
      mockGetDraft.mockResolvedValue({
        entryType: 'quote',
        body: '오래된 초안',
      })

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await waitFor(() => screen.getByRole('dialog'))
      await user.click(screen.getByRole('button', { name: '버리기' }))

      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalledWith('new')
        expect(screen.queryByRole('dialog')).toBeNull()
      })
    })
  })

  describe('저장 성공 후 draft 제거', () => {
    it('비회원 저장 성공 시 clearDiaryDraft를 호출한다', async () => {
      const user = userEvent.setup()
      mockLocalAddEntry.mockResolvedValue(makeEntry({ body: '저장 내용' }))

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await user.type(screen.getByLabelText('내용'), '저장 내용')
      await user.click(screen.getByRole('button', { name: '저장' }))

      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalledWith('new')
      })
    })
  })

  describe('entryType union 검증', () => {
    it('문장/독후감 탭이 모두 렌더된다', () => {
      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      expect(screen.getByRole('tab', { name: '문장' })).toBeDefined()
      expect(screen.getByRole('tab', { name: '독후감' })).toBeDefined()
    })

    it('독후감 탭 클릭 시 hidden input 값이 review로 바뀐다', async () => {
      const user = userEvent.setup()

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      await user.click(screen.getByRole('tab', { name: '독후감' }))

      const hiddenInput = document.querySelector('input[name="entryType"]') as HTMLInputElement
      expect(hiddenInput.value).toBe('review')
    })
  })

  describe('글자 수 카운터', () => {
    it('body 입력 시 글자 수를 표시한다', async () => {
      const user = userEvent.setup()

      render(<DiaryEntryForm draftId="new" isLoggedIn={false} />)

      expect(screen.getByText('0 / 5000')).toBeDefined()

      await user.type(screen.getByLabelText('내용'), '안녕')

      await waitFor(() => {
        expect(screen.getByText('2 / 5000')).toBeDefined()
      })
    })
  })
})
