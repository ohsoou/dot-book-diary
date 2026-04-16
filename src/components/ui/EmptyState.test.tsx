import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('메시지를 렌더한다', () => {
    render(<EmptyState message="아직 읽은 책이 없어요" />)
    expect(screen.getByText('아직 읽은 책이 없어요')).toBeDefined()
  })

  it('CTA가 없으면 버튼을 렌더하지 않는다', () => {
    render(<EmptyState message="아직 읽은 책이 없어요" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('CTA가 있으면 버튼을 렌더하고 클릭 핸들러를 호출한다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<EmptyState message="아직 읽은 책이 없어요" cta={{ label: '책 추가', onClick }} />)
    const btn = screen.getByRole('button', { name: '책 추가' })
    expect(btn).toBeDefined()
    await user.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})