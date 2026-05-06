'use client'

import { useMemo } from 'react'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError, type ActionResult } from '@/lib/errors'
import type { ReadingSession } from '@/types'
import {
  addReadingSessionAction,
  updateReadingSessionAction,
  deleteReadingSessionAction,
} from '@/lib/actions/reading-sessions'

export type ReadingSessionInput = Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>

export type UseReadingSessionActions = {
  addSession(input: ReadingSessionInput): Promise<ActionResult<ReadingSession>>
  updateSession(id: string, patch: Partial<ReadingSessionInput>): Promise<ActionResult<ReadingSession>>
  deleteSession(id: string): Promise<ActionResult<void>>
}

function wrapError(err: unknown, fallbackMessage: string): ActionResult<never> {
  if (err instanceof AppError) {
    return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
  }
  return { ok: false, error: { code: 'UPSTREAM_FAILED', message: fallbackMessage } }
}

function inputToFormData(input: ReadingSessionInput): FormData {
  const fd = new FormData()
  fd.set('bookId', input.bookId)
  fd.set('readDate', input.readDate)
  if (input.startPage != null) fd.set('startPage', String(input.startPage))
  if (input.endPage != null) fd.set('endPage', String(input.endPage))
  if (input.durationMinutes != null) fd.set('durationMinutes', String(input.durationMinutes))
  return fd
}

function patchToFormData(patch: Partial<ReadingSessionInput>): FormData {
  const fd = new FormData()
  if (patch.readDate != null) fd.set('readDate', patch.readDate)
  if (patch.startPage != null) fd.set('startPage', String(patch.startPage))
  if (patch.endPage != null) fd.set('endPage', String(patch.endPage))
  if (patch.durationMinutes != null) fd.set('durationMinutes', String(patch.durationMinutes))
  return fd
}

export function useReadingSessionActions(opts: { isLoggedIn: boolean }): UseReadingSessionActions {
  const store = useMemo(() => new LocalStore(), [])

  return useMemo<UseReadingSessionActions>(() => {
    if (opts.isLoggedIn) {
      return {
        addSession: (input) => addReadingSessionAction(null, inputToFormData(input)),
        updateSession: (id, patch) => updateReadingSessionAction(id, null, patchToFormData(patch)),
        deleteSession: (id) => deleteReadingSessionAction(id),
      }
    }

    return {
      addSession: async (input) => {
        try {
          const session = await store.addReadingSession(input)
          return { ok: true, data: session }
        } catch (err) {
          return wrapError(err, '세션 추가에 실패했어요')
        }
      },
      updateSession: async (id, patch) => {
        try {
          const session = await store.updateReadingSession(id, patch)
          return { ok: true, data: session }
        } catch (err) {
          return wrapError(err, '세션 수정에 실패했어요')
        }
      },
      deleteSession: async (id) => {
        try {
          await store.deleteReadingSession(id)
          return { ok: true, data: undefined }
        } catch (err) {
          return wrapError(err, '세션 삭제에 실패했어요')
        }
      },
    }
  }, [opts.isLoggedIn, store])
}
