'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const ERROR_MESSAGES: Record<string, string> = {
  link_expired: '링크가 만료됐어요. 다시 로그인 링크를 요청해 주세요.',
  oauth_failed: '소셜 로그인에 실패했어요.',
  profile_setup_failed: '로그인은 됐지만 프로필 설정에 실패했어요. 잠시 후 다시 시도해 주세요.',
}

interface LoginFormProps {
  error?: string
  reason?: string
}

export function LoginForm({ error, reason }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const errorMessage =
    (error && ERROR_MESSAGES[error]) ??
    (reason === 'expired' ? '세션이 만료됐어요. 다시 로그인해 주세요.' : null)

  function getCallbackUrl() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    return `${base}/auth/callback`
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPending(true)
    setLocalError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getCallbackUrl() },
    })
    setPending(false)

    if (signInError) {
      setLocalError('이메일 전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } else {
      setSent(true)
    }
  }

  async function handleGoogle() {
    setPending(true)
    setLocalError(null)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getCallbackUrl() },
    })
    setPending(false)
  }

  const displayError = localError ?? errorMessage

  return (
    <div className="flex flex-col gap-6">
      {displayError && (
        <p role="alert" className="text-sm text-[#c85a54] text-center">
          {displayError}
        </p>
      )}

      {sent ? (
        <p className="text-sm text-center text-[#a08866]">
          이메일을 확인해 주세요. 링크를 클릭하면 로그인돼요.
        </p>
      ) : (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm text-[#a08866]">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
          />
          <Button type="submit" variant="primary" pending={pending} pendingLabel="전송 중...">
            이메일로 로그인
          </Button>
        </form>
      )}

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-[#1a100a]" />
        <span className="text-xs text-[#6b5540]">또는</span>
        <hr className="flex-1 border-[#1a100a]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        pending={pending}
        pendingLabel="연결 중..."
        onClick={handleGoogle}
      >
        Google로 계속하기
      </Button>
    </div>
  )
}
