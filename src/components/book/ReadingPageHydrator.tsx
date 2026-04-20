'use client'

import { useEffect, useState } from 'react'
import type { Book, ReadingSession } from '@/types'
import { LocalStore } from '@/lib/storage/LocalStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { ReadingPageContent } from './ReadingPageContent'

interface ReadingPageHydratorProps {
  bookId: string
}

export function ReadingPageHydrator({ bookId }: ReadingPageHydratorProps) {
  const [book, setBook] = useState<Book | null | undefined>(undefined)
  const [sessions, setSessions] = useState<ReadingSession[]>([])

  useEffect(() => {
    const store = new LocalStore()
    Promise.all([store.getBook(bookId), store.listReadingSessions({ bookId })])
      .then(([b, s]) => {
        setBook(b)
        setSessions(s)
      })
      .catch(() => {
        setBook(null)
        setSessions([])
      })
  }, [bookId])

  if (book === undefined) {
    return (
      <div className="flex gap-4 mb-6">
        <Skeleton w="w-24" h="h-36" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton w="w-48" h="h-4" />
          <Skeleton w="w-32" h="h-3" />
        </div>
      </div>
    )
  }

  if (book === null) {
    return <p className="text-sm text-[#a08866]">책을 찾을 수 없어요.</p>
  }

  return <ReadingPageContent book={book} sessions={sessions} isLoggedIn={false} />
}
