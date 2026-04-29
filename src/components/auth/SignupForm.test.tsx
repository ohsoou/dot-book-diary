import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/actions/auth', () => ({
  signUpAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

import { SignupForm } from './SignupForm'
import * as authActions from '@/lib/actions/auth'

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('이메일/비밀번호/닉네임 필드를 렌더한다', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toBeInTheDocument()
  })

  it('비밀번호 필드의 type이 password다', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password')
  })

  it('회원가입 버튼이 존재한다', () => {
    render(<SignupForm />)
    expect(screen.getByRole('button', { name: /회원가입/ })).toBeInTheDocument()
  })

  it('/login 링크가 존재한다', () => {
    render(<SignupForm />)
    const link = screen.getByRole('link', { name: /로그인/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('폼 제출 시 signUpAction이 호출된다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: true,
      data: { email: 'user@example.com' },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '책곰이' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(authActions.signUpAction).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password1',
        nickname: '책곰이',
      })
    })
  })

  it('성공 시 확인 메일 안내 텍스트를 표시한다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: true,
      data: { email: 'user@example.com' },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '책곰이' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByText(/확인 메일을 보냈어요/)).toBeInTheDocument()
    })
  })

  it('EMAIL_TAKEN 에러 시 에러 메시지를 표시한다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: false,
      error: { code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요' },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '책곰이' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByText('이미 가입된 이메일이에요')).toBeInTheDocument()
    })
  })

  it('WEAK_PASSWORD 에러 시 에러 메시지를 표시한다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: false,
      error: { code: 'WEAK_PASSWORD', message: '비밀번호는 영문+숫자 8자 이상이어야 해요' },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '책곰이' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByText('비밀번호는 영문+숫자 8자 이상이어야 해요')).toBeInTheDocument()
    })
  })

  it('UPSTREAM_FAILED 에러 시 에러 메시지를 표시한다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: false,
      error: { code: 'UPSTREAM_FAILED', message: '가입에 실패했어요. 잠시 후 다시 시도해 주세요.' },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '책곰이' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByText('가입에 실패했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    })
  })

  it('VALIDATION_FAILED + fieldErrors 시 해당 필드 아래에 에러 메시지를 표시한다', async () => {
    vi.mocked(authActions.signUpAction).mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: '닉네임을 입력해 주세요',
        fieldErrors: { nickname: '닉네임을 입력해 주세요' },
      },
    })

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'a' } })
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }))

    await waitFor(() => {
      expect(screen.getByText('닉네임을 입력해 주세요')).toBeInTheDocument()
    })
  })
})
