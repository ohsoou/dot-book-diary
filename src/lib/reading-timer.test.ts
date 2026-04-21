import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { read, start, pause, resume, stop, clear, elapsedMs } from './reading-timer';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('start', () => {
  it('타이머를 시작하고 running 상태를 반환한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const state = start('book1');
    expect(state.bookId).toBe('book1');
    expect(state.status).toBe('running');
    expect(state.accumulatedMs).toBe(0);
    expect(state.startedAt).toBe(1000);
  });

  it('시작 후 read()로 상태를 조회할 수 있다', () => {
    start('book1');
    const s = read();
    expect(s).not.toBeNull();
    expect(s?.bookId).toBe('book1');
  });

  it('이미 활성 타이머가 있으면 AppError(VALIDATION_FAILED)를 throw한다', () => {
    start('book1');
    expect(() => start('book2')).toThrow(AppError);
    expect(() => start('book2')).toThrow('이미 실행 중인 타이머가 있어요');
  });

  it('같은 책에 대해서도 이미 실행 중이면 throw한다', () => {
    start('book1');
    expect(() => start('book1')).toThrow(AppError);
  });
});

describe('elapsedMs', () => {
  it('running 상태에서 경과 시간을 반환한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const state = start('book1');
    expect(elapsedMs(state, 4000)).toBe(3000);
  });

  it('paused 상태에서 accumulatedMs를 반환한다(고정)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(4000);
    const paused = pause();
    expect(elapsedMs(paused, 10000)).toBe(3000);
    expect(elapsedMs(paused, 99000)).toBe(3000);
  });

  it('pause → resume 후 누적 시간이 이어진다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(4000);
    pause();
    vi.spyOn(Date, 'now').mockReturnValue(6000);
    const resumed = resume();
    vi.spyOn(Date, 'now').mockReturnValue(9000);
    // 3s(1~4) + 3s(6~9) = 6s
    expect(elapsedMs(resumed, 9000)).toBe(6000);
  });

  it('default now는 Date.now()를 사용한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const state = start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(3500);
    expect(elapsedMs(state)).toBe(2500);
  });
});

describe('pause', () => {
  it('running 타이머를 일시정지하고 paused 상태를 반환한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(4000);
    const paused = pause();
    expect(paused.status).toBe('paused');
    expect(paused.accumulatedMs).toBe(3000);
    expect(paused.pausedAt).toBe(4000);
  });

  it('활성 타이머가 없으면 throw한다', () => {
    expect(() => pause()).toThrow(AppError);
  });

  it('이미 paused 상태면 throw한다', () => {
    start('book1');
    pause();
    expect(() => pause()).toThrow(AppError);
  });
});

describe('resume', () => {
  it('paused 타이머를 재개하고 running 상태를 반환한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(4000);
    pause();
    vi.spyOn(Date, 'now').mockReturnValue(6000);
    const resumed = resume();
    expect(resumed.status).toBe('running');
    expect(resumed.lastRunMs).toBe(6000);
    expect(resumed.pausedAt).toBeNull();
  });

  it('running 상태에서 resume하면 throw한다', () => {
    start('book1');
    expect(() => resume()).toThrow(AppError);
  });

  it('타이머가 없으면 throw한다', () => {
    expect(() => resume()).toThrow(AppError);
  });
});

describe('stop', () => {
  it('경과 초와 bookId를 반환하고 localStorage에서 제거한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(4500);
    const result = stop();
    expect(result?.bookId).toBe('book1');
    expect(result?.seconds).toBe(4);
    expect(read()).toBeNull();
  });

  it('pause 중에도 stop 가능하다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(3000);
    pause();
    const result = stop();
    expect(result?.seconds).toBe(2);
    expect(read()).toBeNull();
  });

  it('경과 ms가 반올림되어 초로 반환된다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(1500);
    const result = stop();
    expect(result?.seconds).toBe(2);
  });

  it('활성 타이머가 없으면 null을 반환한다', () => {
    expect(stop()).toBeNull();
  });
});

describe('clear', () => {
  it('localStorage에서 타이머 상태를 제거한다', () => {
    start('book1');
    clear();
    expect(read()).toBeNull();
  });

  it('타이머가 없어도 오류 없이 동작한다', () => {
    expect(() => clear()).not.toThrow();
  });
});

describe('pause → resume → stop 누적 검증', () => {
  it('run(3s) + pause(2s) + run(5s) = 8s', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    start('book1');
    vi.spyOn(Date, 'now').mockReturnValue(3000);
    pause();
    vi.spyOn(Date, 'now').mockReturnValue(5000);
    resume();
    vi.spyOn(Date, 'now').mockReturnValue(10000);
    const result = stop();
    expect(result?.seconds).toBe(8);
  });
});
