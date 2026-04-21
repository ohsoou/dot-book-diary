import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingSessionForm } from './ReadingSessionForm'
import type { Book, ReadingSession } from '@/types'
import type { ActionResult } from '@/lib/errors'

// next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

// next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// Server Actions
const mockAddSession = vi.fn()
const mockUpdateSession = vi.fn()
const mockDeleteSession = vi.fn()
const mockDeleteBook = vi.fn()
const mockUpdateBook = vi.fn()

vi.mock('@/lib/actions/reading-sessions', () => ({
  addReadingSessionAction: (...args: unknown[]) => mockAddSession(...args),
  updateReadingSessionAction: (...args: unknown[]) => mockUpdateSession(...args),
  deleteReadingSessionAction: (...args: unknown[]) => mockDeleteSession(...args),
}))

vi.mock('@/lib/actions/books', () => ({
  deleteBookAction: (...args: unknown[]) => mockDeleteBook(...args),
  updateBookAction: (...args: unknown[]) => mockUpdateBook(...args),
}))

// date mock: 고정된 날짜 반환
vi.mock('@/lib/date', () => ({
  formatLocalYmd: () => '2026-04-20',
}))

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'book-1',
  title: '테스트 책',
  author: '저자',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeSession = (overrides: Partial<ReadingSession> = {}): ReadingSession => ({
  id: 'session-1',
  bookId: 'book-1',
  readDate: '2026-04-19',
  startPage: 1,
  endPage: 50,
  durationMinutes: 60,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const successSession: ReadingSession = makeSession({ id: 'session-new' })

beforeEach(() => {
  vi.clearAllMocks()
  mockAddSession.mockResolvedValue({ ok: true, data: successSession } satisfies ActionResult<ReadingSession>)
  mockUpdateSession.mockResolvedValue({ ok: true, data: successSession } satisfies ActionResult<ReadingSession>)
  mockDeleteSession.mockResolvedValue({ ok: true, data: undefined } satisfies ActionResult<void>)
  mockDeleteBook.mockResolvedValue({ ok: true, data: undefined } satisfies ActionResult<void>)
  mockUpdateBook.mockResolvedValue({ ok: true, data: makeBook({ targetDate: '2026-05-01' }) } satisfies ActionResult<Book>)
})

describe('ReadingSessionForm', () => {
  it('추가 폼 제출 시 addReadingSessionAction을 호출한다', async () => {
    const user = userEvent.setup()
    render(<ReadingSessionForm book={makeBook()} sessions={[]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    await waitFor(() => {
      expect(mockAddSession).toHaveBeenCalledOnce()
    })
  })

  it('수정 모드: 세션 수정 버튼 클릭 시 폼에 값이 프리필된다', async () => {
    const user = userEvent.setup()
    const session = makeSession({ readDate: '2026-04-15', startPage: 10, endPage: 100, durationMinutes: 90 })
    render(<ReadingSessionForm book={makeBook()} sessions={[session]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '수정' }))

    expect((screen.getByLabelText('날짜') as HTMLInputElement).value).toBe('2026-04-15')
    expect((screen.getByLabelText('시작 페이지') as HTMLInputElement).value).toBe('10')
    expect((screen.getByLabelText('끝 페이지') as HTMLInputElement).value).toBe('100')
    expect((screen.getByLabelText('독서 시간(분)') as HTMLInputElement).value).toBe('90')
  })

  it('수정 모드에서 저장 시 updateReadingSessionAction을 호출한다', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    render(<ReadingSessionForm book={makeBook()} sessions={[session]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', null, expect.any(FormData))
    })
  })

  it('세션 삭제 confirm 후 확인 시 deleteReadingSessionAction을 호출한다', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    render(<ReadingSessionForm book={makeBook()} sessions={[session]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await waitFor(() => screen.getByRole('dialog'))
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mockDeleteSession).toHaveBeenCalledWith('session-1')
    })
  })

  it('세션 삭제 confirm 후 취소 시 deleteReadingSessionAction을 호출하지 않는다', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    render(<ReadingSessionForm book={makeBook()} sessions={[session]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => screen.getByRole('dialog'))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(mockDeleteSession).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('endPage < startPage 시 검증 에러를 표시한다', async () => {
    const user = userEvent.setup()
    render(<ReadingSessionForm book={makeBook()} sessions={[]} isLoggedIn={true} />)

    await user.clear(screen.getByLabelText('시작 페이지'))
    await user.type(screen.getByLabelText('시작 페이지'), '100')
    await user.clear(screen.getByLabelText('끝 페이지'))
    await user.type(screen.getByLabelText('끝 페이지'), '50')

    await user.click(screen.getByRole('button', { name: '기록 추가' }))

    await waitFor(() => {
      expect(screen.getByText('끝 페이지는 시작 페이지 이상이어야 합니다')).toBeDefined()
    })
    expect(mockAddSession).not.toHaveBeenCalled()
  })

  it('책 삭제 버튼 → confirm → deleteBookAction 호출 후 /bookshelf로 이동한다', async () => {
    const user = userEvent.setup()
    render(<ReadingSessionForm book={makeBook()} sessions={[]} isLoggedIn={true} />)

    await user.click(screen.getByRole('button', { name: '책 삭제' }))
    const dialog = await waitFor(() => screen.getByRole('dialog'))
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mockDeleteBook).toHaveBeenCalledWith('book-1')
      expect(mockPush).toHaveBeenCalledWith('/bookshelf')
    })
  })

  it('목표 완독일 입력 필드가 렌더된다', () => {
    render(<ReadingSessionForm book={makeBook()} sessions={[]} isLoggedIn={true} />)
    expect(screen.getByLabelText('목표 완독일')).toBeDefined()
  })

  it('회원: 목표 완독일 저장 시 updateBookAction을 호출한다', async () => {
    const user = userEvent.setup()
    render(<ReadingSessionForm book={makeBook()} sessions={[]} isLoggedIn={true} />)

    const input = screen.getByLabelText('목표 완독일')
    await user.clear(input)
    await user.type(input, '2026-05-01')

    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(mockUpdateBook).toHaveBeenCalledWith('book-1', { targetDate: '2026-05-01' })
    })
  })

  it('GoalProgress가 렌더된다', () => {
    const book = makeBook({ targetDate: '2026-05-01', totalPages: 300 })
    render(<ReadingSessionForm book={book} sessions={[makeSession({ endPage: 150 })]} isLoggedIn={true} />)
    // 일수 라벨 또는 상태 라벨이 있어야 함
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/일 남음|오늘까지|일 지남|순항|조금 밀림|며칠 더 필요해요/)
  })
})
