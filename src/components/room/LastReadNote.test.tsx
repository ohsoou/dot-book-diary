import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LastReadNote } from './LastReadNote'

describe('LastReadNote', () => {
  it('renders fallback when lastReadAt is null', () => {
    render(<LastReadNote lastReadAt={null} />)
    expect(screen.getByText('아직 독서 기록이 없어요')).toBeInTheDocument()
  })

  it('renders elapsed time using formatElapsed with injected now', () => {
    const lastReadAt = '2026-04-20T10:00:00.000Z'
    const now = new Date('2026-04-22T10:00:00.000Z') // 2일 후
    render(<LastReadNote lastReadAt={lastReadAt} now={now} />)
    expect(screen.getByText('2일 전')).toBeInTheDocument()
  })

  it('wraps time display in <time> with dateTime attribute', () => {
    const lastReadAt = '2026-04-21T08:00:00.000Z'
    const now = new Date('2026-04-22T09:00:00.000Z') // 1시간 후
    const { container } = render(<LastReadNote lastReadAt={lastReadAt} now={now} />)
    const timeEl = container.querySelector('time')
    expect(timeEl).not.toBeNull()
    expect(timeEl?.getAttribute('dateTime')).toBe(lastReadAt)
  })

  it('renders fallback when lastReadAt is an invalid ISO string', () => {
    render(<LastReadNote lastReadAt="not-a-date" />)
    expect(screen.getByText('아직 독서 기록이 없어요')).toBeInTheDocument()
  })
})
