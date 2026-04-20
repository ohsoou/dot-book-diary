'use client'

import { useEffect, useState } from 'react'
import type { Book, ReadingSession } from '@/types'
import { LocalStore } from '@/lib/storage/LocalStore'
import { getPreferences } from '@/lib/storage/preferences'
import { getMonthMatrix, formatLocalYmd } from '@/lib/date'
import { Skeleton } from '@/components/ui/Skeleton'
import { MonthGrid } from './MonthGrid'

interface CalendarHydratorProps {
  year: number
  month: number
}

type CalendarData = {
  sessionsByDate: Record<string, ReadingSession[]>
  booksById: Record<string, Book>
}

export function CalendarHydrator({ year, month }: CalendarHydratorProps) {
  const [data, setData] = useState<CalendarData | undefined>(undefined)

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs.localArchived) {
        setData({ sessionsByDate: {}, booksById: {} })
        return
      }

      const store = new LocalStore()
      const matrix = getMonthMatrix(year, month, 0)
      const firstCell = matrix[0]?.[0]
      const lastCell = matrix[5]?.[6]
      if (!firstCell || !lastCell) {
        setData({ sessionsByDate: {}, booksById: {} })
        return
      }
      const from = formatLocalYmd(firstCell)
      const to = formatLocalYmd(lastCell)

      Promise.all([store.listReadingSessions(), store.listBooks()])
      .then(([allSessions, allBooks]) => {
        const filtered = allSessions.filter(
          (s) => s.readDate >= from && s.readDate <= to,
        )

        const sessionsByDate: Record<string, ReadingSession[]> = {}
        for (const session of filtered) {
          const existing = sessionsByDate[session.readDate]
          if (existing) {
            existing.push(session)
          } else {
            sessionsByDate[session.readDate] = [session]
          }
        }

        const bookIdSet = new Set(filtered.map((s) => s.bookId))
        const booksById: Record<string, Book> = {}
        for (const book of allBooks) {
          if (bookIdSet.has(book.id)) booksById[book.id] = book
        }

        setData({ sessionsByDate, booksById })
      })
      .catch(() => setData({ sessionsByDate: {}, booksById: {} }))
    })
  }, [year, month])

  if (data === undefined) {
    return <CalendarSkeleton />
  }

  return <MonthGrid year={year} month={month} sessionsByDate={data.sessionsByDate} booksById={data.booksById} />
}

export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {Array.from({ length: 42 }).map((_, i) => (
        <Skeleton key={i} h="h-14" />
      ))}
    </div>
  )
}
