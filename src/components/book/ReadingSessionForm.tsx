'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Book, ReadingSession } from '@/types'
import { formatLocalYmd } from '@/lib/date'
import { readingSessionSchema } from '@/lib/validation'
import { BookCover } from './BookCover'
import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/FieldError'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  addReadingSessionAction,
  updateReadingSessionAction,
  deleteReadingSessionAction,
} from '@/lib/actions/reading-sessions'
import { deleteBookAction } from '@/lib/actions/books'
import { LocalStore } from '@/lib/storage/LocalStore'
import type { ActionResult } from '@/lib/errors'

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

function buildFormData(bookId: string, fields: FormFields): FormData {
  const fd = new FormData()
  fd.set('bookId', bookId)
  fd.set('readDate', fields.readDate)
  if (fields.startPage !== '') fd.set('startPage', fields.startPage)
  if (fields.endPage !== '') fd.set('endPage', fields.endPage)
  if (fields.durationMinutes !== '') fd.set('durationMinutes', fields.durationMinutes)
  return fd
}

export function ReadingSessionForm({ book, sessions: initialSessions, isLoggedIn }: ReadingSessionFormProps) {
  const router = useRouter()
  const today = formatLocalYmd(new Date())

  const [sessions, setSessions] = useState<ReadingSession[]>(initialSessions)
  const [fields, setFields] = useState<FormFields>(emptyFields(today))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [showBookDeleteDialog, setShowBookDeleteDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSessions(initialSessions)
  }, [initialSessions])

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

      const fd = buildFormData(book.id, fields)

      startTransition(async () => {
        let result: ActionResult<ReadingSession>

        if (isLoggedIn) {
          if (editingId) {
            result = await updateReadingSessionAction(editingId, null, fd)
          } else {
            result = await addReadingSessionAction(null, fd)
          }
        } else {
          const store = new LocalStore()
          try {
            if (editingId) {
              const updated = await store.updateReadingSession(editingId, {
                readDate: fields.readDate,
                startPage: parseOptionalInt(fields.startPage),
                endPage: parseOptionalInt(fields.endPage),
                durationMinutes: parseOptionalInt(fields.durationMinutes),
              })
              result = { ok: true, data: updated }
            } else {
              const added = await store.addReadingSession({
                bookId: book.id,
                readDate: fields.readDate,
                startPage: parseOptionalInt(fields.startPage),
                endPage: parseOptionalInt(fields.endPage),
                durationMinutes: parseOptionalInt(fields.durationMinutes),
              })
              result = { ok: true, data: added }
            }
          } catch {
            result = { ok: false, error: { code: 'UPSTREAM_FAILED', message: '저장에 실패했어요' } }
          }
        }

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
    [book.id, editingId, fields, isLoggedIn, today, validateFields],
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      startTransition(async () => {
        let result: ActionResult<void>
        if (isLoggedIn) {
          result = await deleteReadingSessionAction(id)
        } else {
          const store = new LocalStore()
          try {
            await store.deleteReadingSession(id)
            result = { ok: true, data: undefined }
          } catch {
            result = { ok: false, error: { code: 'UPSTREAM_FAILED', message: '삭제에 실패했어요' } }
          }
        }
        if (result.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== id))
          if (editingId === id) cancelEdit()
        }
        setDeletingSessionId(null)
      })
    },
    [isLoggedIn, editingId, cancelEdit],
  )

  const handleDeleteBook = useCallback(async () => {
    startTransition(async () => {
      let result: ActionResult<void>
      if (isLoggedIn) {
        result = await deleteBookAction(book.id)
      } else {
        const store = new LocalStore()
        try {
          await store.deleteBook(book.id)
          result = { ok: true, data: undefined }
        } catch {
          result = { ok: false, error: { code: 'UPSTREAM_FAILED', message: '삭제에 실패했어요' } }
        }
      }
      if (result.ok) {
        router.push('/bookshelf')
      }
      setShowBookDeleteDialog(false)
    })
  }, [book.id, isLoggedIn, router])

  return (
    <div className="flex flex-col gap-6">
      {/* 책 메타 */}
      <div className="flex gap-4 items-start">
        <BookCover book={book} />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <h1 className="text-base text-[#f4e4c1] leading-snug">{book.title}</h1>
          {book.author && <p className="text-sm text-[#a08866]">{book.author}</p>}
          {book.publisher && <p className="text-xs text-[#8b6f4a]">{book.publisher}</p>}
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

      {/* diary 딥링크 */}
      <div className="flex gap-2">
        <Link
          href={`/diary/new?bookId=${book.id}&type=quote` as never}
          className="text-xs px-3 py-2 border border-[#8b6f4a] text-[#d7c199] hover:border-[#e89b5e] hover:text-[#f4e4c1] transition-colors"
        >
          이 책으로 문장 기록
        </Link>
        <Link
          href={`/diary/new?bookId=${book.id}&type=review` as never}
          className="text-xs px-3 py-2 border border-[#8b6f4a] text-[#d7c199] hover:border-[#e89b5e] hover:text-[#f4e4c1] transition-colors"
        >
          독후감 작성
        </Link>
      </div>

      {/* 세션 추가/수정 폼 */}
      <section>
        <h2 className="text-sm text-[#d7c199] mb-3">
          {editingId ? '기록 수정' : '독서 기록 추가'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#a08866] block mb-1" htmlFor="readDate">
              날짜
            </label>
            <input
              id="readDate"
              name="readDate"
              type="date"
              value={fields.readDate}
              max={today}
              onChange={(e) => handleFieldChange('readDate', e.target.value)}
              className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#e89b5e]"
            />
            <FieldError message={fieldErrors.readDate} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-[#a08866] block mb-1" htmlFor="startPage">
                시작 페이지
              </label>
              <input
                id="startPage"
                name="startPage"
                type="number"
                min="0"
                value={fields.startPage}
                onChange={(e) => handleFieldChange('startPage', e.target.value)}
                className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#e89b5e]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.startPage} />
            </div>

            <div>
              <label className="text-xs text-[#a08866] block mb-1" htmlFor="endPage">
                끝 페이지
              </label>
              <input
                id="endPage"
                name="endPage"
                type="number"
                min="0"
                value={fields.endPage}
                onChange={(e) => handleFieldChange('endPage', e.target.value)}
                className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#e89b5e]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.endPage} />
            </div>

            <div>
              <label className="text-xs text-[#a08866] block mb-1" htmlFor="durationMinutes">
                독서 시간(분)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="0"
                value={fields.durationMinutes}
                onChange={(e) => handleFieldChange('durationMinutes', e.target.value)}
                className="bg-[#3a2a1a] border border-[#8b6f4a] text-[#f4e4c1] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#e89b5e]"
                placeholder="0"
              />
              <FieldError message={fieldErrors.durationMinutes} />
            </div>
          </div>

          {fieldErrors._form && (
            <p className="text-xs text-[#c85a54]" role="alert">
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
          <h2 className="text-sm text-[#d7c199] mb-3">독서 기록 ({sessions.length})</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between bg-[#3a2a1a] border border-[#1a100a] px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-[#f4e4c1]">{session.readDate}</span>
                  <span className="text-xs text-[#a08866]">
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
