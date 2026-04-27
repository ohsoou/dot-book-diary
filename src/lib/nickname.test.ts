import { describe, it, expect } from 'vitest'
import { getDisplayNickname } from './nickname'

describe('getDisplayNickname', () => {
  it('undefined → 책곰이', () => {
    expect(getDisplayNickname(undefined)).toBe('책곰이')
  })

  it('null → 책곰이', () => {
    expect(getDisplayNickname(null)).toBe('책곰이')
  })

  it('빈 문자열 → 책곰이', () => {
    expect(getDisplayNickname('')).toBe('책곰이')
  })

  it('공백만 → 책곰이', () => {
    expect(getDisplayNickname('   ')).toBe('책곰이')
  })

  it('일반 닉네임 → 그대로 반환', () => {
    expect(getDisplayNickname('독서왕')).toBe('독서왕')
  })

  it('앞뒤 공백 → trim된 값 반환', () => {
    expect(getDisplayNickname('  곰  ')).toBe('곰')
  })
})
