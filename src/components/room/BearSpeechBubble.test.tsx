import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BearSpeechBubble } from './BearSpeechBubble'
import { BearStateProvider, useBearState } from './BearStateContext'

describe('BearSpeechBubble', () => {
  it('label이 null이면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<BearSpeechBubble label={null} nickname="책벌레" />)
    expect(container.firstChild).toBeNull()
  })

  it('label이 있으면 role="status" 컨테이너를 렌더한다', () => {
    render(<BearSpeechBubble label="곰이 자고 있어요" nickname="책벌레" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('헤더에 nickname 텍스트가 렌더된다', () => {
    render(<BearSpeechBubble label="곰이 자고 있어요" nickname="독서왕" />)
    expect(screen.getByText('독서왕')).toBeInTheDocument()
  })

  it('본문에 label 텍스트가 렌더된다', () => {
    render(<BearSpeechBubble label="곰이 자고 있어요" nickname="책벌레" />)
    expect(screen.getByText('곰이 자고 있어요')).toBeInTheDocument()
  })

  it('nickname이 책벌레인 경우 헤더에 표시된다', () => {
    render(<BearSpeechBubble label="곰이 쉬고 있어요" nickname="책벌레" />)
    expect(screen.getByText('책벌레')).toBeInTheDocument()
  })

  it('role="status"에 aria-live="polite"와 aria-atomic="true"가 있다', () => {
    render(<BearSpeechBubble label="곰이 놀고 있어요" nickname="책벌레" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('aria-atomic', 'true')
  })

  it('BearStateProvider와 통합: context에서 값을 받아 렌더된다', () => {
    function BubbleWithContext() {
      const { bearLabel, nickname } = useBearState()
      return <BearSpeechBubble label={bearLabel} nickname={nickname} />
    }

    render(
      <BearStateProvider
        initial={{
          bearAsset: undefined,
          bearLabel: '곰이 책을 읽고 왔어요',
          lastReadAt: null,
          nickname: '독서왕',
        }}
      >
        <BubbleWithContext />
      </BearStateProvider>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('독서왕')).toBeInTheDocument()
    expect(screen.getByText('곰이 책을 읽고 왔어요')).toBeInTheDocument()
  })
})
