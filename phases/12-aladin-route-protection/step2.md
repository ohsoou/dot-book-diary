# Step 2: caching-and-revalidate-tuning

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/aladin.ts` — 알라딘 API 래퍼. `searchByKeyword` / `lookupByIsbn` 두 함수
- `src/lib/aladin.test.ts` — 기존 테스트
- `src/app/api/books/search/route.ts`, `isbn/route.ts` — step 1 가드 적용된 상태
- `src/lib/rate-limit.ts` — 가드 토큰 버킷(이번 step과 직접 의존은 없으나 정책 일관성 참고)

## 배경

step 1에서 외부 호출 빈도는 막혔지만, 동일 키워드/ISBN 반복 조회는 여전히 알라딘에 매번 닿는다. v1 단순 in-memory LRU로 검색 결과를 캐시해 알라딘 호출 자체를 줄인다. 이는 토큰 버킷보다 우선해 효과를 낸다(같은 사용자가 반복 검색해도 외부 호출 0회).

## 작업

### 1. `src/lib/lru-cache.ts` 신규

```ts
import 'server-only'

export type LruCacheOptions = {
  max: number          // 최대 항목 수
  ttlMs: number        // 항목별 만료 시간
}

export class LruCache<K, V> {
  constructor(opts: LruCacheOptions)
  get(key: K): V | undefined
  set(key: K, value: V): void
  delete(key: K): void
  size(): number
  __reset(): void      // 테스트용
}
```

핵심 규칙:
- 내부 `Map<K, { value: V; expiresAt: number }>`. JS `Map`은 삽입 순서 유지 → LRU 구현 용이.
- `get`에서 expired 항목 발견 시 즉시 삭제하고 undefined 반환.
- `get` hit 시 항목을 `Map`에서 삭제 후 재삽입(가장 최근으로 이동).
- `set` 시 size 초과면 가장 오래된 키(`map.keys().next().value`) 제거.

`src/lib/lru-cache.test.ts` 케이스(최소 7):
- set/get 정상
- TTL 초과 후 만료
- max 초과 시 LRU eviction
- get hit이 LRU 순서를 갱신
- delete 동작
- 같은 키 재set은 갱신
- `__reset()` 후 size 0

### 2. `aladin.ts` 캐싱 적용

`searchByKeyword`와 `lookupByIsbn` 진입부에 캐시 조회를 추가:

```ts
const SEARCH_CACHE = new LruCache<string, BookSearchResult[]>({ max: 200, ttlMs: 10 * 60 * 1000 })
const ISBN_CACHE = new LruCache<string, BookSearchResult | null>({ max: 500, ttlMs: 60 * 60 * 1000 })

export async function searchByKeyword(query: string): Promise<BookSearchResult[]> {
  const key = normalizeKeyword(query)  // trim + lowercase
  const cached = SEARCH_CACHE.get(key)
  if (cached) return cached
  // ... 기존 fetch 로직 ...
  SEARCH_CACHE.set(key, results)
  return results
}
```

ISBN은 정규화(`convertIsbn10to13` 결과)된 값을 키로. null 결과(미발견)도 캐시해 반복 음성 lookup을 차단.

### 3. `aladin.ts` `next: { revalidate: ... }` 정리

기존 `fetch` 옵션의 `next: { revalidate: 60 }`은 LruCache와 중복 효과. LruCache로 일원화하고 `revalidate` 옵션은 제거(또는 `cache: 'no-store'`로 명시해 의도 표현). 둘이 동시에 동작해 디버깅 어려워지는 점 회피.

### 4. 테스트 보강

#### `aladin.test.ts` 추가 (최소 5)
- 같은 키워드 재호출 시 fetch가 1회만 호출됨(`vi.spyOn(global, 'fetch')`)
- 다른 키워드는 새 fetch
- TTL 만료 후 새 fetch
- ISBN-10과 ISBN-13이 동일 키로 정규화돼 캐시 공유
- null 결과 캐싱(같은 미존재 ISBN 재조회 시 fetch 1회)

각 테스트 `beforeEach`에서 `SEARCH_CACHE.__reset()`/`ISBN_CACHE.__reset()` 또는 모듈 재임포트로 격리.

### 5. (선택) 사용 패턴 문서화

`docs/ARCHITECTURE.md` 외부 API 섹션에 "알라딘 결과는 in-memory LRU(검색 10분 / ISBN 60분) + 분당 토큰 버킷으로 보호한다"는 한 문단 추가.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

신규 테스트 통과 + 기존 회귀 없음. 특히 phase 12 step 0/1의 테스트도 모두 통과.

## 검증 절차

1. AC 커맨드 실행.
2. 수동(선택):
   ```bash
   bun dev
   # 같은 키워드 두 번 검색 후 서버 로그 또는 알라딘 응답 시간 확인
   ```
3. `phases/12-aladin-route-protection/index.json` step 2 업데이트. summary에 "phase 8~12 완료로 액션 테스트·facade·집계·도메인 확장·외부 API 보호의 v1 기반 완성" 명시.
4. 커밋:
   - `feat(12-aladin-route-protection): step 2 — caching-and-revalidate-tuning`
   - `chore(12-aladin-route-protection): step 2 output`

## 금지사항

- LRU 구현으로 외부 패키지(`lru-cache`, `quick-lru`) 추가 금지. 이유: 단순 구현으로 v1 충분.
- LRU `max`를 너무 키우지 마라(>1000). 이유: Vercel Fluid Compute 인스턴스 메모리 영향.
- 캐시 키에 사용자 식별자를 섞지 마라. 이유: 알라딘은 공용 데이터, 사용자 분리 불필요.
- `next: { revalidate }`와 LruCache를 동시에 두지 마라. 이유: 캐시 두 단계가 겹쳐 invalidation 추적 어려움.
- 라우트 핸들러를 수정하지 마라 — step 1에서 락인됨.
- 캐시 invalidation API를 노출하지 마라 — 본 phase 범위 외.