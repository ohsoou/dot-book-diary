import { describe, it, expect, vi } from 'vitest';
import type { Store } from '@/lib/storage/Store';
import { getLastReadAtFromStore } from './last-read';
import type { ReadingSession } from '@/types';

function makeSession(createdAt: string, id = crypto.randomUUID()): ReadingSession {
  return {
    id,
    bookId: 'book-1',
    readDate: '2026-04-01',
    createdAt,
    updatedAt: createdAt,
  };
}

function mockStore(sessions: ReadingSession[]): Store {
  return {
    listReadingSessions: vi.fn().mockResolvedValue(sessions),
  } as unknown as Store;
}

describe('getLastReadAtFromStore', () => {
  it('세션이 없으면 null을 반환한다', async () => {
    const store = mockStore([]);
    const result = await getLastReadAtFromStore(store);
    expect(result).toBeNull();
  });

  it('세션이 1건이면 해당 createdAt을 반환한다', async () => {
    const session = makeSession('2026-04-20T10:00:00.000Z');
    const store = mockStore([session]);
    const result = await getLastReadAtFromStore(store);
    expect(result).toBe('2026-04-20T10:00:00.000Z');
  });

  it('세션이 여러 건이면 createdAt이 가장 최신인 항목을 반환한다', async () => {
    const sessions = [
      makeSession('2026-04-18T08:00:00.000Z'),
      makeSession('2026-04-22T12:00:00.000Z'),
      makeSession('2026-04-10T15:30:00.000Z'),
    ];
    const store = mockStore(sessions);
    const result = await getLastReadAtFromStore(store);
    expect(result).toBe('2026-04-22T12:00:00.000Z');
  });

  it('역순으로 저장되어 있어도 정렬 후 최신 createdAt을 반환한다', async () => {
    const sessions = [
      makeSession('2026-04-22T12:00:00.000Z'),
      makeSession('2026-04-18T08:00:00.000Z'),
      makeSession('2026-04-10T15:30:00.000Z'),
    ];
    const store = mockStore(sessions);
    const result = await getLastReadAtFromStore(store);
    expect(result).toBe('2026-04-22T12:00:00.000Z');
  });
});
