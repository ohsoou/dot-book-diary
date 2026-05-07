import { get, set, createStore, type UseStore } from 'idb-keyval';
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
import { KEYS, CURRENT_SCHEMA_VERSION } from './keys';
import { bookSchema, readingSessionSchema, diaryEntrySchema } from '@/lib/validation';
import { AppError } from '@/lib/errors';
import { formatLocalYmd } from '@/lib/date';

/** YYYY-MM-DD → days since Unix epoch (UTC, DST-safe) */
function daysSince(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86400000);
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function defaultIdbStore(): UseStore {
  return createStore('dot-book-diary', 'kv');
}

export class LocalStore implements Store {
  private idbStore: UseStore;
  private initPromise: Promise<void> | null = null;

  constructor(idbStore?: UseStore) {
    this.idbStore = idbStore ?? defaultIdbStore();
  }

  private async runMigrations(storedVersion: number): Promise<void> {
    if (storedVersion < 2) {
      // v1 → v2: Book에 status 필드 추가. 기존 책은 'reading'으로 채운다.
      type LegacyBook = Book & { status?: Book['status'] };
      const books = (await get<LegacyBook[]>(KEYS.BOOKS, this.idbStore)) ?? [];
      const migrated: Book[] = books.map((b) => ({ ...b, status: b.status ?? 'reading' }));
      await set(KEYS.BOOKS, migrated, this.idbStore);
    }
    await set(KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION, this.idbStore);
  }

  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const storedVersion = await get<number>(KEYS.SCHEMA_VERSION, this.idbStore);
        if (storedVersion == null) {
          await set(KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION, this.idbStore);
        } else if (storedVersion < CURRENT_SCHEMA_VERSION) {
          await this.runMigrations(storedVersion);
        }
      })();
    }
    return this.initPromise;
  }

  // ── Books ──────────────────────────────────────────────────────────────────

  async listBooks(): Promise<Book[]> {
    await this.init();
    return (await get<Book[]>(KEYS.BOOKS, this.idbStore)) ?? [];
  }

  async getBook(id: string): Promise<Book | null> {
    const books = await this.listBooks();
    return books.find((b) => b.id === id) ?? null;
  }

  async findBookByIsbn(isbn: string): Promise<Book | null> {
    const normalized = isbn.trim();
    const books = await this.listBooks();
    return books.find((b) => b.isbn?.trim() === normalized) ?? null;
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

    const ts = now();
    const book: Book = { id: uuid(), createdAt: ts, updatedAt: ts, ...parsed.data };
    const books = await this.listBooks();
    await set(KEYS.BOOKS, [...books, book], this.idbStore);
    return book;
  }

  async updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Book> {
    const books = await this.listBooks();
    const idx = books.findIndex((b) => b.id === id);
    if (idx === -1) throw new AppError('NOT_FOUND', `Book ${id} not found`);
    const updated: Book = { ...books[idx]!, ...patch, id, updatedAt: now() };
    const next = [...books];
    next[idx] = updated;
    await set(KEYS.BOOKS, next, this.idbStore);
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    const books = await this.listBooks();
    await set(KEYS.BOOKS, books.filter((b) => b.id !== id), this.idbStore);
  }

  // ── ReadingSessions ────────────────────────────────────────────────────────

  private async listAll(): Promise<ReadingSession[]> {
    await this.init();
    return (await get<ReadingSession[]>(KEYS.READING_SESSIONS, this.idbStore)) ?? [];
  }

  async listReadingSessions(filter?: { bookId?: string; from?: string; to?: string }): Promise<ReadingSession[]> {
    let sessions = await this.listAll();
    if (filter?.bookId) sessions = sessions.filter((s) => s.bookId === filter.bookId);
    if (filter?.from) sessions = sessions.filter((s) => s.readDate >= filter.from!);
    if (filter?.to) sessions = sessions.filter((s) => s.readDate <= filter.to!);
    return sessions;
  }

  async getReadingSession(id: string): Promise<ReadingSession | null> {
    const sessions = await this.listAll();
    return sessions.find((s) => s.id === id) ?? null;
  }

  async addReadingSession(input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReadingSession> {
    const parsed = readingSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다',
        undefined,
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
    }

    const ts = now();
    const session: ReadingSession = { id: uuid(), createdAt: ts, updatedAt: ts, ...parsed.data };
    const sessions = await this.listAll();
    await set(KEYS.READING_SESSIONS, [...sessions, session], this.idbStore);
    return session;
  }

  async updateReadingSession(
    id: string,
    patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ReadingSession> {
    const sessions = await this.listAll();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new AppError('NOT_FOUND', `ReadingSession ${id} not found`);
    const updated: ReadingSession = { ...sessions[idx]!, ...patch, id, updatedAt: now() };
    const next = [...sessions];
    next[idx] = updated;
    await set(KEYS.READING_SESSIONS, next, this.idbStore);
    return updated;
  }

  async deleteReadingSession(id: string): Promise<void> {
    const sessions = await this.listAll();
    await set(KEYS.READING_SESSIONS, sessions.filter((s) => s.id !== id), this.idbStore);
  }

  // ── DiaryEntries ───────────────────────────────────────────────────────────

  private async listAllEntries(): Promise<DiaryEntry[]> {
    await this.init();
    return (await get<DiaryEntry[]>(KEYS.DIARY_ENTRIES, this.idbStore)) ?? [];
  }

  async listDiaryEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<DiaryEntry[]> {
    let entries = await this.listAllEntries();
    if (filter?.bookId) entries = entries.filter((e) => e.bookId === filter.bookId);
    if (filter?.entryType) entries = entries.filter((e) => e.entryType === filter.entryType);
    return entries;
  }

  async getDiaryEntry(id: string): Promise<DiaryEntry | null> {
    const entries = await this.listAllEntries();
    return entries.find((e) => e.id === id) ?? null;
  }

  async addDiaryEntry(input: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiaryEntry> {
    const parsed = diaryEntrySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다',
        undefined,
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
    }

    const ts = now();
    const entry: DiaryEntry = { id: uuid(), createdAt: ts, updatedAt: ts, ...parsed.data };
    const entries = await this.listAllEntries();
    await set(KEYS.DIARY_ENTRIES, [...entries, entry], this.idbStore);
    return entry;
  }

  async updateDiaryEntry(
    id: string,
    patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<DiaryEntry> {
    const entries = await this.listAllEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new AppError('NOT_FOUND', `DiaryEntry ${id} not found`);
    const updated: DiaryEntry = { ...entries[idx]!, ...patch, id, updatedAt: now() };
    const next = [...entries];
    next[idx] = updated;
    await set(KEYS.DIARY_ENTRIES, next, this.idbStore);
    return updated;
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    const entries = await this.listAllEntries();
    await set(KEYS.DIARY_ENTRIES, entries.filter((e) => e.id !== id), this.idbStore);
  }

  // ── Aggregation & search ───────────────────────────────────────────────────

  async getReadingStats(period?: ReadingStatsPeriod): Promise<ReadingStats> {
    const sessions = await this.listReadingSessions(
      period ? { from: period.from, to: period.to } : undefined,
    );

    const dates = new Set<string>();
    const bookIds = new Set<string>();
    let totalMinutes = 0;
    let totalPagesRead = 0;

    for (const s of sessions) {
      totalMinutes += s.durationMinutes ?? 0;
      if (s.startPage !== undefined && s.endPage !== undefined) {
        totalPagesRead += Math.max(0, s.endPage - s.startPage);
      }
      dates.add(s.readDate);
      bookIds.add(s.bookId);
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
    const sessions = await this.listAll();

    if (sessions.length === 0) {
      return { current: 0, longest: 0, lastReadDate: null };
    }

    const dateSet = new Set(sessions.map((s) => s.readDate));
    const sortedDates = Array.from(dateSet).sort();
    const lastReadDate = sortedDates[sortedDates.length - 1] ?? null;

    // Longest streak: find max run of consecutive calendar days
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

    // Current streak: count consecutive days backwards from today (today must be in set)
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
    const sessions = await this.listReadingSessions({ from: period.from, to: period.to });

    const groups = new Map<string, { totalMinutes: number; bookIds: string[] }>();

    for (const s of sessions) {
      if (!groups.has(s.readDate)) {
        groups.set(s.readDate, { totalMinutes: 0, bookIds: [] });
      }
      const g = groups.get(s.readDate)!;
      g.totalMinutes += s.durationMinutes ?? 0;
      if (!g.bookIds.includes(s.bookId)) {
        g.bookIds.push(s.bookId);
      }
    }

    return Array.from(groups.entries())
      .map(([date, g]) => ({ date, totalMinutes: g.totalMinutes, bookIds: g.bookIds }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async searchDiaryEntries(query: DiarySearchQuery): Promise<DiaryEntry[]> {
    // cursor is ignored in LocalStore — data volume is small, cursor-based pagination is not needed
    let entries = await this.listDiaryEntries({
      bookId: query.bookId,
      entryType: query.entryType,
    });

    if (query.q) {
      const q = query.q.toLowerCase();
      entries = entries.filter((e) => e.body.toLowerCase().includes(q));
    }

    if (query.from) {
      const from = query.from;
      entries = entries.filter((e) => e.createdAt.slice(0, 10) >= from);
    }

    if (query.to) {
      const to = query.to;
      entries = entries.filter((e) => e.createdAt.slice(0, 10) <= to);
    }

    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const limit = query.limit ?? 50;
    return entries.slice(0, limit);
  }

  async countBooks(): Promise<number> {
    const books = await this.listBooks();
    return books.length;
  }
}