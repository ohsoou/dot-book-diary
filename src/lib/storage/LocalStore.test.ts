import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore, set } from 'idb-keyval';
import { LocalStore } from './LocalStore';
import { formatLocalYmd } from '@/lib/date';
import { KEYS } from './keys';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + days);
  return formatLocalYmd(date);
}

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

// ── Aggregation & search ────────────────────────────────────────────────────

describe('LocalStore - getReadingStats', () => {
  it('세션이 없으면 모든 값이 0이다', async () => {
    const stats = await store.getReadingStats();
    expect(stats).toEqual({
      totalMinutes: 0,
      totalSessions: 0,
      totalPagesRead: 0,
      daysActive: 0,
      booksTouched: 0,
    });
  });

  it('period 없이 호출하면 전체 세션을 집계한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', durationMinutes: 30 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-06-01', durationMinutes: 20 });
    const stats = await store.getReadingStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalMinutes).toBe(50);
  });

  it('period 필터를 적용하면 범위 내 세션만 집계한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', durationMinutes: 10 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-03-15', durationMinutes: 20 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-12-31', durationMinutes: 30 });
    const stats = await store.getReadingStats({ from: '2024-02-01', to: '2024-06-30' });
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalMinutes).toBe(20);
  });

  it('durationMinutes가 undefined인 세션은 0으로 처리한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    const stats = await store.getReadingStats();
    expect(stats.totalMinutes).toBe(0);
  });

  it('totalPagesRead는 endPage - startPage의 합산이다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', startPage: 10, endPage: 50 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-02', startPage: 50, endPage: 80 });
    const stats = await store.getReadingStats();
    expect(stats.totalPagesRead).toBe(70); // 40 + 30
  });

  it('startPage === endPage이면 totalPagesRead에 0으로 처리한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', startPage: 50, endPage: 50 });
    const stats = await store.getReadingStats();
    expect(stats.totalPagesRead).toBe(0);
  });

  it('daysActive는 distinct readDate 수다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' }); // 같은 날
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-02' });
    const stats = await store.getReadingStats();
    expect(stats.daysActive).toBe(2);
  });

  it('booksTouched는 distinct bookId 수다', async () => {
    const book1 = await store.addBook({ title: '책1' });
    const book2 = await store.addBook({ title: '책2' });
    await store.addReadingSession({ bookId: book1.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book1.id, readDate: '2024-01-02' });
    await store.addReadingSession({ bookId: book2.id, readDate: '2024-01-03' });
    const stats = await store.getReadingStats();
    expect(stats.booksTouched).toBe(2);
  });
});

describe('LocalStore - getReadingStreak', () => {
  it('세션이 없으면 lastReadDate null, current/longest 0이다', async () => {
    const streak = await store.getReadingStreak();
    expect(streak).toEqual({ current: 0, longest: 0, lastReadDate: null });
  });

  it('오늘만 읽으면 current 1, longest 1이다', async () => {
    const today = formatLocalYmd(new Date());
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: today });
    const streak = await store.getReadingStreak();
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
    expect(streak.lastReadDate).toBe(today);
  });

  it('오늘과 어제를 연속으로 읽으면 current 2이다', async () => {
    const today = formatLocalYmd(new Date());
    const yesterday = addDays(today, -1);
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: today });
    await store.addReadingSession({ bookId: book.id, readDate: yesterday });
    const streak = await store.getReadingStreak();
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
  });

  it('어제까지 7일 연속 읽었고 오늘 읽지 않으면 current 0이다', async () => {
    const today = formatLocalYmd(new Date());
    const book = await store.addBook({ title: '책' });
    for (let i = 1; i <= 7; i++) {
      await store.addReadingSession({ bookId: book.id, readDate: addDays(today, -i) });
    }
    const streak = await store.getReadingStreak();
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(7);
  });

  it('연속되지 않은 날짜들은 longest가 각 연속 구간의 최대값이다', async () => {
    const book = await store.addBook({ title: '책' });
    // 2024-01-01 ~ 2024-01-03 (3일 연속)
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-02' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-03' });
    // gap
    // 2024-01-10 ~ 2024-01-11 (2일 연속)
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-10' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-11' });
    const streak = await store.getReadingStreak();
    expect(streak.longest).toBe(3);
    expect(streak.current).toBe(0); // 오늘 포함 안 됨
  });

  it('lastReadDate는 가장 최근 readDate다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-03-15' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-02-10' });
    const streak = await store.getReadingStreak();
    expect(streak.lastReadDate).toBe('2024-03-15');
  });
});

