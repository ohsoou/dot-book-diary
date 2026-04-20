'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/FieldError'
import { updateProfileAction } from '@/lib/actions/profile'
import { updatePreferences } from '@/lib/storage/preferences'

interface NicknameFormProps {
  isGuest: boolean
  defaultValue?: string
}

export function NicknameForm({ isGuest, defaultValue }: NicknameFormProps) {
  if (isGuest) {
    return <GuestNicknameForm defaultValue={defaultValue} />
  }
  return <MemberNicknameForm defaultValue={defaultValue} />
}

function MemberNicknameForm({ defaultValue }: { defaultValue?: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, null)
  const fieldError = state?.ok === false ? state.error.fieldErrors?.['nickname'] : undefined
  const success = state?.ok === true

  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        name="nickname"
        type="text"
        defaultValue={defaultValue}
        maxLength={30}
        placeholder="닉네임 입력"
        className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
      />
      <FieldError message={fieldError} />
      {success && <p className="text-xs text-[#a08866]">저장됐어요.</p>}
      <Button type="submit" variant="primary" size="sm" pending={pending} pendingLabel="저장 중...">
        저장
      </Button>
    </form>
  )
}

function GuestNicknameForm({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setPending(true)
    await updatePreferences({ nickname: value.trim() })
    setPending(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={30}
        placeholder="닉네임 입력"
        className="w-full bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]"
      />
      {saved && <p className="text-xs text-[#a08866]">저장됐어요.</p>}
      <Button type="submit" variant="primary" size="sm" pending={pending} pendingLabel="저장 중...">
        저장
      </Button>
    </form>
  )
}
