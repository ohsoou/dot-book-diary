# Step 0: types-and-migrations

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md` — 의존성 계층 + 환경변수 정책
- `docs/ADR.md` — 마지막 ADR 번호 확인 후 새 번호 부여
- `docs/ARCHITECTURE.md` — 도메인 모델 섹션
- `docs/PRD.md` — 책 상태/평점 관련 요구사항(있는지 확인)
- `src/types/index.ts` — `Book`, `BookSearchResult` 타입
- `src/lib/validation.ts` — `bookSchema`
- `src/lib/storage/keys.ts` — `CURRENT_SCHEMA_VERSION` 상수
- `src/lib/storage/LocalStore.ts` — `runMigrations` 함수
- `src/lib/storage/LocalStore.test.ts` — 기존 마이그레이션 테스트 패턴

## 배경

`Book` 도메인에 핵심 분류 필드가 없다: `status`(읽고싶음/읽는중/완독), `rating`, `finishedAt`, `memo`. 이 step에서는 **데이터 모델과 마이그레이션만** 처리한다. 실제 코드 동작과 UI는 step 1/2에서.

LocalStore는 IDB schema version을 올려 자동 마이그레이션. RemoteStore는 Supabase ALTER TABLE이 필요하므로 SQL 스크립트만 작성하고 실 DB 적용은 사용자 수동 실행(`bun db:migrate`)으로 미룬다.

## 작업

### 1. `docs/ADR.md` ADR 추가

새 번호로(현재 마지막 번호 +1) "Book 도메인에 status/rating/finishedAt/memo 필드 추가" 등록:

- **결정**: `Book.status: 'want' | 'reading' | 'finished'`(default 'reading'), `rating?: 1-5`, `finishedAt?: string`(YYYY-MM-DD), `memo?: string`(최대 500자) 추가.
- **이유**: 책 분류·완독 추적·평가가 독서 앱의 기본 기능인데 부재. 책장이 한 덩어리.
- **결과·제약**: LocalStore schema v2로 마이그레이션, Supabase ALTER TABLE은 별도 SQL 파일로 작성, `BookSearchResult`(외부 API 반환)에는 추가하지 않음(검색 결과는 status 미보유).
- **마이그레이션 정책**: 기존 책은 `status: 'reading'`으로 채움. 다른 신규 필드는 모두 옵셔널이므로 채우지 않음.

### 2. `src/types/index.ts` 확장

```ts
export type BookStatus = 'want' | 'reading' | 'finished'

export type Book = {
  id: string
  isbn?: string
  title: string
  author?: string
  publisher?: string
  coverUrl?: string
  totalPages?: number
  targetDate?: string
  status: BookStatus              // 신규, 필수 (default 'reading')
  rating?: number                  // 1~5 정수
  finishedAt?: string              // YYYY-MM-DD
  memo?: string                    // 최대 500자
  createdAt: string
  updatedAt: string
}
```

`BookSearchResult`는 변경 금지(외부 API 결과). `status`는 책장에 추가될 때 비로소 부여된다.

### 3. `src/lib/validation.ts`의 `bookSchema` 확장

기존 필드 + 신규:
- `status`: `z.enum(['want', 'reading', 'finished']).default('reading')`
- `rating`: `z.number().int().min(1).max(5).optional()`
- `finishedAt`: 기존 `dateSchema` 패턴 재사용, optional
- `memo`: `z.string().max(500).optional()`

`bookSchema.test.ts`(또는 `validation.test.ts`) 케이스 추가: 정상/범위 초과 rating/잘못된 status 거부/memo 길이 초과.

### 4. `src/lib/storage/keys.ts` schema version 올림

`CURRENT_SCHEMA_VERSION`을 `2`로 변경.

### 5. `LocalStore.ts` `runMigrations` 확장

v1 → v2 단계 추가: 기존 책 IDB record를 순회하며 `status`가 없으면 `'reading'`으로 채워 다시 put.

### 6. `LocalStore.test.ts`에 마이그레이션 테스트 추가

- v1 schema의 IDB DB를 시뮬레이션(version=1로 직접 open) → 책 2~3개 삽입 → LocalStore 인스턴스 생성 시 자동으로 v2로 올라가고 모든 책에 `status: 'reading'` 부여 확인.
- 이미 v2인 DB를 재오픈했을 때 멱등성: 두 번 실행해도 데이터 손상 없음.

### 7. Supabase 마이그레이션 SQL 작성 (실행은 사용자가)

`supabase/migrations/{timestamp}_book_status_rating.sql` 신규:

```sql
ALTER TABLE books
  ADD COLUMN status text NOT NULL DEFAULT 'reading' CHECK (status IN ('want', 'reading', 'finished')),
  ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN finished_at date,
  ADD COLUMN memo text CHECK (memo IS NULL OR char_length(memo) <= 500);

-- index for status filter
CREATE INDEX IF NOT EXISTS books_user_id_status_idx ON books (user_id, status);
```

`bun db:migrate`는 사용자가 실행할 것임을 step summary에 명시. 자동 실행 금지.

`bun db:types` 실행해 `src/types/supabase.ts` 갱신은 step 1로 미룬다(이 step에서는 SQL 파일만 둔다).

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

전체 테스트 통과(LocalStore 마이그레이션 테스트 포함). RemoteStore가 신규 필드를 아직 모르는 상태이므로 컴파일 통과만 보장된다(런타임 호출 안 함).

## 검증 절차

1. AC 커맨드 실행.
2. `grep -n "status" src/types/index.ts` — `BookStatus` 타입과 `Book.status` 필드 존재.
3. `cat src/lib/storage/keys.ts | grep CURRENT_SCHEMA_VERSION` — 값 2 확인.
4. `ls supabase/migrations/` — 신규 SQL 파일 확인.
5. `phases/11-book-status-rating/index.json` step 0 업데이트. summary에 "사용자가 `bun db:migrate` 실행 후 step 1 진행"이라는 명시적 안내 포함.
6. 커밋:
   - `feat(11-book-status-rating): step 0 — types-and-migrations`
   - `chore(11-book-status-rating): step 0 output`
7. **사용자 액션 필요**: `bun db:migrate` 후 `bun db:types`를 사용자가 직접 실행. 이 step의 status를 `blocked`로 설정하지 마라 — SQL 파일이 준비된 시점에서 step 0은 완료. step 1 시작 전 사용자가 마이그레이션 적용했음을 확인하라.

## 금지사항

- 실제 Supabase에 마이그레이션을 적용하지 마라 (`supabase db push` 자동 실행 금지). 이유: 실 DB 변경은 사용자 승인 사항.
- `BookSearchResult`에 `status`/`rating` 등 추가하지 마라. 이유: 외부 API 결과 모델 오염 방지.
- RemoteStore.ts를 수정하지 마라 — step 1 책임.
- UI 컴포넌트(`BookGrid`, `ReadingSessionForm`)를 수정하지 마라 — step 2 책임.
- `client-actions` facade를 수정하지 마라 — phase 9에서 객체 그대로 통과되도록 설계됨.
- `status`의 default를 'want'로 두지 마라. 이유: 마이그레이션 시 기존 사용자가 가진 책은 "이미 책장에 들인 = 읽고 있다"가 자연스럽다.