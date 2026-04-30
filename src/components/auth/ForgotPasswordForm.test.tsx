import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockResetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

import { ForgotPasswordForm } from './ForgotPasswordForm'

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('이메일 필드를 렌더한다', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
  })

  it('[재설정 메일 받기] 버튼이 존재한다', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByRole('button', { name: /재설정 메일 받기/ })).toBeInTheDocument()
  })

  it('/login 링크가 존재한다', () => {
    render(<ForgotPasswordForm />)
    const link = screen.getByRole('link', { name: /로그인으로 돌아가기/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('제출 시 resetPasswordForEmail이 이메일과 함께 호출된다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /재설정 메일 받기/ }))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') }),
      )
    })
  })

  it('Supabase 에러가 없어도 항상 성공 안내 메시지를 표시한다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /재설정 메일 받기/ }))

    await waitFor(() => {
      expect(screen.getByText(/비밀번호 재설정 메일을 보냈어요/)).toBeInTheDocument()
    })
  })

  it('Supabase 에러가 있어도 동일한 성공 안내 메시지를 표시한다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'User not found' },
    })

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'notexist@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /재설정 메일 받기/ }))

    await waitFor(() => {
      expect(screen.getByText(/비밀번호 재설정 메일을 보냈어요/)).toBeInTheDocument()
    })
  })

  it('성공 후 폼이 숨겨지고 안내 텍스트만 표시된다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /재설정 메일 받기/ }))

    await waitFor(() => {
      expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
    })
  })
})
