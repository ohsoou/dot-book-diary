import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RoomScene } from '@/components/room/RoomScene'
import { GuestBanner } from '@/components/ui/GuestBanner'
import { LastReadNote } from '@/components/room/LastReadNote'
import { BearStateProvider } from '@/components/room/BearStateContext'
import { BearStateHydrator } from '@/components/room/BearStateHydrator'
import { BearSpeechBubble } from '@/components/room/BearSpeechBubble'
import { resolveTheme } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'
import { getLastReadAtFromSupabase } from '@/lib/reading/last-read'
import { computeBearState } from '@/lib/room/bear-state'
import type { BearStateContextValue } from '@/components/room/BearStateContext'
import { getDisplayNickname } from '@/lib/room/nickname'
import { HomeGuide } from '@/components/onboarding/HomeGuide'

export const metadata: Metadata = {
  title: '홈',
  description: '따뜻한 도트 방에서 쓰는 독서 기록',
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isGuest = !user

  const now = new Date()
  let themePreference: ThemePreference = 'system'
  let initialBearState: BearStateContextValue = {
    bearAsset: undefined,
    bearLabel: null,
    lastReadAt: null,
    nickname: getDisplayNickname(undefined),
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('theme_preference, nickname')
      .eq('user_id', user.id)
      .single()

    if (profile?.theme_preference) {
      themePreference = profile.theme_preference as ThemePreference
    }

    const lastReadAt = await getLastReadAtFromSupabase(user.id, supabase)
    const bearState = computeBearState(lastReadAt, { now })
    initialBearState = {
      bearAsset: lastReadAt !== null ? bearState.asset : undefined,
      bearLabel: bearState.label,
      lastReadAt,
      nickname: getDisplayNickname(profile?.nickname),
    }
  }

  const theme = resolveTheme(themePreference, now)

  return (
    <main className="fixed top-0 inset-x-0 bottom-[64px] app-frame-fixed bg-[var(--color-border)] grid grid-rows-[1fr_auto_1fr]">
      <BearStateProvider initial={initialBearState}>
        <BearStateHydrator isGuest={isGuest} />
        <div className="flex flex-col items-stretch justify-center">
          {isGuest && <GuestBanner />}
          <HomeGuide />
          <BearSpeechBubble />
        </div>
        <div className="room-scene-wrapper flex items-center justify-center overflow-hidden">
          <RoomScene theme={theme} />
        </div>
        <div className="flex items-center justify-center">
          <LastReadNote now={now} />
        </div>
      </BearStateProvider>
    </main>
  )
}
