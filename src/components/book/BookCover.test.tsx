import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookCover } from './BookCover'
import type { Book } from '@/types'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onError,
    ...rest
  }: {
    src: string
    alt: string
    onError?: () => void
    [key: string]: unknown
  }) => <img src={src} alt={alt} onError={onError} data-testid="book-image" {...rest} />,
}))

const baseBook: Book = {
  id: '1',
  title: '테스트 책',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('BookCover', () => {
  it('coverUrl이 있으면 이미지를 렌더한다', () => {
    render(<BookCover book={{ ...baseBook, coverUrl: 'https://example.com/cover.jpg' }} />)
    const img = screen.getByTestId('book-image')
    expect(img).toBeDefined()
    expect(img.getAttribute('alt')).toBe('테스트 책')
  })

  it('coverUrl이 없으면 이니셜 플레이스홀더를 렌더한다', () => {
    render(<BookCover book={baseBook} />)
    expect(screen.queryByTestId('book-image')).toBeNull()
    expect(screen.getByText('테')).toBeDefined()
  })

  it('이미지 로드 실패(onError) 시 이니셜 플레이스홀더로 전환한다', () => {
    render(<BookCover book={{ ...baseBook, coverUrl: 'https://example.com/cover.jpg' }} />)
    const img = screen.getByTestId('book-image')
    fireEvent.error(img)
    expect(screen.queryByTestId('book-image')).toBeNull()
    expect(screen.getByText('테')).toBeDefined()
  })
})
