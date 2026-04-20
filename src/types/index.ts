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