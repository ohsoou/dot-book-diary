'use client'

import { useEffect, useState } from 'react'
import type { Book } from '@/types'
import { LocalStore } from '@/lib/storage/LocalStore'
import { getPreferences } from '@/lib/storage/preferences'
import { Skeleton } from '@/components/ui/Skeleton'
import { BookGrid } from './BookGrid'

export function BookGridHydrator() {
  const [books, setBooks] = useState<Book[] | null>(null)

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setBooks([])
        return
      }
      const store = new LocalStore()
      store.listBooks().then(setBooks).catch(() => setBooks([]))
    })
  }, [])

  if (books === null) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} w="w-24" h="h-36" />
        ))}
      </div>
    )
  }

  return <BookGrid books={books} />
}
