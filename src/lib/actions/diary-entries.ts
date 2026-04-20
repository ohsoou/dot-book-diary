'use server'

import { revalidatePath } from 'next/cache'
import { getStore } from '@/lib/storage'
import { AppError } from '@/lib/errors'
import { diaryEntrySchema, toValidationError } from '@/lib/validation'
import type { ActionResult } from '@/lib/errors'
import type { DiaryEntry } from '@/types'

function parseOptionalInt(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === '') return undefined
  const n = Number(value)
  return isNaN(n) ? undefined : Math.trunc(n)
}

function extractInput(formData: FormData) {
  const rawBookId = formData.get('bookId')
  const bookId = rawBookId && String(rawBookId).trim() !== '' ? String(rawBookId) : undefined
  return {
    bookId,
    entryType: formData.get('entryType'),
    body: formData.get('body'),
    page: parseOptionalInt(formData.get('page')),
  }
}

export async function addDiaryEntryAction(
  _prevState: ActionResult<DiaryEntry> | null,
  formData: FormData,
): Promise<ActionResult<DiaryEntry>> {
  try {
    const raw = extractInput(formData)
    const parsed = diaryEntrySchema.safeParse(raw)
    if (!parsed.success) throw toValidationError(parsed.error.issues)

    const store = await getStore()
    const entry = await store.addDiaryEntry(parsed.data)

    revalidatePath('/diary')
    if (parsed.data.bookId) revalidatePath('/reading/[bookId]', 'page')

    return { ok: true, data: entry }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '일기 저장에 실패했어요' } }
  }
}

export async function updateDiaryEntryAction(
  id: string,
  _prevState: ActionResult<DiaryEntry> | null,
  formData: FormData,
): Promise<ActionResult<DiaryEntry>> {
  try {
    const raw = extractInput(formData)
    const parsed = diaryEntrySchema.safeParse(raw)
    if (!parsed.success) throw toValidationError(parsed.error.issues)

    const store = await getStore()
    const entry = await store.updateDiaryEntry(id, parsed.data)

    revalidatePath('/diary')
    if (parsed.data.bookId) revalidatePath('/reading/[bookId]', 'page')

    return { ok: true, data: entry }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '일기 수정에 실패했어요' } }
  }
}

export async function deleteDiaryEntryAction(id: string): Promise<ActionResult<void>> {
  try {
    const store = await getStore()
    await store.deleteDiaryEntry(id)
    revalidatePath('/diary')
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '일기 삭제에 실패했어요' } }
  }
}