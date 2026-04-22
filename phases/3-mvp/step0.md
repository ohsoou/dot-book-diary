# Step 0: lamp-state-pure-fn

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ADR.md` (ADR-021, ADR-022 참조하여 작성 스타일 파악)
- `/src/lib/theme.ts` — localStorage 접근 없이 순수 함수 패턴 참조
- `/src/lib/reading-timer.ts` — localStorage 래퍼 패턴 참조

## 배경

밤 테마에서 램프를 클릭하면 on/off를 토글하고, 이 상태를 `localStorage`에 유지해 재방문 시 복원한다. 이 step에서는 localStorage 접근만 담당하는 순수 유틸 모듈을 작성한다.

## 작업

### 1. `src/lib/lamp-state.ts` 생성

```ts
export type LampState = 'on' | 'off'
export const LAMP_STATE_KEY = 'dbd:lamp_state'

// localStorage에서 lamp 상태를 읽어 반환한다. 기본값: 'on'.
export function readLampState(): LampState

// localStorage에 lamp 상태를 저장한다.
export function writeLampState(state: LampState): void
```

구현 규칙:
- SSR 안전: `typeof window === 'undefined'`이면 `readLampState`는 `'on'` 반환, `writeLampState`는 no-op.
- `localStorage` 접근 시 `try/catch`로 감싼다 (private 브라우징/쿠키 차단 환경 방어). 읽기 실패 시 `'on'` 반환, 쓰기 실패 시 무시.
- 파싱: `localStorage.getItem(LAMP_STATE_KEY)` 값이 `'on'` 또는 `'off'`가 아니면 `'on'`으로 폴백.
- `import 'server-only'` 추가 금지. 이유: 클라이언트 컴포넌트(`RoomScene`)에서 import해야 하므로.

### 2. `src/lib/lamp-state.test.ts` 생성 (먼저 작성)

테스트는 jsdom 환경(Vitest 기본)에서 실행된다. `localStorage`는 jsdom이 제공한다.

1. `readLampState()` — localStorage 미설정 시 `'on'` 반환
2. `readLampState()` — `'off'`로 설정된 경우 `'off'` 반환
3. `readLampState()` — 알 수 없는 값인 경우 `'on'` 폴백
4. `writeLampState('off')` → `readLampState()` = `'off'`
5. `writeLampState('on')` → `readLampState()` = `'on'`

## Acceptance Criteria

```bash
bun test src/lib/lamp-state.test.ts
bun run build
bun lint
```

## 검증 절차

1. AC 커맨드 실행.
2. `src/lib/lamp-state.ts`에 `import 'server-only'`가 없는지 확인.
3. `readLampState`, `writeLampState`, `LampState`, `LAMP_STATE_KEY` 모두 export되는지 확인.
4. 결과에 따라 `phases/3-mvp/index.json` step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "lamp-state.ts 생성: readLampState/writeLampState/LampState/LAMP_STATE_KEY export, localStorage 안전 접근"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`
5. 커밋 — 코드(`feat:`), 메타데이터(`chore:`) 분리.

## 금지사항

- `import 'server-only'` 추가 금지. 이유: 클라이언트 전용 모듈에서 import하므로 서버 가드 불필요.
- localStorage 접근 실패 시 throw 금지. 이유: 램프 상태는 부가 정보이므로 앱이 정상 동작해야 함.
- 기존 테스트를 깨뜨리지 마라.