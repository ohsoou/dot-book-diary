'use client'

import { useEffect, useState } from 'react'
import { getPreferences, updatePreferences } from '@/lib/storage/preferences'

export function GuestBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    getPreferences().then((prefs) => {
      setDismissed(prefs.guestBannerDismissed ?? false)
    })
  }, [])

  async function handleDismiss() {
    setDismissed(true)
    await updatePreferences({ guestBannerDismissed: true })
  }

  // null = 아직 로드 중 (플리커 방지)
  if (dismissed !== false) return null

  return (
    <div className="bg-[#3a2a1a] border border-[#8b6f4a] px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-[#d7c199]">
        이 방은 당신의 거예요. 로그인하면 어떤 기기에서도 책장을 꺼낼 수 있어요.
      </p>
      <button
        onClick={handleDismiss}
        aria-label="배너 닫기"
        className="text-[#a08866] hover:text-[#f4e4c1] transition-colors duration-100 ease-linear shrink-0"
      >
        ×
      </button>
    </div>
  )
}
