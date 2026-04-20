# Step 6: reading-timer

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/PRD.md` (§5 F4, §12 도메인 정책 타이머 관련 행)
- `/docs/ARCHITECTURE.md` (§22.1 독서 타이머 지속성)
- `/docs/ADR.md` (ADR-019)
- `/docs/UI_GUIDE.md` (ReadingTimer 컴포넌트 사양)
- `/src/components/book/ReadingSessionForm.tsx`
- `/src/components/ui/ConfirmDialog.tsx`
- `/src/components/ui/Button.tsx`

## 작업

독서 타이머 라이브러리와 UI 컴포넌트를 추가하고 `ReadingSessionForm`에 통합한다.

### 1. `src/lib/reading-timer.ts`

```ts
export type TimerStatus = 'running' | 'paused' | 'stopped';
export type TimerState = {
  bookId: string;
  startedAt: number;        // Date.now() ms (최초 시작 시점)
  pausedAt: number | null;  // 일시정지 진입 ms
  accumulatedMs: number;    // 누적된(이전 run 구간 합) ms. paused 시점에 갱신
  status: 'running' | 'paused';  // stopped는 localStorage 제거로 표현
};

export function read(): TimerState | null;
export function start(bookId: string): TimerState;  // 다른 활성 타이머가 있으면 throw
export function pause(): TimerState;                 // running에서만 호출
export function resume(): TimerState;                // paused에서만 호출
export function stop(): { bookId: string; seconds: number } | null;  // 없으면 null
export function clear(): void;                       // 단순 제거
export function elapsedMs(state: TimerState, now?: number): number;
```

- localStorage 키: `'dbd:reading_timer'`.
- `start`에서 기존 state가 있으면 `AppError('VALIDATION_FAILED', '이미 실행 중인 타이머가 있어요')` throw.
  - caller가 먼저 `read()`로 확인하고 `stop()`/`clear()`한 뒤 `start` 호출하도록 한다.
- `elapsedMs`:
  - `status === 'running'` → `accumulatedMs + (now - (pausedAt ?? startedAt))` 식 조심. 명확하게 구성:
    - running: `accumulatedMs + (now - lastResumedAt)` — 단 `lastResumedAt`을 저장하지 않는다면 `accumulatedMs`를 resume 시점에 갱신했는지 여부로 결정. 구현 편의상 `pausedAt`을 사용해 paused 누적 시 `accumulatedMs += pausedAt - lastStartMarker` 식으로 적절히 처리.
  - 구현 재량. 단, 일시정지→재개→정지가 누적이 맞아야 한다. 테스트로 증명한다.
- `window` 미정의 환경(서버)에서 호출되면 `read()`는 `null`, 나머지는 no-op 또는 throw. SSR 안전.

### 2. `src/components/book/ReadingTimer.tsx`

```ts
interface ReadingTimerProps {
  bookId: string;
  onStop: (seconds: number) => void;  // 폼의 durationMinutes 프리필 콜백
}
```

- `'use client'`.
- 1초 `setInterval`로 `elapsedMs` 재계산 → HH:MM:SS 표시(`tabular-nums`).
- 상태별 버튼(`stopped` / `running` / `paused`)은 UI_GUIDE `ReadingTimer` 섹션 따름.
- `start` 시 다른 책의 활성 타이머가 있으면 `ConfirmDialog` 노출 → 확인 시 기존 `clear()` 후 `start(bookId)`.
- `stop` 시 `onStop(seconds)` 호출, `ConfirmDialog` 없이 즉시 종료(되돌릴 수 없음 문구 없음 — 사용자 의도적 정지).
- `storage` 이벤트 구독으로 다른 탭 변경 반영(상태만 재조회, 버튼 가시성 갱신).
- 컴포넌트 unmount 시 `setInterval` 정리. `storage` 리스너 정리.

### 3. `ReadingSessionForm.tsx` 통합

- 상단 책 메타 영역 아래, "독서 기록 추가" 섹션 위에 `<ReadingTimer bookId={book.id} onStop={...} />` 삽입.
- `onStop(seconds)`:
  - `Math.round(seconds / 60)`을 `fields.durationMinutes`로 세팅.
  - `setFields(prev => ({ ...prev, durationMinutes: String(minutes) }))`.
  - `durationMinutes` 필드로 포커스 이동(옵션: `document.getElementById('durationMinutes')?.focus()`).
  - 자동 제출 금지.

### 4. 테스트

- `reading-timer.test.ts`:
  - start → elapsedMs 증가(mock `Date.now`).
  - pause → elapsedMs 고정.
  - resume → 재증가(누적).
  - stop → 저장 제거 + 누적 초 반환.
  - start 중복 시 throw.
  - 탭간: `storage` 이벤트로 read 결과 갱신(간단 단위는 mock으로).
- `ReadingTimer.test.tsx`:
  - 초기 stopped → [시작] 표시.
  - 시작 후 running → [일시정지] [정지].
  - 일시정지 클릭 → paused → [재개] [정지].
  - 정지 → `onStop` 호출(초 인자).
  - 다른 책 활성 시 start → ConfirmDialog 등장.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - localStorage 키가 `dbd:reading_timer` 정확히인가?
   - SSR에서 `window`/`localStorage` 접근 없이 모듈이 로드되는가?
   - `stop()`이 분 반올림을 수행하지 않는다(초 반환, 반올림은 caller가)?
   - 단일 활성 타이머 규칙이 강제되는가?
3. `phases/1-mvp/index.json` step 6 업데이트.
4. 커밋 분리.

## 금지사항

- `performance.now()` 사용 금지. 이유: 백그라운드 탭에서 throttling 영향. ADR-019 명시.
- 초 단위 컬럼 추가하지 마라. 이유: ADR-019, 스키마 최소화.
- 자동 저장(`addReadingSession`) 금지. 이유: 날짜/페이지 확인 여지 필요.
- 기존 테스트를 깨뜨리지 마라.