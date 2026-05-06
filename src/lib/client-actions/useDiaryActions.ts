'use client'

import { useMemo } from 'react'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError, type ActionResult } from '@/lib/errors'
import { diaryEntrySchema, toValidationError } from '@/lib/validation'
import type { DiaryEntry } from '@/types'
import {
  addDiaryEntryAction,
  updateDiaryEntryAction,
  deleteDiaryEntryAction,
} from '@/lib/actions/diary-entries'

export type DiaryEntryInput = {
  bookId?: string
  entryType: DiaryEntry['entryType']
  body: string
  page?: number
}

export type UseDiaryActions = {
  listEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<ActionResult<DiaryEntry[]>>
  getEntry(id: string): Promise<ActionResult<DiaryEntry | null>>
  addEntry(input: DiaryEntryInput): Promise<ActionResult<DiaryEntry>>
  updateEntry(id: string, input: DiaryEntryInput): Promise<ActionResult<DiaryEntry>>
  deleteEntry(id: string): Promise<ActionResult<void>>
}

function wrapError(err: unknown, fallbackMessage: string): ActionResult<never> {
  if (err instanceof AppError) {
    return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
  }
  return { ok: false, error: { code: 'UPSTREAM_FAILED', message: fallbackMessage } }
}

function inputToFormData(input: DiaryEntryInput): FormData {
  const fd = new FormData()
  if (input.bookId != null && input.bookId.trim() !== '') fd.set('bookId', input.bookId)
  fd.set('entryType', input.entryType)
  fd.set('body', input.body)
  if (input.page != null) fd.set('page', String(input.page))
  return fd
}

export function useDiaryActions(opts: { isLoggedIn: boolean }): UseDiaryActions {
  const store = useMemo(() => new LocalStore(), [])

  return useMemo<UseDiaryActions>(() => {
    // listEntries / getEntry: member reads happen server-side via SSR;
    // client-side reads are guest-only, so both paths use LocalStore.
    const listEntries = async (filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }) => {
      try {
        const entries = await store.listDiaryEntries(filter)
        return { ok: true, data: entries } as ActionResult<DiaryEntry[]>
      } catch (err) {
        return wrapError(err, '일기 목록을 불러오지 못했어요')
      }
    }

    const getEntry = async (id: string) => {
      try {
        const entry = await store.getDiaryEntry(id)
        return { ok: true, data: entry } as ActionResult<DiaryEntry | null>
      } catch (err) {
        return wrapError(err, '일기를 불러오지 못했어요')
      }
    }

    if (opts.isLoggedIn) {
      return {
        listEntries,
        getEntry,
        addEntry: (input) => addDiaryEntryAction(null, inputToFormData(input)),
        updateEntry: (id, input) => updateDiaryEntryAction(id, null, inputToFormData(input)),
        deleteEntry: (id) => deleteDiaryEntryAction(id),
      }
    }

    return {
      listEntries,
      getEntry,
      addEntry: async (input) => {
        const parsed = diaryEntrySchema.safeParse(input)
        if (!parsed.success) {
          const appErr = toValidationError(parsed.error.issues)
          return { ok: false, error: { code: appErr.code, message: appErr.message, fieldErrors: appErr.fieldErrors } }
        }
        try {
          const entry = await store.addDiaryEntry(parsed.data)
          return { ok: true, data: entry }
        } catch (err) {
          return wrapError(err, '일기 저장에 실패했어요')
        }
      },
      updateEntry: async (id, input) => {
        const parsed = diaryEntrySchema.safeParse(input)
        if (!parsed.success) {
          const appErr = toValidationError(parsed.error.issues)
          return { ok: false, error: { code: appErr.code, message: appErr.message, fieldErrors: appErr.fieldErrors } }
        }
        try {
          const entry = await store.updateDiaryEntry(id, parsed.data)
          return { ok: true, data: entry }
        } catch (err) {
          return wrapError(err, '일기 수정에 실패했어요')
        }
      },
      deleteEntry: async (id) => {
        try {
          await store.deleteDiaryEntry(id)
          return { ok: true, data: undefined }
        } catch (err) {
          return wrapError(err, '일기 삭제에 실패했어요')
        }
      },
    }
  }, [opts.isLoggedIn, store])
}
