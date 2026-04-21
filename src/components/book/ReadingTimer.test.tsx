import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ReadingTimer } from './ReadingTimer'
import * as timerLib from '@/lib/reading-timer'

vi.mock('@/lib/reading-timer')

const makeRunning = (bookId = 'book1'): timerLib.TimerState => ({
  bookId,
  startedAt: 1000,
  pausedAt: null,
  accumulatedMs: 0,
  status: 'running',
  lastRunMs: 1000,
})

const makePaused = (bookId = 'book1'): timerLib.TimerState => ({
  bookId,
  startedAt: 1000,
  pausedAt: 4000,
  accumulatedMs: 3000,
  status: 'paused',
  lastRunMs: 1000,
})

describe('ReadingTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(timerLib.read).mockReturnValue(null)
    vi.mocked(timerLib.elapsedMs).mockReturnValue(0)
    vi.mocked(timerLib.start).mockImplementation((id) => makeRunning(id))
    vi.mocked(timerLib.pause).mockImplementation(() => makePaused())
    vi.mocked(timerLib.resume).mockImplementation(() => makeRunning())
    vi.mocked(timerLib.stop).mockReturnValue(null)
    vi.mocked(timerLib.clear).mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 stopped 상태에서 [시작] 버튼을 표시한다', () => {
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument()
  })

  it('[시작] 클릭 후 running 상태로 전환되어 [일시정지] [정지] 버튼이 표시된다', async () => {
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시작' }))
    })
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '정지' })).toBeInTheDocument()
  })

  it('running 초기 상태에서 [일시정지] 클릭 후 paused 상태로 전환된다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning())
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    })
    expect(screen.getByRole('button', { name: '재개' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '정지' })).toBeInTheDocument()
  })

  it('[정지] 클릭 시 onStop이 초(seconds)를 인자로 호출된다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning())
    vi.mocked(timerLib.stop).mockReturnValue({ bookId: 'book1', seconds: 180 })
    const onStop = vi.fn()
    render(<ReadingTimer bookId="book1" onStop={onStop} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '정지' }))
    })
    expect(timerLib.stop).toHaveBeenCalled()
    expect(onStop).toHaveBeenCalledWith(180)
  })

  it('다른 책의 활성 타이머가 있을 때 [시작] 클릭 시 ConfirmDialog가 표시된다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning('other-book'))
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시작' }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('다른 책의 타이머가 실행 중이에요')).toBeInTheDocument()
  })

  it('ConfirmDialog 확인 시 기존 타이머를 clear하고 새 타이머를 시작한다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning('other-book'))
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시작' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '정지하고 시작' }))
    })
    expect(timerLib.clear).toHaveBeenCalled()
    expect(timerLib.start).toHaveBeenCalledWith('book1')
  })

  it('다른 책 타이머가 있을 때 ConfirmDialog 취소 시 다이얼로그가 닫힌다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning('other-book'))
    render(<ReadingTimer bookId="book1" onStop={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시작' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '취소' }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument()
  })

  it('stop 결과가 null이면 onStop이 호출되지 않는다', async () => {
    vi.mocked(timerLib.read).mockReturnValue(makeRunning())
    vi.mocked(timerLib.stop).mockReturnValue(null)
    const onStop = vi.fn()
    render(<ReadingTimer bookId="book1" onStop={onStop} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '정지' }))
    })
    expect(onStop).not.toHaveBeenCalled()
  })
})
