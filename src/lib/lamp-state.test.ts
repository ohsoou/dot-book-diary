import { beforeEach, describe, expect, it } from 'vitest'
import { LAMP_STATE_KEY, readLampState, writeLampState } from './lamp-state'

describe('lamp-state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('localStorage 미설정 시 on을 반환한다', () => {
    expect(readLampState()).toBe('on')
  })

  it('off로 설정된 경우 off를 반환한다', () => {
    localStorage.setItem(LAMP_STATE_KEY, 'off')
    expect(readLampState()).toBe('off')
  })

  it('알 수 없는 값인 경우 on으로 폴백한다', () => {
    localStorage.setItem(LAMP_STATE_KEY, 'unknown')
    expect(readLampState()).toBe('on')
  })

  it('writeLampState(off) 후 readLampState()는 off를 반환한다', () => {
    writeLampState('off')
    expect(readLampState()).toBe('off')
  })

  it('writeLampState(on) 후 readLampState()는 on을 반환한다', () => {
    writeLampState('off')
    writeLampState('on')
    expect(readLampState()).toBe('on')
  })
})
