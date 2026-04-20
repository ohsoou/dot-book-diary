import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getStore } from '@/lib/storage'
import { getMonthMatrix, formatLocalYmd } from '@/lib/date'
import type { Book, ReadingSession } from '@/types'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { CalendarHydrator } from '@/components/calendar/CalendarHydrator'

export const metadata: Metadata = { title: '책 캘린더' }

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function BookCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`?year=${prev.year}&month=${prev.month}` as never}
          className="px-2 py-1 text-sm text-[#f4e4c1] border border-[#1a100a] hover:bg-[#3a2a1a] transition-colors duration-100 ease-linear focus-visible:outline focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-[#e89b5e] focus-visible:outline-offset-[2px]"
          aria-label="이전 달"
        >
          ←
        </Link>
        <h1 className="text-base text-[#f4e4c1]">
          {year}년 {month}월
        </h1>
        <Link
          href={`?year=${next.year}&month=${next.month}` as never}
          className="px-2 py-1 text-sm text-[#f4e4c1] border border-[#1a100a] hover:bg-[#3a2a1a] transition-colors duration-100 ease-linear focus-visible:outline focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-[#e89b5e] focus-visible:outline-offset-[2px]"
          aria-label="다음 달"
        >
          →
        </Link>
      </div>

      {user ? (
        <ServerCalendar year={year} month={month} />
      ) : (
        <CalendarHydrator year={year} month={month} />
      )}
    </main>
  )
}

async function ServerCalendar({ year, month }: { year: number; month: number }) {
  const store = await getStore()
  const matrix = getMonthMatrix(year, month, 0)
  const firstCell = matrix[0]?.[0]
  const lastCell = matrix[5]?.[6]
  if (!firstCell || !lastCell) return null
  const from = formatLocalYmd(firstCell)
  const to = formatLocalYmd(lastCell)

  const sessions = await store.listReadingSessions({ from, to })

  const sessionsByDate: Record<string, ReadingSession[]> = {}
  for (const session of sessions) {
    const existing = sessionsByDate[session.readDate]
    if (existing) {
      existing.push(session)
    } else {
      sessionsByDate[session.readDate] = [session]
    }
  }

  const uniqueBookIds = [...new Set(sessions.map((s) => s.bookId))]
  const bookResults = await Promise.all(uniqueBookIds.map((id) => store.getBook(id)))
  const booksById: Record<string, Book> = {}
  for (const book of bookResults) {
    if (book) booksById[book.id] = book
  }

  return (
    <MonthGrid
      year={year}
      month={month}
      sessionsByDate={sessionsByDate}
      booksById={booksById}
    />
  )
}

function shiftMonth(year: number, month: number, delta: number) {
  let m = month + delta
  let y = year
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  return { year: y, month: m }
}
