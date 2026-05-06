# Step 1: apply-to-aladin-routes

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/rate-limit.ts` — step 0의 `checkAndConsume` API
- `src/lib/rate-limit.test.ts` — 테스트 패턴 참조
- `src/lib/errors.ts` — `RATE_LIMITED` 코드
- `src/lib/env.ts` — `NEXT_PUBLIC_APP_URL` 노출 방식
- `src/app/api/books/search/route.ts` — 검색 라우트(현재 5-36 줄)
- `src/app/api/books/search/route.test.ts` — 기존 테스트
- `src/app/api/books/isbn/route.ts` — ISBN 조회 라우트
- `src/app/api/books/isbn/route.test.ts` — 기존 테스트

## 배경

step 0에서 만든 토큰 버킷을 두 라우트에 적용한다. 추가로 Origin/Referer 화이트리스트 검사를 통해 직접 호출(curl 등) 차단의 첫 번째 방어선을 둔다(완벽하진 않지만 자동화 봇은 거른다).

## 작업

### 1. 공통 헬퍼 `src/app/api/books/_guard.ts` 신규

```ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { checkAndConsume } from '@/lib/rate-limit'

export type GuardConfig = {
  rate: number       // 분당 허용 횟수 (예: 30)
  per?: number       // 단위 ms (default 60_000)
  scope: string      // 'aladin-search' | 'aladin-isbn' 등
}

export type GuardResult =
  | { ok: true; clientKey: string }
  | { ok: false; response: NextResponse }

export function applyApiGuard(req: NextRequest, cfg: GuardConfig): GuardResult
```

핵심 규칙:

#### 1) Origin / Referer 검사
- `process.env.NEXT_PUBLIC_APP_URL`(production)과 `localhost:3000`(dev)을 화이트리스트로.
- `req.headers.get('origin')` 또는 `referer`의 origin이 화이트리스트에 없으면 403 + `{ ok: false, error: { code: 'FORBIDDEN', message: '허용되지 않은 출처입니다' } }`.
- 단, 두 헤더가 모두 없는 직접 호출(서버 사이드 fetch)도 일단 거부. 향후 SSR에서 호출 필요해지면 서버 토큰 헤더로 풀어줄 것.

#### 2) IP 키 추출
- `x-forwarded-for`의 첫 항목 또는 `req.headers.get('x-real-ip')` 또는 `'anonymous'` fallback.
- key 형식: `${cfg.scope}:${ip}`.

#### 3) 토큰 버킷
- `checkAndConsume(key, { rate: cfg.rate, per: cfg.per ?? 60_000 })`.
- `allowed=false`면 429 + `Retry-After` 헤더(초 단위, `Math.ceil(retryAfterMs/1000)`) + body `{ ok: false, error: { code: 'RATE_LIMITED', message: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요' } }`.
- `allowed=true`면 `{ ok: true, clientKey: key }` 반환.

### 2. `src/app/api/books/search/route.ts` 가드 적용

핸들러 진입 직후:
```ts
const guard = applyApiGuard(req, { rate: 30, scope: 'aladin-search' })
if (!guard.ok) return guard.response
```

기존 동작은 그대로.

### 3. `src/app/api/books/isbn/route.ts` 가드 적용

ISBN은 검색보다 빈도 낮으므로 더 보수적으로:
```ts
const guard = applyApiGuard(req, { rate: 60, scope: 'aladin-isbn' })
if (!guard.ok) return guard.response
```

### 4. 테스트 추가

#### `src/app/api/books/_guard.test.ts` 신규 (최소 8)
- 정상 origin → `{ ok: true }`
- 잘못된 origin → 403
- 두 헤더 모두 없음 → 403
- localhost 허용(dev 모드 가정)
- rate 30 초과 → 429 + Retry-After 헤더 존재
- 다른 IP는 독립 카운트
- 다른 scope는 독립 카운트
- env.NEXT_PUBLIC_APP_URL 변경 시 화이트리스트 반영(테스트는 모듈 모킹 사용)

#### `search/route.test.ts`, `isbn/route.test.ts` 추가 케이스 (각 3)
- 가드 통과 후 기존 동작
- 가드 실패 시 알라딘 호출 안 됨(`fetch` 또는 `searchByKeyword` 모킹으로 검증)
- 429 응답에 `Retry-After` 헤더 존재

테스트마다 `__resetRateLimitStore()`를 `beforeEach`에서 호출해 격리.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

새 테스트 통과 + 기존 라우트 테스트 회귀 없음. 특히 `route.test.ts` 기존 케이스는 적절한 `Origin` 헤더를 추가해 통과시켜라.

## 검증 절차

1. AC 커맨드 실행.
2. 수동 테스트(선택):
   ```bash
   bun dev
   curl 'http://localhost:3000/api/books/search?q=node'  # Origin 헤더 없음 → 403
   curl -H 'Origin: http://localhost:3000' 'http://localhost:3000/api/books/search?q=node'  # 200
   for i in {1..35}; do curl -H 'Origin: http://localhost:3000' 'http://localhost:3000/api/books/search?q=test'; done  # 30회 이후 429
   ```
3. `phases/12-aladin-route-protection/index.json` step 1 업데이트.
4. 커밋:
   - `feat(12-aladin-route-protection): step 1 — apply-to-aladin-routes`
   - `chore(12-aladin-route-protection): step 1 output`

## 금지사항

- 가드 헬퍼를 `src/lib/`에 두지 마라. 이유: `next/server` 의존이 있어 라우트 전용. `src/app/api/books/_guard.ts`로 두어 라우트 영역에 캡슐화.
- 가드 우회용 환경변수(예: `DISABLE_RATE_LIMIT=true`)를 추가하지 마라. 이유: 운영 안전망 약화.
- 인증된 사용자의 rate를 비인증보다 후하게 풀어주지 마라(이번 step). 이유: 알라딘 키는 사용자 무관 공용이라 관계 없음. 추후 사용자별 정책은 별도 phase.
- `aladin.ts` 본체를 수정하지 마라 — step 2 책임.
- `RATE_LIMITED` HTTP 상태를 429가 아닌 다른 값으로 매핑하지 마라.
- Origin 화이트리스트에 와일드카드 도메인을 두지 마라.