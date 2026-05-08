import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  serverEnv: { ALADIN_TTB_KEY: 'test-ttb-key' },
}));

const mockSearchByKeyword = vi.fn();
vi.mock('@/lib/aladin', () => ({
  searchByKeyword: mockSearchByKeyword,
}));

const mockCheckAndConsume = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  checkAndConsume: mockCheckAndConsume,
  __resetRateLimitStore: vi.fn(),
}));

const { GET } = await import('@/app/api/books/search/route');

function makeRequest(q?: string, extraHeaders?: HeadersInit): NextRequest {
  const url = q !== undefined
    ? `http://localhost/api/books/search?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/books/search';
  return new NextRequest(url, {
    headers: { origin: 'http://localhost:3000', ...extraHeaders },
  });
}

function makeRequestNoOrigin(q?: string): NextRequest {
  const url = q !== undefined
    ? `http://localhost/api/books/search?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/books/search';
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckAndConsume.mockReturnValue({
    allowed: true,
    remaining: 29,
    retryAfterMs: 0,
    resetAt: Date.now() + 60_000,
  });
});

describe('GET /api/books/search', () => {
  it('q 파라미터 없으면 400 반환', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('q가 빈 문자열이면 400 반환', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
  });

  it('q가 공백만 있으면 400 반환', async () => {
    const res = await GET(makeRequest('   '));
    expect(res.status).toBe(400);
  });

  it('q가 100자 초과면 400 반환', async () => {
    const res = await GET(makeRequest('a'.repeat(101)));
    expect(res.status).toBe(400);
  });

  it('정상 응답 200 + { data: BookSearchResult[] }', async () => {
    const mockResult = [{ title: '클린 코드', isbn: '9788966260959' }];
    mockSearchByKeyword.mockResolvedValueOnce(mockResult);

    const res = await GET(makeRequest('클린 코드'));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toEqual(mockResult);
  });

  it('RATE_LIMITED → 429', async () => {
    const { AppError } = await import('@/lib/errors');
    mockSearchByKeyword.mockRejectedValueOnce(new AppError('RATE_LIMITED', '한도 초과'));

    const res = await GET(makeRequest('테스트'));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('UPSTREAM_FAILED → 502', async () => {
    const { AppError } = await import('@/lib/errors');
    mockSearchByKeyword.mockRejectedValueOnce(new AppError('UPSTREAM_FAILED', '서버 오류'));

    const res = await GET(makeRequest('테스트'));
    expect(res.status).toBe(502);
  });

  describe('가드 통합', () => {
    it('가드 통과 후 aladin 검색이 호출된다', async () => {
      const mockResult = [{ title: '책 제목', isbn: '9781234567890' }];
      mockSearchByKeyword.mockResolvedValueOnce(mockResult);

      const res = await GET(makeRequest('책 제목'));
      expect(res.status).toBe(200);
      expect(mockSearchByKeyword).toHaveBeenCalledOnce();
    });

    it('가드 실패(origin 없음) 시 aladin 호출 안 됨', async () => {
      const res = await GET(makeRequestNoOrigin('책 제목'));
      expect(res.status).toBe(403);
      expect(mockSearchByKeyword).not.toHaveBeenCalled();
    });

    it('rate limit 초과 시 429 + Retry-After 헤더 반환', async () => {
      mockCheckAndConsume.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        retryAfterMs: 5_000,
        resetAt: Date.now() + 60_000,
      });

      const res = await GET(makeRequest('테스트'));
      expect(res.status).toBe(429);
      expect(res.headers.get('retry-after')).not.toBeNull();
      expect(mockSearchByKeyword).not.toHaveBeenCalled();
    });
  });
});
