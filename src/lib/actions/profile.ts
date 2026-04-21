'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema, themePreferenceSchema, toValidationError } from '@/lib/validation'
import { AppError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { Profile } from '@/types'

export async function updateProfileAction(
  _prevState: ActionResult<Profile> | null,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
    }

    const parsed = profileSchema.safeParse({ nickname: formData.get('nickname') })
    if (!parsed.success) {
      const err = toValidationError(parsed.error.issues)
      return {
        ok: false,
        error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors },
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, nickname: parsed.data.nickname }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '닉네임 저장에 실패했어요' } }
    }

    revalidatePath('/settings')

    const profile: Profile = {
      userId: data.user_id as string,
      nickname: (data.nickname as string | null) ?? undefined,
      themePreference: ((data.theme_preference as string | null) ?? 'system') as 'system' | 'day' | 'night',
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }
    return { ok: true, data: profile }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '닉네임 저장에 실패했어요' } }
  }
}

export async function updateThemePreferenceAction(
  pref: unknown,
): Promise<ActionResult<void>> {
  try {
    const parsed = themePreferenceSchema.safeParse(pref)
    if (!parsed.success) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: '올바른 테마 값이 아닙니다' } }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, theme_preference: parsed.data }, { onConflict: 'user_id' })

    if (error) {
      return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '테마를 저장하지 못했어요' } }
    }

    revalidatePath('/')
    revalidatePath('/settings')
    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '테마를 저장하지 못했어요' } }
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/')
}
