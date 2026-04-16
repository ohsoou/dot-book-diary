import { describe, it, expect, vi } from 'vitest';
import { RemoteStore } from './RemoteStore';
import { AppError } from '@/lib/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

type MockQuery = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
};

function makeMockQuery(resolvedValue: { data: unknown; error: unknown }): MockQuery {
  const query: MockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
  };

  // 체인 메서드는 자기 자신을 반환하고 터미널 메서드만 resolved value를 반환
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(resolvedValue);
  query.single.mockResolvedValue(resolvedValue);

  // delete().eq() 체인의 마지막이 resolved value를 반환하게 한다
  query.eq.mockImplementation(() => {
    const chained = { ...query };
    chained.eq = vi.fn().mockReturnValue(chained);
    // delete chain terminal
    Object.defineProperty(chained, 'then', {
      get() {
        return Promise.resolve(resolvedValue).then.bind(Promise.resolve(resolvedValue));
      },
    });
    return chained;
  });

  return query;
}

function makeMockSupabase(queryResult: { data: unknown; error: unknown }, userId = 'user-1') {
  const query = makeMockQuery(queryResult);

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient;

  return { supabase, query };
}

// ── 기본 Book row ──────────────────────────────────────────────────────────

const bookRow = {
  id: 'book-1',
  user_id: 'user-1',
  isbn: '9791234567890',
  title: '테스트 책',
  author: '홍길동',
  publisher: '테스트 출판사',
  cover_url: null,
  total_pages: 300,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const expectedBook = {
  id: 'book-1',
  isbn: '9791234567890',
  title: '테스트 책',
  author: '홍길동',
  publisher: '테스트 출판사',
  coverUrl: undefined,
  totalPages: 300,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RemoteStore', () => {
  describe('인증', () => {
    it('세션이 없으면 UNAUTHORIZED 에러를 throw한다', async () => {
      const supabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
        from: vi.fn(),
      } as unknown as SupabaseClient;

      const store = new RemoteStore(supabase);
      await expect(store.listBooks()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('listBooks', () => {
    it('책 목록을 반환한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: [bookRow], error: null });
      // order()의 반환이 직접 resolved value를 반환하도록 설정
      query.order.mockResolvedValue({ data: [bookRow], error: null });

      const store = new RemoteStore(supabase);
      const books = await store.listBooks();
      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject(expectedBook);
    });

    it('Supabase 에러 발생 시 UPSTREAM_FAILED를 throw한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: null, error: { message: 'DB error' } });
      query.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const store = new RemoteStore(supabase);
      await expect(store.listBooks()).rejects.toMatchObject({ code: 'UPSTREAM_FAILED' });
    });
  });

  describe('getBook', () => {
    it('단일 책을 반환한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: bookRow, error: null });
      query.maybeSingle.mockResolvedValue({ data: bookRow, error: null });

      const store = new RemoteStore(supabase);
      const book = await store.getBook('book-1');
      expect(book).toMatchObject(expectedBook);
    });

    it('없는 책이면 null을 반환한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: null, error: null });
      query.maybeSingle.mockResolvedValue({ data: null, error: null });

      const store = new RemoteStore(supabase);
      const book = await store.getBook('no-such-id');
      expect(book).toBeNull();
    });
  });

  describe('addBook', () => {
    it('유효한 입력으로 책을 추가한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: bookRow, error: null });
      query.single.mockResolvedValue({ data: bookRow, error: null });

      const store = new RemoteStore(supabase);
      const book = await store.addBook({
        isbn: '9791234567890',
        title: '테스트 책',
        author: '홍길동',
        publisher: '테스트 출판사',
        totalPages: 300,
      });
      expect(book).toMatchObject(expectedBook);
    });

    it('제목이 없으면 VALIDATION_FAILED를 throw한다', async () => {
      const { supabase } = makeMockSupabase({ data: null, error: null });
      const store = new RemoteStore(supabase);

      await expect(store.addBook({ title: '' })).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });

    it('중복 ISBN이면 DUPLICATE_ISBN을 throw한다', async () => {
      const { supabase, query } = makeMockSupabase({
        data: null,
        error: { message: 'duplicate', code: '23505' },
      });
      query.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate', code: '23505' },
      });

      const store = new RemoteStore(supabase);
      await expect(
        store.addBook({ title: '중복 책', isbn: '9791234567890' }),
      ).rejects.toMatchObject({ code: 'DUPLICATE_ISBN' });
    });
  });

  describe('deleteBook', () => {
    it('cascade로 책을 삭제한다 (에러 없음)', async () => {
      const supabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const store = new RemoteStore(supabase);
      await expect(store.deleteBook('book-1')).resolves.toBeUndefined();
    });
  });

  describe('listReadingSessions', () => {
    const sessionRow = {
      id: 'session-1',
      book_id: 'book-1',
      read_date: '2024-01-15',
      start_page: 10,
      end_page: 50,
      duration_minutes: 60,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };

    it('세션 목록을 반환한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: [sessionRow], error: null });
      query.order.mockResolvedValue({ data: [sessionRow], error: null });

      const store = new RemoteStore(supabase);
      const sessions = await store.listReadingSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        id: 'session-1',
        bookId: 'book-1',
        readDate: '2024-01-15',
        startPage: 10,
        endPage: 50,
        durationMinutes: 60,
      });
    });
  });

  describe('addReadingSession', () => {
    const sessionRow = {
      id: 'session-1',
      book_id: 'book-1',
      read_date: '2024-01-15',
      start_page: null,
      end_page: null,
      duration_minutes: null,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };

    it('유효한 입력으로 세션을 추가한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: sessionRow, error: null });
      query.single.mockResolvedValue({ data: sessionRow, error: null });

      const store = new RemoteStore(supabase);
      const session = await store.addReadingSession({
        bookId: 'book-1',
        readDate: '2024-01-15',
      });
      expect(session.bookId).toBe('book-1');
    });

    it('미래 날짜면 VALIDATION_FAILED를 throw한다', async () => {
      const { supabase } = makeMockSupabase({ data: null, error: null });
      const store = new RemoteStore(supabase);

      await expect(
        store.addReadingSession({ bookId: 'book-1', readDate: '2099-12-31' }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('listDiaryEntries', () => {
    const entryRow = {
      id: 'entry-1',
      book_id: 'book-1',
      entry_type: 'quote' as const,
      body: '좋은 문장',
      page: 42,
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z',
    };

    it('다이어리 목록을 반환한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: [entryRow], error: null });
      query.order.mockResolvedValue({ data: [entryRow], error: null });

      const store = new RemoteStore(supabase);
      const entries = await store.listDiaryEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        id: 'entry-1',
        bookId: 'book-1',
        entryType: 'quote',
        body: '좋은 문장',
        page: 42,
      });
    });
  });

  describe('addDiaryEntry', () => {
    const entryRow = {
      id: 'entry-1',
      book_id: null,
      entry_type: 'review' as const,
      body: '좋은 책이었다',
      page: null,
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z',
    };

    it('유효한 입력으로 다이어리를 추가한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: entryRow, error: null });
      query.single.mockResolvedValue({ data: entryRow, error: null });

      const store = new RemoteStore(supabase);
      const entry = await store.addDiaryEntry({ entryType: 'review', body: '좋은 책이었다' });
      expect(entry.entryType).toBe('review');
      expect(entry.body).toBe('좋은 책이었다');
    });

    it('빈 body면 VALIDATION_FAILED를 throw한다', async () => {
      const { supabase } = makeMockSupabase({ data: null, error: null });
      const store = new RemoteStore(supabase);

      await expect(
        store.addDiaryEntry({ entryType: 'review', body: '' }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('updateBook', () => {
    it('없는 책이면 NOT_FOUND를 throw한다', async () => {
      const { supabase, query } = makeMockSupabase({ data: null, error: null });
      query.maybeSingle.mockResolvedValue({ data: null, error: null });

      const store = new RemoteStore(supabase);
      await expect(store.updateBook('no-such-id', { title: '새 제목' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('AppError 타입', () => {
    it('UNAUTHORIZED 에러는 AppError 인스턴스다', async () => {
      const supabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
        from: vi.fn(),
      } as unknown as SupabaseClient;

      const store = new RemoteStore(supabase);
      try {
        await store.listBooks();
        expect.fail('에러가 throw되어야 한다');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        if (err instanceof AppError) {
          expect(err.code).toBe('UNAUTHORIZED');
        }
      }
    });
  });
});