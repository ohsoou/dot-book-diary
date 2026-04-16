import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function TestHarness({ message, variant }: { message: string; variant: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast()
  return (
    <button onClick={() => addToast({ message, variant })}>
      토스트 추가
    </button>
  )
}

function renderWithProvider(message = '저장했어요', variant: 'success' | 'error' | 'info' = 'success') {
  return render(
    <ToastProvider>
      <TestHarness message={message} variant={variant} />
    </ToastProvider>,
  )
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('토스트를 추가하면 메시지가 표시된다', () => {
    renderWithProvider('저장했어요')
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))
    expect(screen.getByText('저장했어요')).toBeDefined()
  })

  it('3초 후 자동으로 dismiss된다', () => {
    renderWithProvider('저장했어요')
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))
    expect(screen.getByText('저장했어요')).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(3100)
    })

    expect(screen.queryByText('저장했어요')).toBeNull()
  })

  it('× 버튼으로 수동 dismiss된다', () => {
    renderWithProvider('저장했어요')
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByText('저장했어요')).toBeNull()
  })

  it('최대 3개 초과 시 가장 오래된 것이 제거된다', () => {
    const { rerender } = render(
      <ToastProvider>
        <TestHarness message="msg1" variant="info" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))

    rerender(
      <ToastProvider>
        <TestHarness message="msg2" variant="info" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))

    rerender(
      <ToastProvider>
        <TestHarness message="msg3" variant="info" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))

    rerender(
      <ToastProvider>
        <TestHarness message="msg4" variant="info" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '토스트 추가' }))

    // 최대 3개 유지 — msg1은 사라져야 함
    expect(screen.queryByText('msg1')).toBeNull()
    expect(screen.getByText('msg4')).toBeDefined()
  })
})
