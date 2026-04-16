import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  serverEnv: { ALADIN_TTB_KEY: 'test-ttb-key' },
}));

const mockFetchByIsbn = vi.fn();
vi.mock('@/lib/aladin', () => ({
  fetchByIsbn: mockFetchByIsbn,
}));

const { GET } = await import('@/app/api/books/isbn/route');

function makeRequest(isbn?: string): NextRequest {
  const url = isbn !== undefined
    ? `http://localhost/api/books/isbn?isbn=${encodeURIComponent(isbn)}`
    : 'http://localhost/api/books/isbn';
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/books/isbn', () => {
  it('isbn 파라미터 없으면 400 반환', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('isbn이 빈 문자열이면 400 반환', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
  });

  it('결과 없으면 404 반환', async () => {
    mockFetchByIsbn.mockResolvedValueOnce(null);

    const res = await GET(makeRequest('9780000000000'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('정상 응답 200 + { data: BookSearchResult }', async () => {
    const mockResult = { title: '클린 코드', isbn: '9788966260959' };
    mockFetchByIsbn.mockResolvedValueOnce(mockResult);

    const res = await GET(makeRequest('9788966260959'));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown };
    expect(body.data).toEqual(mockResult);
  });

  it('RATE_LIMITED → 429', async () => {
    const { AppError } = await import('@/lib/errors');
    mockFetchByIsbn.mockRejectedValueOnce(new AppError('RATE_LIMITED', '한도 초과'));

    const res = await GET(makeRequest('9788966260959'));
    expect(res.status).toBe(429);
  });

  it('UPSTREAM_FAILED → 502', async () => {
    const { AppError } = await import('@/lib/errors');
    mockFetchByIsbn.mockRejectedValueOnce(new AppError('UPSTREAM_FAILED', '서버 오류'));

    const res = await GET(makeRequest('9788966260959'));
    expect(res.status).toBe(502);
  });
});