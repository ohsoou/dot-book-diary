import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('기본 variant(primary)로 렌더된다', () => {
    render(<Button>저장</Button>)
    const btn = screen.getByRole('button', { name: '저장' })
    expect(btn).toBeDefined()
  })

  it('pending 상태에서 pendingLabel을 표시하고 disabled된다', () => {
    render(<Button pending pendingLabel="저장 중...">저장</Button>)
    const btn = screen.getByRole('button')
    expect(btn.textContent).toBe('저장 중...')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('pending 상태에서 기본 pendingLabel("처리 중...")을 사용한다', () => {
    render(<Button pending>저장</Button>)
    expect(screen.getByRole('button').textContent).toBe('처리 중...')
  })

  it('disabled 상태에서 클릭이 무시된다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>저장</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('secondary variant를 렌더한다', () => {
    render(<Button variant="secondary">취소</Button>)
    const btn = screen.getByRole('button', { name: '취소' })
    expect(btn.className).toContain('border-[#8b6f4a]')
  })

  it('danger variant를 렌더한다', () => {
    render(<Button variant="danger">삭제</Button>)
    const btn = screen.getByRole('button', { name: '삭제' })
    expect(btn.className).toContain('border-[#c85a54]')
  })

  it('text variant를 렌더한다', () => {
    render(<Button variant="text">더보기</Button>)
    const btn = screen.getByRole('button', { name: '더보기' })
    expect(btn.className).toContain('text-[#d7c199]')
  })

  it('클릭 시 onClick 핸들러를 호출한다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})