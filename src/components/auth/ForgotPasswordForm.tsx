'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const supabase = createClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      })
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-[#d7c199]">
          비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.
        </p>
        <Link
          href="/login"
          className="text-xs text-[#a08866] hover:text-[#f4e4c1] underline underline-offset-2"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
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

        <Button type="submit" variant="primary" pending={isPending} pendingLabel="전송 중...">
          재설정 메일 받기
        </Button>
      </form>

      <p className="text-xs text-center text-[#6b5540]">
        <Link
          href="/login"
          className="text-[#a08866] hover:text-[#f4e4c1] underline underline-offset-2"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  )
}
