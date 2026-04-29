import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      updateUser: mockUpdateUser,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

import { ResetPasswordForm } from './ResetPasswordForm'

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('새 비밀번호 필드를 렌더한다', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
  })

  it('비밀번호 필드의 type이 password다', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('type', 'password')
  })

  it('[비밀번호 변경] 버튼이 존재한다', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByRole('button', { name: /비밀번호 변경/ })).toBeInTheDocument()
  })

  it('제출 시 updateUser가 새 비밀번호와 함께 호출된다', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })

    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'NewPass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPass1' })
    })
  })

  it('성공 시 /login으로 이동한다', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })

    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'NewPass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('실패 시 에러 메시지를 표시한다', async () => {
    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid or expired link' },
    })

    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'NewPass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }))

    await waitFor(() => {
      expect(screen.getByText(/비밀번호 변경에 실패했어요/)).toBeInTheDocument()
    })
  })

  it('passwordSchema 검증 실패 시 에러 메시지를 표시하고 updateUser는 호출하지 않는다', async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }))

    await waitFor(() => {
      expect(mockUpdateUser).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
