'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Book, ReadingSession } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToggleTabs } from '@/components/ui/ToggleTabs'
import { BookCover } from './BookCover'
import { GoalProgress } from './GoalProgress'

const STATUS_FILTERS = [
  { value: 'all' as const, label: '전체' },
  { value: 'want' as const, label: '읽고 싶은' },
  { value: 'reading' as const, label: '읽는 중' },
  { value: 'finished' as const, label: '완독' },
]

type StatusFilter = 'all' | 'want' | 'reading' | 'finished'

const FILTER_LABELS = STATUS_FILTERS.map((f) => f.label)
const LABEL_TO_STATUS: Record<string, StatusFilter> = Object.fromEntries(
  STATUS_FILTERS.map((f) => [f.label, f.value]),
)

interface BookGridProps {
  books: Book[]
  sessionsByBookId?: Record<string, ReadingSession[]>
}

export function BookGrid({ books, sessionsByBookId }: BookGridProps) {
  const [filterLabel, setFilterLabel] = useState('전체')
  const filter = LABEL_TO_STATUS[filterLabel] ?? 'all'

  const filteredBooks = filter === 'all' ? books : books.filter((b) => b.status === filter)

  if (books.length === 0) {
    return (
      <EmptyState
        message="아직 책장이 비어 있어요"
        cta={{ label: '첫 책 등록하기', href: '/add-book' }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleTabs variants={FILTER_LABELS} value={filterLabel} onChange={setFilterLabel} />
      {filteredBooks.length === 0 ? (
        <EmptyState message="이 분류에 책이 없어요" />
      ) : (
        <ul className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {filteredBooks.map((book) => {
            const sessions = sessionsByBookId?.[book.id] ?? []
            return (
              <li key={book.id} className="flex flex-col gap-1">
                <Link href={`/reading/${book.id}` as never} className="flex flex-col gap-1 group">
                  <BookCover book={book} />
                  <span className="text-xs text-[#d7c199] line-clamp-1 group-hover:text-[#f4e4c1] transition-colors duration-100 ease-linear">
                    {book.title}
                  </span>
                  {book.targetDate && (
                    <GoalProgress book={book} sessions={sessions} variant="compact" />
                  )}
                </Link>
                <Link
                  href={`/diary/new?bookId=${book.id}` as never}
                  className="text-xs text-[#a08866] hover:text-[#d7c199] transition-colors duration-100 ease-linear"
                >
                  일기 쓰기
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
