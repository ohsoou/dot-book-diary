# Step 4: guest-bear-hydrator

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.5 Letterbox HUD — 비회원 항목)
- `/docs/ADR.md` (ADR-021 결과/제약 — 비회원 hydration)
- `/src/components/theme/ThemeHydrator.tsx` — 동일 패턴 참조 필수
- `/src/lib/storage/index.ts` — `useStore()` 패턴 확인
- `/src/lib/bear-state.ts` — step 0에서 생성됨
- `/src/lib/last-read.ts` — step 1에서 생성됨 (`getLastReadAtFromStore`)
- `/src/components/room/BearStatusBar.tsx` — step 3에서 생성됨
- `/src/components/room/LastReadNote.tsx` — step 3에서 생성됨
- `/src/app/page.tsx` — step 3에서 수정됨. 현재 비회원 HUD가 null인 상태 파악 필수.

## 배경

step 3에서 회원은 SSR에서 `lastReadAt`을 조회하여 HUD와 `RoomScene`에 내려준다. 비회원은 서버에서 IndexedDB에 접근할 수 없으므로 `lastReadAt = null`, `bearAsset = undefined`, `bearLabel = null` 상태로 초기 렌더된다.

이 step에서는 `ThemeHydrator` 패턴으로 비회원 클라이언트 hydration을 구현한다:
- 마운트 시 LocalStore에서 `lastReadAt` 조회
- `computeBearState` 계산
- Context를 통해 `BearStatusBar`, `LastReadNote`, `RoomScene` 업데이트

## 작업

### 1. `src/components/room/BearStateContext.tsx` 생성

```ts
interface BearStateContextValue {
  bearAsset: string | undefined
  bearLabel: string | null
  lastReadAt: string | null
}

const BearStateContext = createContext<BearStateContextValue>({
  bearAsset: undefined,
  bearLabel: null,
  lastReadAt: null,
})

export function BearStateProvider({
  children,
  initial,  // 서버에서 내려준 초기값 (회원) 또는 { bearAsset: undefined, bearLabel: null, lastReadAt: null } (비회원)
}: {
  children: React.ReactNode
  initial: BearStateContextValue
})

export function useBearState(): BearStateContextValue
```

`BearStateProvider`는 `initial`을 초기 state로 가지며, hydrator가 업데이트 가능하도록 `setter`도 Context에 포함하거나, 별도 Provider 패턴으로 구현. 구현 방식은 에이전트 재량.

### 2. `src/components/room/BearStateHydrator.tsx` 생성

```ts
'use client'

interface BearStateHydratorProps {
  isGuest: boolean  // true일 때만 hydration 실행
}

export function BearStateHydrator({ isGuest }: BearStateHydratorProps)
```

- `isGuest === false`이면 아무것도 하지 않고 `null` 반환 (SSR 값이 정답).
- `isGuest === true`이면 마운트 시 1회 실행:
  1. `useStore()` (클라이언트, LocalStore 반환)
  2. `getLastReadAtFromStore(store)` 호출
  3. `computeBearState(lastReadAt, { now: new Date() })` 계산
  4. Context setter로 `bearAsset`, `bearLabel`, `lastReadAt` 업데이트
- `useEffect` 1회 실행 (deps: `[]` 또는 `[isGuest]`).

### 3. `src/app/page.tsx` — Provider + Hydrator 연결

`BearStateProvider`로 `<main>` 내부 감싸기:
- `initial` prop: 회원이면 SSR 계산 결과, 비회원이면 null 초기값.
- `BearStateHydrator`를 `<main>` 내 어딘가에 배치 (렌더 출력 없음).
- `BearStatusBar`, `LastReadNote`, `RoomScene`이 Context에서 값을 읽도록 수정.

`page.tsx`는 서버 컴포넌트이므로, `BearStateProvider`와 `BearStateHydrator`는 `'use client'`. Context는 이미 `'use client'` 모듈에 있으므로, `page.tsx`에서는 서버 데이터를 `initial` prop으로 전달하는 구조.

### 4. 테스트 (먼저 작성)

`src/components/room/BearStateHydrator.test.tsx`:

1. `isGuest={false}` → LocalStore 호출 없음 (vi.mock 확인)
2. `isGuest={true}`, LocalStore에 세션 0건 → `lastReadAt = null`, `bearAsset = undefined`
3. `isGuest={true}`, LocalStore에 세션 1건 (1주일 이상 경과) → `bearAsset = 'Bear_sleeping.png'`
4. Context 업데이트 후 `BearStatusBar`에 "곰이 자고 있어요" 렌더 확인

## Acceptance Criteria

```bash
bun test src/components/room/BearStateHydrator.test.tsx
bun run build
bun lint
```

## 검증 절차

1. AC 커맨드 실행.
2. 개발 서버에서 비회원(`/`)으로 진입 시:
   - 초기 렌더: HUD 공간 있음 + 텍스트 null (빈 자리).
   - 마운트 후: LocalStore 세션 없으면 "곰이 책을 기다려요" / "아직 독서 기록이 없어요" 표시.
3. 비회원 데이터가 서버로 전송되지 않는지 확인 (Network 탭: `reading_sessions` API 호출 없음).
4. 회원 상태에서 `BearStateHydrator`가 아무것도 호출하지 않는지 확인.
5. 결과에 따라 `phases/2-mvp/index.json`의 step 4 업데이트.
6. 커밋 — 코드 변경(`feat:`)과 메타데이터(`chore:`) 분리 커밋

## 금지사항

- 비회원 데이터(reading_sessions)를 서버로 전송 금지. 이유: CLAUDE.md CRITICAL 규칙.
- `getLastReadAtFromSupabase`를 `BearStateHydrator`에서 호출 금지. 이유: server-only 모듈이므로 클라이언트에서 import 불가.
- `useStore()`를 서버 컴포넌트에서 호출 금지. 이유: `useStore()`는 클라이언트 전용(LocalStore 반환).
- 기존 테스트를 깨뜨리지 마라.
