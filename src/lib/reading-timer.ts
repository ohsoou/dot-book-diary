import { AppError } from '@/lib/errors';

export type TimerStatus = 'running' | 'paused' | 'stopped';

export type TimerState = {
  bookId: string;
  startedAt: number;
  pausedAt: number | null;
  accumulatedMs: number;
  status: 'running' | 'paused';
  lastRunMs: number;
};

const STORAGE_KEY = 'dbd:reading_timer';

function isServer(): boolean {
  return typeof window === 'undefined';
}

export function read(): TimerState | null {
  if (isServer()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

function write(state: TimerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function start(bookId: string): TimerState {
  if (isServer()) throw new AppError('UNSUPPORTED_ENV', 'localStorage를 사용할 수 없어요');
  const existing = read();
  if (existing) {
    throw new AppError('VALIDATION_FAILED', '이미 실행 중인 타이머가 있어요');
  }
  const now = Date.now();
  const state: TimerState = {
    bookId,
    startedAt: now,
    pausedAt: null,
    accumulatedMs: 0,
    status: 'running',
    lastRunMs: now,
  };
  write(state);
  return state;
}

export function pause(): TimerState {
  if (isServer()) throw new AppError('UNSUPPORTED_ENV', 'localStorage를 사용할 수 없어요');
  const state = read();
  if (!state || state.status !== 'running') {
    throw new AppError('VALIDATION_FAILED', '실행 중인 타이머가 없어요');
  }
  const now = Date.now();
  const updated: TimerState = {
    ...state,
    accumulatedMs: state.accumulatedMs + (now - state.lastRunMs),
    pausedAt: now,
    status: 'paused',
  };
  write(updated);
  return updated;
}

export function resume(): TimerState {
  if (isServer()) throw new AppError('UNSUPPORTED_ENV', 'localStorage를 사용할 수 없어요');
  const state = read();
  if (!state || state.status !== 'paused') {
    throw new AppError('VALIDATION_FAILED', '일시정지된 타이머가 없어요');
  }
  const now = Date.now();
  const updated: TimerState = {
    ...state,
    lastRunMs: now,
    pausedAt: null,
    status: 'running',
  };
  write(updated);
  return updated;
}

export function stop(): { bookId: string; seconds: number } | null {
  if (isServer()) return null;
  const state = read();
  if (!state) return null;
  const ms = elapsedMs(state);
  const result = {
    bookId: state.bookId,
    seconds: Math.round(ms / 1000),
  };
  clear();
  return result;
}

export function clear(): void {
  if (isServer()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function elapsedMs(state: TimerState, now: number = Date.now()): number {
  if (state.status === 'paused') {
    return state.accumulatedMs;
  }
  return state.accumulatedMs + (now - state.lastRunMs);
}
