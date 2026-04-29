'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const ERROR_MESSAGES: Record<string, string> = {
  link_expired: '링크가 만료됐어요. 다시 로그인해 주세요.',
  profile_setup_failed: '로그인은 됐지만 프로필 설정에 실패했어요. 잠시 후 다시 시도해 주세요.',
}

interface LoginFormProps {
  error?: string
  reason?: string
}

export function LoginForm({ error, reason }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const errorMessage =
    (error && ERROR_MESSAGES[error]) ??
    (reason === 'expired' ? '세션이 만료됐어요. 다시 로그인해 주세요.' : null)

  const displayError = localError ?? errorMessage

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setLocalError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setPending(false)

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setLocalError('이메일 또는 비밀번호가 일치하지 않아요.')
      } else if (signInError.message.includes('Email not confirmed')) {
        setLocalError('이메일을 확인해 주세요. 메일함에서 인증 링크를 클릭해 주세요.')
      } else {
        setLocalError('로그인에 실패했어요. 잠시 후 다시 시도해 주세요.')
      }
      return
    }

    router.push('/')
  }

  return (
    <div className="flex flex-col gap-6">
      {displayError && (
        <p role="alert" className="text-sm text-[#c85a54] text-center">
          {displayError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
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
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-[#a08866]">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            required
            className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
          />
        </div>

        <Button type="submit" variant="primary" pending={pending} pendingLabel="로그인 중...">
          로그인
        </Button>
      </form>

      <p className="text-xs text-center text-[#6b5540]">
        <Link
          href={'/forgot-password' as Route}
          className="text-[#a08866] hover:text-[#f4e4c1] underline underline-offset-2"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </p>

      <p className="text-xs text-center text-[#6b5540]">
        아직 계정이 없으신가요?{' '}
        <Link href="/signup" className="text-[#a08866] hover:text-[#f4e4c1] underline underline-offset-2">
          회원가입
        </Link>
      </p>
    </div>
  )
}
