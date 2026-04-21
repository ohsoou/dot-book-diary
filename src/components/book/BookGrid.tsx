import Link from 'next/link'
import type { Book } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookCover } from './BookCover'

interface BookGridProps {
  books: Book[]
}

export function BookGrid({ books }: BookGridProps) {
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
      {books.map((book) => (
        <li key={book.id}>
          <Link href={`/reading/${book.id}` as never} className="flex flex-col gap-1 group">
            <BookCover book={book} />
            <span className="text-xs text-[#d7c199] line-clamp-1 group-hover:text-[#f4e4c1] transition-colors duration-100 ease-linear">
              {book.title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
