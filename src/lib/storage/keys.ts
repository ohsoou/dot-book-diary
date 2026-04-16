export const KEYS = {
  BOOKS: 'dbd:books',
  READING_SESSIONS: 'dbd:reading_sessions',
  DIARY_ENTRIES: 'dbd:diary_entries',
  PREFERENCES: 'dbd:preferences',
  SCHEMA_VERSION: 'dbd:schema_version',
  DIARY_DRAFT: (id: string) => `dbd:diary_draft:${id}`,
} as const;

export const CURRENT_SCHEMA_VERSION = 1;