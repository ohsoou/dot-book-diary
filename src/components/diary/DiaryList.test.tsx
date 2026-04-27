import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DiaryList } from './DiaryList'
import type { Book, DiaryEntry } from '@/types'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/ToggleTabs', () => ({
  ToggleTabs: ({ variants, value, onChange }: { variants: string[]; value: string; onChange: (v: string) => void }) => (
    <div>
      {variants.map((v) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={v === value}>
          {v}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ message }: { message: string }) => <p>{message}</p>,
}))

const makeEntry = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 'entry-1',
  entryType: 'quote',
  body: '테스트 문장',
  createdAt: '2026-04-20T00:00:00Z',
  updatedAt: '2026-04-20T00:00:00Z',
  ...overrides,
})

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'book-1',
  title: '테스트 책',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...overrides,
})

describe('DiaryList', () => {
  describe('books prop 없을 때', () => {
    it('기존과 동일하게 엔트리를 렌더한다', () => {
      const entries = [makeEntry({ body: '테스트 문장 내용' })]

      render(<DiaryList entries={entries} />)

      expect(screen.getByText('테스트 문장 내용')).toBeDefined()
    })

    it('책 제목을 표시하지 않는다', () => {
      const entries = [makeEntry({ bookId: 'book-1' })]

      render(<DiaryList entries={entries} />)

      expect(screen.queryByText(/테스트 책/)).toBeNull()
    })
  })

  describe('books prop 있을 때', () => {
    it('연결된 책의 제목을 표시한다', () => {
      const entries = [makeEntry({ id: 'entry-1', bookId: 'book-1', body: '문장 내용' })]
      const books = [makeBook({ id: 'book-1', title: '연결된 책 제목' })]

      render(<DiaryList entries={entries} books={books} />)

      expect(screen.getByText(/연결된 책 제목/)).toBeDefined()
    })

    it('bookId가 없는 엔트리는 책 제목을 표시하지 않는다', () => {
      const entries = [makeEntry({ id: 'entry-1', bookId: undefined, body: '책 없는 문장' })]
      const books = [makeBook({ id: 'book-1', title: '어떤 책' })]

      render(<DiaryList entries={entries} books={books} />)

      expect(screen.queryByText(/어떤 책/)).toBeNull()
    })

    it('bookId는 있지만 books 목록에 없으면 제목을 표시하지 않는다', () => {
      const entries = [makeEntry({ id: 'entry-1', bookId: 'book-999' })]
      const books = [makeBook({ id: 'book-1', title: '다른 책' })]

      render(<DiaryList entries={entries} books={books} />)

      expect(screen.queryByText(/다른 책/)).toBeNull()
    })
  })

  describe('빈 상태', () => {
    it('엔트리가 없으면 빈 상태 메시지를 표시한다', () => {
      render(<DiaryList entries={[]} />)

      expect(screen.getByText('아직 기록이 없어요')).toBeDefined()
    })
  })
})
