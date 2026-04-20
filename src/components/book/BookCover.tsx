'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Book } from '@/types'

interface BookCoverProps {
  book: Book
}

export function BookCover({ book }: BookCoverProps) {
  const [imgError, setImgError] = useState(false)

  if (book.coverUrl && !imgError) {
    return (
      <div className="relative w-24 h-36 border border-[#1a100a] overflow-hidden shrink-0">
        <Image
          src={book.coverUrl}
          alt={book.title}
          fill
          style={{ objectFit: 'cover', imageRendering: 'auto' }}
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>
    )
  }

  return (
    <div className="w-24 h-36 shrink-0 border border-[#1a100a] bg-[#3a2a1a] flex items-center justify-center">
      <span className="text-[#a08866] text-xs">{book.title.charAt(0)}</span>
    </div>
  )
}
