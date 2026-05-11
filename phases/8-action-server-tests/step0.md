# Step 0: books-action-tests

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md` — TDD 원칙(`개발 프로세스` 섹션) 및 모듈 의존성 계층
- `docs/ARCHITECTURE.md` — Server Action 레이어와 에러 처리 규약(§11)
- `src/lib/actions/books.ts` — 테스트 대상. `listBooksAction`, `addBookAction`, `deleteBookAction`, `updateBookAction` 4개
- `src/lib/actions/auth.test.ts` — 패턴 참조 (vi.mock + ActionResult 검증 방식)
- `src/lib/actions/profile.test.ts` — 패턴 참조 (`getStore` 모킹 방식)
- `src/lib/storage/index.ts` — `getStore` 시그니처
- `src/lib/errors.ts` — `AppError`, `ActionResult`, `AppErrorCode`

## 배경

`src/lib/actions/books.ts`는 책 도메인의 핵심 CUD 진입점인데 대응 테스트가 없다. CLAUDE.md "TDD 필수" 원칙 위반 상태이며, 향후 facade(phase 9)와 도메인 확장(phase 11)이 이 액션을 변경할 예정이라 회귀 안전망이 시급하다.

## 작업

### 1. `src/lib/actions/books.test.ts` 신규 생성

`vi.mock`으로 `@/lib/storage`와 `next/cache`를 모킹한다.

```ts
vi.mock('@/lib/storage', () => ({
  getStore: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

테스트 케이스(최소 16개):

**listBooksAction (3)**
- 정상: store.listBooks 결과를 `{ ok: true, data }`로 반환
- `AppError` 던질 때 `{ ok: false, error: { code, message, fieldErrors } }`로 매핑
- 알 수 없는 에러 → `UPSTREAM_FAILED`

**addBookAction (5)**
- 정상: `revalidatePath('/bookshelf')`와 `revalidatePath('/')` 모두 호출되었는지 검증
- isbn 있을 때 `findBookByIsbn`이 기존 책 반환 → `DUPLICATE_ISBN`
- isbn 없을 때 중복 검사 우회 → 정상 추가
- `AppError` 매핑
- 알 수 없는 에러 → `UPSTREAM_FAILED`

**deleteBookAction (4)**
- 정상: `store.deleteBook` 호출 + 두 경로 revalidate
- store에서 `AppError` 던짐 → 매핑
- 알 수 없는 에러 → `UPSTREAM_FAILED`
- 빈 bookId 전달 시 동작(현재 코드는 그대로 store에 위임 — 동작 그대로 검증, 변경 금지)

**updateBookAction (4)**
- 정상: `revalidatePath('/bookshelf')`와 `revalidatePath(`/reading/${id}`)` 호출
- patch 부분 업데이트 동작 그대로 검증
- `AppError` 매핑
- 알 수 없는 에러 → `UPSTREAM_FAILED`

각 테스트에서 `vi.mocked(getStore).mockResolvedValue({ listBooks/addBook/... } as any)`로 store 모양만 만들고 실제 LocalStore/RemoteStore 임포트는 절대 하지 마라.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

`books.test.ts`의 모든 케이스 통과. 기존 테스트도 그대로 통과.

## 검증 절차

1. AC 커맨드 실행.
2. 새 테스트 파일이 `src/lib/actions/books.test.ts`에 존재하는지 확인.
3. `bun run test src/lib/actions/books.test.ts` 단독 실행 시 16개 이상 통과.
4. `phases/8-action-server-tests/index.json` step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "books.ts 4개 액션에 대한 테스트 N개 추가, ..."`
5. 커밋:
   - `test(8-action-server-tests): step 0 — books-action-tests`
   - `chore(8-action-server-tests): step 0 output`

## 금지사항

- `src/lib/actions/books.ts` 본체 코드를 수정하지 마라. 이유: 현재 동작을 그대로 락인하는 회귀 안전망이 목적이다. 동작 변경은 phase 11에서 다룬다.
- 실제 Supabase 클라이언트나 IndexedDB를 임포트하지 마라. 모든 의존성은 `vi.mock`으로 차단한다.
- `next/cache`의 실제 동작에 의존하지 마라 — `revalidatePath`가 호출되었는지만 검증한다.
- diary-entries / reading-sessions 액션을 건드리지 마라 — step 1/2 책임이다.