'use client'

import { useEffect, useState } from 'react'
import type { Book, DiaryEntry } from '@/types'
import { getPreferences } from '@/lib/storage/preferences'
import { useDiaryActions } from '@/lib/client-actions/useDiaryActions'
import { useBookActions } from '@/lib/client-actions/useBookActions'
import { Skeleton } from '@/components/ui/Skeleton'
import { DiaryList } from './DiaryList'

export function DiaryListHydrator() {
  const diaryActions = useDiaryActions({ isLoggedIn: false })
  const bookActions = useBookActions({ isLoggedIn: false })
  const [entries, setEntries] = useState<DiaryEntry[] | undefined>(undefined)
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setEntries([])
        return
      }
      Promise.all([diaryActions.listEntries(), bookActions.listBooks()])
        .then(([entryResult, bookResult]) => {
          const entryList = entryResult.ok ? entryResult.data : []
          const bookList = bookResult.ok ? bookResult.data : []
          setEntries(entryList.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
          setBooks(bookList)
        })
        .catch(() => setEntries([]))
    })
  // facades are stable within the component lifecycle; deps are intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
