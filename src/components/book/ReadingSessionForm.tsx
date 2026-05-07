'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Book, ReadingSession } from '@/types'
import { formatLocalYmd } from '@/lib/date'
import { readingSessionSchema } from '@/lib/validation'
import { BookCover } from './BookCover'
import { ReadingTimer } from './ReadingTimer'
import { GoalProgress } from './GoalProgress'
import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/FieldError'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useBookActions } from '@/lib/client-actions/useBookActions'
import { useReadingSessionActions } from '@/lib/client-actions/useReadingSessionActions'

interface ReadingSessionFormProps {
  book: Book
  sessions: ReadingSession[]
  isLoggedIn: boolean
}

interface FormFields {
  readDate: string
  startPage: string
  endPage: string
  durationMinutes: string
}

interface FieldErrors {
  readDate?: string
  startPage?: string
  endPage?: string
  durationMinutes?: string
  _form?: string
}

function emptyFields(today: string): FormFields {
  return { readDate: today, startPage: '', endPage: '', durationMinutes: '' }
}

function sessionToFields(s: ReadingSession): FormFields {
  return {
    readDate: s.readDate,
    startPage: s.startPage != null ? String(s.startPage) : '',
    endPage: s.endPage != null ? String(s.endPage) : '',
    durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : '',
  }
}

function parseOptionalInt(value: string): number | undefined {
  if (value === '') return undefined
  const n = Number(value)
  return isNaN(n) ? undefined : Math.trunc(n)
}

