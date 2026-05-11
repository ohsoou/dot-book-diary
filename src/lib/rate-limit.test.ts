import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkAndConsume, __resetRateLimitStore } from './rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    __resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('첫 호출은 allowed: true, remaining: rate-1을 반환한다', () => {
    const result = checkAndConsume('test', { rate: 5, per: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterMs).toBe(0);
  });

  it('rate회 연속 호출 후 (rate+1)회째는 allowed: false를 반환한다', () => {
    const options = { rate: 3, per: 1000 };
    for (let i = 0; i < 3; i++) {
      checkAndConsume('test', options);
    }
    const result = checkAndConsume('test', options);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.remaining).toBe(0);
  });

  it('per 절반 시간 후 토큰이 절반 보충된다', () => {
    const options = { rate: 4, per: 1000 };
    // 토큰 전부 소진
    for (let i = 0; i < 4; i++) {
      checkAndConsume('test', options);
    }
    // 절반 시간 경과: (500/1000)*4 = 2토큰 보충 → tokens=2
    vi.advanceTimersByTime(500);
    const result = checkAndConsume('test', options);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1); // 2 보충 후 1 소비 = 1 남음
  });

  it('per 이상 시간 후 토큰이 최대치(rate)로 보충된다', () => {
    const options = { rate: 3, per: 1000 };
    for (let i = 0; i < 3; i++) {
      checkAndConsume('test', options);
    }
    vi.advanceTimersByTime(2000);
    const result = checkAndConsume('test', options);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // rate=3, 1 소비 → 2
  });

  it('다른 key는 독립적으로 카운트된다', () => {
    const options = { rate: 2, per: 1000 };
    checkAndConsume('key1', options);
    checkAndConsume('key1', options);
    expect(checkAndConsume('key1', options).allowed).toBe(false);
    expect(checkAndConsume('key2', options).allowed).toBe(true);
  });

  it('__resetRateLimitStore 후 카운터가 초기화된다', () => {
    const options = { rate: 1, per: 1000 };
    checkAndConsume('test', options);
    expect(checkAndConsume('test', options).allowed).toBe(false);
    __resetRateLimitStore();
    expect(checkAndConsume('test', options).allowed).toBe(true);
  });

  it('retryAfterMs가 음수가 되지 않는다', () => {
    const options = { rate: 1, per: 1000 };
    checkAndConsume('test', options);
    const result = checkAndConsume('test', options);
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(0);
  });

  it('정확히 1 토큰 보충된 시점에 호출하면 allowed: true를 반환한다', () => {
    const options = { rate: 2, per: 1000 };
    // 전부 소진: per/rate = 500ms마다 1토큰
    checkAndConsume('test', options);
    checkAndConsume('test', options);
    // 정확히 1토큰 보충 시간(500ms) 경과
    vi.advanceTimersByTime(500);
    const result = checkAndConsume('test', options);
    expect(result.allowed).toBe(true);
  });

  it('allowed: true 결과에서 retryAfterMs는 항상 0이다', () => {
    const result = checkAndConsume('test', { rate: 10, per: 1000 });
    expect(result.retryAfterMs).toBe(0);
  });

  it('resetAt은 allowed와 관계없이 미래 시각이다', () => {
    const now = Date.now();
    const options = { rate: 1, per: 1000 };
    const r1 = checkAndConsume('reset-test', options);
    expect(r1.resetAt).toBeGreaterThan(now);
    const r2 = checkAndConsume('reset-test', options);
    expect(r2.resetAt).toBeGreaterThan(now);
  });
});
