# Step 1: core-types-and-local-store

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` (특히 "데이터 모델", "패턴" 섹션)
- `/docs/ADR.md` (ADR-003: 비회원 로컬 전용)
- `/CLAUDE.md`
- 이전 step 산출물: `src/app/layout.tsx`, `tsconfig.json`, `vitest.config.ts`

이전 step에서 만들어진 스캐폴딩을 꼼꼼히 읽고 디렉토리 규약과 테스트 설정을 파악한 뒤 작업하라.

## 작업

도메인 타입과 `Store` 인터페이스, 그리고 비회원용 `LocalStore`(IndexedDB) 구현을 만든다. **TDD로 진행: 테스트 먼저.**

1. **`src/types/index.ts`** — 도메인 타입 정의
   ```ts
   export type Book = {
     id: string;
     isbn?: string;
     title: string;
     author?: string;
     publisher?: string;
     coverUrl?: string;
     totalPages?: number;
     createdAt: string; // ISO
   };

   export type ReadingSession = {
     id: string;
     bookId: string;
     readDate: string; // YYYY-MM-DD
     startPage?: number;
     endPage?: number;
     durationMinutes?: number;
     createdAt: string;
   };

   export type DiaryEntry = {
     id: string;
     bookId?: string;
     entryType: 'quote' | 'review';
     body: string;
     page?: number;
     createdAt: string;
   };
   ```

2. **`src/lib/storage/Store.ts`** — 인터페이스
   ```ts
   export interface Store {
     listBooks(): Promise<Book[]>;
     getBook(id: string): Promise<Book | null>;
     addBook(input: Omit<Book, 'id' | 'createdAt'>): Promise<Book>;
     deleteBook(id: string): Promise<void>;

     listReadingSessions(bookId?: string): Promise<ReadingSession[]>;
     addReadingSession(input: Omit<ReadingSession, 'id' | 'createdAt'>): Promise<ReadingSession>;

     listDiaryEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<DiaryEntry[]>;
     getDiaryEntry(id: string): Promise<DiaryEntry | null>;
     addDiaryEntry(input: Omit<DiaryEntry, 'id' | 'createdAt'>): Promise<DiaryEntry>;
     updateDiaryEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>): Promise<DiaryEntry>;
     deleteDiaryEntry(id: string): Promise<void>;
   }
   ```

3. **`src/lib/storage/LocalStore.ts`** — `idb-keyval` 기반 구현.
   - 키: `dbd:books`, `dbd:reading_sessions`, `dbd:diary_entries`.
   - `id`는 `crypto.randomUUID()`, `createdAt`은 `new Date().toISOString()`.
   - 삽입/삭제는 전체 배열 재쓰기로 충분(MVP 규모).

4. **`src/lib/storage/index.ts`** — 임시 factory: 지금은 항상 `new LocalStore()` 반환. step 2에서 Supabase 세션 분기 추가.

5. **테스트** (`src/lib/storage/LocalStore.test.ts`)
   - `fake-indexeddb/auto`를 devDependency로 추가하여 Vitest(jsdom)에서 IndexedDB 동작.
   - 시나리오: 빈 상태 listBooks → [], addBook 후 listBooks에 1건, deleteBook 후 0건, addDiaryEntry의 bookId 필터 동작, addReadingSession의 bookId 필터 동작.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. 위 AC 실행. 새 테스트가 실제로 실행되고 통과하는지 확인(`expect.assertions` 또는 최소 1개 이상의 expect 포함).
2. 아키텍처 체크리스트:
   - `src/types/`, `src/lib/storage/` 경로 준수.
   - 어떤 곳에서도 Supabase 클라이언트를 import하지 않음(step 2 전).
   - `Store` 인터페이스를 경유하지 않는 직접 IndexedDB 호출이 상위 레이어에 없음.
3. `phases/0-mvp/index.json`의 step 1 업데이트(완료 summary 예: "Book/ReadingSession/DiaryEntry 타입 + Store 인터페이스 + LocalStore(idb-keyval) 구현 및 테스트 완료").

## 금지사항

- `Store` 인터페이스를 우회해 컴포넌트에서 `idb-keyval`을 직접 import하지 마라. 이유: RemoteStore 주입 시 교체 포인트가 사라진다.
- 타입을 `any`로 두지 마라. 이유: TypeScript strict + 도메인 안전성.
- 기존 테스트를 깨뜨리지 마라.
