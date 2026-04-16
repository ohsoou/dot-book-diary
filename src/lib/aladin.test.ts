import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only mock
vi.mock('server-only', () => ({}));

// env mock
vi.mock('@/lib/env', () => ({
  serverEnv: { ALADIN_TTB_KEY: 'test-ttb-key' },
}));

// isbn mock (real implementation is fine, but mock to isolate)
vi.mock('@/lib/isbn', async (importOriginal) => {
  return await importOriginal<typeof import('@/lib/isbn')>();
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { searchByKeyword, fetchByIsbn } = await import('@/lib/aladin');

function makeAladinResponse(items: object[]): Response {
  return new Response(JSON.stringify({ item: items }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleItem = {
  title: '클린 코드',
  author: '로버트 C. 마틴',
  publisher: '인사이트',
  isbn: '8966260olean',
  isbn13: '9788966260959',
  cover: 'https://image.aladin.co.kr/cover.jpg',
  subInfo: { itemPage: 431 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('searchByKeyword', () => {
  it('happy path: 정상 응답을 BookSearchResult[]로 정규화한다', async () => {
    mockFetch.mockResolvedValueOnce(makeAladinResponse([sampleItem]));

    const results = await searchByKeyword('클린 코드');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      isbn: '9788966260959',
      title: '클린 코드',
      author: '로버트 C. 마틴',
      publisher: '인사이트',
      coverUrl: 'https://image.aladin.co.kr/cover.jpg',
      totalPages: 431,
    });
  });

  it('title 없는 항목을 필터링한다', async () => {
    mockFetch.mockResolvedValueOnce(
      makeAladinResponse([{ author: '저자만 있음' }, sampleItem]),
    );

    const results = await searchByKeyword('테스트');
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('클린 코드');
  });

  it('item 배열이 없으면 빈 배열을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const results = await searchByKeyword('없는책');
    expect(results).toEqual([]);
  });

  it('타임아웃 후 1회 재시도하고, 2회 모두 실패 시 UPSTREAM_FAILED를 던진다', async () => {
    mockFetch
      .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))
      .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

    await expect(searchByKeyword('타임아웃')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILED',
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('첫 번째 시도 실패 후 재시도 성공 시 결과를 반환한다', async () => {
    mockFetch
      .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))
      .mockResolvedValueOnce(makeAladinResponse([sampleItem]));

    const results = await searchByKeyword('재시도');
    expect(results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('rate limit 429 시 RATE_LIMITED를 던지고 재시도하지 않는다', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 429 }));

    await expect(searchByKeyword('레이트리밋')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('fetchByIsbn', () => {
  it('happy path: ISBN-13으로 단일 책을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce(makeAladinResponse([sampleItem]));

    const result = await fetchByIsbn('9788966260959');
    expect(result).toMatchObject({ title: '클린 코드' });
  });

  it('결과 없으면 null을 반환한다', async () => {
    mockFetch.mockResolvedValueOnce(makeAladinResponse([]));

    const result = await fetchByIsbn('9780000000000');
    expect(result).toBeNull();
  });

  it('ISBN-10 입력 시 ISBN-13으로 변환 후 조회한다', async () => {
    mockFetch.mockResolvedValueOnce(makeAladinResponse([sampleItem]));

    // 유효한 ISBN-10: 0-306-40615-2
    await fetchByIsbn('0306406152');

    const calledUrl = mockFetch.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('itemIdType=ISBN13');
    expect(calledUrl).toContain('9780306406157');
  });

  it('rate limit 429 시 RATE_LIMITED를 던진다', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 429 }));

    await expect(fetchByIsbn('9788966260959')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});