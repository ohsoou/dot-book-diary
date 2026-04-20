import type { Metadata } from 'next'
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
    const books = await store.listBooks()
    return (
      <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
        <h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>
        <BookGrid books={books} />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>
      <BookGridHydrator />
    </main>
  )
}
