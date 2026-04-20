import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getStore } from '@/lib/storage'
import { DiaryList } from '@/components/diary/DiaryList'
import { DiaryListHydrator } from '@/components/diary/DiaryListHydrator'

export const metadata: Metadata = { title: '다이어리' }

export default async function DiaryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base text-[#f4e4c1]">다이어리</h1>
        <Link
          href={'/diary/new' as never}
          className="text-xs px-3 py-2 bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] transition-colors duration-100 ease-linear"
        >
          새 기록
        </Link>
      </div>

      {user ? (
        <ServerDiaryList />
      ) : (
        <DiaryListHydrator />
      )}
    </main>
  )
}

async function ServerDiaryList() {
  const store = await getStore()
  const entries = await store.listDiaryEntries()
  const sorted = entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return <DiaryList entries={sorted} />
}