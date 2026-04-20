# Step 1: theme-and-goal-schema

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§9 schema, §10 Store, §10.1 GuestPreferences, §22.3 목표 진행률)
- `/docs/ADR.md` (ADR-013 마이그레이션, ADR-016 프로필, ADR-018 테마, ADR-020 목표)
- `/src/types/index.ts`
- `/src/types/supabase.ts` (존재 시)
- `/src/lib/validation.ts`
- `/src/lib/storage/Store.ts`
- `/src/lib/storage/LocalStore.ts`
- `/src/lib/storage/RemoteStore.ts`
- `/src/lib/storage/preferences.ts`
- `/supabase/migrations/0001_init.sql`

## 작업

데이터 계층에 테마 선호도와 목표 완독일을 도입한다.

### 1. 마이그레이션

`supabase/migrations/0002_theme_goal.sql` 신규 작성:

- `profiles` 테이블에 컬럼 추가:
  - `theme_preference text not null default 'system' check (theme_preference in ('system','day','night'))`
- `books` 테이블에 컬럼 추가:
  - `target_date date null`
  - `check (target_date is null or created_at::date <= target_date)`
- 기존 RLS/trigger 영향 없음(새 컬럼만 추가).
- 파일 상단에 간단 주석으로 목적 기록.

### 2. 타입 확장

`src/types/index.ts`:
- `Profile`에 `themePreference: 'system' | 'day' | 'night'` 추가(기본 `'system'`).
- `Book`에 `targetDate?: string` 추가(`YYYY-MM-DD`).
- `GuestPreferences`에 `themePreference?: 'system' | 'day' | 'night'` 추가.

Supabase 생성 타입(`supabase.ts`)이 있다면 `bun db:types` 안내 주석을 커밋 메시지에 남겨라. 실제 CLI 실행은 이 step에서 금지(외부 접근). 수동 갱신이 필요하다 적어라.

### 3. zod 스키마

`src/lib/validation.ts`:
- `bookSchema`(또는 동등)의 `targetDate` 필드: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`.
- `themePreferenceSchema = z.enum(['system','day','night'])`.
- `profileUpdateSchema`가 있다면 `themePreference`를 optional로 포함.
- `bookUpdateSchema`에 `targetDate` optional 포함. 검증: `targetDate >= book.createdAt(로컬 ymd)`를 폼에서 보조 검증(여기선 포맷만).

### 4. Store / Preferences

`src/lib/storage/preferences.ts`:
- `GuestPreferences.themePreference` 읽기/쓰기 지원. 기본값 `'system'`.
- 기존 `getPreferences()`/`updatePreferences()` 시그니처는 유지.

`src/lib/storage/LocalStore.ts`:
- `addBook`, `updateBook`에서 `targetDate` 왕복 저장.

`src/lib/storage/RemoteStore.ts`:
- `books.target_date` ↔ `Book.targetDate` 매핑(DB는 snake_case, 앱은 camelCase).
- `profiles.theme_preference` 조회/저장 메서드가 필요하면 추가. 단, **Store 인터페이스에는 프로필을 넣지 않는다**(ADR-016). 별도 함수 또는 `lib/actions/profile.ts`에서 직접 supabase 호출해도 된다. 여기선 DB 매핑만 준비.

### 5. 테스트

- `validation.test.ts`: `themePreferenceSchema`, `bookSchema`(targetDate) 유효/무효 케이스.
- `LocalStore.test.ts`: `addBook`/`updateBook` targetDate 왕복.
- `preferences.test.ts`: `themePreference` 기본값/갱신.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - 마이그레이션 파일이 `0002_theme_goal.sql`로 순번 유지되는가?
   - `profiles.theme_preference` 제약 조건이 세 값만 허용하는가?
   - `books.target_date` 체크가 `created_at::date`와 비교하는가?
   - LocalStore와 RemoteStore가 `targetDate` 왕복에서 일관된가?
3. `phases/1-mvp/index.json` step 1 업데이트(completed + summary).
4. 커밋 분리(feat + chore).

## 금지사항

- `SUPABASE_SERVICE_ROLE_KEY`를 참조하지 마라. 이유: CLAUDE.md CRITICAL.
- 마이그레이션을 기존 `0001_init.sql`에 추가하지 마라. 이유: append-only 원칙(ADR-013).
- Store 인터페이스에 profile 메서드를 추가하지 마라. 이유: ADR-016.
- `bun db:migrate` / `bun db:types`를 실행하지 마라. 이유: 외부 접근, 사용자 권한.
- 기존 테스트를 깨뜨리지 마라.
