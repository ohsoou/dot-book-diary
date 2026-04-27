'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DiaryEntry } from '@/types'
import type { ActionResult } from '@/lib/errors'
import { getDiaryDraft, setDiaryDraft, clearDiaryDraft } from '@/lib/storage/preferences'
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/FieldError'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  addDiaryEntryAction,
  updateDiaryEntryAction,
  deleteDiaryEntryAction,
} from '@/lib/actions/diary-entries'
import { LocalStore } from '@/lib/storage/LocalStore'
import { BookPicker } from './BookPicker'

export type EntryType = 'quote' | 'review'

interface DiaryEntryFormProps {
  draftId: string
  initialEntryType?: EntryType
  initialBody?: string
  initialBookId?: string
  initialPage?: number
  entryId?: string
  isLoggedIn: boolean
  onSuccess?: (entry: DiaryEntry) => void
  onDelete?: () => void
}

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  quote: '문장',
  review: '독후감',
}

const MAX_BODY = 5000

export function DiaryEntryForm({
  draftId,
  initialEntryType = 'quote',
  initialBody = '',
  initialBookId,
  initialPage,
  entryId,
  isLoggedIn,
  onSuccess,
  onDelete,
}: DiaryEntryFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const { setIsDirty } = useUnsavedChanges()

  const [entryType, setEntryType] = useState<EntryType>(initialEntryType)
  const [body, setBody] = useState(initialBody)
  const [page, setPage] = useState(initialPage != null ? String(initialPage) : '')
  const [bookId, setBookId] = useState<string | undefined>(initialBookId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDraftConfirm, setShowDraftConfirm] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<{
    entryType: EntryType
    body: string
    page?: number
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const initialRef = useRef({ entryType: initialEntryType, body: initialBody, page: initialPage, bookId: initialBookId })

  // dirty 감지
  const isDirty =
    entryType !== initialRef.current.entryType ||
    body !== initialRef.current.body ||
    page !== (initialRef.current.page != null ? String(initialRef.current.page) : '') ||
    bookId !== initialRef.current.bookId

  useEffect(() => {
    setIsDirty(isDirty)
  }, [isDirty, setIsDirty])

  // draft 복원: 마운트 시 1회
  useEffect(() => {
    getDiaryDraft(draftId).then((draft) => {
      if (!draft) return
      // 현재 폼이 비어 있거나 초기값과 동일할 때만 복원 제안
      setPendingDraft({
        entryType: draft.entryType,
        body: draft.body,
        page: draft.page,
      })
      setShowDraftConfirm(true)
    })
  }, [draftId])

  const applyDraft = useCallback(() => {
    if (!pendingDraft) return
    setEntryType(pendingDraft.entryType)
    setBody(pendingDraft.body)
    setPage(pendingDraft.page != null ? String(pendingDraft.page) : '')
    setPendingDraft(null)
    setShowDraftConfirm(false)
  }, [pendingDraft])

  const discardDraft = useCallback(() => {
    setPendingDraft(null)
    setShowDraftConfirm(false)
    clearDiaryDraft(draftId)
  }, [draftId])

  // 30초 autosave
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDirty) return
      setDiaryDraft(draftId, {
        entryType,
        body,
        bookId,
        page: page !== '' ? Number(page) : undefined,
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [draftId, entryType, body, page, bookId, isDirty])

  // Server Action 바인딩
  const boundUpdateAction = entryId
    ? updateDiaryEntryAction.bind(null, entryId)
    : null

  const [state, formAction, isPending] = useActionState<ActionResult<DiaryEntry> | null, FormData>(
    entryId ? boundUpdateAction! : addDiaryEntryAction,
    null,
  )

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {}
  const formError = state?.ok === false && !state.error.fieldErrors ? state.error.message : undefined

  // 성공 처리
  useEffect(() => {
    if (!state?.ok) return
    setIsDirty(false)
    clearDiaryDraft(draftId)
    addToast({ message: entryId ? '수정했어요' : '저장했어요', variant: 'success' })
    onSuccess?.(state.data)
    if (!onSuccess) {
      router.push('/diary')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      let result: ActionResult<void>
      if (isLoggedIn && entryId) {
        result = await deleteDiaryEntryAction(entryId)
      } else if (entryId) {
        const store = new LocalStore()
        await store.deleteDiaryEntry(entryId)
        result = { ok: true, data: undefined }
      } else {
        result = { ok: false, error: { code: 'NOT_FOUND', message: '삭제할 항목이 없어요' } }
      }

      if (result.ok) {
        setIsDirty(false)
        clearDiaryDraft(draftId)
        addToast({ message: '삭제했어요', variant: 'success' })
        onDelete?.()
        if (!onDelete) router.push('/diary')
      } else {
        addToast({ message: result.error.message, variant: 'error' })
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [entryId, isLoggedIn, draftId, addToast, setIsDirty, onDelete, router])

  const handleClientSubmit = useCallback(
    async (formData: FormData) => {
      if (isLoggedIn) return // Server Action이 처리
      const store = new LocalStore()
      try {
        const rawPage = formData.get('page')
        const pageNum =
          rawPage && String(rawPage).trim() !== ''
            ? Math.trunc(Number(rawPage))
            : undefined
        const rawBookId = formData.get('bookId')
        const bookId =
          rawBookId && String(rawBookId).trim() !== '' ? String(rawBookId) : undefined

        let entry: DiaryEntry
        if (entryId) {
          entry = await store.updateDiaryEntry(entryId, {
            entryType: formData.get('entryType') as EntryType,
            body: String(formData.get('body') ?? ''),
            bookId,
            page: pageNum,
          })
        } else {
          entry = await store.addDiaryEntry({
            entryType: formData.get('entryType') as EntryType,
            body: String(formData.get('body') ?? ''),
            bookId,
            page: pageNum,
          })
        }

        setIsDirty(false)
        clearDiaryDraft(draftId)
        addToast({ message: entryId ? '수정했어요' : '저장했어요', variant: 'success' })
        onSuccess?.(entry)
        if (!onSuccess) router.push('/diary')
      } catch {
        addToast({ message: '저장에 실패했어요', variant: 'error' })
      }
    },
    [isLoggedIn, entryId, draftId, addToast, setIsDirty, onSuccess, router],
  )

  const handleFormAction = useCallback(
    (formData: FormData) => {
      if (isLoggedIn) {
        formAction(formData)
      } else {
        handleClientSubmit(formData)
      }
    },
    [isLoggedIn, formAction, handleClientSubmit],
  )

  return (
    <>
      <form action={handleFormAction} className="flex flex-col gap-4">
        {/* entryType 토글 */}
        <div>
          <p className="text-xs text-[#a08866] mb-2">종류</p>
          <div className="flex border border-[#1a100a]">
            {(['quote', 'review'] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={entryType === type}
                onClick={() => setEntryType(type)}
                className={`flex-1 px-3 py-2 text-sm transition-colors duration-100 ease-linear ${
                  entryType === type
                    ? 'bg-[#e89b5e] text-[#2a1f17]'
                    : 'bg-transparent text-[#d7c199] hover:text-[#f4e4c1]'
                }`}
              >
                {ENTRY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <input type="hidden" name="entryType" value={entryType} />
          <FieldError message={fieldErrors['entryType']} />
        </div>

        {/* bookId picker */}
        <div>
          <p className="text-xs text-[#a08866] mb-2">연결할 책 (선택)</p>
          <BookPicker value={bookId} onChange={setBookId} />
          {bookId && <input type="hidden" name="bookId" value={bookId} />}
        </div>

        {/* body */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-[#a08866]" htmlFor="diary-body">
              내용
            </label>
            <span
              className={`text-xs ${body.length > MAX_BODY ? 'text-[#c85a54]' : 'text-[#a08866]'}`}
              aria-live="polite"
            >
              {body.length} / {MAX_BODY}
            </span>
          </div>
          <textarea
            id="diary-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={MAX_BODY}
            placeholder={entryType === 'quote' ? '기억하고 싶은 문장을 적어요' : '책에 대한 생각을 자유롭게 써요'}
            className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#e89b5e] resize-none"
          />
          <FieldError message={fieldErrors['body']} />
        </div>

        {/* page */}
        <div>
          <label className="text-xs text-[#a08866] block mb-1" htmlFor="diary-page">
            페이지 (선택)
          </label>
          <input
            id="diary-page"
            name="page"
            type="number"
            min="0"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="0"
            className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-32 focus:outline-none focus:border-[#e89b5e]"
          />
          <FieldError message={fieldErrors['page']} />
        </div>

        {formError && (
          <p className="text-xs text-[#c85a54]" role="alert">
            {formError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" pending={isPending} pendingLabel="저장 중...">
            {entryId ? '수정 저장' : '저장'}
          </Button>
          {entryId && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              pending={isDeleting}
              pendingLabel="삭제 중..."
            >
              삭제
            </Button>
          )}
        </div>
      </form>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="기록 삭제"
        message="이 기록을 삭제할까요? 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* draft 복원 확인 */}
      <ConfirmDialog
        open={showDraftConfirm}
        title="임시 저장된 내용"
        message="이전에 작성 중이던 내용이 있어요. 불러올까요?"
        confirmLabel="불러오기"
        cancelLabel="버리기"
        onConfirm={applyDraft}
        onCancel={discardDraft}
      />
    </>
  )
}
