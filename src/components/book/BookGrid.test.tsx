import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookGrid } from './BookGrid'
import type { Book } from '@/types'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const makeBook = (id: string, title: string): Book => ({
  id,
  title,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
})

describe('BookGrid', () => {
  it('책 목록을 렌더한다', () => {
    const books = [makeBook('1', '책 A'), makeBook('2', '책 B')]
    render(<BookGrid books={books} />)
    expect(screen.getByText('책 A')).toBeDefined()
    expect(screen.getByText('책 B')).toBeDefined()
  })

  it('각 책 링크가 /reading/{id}를 가리킨다', () => {
    const books = [makeBook('abc123', '책 A')]
    render(<BookGrid books={books} />)
    const link = screen.getByRole('link', { name: /책 A/i })
    expect(link.getAttribute('href')).toBe('/reading/abc123')
  })

  it('빈 배열이면 EmptyState를 렌더한다', () => {
    render(<BookGrid books={[]} />)
    expect(screen.getByText('아직 책장이 비어 있어요')).toBeDefined()
    expect(screen.getByText('첫 책 등록하기')).toBeDefined()
  })

  it('EmptyState CTA 링크가 /add-book을 가리킨다', () => {
    render(<BookGrid books={[]} />)
    const link = screen.getByRole('link', { name: '첫 책 등록하기' })
    expect(link.getAttribute('href')).toBe('/add-book')
  })
})
