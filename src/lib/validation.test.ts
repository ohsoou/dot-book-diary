import { describe, it, expect } from 'vitest';
import {
  bookSchema,
  readingSessionSchema,
  readingSessionWithTotalPagesSchema,
  diaryEntrySchema,
  searchQuerySchema,
  profileSchema,
  themePreferenceSchema,
  toValidationError,
  parseOrThrow,
} from './validation';
import { AppError } from './errors';

// readDate 비교를 위해 오늘 날짜를 고정
const TODAY = '2026-04-16';

describe('bookSchema', () => {
  it('should accept a minimal valid book (title only)', () => {
    const result = bookSchema.safeParse({ title: '채식주의자' });
    expect(result.success).toBe(true);
  });

  it('should accept a fully filled book', () => {
    const result = bookSchema.safeParse({
      isbn: '9788936434120',
      title: '채식주의자',
      author: '한강',
      publisher: '창비',
      coverUrl: 'https://image.aladin.co.kr/product/cover.jpg',
      totalPages: 247,
    });
    expect(result.success).toBe(true);
  });

  it('should reject an empty title', () => {
    const result = bookSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('should reject totalPages less than 1', () => {
    const result = bookSchema.safeParse({ title: '책', totalPages: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept a valid targetDate in YYYY-MM-DD format', () => {
    const result = bookSchema.safeParse({ title: '책', targetDate: '2026-12-31' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.targetDate).toBe('2026-12-31');
  });

  it('should accept a book without targetDate (optional)', () => {
    const result = bookSchema.safeParse({ title: '책' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.targetDate).toBeUndefined();
  });

  it('should reject an invalid targetDate format', () => {
    const result = bookSchema.safeParse({ title: '책', targetDate: '2026/12/31' });
    expect(result.success).toBe(false);
  });

  it('should reject a targetDate with wrong length', () => {
    const result = bookSchema.safeParse({ title: '책', targetDate: '26-12-31' });
    expect(result.success).toBe(false);
  });
});

describe('themePreferenceSchema', () => {
  it('should accept "system"', () => {
    const result = themePreferenceSchema.safeParse('system');
    expect(result.success).toBe(true);
  });

  it('should accept "day"', () => {
    const result = themePreferenceSchema.safeParse('day');
    expect(result.success).toBe(true);
  });

  it('should accept "night"', () => {
    const result = themePreferenceSchema.safeParse('night');
    expect(result.success).toBe(true);
  });

  it('should reject an invalid value', () => {
    const result = themePreferenceSchema.safeParse('dark');
    expect(result.success).toBe(false);
  });

  it('should reject an empty string', () => {
    const result = themePreferenceSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('readingSessionSchema', () => {
  it('should accept a valid reading session', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
      startPage: 10,
      endPage: 50,
      durationMinutes: 30,
    });
    expect(result.success).toBe(true);
  });

  it('should accept a session without optional fields', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
    });
    expect(result.success).toBe(true);
  });

  it('should reject a future readDate', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: '2099-12-31',
    });
    expect(result.success).toBe(false);
  });

  it('should reject endPage < startPage', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
      startPage: 50,
      endPage: 10,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative startPage', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
      startPage: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid readDate format', () => {
    const result = readingSessionSchema.safeParse({
      bookId: 'book-123',
      readDate: '2026/04/16',
    });
    expect(result.success).toBe(false);
  });
});

describe('readingSessionWithTotalPagesSchema', () => {
  it('should reject endPage > totalPages', () => {
    const schema = readingSessionWithTotalPagesSchema(100);
    const result = schema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
      startPage: 50,
      endPage: 150,
    });
    expect(result.success).toBe(false);
  });

  it('should accept endPage === totalPages', () => {
    const schema = readingSessionWithTotalPagesSchema(100);
    const result = schema.safeParse({
      bookId: 'book-123',
      readDate: TODAY,
      startPage: 50,
      endPage: 100,
    });
    expect(result.success).toBe(true);
  });
});

describe('diaryEntrySchema', () => {
  it('should accept a valid quote entry', () => {
    const result = diaryEntrySchema.safeParse({
      entryType: 'quote',
      body: '나는 채식주의자가 되기로 했다.',
    });
    expect(result.success).toBe(true);
  });

  it('should accept a review with all optional fields', () => {
    const result = diaryEntrySchema.safeParse({
      bookId: 'book-123',
      entryType: 'review',
      body: '정말 인상적인 소설이었다.',
      page: 150,
    });
    expect(result.success).toBe(true);
  });

  it('should reject an empty body', () => {
    const result = diaryEntrySchema.safeParse({ entryType: 'quote', body: '' });
    expect(result.success).toBe(false);
  });

  it('should reject whitespace-only body', () => {
    const result = diaryEntrySchema.safeParse({ entryType: 'review', body: '   ' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid entryType', () => {
    const result = diaryEntrySchema.safeParse({ entryType: 'memo', body: '내용' });
    expect(result.success).toBe(false);
  });

  it('should reject body exceeding 5000 chars', () => {
    const result = diaryEntrySchema.safeParse({
      entryType: 'review',
      body: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('should accept a valid query', () => {
    const result = searchQuerySchema.safeParse({ q: '채식주의자' });
    expect(result.success).toBe(true);
  });

  it('should reject an empty query', () => {
    const result = searchQuerySchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('should accept a valid nickname', () => {
    const result = profileSchema.safeParse({ nickname: '독서하는 곰' });
    expect(result.success).toBe(true);
  });

  it('should reject an empty nickname', () => {
    const result = profileSchema.safeParse({ nickname: '' });
    expect(result.success).toBe(false);
  });

  it('should reject nickname longer than 30 chars', () => {
    const result = profileSchema.safeParse({ nickname: 'a'.repeat(31) });
    expect(result.success).toBe(false);
  });

  it('should trim the nickname', () => {
    const result = profileSchema.safeParse({ nickname: '  곰  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBe('곰');
    }
  });
});

describe('toValidationError', () => {
  it('should return an AppError with VALIDATION_FAILED code', () => {
    const result = bookSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = toValidationError(result.error.issues);
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('VALIDATION_FAILED');
    }
  });

  it('should map field paths to fieldErrors', () => {
    const result = bookSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = toValidationError(result.error.issues);
      expect(err.fieldErrors).toBeDefined();
      expect(err.fieldErrors?.['title']).toBeTruthy();
    }
  });

  it('should set message to first issue message', () => {
    const result = bookSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = toValidationError(result.error.issues);
      expect(err.message).toBeTruthy();
    }
  });
});

describe('parseOrThrow', () => {
  it('should return parsed data on success', () => {
    const data = parseOrThrow(bookSchema, { title: '채식주의자' });
    expect(data.title).toBe('채식주의자');
  });

  it('should throw AppError on failure', () => {
    expect(() => parseOrThrow(bookSchema, { title: '' })).toThrowError(AppError);
  });

  it('thrown AppError should have VALIDATION_FAILED code', () => {
    try {
      parseOrThrow(bookSchema, { title: '' });
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe('VALIDATION_FAILED');
    }
  });
});