import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignUp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { signUp: mockSignUp },
    })
  ),
}))

import { signUpAction } from './auth'

describe('signUpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('이메일이 없으면 VALIDATION_FAILED를 반환한다', async () => {
    const result = await signUpAction({
      email: '',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
    }
  })

  it('비밀번호 조건 미달이면 VALIDATION_FAILED를 반환한다', async () => {
    const result = await signUpAction({
      email: 'user@example.com',
      password: 'short',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
    }
  })

  it('닉네임이 없으면 VALIDATION_FAILED를 반환한다', async () => {
    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.fieldErrors?.['nickname']).toBeDefined()
    }
  })

  it('Supabase 성공 시 ok:true와 email을 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { email: 'user@example.com' }, session: null },
      error: null,
    })

    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('이미 가입된 이메일이면 EMAIL_TAKEN을 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })

    const result = await signUpAction({
      email: 'existing@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('EMAIL_TAKEN')
    }
  })

  it('"already registered" 메시지도 EMAIL_TAKEN으로 처리한다', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' },
    })

    const result = await signUpAction({
      email: 'existing@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('EMAIL_TAKEN')
    }
  })

  it('비밀번호 정책 위반 에러는 WEAK_PASSWORD를 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Password should be at least 8 characters' },
    })

    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('WEAK_PASSWORD')
    }
  })

  it('그 외 Supabase 에러는 UPSTREAM_FAILED를 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    })

    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('code: user_already_exists → EMAIL_TAKEN (code 우선 매칭)', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { code: 'user_already_exists', message: 'User already registered' },
    })

    const result = await signUpAction({
      email: 'existing@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('EMAIL_TAKEN')
    }
  })

  it('code: weak_password → WEAK_PASSWORD (code 우선 매칭)', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { code: 'weak_password', message: 'Password should be at least 8 characters' },
    })

    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('WEAK_PASSWORD')
    }
  })

  it('알 수 없는 code → UPSTREAM_FAILED', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { code: 'unexpected_error', message: 'something went wrong' },
    })

    const result = await signUpAction({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })
})
