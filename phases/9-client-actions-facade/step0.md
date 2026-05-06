# Step 0: use-book-actions-hook

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md` — 모듈 의존성 계층 (`components → lib/actions → lib/storage` 방향)
- `docs/ARCHITECTURE.md` — Store 추상화와 회원/비회원 분기 정책
- `src/lib/storage/Store.ts` — Store 인터페이스
- `src/lib/storage/LocalStore.ts` — 비회원 구현
- `src/lib/storage/use-store.ts` — 기존 클라이언트 스토어 훅
- `src/lib/actions/books.ts` — 회원 경로의 server action 시그니처
- `src/lib/actions/books.test.ts` — phase 8 step 0에서 만든 회귀 안전망
- `src/lib/errors.ts` — `ActionResult` 타입
- `src/components/book/AddBookTabs.tsx` — 현재 분기 패턴(33-65 부근)
- `src/components/book/ReadingSessionForm.tsx` — 책 삭제 분기(96-263 부근)

## 배경

현재 `AddBookTabs`, `ReadingSessionForm`, `DiaryEntryForm`, `BookPicker`는 모두 `isLoggedIn ? action() : new LocalStore().xxx()` 패턴을 손으로 반복한다. 두 경로가 점점 어긋나고 있고(예: `addReadingSession`에서 회원 경로는 `bookId`를 명시 포함, 비회원 경로는 그렇지 않을 수 있음), 새 도메인 필드(phase 11) 추가 시 두 군데를 동시에 고쳐야 한다.

이 step에서는 책 도메인 facade 훅 `useBookActions`를 도입하고 `AddBookTabs` 한 곳만 마이그레이션해 패턴을 검증한다.

## 작업

### 1. `src/lib/client-actions/useBookActions.ts` 신규

```ts
'use client'
import type { ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'

export type UseBookActions = {
  listBooks(): Promise<ActionResult<Book[]>>
  addBook(input: BookSearchResult): Promise<ActionResult<Book>>
  updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ActionResult<Book>>
  deleteBook(id: string): Promise<ActionResult<void>>
  findBookByIsbn(isbn: string): Promise<ActionResult<Book | null>>
}

export function useBookActions(opts: { isLoggedIn: boolean }): UseBookActions
```

핵심 규칙:

- 회원 경로(`opts.isLoggedIn === true`): `@/lib/actions/books` server action을 직접 호출하고 결과를 그대로 반환.
- 비회원 경로: `new LocalStore()`를 훅 내부에서 1회만 인스턴스화(`useMemo`)하고 호출. `AppError` 던지면 `{ ok: false, error: { code, message, fieldErrors? } }`로 래핑, 그 외 에러는 `UPSTREAM_FAILED`로 래핑.
- 비회원 `addBook`도 회원 경로와 동일하게 `findBookByIsbn` 중복 체크 후 `DUPLICATE_ISBN` 반환(현재 server action과 시그니처/에러 코드 1:1 매칭).
- 훅은 server-only API 임포트 금지(`'server-only'` 패키지 자체 임포트 금지).

### 2. `src/lib/client-actions/useBookActions.test.ts` 신규

테스트 케이스(최소 12개):

**회원 경로 (server action 위임 검증)**
- `vi.mock('@/lib/actions/books', () => ({ addBookAction: vi.fn(), ... }))`
- listBooks/addBook/deleteBook/updateBook 각각 server action에 위임되고 결과 그대로 반환

**비회원 경로 (LocalStore 호출 검증)**
- `vi.mock('@/lib/storage/LocalStore', () => ({ LocalStore: vi.fn().mockImplementation(...) }))`
- 정상 경로 → `{ ok: true, data }`
- AppError 던짐 → `{ ok: false, error: { code, message, fieldErrors? } }`
- 일반 Error → `UPSTREAM_FAILED`
- `addBook` 시 isbn 있고 기존 책 존재 → `DUPLICATE_ISBN` 반환

### 3. `AddBookTabs.tsx` 마이그레이션

`AddBookTabs.tsx` 안의 `isLoggedIn ? addBookAction(...) : new LocalStore().addBook(...)` 분기를 모두 `actions.addBook(input)` 한 줄로 교체. 훅은 컴포넌트 최상단에서 `const actions = useBookActions({ isLoggedIn })`로 받는다.

기존 토스트/리다이렉트 흐름은 그대로 유지. `ActionResult` 모양이 동일하므로 컨슈머 코드 변경 최소화.

### 4. 회귀 검증

`AddBookTabs.test.tsx`(있다면) 통과. 없다면 신규 테스트 작성하지 말고 기존 컴포넌트 테스트만 통과시켜라(테스트 신규 작성은 step 2에서 일괄).

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

`useBookActions.test.ts` 통과 + 기존 `books.test.ts`(phase 8 step 0) 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `grep -rn "new LocalStore" src/components/book/AddBookTabs.tsx` 결과 0건.
3. `grep -rn "addBookAction\|deleteBookAction\|updateBookAction\|listBooksAction" src/components/` 결과가 `AddBookTabs.tsx`에서 사라졌는지 확인(다른 컴포넌트에 남아 있는 것은 step 1/2가 처리).
4. `phases/9-client-actions-facade/index.json` step 0 업데이트.
5. 커밋:
   - `feat(9-client-actions-facade): step 0 — use-book-actions-hook`
   - `chore(9-client-actions-facade): step 0 output`

## 금지사항

- `src/lib/actions/books.ts` 본체를 수정하지 마라. 이유: 회원 경로는 그대로 유지하고 facade만 추가한다.
- `LocalStore.ts`를 수정하지 마라. 이유: 동작 변경 없이 호출 경로만 통일한다.
- `ReadingSessionForm`, `DiaryEntryForm`, `BookPicker`를 마이그레이션하지 마라 — step 1/2 책임이다.
- 훅에서 `'use server'`나 `next/cache`를 임포트하지 마라. 이유: 클라이언트 훅이다.
- `import 'server-only'`도 임포트하지 마라.