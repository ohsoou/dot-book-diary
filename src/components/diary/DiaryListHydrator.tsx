'use client'

import { useEffect, useState } from 'react'
import type { Book, DiaryEntry } from '@/types'
import { LocalStore } from '@/lib/storage/LocalStore'
import { getPreferences } from '@/lib/storage/preferences'
import { Skeleton } from '@/components/ui/Skeleton'
import { DiaryList } from './DiaryList'

export function DiaryListHydrator() {
  const [entries, setEntries] = useState<DiaryEntry[] | undefined>(undefined)
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setEntries([])
        return
      }
      const store = new LocalStore()
      Promise.all([store.listDiaryEntries(), store.listBooks()])
        .then(([entryList, bookList]) => {
          setEntries(entryList.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
          setBooks(bookList)
        })
        .catch(() => setEntries([]))
    })
  }, [])

  if (entries === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#3a2a1a] border border-[#1a100a] p-4 flex flex-col gap-2">
            <Skeleton w="w-full" h="h-4" />
            <Skeleton w="w-2/3" h="h-4" />
          </div>
        ))}
      </div>
    )
  }

  return <DiaryList entries={entries} books={books} />
}