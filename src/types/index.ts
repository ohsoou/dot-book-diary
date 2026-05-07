export type Book = {
  id: string;
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  coverUrl?: string;
  totalPages?: number;
  targetDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type ReadingSession = {
  id: string;
  bookId: string;
  readDate: string; // YYYY-MM-DD
  startPage?: number;
  endPage?: number;
  durationMinutes?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type DiaryEntry = {
  id: string;
  bookId?: string;
  entryType: 'quote' | 'review';
  body: string;
  page?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type BookSearchResult = {
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  coverUrl?: string;
  totalPages?: number;
};

export type Profile = {
  userId: string;
  nickname?: string;
  themePreference: 'system' | 'day' | 'night';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type DiaryDraft = {
  entryType: 'quote' | 'review';
  body: string;
  bookId?: string;
  page?: number;
};

export type GuestPreferences = {
  nickname?: string;
  localArchived?: boolean;
  guestBannerDismissed?: boolean;
  themePreference?: 'system' | 'day' | 'night';
};

export type ReadingStatsPeriod = {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
};

export type ReadingStats = {
  totalMinutes: number;
  totalSessions: number;
  totalPagesRead: number; // sum of (endPage - startPage) where both defined
  daysActive: number; // distinct readDate count
  booksTouched: number; // distinct bookId count
};

export type ReadingStreak = {
  current: number; // 오늘 기준 연속 독서일
  longest: number; // 전체 기간 최장 연속
  lastReadDate: string | null;
};

export type DiarySearchQuery = {
  q?: string; // case-insensitive 부분 일치 (body 대상)
  bookId?: string;
  entryType?: DiaryEntry['entryType'];
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  limit?: number; // default 50
  cursor?: string; // 직전 페이지의 마지막 entry id (회원 환경 페이지네이션)
};

export type SessionsByDate = {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  bookIds: string[];
};