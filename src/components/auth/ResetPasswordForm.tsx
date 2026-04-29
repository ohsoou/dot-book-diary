'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { passwordSchema } from '@/lib/validation/auth'
import { Button } from '@/components/ui/Button'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(null)

    const result = passwordSchema.safeParse(password)
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? '비밀번호를 확인해 주세요')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('비밀번호 변경에 실패했어요. 재설정 링크가 만료됐을 수 있어요.')
        return
      }

      router.push('/login')
    })
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
          <label htmlFor="password" className="text-sm text-[#a08866]">
            새 비밀번호
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
          {fieldError && (
            <p role="alert" className="text-xs text-[#c85a54]">
              {fieldError}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" pending={isPending} pendingLabel="변경 중...">
          비밀번호 변경
        </Button>
      </form>
    </div>
  )
}