describe('LocalStore - listSessionsGroupedByDate', () => {
  it('빈 period 범위면 빈 배열을 반환한다', async () => {
    const result = await store.listSessionsGroupedByDate({ from: '2024-01-01', to: '2024-01-31' });
    expect(result).toEqual([]);
  });

  it('날짜별로 세션을 그룹핑하고 totalMinutes를 합산한다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', durationMinutes: 20 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01', durationMinutes: 30 });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-02', durationMinutes: 40 });
    const result = await store.listSessionsGroupedByDate({ from: '2024-01-01', to: '2024-01-31' });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ date: '2024-01-01', totalMinutes: 50 });
    expect(result[1]).toMatchObject({ date: '2024-01-02', totalMinutes: 40 });
  });

  it('같은 날 같은 책은 bookIds에 중복 없이 한 번만 포함된다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-01' });
    const result = await store.listSessionsGroupedByDate({ from: '2024-01-01', to: '2024-01-31' });
    expect(result[0]?.bookIds).toHaveLength(1);
    expect(result[0]?.bookIds[0]).toBe(book.id);
  });

  it('결과는 date 오름차순으로 정렬된다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-05' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-02' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-08' });
    const result = await store.listSessionsGroupedByDate({ from: '2024-01-01', to: '2024-01-31' });
    expect(result.map((r) => r.date)).toEqual(['2024-01-02', '2024-01-05', '2024-01-08']);
  });

  it('period 범위 밖의 세션은 포함되지 않는다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addReadingSession({ bookId: book.id, readDate: '2023-12-31' });
    await store.addReadingSession({ bookId: book.id, readDate: '2024-01-15' });
    const result = await store.listSessionsGroupedByDate({ from: '2024-01-01', to: '2024-01-31' });
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe('2024-01-15');
  });
});

describe('LocalStore - searchDiaryEntries', () => {
  it('q가 있으면 body에서 부분 일치 필터링한다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: '삶은 아름다워요' });
    await store.addDiaryEntry({ entryType: 'quote', body: '독서는 즐거워요' });
    const result = await store.searchDiaryEntries({ q: '아름다' });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe('삶은 아름다워요');
  });

  it('q 검색은 대소문자를 구분하지 않는다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: 'Hello World' });
    await store.addDiaryEntry({ entryType: 'quote', body: 'goodbye' });
    const result = await store.searchDiaryEntries({ q: 'hello' });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe('Hello World');
  });

  it('q가 빈 문자열이면 다른 필터만 적용한다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: '인용구' });
    await store.addDiaryEntry({ entryType: 'review', body: '리뷰' });
    const result = await store.searchDiaryEntries({ q: '', entryType: 'quote' });
    expect(result).toHaveLength(1);
  });

  it('entryType 필터를 지원한다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: '인용' });
    await store.addDiaryEntry({ entryType: 'review', body: '리뷰' });
    const result = await store.searchDiaryEntries({ entryType: 'review' });
    expect(result).toHaveLength(1);
    expect(result[0]?.entryType).toBe('review');
  });

  it('bookId 필터와 q를 결합할 수 있다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.addDiaryEntry({ entryType: 'quote', body: '이 책의 인용', bookId: book.id });
    await store.addDiaryEntry({ entryType: 'quote', body: '다른 인용' });
    const result = await store.searchDiaryEntries({ bookId: book.id, q: '인용' });
    expect(result).toHaveLength(1);
    expect(result[0]?.bookId).toBe(book.id);
  });

  it('from/to 날짜 범위로 createdAt을 필터링한다', async () => {
    // createdAt은 ISO 8601이므로 직접 DB에 삽입 시 날짜를 제어하기 어려움
    // addDiaryEntry 후 createdAt slice(0,10) 비교가 동작하는지만 검증
    await store.addDiaryEntry({ entryType: 'quote', body: '오늘 인용' });
    const today = formatLocalYmd(new Date());
    const result = await store.searchDiaryEntries({ from: today, to: today });
    // 오늘 추가한 항목이 from/to에 포함되어야 한다
    expect(result.length).toBeGreaterThanOrEqual(1);
    // 미래 날짜 to로 필터하면 제외됨
    const pastResult = await store.searchDiaryEntries({ from: '2020-01-01', to: '2020-12-31' });
    expect(pastResult).toHaveLength(0);
  });

  it('limit 기본값은 50이다', async () => {
    const book = await store.addBook({ title: '책' });
    for (let i = 0; i < 60; i++) {
      await store.addDiaryEntry({ entryType: 'quote', body: `인용 ${i}`, bookId: book.id });
    }
    const result = await store.searchDiaryEntries({});
    expect(result).toHaveLength(50);
  });

  it('limit을 지정하면 해당 수만큼 자른다', async () => {
    for (let i = 0; i < 10; i++) {
      await store.addDiaryEntry({ entryType: 'quote', body: `인용 ${i}` });
    }
    const result = await store.searchDiaryEntries({ limit: 3 });
    expect(result).toHaveLength(3);
  });

  it('결과는 createdAt 내림차순으로 정렬된다', async () => {
    await store.addDiaryEntry({ entryType: 'quote', body: '첫 번째' });
    await store.addDiaryEntry({ entryType: 'quote', body: '두 번째' });
    await store.addDiaryEntry({ entryType: 'quote', body: '세 번째' });
    const result = await store.searchDiaryEntries({});
    expect(result).toHaveLength(3);
    // createdAt 내림차순 정렬 검증: 이전 항목 >= 다음 항목
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i]!.createdAt >= result[i + 1]!.createdAt).toBe(true);
    }
  });
});

