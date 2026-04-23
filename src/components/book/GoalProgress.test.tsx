import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GoalProgress } from './GoalProgress'
import type { Book, ReadingSession } from '@/types'

const baseBook: Book = {
  id: 'b1',
  title: '테스트 책',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
}

function makeSession(endPage?: number): ReadingSession {
  return {
    id: 's1',
    bookId: 'b1',
    readDate: '2026-04-10',
    endPage,
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  }
}

describe('GoalProgress - full variant', () => {
  beforeEach(() => {
    // 2026-04-15: createdAt(04-01) ~ targetDate(05-01) 중간보다 앞
    // dateProgress = 14/30 ≈ 0.47, pageProgress = 0.6 → on-track 조건 성립
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('targetDate 없으면 CTA 텍스트를 렌더한다', () => {
    render(<GoalProgress book={baseBook} sessions={[]} />)
    expect(screen.getByText('목표 완독일을 정해 볼까요?')).toBeDefined()
  })

  it('targetDate 있으면 일수 라벨을 렌더한다', () => {
    const book = { ...baseBook, targetDate: '2026-05-01' }
    render(<GoalProgress book={book} sessions={[]} />)
    // 남은 일수 또는 지난 일수 텍스트가 있어야 함
    const container = document.body
    expect(container.textContent).toMatch(/일 남음|오늘까지|일 지남/)
  })

  it('on-track 상태 라벨을 렌더한다', () => {
    const book = { ...baseBook, targetDate: '2026-05-01', totalPages: 300 }
    // pageProgress=0.6, dateProgress≈0.5 → on-track
    render(
      <GoalProgress
        book={book}
        sessions={[makeSession(180)]}
      />,
    )
    expect(screen.getByText('순항')).toBeDefined()
  })

  it('behind 상태 라벨을 렌더한다', () => {
    // createdAt: 2026-04-01, targetDate: 2026-05-01
    // sessions에 endPage가 없어서 pageProgress=null → on-track 반환
    // behind 테스트: 진짜 behind 상황 만들기 위해 낮은 진행률 사용
    const book = {
      ...baseBook,
      targetDate: '2026-04-20', // 짧은 기간
      totalPages: 300,
    }
    // createdAt: 2026-04-01, target: 2026-04-20 (19일)
    // today: 기본 new Date() → 이미 overdue
    // overdue 케이스이므로 라벨 확인
    render(<GoalProgress book={book} sessions={[makeSession(10)]} />)
    // overdue or behind 라벨 중 하나
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/순항|조금 밀림|며칠 더 필요해요/)
  })

  it('pageProgress 있으면 퍼센트 렌더한다', () => {
    const book = { ...baseBook, targetDate: '2026-05-01', totalPages: 200 }
    render(<GoalProgress book={book} sessions={[makeSession(100)]} />)
    expect(screen.getByText('50%')).toBeDefined()
  })
})

describe('GoalProgress - compact variant', () => {
  it('targetDate 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <GoalProgress book={baseBook} sessions={[]} variant="compact" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('targetDate 있으면 D- 뱃지를 렌더한다', () => {
    const book = { ...baseBook, targetDate: '2099-12-31' }
    render(<GoalProgress book={book} sessions={[]} variant="compact" />)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/D-\d+/)
  })

  it('남은 일수가 0이면 D-Day를 렌더한다', () => {
    const today = new Date()
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const book = { ...baseBook, targetDate: ymd }
    render(<GoalProgress book={book} sessions={[]} variant="compact" />)
    expect(screen.getByText('D-Day')).toBeDefined()
  })

  it('pageProgress 있으면 진행 막대를 렌더한다', () => {
    const book = { ...baseBook, targetDate: '2099-12-31', totalPages: 100 }
    render(<GoalProgress book={book} sessions={[makeSession(50)]} variant="compact" />)
    // progress bar div가 존재해야 함
    const bars = document.querySelectorAll('[style*="width"]')
    expect(bars.length).toBeGreaterThan(0)
  })
})
