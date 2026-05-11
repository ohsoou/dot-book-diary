import 'server-only';

export type RateLimitOptions = {
  rate: number; // 허용 토큰 수
  per: number;  // 단위 시간(ms)
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;    // 남은 토큰 (정수)
  retryAfterMs: number; // allowed=true면 0
  resetAt: number;      // ms epoch: 다음 전체 리필 시각
};

type BucketEntry = {
  tokens: number;
  lastRefill: number; // ms epoch
  lastAccess: number; // ms epoch
};

const store = new Map<string, BucketEntry>();
const STALE_MS = 60 * 60 * 1000; // 1시간 미접근 항목 청소

function maybeCleanup(now: number): void {
  if (store.size <= 500) return;
  for (const [key, entry] of store) {
    if (now - entry.lastAccess > STALE_MS) {
      store.delete(key);
    }
  }
}

export function checkAndConsume(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  let entry = store.get(key);

  if (!entry) {
    entry = { tokens: options.rate, lastRefill: now, lastAccess: now };
  } else {
    const elapsed = now - entry.lastRefill;
    const refill = (elapsed / options.per) * options.rate;
    entry.tokens = Math.min(options.rate, entry.tokens + refill);
    entry.lastRefill = now;
    entry.lastAccess = now;
  }

  const resetAt = entry.lastRefill + options.per;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    store.set(key, entry);
    return {
      allowed: true,
      remaining: Math.floor(entry.tokens),
      retryAfterMs: 0,
      resetAt,
    };
  }

  // 토큰 부족 — 1토큰 보충까지 걸리는 시간 계산
  const retryAfterMs = Math.max(0, ((1 - entry.tokens) / options.rate) * options.per);
  store.set(key, entry);
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
    resetAt,
  };
}

// 테스트 전용: 내부 상태 초기화
export function __resetRateLimitStore(): void {
  store.clear();
}
