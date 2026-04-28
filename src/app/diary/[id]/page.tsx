import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getStore } from '@/lib/storage'
import { DiaryEntryDetail } from '@/components/diary/DiaryEntryDetail'
import { DiaryEntryDetailHydrator } from '@/components/diary/DiaryEntryDetailHydrator'

export const metadata: Metadata = { title: '다이어리 기록' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiaryEntryPage({ params }: Props) {
  const { id } = await params
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
      </div>

      {user ? (
        <ServerDiaryEntry id={id} />
      ) : (
        <DiaryEntryDetailHydrator id={id} />
      )}
    </main>
  )
}

async function ServerDiaryEntry({ id }: { id: string }) {
  const store = await getStore()
  const entry = await store.getDiaryEntry(id)
  if (!entry) notFound()
  const book = entry.bookId ? await store.getBook(entry.bookId) : null
  return <DiaryEntryDetail entry={entry} isLoggedIn={true} book={book ?? undefined} />
}