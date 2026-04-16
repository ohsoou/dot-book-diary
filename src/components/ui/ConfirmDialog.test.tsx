import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const defaults = {
    open: true,
    title: '정말 삭제할까요?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }
  return render(<ConfirmDialog {...defaults} {...props} />)
}

describe('ConfirmDialog', () => {
  it('open=true면 dialog를 렌더한다', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('정말 삭제할까요?')).toBeDefined()
  })

  it('open=false면 렌더하지 않는다', () => {
    renderDialog({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('확인 버튼 클릭 시 onConfirm을 호출한다', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })
    await user.click(screen.getByRole('button', { name: '확인' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('취소 버튼 클릭 시 onCancel을 호출한다', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ onCancel })
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('ESC 키 입력 시 onCancel을 호출한다', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ onCancel })
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('aria-modal="true"가 설정된다', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('커스텀 confirmLabel, cancelLabel을 사용한다', () => {
    renderDialog({ confirmLabel: '삭제', cancelLabel: '돌아가기' })
    expect(screen.getByRole('button', { name: '삭제' })).toBeDefined()
    expect(screen.getByRole('button', { name: '돌아가기' })).toBeDefined()
  })
})