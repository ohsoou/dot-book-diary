import { describe, expect, it } from 'vitest';
import { computeBearState, formatElapsed } from './bear-state';

const NOW = new Date('2026-04-22T10:00:00Z');

describe('computeBearState', () => {
  it('lastReadAt = null → fresh, Bear.png, 곰이 책을 기다려요, elapsedMs null', () => {
    const result = computeBearState(null, { now: NOW });
    expect(result.state).toBe('fresh');
    expect(result.asset).toBe('Bear.png');
    expect(result.label).toBe('곰이 책을 기다려요');
    expect(result.elapsedMs).toBeNull();
  });

  it('잘못된 ISO 문자열 → fresh, elapsedMs null', () => {
    const result = computeBearState('not-a-date', { now: NOW });
    expect(result.state).toBe('fresh');
    expect(result.elapsedMs).toBeNull();
  });

  it('elapsed = 59분59초 → fresh, 곰이 책을 읽고 왔어요', () => {
    const lastReadAt = new Date(NOW.getTime() - (59 * 60 + 59) * 1000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW });
    expect(result.state).toBe('fresh');
    expect(result.asset).toBe('Bear.png');
    expect(result.label).toBe('곰이 책을 읽고 왔어요');
  });

  it('elapsed = 1시간 정각 → active (경계 포함)', () => {
    const lastReadAt = new Date(NOW.getTime() - 3_600_000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW, rng: () => 0 });
    expect(result.state).toBe('active');
  });

  it('elapsed = 6일23시59분 → active', () => {
    const lastReadAt = new Date(NOW.getTime() - (6 * 24 * 60 * 60 + 23 * 3600 + 59 * 60) * 1000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW, rng: () => 0 });
    expect(result.state).toBe('active');
  });

  it('elapsed = 7일 정각 → sleeping', () => {
    const lastReadAt = new Date(NOW.getTime() - 604_800_000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW });
    expect(result.state).toBe('sleeping');
    expect(result.asset).toBe('Bear_sleeping.png');
    expect(result.label).toBe('곰이 자고 있어요');
  });

  it('elapsed < 0 (now < lastReadAt) → fresh, 곰이 책을 기다려요', () => {
    const lastReadAt = new Date(NOW.getTime() + 10_000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW });
    expect(result.state).toBe('fresh');
    expect(result.label).toBe('곰이 책을 기다려요');
  });

  it('active 상태에서 rng = () => 0 → Bear_drinking.png (첫 번째)', () => {
    const lastReadAt = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW, rng: () => 0 });
    expect(result.state).toBe('active');
    expect(result.asset).toBe('Bear_drinking.png');
  });

  it('active 상태에서 rng = () => 0.99 → Bear_working.png (마지막)', () => {
    const lastReadAt = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    const result = computeBearState(lastReadAt, { now: NOW, rng: () => 0.99 });
    expect(result.state).toBe('active');
    expect(result.asset).toBe('Bear_working.png');
  });

  it('기본 rng 시드 일관성: 같은 날 + 같은 lastReadAt으로 두 번 호출하면 동일 asset', () => {
    const lastReadAt = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    const result1 = computeBearState(lastReadAt, { now: NOW });
    const result2 = computeBearState(lastReadAt, { now: NOW });
    expect(result1.asset).toBe(result2.asset);
  });
});

describe('formatElapsed', () => {
  it('formatElapsed(0) → 방금', () => {
    expect(formatElapsed(0)).toBe('방금');
  });

  it('formatElapsed(60_000) → 1분 전', () => {
    expect(formatElapsed(60_000)).toBe('1분 전');
  });

  it('formatElapsed(3_600_000) → 1시간 전', () => {
    expect(formatElapsed(3_600_000)).toBe('1시간 전');
  });

  it('formatElapsed(86_400_000) → 1일 전', () => {
    expect(formatElapsed(86_400_000)).toBe('1일 전');
  });

  it('formatElapsed(604_800_000) → 1주 전', () => {
    expect(formatElapsed(604_800_000)).toBe('1주 전');
  });
});
