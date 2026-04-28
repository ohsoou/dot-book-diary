# Step 2: bear-speech-bubble

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` (§22.4, §22.5 Letterbox HUD, §22.7 MVP4)
- `docs/ADR.md` (ADR-024 말풍선 결정, ADR-005 도트 스프라이트)
- `docs/UI_GUIDE.md` (§AI 슬롭 안티패턴, §색상 토큰, §애니메이션 규칙, §BearSpeechBubble 컴포넌트, §BearStatusBar)
- `src/components/room/RoomScene.tsx` — 곰 sprite 위치·z-index 구조, `useBearState()` 사용법
- `src/components/room/BearStateContext.tsx` — `BearStateContextValue.nickname` (step 1에서 추가됨)
- `src/components/room/BearStatusBar.tsx` — 제거 대상
- `src/app/page.tsx` — `<BearStatusBar />` 제거 위치
- `src/components/room/RoomScene.test.tsx` — 기존 테스트 패턴

## 배경

step 1에서 `BearStateContextValue.nickname: string`이 추가됐다.
이 step에서 K.K. 스타일 픽셀 말풍선 컴포넌트를 만들어 RoomScene 캔버스 안 곰 위에 배치하고,
기존 letterbox 라벨인 `BearStatusBar`를 제거한다.

말풍선 확정 디자인:
```
┌────────────────────────┐
│ 책곰이                  │
│ ...곰이 책을 읽고 왔어요 │
└──────────▼─────────────┘
```
- 헤더 줄: 닉네임 (`text-[#f4e4c1]`, 강조)
- 본문 줄: bearLabel (`text-[#d7c199]`, 보조)
- 꼬리: 하단 중앙, 1px hard 삼각형

## 작업

### 1. `src/components/room/BearSpeechBubble.tsx` 신규 생성

```ts
interface BearSpeechBubbleProps {
  label: string | null
  nickname: string
}
export function BearSpeechBubble({ label, nickname }: BearSpeechBubbleProps)
```

- `label`이 null이거나 빈 문자열이면 렌더하지 않는다 (`return null`).
- **컨테이너**:
  - `role="status" aria-live="polite" aria-atomic="true"` — 스크린리더 전달
  - `position: absolute`, z-index 35 (sprite 25 < bubble 35 < hitbox 50)
  - 위치: RoomScene 캔버스 기준 곰 머리 위. 초기 좌표 제안:
    `bottom: 38%, left: 58%` (시각 검수 후 조정)
  - 폭: `max-w-[160px]` 또는 퍼센트 단위로 RoomScene 폭 대비 적당한 값
- **말풍선 박스**:
  - `bg-[#3a2a1a] border border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-3 py-2`
  - **금지**: `rounded-*`, `backdrop-blur`, gradient, 보라/인디고
  - 헤더: `text-xs text-[#f4e4c1]` + nickname 텍스트
  - 구분선(선택): `border-b border-[#1a100a]` 한 줄
  - 본문: `text-xs text-[#d7c199]` + label 텍스트
- **말풍선 꼬리**:
  - CSS `::after` 또는 인라인 border trick으로 하단 중앙에 1px 삼각형
  - 예: `border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#1a100a]`
    (outer) + 동일 구조의 inner 삼각형으로 fill 표현
- **모션**:
  - `label`이 바뀔 때 페이드 인: Tailwind `transition-opacity duration-100 ease-linear`
  - `prefers-reduced-motion` 시 transition 무시 (globals.css의 기존 규칙이 자동 적용됨)

### 2. `src/components/room/RoomScene.tsx` 수정

- `useBearState()` 에서 `bearLabel`, `nickname` 함께 destructure
- `SPRITE_DEFS` 렌더 블록 뒤, `HITBOX_DEFS` 렌더 블록 앞에 `<BearSpeechBubble>` 추가:
  ```tsx
  <BearSpeechBubble label={bearLabel} nickname={nickname} />
  ```
- z-index: `BearSpeechBubble` 내부 컨테이너에 `style={{ zIndex: 35 }}`

### 3. `src/app/page.tsx` 수정

- `BearStatusBar` import 라인 삭제
- `<BearStatusBar />` 렌더 라인 삭제

### 4. `BearStatusBar.tsx` / `BearStatusBar.test.tsx` 삭제

- 삭제 전 `grep -rn 'BearStatusBar' src/`로 사용처가 page.tsx와 자체 테스트 파일뿐임을 확인
- 확인 후 두 파일 삭제
- `BearStateHydrator.test.tsx`에서 `BearStatusBar`를 import·사용하는 코드가 있다면 `BearSpeechBubble`을 쓰거나 context 값을 직접 검증하는 패턴으로 교체

### 5. `src/components/room/BearSpeechBubble.test.tsx` 신규 생성

- label이 null → 렌더 없음
- label이 문자열 → `role="status"` 컨테이너, 헤더에 nickname 텍스트, 본문에 label 텍스트 렌더
- nickname이 `'책곰이'`인 경우 헤더 표시 확인
- `BearStateContext`를 감싸서 `useBearState()`에서 값 받아 렌더하는 통합 테스트도 1건 추가

`src/components/room/RoomScene.test.tsx`에 말풍선 등장 케이스 추가:
- `BearStateProvider`로 감싸고 `bearLabel`이 있을 때 `role="status"` 요소가 document에 존재하는지 확인

## Acceptance Criteria

```bash
bun test src/components/room/
bun build
bun lint
```

에러 없음. 기존 RoomScene 테스트 전부 통과 + 신규 케이스 통과.
`grep -rn 'BearStatusBar' src/` → 빈 결과.

## 검증 절차

1. 위 AC 커맨드 실행.
2. UI 검수 (시각): `bun dev` → `localhost:3000` 열어 말풍선이 곰 위에 렌더되는지 확인.
   - day/night 모드 양쪽 확인
   - 닉네임 헤더 줄 / 곰 상태 본문 줄 분리 확인
   - 말풍선 꼬리가 곰 머리 방향인지 확인
3. 금지 패턴 grep: `grep -rE 'rounded-|backdrop-blur|gradient' src/components/room/BearSpeechBubble.tsx` → 빈 결과
4. `phases/4-mvp/index.json` step 2 업데이트.
5. 코드 커밋: `feat(4-mvp): step2 — bear-speech-bubble`
6. 메타 커밋: `chore(4-mvp): step2 output`

## 금지사항

- 말풍선 CSS에 `rounded-*`, `backdrop-blur`, gradient, box-shadow blur, 보라/인디고 색 사용 금지. 이유: UI_GUIDE 슬롭 안티패턴.
- `bear-state.ts` 또는 storage 레이어 수정 금지. 이유: 이 step은 순수 표시 레이어 담당.
- BearStatusBar를 다른 페이지에서 재사용하려는 목적으로 파일을 유지하지 마라. 완전히 삭제한다.
- z-index 50 이상을 `BearSpeechBubble`에 부여하지 마라. hitbox(z-index 50)보다 낮아야 hitbox 클릭이 우선된다.
