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

  const textColor = isCurrentMonth ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-disabled)]'

  const inner = (
    <div className="flex flex-col gap-1 p-1 min-h-[80px]">
      <span className={`text-xs leading-none ${textColor}`}>{dayLabel}</span>
      {hasSessions && (
        <div className="flex flex-wrap gap-0.5">
          {visibleSessions.map((session) => {
            const book = booksById[session.bookId]
            return (
              <div
                key={session.id}
                className="relative w-7 h-11 border border-[var(--color-border)] overflow-hidden shrink-0 bg-[var(--color-bg-card)]"
              >
                {book?.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    sizes="28px"
                    style={{ objectFit: 'cover', imageRendering: 'auto' }}
                  />
                ) : (
                  <span className="text-[var(--color-text-secondary)] text-[6px] flex items-center justify-center h-full">
                    {book?.title.charAt(0) ?? '?'}
                  </span>
                )}
              </div>
            )
          })}
          {overflow > 0 && (
            <span className="text-[var(--color-text-secondary)] text-[10px] self-end leading-none">+{overflow}</span>
          )}
        </div>
      )}
    </div>
  )

  if (!hasSessions) {
    return (
      <div data-date={dateKey} className="border border-[var(--color-border)] bg-[var(--color-bg)]">
        {inner}
      </div>
    )
  }

  const firstBookId = daySessions[0]?.bookId ?? ''

  return (
    <Link
      href={`/reading/${firstBookId}` as never}
      data-date={dateKey}
      className="block border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-card)] transition-colors duration-100 ease-linear focus-visible:outline focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-[2px]"
    >
      {inner}
    </Link>
  )
}
