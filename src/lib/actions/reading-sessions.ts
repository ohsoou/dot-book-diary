'use server'

import { revalidatePath } from 'next/cache'
import { getStore } from '@/lib/storage'
import { AppError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { ReadingSession } from '@/types'

function parseOptionalInt(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === '') return undefined
  const n = Number(value)
  return isNaN(n) ? undefined : Math.trunc(n)
}

export async function addReadingSessionAction(
  _prevState: ActionResult<ReadingSession> | null,
  formData: FormData,
): Promise<ActionResult<ReadingSession>> {
  try {
    const store = await getStore()
    const session = await store.addReadingSession({
      bookId: String(formData.get('bookId') ?? ''),
      readDate: String(formData.get('readDate') ?? ''),
      startPage: parseOptionalInt(formData.get('startPage')),
      endPage: parseOptionalInt(formData.get('endPage')),
      durationMinutes: parseOptionalInt(formData.get('durationMinutes')),
    })
    revalidatePath('/reading/[bookId]', 'page')
    revalidatePath('/book-calendar')
    return { ok: true, data: session }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '세션 추가에 실패했어요' } }
  }
}

export async function updateReadingSessionAction(
  id: string,
  _prevState: ActionResult<ReadingSession> | null,
  formData: FormData,
): Promise<ActionResult<ReadingSession>> {
  try {
    const store = await getStore()
    const session = await store.updateReadingSession(id, {
      readDate: String(formData.get('readDate') ?? ''),
      startPage: parseOptionalInt(formData.get('startPage')),
      endPage: parseOptionalInt(formData.get('endPage')),
      durationMinutes: parseOptionalInt(formData.get('durationMinutes')),
    })
    revalidatePath('/reading/[bookId]', 'page')
    revalidatePath('/book-calendar')
    return { ok: true, data: session }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '세션 수정에 실패했어요' } }
  }
}

export async function deleteReadingSessionAction(id: string): Promise<ActionResult<void>> {
  try {
    const store = await getStore()
    await store.deleteReadingSession(id)
    revalidatePath('/reading/[bookId]', 'page')
    revalidatePath('/book-calendar')
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '세션 삭제에 실패했어요' } }
  }
}
