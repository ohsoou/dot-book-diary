# Step 1: last-read-query

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.4 곰 상태 파생 — API 설명)
- `/docs/ADR.md` (ADR-021 결과/제약 — server-only 규칙)
- `/src/lib/storage/Store.ts` — Store 인터페이스
- `/src/lib/storage/RemoteStore.ts` — Supabase 쿼리 패턴 참조
- `/src/lib/storage/index.ts` — getStore/useStore 패턴
- `/src/lib/bear-state.ts` — step 0에서 생성됨. BearStateResult 타입 참조.

## 작업

`src/lib/last-read.ts`와 `src/lib/last-read.test.ts`를 생성한다.

### 요구사항

#### 클라이언트/서버 공용 (비회원)

```ts
// LocalStore (비회원) 또는 Store 인터페이스 구현체에서 마지막 세션 created_at 조회
export async function getLastReadAtFromStore(store: Store): Promise<string | null>
```

- `store.listReadingSessions()` 호출 후 `created_at DESC` 정렬하여 첫 번째 항목의 `createdAt` 반환.
- 세션이 없으면 `null`.
- `ReadingSession.createdAt`은 UTC ISO 문자열이므로 문자열 대소 비교로 정렬 가능 (ISO 특성).

#### 서버 전용 (회원)

```ts
// 파일 상단에 반드시 추가:
import 'server-only'

export async function getLastReadAtFromSupabase(
  userId: string,
  supabase: SupabaseClient  // @supabase/supabase-js의 SupabaseClient 타입
): Promise<string | null>
```

- `supabase.from('reading_sessions').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()` 패턴.
- 결과가 없으면 `null`, 에러 발생 시 `null` 반환 (에러 전파 금지 — page.tsx에서 bear state가 null로 폴백되면 충분).

### 테스트 (먼저 작성)

`src/lib/last-read.test.ts`:

`getLastReadAtFromStore` 테스트 (Store 인터페이스를 mock 또는 LocalStore + fake-indexeddb 사용):

1. 세션 0건 → `null`
2. 세션 1건 → 해당 `createdAt` 반환
3. 세션 여러 건 → `createdAt`이 가장 최신인 항목의 `createdAt` 반환
4. 세션이 역순으로 저장되어 있어도 정렬 후 최신 반환

`getLastReadAtFromSupabase`는 server-only 모듈이므로 **이 파일에서 직접 import하여 테스트하지 않는다**. 이유: server-only 임포트는 브라우저/Vitest jsdom 환경에서 에러를 발생시킨다. 서버 경로는 통합 수동 테스트(Step 5 체크리스트)로 대체.

## Acceptance Criteria

```bash
bun test src/lib/last-read.test.ts
bun run build
bun lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `src/lib/last-read.ts` 첫 줄이 `import 'server-only'`인지 확인. 이유: server 함수가 클라이언트 번들에 포함되면 Supabase service key 노출 위험.
3. 결과에 따라 `phases/2-mvp/index.json`의 step 1 업데이트.
4. 커밋 — 코드 변경(`feat:`)과 메타데이터(`chore:`) 분리 커밋

## 금지사항

- `getLastReadAtFromSupabase`를 Vitest 테스트에서 import 금지. 이유: server-only 가드가 Vitest 환경에서 번들 에러를 발생시킴.
- `getLastReadAtFromStore`에서 전체 세션 목록 외에 별도 IndexedDB 쿼리를 추가 금지. 이유: LocalStore는 전체 재읽기 방식이며, 정렬은 메모리 내에서 충분.
- 에러 발생 시 throw 금지. 이유: bear state는 부가 정보이므로 실패해도 앱이 정상 동작해야 함. null 반환으로 graceful 폴백.
- 기존 테스트를 깨뜨리지 마라.
