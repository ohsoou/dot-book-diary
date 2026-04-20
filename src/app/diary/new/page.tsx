import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DiaryEntryForm } from '@/components/diary/DiaryEntryForm'
import type { EntryType } from '@/components/diary/DiaryEntryForm'

export const metadata: Metadata = { title: '새 기록' }

interface Props {
  searchParams: Promise<{ bookId?: string; type?: string }>
}

export default async function DiaryNewPage({ searchParams }: Props) {
  const { bookId, type } = await searchParams
  const initialEntryType: EntryType = type === 'review' ? 'review' : 'quote'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={'/diary' as never}
          className="text-xs text-[#a08866] hover:text-[#d7c199] transition-colors duration-100 ease-linear"
        >
          ← 다이어리
        </Link>
        <h1 className="text-base text-[#f4e4c1]">새 기록</h1>
      </div>

      <DiaryEntryForm
        draftId="new"
        initialEntryType={initialEntryType}
        initialBookId={bookId}
        isLoggedIn={!!user}
      />
    </main>
  )
}