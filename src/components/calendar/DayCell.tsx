import Image from 'next/image'
import Link from 'next/link'
import type { Book, ReadingSession } from '@/types'
import { formatLocalYmd } from '@/lib/date'

interface DayCellProps {
  date: Date
  currentMonth: number // 1-indexed
  sessions: ReadingSession[]
  booksById: Record<string, Book>
}

export function DayCell({ date, currentMonth, sessions, booksById }: DayCellProps) {
  const isCurrentMonth = date.getMonth() + 1 === currentMonth
  const dayLabel = date.getDate()
  const dateKey = formatLocalYmd(date)
  const daySessions = sessions

  const hasSessions = daySessions.length > 0
  const visibleSessions = daySessions.slice(0, 3)
  const overflow = daySessions.length - 3

  const textColor = isCurrentMonth ? 'text-[#f4e4c1]' : 'text-[#6b5540]'

  const inner = (
    <div className="flex flex-col gap-1 p-1 min-h-[56px]">
      <span className={`text-xs leading-none ${textColor}`}>{dayLabel}</span>
      {hasSessions && (
        <div className="flex flex-wrap gap-0.5">
          {visibleSessions.map((session) => {
            const book = booksById[session.bookId]
            return (
              <div
                key={session.id}
                className="relative w-5 h-8 border border-[#1a100a] overflow-hidden shrink-0 bg-[#3a2a1a]"
              >
                {book?.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    style={{ objectFit: 'cover', imageRendering: 'auto' }}
                    unoptimized
                  />
                ) : (
                  <span className="text-[#a08866] text-[6px] flex items-center justify-center h-full">
                    {book?.title.charAt(0) ?? '?'}
                  </span>
                )}
              </div>
            )
          })}
          {overflow > 0 && (
            <span className="text-[#a08866] text-[10px] self-end leading-none">+{overflow}</span>
          )}
        </div>
      )}
    </div>
  )

  if (!hasSessions) {
    return (
      <div data-date={dateKey} className="border border-[#1a100a] bg-[#2a1f17]">
        {inner}
      </div>
    )
  }

  const firstBookId = daySessions[0]?.bookId ?? ''

  return (
    <Link
      href={`/reading/${firstBookId}` as never}
      data-date={dateKey}
      className="block border border-[#1a100a] bg-[#2a1f17] hover:bg-[#3a2a1a] transition-colors duration-100 ease-linear focus-visible:outline focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-[#e89b5e] focus-visible:outline-offset-[2px]"
    >
      {inner}
    </Link>
  )
}
