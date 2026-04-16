import { get, set, createStore, type UseStore } from 'idb-keyval';
import type { Book, ReadingSession, DiaryEntry } from '@/types';
import type { Store } from './Store';
import { KEYS, CURRENT_SCHEMA_VERSION } from './keys';
import { bookSchema, readingSessionSchema, diaryEntrySchema } from '@/lib/validation';
import { AppError } from '@/lib/errors';

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
    if (storedVersion < CURRENT_SCHEMA_VERSION) {
      // 미래 마이그레이션 케이스를 여기에 추가한다.
      // 현재 버전이 1이므로 아직 마이그레이션 로직 없음.
      // switch (storedVersion) {
      //   case 1: // 1 -> 2 마이그레이션 로직
      //     break;
      // }
      await set(KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION, this.idbStore);
    }
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
}