'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: '이미 가입된 이메일이에요',
  WEAK_PASSWORD: '비밀번호는 영문+숫자 8자 이상이어야 해요',
  UPSTREAM_FAILED: '가입에 실패했어요. 잠시 후 다시 시도해 주세요.',
}

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await signUpAction({ email, password, nickname })

      if (result.ok) {
        setSent(true)
        return
      }

      const { code, message, fieldErrors: fe } = result.error
      if (fe && Object.keys(fe).length > 0) {
        setFieldErrors(fe)
      } else {
        setError(ERROR_MESSAGES[code] ?? message)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-[#a08866]">
          확인 메일을 보냈어요. 메일함을 확인해 주세요.
        </p>
        <p className="text-xs text-[#6b5540]">
          링크를 클릭하면 가입이 완료돼요.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-[#c85a54] text-center">
          {error}
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
          {fieldErrors['email'] && (
            <p role="alert" className="text-xs text-[#c85a54]">
              {fieldErrors['email']}
            </p>
          )}
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
            placeholder="영문+숫자 8자 이상"
            required
            className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
          />
          {fieldErrors['password'] && (
            <p role="alert" className="text-xs text-[#c85a54]">
              {fieldErrors['password']}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nickname" className="text-sm text-[#a08866]">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="책곰이"
            required
            className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
          />
          {fieldErrors['nickname'] && (
            <p role="alert" className="text-xs text-[#c85a54]">
              {fieldErrors['nickname']}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" pending={isPending} pendingLabel="가입 중...">
          회원가입
        </Button>
      </form>

      <p className="text-xs text-center text-[#6b5540]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-[#a08866] hover:text-[#f4e4c1] underline underline-offset-2">
          로그인
        </Link>
      </p>
    </div>
  )
}
