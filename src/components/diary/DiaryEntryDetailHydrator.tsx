'use client'

import { useEffect, useState } from 'react'
import type { DiaryEntry } from '@/types'
import { LocalStore } from '@/lib/storage/LocalStore'
import { getPreferences } from '@/lib/storage/preferences'
import { Skeleton } from '@/components/ui/Skeleton'
import { DiaryEntryDetail } from './DiaryEntryDetail'

interface DiaryEntryDetailHydratorProps {
  id: string
}

export function DiaryEntryDetailHydrator({ id }: DiaryEntryDetailHydratorProps) {
  const [entry, setEntry] = useState<DiaryEntry | null | undefined>(undefined)

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setEntry(null)
        return
      }
      const store = new LocalStore()
      store.getDiaryEntry(id).then(setEntry).catch(() => setEntry(null))
    })
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

  return <DiaryEntryDetail entry={entry} isLoggedIn={false} />
}