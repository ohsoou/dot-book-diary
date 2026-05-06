# Step 0: rate-limiter-utility

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md` — 의존성 계층 (`src/lib/` 유틸 위치)
- `docs/ARCHITECTURE.md` — 외부 API 처리 정책
- `src/lib/aladin.ts` — 알라딘 API 래퍼(`'server-only'` 임포트 확인)
- `src/lib/errors.ts` — `AppError`, `AppErrorCode`(`UPSTREAM_FAILED`, `RATE_LIMITED` 코드 존재 여부 확인. 없으면 본 step에서 추가)

## 배경

`src/app/api/books/search/route.ts`와 `isbn/route.ts`는 익명 사용자에게 무제한 호출을 허용하고 알라딘 API 키를 그대로 프록시한다. 일일 한도(5000회) 소진 위험이 큼.

이 step에서는 **인메모리 토큰 버킷 유틸리티만** 만든다. 실제 라우트 적용은 step 1에서, 캐싱은 step 2에서. 정식 분산 환경에선 Upstash/Vercel KV가 필요하지만 v1은 단일 인스턴스 in-memory로 충분(Vercel Fluid Compute 인스턴스 재사용으로 어느 정도 효과 있음).

## 작업

### 1. `src/lib/errors.ts`에 `RATE_LIMITED` 추가

`AppErrorCode` 유니온에 `'RATE_LIMITED'`가 없으면 추가. HTTP 매핑은 429.

`docs/ARCHITECTURE.md` §11 HTTP 표에 `RATE_LIMITED → 429` 행 추가. ADR이 필요하면 등록(현재 마지막 ADR 번호 +1).

`src/lib/errors.test.ts`에 `RATE_LIMITED` 케이스 1개 추가.

### 2. `src/lib/rate-limit.ts` 신규

```ts
import 'server-only'

export type RateLimitOptions = {
  rate: number      // 허용 토큰 수
  per: number       // 단위 시간(ms)
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number       // 남은 토큰
  retryAfterMs: number    // allowed=true면 0
  resetAt: number         // ms epoch
}

// 메모리 안에서 키 단위로 토큰 버킷을 유지한다.
// 호출 시 토큰을 1개 소비하려 시도하고 결과를 돌려준다.
export function checkAndConsume(key: string, options: RateLimitOptions): RateLimitResult

// 테스트용: 내부 상태 초기화
export function __resetRateLimitStore(): void
```

핵심 규칙:
- 인메모리 `Map<string, { tokens: number; lastRefill: number }>`을 모듈 레벨에 둔다.
- 호출 시 `(now - lastRefill) / per * rate`만큼 토큰 보충(상한 `rate`).
- 토큰이 1 이상이면 1 차감하고 `allowed: true`, 아니면 `allowed: false` + `retryAfterMs = ((1 - tokens) / rate) * per`.
- `Map`은 무한 증가하지 않게 마지막 접근 시각 기준 1시간 지난 항목을 가끔 청소(호출당 1회 확률적 청소 또는 size 임계 초과 시 일괄). 단순히 size 1만 초과 시 LRU eviction으로 충분.
- timezone/시계 단조성 가정: `Date.now()` 사용. 테스트에서 `vi.useFakeTimers`로 시간 진행 검증.

### 3. `src/lib/rate-limit.test.ts` 신규

테스트 케이스(최소 8):
- 첫 호출 → `allowed: true`, `remaining: rate-1`
- rate회 연속 호출 후 (rate+1)회째 → `allowed: false`, `retryAfterMs > 0`
- 시간이 `per` 절반만 지난 뒤 → 토큰 절반 보충 검증
- 시간이 `per` 이상 지난 뒤 → 토큰 풀 보충(상한 rate)
- 다른 key는 독립 카운트
- `__resetRateLimitStore()` 후 카운터 초기화
- `retryAfterMs`가 음수가 되지 않는지(부동소수 오차 방지)
- 1개 토큰 미만 상태에서 정확히 1 토큰 보충된 시점 호출 → allowed

`vi.useFakeTimers` + `vi.advanceTimersByTime`으로 결정론적 검증.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

새 테스트 8개 이상 통과 + 기존 테스트 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `cat src/lib/errors.ts | grep RATE_LIMITED` — 코드 존재 확인.
3. `phases/12-aladin-route-protection/index.json` step 0 업데이트.
4. 커밋:
   - `feat(12-aladin-route-protection): step 0 — rate-limiter-utility`
   - `chore(12-aladin-route-protection): step 0 output`

## 금지사항

- 외부 패키지(rate-limiter-flexible, p-limit, bottleneck 등) 추가 금지. 이유: in-memory 단순 구현으로 v1 충분.
- Vercel KV / Upstash Redis 통합을 시도하지 마라. 이유: 환경변수와 비용 영향. 별도 ADR 필요.
- 라우트 핸들러를 수정하지 마라 — step 1 책임.
- `aladin.ts`의 캐싱 로직을 수정하지 마라 — step 2 책임.
- `rate-limit.ts`에 `'server-only'` 임포트 누락하지 마라 — 클라이언트 번들에 절대 포함되면 안 된다.
- 글로벌 `Map`을 `globalThis`에 부착해 핫 리로드 영향 받지 않게 하지 마라(개발 중 메모리 누수 우려). 모듈 스코프 변수로 충분 — Next.js dev 환경에서 핫 리로드 시 카운터가 리셋되는 점은 테스트에 영향 없음.