import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockSignInWithPassword = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('이메일 + 비밀번호 필드를 렌더한다', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('비밀번호 필드의 type이 password다', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password')
  })

  it('로그인 버튼이 존재한다', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /로그인/ })).toBeInTheDocument()
  })

  it('폼 제출 시 signInWithPassword가 호출된다', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password1',
      })
    })
  })

  it('성공 시 / 로 이동한다', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('잘못된 자격증명 에러 시 에러 메시지를 표시한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'WrongPass1' } })
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }))

    await waitFor(() => {
      expect(screen.getByText(/이메일 또는 비밀번호/)).toBeInTheDocument()
    })
  })

  it('Email not confirmed 에러 시 이메일 확인 안내를 표시한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }))

    await waitFor(() => {
      expect(screen.getByText(/이메일을 확인해 주세요/)).toBeInTheDocument()
    })
  })

  it('"비밀번호를 잊으셨나요?" 링크가 /forgot-password를 가리킨다', () => {
    render(<LoginForm />)
    const link = screen.getByRole('link', { name: /비밀번호를 잊으셨나요/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('"회원가입" 링크가 /signup을 가리킨다', () => {
    render(<LoginForm />)
    const link = screen.getByRole('link', { name: /회원가입/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('error=link_expired prop 전달 시 링크 만료 에러 메시지를 표시한다', () => {
    render(<LoginForm error="link_expired" />)
    expect(screen.getByText(/링크가 만료됐어요/)).toBeInTheDocument()
  })

  it('reason=expired prop 전달 시 세션 만료 메시지를 표시한다', () => {
    render(<LoginForm reason="expired" />)
    expect(screen.getByText(/세션이 만료됐어요/)).toBeInTheDocument()
  })
})
