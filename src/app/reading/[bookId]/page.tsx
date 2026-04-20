import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getStore } from '@/lib/storage'
import { ReadingPageContent } from '@/components/book/ReadingPageContent'
import { ReadingPageHydrator } from '@/components/book/ReadingPageHydrator'

export const metadata: Metadata = { title: '독서 기록' }

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function ReadingPage({ params }: Props) {
  const { bookId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const store = await getStore()
    const book = await store.getBook(bookId)
    if (!book) notFound()
    const sessions = await store.listReadingSessions({ bookId })
    return (
      <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
        <ReadingPageContent book={book} sessions={sessions} isLoggedIn={true} />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <ReadingPageHydrator bookId={bookId} />
    </main>
  )
}
