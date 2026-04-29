# Step 5: bubble-margin-center

## 읽어야 할 파일

- `src/app/page.tsx` — 현재 `<main>` flex 구조, BearSpeechBubble·RoomScene·LastReadNote 배치
- `src/app/globals.css` — `.room-scene-wrapper`, `.room-scene-box` CSS (L141-150)
- `src/components/room/BearSpeechBubble.tsx` — 외부 래퍼 className (w-full px-4 py-2)
- `src/components/room/LastReadNote.tsx` — 외부 래퍼 className (w-full px-4 py-2)
- `src/components/room/BearStateContext.tsx` — Provider가 DOM 래퍼 없이 children 렌더하는지 확인
- `src/components/room/BearStateHydrator.tsx` — `return null` 확인
- `src/app/page.test.tsx` — 기존 테스트 구조 파악
- `docs/UI_GUIDE.md` — §BearSpeechBubble (L377~), §LastReadNote (L397~), §RoomScene(L120~)

## 배경

현재 메인 페이지(`/`)의 flex-col 구조는 BearSpeechBubble을 최상단에, LastReadNote를 최하단에 고정한다. RoomScene이 `flex-1`로 나머지 전체 공간을 차지하며 자신의 aspect-ratio(640/400)에 맞게 내부에서 중앙 정렬된다.

결과적으로 RoomScene과 BearSpeechBubble 사이, RoomScene과 LastReadNote 사이에 갈색 빈 공간이 생기는데, 두 박스는 그 빈 공간의 중앙이 아닌 화면 끝에 붙어 있다.

**목표**: BearSpeechBubble은 RoomScene **위쪽 여백의 수직 중앙**에, LastReadNote는 RoomScene **아래쪽 여백의 수직 중앙**에 위치하도록 레이아웃을 수정한다.

### 현재 DOM 구조 (중요)

`<main>` 아래에서 그리드/플렉스 아이템이 되는 실제 DOM 요소:
- `BearStateHydrator` → `return null` (DOM 없음, 그리드 셀 불점유)
- `GuestBanner` → 비회원 시에만 렌더 (DOM 있음)
- `BearSpeechBubble` → 외부 `div.w-full.px-4.py-2` (DOM 있음)
- `div.flex-1.room-scene-wrapper` → RoomScene 래퍼 (DOM 있음)
- `LastReadNote` → 외부 `div.w-full.px-4.py-2` (DOM 있음)

GuestBanner·BearSpeechBubble·room-scene-wrapper·LastReadNote가 각각 별개의 `<main>` 직계 자식이 되는 상황 → grid 레이아웃 사용 시 GuestBanner와 BearSpeechBubble을 하나의 div로 묶어야 한다.

### CSS 컨테이너 쿼리 주의사항

`.room-scene-wrapper`가 현재 `container-type: size`를 사용해 `cqw`(컨테이너 너비)와 `cqh`(컨테이너 높이) 모두 지원한다. CSS grid의 `auto` 행에서는 컨테이너 높이가 0으로 계산될 수 있어 `cqh` 기반 계산이 깨진다.

해결책: `container-type: size` → `container-type: inline-size`로 교체하고, `.room-scene-box`의 landscape 높이 제약을 `cqh` 대신 `dvh` 뷰포트 단위로 표현한다.

## 작업

### 1. `src/app/globals.css`

`.room-scene-wrapper`와 `.room-scene-box`를 교체한다:

```css
/* 변경 전 */
.room-scene-wrapper {
  container-type: size;
}

.room-scene-box {
  position: relative;
  aspect-ratio: 640 / 400;
  width: min(100cqw, calc(100cqh * 640 / 400));
}

/* 변경 후 */
.room-scene-wrapper {
  container-type: inline-size;
}

.room-scene-box {
  position: relative;
  aspect-ratio: 640 / 400;
  width: min(100cqw, calc((100dvh - 64px) * 640 / 400));
}
```

- `cqh` → `(100dvh - 64px)`: BottomNav 64px를 뺀 뷰포트 높이 기준으로 landscape 제약 동일하게 유지.
- 주석도 업데이트: "portrait/landscape 모두 정확히 맞춤 (inline-size + dvh)".

