import type { Metadata } from 'next'
import type { ReadingSession } from '@/types'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStore } from '@/lib/storage'
import { BookGrid } from '@/components/book/BookGrid'
import { BookGridHydrator } from '@/components/book/BookGridHydrator'

export const metadata: Metadata = {
  title: '책장',
}

export default async function BookshelfPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const store = await getStore()
    const [books, allSessions] = await Promise.all([
      store.listBooks(),
      store.listReadingSessions(),
    ])
    const sessionsByBookId = allSessions.reduce<Record<string, ReadingSession[]>>((acc, s) => {
      acc[s.bookId] = [...(acc[s.bookId] ?? []), s]
      return acc
    }, {})
    return (
      <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-base text-[#f4e4c1]">책장</h1>
          <Link
            href={'/add-book' as never}
            className="text-sm px-3 py-2 bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] active:translate-y-px transition-colors duration-100 ease-linear"
          >
            책 등록
          </Link>
        </header>
        <BookGrid books={books} sessionsByBookId={sessionsByBookId} />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-base text-[#f4e4c1]">책장</h1>
        <Link
          href={'/add-book' as never}
          className="text-sm px-3 py-2 bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] active:translate-y-px transition-colors duration-100 ease-linear"
        >
          책 등록
        </Link>
      </header>
      <BookGridHydrator />
    </main>
  )
}
