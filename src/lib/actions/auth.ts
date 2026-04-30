'use server'

import { createClient } from '@/lib/supabase/server'
import { signUpSchema, type SignUpInput } from '@/lib/validation/auth'
import { toValidationError } from '@/lib/validation'
import type { ActionResult } from '@/lib/errors'
import { mapSupabaseAuthError } from '@/lib/auth/error-codes'

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
    return { ok: false, error: mapSupabaseAuthError(error) }
  }

  return { ok: true, data: { email } }
}
