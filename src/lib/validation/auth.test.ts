import { describe, it, expect } from 'vitest'
import { emailSchema, passwordSchema, nicknameSchema, signUpSchema } from './auth'

describe('emailSchema', () => {
  it('올바른 이메일 형식을 통과한다', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true)
    expect(emailSchema.safeParse('test.name+tag@domain.co.kr').success).toBe(true)
  })

  it('잘못된 이메일 형식을 실패 처리한다', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false)
    expect(emailSchema.safeParse('missing@').success).toBe(false)
    expect(emailSchema.safeParse('@domain.com').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })

  it('실패 메시지가 한국어다', () => {
    const result = emailSchema.safeParse('bad')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('올바른 이메일 형식이 아니에요')
    }
  })
})

describe('passwordSchema', () => {
  it('8자+영문+숫자 조합을 통과한다', () => {
    expect(passwordSchema.safeParse('Password1').success).toBe(true)
    expect(passwordSchema.safeParse('abc12345').success).toBe(true)
    expect(passwordSchema.safeParse('ABCDE123').success).toBe(true)
  })

  it('7자 이하는 실패한다', () => {
    const result = passwordSchema.safeParse('Abc1234')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('비밀번호는 8자 이상이어야 해요')
    }
  })

  it('숫자가 없으면 실패한다', () => {
    const result = passwordSchema.safeParse('PasswordOnly')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === '숫자를 포함해야 해요')).toBe(true)
    }
  })

  it('영문자가 없으면 실패한다', () => {
    const result = passwordSchema.safeParse('12345678')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === '영문자를 포함해야 해요')).toBe(true)
    }
  })

  it('빈 문자열은 실패한다', () => {
    expect(passwordSchema.safeParse('').success).toBe(false)
  })
})

describe('nicknameSchema', () => {
  it('정상적인 닉네임을 통과한다', () => {
    expect(nicknameSchema.safeParse('책곰이').success).toBe(true)
    expect(nicknameSchema.safeParse('독서하는 곰').success).toBe(true)
  })

  it('빈 문자열은 실패한다', () => {
    const result = nicknameSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('닉네임을 입력해 주세요')
    }
  })

  it('31자는 실패한다', () => {
    const result = nicknameSchema.safeParse('a'.repeat(31))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('닉네임은 30자 이하여야 해요')
    }
  })

  it('30자는 통과한다', () => {
    expect(nicknameSchema.safeParse('a'.repeat(30)).success).toBe(true)
  })

  it('trim()이 적용된다', () => {
    const result = nicknameSchema.safeParse('  책곰이  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('책곰이')
    }
  })

  it('공백만 있으면 trim 후 빈 문자열이 되어 실패한다', () => {
    expect(nicknameSchema.safeParse('   ').success).toBe(false)
  })
})

describe('signUpSchema', () => {
  it('유효한 입력을 통과한다', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.success).toBe(true)
  })

  it('이메일 없으면 실패한다', () => {
    const result = signUpSchema.safeParse({
      email: '',
      password: 'Password1',
      nickname: '책곰이',
    })
    expect(result.success).toBe(false)
  })

  it('비밀번호 조건 미달이면 실패한다', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      nickname: '책곰이',
    })
    expect(result.success).toBe(false)
  })

  it('닉네임 없으면 실패한다', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      nickname: '',
    })
    expect(result.success).toBe(false)
  })
})
