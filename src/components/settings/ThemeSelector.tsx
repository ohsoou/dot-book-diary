'use client'

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

    if (isLoggedIn) {
      const result = await updateThemePreferenceAction(next)
      if (!result.ok) {
        setPreference(prev)
        document.documentElement.dataset.theme = resolveTheme(prev)
        showToast('테마를 저장하지 못했어요')
      }
    } else {
      try {
        await updatePreferences({ themePreference: next })
      } catch {
        setPreference(prev)
        document.documentElement.dataset.theme = resolveTheme(prev)
        showToast('테마를 저장하지 못했어요')
      }
    }
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