### 2. `src/app/page.tsx`

`<main>` 구조를 **CSS grid 3-row**로 변경한다:

```tsx
// 변경 전
<main className="fixed top-0 inset-x-0 bottom-[64px] bg-[var(--color-border)] flex flex-col">
  <BearStateProvider initial={initialBearState}>
    <BearStateHydrator isGuest={isGuest} />
    {isGuest && <GuestBanner />}
    <BearSpeechBubble />
    <div className="flex-1 room-scene-wrapper flex items-center justify-center overflow-hidden">
      <RoomScene theme={theme} />
    </div>
    <LastReadNote now={now} />
  </BearStateProvider>
</main>

// 변경 후
<main className="fixed top-0 inset-x-0 bottom-[64px] bg-[var(--color-border)] grid grid-rows-[1fr_auto_1fr]">
  <BearStateProvider initial={initialBearState}>
    <BearStateHydrator isGuest={isGuest} />
    <div className="flex flex-col items-stretch justify-center">
      {isGuest && <GuestBanner />}
      <BearSpeechBubble />
    </div>
    <div className="room-scene-wrapper flex items-center justify-center overflow-hidden">
      <RoomScene theme={theme} />
    </div>
    <div className="flex items-center justify-center">
      <LastReadNote now={now} />
    </div>
  </BearStateProvider>
</main>
```

핵심 변경 사항:
- `flex flex-col` → `grid grid-rows-[1fr_auto_1fr]`: 3행 그리드. 위·아래 여백이 `1fr`씩 동등하게 배분.
- GuestBanner + BearSpeechBubble을 하나의 `div`로 묶음 (row 1). `justify-center`로 수직 중앙 정렬.
- `room-scene-wrapper`에서 `flex-1` 제거 → `auto` 행에서 intrinsic 크기로 동작.
- LastReadNote를 `div.flex.items-center.justify-center`로 감쌈 (row 3). `w-full`은 LastReadNote 내부 div가 이미 갖고 있으므로 래퍼에 별도 추가 불필요.

### 3. `src/app/page.test.tsx`

기존 테스트는 유지하면서, 새로운 레이아웃 구조를 반영하는 렌더 테스트를 확인한다. 기존 테스트가 DOM 구조에 의존하지 않고 컴포넌트 존재 여부(텍스트/role)로 검증하고 있으므로 대부분 수정 불필요. 깨지는 테스트가 있으면 수정한다.

## Acceptance Criteria

```bash
bun build   # 0 에러
bun lint    # 0 에러
bun run test    # 전체 통과
```

## 검증 절차

1. AC 커맨드 순서대로 실행.
2. `bun dev` 후 `/`에서 수동 확인:
   - BearSpeechBubble(상단 여백 중앙), RoomScene(중앙), LastReadNote(하단 여백 중앙) 모두 보임
   - BearSpeechBubble이 화면 최상단에 붙지 않고 RoomScene 위 여백의 중간에 위치함
   - LastReadNote가 화면 최하단에 붙지 않고 RoomScene 아래 여백의 중간에 위치함
   - landscape 회전 시 RoomScene이 뷰포트를 넘어 overflow되지 않음
   - RoomScene 높이 계산이 깨지지 않음 (비율 유지)
3. `phases/4-mvp-polish/index.json`의 step 5 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
4. 커밋:
   - `feat(4-mvp-polish): step5 — bubble-margin-center`
   - `chore(4-mvp-polish): step 5 output`

## 금지사항

- `BearSpeechBubble.tsx`, `LastReadNote.tsx` 내부 코드를 수정하지 마라 — 위치 조정은 page.tsx와 globals.css에서만.
- `BottomNav` 높이나 스타일을 변경하지 마라.
- `body`의 `pb-[64px]`(root layout.tsx)를 제거하지 마라 — 다른 페이지 레이아웃이 깨진다.
- `grid-rows-[1fr_auto_1fr]`에서 세 번째 항목(LastReadNote 래퍼) 이후에 추가 DOM 요소가 생기면 레이아웃이 깨진다 — `BearStateHydrator`가 `return null`인지 반드시 재확인.
- `container-type: size`로 롤백하지 마라. `cqh` 기반 계산을 다시 도입하지 마라.