export function ReadingSessionForm({ book, sessions: initialSessions, isLoggedIn }: ReadingSessionFormProps) {
  const router = useRouter()
  const today = formatLocalYmd(new Date())
  const { addToast } = useToast()

  const bookActions = useBookActions({ isLoggedIn })
  const sessionActions = useReadingSessionActions({ isLoggedIn })

  const [sessions, setSessions] = useState<ReadingSession[]>(initialSessions)
  const [currentBook, setCurrentBook] = useState<Book>(book)
  const [targetDateInput, setTargetDateInput] = useState(book.targetDate ?? '')
  const [memoValue, setMemoValue] = useState(book.memo ?? '')
  const [fields, setFields] = useState<FormFields>(emptyFields(today))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [showBookDeleteDialog, setShowBookDeleteDialog] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isTargetDatePending, startTargetDateTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isRatingPending, startRatingTransition] = useTransition()
  const [, startMemoTransition] = useTransition()

  useEffect(() => {
    setSessions(initialSessions)
  }, [initialSessions])

  const handleTargetDateSave = useCallback(() => {
    const newTargetDate = targetDateInput.trim() || undefined
    startTargetDateTransition(async () => {
      const result = await bookActions.updateBook(currentBook.id, { targetDate: newTargetDate })
      if (result.ok) {
        setCurrentBook(result.data)
        setTargetDateInput(result.data.targetDate ?? '')
      }
    })
  }, [bookActions, currentBook.id, targetDateInput])

  const handleStatusToggle = useCallback(() => {
    const newStatus = currentBook.status === 'finished' ? 'reading' : 'finished'
    startStatusTransition(async () => {
      const result = await bookActions.updateBook(currentBook.id, { status: newStatus })
      if (result.ok) {
        setCurrentBook(result.data)
      } else {
        addToast({ message: result.error.message, variant: 'error' })
      }
    })
  }, [bookActions, currentBook.id, currentBook.status, addToast])

  const handleRating = useCallback(
    (rating: number) => {
      startRatingTransition(async () => {
        const result = await bookActions.updateBook(currentBook.id, { rating })
        if (result.ok) {
          setCurrentBook(result.data)
        } else {
          addToast({ message: result.error.message, variant: 'error' })
        }
      })
    },
    [bookActions, currentBook.id, addToast],
  )

  const handleMemoSave = useCallback(() => {
    const memo = memoValue || undefined
    const currentMemo = currentBook.memo || undefined
    if (memo === currentMemo) return
    startMemoTransition(async () => {
      const result = await bookActions.updateBook(currentBook.id, { memo })
      if (result.ok) {
        setCurrentBook(result.data)
      } else {
        addToast({ message: result.error.message, variant: 'error' })
      }
    })
  }, [bookActions, currentBook.id, currentBook.memo, memoValue, addToast])

  const handleFieldChange = useCallback((key: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const startEdit = useCallback((session: ReadingSession) => {
    setEditingId(session.id)
    setFields(sessionToFields(session))
    setFieldErrors({})
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setFields(emptyFields(today))
    setFieldErrors({})
  }, [today])

  const validateFields = useCallback((): boolean => {
    const parsed = readingSessionSchema.safeParse({
      bookId: book.id,
      readDate: fields.readDate,
      startPage: parseOptionalInt(fields.startPage),
      endPage: parseOptionalInt(fields.endPage),
      durationMinutes: parseOptionalInt(fields.durationMinutes),
    })
    if (!parsed.success) {
      const errs: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors | undefined
        if (field && field in { readDate: 1, startPage: 1, endPage: 1, durationMinutes: 1 }) {
          errs[field] = issue.message
        } else {
          errs._form = issue.message
        }
      }
      setFieldErrors(errs)
      return false
    }
    return true
  }, [book.id, fields])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!validateFields()) return

      startTransition(async () => {
        const result = editingId
          ? await sessionActions.updateSession(editingId, {
              readDate: fields.readDate,
              startPage: parseOptionalInt(fields.startPage),
              endPage: parseOptionalInt(fields.endPage),
              durationMinutes: parseOptionalInt(fields.durationMinutes),
            })
          : await sessionActions.addSession({
              bookId: book.id,
              readDate: fields.readDate,
              startPage: parseOptionalInt(fields.startPage),
              endPage: parseOptionalInt(fields.endPage),
              durationMinutes: parseOptionalInt(fields.durationMinutes),
            })

        if (result.ok) {
          if (editingId) {
            setSessions((prev) => prev.map((s) => (s.id === editingId ? result.data : s)))
          } else {
            setSessions((prev) => [result.data, ...prev])
          }
          setEditingId(null)
          setFields(emptyFields(today))
          setFieldErrors({})
        } else {
          if (result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors as FieldErrors)
          } else {
            setFieldErrors({ _form: result.error.message })
          }
        }
      })
    },
    [book.id, editingId, fields, sessionActions, today, validateFields],
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      startTransition(async () => {
        const result = await sessionActions.deleteSession(id)
        if (result.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== id))
          if (editingId === id) cancelEdit()
        }
        setDeletingSessionId(null)
      })
    },
    [sessionActions, editingId, cancelEdit],
  )

  const handleDeleteBook = useCallback(async () => {
    startTransition(async () => {
      const result = await bookActions.deleteBook(book.id)
      if (result.ok) {
        router.push('/bookshelf')
      }
      setShowBookDeleteDialog(false)
    })
  }, [bookActions, book.id, router])

  return (
    <div className="flex flex-col gap-6">
      {/* 책 메타 */}
      <div className="flex gap-4 items-start">
        <BookCover book={book} />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <h1 className="text-base text-[var(--color-text-primary)] leading-snug">{book.title}</h1>
          {book.author && <p className="text-sm text-[var(--color-text-secondary)]">{book.author}</p>}
          {book.publisher && <p className="text-xs text-[var(--color-neutral)]">{book.publisher}</p>}
          <Button
            variant="danger"
            size="sm"
            className="self-start mt-2"
            onClick={() => setShowBookDeleteDialog(true)}
          >
            책 삭제
          </Button>
        </div>
      </div>

      {/* 완독 표시 / 별점 / 메모 */}
      <section className="flex flex-col gap-4">
        <div>
          <Button
            type="button"
            variant={currentBook.status === 'finished' ? 'secondary' : 'primary'}
            size="sm"
            pending={isStatusPending}
            pendingLabel="저장 중..."
            onClick={handleStatusToggle}
          >
            {currentBook.status === 'finished' ? '완독 취소' : '완독 표시'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)]">별점</span>
          <div className="flex gap-1" role="group" aria-label="별점">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n}점`}
                onClick={() => handleRating(n)}
                disabled={isRatingPending}
                className="text-lg leading-none text-[var(--color-accent)] hover:opacity-70 transition-opacity duration-100 ease-linear disabled:opacity-40"
              >
                {n <= (currentBook.rating ?? 0) ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="bookMemo">
            한 줄 메모
          </label>
          <textarea
            id="bookMemo"
            maxLength={500}
            value={memoValue}
            onChange={(e) => setMemoValue(e.target.value)}
            onBlur={handleMemoSave}
            placeholder="이 책에 대한 메모를 남겨 보세요"
            className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)] resize-y min-h-[80px] placeholder:text-[var(--color-text-disabled)]"
          />
        </div>
      </section>

      {/* 독서 타이머 */}
      <ReadingTimer
        bookId={book.id}
        onStop={(seconds) => {
          const minutes = Math.round(seconds / 60)
          setFields((prev) => ({ ...prev, durationMinutes: String(minutes) }))
          document.getElementById('durationMinutes')?.focus()
        }}
      />

      {/* diary 딥링크 */}
      <div className="flex gap-2">
        <Link
          href={`/diary/new?bookId=${book.id}&type=quote` as never}
          className="text-xs px-3 py-2 border border-[var(--color-neutral)] text-[var(--color-text-body)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors duration-100 ease-linear"
        >
          이 책으로 문장 기록
        </Link>
        <Link
          href={`/diary/new?bookId=${book.id}&type=review` as never}
          className="text-xs px-3 py-2 border border-[var(--color-neutral)] text-[var(--color-text-body)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors duration-100 ease-linear"
        >
          독후감 작성
        </Link>
      </div>

      {/* 책 설정: 목표 완독일 */}
      <section>
        <h2 className="text-sm text-[var(--color-text-body)] mb-3">책 설정</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="targetDate">
              목표 완독일
            </label>
            <input
              id="targetDate"
              type="date"
              value={targetDateInput}
              min={formatLocalYmd(new Date(currentBook.createdAt))}
              onChange={(e) => setTargetDateInput(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)]"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            pending={isTargetDatePending}
            pendingLabel="저장 중..."
            onClick={handleTargetDateSave}
          >
            저장
          </Button>
        </div>
        <div className="mt-3">
          <GoalProgress book={currentBook} sessions={sessions} />
        </div>
      </section>

      {/* 세션 추가/수정 폼 */}
      <section>
        <h2 className="text-sm text-[var(--color-text-body)] mb-3">
          {editingId ? '기록 수정' : '독서 기록 추가'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="readDate">
              날짜
            </label>
            <input
              id="readDate"
              name="readDate"
              type="date"
              value={fields.readDate}
              max={today}
              onChange={(e) => handleFieldChange('readDate', e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)]"
            />
            <FieldError message={fieldErrors.readDate} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="startPage">
                시작 페이지
              </label>
              <input
                id="startPage"
                name="startPage"
                type="number"
                min="0"
                value={fields.startPage}
                onChange={(e) => handleFieldChange('startPage', e.target.value)}
                className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.startPage} />
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="endPage">
                끝 페이지
              </label>
              <input
                id="endPage"
                name="endPage"
                type="number"
                min="0"
                value={fields.endPage}
                onChange={(e) => handleFieldChange('endPage', e.target.value)}
                className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.endPage} />
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1" htmlFor="durationMinutes">
                독서 시간(분)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="0"
                value={fields.durationMinutes}
                onChange={(e) => handleFieldChange('durationMinutes', e.target.value)}
                className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-3 py-2 w-full focus:outline-none focus:border-[var(--color-border-focus)]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.durationMinutes} />
            </div>
          </div>

          {fieldErrors._form && (
            <p className="text-xs text-[var(--color-error)]" role="alert">
              {fieldErrors._form}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" pending={isPending} pendingLabel="저장 중...">
              {editingId ? '수정 저장' : '기록 추가'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                취소
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* 세션 목록 */}
      {sessions.length > 0 && (
        <section>
          <h2 className="text-sm text-[var(--color-text-body)] mb-3">독서 기록 ({sessions.length})</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-[var(--color-text-primary)]">{session.readDate}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {[
                      session.startPage != null && session.endPage != null
                        ? `${session.startPage}–${session.endPage}p`
                        : null,
                      session.durationMinutes != null
                        ? `${session.durationMinutes}분`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(session)}
                  >
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setDeletingSessionId(session.id)}
                  >
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 세션 삭제 confirm */}
      <ConfirmDialog
        open={deletingSessionId !== null}
        title="기록 삭제"
        message="이 기록을 삭제할까요? 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={() => {
          if (deletingSessionId) handleDeleteSession(deletingSessionId)
        }}
        onCancel={() => setDeletingSessionId(null)}
      />

      {/* 책 삭제 confirm */}
      <ConfirmDialog
        open={showBookDeleteDialog}
        title="책 삭제"
        message="이 책을 책장에서 삭제할까요? 관련 독서 세션도 함께 삭제돼요."
        confirmLabel="삭제"
        onConfirm={handleDeleteBook}
        onCancel={() => setShowBookDeleteDialog(false)}
      />
    </div>
  )
}
