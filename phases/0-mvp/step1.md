# Step 1: domain-foundations

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` (특히 "데이터 모델", "Store 인터페이스", "입력 검증 규약", "에러 처리 규약")
- `/docs/ADR.md` (ADR-007, ADR-008, ADR-016)
- `/CLAUDE.md`
- 이전 step 산출물: `tsconfig.json`, `vitest.config.ts`, `src/app/layout.tsx`

## 작업

도메인 타입, 검증 규약, 에러 코드, 날짜/ISBN 유틸, `Store` 계약을 먼저 고정한다. 아직 IndexedDB/Supabase 구현은 하지 않는다. **TDD로 진행: 테스트 먼저.**

1. **`src/types/index.ts`**
   - `Book`, `ReadingSession`, `DiaryEntry`, `BookSearchResult`, `Profile`, `DiaryDraft` 타입 정의.
   - `entryType: 'quote' | 'review'` union 유지.
   - `readDate: string` (YYYY-MM-DD), `createdAt: string` (ISO 8601).
   - 선택 필드: `isbn`, `author`, `publisher`, `coverUrl`, `totalPages`, `page` (nullable).

2. **`src/lib/storage/Store.ts`** — 최종 인터페이스
   ```ts
   interface Store {
     // Books
     addBook(input: Omit<Book, 'id' | 'createdAt'>): Promise<Book>;
     listBooks(): Promise<Book[]>;
     getBook(id: string): Promise<Book | null>;
     updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt'>>): Promise<Book>;
     deleteBook(id: string): Promise<void>;
     findBookByIsbn(isbn: string): Promise<Book | null>;

     // Reading Sessions
     addReadingSession(input: Omit<ReadingSession, 'id' | 'createdAt'>): Promise<ReadingSession>;
     listReadingSessions(bookId: string): Promise<ReadingSession[]>;
     getReadingSession(id: string): Promise<ReadingSession | null>;
     updateReadingSession(id: string, patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'bookId'>>): Promise<ReadingSession>;
     deleteReadingSession(id: string): Promise<void>;

     // Diary Entries
     addDiaryEntry(input: Omit<DiaryEntry, 'id' | 'createdAt'>): Promise<DiaryEntry>;
     listDiaryEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<DiaryEntry[]>;
     getDiaryEntry(id: string): Promise<DiaryEntry | null>;
     updateDiaryEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>): Promise<DiaryEntry>;
     deleteDiaryEntry(id: string): Promise<void>;
   }
   ```

3. **`src/lib/storage/keys.ts`** — IndexedDB 키 상수
   ```ts
   export const KEYS = {
     BOOKS: 'dbd:books',
     READING_SESSIONS: 'dbd:reading_sessions',
     DIARY_ENTRIES: 'dbd:diary_entries',
     PREFERENCES: 'dbd:preferences',
     SCHEMA_VERSION: 'dbd:schema_version',
     DIARY_DRAFT: (id: string) => `dbd:diary_draft:${id}`,
   } as const;
   export const CURRENT_SCHEMA_VERSION = 1;
   ```

4. **공통 유틸**
   - `src/lib/env.ts`: 환경변수를 타입 안전하게 읽기. 미설정 시 명확한 오류. `NEXT_PUBLIC_FF_SYNC_GUEST_DATA` 포함.
   - `src/lib/errors.ts`: `AppErrorCode` union + `AppError extends Error` (code, message, cause?, fieldErrors?). `ActionResult<T>` 타입.
   - `src/lib/validation.ts`: zod 스키마 (Book, ReadingSession, DiaryEntry, SearchQuery, Profile, DiaryDraft). 실패 시 `AppError('VALIDATION_FAILED', ...)` 변환 헬퍼.
   - `src/lib/date.ts`: `formatLocalYmd(date: Date): string`, `getMonthMatrix(year: number, month: number, weekStartsOn = 0): Date[][]` (6주×7일, 일요일 시작).
   - `src/lib/isbn.ts`: `isValidIsbn13(isbn: string): boolean`, `convertIsbn10to13(isbn10: string): string | null`.
   - `src/lib/escape.ts`: `escapeHtml(str: string): string` (XSS 방어용 HTML 특수문자 이스케이프).

5. **검증 정책** (validation.ts에 고정)
   - `body.trim().length` 1~5000자
   - `entryType ∈ { 'quote', 'review' }`
   - `readDate <= today(local)` — `formatLocalYmd(new Date())`와 비교
   - `startPage`, `endPage`, `durationMinutes` ≥ 0
   - `endPage >= startPage`
   - `endPage <= totalPages` — totalPages가 있을 때만 검사하는 helper로 분리
   - `nickname` — `z.string().min(1).max(30).trim()`

6. **테스트**
   - `src/lib/validation.test.ts`
   - `src/lib/date.test.ts`
   - `src/lib/isbn.test.ts`
   - `src/lib/errors.test.ts`
   - `src/lib/escape.test.ts`
   - 최소 시나리오: ISBN-10→13 변환, 로컬 YYYY-MM-DD 포맷, `getMonthMatrix` 일요일 시작, 검증 실패 코드/메시지, `escapeHtml` 특수문자 변환.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. 위 AC 실행. 새 테스트가 실제로 실행되고 통과하는지 확인한다.
2. 아키텍처 체크리스트:
   - `Store`가 `findBookByIsbn`, `deleteReadingSession`, `updateReadingSession`을 포함하는가?
   - `KEYS.SCHEMA_VERSION`이 `keys.ts`에 있는가?
   - `env`, `validation`, `errors`, `date`, `isbn`, `escape`, `keys`가 모두 생겼는가?
   - 아직 IndexedDB/Supabase 구현을 섞지 않았는가?
3. `phases/0-mvp/index.json`의 step 1 업데이트.

## 금지사항

- 타입을 `any`로 두지 마라.
- 검증 규칙을 컴포넌트 안에 분산하지 마라. 반드시 `validation.ts`를 진실원으로 둔다.
- `Store` 인터페이스에 profile/guest preference(guestBannerDismissed 등)를 넣지 마라.
- 기존 테스트를 깨뜨리지 마라.
