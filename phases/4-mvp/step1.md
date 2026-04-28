# Step 1: nickname-hydration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` (§22.4 곰 상태 파생, §22.5 Letterbox HUD)
- `docs/ADR.md` (ADR-016 닉네임 저장, ADR-022 HUD)
- `src/components/room/BearStateContext.tsx` — `BearStateContextValue` 인터페이스
- `src/components/room/BearStateHydrator.tsx` — 게스트 hydration 패턴
- `src/app/page.tsx` — 회원 SSR 흐름
- `src/lib/nickname.ts` (step 0에서 생성됨) — `getDisplayNickname()`
- `src/lib/storage/preferences.ts` — `getPreferences()` API (닉네임 읽기)

## 배경

step 0에서 `getDisplayNickname()` 헬퍼가 생성됐다.
이 step에서 닉네임 값을 `BearStateContextValue`에 추가하고, 회원(SSR)/게스트(클라이언트) 양쪽에서 채워 넣는다.
step 2의 `BearSpeechBubble`은 이 context에서 `nickname`을 읽어 헤더로 표시한다.

## 작업

### 1. `src/components/room/BearStateContext.tsx`

`BearStateContextValue`에 `nickname: string` 필드 추가:

```ts
export interface BearStateContextValue {
  bearAsset: string | undefined
  bearLabel: string | null
  lastReadAt: string | null
  nickname: string           // ← 추가. 항상 getDisplayNickname()으로 폴백된 값
}
```

`defaultState`의 `nickname`은 `getDisplayNickname(undefined)` 결과(`'책곰이'`)로 초기화한다.

### 2. `src/app/page.tsx` — 회원 SSR 흐름

- `profiles.select('theme_preference, nickname')` 으로 필드 확장
- `initialBearState` 생성 시 `nickname: getDisplayNickname(profile?.nickname)` 추가
- `computeBearState` 호출은 변경하지 않는다
- `BearStatusBar` import와 `<BearStatusBar />` 렌더는 **이 step에서 제거하지 않는다** (step 2에서 말풍선과 함께 교체)

### 3. `src/components/room/BearStateHydrator.tsx` — 게스트 클라이언트 hydration

- `getPreferences()` (이미 `preferences.ts`에 존재)를 import하여 `prefs.nickname`을 읽는다
- `setGuestState` 호출 시 `nickname: getDisplayNickname(prefs.nickname)` 추가
- 비동기 순서: `getPreferences()` → `getLastReadAtFromStore(store)` → `computeBearState` → `setGuestState`. 가능하면 두 I/O를 `Promise.all`로 병렬 실행하되 취소 로직은 기존 패턴(`cancelled` 플래그) 유지.

### 4. 테스트 업데이트

`src/components/room/BearStateHydrator.test.tsx`에 다음 케이스 추가:

- 게스트 preferences에 nickname이 설정된 경우 → context의 `nickname`이 해당 값
- preferences에 nickname이 없는 경우 → context의 `nickname`이 `'책곰이'`
- preferences에 nickname이 빈 문자열인 경우 → context의 `nickname`이 `'책곰이'`

## Acceptance Criteria

```bash
bun test src/components/room/BearStateHydrator.test.tsx
bun build
```

에러 없음. 기존 테스트 전부 통과 + 신규 케이스 통과.

## 검증 절차

1. 위 AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - `BearStateContextValue.nickname`이 항상 string(never null)인가?
   - `page.tsx`에서 `profiles.select`에 `nickname` 필드가 추가됐는가?
   - `BearStatusBar`는 아직 제거되지 않고 그대로인가? (step 2에서 처리)
3. `phases/4-mvp/index.json` step 1 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
4. 코드 커밋: `feat(4-mvp): step1 — nickname-hydration`
5. 메타 커밋: `chore(4-mvp): step1 output`

## 금지사항

- `BearSpeechBubble` 컴포넌트 생성 금지. 이유: step 2 담당.
- `BearStatusBar` 제거 금지. 이유: step 2에서 말풍선과 동시에 교체.
- `bear-state.ts` 시그니처 변경 금지.
- Profile 테이블에 컬럼 추가하는 마이그레이션 작성 금지. `nickname` 컬럼은 이미 존재한다.
