import { describe, it, expect } from 'vitest'
import { mapSupabaseAuthError } from './error-codes'

describe('mapSupabaseAuthError', () => {
  describe('code 기반 매핑 (1순위)', () => {
    it('user_already_exists → EMAIL_TAKEN', () => {
      const result = mapSupabaseAuthError({ code: 'user_already_exists', message: 'some message' })
      expect(result.code).toBe('EMAIL_TAKEN')
      expect(result.message).toBe('이미 가입된 이메일이에요')
    })

    it('email_exists → EMAIL_TAKEN', () => {
      const result = mapSupabaseAuthError({ code: 'email_exists', message: 'some message' })
      expect(result.code).toBe('EMAIL_TAKEN')
    })

    it('weak_password → WEAK_PASSWORD', () => {
      const result = mapSupabaseAuthError({ code: 'weak_password', message: 'some message' })
      expect(result.code).toBe('WEAK_PASSWORD')
      expect(result.message).toBe('비밀번호는 영문+숫자 8자 이상이어야 해요')
    })

    it('invalid_credentials → INVALID_CREDENTIALS', () => {
      const result = mapSupabaseAuthError({ code: 'invalid_credentials', message: 'some message' })
      expect(result.code).toBe('INVALID_CREDENTIALS')
      expect(result.message).toBe('이메일 또는 비밀번호가 일치하지 않아요.')
    })

    it('email_not_confirmed → EMAIL_NOT_CONFIRMED', () => {
      const result = mapSupabaseAuthError({ code: 'email_not_confirmed', message: 'some message' })
      expect(result.code).toBe('EMAIL_NOT_CONFIRMED')
      expect(result.message).toMatch(/이메일을 확인해 주세요/)
    })
  })

  describe('메시지 fallback (2순위, code 없을 때)', () => {
    it('"already registered" → EMAIL_TAKEN', () => {
      const result = mapSupabaseAuthError({ message: 'User already registered' })
      expect(result.code).toBe('EMAIL_TAKEN')
    })

    it('"Email already registered" → EMAIL_TAKEN', () => {
      const result = mapSupabaseAuthError({ message: 'Email already registered' })
      expect(result.code).toBe('EMAIL_TAKEN')
    })

    it('"Password should be" → WEAK_PASSWORD', () => {
      const result = mapSupabaseAuthError({ message: 'Password should be at least 8 characters' })
      expect(result.code).toBe('WEAK_PASSWORD')
    })

    it('"Invalid login credentials" → INVALID_CREDENTIALS', () => {
      const result = mapSupabaseAuthError({ message: 'Invalid login credentials' })
      expect(result.code).toBe('INVALID_CREDENTIALS')
    })

    it('"Email not confirmed" → EMAIL_NOT_CONFIRMED', () => {
      const result = mapSupabaseAuthError({ message: 'Email not confirmed' })
      expect(result.code).toBe('EMAIL_NOT_CONFIRMED')
    })
  })

  describe('UPSTREAM_FAILED fallback (3순위)', () => {
    it('알 수 없는 code → UPSTREAM_FAILED', () => {
      const result = mapSupabaseAuthError({ code: 'rate_limit_exceeded', message: 'too many requests' })
      expect(result.code).toBe('UPSTREAM_FAILED')
    })

    it('매칭 안 되는 메시지 → UPSTREAM_FAILED', () => {
      const result = mapSupabaseAuthError({ message: 'Internal server error' })
      expect(result.code).toBe('UPSTREAM_FAILED')
    })

    it('null → UPSTREAM_FAILED', () => {
      expect(mapSupabaseAuthError(null).code).toBe('UPSTREAM_FAILED')
    })

    it('undefined → UPSTREAM_FAILED', () => {
      expect(mapSupabaseAuthError(undefined).code).toBe('UPSTREAM_FAILED')
    })
  })
})
