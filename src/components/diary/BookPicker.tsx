'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Book } from '@/types'
import { useStore } from '@/lib/storage/use-store'

interface BookPickerProps {
  value: string | undefined
  onChange: (bookId: string | undefined) => void
}

export function BookPicker({ value, onChange }: BookPickerProps) {
  const store = useStore()
  const [books, setBooks] = useState<Book[] | null>(null)

  useEffect(() => {
    store.listBooks().then(setBooks).catch(() => setBooks([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (books === null) {
    return <p className="text-xs text-[#a08866]">불러오는 중...</p>
  }

  if (books.length === 0) {
    return (
      <p className="text-xs text-[#a08866]">
        책장에 책이 없어요.{' '}
        <Link
          href={'/add-book' as never}
          className="underline hover:text-[#d7c199] transition-colors duration-100 ease-linear"
        >
          책 등록하기
        </Link>
      </p>
    )
  }

  return (
    <select
      aria-label="연결할 책"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="bg-[#2a1f17] border border-[#1a100a] text-[#f4e4c1] px-3 py-2 w-full appearance-none focus:outline-none focus:border-[#e89b5e]"
    >
      <option value="">책 선택 (선택)</option>
      {books.map((book) => (
        <option key={book.id} value={book.id}>
          {book.title}
        </option>
      ))}
    </select>
  )
}
