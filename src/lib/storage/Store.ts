import type { Book, ReadingSession, DiaryEntry } from '@/types';

export interface Store {
  // Books
  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  findBookByIsbn(isbn: string): Promise<Book | null>;
  addBook(input: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book>;
  updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Book>;
  deleteBook(id: string): Promise<void>;

  // Reading Sessions
  listReadingSessions(filter?: { bookId?: string; from?: string; to?: string }): Promise<ReadingSession[]>;
  getReadingSession(id: string): Promise<ReadingSession | null>;
  addReadingSession(input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReadingSession>;
  updateReadingSession(id: string, patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ReadingSession>;
  deleteReadingSession(id: string): Promise<void>;

  // Diary Entries
  listDiaryEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<DiaryEntry[]>;
  getDiaryEntry(id: string): Promise<DiaryEntry | null>;
  addDiaryEntry(input: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiaryEntry>;
  updateDiaryEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DiaryEntry>;
  deleteDiaryEntry(id: string): Promise<void>;
}