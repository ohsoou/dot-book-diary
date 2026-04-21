import type { Book, ReadingSession } from '@/types'
import { getMonthMatrix, formatLocalYmd } from '@/lib/date'
import { DayCell } from './DayCell'

const WEEK_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

interface MonthGridProps {
  year: number
  month: number // 1-indexed
  sessionsByDate: Record<string, ReadingSession[]>
  booksById: Record<string, Book>
}

export function MonthGrid({ year, month, sessionsByDate, booksById }: MonthGridProps) {
  const matrix = getMonthMatrix(year, month, 0)

  return (
    <div>
      <div className="grid grid-cols-7 border-l border-t border-[var(--color-border)]">
        {WEEK_HEADERS.map((label) => (
          <div
            key={label}
            className="border-r border-b border-[var(--color-border)] py-1 text-center text-xs text-[var(--color-text-secondary)]"
          >
            {label}
          </div>
        ))}
        {matrix.flat().map((date) => {
          const key = formatLocalYmd(date)
          return (
            <DayCell
              key={key}
              date={date}
              currentMonth={month}
              sessions={sessionsByDate[key] ?? []}
              booksById={booksById}
            />
          )
        })}
      </div>
    </div>
  )
}
