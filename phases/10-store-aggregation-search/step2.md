# Step 2: remote-store-aggregation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/storage/RemoteStore.ts` — Supabase 구현
- `src/lib/storage/RemoteStore.test.ts` — 모킹 패턴
- `src/lib/storage/LocalStore.ts` — step 1에서 구현된 의미론(결과 형태). RemoteStore가 동일 결과를 내야 한다.
- `src/lib/supabase/server.ts` — 서버 클라이언트
- `src/types/supabase.ts` (있다면) — DB 스키마. 없으면 `bun db:types` 실행 후 진행
- `CLAUDE.md` — RLS 정책: 모든 쿼리에 `user_id = auth.uid()` 필수

## 배경

회원 환경은 데이터가 누적된다. SQL aggregate를 사용해 클라이언트로 raw 세션을 끌어오지 않는다. RPC(stored function) 또는 PostgreSQL aggregate를 직접 select 한다. 본 step에서는 추가 마이그레이션 없이 기존 테이블에서 동작하도록 SQL을 짠다(RPC 도입은 추후 별도 phase).

## 작업

### 1. `RemoteStore.ts` 5개 메서드 구현

#### `getReadingStats(period?)`

```ts
const supabase = await this.getClient()
let q = supabase
  .from('reading_sessions')
  .select('duration_minutes, start_page, end_page, read_date, book_id')
  .eq('user_id', userId)
if (period) q = q.gte('read_date', period.from).lte('read_date', period.to)
const { data, error } = await q
// reduce in memory — supabase-js v2가 group by aggregate를 지원하지 않는 한 클라이언트 reduce가 v1로 충분
```

`select` 컬럼은 필요한 것만 받아 네트워크를 줄인다. RLS는 자동 적용.

#### `getReadingStreak()`

```ts
const { data } = await supabase
  .from('reading_sessions')
  .select('read_date')
  .eq('user_id', userId)
  .order('read_date', { ascending: false })
```

읽은 날짜만 distinct(클라이언트에서 Set으로 처리). 그 외 계산은 LocalStore와 동일.

#### `listSessionsGroupedByDate(period)`

```ts
const { data } = await supabase
  .from('reading_sessions')
  .select('read_date, duration_minutes, book_id')
  .eq('user_id', userId)
  .gte('read_date', period.from)
  .lte('read_date', period.to)
  .order('read_date', { ascending: true })
```

클라이언트 reduce. 결과 형태는 step 1과 동일.

#### `searchDiaryEntries(query)`

본문 검색은 `ilike`로 1차 도입(향후 fulltext index는 별도 ADR):

```ts
let q = supabase
  .from('diary_entries')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(query.limit ?? 50)

if (query.q) q = q.ilike('body', `%${escapeLikePattern(query.q)}%`)
if (query.bookId) q = q.eq('book_id', query.bookId)
if (query.entryType) q = q.eq('entry_type', query.entryType)
if (query.from) q = q.gte('created_at', `${query.from}T00:00:00`)
if (query.to) q = q.lte('created_at', `${query.to}T23:59:59`)
if (query.cursor) q = q.lt('id', query.cursor) // 정렬이 created_at desc + id로 stable하지 않으므로 v1은 cursor 무시 가능
```

`escapeLikePattern`은 `src/lib/escape.ts`를 활용하거나 새 헬퍼 추가(`%`/`_`/`\` 이스케이프). SQL 인젝션 방지.

`cursor`는 v1에서 무시해도 OK — 시그니처만 유지. 단 limit는 반드시 적용.

#### `countBooks()`

```ts
const { count } = await supabase
  .from('books')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
return count ?? 0
```

### 2. `RemoteStore.test.ts`에 테스트 추가 (최소 14개)

`@/lib/supabase/server`를 모킹하고 메서드 체이닝을 흉내내는 빌더 모킹을 사용:

```ts
const queryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  // 마지막에 await 시 반환되는 thenable
  then: (cb: any) => cb({ data: [...], error: null }),
}
```

검증 케이스:
- `getReadingStats`: period 있을 때 `gte`/`lte` 호출됨, reduce 결과 정확
- `getReadingStreak`: order desc 호출, 결과 정확
- `listSessionsGroupedByDate`: 그룹핑 결과 정확, 정렬
- `searchDiaryEntries`: q 있을 때 `ilike` 호출됨, q에 `%` 포함된 경우 escape 검증, 필터 조합, limit 적용
- `countBooks`: count 옵션 사용 검증, count null → 0

### 3. (선택) Supabase 인덱스 가이드 문서화

성능 권장: `reading_sessions(user_id, read_date)` 인덱스, `diary_entries(user_id, created_at)` 인덱스. 추가 마이그레이션 SQL은 본 phase에서 적용하지 말고 `docs/ADR.md`에 ADR-031로 "phase 10 인덱스 권장 — 후속 적용"만 남길 것.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

새 테스트 통과 + 기존 RemoteStore 테스트 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `grep -n "not implemented" src/lib/storage/RemoteStore.ts` 결과 0건.
3. LocalStore 결과와 RemoteStore 결과의 형태(필드명, 정렬, 빈 케이스 처리)가 일치하는지 코드 리뷰.
4. `phases/10-store-aggregation-search/index.json` step 2 업데이트. summary에 "step 1과 결과 형태 일치 검증 완료" 명시.
5. 커밋:
   - `feat(10-store-aggregation-search): step 2 — remote-store-aggregation`
   - `chore(10-store-aggregation-search): step 2 output`

## 금지사항

- 실제 Supabase 인스턴스에 인덱스를 추가하지 마라. 이유: 실 DB 변경은 별도 마이그레이션 phase 필요.
- RPC(stored function)를 도입하지 마라. 이유: 본 phase 범위 외, ADR 필요.
- `service_role` 키를 사용하지 마라. RLS 우회 금지.
- 검색에서 사용자 입력 `query.q`를 그대로 `ilike` 패턴에 넣지 마라 — 반드시 `escapeLikePattern`으로 `%`/`_`/`\` 이스케이프.
- LocalStore 메서드를 다시 손대지 마라 — step 1에서 락인됨.
- `client-actions` facade(phase 9)에 노출하지 마라 — 본 phase 종료 후 별도 작업으로 분리.