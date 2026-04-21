import type { Metadata } from 'next'
import type { ReadingSession } from '@/types'
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
        <h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>
        <BookGrid books={books} sessionsByBookId={sessionsByBookId} />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>
      <BookGridHydrator />
    </main>
  )
}
