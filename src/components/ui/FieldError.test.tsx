import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldError } from './FieldError'

describe('FieldError', () => {
  it('메시지가 있으면 role="alert"로 렌더한다', () => {
    render(<FieldError message="이름을 입력해 주세요" />)
    const el = screen.getByRole('alert')
    expect(el).toBeDefined()
    expect(el.textContent).toBe('이름을 입력해 주세요')
  })

  it('빈 문자열이면 렌더하지 않는다', () => {
    const { container } = render(<FieldError message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('undefined이면 렌더하지 않는다', () => {
    const { container } = render(<FieldError message={undefined} />)
    expect(container.firstChild).toBeNull()
  })
})