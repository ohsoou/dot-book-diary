'use client'

import { useEffect, useState } from 'react'
import type { Book, DiaryEntry } from '@/types'
import { getPreferences } from '@/lib/storage/preferences'
import { useDiaryActions } from '@/lib/client-actions/useDiaryActions'
import { useBookActions } from '@/lib/client-actions/useBookActions'
import { Skeleton } from '@/components/ui/Skeleton'
import { DiaryEntryDetail } from './DiaryEntryDetail'

interface DiaryEntryDetailHydratorProps {
  id: string
}

export function DiaryEntryDetailHydrator({ id }: DiaryEntryDetailHydratorProps) {
  const diaryActions = useDiaryActions({ isLoggedIn: false })
  const bookActions = useBookActions({ isLoggedIn: false })
  const [entry, setEntry] = useState<DiaryEntry | null | undefined>(undefined)
  const [book, setBook] = useState<Book | undefined>(undefined)

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setEntry(null)
        return
      }
      diaryActions
        .getEntry(id)
        .then(async (entryResult) => {
          const loaded = entryResult.ok ? entryResult.data : null
          setEntry(loaded)
          if (loaded?.bookId) {
            const bookResult = await bookActions.listBooks().catch(() => null)
            if (bookResult?.ok) {
              const found = bookResult.data.find((b) => b.id === loaded.bookId)
              setBook(found)
            }
          }
        })
        .catch(() => setEntry(null))
    })
  // facades are stable within the component lifecycle; deps are intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (entry === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between">
          <Skeleton w="w-12" h="h-4" />
          <Skeleton w="w-20" h="h-4" />
        </div>
        <Skeleton w="w-full" h="h-32" />
      </div>
    )
  }

  if (entry === null) {
    return <p className="text-sm text-[#a08866]">기록을 찾을 수 없어요.</p>
  }

  return <DiaryEntryDetail entry={entry} isLoggedIn={false} book={book} />
}
