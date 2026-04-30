import type { AppErrorCode } from '@/lib/errors'

type MappedError = { code: AppErrorCode; message: string }

const BY_CODE: Record<string, MappedError> = {
  user_already_exists: { code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요' },
  email_exists: { code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요' },
  weak_password: { code: 'WEAK_PASSWORD', message: '비밀번호는 영문+숫자 8자 이상이어야 해요' },
  invalid_credentials: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 일치하지 않아요.' },
  email_not_confirmed: { code: 'EMAIL_NOT_CONFIRMED', message: '이메일을 확인해 주세요. 메일함에서 인증 링크를 클릭해 주세요.' },
}

const FALLBACK: MappedError = { code: 'UPSTREAM_FAILED', message: '요청에 실패했어요. 잠시 후 다시 시도해 주세요.' }

export function mapSupabaseAuthError(
  error: { message?: string; code?: string } | null | undefined,
): MappedError {
  if (!error) return FALLBACK

  const byCode = error.code ? BY_CODE[error.code] : undefined
  if (byCode) return byCode

  const msg = error.message ?? ''
  if (msg.includes('already registered')) return BY_CODE.user_already_exists!
  if (msg.includes('Password should be')) return BY_CODE.weak_password!
  if (msg.includes('Invalid login credentials')) return BY_CODE.invalid_credentials!
  if (msg.includes('Email not confirmed')) return BY_CODE.email_not_confirmed!

  return FALLBACK
}
