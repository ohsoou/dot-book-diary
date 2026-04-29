'use server'

import { createClient } from '@/lib/supabase/server'
import { signUpSchema, type SignUpInput } from '@/lib/validation/auth'
import { toValidationError } from '@/lib/validation'
import type { ActionResult } from '@/lib/errors'

export async function signUpAction(
  input: SignUpInput,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    const err = toValidationError(parsed.error.issues)
    return {
      ok: false,
      error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors },
    }
  }

  const { email, password, nickname } = parsed.data
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { nickname },
    },
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('already registered')) {
      return { ok: false, error: { code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요' } }
    }
    if (msg.includes('Password should be')) {
      return { ok: false, error: { code: 'WEAK_PASSWORD', message: '비밀번호는 영문+숫자 8자 이상이어야 해요' } }
    }
    return { ok: false, error: { code: 'UPSTREAM_FAILED', message: '가입에 실패했어요. 잠시 후 다시 시도해 주세요.' } }
  }

  return { ok: true, data: { email } }
}
