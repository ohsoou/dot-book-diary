import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Book,
  ReadingSession,
  DiaryEntry,
  ReadingStats,
  ReadingStatsPeriod,
  ReadingStreak,
  DiarySearchQuery,
  SessionsByDate,
} from '@/types';
import type { Store } from './Store';
import { AppError } from '@/lib/errors';
import { bookSchema, readingSessionSchema, diaryEntrySchema } from '@/lib/validation';
import { formatLocalYmd } from '@/lib/date';
import { escapeLikePattern } from '@/lib/escape';

/** YYYY-MM-DD → days since Unix epoch (UTC, DST-safe) */
function daysSince(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86400000);
}

/**
 * Supabase Postgres 기반 Store 구현.
 * Server Action / Route Handler에서만 인스턴스화한다.
 * user_id는 내부에서 getUser()로 결정한다 — 외부에서 주입 금지.
 */
export class RemoteStore implements Store {
  constructor(private readonly supabase: SupabaseClient) {}

  private async getUserId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AppError('UNAUTHORIZED', '로그인이 필요합니다');
    }
    return user.id;
  }

  // ── Books ──────────────────────────────────────────────────────────────────

  async listBooks(): Promise<Book[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return (data ?? []).map(rowToBook);
  }

  async getBook(id: string): Promise<Book | null> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return data ? rowToBook(data) : null;
  }

  async findBookByIsbn(isbn: string): Promise<Book | null> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .eq('isbn', isbn.trim())
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return data ? rowToBook(data) : null;
  }

  async addBook(input: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const parsed = bookSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다',
        undefined,
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
    }

    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('books')
      .insert({
        user_id: userId,
        isbn: parsed.data.isbn ?? null,
        title: parsed.data.title,
        author: parsed.data.author ?? null,
        publisher: parsed.data.publisher ?? null,
        cover_url: parsed.data.coverUrl ?? null,
        total_pages: parsed.data.totalPages ?? null,
        target_date: parsed.data.targetDate ?? null,
        status: parsed.data.status,
        rating: parsed.data.rating ?? null,
        finished_at: parsed.data.finishedAt ?? null,
        memo: parsed.data.memo ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('DUPLICATE_ISBN', '이미 동일한 ISBN의 책이 있습니다', error);
      }
      throw new AppError('UPSTREAM_FAILED', error.message, error);
    }
    return rowToBook(data);
  }

  async updateBook(
    id: string,
    patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Book> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('books')
      .update({
        ...(patch.isbn !== undefined && { isbn: patch.isbn }),
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.author !== undefined && { author: patch.author ?? null }),
        ...(patch.publisher !== undefined && { publisher: patch.publisher ?? null }),
        ...(patch.coverUrl !== undefined && { cover_url: patch.coverUrl ?? null }),
        ...(patch.totalPages !== undefined && { total_pages: patch.totalPages ?? null }),
        ...(patch.targetDate !== undefined && { target_date: patch.targetDate ?? null }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.rating !== undefined && { rating: patch.rating ?? null }),
        ...(patch.finishedAt !== undefined && { finished_at: patch.finishedAt ?? null }),
        ...(patch.memo !== undefined && { memo: patch.memo ?? null }),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    if (!data) throw new AppError('NOT_FOUND', `Book ${id} not found`);
    return rowToBook(data);
  }

  async deleteBook(id: string): Promise<void> {
    const userId = await this.getUserId();
    // cascade로 reading_sessions, diary_entries 자동 삭제
    const { error } = await this.supabase
      .from('books')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
  }

  // ── ReadingSessions ────────────────────────────────────────────────────────

  async listReadingSessions(filter?: {
    bookId?: string;
    from?: string;
    to?: string;
  }): Promise<ReadingSession[]> {
    const userId = await this.getUserId();
    let query = this.supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('read_date', { ascending: false });

    if (filter?.bookId) query = query.eq('book_id', filter.bookId);
    if (filter?.from) query = query.gte('read_date', filter.from);
    if (filter?.to) query = query.lte('read_date', filter.to);

    const { data, error } = await query;
    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return (data ?? []).map(rowToReadingSession);
  }

  async getReadingSession(id: string): Promise<ReadingSession | null> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('reading_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return data ? rowToReadingSession(data) : null;
  }

  async addReadingSession(
    input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReadingSession> {
    const parsed = readingSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다',
        undefined,
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
    }

    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('reading_sessions')
      .insert({
        user_id: userId,
        book_id: parsed.data.bookId,
        read_date: parsed.data.readDate,
        start_page: parsed.data.startPage ?? null,
        end_page: parsed.data.endPage ?? null,
        duration_minutes: parsed.data.durationMinutes ?? null,
      })
      .select()
      .single();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return rowToReadingSession(data);
  }

  async updateReadingSession(
    id: string,
    patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ReadingSession> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('reading_sessions')
      .update({
        ...(patch.bookId !== undefined && { book_id: patch.bookId }),
        ...(patch.readDate !== undefined && { read_date: patch.readDate }),
        ...(patch.startPage !== undefined && { start_page: patch.startPage ?? null }),
        ...(patch.endPage !== undefined && { end_page: patch.endPage ?? null }),
        ...(patch.durationMinutes !== undefined && {
          duration_minutes: patch.durationMinutes ?? null,
        }),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    if (!data) throw new AppError('NOT_FOUND', `ReadingSession ${id} not found`);
    return rowToReadingSession(data);
  }

  async deleteReadingSession(id: string): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await this.supabase
      .from('reading_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
  }

  // ── DiaryEntries ───────────────────────────────────────────────────────────

  async listDiaryEntries(filter?: {
    bookId?: string;
    entryType?: DiaryEntry['entryType'];
  }): Promise<DiaryEntry[]> {
    const userId = await this.getUserId();
    let query = this.supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter?.bookId) query = query.eq('book_id', filter.bookId);
    if (filter?.entryType) query = query.eq('entry_type', filter.entryType);

    const { data, error } = await query;
    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return (data ?? []).map(rowToDiaryEntry);
  }

  async getDiaryEntry(id: string): Promise<DiaryEntry | null> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('diary_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return data ? rowToDiaryEntry(data) : null;
  }

  async addDiaryEntry(
    input: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DiaryEntry> {
    const parsed = diaryEntrySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다',
        undefined,
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
    }

    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('diary_entries')
      .insert({
        user_id: userId,
        book_id: parsed.data.bookId ?? null,
        entry_type: parsed.data.entryType,
        body: parsed.data.body,
        page: parsed.data.page ?? null,
      })
      .select()
      .single();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return rowToDiaryEntry(data);
  }

  async updateDiaryEntry(
    id: string,
    patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<DiaryEntry> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('diary_entries')
      .update({
        ...(patch.bookId !== undefined && { book_id: patch.bookId ?? null }),
        ...(patch.entryType !== undefined && { entry_type: patch.entryType }),
        ...(patch.body !== undefined && { body: patch.body }),
        ...(patch.page !== undefined && { page: patch.page ?? null }),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    if (!data) throw new AppError('NOT_FOUND', `DiaryEntry ${id} not found`);
    return rowToDiaryEntry(data);
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await this.supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
  }

  // ── Aggregation & search ───────────────────────────────────────────────────

  async getReadingStats(period?: ReadingStatsPeriod): Promise<ReadingStats> {
    const userId = await this.getUserId();
    let q = this.supabase
      .from('reading_sessions')
      .select('duration_minutes, start_page, end_page, read_date, book_id')
      .eq('user_id', userId);

    if (period) {
      q = q.gte('read_date', period.from).lte('read_date', period.to);
    }

    const { data, error } = await q;
    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);

    const sessions = (data ?? []) as StatsRow[];
    let totalMinutes = 0;
    let totalPagesRead = 0;
    const dates = new Set<string>();
    const bookIds = new Set<string>();

    for (const s of sessions) {
      totalMinutes += s.duration_minutes ?? 0;
      if (s.start_page !== null && s.end_page !== null) {
        totalPagesRead += Math.max(0, s.end_page - s.start_page);
      }
      dates.add(s.read_date);
      bookIds.add(s.book_id);
    }

    return {
      totalMinutes,
      totalSessions: sessions.length,
      totalPagesRead,
      daysActive: dates.size,
      booksTouched: bookIds.size,
    };
  }

  async getReadingStreak(): Promise<ReadingStreak> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('reading_sessions')
      .select('read_date')
      .eq('user_id', userId)
      .order('read_date', { ascending: false });

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);

    const rows = (data ?? []) as StreakRow[];

    if (rows.length === 0) {
      return { current: 0, longest: 0, lastReadDate: null };
    }

    const dateSet = new Set(rows.map((r) => r.read_date));
    const sortedDates = Array.from(dateSet).sort();
    const lastReadDate = sortedDates[sortedDates.length - 1] ?? null;

    let longest = 1;
    let run = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      if (daysSince(sortedDates[i]!) - daysSince(sortedDates[i - 1]!) === 1) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
    }

    const today = formatLocalYmd(new Date());
    let current = 0;
    if (dateSet.has(today)) {
      current = 1;
      const cursor = new Date();
      while (true) {
        cursor.setDate(cursor.getDate() - 1);
        if (!dateSet.has(formatLocalYmd(cursor))) break;
        current++;
      }
    }

    return { current, longest, lastReadDate };
  }

  async listSessionsGroupedByDate(period: ReadingStatsPeriod): Promise<SessionsByDate[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase
      .from('reading_sessions')
      .select('read_date, duration_minutes, book_id')
      .eq('user_id', userId)
      .gte('read_date', period.from)
      .lte('read_date', period.to)
      .order('read_date', { ascending: true });

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);

    const rows = (data ?? []) as GroupRow[];
    const groups = new Map<string, { totalMinutes: number; bookIds: string[] }>();

    for (const s of rows) {
      if (!groups.has(s.read_date)) {
        groups.set(s.read_date, { totalMinutes: 0, bookIds: [] });
      }
      const g = groups.get(s.read_date)!;
      g.totalMinutes += s.duration_minutes ?? 0;
      if (!g.bookIds.includes(s.book_id)) {
        g.bookIds.push(s.book_id);
      }
    }

    return Array.from(groups.entries())
      .map(([date, g]) => ({ date, totalMinutes: g.totalMinutes, bookIds: g.bookIds }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async searchDiaryEntries(query: DiarySearchQuery): Promise<DiaryEntry[]> {
    const userId = await this.getUserId();

    let q = this.supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(query.limit ?? 50);

    if (query.q) q = q.ilike('body', `%${escapeLikePattern(query.q)}%`);
    if (query.bookId) q = q.eq('book_id', query.bookId);
    if (query.entryType) q = q.eq('entry_type', query.entryType);
    if (query.from) q = q.gte('created_at', `${query.from}T00:00:00`);
    if (query.to) q = q.lte('created_at', `${query.to}T23:59:59`);

    const { data, error } = await q;
    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return (data ?? []).map(rowToDiaryEntry);
  }

  async countBooks(): Promise<number> {
    const userId = await this.getUserId();
    const { count, error } = await this.supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new AppError('UPSTREAM_FAILED', error.message, error);
    return count ?? 0;
  }
}

// ── Row 매핑 헬퍼 ────────────────────────────────────────────────────────────

type StatsRow = {
  duration_minutes: number | null;
  start_page: number | null;
  end_page: number | null;
  read_date: string;
  book_id: string;
};

type StreakRow = {
  read_date: string;
};

type GroupRow = {
  read_date: string;
  duration_minutes: number | null;
  book_id: string;
};

type BookRow = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_url: string | null;
  total_pages: number | null;
  target_date: string | null;
  status: string;
  rating: number | null;
  finished_at: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn: row.isbn ?? undefined,
    title: row.title,
    author: row.author ?? undefined,
    publisher: row.publisher ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    totalPages: row.total_pages ?? undefined,
    targetDate: row.target_date ?? undefined,
    status: (row.status as Book['status']) ?? 'reading',
    rating: row.rating ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    memo: row.memo ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ReadingSessionRow = {
  id: string;
  book_id: string;
  read_date: string;
  start_page: number | null;
  end_page: number | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

function rowToReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    bookId: row.book_id,
    readDate: row.read_date,
    startPage: row.start_page ?? undefined,
    endPage: row.end_page ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type DiaryEntryRow = {
  id: string;
  book_id: string | null;
  entry_type: 'quote' | 'review';
  body: string;
  page: number | null;
  created_at: string;
  updated_at: string;
};

function rowToDiaryEntry(row: DiaryEntryRow): DiaryEntry {
  return {
    id: row.id,
    bookId: row.book_id ?? undefined,
    entryType: row.entry_type,
    body: row.body,
    page: row.page ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}