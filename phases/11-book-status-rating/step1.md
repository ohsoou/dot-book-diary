# Step 1: store-and-actions

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/types/index.ts` — step 0에서 확장된 `Book` 타입과 `BookStatus`
- `src/lib/validation.ts` — step 0에서 확장된 `bookSchema`
- `src/lib/storage/Store.ts` — `addBook`/`updateBook` 시그니처 (`Omit<Book, 'id' | 'createdAt' | 'updatedAt'>` 형태)
- `src/lib/storage/LocalStore.ts` — step 0에서 마이그레이션 로직 추가됨
- `src/lib/storage/RemoteStore.ts` — Supabase select/insert 구현
- `src/lib/actions/books.ts` — server action
- `src/lib/actions/books.test.ts` — phase 8 step 0의 회귀 테스트
- `src/types/supabase.ts` — step 0의 SQL 마이그레이션 적용 후 `bun db:types`로 갱신되어 있어야 함

## 사전 확인 (필수)

`src/types/supabase.ts`에 `books.Row`/`Insert`/`Update`에 `status`/`rating`/`finished_at`/`memo` 컬럼이 포함되어 있어야 한다. 없으면 사용자가 step 0 SQL을 실 DB에 적용하지 않은 상태이므로 다음 메시지로 즉시 중단:

> step 0의 SQL 마이그레이션이 Supabase에 적용되지 않았다. `bun db:migrate && bun db:types` 실행 후 재시도.

`phases/11-book-status-rating/index.json` step 1을 `blocked`로 설정하고 `blocked_reason`에 위 메시지를 적어라.

## 배경

타입은 확장됐지만 두 Store와 server action이 신규 필드를 핸들링하지 않으면 `addBook(input)`에 `status`를 넘겨도 무시되거나 NOT NULL 제약을 위반한다. 이 step은 데이터 경로의 정합성을 맞춘다.

## 작업

### 1. `LocalStore.ts` 확장

- `addBook`: `status`가 input에 없으면 `'reading'`을 기본값으로 부여(스키마 default와 일치시켜 facade가 검증 누락해도 안전).
- `updateBook`: patch에 `status`가 `'finished'`로 바뀌고 `finishedAt`이 patch에 명시되지 않았다면 `finishedAt`을 오늘(`YYYY-MM-DD`)로 자동 세팅. patch에 `finishedAt`이 명시돼 있으면 그 값을 우선.
- `updateBook`: patch에 `status`가 `'finished'`가 아닌 다른 값으로 바뀌면 `finishedAt`을 자동으로 비우지 마라(사용자 데이터 보존).
- `findBookByIsbn`은 status 무관하게 동작 그대로.

### 2. `RemoteStore.ts` 확장

- snake_case 변환: `status`/`rating`/`finished_at`/`memo` ↔ camelCase 매핑을 select/insert/update 모든 메서드에서 일관되게 처리.
- 자동 finishedAt 세팅 로직은 LocalStore와 동일하게 RemoteStore에서도 구현(클라이언트 시점 today). RLS 통과를 위해 `user_id`는 변경 금지.

### 3. `src/lib/actions/books.ts` 확장

- `addBookAction`은 현재 `BookSearchResult`만 받는데, `status` 같은 추가 입력은 받지 않는다(검색 결과로 추가 시 default 'reading'이 LocalStore/RemoteStore에서 부여됨). 시그니처는 그대로 두고 본문만 안전하게 통과시켜라.
- `updateBookAction`은 `Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>`을 받으므로 status/rating/finishedAt/memo가 자동으로 통과된다. **단**, 입력 검증을 위해 server-side에서 `bookSchema.partial().safeParse(patch)`로 validation 한 줄 추가하고 실패 시 `VALIDATION_FAILED` + `fieldErrors` 반환.

### 4. 테스트 추가

#### `LocalStore.test.ts` 추가 케이스 (최소 8)
- addBook: status 미명시 → 'reading' 기본값
- addBook: status 'want' → 그대로 저장
- updateBook: status를 'finished'로 변경 + finishedAt 미지정 → 오늘 날짜 자동 세팅
- updateBook: status를 'finished' + finishedAt 명시 → 명시값 우선
- updateBook: status가 'finished'에서 'reading'으로 → finishedAt 보존
- updateBook: rating 1~5 OK, 0/6 시도 시 store 단계에서 검증 안 함(action 단계에서 zod로 거름 — 본 테스트는 store는 통과시키는 동작 락인)
- updateBook: memo 길이 초과는 store 통과(검증은 action 책임)
- findBookByIsbn: status 'finished' 책도 정상 검색

#### `RemoteStore.test.ts` 추가 케이스 (최소 8)
- snake_case ↔ camelCase 매핑 정확
- finishedAt 자동 세팅 로직 동일 동작 검증
- select 시 신규 컬럼이 결과에 포함되는지

#### `books.test.ts` 추가 케이스 (최소 6)
- updateBookAction: rating 6 → `VALIDATION_FAILED` + `fieldErrors.rating`
- updateBookAction: status 'invalid' → `VALIDATION_FAILED` + `fieldErrors.status`
- updateBookAction: memo 501자 → `VALIDATION_FAILED` + `fieldErrors.memo`
- updateBookAction: 정상 patch with rating + status → `revalidatePath` 호출
- updateBookAction: patch가 빈 객체 → `safeParse` 통과 → store 호출
- 기존 회귀 테스트는 모두 통과

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

전체 테스트 통과.

## 검증 절차

1. 사전 확인 통과(supabase.ts에 신규 컬럼 존재).
2. AC 커맨드 실행.
3. `grep -n "status" src/lib/storage/RemoteStore.ts` — select/insert/update에서 status 매핑 확인.
4. `phases/11-book-status-rating/index.json` step 1 업데이트.
5. 커밋:
   - `feat(11-book-status-rating): step 1 — store-and-actions`
   - `chore(11-book-status-rating): step 1 output`

## 금지사항

- UI 컴포넌트(`BookGrid`, `ReadingSessionForm`, `BookCover`)를 수정하지 마라 — step 2 책임.
- `BookSearchResult`에 신규 필드를 추가하지 마라.
- `addBookAction` 시그니처를 바꾸지 마라. 이유: phase 9의 facade가 `BookSearchResult`만 넘기도록 안정화돼 있음. 신규 책 추가 시 status는 default로 부여된다.
- LocalStore와 RemoteStore에서 finishedAt 자동 클리어(언리딩으로 전환 시 finishedAt 삭제) 로직을 추가하지 마라. 이유: 사용자가 "다시 읽는 중" 상태로 잠시 바꿨다가 되돌릴 수 있음, 이력 데이터 보존 우선.
- 새 ADR을 추가하지 마라 — step 0에서 등록 완료.