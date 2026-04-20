import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MonthGrid } from './MonthGrid'
import type { Book, ReadingSession } from '@/types'

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

const makeBook = (id: string, coverUrl?: string): Book => ({
  id,
  title: `Book ${id}`,
  coverUrl,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
})

const makeSession = (id: string, bookId: string, readDate: string): ReadingSession => ({
  id,
  bookId,
  readDate,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
})

describe('MonthGrid', () => {
  it('헤더가 일요일부터 토요일 순서로 렌더된다', () => {
    render(
      <MonthGrid year={2024} month={1} sessionsByDate={{}} booksById={{}} />,
    )
    const headers = screen.getAllByText(/^[일월화수목금토]$/)
    expect(headers[0].textContent).toBe('일')
    expect(headers[6].textContent).toBe('토')
  })

  it('6×7 = 42개 날짜 셀이 렌더된다', () => {
    render(
      <MonthGrid year={2024} month={1} sessionsByDate={{}} booksById={{}} />,
    )
    // 날짜 숫자들이 42개 있어야 한다 (1~31 + 인접 월 날짜)
    // data-date 속성으로 확인
    const cells = document.querySelectorAll('[data-date]')
    expect(cells.length).toBe(42)
  })

  it('세션 5개인 날짜에 표지 img 3개와 +2 텍스트가 렌더된다', () => {
    const sessions: ReadingSession[] = Array.from({ length: 5 }, (_, i) =>
      makeSession(`s${i}`, `b${i}`, '2024-01-15'),
    )
    const booksById: Record<string, Book> = {}
    sessions.forEach((s, i) => {
      booksById[s.bookId] = makeBook(s.bookId, `https://example.com/cover${i}.jpg`)
    })
    const sessionsByDate = { '2024-01-15': sessions }

    render(
      <MonthGrid
        year={2024}
        month={1}
        sessionsByDate={sessionsByDate}
        booksById={booksById}
      />,
    )

    const imgs = screen.getAllByRole('img')
    expect(imgs.length).toBe(3)
    expect(screen.getByText('+2')).toBeDefined()
  })

  it('세션 없는 날짜 셀에 링크나 버튼이 없다', () => {
    render(
      <MonthGrid year={2024} month={1} sessionsByDate={{}} booksById={{}} />,
    )
    // 세션 없으면 <a> 링크가 없어야 한다
    const links = screen.queryAllByRole('link')
    expect(links.length).toBe(0)
  })

  it('이전 달 날짜 셀에 비활성 색상 클래스(text-[#6b5540])가 적용된다', () => {
    // 2024-01-01은 월요일이므로 12월 날짜가 그리드 앞에 들어온다
    render(
      <MonthGrid year={2024} month={1} sessionsByDate={{}} booksById={{}} />,
    )
    // 첫 번째 셀(2023-12-31)의 날짜 텍스트에 비활성 색상 클래스가 있어야 한다
    const firstCell = document.querySelector('[data-date="2023-12-31"]')
    expect(firstCell).not.toBeNull()
    const dayNum = firstCell?.querySelector('span')
    expect(dayNum?.className).toContain('text-[#6b5540]')
  })
})
