import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BearSpeechBubble } from './BearSpeechBubble'
import { BearStateProvider } from './BearStateContext'

function renderWithState(bearLabel: string | null, nickname = '책곰이') {
  return render(
    <BearStateProvider initial={{ bearAsset: undefined, bearLabel, lastReadAt: null, nickname }}>
      <BearSpeechBubble />
    </BearStateProvider>,
  )
}

describe('BearSpeechBubble', () => {
  it('label이 null이면 아무것도 렌더하지 않는다', () => {
    const { container } = renderWithState(null)
    expect(container.firstChild).toBeNull()
  })

  it('label이 있으면 role="status" 컨테이너를 렌더한다', () => {
    renderWithState('곰이 자고 있어요')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('헤더에 nickname 텍스트가 렌더된다', () => {
    renderWithState('곰이 자고 있어요', '독서왕')
    expect(screen.getByText('독서왕')).toBeInTheDocument()
  })

  it('본문에 label 텍스트가 렌더된다', () => {
    renderWithState('곰이 자고 있어요')
    expect(screen.getByText('곰이 자고 있어요')).toBeInTheDocument()
  })

  it('nickname이 책곰이인 경우 헤더에 표시된다', () => {
    renderWithState('곰이 쉬고 있어요', '책곰이')
    expect(screen.getByText('책곰이')).toBeInTheDocument()
  })

  it('role="status"에 aria-live="polite"와 aria-atomic="true"가 있다', () => {
    renderWithState('곰이 놀고 있어요')
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('aria-atomic', 'true')
  })
})
