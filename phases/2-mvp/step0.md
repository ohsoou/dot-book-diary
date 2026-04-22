# Step 0: bear-state-pure-fn

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.4 곰 상태 파생)
- `/docs/ADR.md` (ADR-021 곰 상태 판정)
- `/docs/UI_GUIDE.md` (BearStatusBar / LastReadNote 스펙)
- `/src/lib/theme.ts` — MVP1의 resolveTheme 패턴 참조 (순수 함수 + 주입 가능한 now)

## 작업

`src/lib/bear-state.ts`와 `src/lib/bear-state.test.ts`를 생성한다.

### 요구사항

#### 타입

```ts
export type BearStateKind = 'fresh' | 'active' | 'sleeping'

export type BearAsset =
  | 'Bear.png'
  | 'Bear_drinking.png'
  | 'Bear_eating.png'
  | 'Bear_healing.png'
  | 'Bear_playing.png'
  | 'Bear_working.png'
  | 'Bear_sleeping.png'

export interface BearStateResult {
  state: BearStateKind
  asset: BearAsset
  label: string        // 한국어 라벨 (UI_GUIDE.md BearStatusBar 스펙 참고)
  elapsedMs: number | null  // null = lastReadAt이 null이거나 파싱 실패
}
```

#### 주요 함수

```ts
export function computeBearState(
  lastReadAt: string | null,
  opts: { now: Date; rng?: () => number }
): BearStateResult
```

- `lastReadAt`: `reading_sessions.created_at` (UTC ISO 문자열 또는 null)
- `opts.now`: 현재 시각 (테스트 주입용)
- `opts.rng`: 0~1 사이의 부동소수점을 반환하는 함수. **기본값은 하루+lastReadAt 해시 시드 기반 prng** (아래 설명). 테스트에서 결정적으로 주입 가능.

**판정 규칙**:
1. `lastReadAt === null` 또는 파싱 실패 → `fresh`, `Bear.png`, "곰이 책을 기다려요"
2. `elapsed < 0` (시계 역전) → `fresh`, `Bear.png`, "곰이 책을 기다려요"
3. `elapsed < 1h (3_600_000ms)` → `fresh`, `Bear.png`, "곰이 책을 읽고 왔어요"
4. `1h ≤ elapsed < 7d (604_800_000ms)` → `active`, variant 1택, "곰이 [행동]하고 있어요"
5. `elapsed ≥ 7d` → `sleeping`, `Bear_sleeping.png`, "곰이 자고 있어요"

**Active variant 선택**:
- 풀: `['Bear_drinking.png', 'Bear_eating.png', 'Bear_healing.png', 'Bear_playing.png', 'Bear_working.png']` (5종)
- `opts.rng()`로 인덱스 결정: `Math.floor(rng() * pool.length)`
- 기본 rng: `YYYY-MM-DD(now 로컬) + lastReadAt` 문자열을 mulberry32 시드로. 하루가 바뀌거나 새 독서 기록이 생기면 variant도 자연스럽게 바뀜.

**mulberry32 구현** (외부 라이브러리 없이):
```ts
function mulberry32(seed: number): () => number {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

**해시 함수** (문자열 → 32bit 정수):
```ts
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}
```

기본 rng 생성: `mulberry32(hashString(localDateStr + lastReadAt))`

#### formatElapsed

```ts
export function formatElapsed(elapsedMs: number): string
```

| 범위 | 반환 |
|------|------|
| < 60_000ms | "방금" |
| 60_000 ~ 3_599_999ms | "N분 전" |
| 3_600_000 ~ 86_399_999ms | "N시간 전" |
| 86_400_000 ~ 604_799_999ms | "N일 전" |
| ≥ 604_800_000ms | "N주 전" |

### 테스트 (먼저 작성)

`src/lib/bear-state.test.ts`:

1. `lastReadAt = null` → state `fresh`, asset `Bear.png`, label "곰이 책을 기다려요", elapsedMs null
2. 잘못된 ISO 문자열 → state `fresh`, elapsedMs null
3. elapsed = 59분59초 → `fresh`, "곰이 책을 읽고 왔어요"
4. elapsed = 1시간 정각 → `active` (경계 포함)
5. elapsed = 6일23시59분 → `active`
6. elapsed = 7일 정각 → `sleeping`
7. elapsed < 0 (now < lastReadAt) → `fresh`, "곰이 책을 기다려요"
8. active 상태에서 `rng = () => 0` → `Bear_drinking.png` (첫 번째)
9. active 상태에서 `rng = () => 0.99` → `Bear_working.png` (마지막)
10. `formatElapsed(0)` → "방금"
11. `formatElapsed(60_000)` → "1분 전"
12. `formatElapsed(3_600_000)` → "1시간 전"
13. `formatElapsed(86_400_000)` → "1일 전"
14. `formatElapsed(604_800_000)` → "1주 전"
15. 기본 rng 시드 일관성: 같은 날 + 같은 lastReadAt로 두 번 호출하면 동일 asset

## Acceptance Criteria

```bash
bun test src/lib/bear-state.test.ts
bun run build
bun lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `src/lib/bear-state.ts`가 React/Next.js import 없이 순수 TS임을 확인 (외부 의존성 없음).
3. `BearAsset` 타입에 `Bear_sleeping.png`가 포함되어 있으나 active variant 풀에는 제외되어 있는지 확인.
4. 결과에 따라 `phases/2-mvp/index.json`의 step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 3회 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "사유"` 후 즉시 중단
5. 커밋 — 코드 변경(`feat:`)과 메타데이터(`chore:`) 분리 커밋

## 금지사항

- `'use client'` 또는 React import 추가 금지. 이유: 이 파일은 서버/클라이언트 양쪽에서 import되는 순수 함수 모듈.
- `Math.random()` 직접 사용 금지. 이유: 테스트에서 결정적 검증이 불가능.
- `Bear_sleeping.png`를 active variant 풀에 포함 금지. 이유: 요구사항 위반.
- 외부 date 라이브러리(date-fns, dayjs 등) 추가 금지. 이유: CLAUDE.md 규칙(`lib/date.ts`의 순수 함수 패턴 준수, 외부 라이브러리 도입 금지).
- 기존 테스트를 깨뜨리지 마라.
