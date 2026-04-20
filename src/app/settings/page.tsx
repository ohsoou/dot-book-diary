import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NicknameForm } from '@/components/settings/NicknameForm'
import { LogoutButton } from '@/components/settings/LogoutButton'
import type { Profile } from '@/types'

export const metadata = { title: '설정' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      profile = {
        userId: data.user_id as string,
        nickname: (data.nickname as string | null) ?? undefined,
        createdAt: data.created_at as string,
        updatedAt: data.updated_at as string,
      }
    }
  }

  const isGuest = !user

  return (
    <main className="max-w-md mx-auto px-4 py-8 flex flex-col gap-8">
      <h1 className="text-lg font-semibold">설정</h1>

      {/* 계정 섹션 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-[#a08866] font-medium">계정</h2>
        {isGuest ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#6b5540]">로그인하면 기기 간 데이터를 동기화할 수 있어요.</p>
            <Link
              href="/login"
              className="inline-block text-sm text-center bg-[#3a2a1a] border border-[#1a100a] px-4 py-2 text-[#d7c199] hover:border-[#a08866] transition-colors"
            >
              로그인
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#a08866]">{user.email}</p>
            <LogoutButton />
          </div>
        )}
      </section>

      {/* 닉네임 섹션 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-[#a08866] font-medium">닉네임</h2>
        <NicknameForm isGuest={isGuest} defaultValue={profile?.nickname} />
      </section>

      {/* 동기화 섹션 — 회원에게만 표시 */}
      {!isGuest && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-[#a08866] font-medium">동기화</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#d7c199]">기기 간 동기화</p>
              <p className="text-xs text-[#6b5540]">v1.1에서 제공</p>
            </div>
            <input
              type="checkbox"
              disabled
              aria-label="기기 간 동기화 (준비 중)"
              className="opacity-40 cursor-not-allowed"
            />
          </div>
        </section>
      )}
    </main>
  )
}
