import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RoomScene } from '@/components/room/RoomScene'
import { GuestBanner } from '@/components/ui/GuestBanner'

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

  return (
    <main className="min-h-screen bg-[#2a1f17] flex flex-col items-center">
      {isGuest && <GuestBanner />}
      <div className="pt-6 flex justify-center">
        <RoomScene />
      </div>
    </main>
  )
}