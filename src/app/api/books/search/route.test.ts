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

const { GET } = await import('@/app/api/books/search/route');

function makeRequest(q?: string): NextRequest {
  const url = q !== undefined
    ? `http://localhost/api/books/search?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/books/search';
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
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
});