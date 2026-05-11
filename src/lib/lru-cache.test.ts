import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { LruCache } = await import('@/lib/lru-cache');

describe('LruCache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('set/get 정상', () => {
    const cache = new LruCache<string, number>({ max: 10, ttlMs: 60_000 });
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
    expect(cache.size()).toBe(1);
  });

  it('TTL 초과 후 만료', () => {
    vi.useFakeTimers();
    const cache = new LruCache<string, string>({ max: 10, ttlMs: 100 });
    cache.set('k', 'v');
    vi.advanceTimersByTime(101);
    expect(cache.get('k')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('max 초과 시 LRU eviction', () => {
    const cache = new LruCache<string, number>({ max: 2, ttlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a' (LRU)
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size()).toBe(2);
  });

  it('get hit이 LRU 순서를 갱신한다', () => {
    const cache = new LruCache<string, number>({ max: 2, ttlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' becomes MRU → order: b, a
    cache.set('c', 3); // evicts 'b' (LRU)
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('delete 동작', () => {
    const cache = new LruCache<string, string>({ max: 10, ttlMs: 60_000 });
    cache.set('x', 'val');
    cache.delete('x');
    expect(cache.get('x')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('같은 키 재set은 값을 갱신하고 size를 늘리지 않는다', () => {
    const cache = new LruCache<string, string>({ max: 10, ttlMs: 60_000 });
    cache.set('a', 'first');
    cache.set('a', 'second');
    expect(cache.get('a')).toBe('second');
    expect(cache.size()).toBe(1);
  });

  it('__reset() 후 size가 0이 된다', () => {
    const cache = new LruCache<string, number>({ max: 10, ttlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.__reset();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
