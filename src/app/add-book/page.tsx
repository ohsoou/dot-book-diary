import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AddBookTabs } from '@/components/book/AddBookTabs'

export const metadata: Metadata = {
  title: '책 추가',
}

export default async function AddBookPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-base text-[#f4e4c1] mb-6">책 추가</h1>
      <AddBookTabs isLoggedIn={!!user} />
    </main>
  )
}