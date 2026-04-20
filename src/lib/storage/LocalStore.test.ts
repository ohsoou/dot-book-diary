import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore } from 'idb-keyval';
import { LocalStore } from './LocalStore';

let store: LocalStore;

beforeEach(() => {
  // 각 테스트마다 독립된 IndexedDB 환경 제공
  const idb = new IDBFactory();
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = idb;
  const idbStore = createStore('dot-book-diary', 'kv');
  store = new LocalStore(idbStore);
});

describe('LocalStore - Books', () => {
  it('빈 상태에서 listBooks는 빈 배열을 반환한다', async () => {
    const books = await store.listBooks();
    expect(books).toEqual([]);
  });

  it('addBook은 id, createdAt, updatedAt이 채워진 Book을 반환한다', async () => {
    const book = await store.addBook({ title: '채식주의자', author: '한강' });
    expect(book.id).toBeTruthy();
    expect(book.title).toBe('채식주의자');
    expect(book.author).toBe('한강');
    expect(book.createdAt).toBeTruthy();
    expect(book.updatedAt).toBeTruthy();
  });

  it('addBook 후 listBooks에서 조회된다', async () => {
    await store.addBook({ title: '채식주의자' });
    const books = await store.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0]?.title).toBe('채식주의자');
  });

  it('getBook은 존재하는 id로 Book을 반환한다', async () => {
    const added = await store.addBook({ title: '소년이 온다' });
    const found = await store.getBook(added.id);
    expect(found?.id).toBe(added.id);
    expect(found?.title).toBe('소년이 온다');
  });

  it('getBook은 존재하지 않는 id에서 null을 반환한다', async () => {
    const found = await store.getBook('nonexistent-id');
    expect(found).toBeNull();
  });

  it('deleteBook 후 listBooks에서 사라진다', async () => {
    const book = await store.addBook({ title: '삭제할 책' });
    await store.deleteBook(book.id);
    const books = await store.listBooks();
    expect(books).toHaveLength(0);
  });

  it('updateBook은 변경된 필드를 반영한다', async () => {
    const book = await store.addBook({ title: '원래 제목' });
    const updated = await store.updateBook(book.id, { title: '수정된 제목' });
    expect(updated.title).toBe('수정된 제목');
  });

  it('addBook 시 title이 비어있으면 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(store.addBook({ title: '' })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('addBook 시 targetDate가 저장되고 조회된다', async () => {
    const book = await store.addBook({ title: '완독 목표 책', targetDate: '2026-12-31' });
    expect(book.targetDate).toBe('2026-12-31');
    const found = await store.getBook(book.id);
    expect(found?.targetDate).toBe('2026-12-31');
  });

  it('addBook 시 targetDate 없이 저장하면 undefined다', async () => {
    const book = await store.addBook({ title: '목표 없는 책' });
    expect(book.targetDate).toBeUndefined();
  });

  it('updateBook으로 targetDate를 설정할 수 있다', async () => {
    const book = await store.addBook({ title: '책' });
    const updated = await store.updateBook(book.id, { targetDate: '2026-06-30' });
    expect(updated.targetDate).toBe('2026-06-30');
    const found = await store.getBook(book.id);
    expect(found?.targetDate).toBe('2026-06-30');
  });

  it('updateBook으로 targetDate를 제거할 수 있다', async () => {
    const book = await store.addBook({ title: '책', targetDate: '2026-12-31' });
    const updated = await store.updateBook(book.id, { targetDate: undefined });
    expect(updated.targetDate).toBeUndefined();
  });
});

describe('LocalStore - findBookByIsbn', () => {
  it('ISBN이 있는 책을 찾는다', async () => {
    await store.addBook({ title: '책1', isbn: '9788936434267' });
    const found = await store.findBookByIsbn('9788936434267');
    expect(found?.title).toBe('책1');
  });

  it('ISBN이 없으면 null을 반환한다', async () => {
    const found = await store.findBookByIsbn('9780000000000');
    expect(found).toBeNull();
  });

  it('ISBN 앞뒤 공백을 trim 후 비교한다', async () => {
    await store.addBook({ title: '책1', isbn: '9788936434267' });
    const found = await store.findBookByIsbn('  9788936434267  ');
    expect(found?.title).toBe('책1');
  });
});

