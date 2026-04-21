import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RoomScene } from '@/components/room/RoomScene'
import { GuestBanner } from '@/components/ui/GuestBanner'
import { resolveTheme } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'

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

  let themePreference: ThemePreference = 'system'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('theme_preference')
      .eq('user_id', user.id)
      .single()

    if (profile?.theme_preference) {
      themePreference = profile.theme_preference as ThemePreference
    }
  }

  const theme = resolveTheme(themePreference, new Date())

  return (
    <main className="fixed inset-0 bg-[var(--color-border)] flex flex-col">
      {isGuest && <GuestBanner />}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <RoomScene theme={theme} />
      </div>
    </main>
  )
}
