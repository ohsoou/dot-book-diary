'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ToggleTabs } from '@/components/ui/ToggleTabs'
import { updateThemePreferenceAction } from '@/lib/actions/profile'
import { updatePreferences } from '@/lib/storage/preferences'
import { resolveTheme } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'

interface ThemeSelectorProps {
  initialPreference: ThemePreference
  isLoggedIn: boolean
}

const LABELS: Record<ThemePreference, string> = {
  system: '자동',
  day: '낮',
  night: '밤',
}

const PREFS: ThemePreference[] = ['system', 'day', 'night']
const VARIANTS = PREFS.map((p) => LABELS[p])

export function ThemeSelector({ initialPreference, isLoggedIn }: ThemeSelectorProps) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(message)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleChange(label: string) {
    const next = PREFS[VARIANTS.indexOf(label)]
    if (!next || next === preference) return

    const prev = preference
    setPreference(next)
    document.documentElement.dataset.theme = resolveTheme(next)

    const result = await updateThemePreferenceAction(next)
    if (!result.ok) {
      setPreference(prev)
      document.documentElement.dataset.theme = resolveTheme(prev)
      showToast('테마를 저장하지 못했어요')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[#6b5540]">로그인하면 테마를 저장할 수 있어요.</p>
        <Link
          href="/login"
          className="inline-block text-sm text-center bg-[#3a2a1a] border border-[#1a100a] px-4 py-2 text-[#d7c199] hover:border-[#a08866] transition-colors duration-100 ease-linear"
        >
          로그인
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ToggleTabs
        variants={VARIANTS}
        value={LABELS[preference]}
        onChange={handleChange}
      />
      <p className="text-xs text-[var(--color-text-secondary)]">밤에는 어둡게, 낮에는 밝게 보여요</p>
      {toastMessage && (
        <p role="alert" className="text-xs text-[#c85a54]">{toastMessage}</p>
      )}
    </div>
  )
}