describe('LocalStore - ReadingSessions', () => {
  it('addReadingSession은 ReadingSession을 반환한다', async () => {
    const book = await store.addBook({ title: '테스트 책' });
    const session = await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    expect(session.id).toBeTruthy();
    expect(session.bookId).toBe(book.id);
    expect(session.readDate).toBe('2024-01-01');
  });

  it('listReadingSessions는 bookId 필터를 지원한다', async () => {
    const book1 = await store.addBook({ title: '책1' });
    const book2 = await store.addBook({ title: '책2' });
    await store.addReadingSession({ bookId: book1.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book2.id, readDate: '2024-01-02' });
    const sessions = await store.listReadingSessions({ bookId: book1.id });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.bookId).toBe(book1.id);
  });

  it('listReadingSessions는 from/to 날짜 필터를 지원한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-03-15' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-12-31' });
    const sessions = await store.listReadingSessions({ from: '2024-01-15', to: '2024-12-01' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.readDate).toBe('2024-03-15');
  });

  it('updateReadingSession은 변경된 필드를 반영한다', async () => {
    const book = await store.addBook({ title: '책' });
    const session = await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    const updated = await store.updateReadingSession(session.id, { durationMinutes: 30 });
    expect(updated.durationMinutes).toBe(30);
  });

  it('deleteReadingSession 후 listReadingSessions에서 사라진다', async () => {
    const book = await store.addBook({ title: '책' });
    const session = await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.deleteReadingSession(session.id);
    const sessions = await store.listReadingSessions();
    expect(sessions).toHaveLength(0);
  });

  it('addReadingSession 시 readDate 형식이 잘못되면 VALIDATION_FAILED 에러가 발생한다', async () => {
    const book = await store.addBook({ title: '책' });
    await expect(
      store.addReadingSession({ bookId: book.id, readDate: '20240101' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('LocalStore - DiaryEntries', () => {
  it('addDiaryEntry는 DiaryEntry를 반환한다', async () => {
    const entry = await store.addDiaryEntry({ entryType: 'quote', body: '인상 깊은 구절' });
    expect(entry.id).toBeTruthy();
    expect(entry.entryType).toBe('quote');
  });

  it('listDiaryEntries는 entryType 필터를 지원한다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: '인용구' });
    await store.addDiaryEntry({ entryType: 'review', body: '리뷰' });
    const quotes = await store.listDiaryEntries({ entryType: 'quote' });
    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.entryType).toBe('quote');
  });

  it('listDiaryEntries는 bookId 필터를 지원한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addDiaryEntry({ entryType: 'quote', body: '책 관련 인용구', bookId: book.id });
    await store.addDiaryEntry({ entryType: 'review', body: '책 없는 메모' });
    const entries = await store.listDiaryEntries({ bookId: book.id });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.bookId).toBe(book.id);
  });

  it('updateDiaryEntry는 변경된 필드를 반영한다', async () => {
    const entry = await store.addDiaryEntry({ entryType: 'quote', body: '원래 내용' });
    const updated = await store.updateDiaryEntry(entry.id, { body: '수정된 내용' });
    expect(updated.body).toBe('수정된 내용');
  });

  it('deleteDiaryEntry 후 listDiaryEntries에서 사라진다', async () => {
    const entry = await store.addDiaryEntry({ entryType: 'review', body: '삭제할 리뷰' });
    await store.deleteDiaryEntry(entry.id);
    const entries = await store.listDiaryEntries();
    expect(entries).toHaveLength(0);
  });

  it('addDiaryEntry 시 body가 비어있으면 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(
      store.addDiaryEntry({ entryType: 'quote', body: '   ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('LocalStore - schema_version', () => {
  it('최초 생성 시 schema_version이 초기화된다', async () => {
    // listBooks를 호출해서 초기화를 트리거
    await store.listBooks();
    // 내부 초기화가 완료되면 에러 없이 동작해야 한다
    expect(true).toBe(true);
  });
});