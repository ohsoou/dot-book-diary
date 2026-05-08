import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applyApiGuard } from './_guard';
import { __resetRateLimitStore } from '@/lib/rate-limit';

function makeRequest(options: {
  origin?: string;
  referer?: string;
  ip?: string;
} = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.origin !== undefined) headers['origin'] = options.origin;
  if (options.referer !== undefined) headers['referer'] = options.referer;
  if (options.ip !== undefined) headers['x-forwarded-for'] = options.ip;

  return new NextRequest('http://localhost/api/books/test', { headers });
}

beforeEach(() => {
  __resetRateLimitStore();
  vi.unstubAllEnvs();
});

describe('applyApiGuard', () => {
  it('localhost:3000 origin이면 ok 반환', () => {
    const result = applyApiGuard(makeRequest({ origin: 'http://localhost:3000' }), { rate: 30, scope: 'test' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clientKey).toContain('test:');
    }
  });

  it('허용되지 않은 origin이면 403 반환', async () => {
    const result = applyApiGuard(makeRequest({ origin: 'https://evil.com' }), { rate: 30, scope: 'test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json() as { error: { code: string } };
      expect(body.error.code).toBe('FORBIDDEN');
    }
  });

  it('origin/referer 모두 없으면 403 반환', async () => {
    const result = applyApiGuard(makeRequest(), { rate: 30, scope: 'test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('NEXT_PUBLIC_APP_URL이 설정되어 있어도 localhost는 항상 허용', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://prod.example.com');
    const result = applyApiGuard(makeRequest({ origin: 'http://localhost:3000' }), { rate: 30, scope: 'test' });
    expect(result.ok).toBe(true);
  });

  it('rate 초과 시 429 + Retry-After 헤더 반환', async () => {
    const cfg = { rate: 1, scope: 'rate-test' };
    applyApiGuard(makeRequest({ origin: 'http://localhost:3000', ip: '10.0.0.1' }), cfg); // 소진
    const result = applyApiGuard(makeRequest({ origin: 'http://localhost:3000', ip: '10.0.0.1' }), cfg); // 초과
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
      expect(result.response.headers.get('retry-after')).not.toBeNull();
    }
  });

  it('다른 IP는 독립 카운트', () => {
    const cfg = { rate: 1, scope: 'ip-test' };
    applyApiGuard(makeRequest({ origin: 'http://localhost:3000', ip: '10.0.0.1' }), cfg); // IP1 소진
    const result = applyApiGuard(makeRequest({ origin: 'http://localhost:3000', ip: '10.0.0.2' }), cfg); // IP2 독립
    expect(result.ok).toBe(true);
  });

  it('다른 scope는 독립 카운트', () => {
    const req = makeRequest({ origin: 'http://localhost:3000', ip: '10.0.0.1' });
    applyApiGuard(req, { rate: 1, scope: 'scope-a' }); // scope-a 소진
    const result = applyApiGuard(req, { rate: 1, scope: 'scope-b' }); // scope-b 독립
    expect(result.ok).toBe(true);
  });

  it('NEXT_PUBLIC_APP_URL origin이면 허용', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
    const result = applyApiGuard(makeRequest({ origin: 'https://app.example.com' }), { rate: 30, scope: 'test' });
    expect(result.ok).toBe(true);
  });
});
