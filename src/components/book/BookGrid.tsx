import Link from 'next/link'
import type { Book, ReadingSession } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookCover } from './BookCover'
import { GoalProgress } from './GoalProgress'

interface BookGridProps {
  books: Book[]
  sessionsByBookId?: Record<string, ReadingSession[]>
}

export function BookGrid({ books, sessionsByBookId }: BookGridProps) {
  if (books.length === 0) {
    return (
      <EmptyState
        message="아직 책장이 비어 있어요"
        cta={{ label: '첫 책 등록하기', href: '/add-book' }}
      />
    )
  }

  return (
    <ul className="grid grid-cols-3 md:grid-cols-4 gap-4">
      {books.map((book) => {
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
  )
}