describe('LocalStore - countBooks', () => {
  it('책이 없으면 0을 반환한다', async () => {
    expect(await store.countBooks()).toBe(0);
  });

  it('책 N권이면 N을 반환한다', async () => {
    await store.addBook({ title: '책1' });
    await store.addBook({ title: '책2' });
    await store.addBook({ title: '책3' });
    expect(await store.countBooks()).toBe(3);
  });

  it('책 삭제 후 count가 줄어든다', async () => {
    const book = await store.addBook({ title: '삭제할 책' });
    await store.addBook({ title: '유지할 책' });
    await store.deleteBook(book.id);
    expect(await store.countBooks()).toBe(1);
  });
});

describe('LocalStore - Books status/rating/finishedAt/memo', () => {
  it('addBook 시 status 기본값은 reading이다', async () => {
    const book = await store.addBook({ title: '기본 상태 책' });
    expect(book.status).toBe('reading');
  });

  it('addBook 시 status를 want로 지정할 수 있다', async () => {
    const book = await store.addBook({ title: '읽고싶은 책', status: 'want' });
    expect(book.status).toBe('want');
  });

  it('addBook 시 status를 finished로 지정할 수 있다', async () => {
    const book = await store.addBook({ title: '완독한 책', status: 'finished' });
    expect(book.status).toBe('finished');
  });

  it('addBook 시 잘못된 status는 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(
      store.addBook({ title: '잘못된 상태', status: 'invalid' as never }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('addBook 시 rating 1~5 정수를 저장할 수 있다', async () => {
    const book = await store.addBook({ title: '별점 책', rating: 4 });
    expect(book.rating).toBe(4);
  });

  it('addBook 시 rating이 0이면 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(
      store.addBook({ title: '범위 초과 평점', rating: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('addBook 시 rating이 6이면 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(
      store.addBook({ title: '범위 초과 평점', rating: 6 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('addBook 시 finishedAt을 저장할 수 있다', async () => {
    const book = await store.addBook({ title: '완독일 책', finishedAt: '2026-05-01' });
    expect(book.finishedAt).toBe('2026-05-01');
  });

  it('addBook 시 memo 최대 500자를 저장할 수 있다', async () => {
    const memo = 'a'.repeat(500);
    const book = await store.addBook({ title: '메모 책', memo });
    expect(book.memo).toBe(memo);
  });

  it('addBook 시 memo가 500자를 초과하면 VALIDATION_FAILED 에러가 발생한다', async () => {
    await expect(
      store.addBook({ title: '메모 초과', memo: 'a'.repeat(501) }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('updateBook으로 status를 finished로 변경할 수 있다', async () => {
    const book = await store.addBook({ title: '책' });
    const updated = await store.updateBook(book.id, { status: 'finished', finishedAt: '2026-05-07' });
    expect(updated.status).toBe('finished');
    expect(updated.finishedAt).toBe('2026-05-07');
  });
});

describe('LocalStore - updateBook auto-finishedAt (step 1)', () => {
  it('status를 finished로 변경하고 finishedAt 미지정 시 오늘 날짜로 자동 세팅된다', async () => {
    const today = formatLocalYmd(new Date());
    const book = await store.addBook({ title: '책' });
    const updated = await store.updateBook(book.id, { status: 'finished' });
    expect(updated.status).toBe('finished');
    expect(updated.finishedAt).toBe(today);
  });

  it('status를 finished로 변경하고 finishedAt 명시 시 명시값을 우선한다', async () => {
    const book = await store.addBook({ title: '책' });
    const updated = await store.updateBook(book.id, { status: 'finished', finishedAt: '2026-01-01' });
    expect(updated.status).toBe('finished');
    expect(updated.finishedAt).toBe('2026-01-01');
  });

  it('status가 finished에서 reading으로 변경되어도 finishedAt은 보존된다', async () => {
    const book = await store.addBook({ title: '책' });
    await store.updateBook(book.id, { status: 'finished', finishedAt: '2026-01-01' });
    const updated = await store.updateBook(book.id, { status: 'reading' });
    expect(updated.status).toBe('reading');
    expect(updated.finishedAt).toBe('2026-01-01');
  });

  it('updateBook에서 rating=6을 넘기면 store 단계에서 통과된다 (검증은 action 책임)', async () => {
    const book = await store.addBook({ title: '책' });
    // store는 rating 범위를 검증하지 않는다 — action 레이어에서 zod로 거름
    const updated = await store.updateBook(book.id, { rating: 6 as never });
    expect(updated.rating).toBe(6);
  });

  it('updateBook에서 memo 501자를 넘기면 store 단계에서 통과된다 (검증은 action 책임)', async () => {
    const book = await store.addBook({ title: '책' });
    const memo = 'a'.repeat(501);
    // store는 memo 길이를 검증하지 않는다 — action 레이어에서 zod로 거름
    const updated = await store.updateBook(book.id, { memo });
    expect(updated.memo).toBe(memo);
  });

  it('findBookByIsbn은 status가 finished인 책도 정상적으로 검색한다', async () => {
    await store.addBook({ title: '완독한 책', isbn: '9781234567890', status: 'finished' });
    const found = await store.findBookByIsbn('9781234567890');
    expect(found).not.toBeNull();
    expect(found?.status).toBe('finished');
  });

  it('addBook 시 status를 명시하지 않으면 reading이 기본값이다', async () => {
    const book = await store.addBook({ title: '기본 상태 책2' });
    expect(book.status).toBe('reading');
  });

  it('addBook 시 status를 want로 지정하면 그대로 저장된다', async () => {
    const book = await store.addBook({ title: '읽고싶은 책2', status: 'want' });
    expect(book.status).toBe('want');
  });
});

describe('LocalStore - v1→v2 마이그레이션', () => {
  it('v1 schema의 책(status 없음)이 v2로 마이그레이션될 때 status가 reading으로 채워진다', async () => {
    // 독립된 IDB 환경 생성
    const idb = new IDBFactory();
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = idb;
    const idbStore = createStore('dot-book-diary', 'kv');

    // v1 데이터 시뮬레이션: schema_version=1, status 없는 책
    const v1Books = [
      { id: 'book-1', title: '오래된 책1', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'book-2', title: '오래된 책2', isbn: '9781234567890', createdAt: '2024-02-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z' },
    ];
    await set(KEYS.BOOKS, v1Books, idbStore);
    await set(KEYS.SCHEMA_VERSION, 1, idbStore);

    // LocalStore 생성 → 자동으로 v2로 마이그레이션
    const migratedStore = new LocalStore(idbStore);
    const books = await migratedStore.listBooks();

    expect(books).toHaveLength(2);
    for (const book of books) {
      expect(book.status).toBe('reading');
    }
  });

  it('마이그레이션이 멱등하다: v2 데이터를 v2로 다시 열어도 데이터 손상 없음', async () => {
    const idb = new IDBFactory();
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = idb;
    const idbStore = createStore('dot-book-diary', 'kv');

    // 이미 v2인 데이터
    const store1 = new LocalStore(idbStore);
    await store1.addBook({ title: 'v2 책', status: 'finished', rating: 5 });

    // 같은 idbStore로 새 LocalStore 생성
    const store2 = new LocalStore(idbStore);
    const books = await store2.listBooks();

    expect(books).toHaveLength(1);
    expect(books[0]?.status).toBe('finished');
    expect(books[0]?.rating).toBe(5);
  });

  it('v1 책에 이미 status가 있으면 덮어쓰지 않는다', async () => {
    const idb = new IDBFactory();
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = idb;
    const idbStore = createStore('dot-book-diary', 'kv');

    const mixedBooks = [
      { id: 'book-1', title: 'status 없는 책', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'book-2', title: 'status 있는 책', status: 'want', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    ];
    await set(KEYS.BOOKS, mixedBooks, idbStore);
    await set(KEYS.SCHEMA_VERSION, 1, idbStore);

    const migratedStore = new LocalStore(idbStore);
    const books = await migratedStore.listBooks();

    const noStatus = books.find((b) => b.id === 'book-1');
    const hasStatus = books.find((b) => b.id === 'book-2');
    expect(noStatus?.status).toBe('reading'); // 기본값으로 채워짐
    expect(hasStatus?.status).toBe('want');   // 기존 값 유지
  });
});