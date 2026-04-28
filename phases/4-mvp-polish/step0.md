# Step 0: layout-fix

## 읽어야 할 파일

- `src/app/page.tsx` — 메인 페이지 JSX 구조 (특히 `<main>` className과 BearSpeechBubble·RoomScene·LastReadNote 순서)
- `src/components/room/RoomScene.tsx` — `SCENE_STYLE` 상수 (L152-158)
- `src/components/ui/BottomNav.tsx` — 높이 확인 (`h-[64px]`, `fixed bottom-0`)
- `src/app/layout.tsx` — `<body>` className의 `pb-[64px]` 확인
- `src/app/page.test.tsx` — 기존 테스트 구조 파악
- `docs/UI_GUIDE.md` — §LastReadNote, §BearSpeechBubble, §RoomScene Hitbox 어포던스

## 배경

현재 메인 페이지(`/`)에서 두 가지 레이아웃 버그가 있다.

**버그 1 — LastReadNote가 BottomNav에 가려짐**

`<main className="fixed inset-0 flex flex-col">`은 viewport 전체(100dvh)를 차지한다. 그런데 `BottomNav`도 `fixed bottom-0 z-10 h-[64px]`이라서 main의 하단 64px와 BottomNav가 겹친다. flex-col의 마지막 요소인 `LastReadNote`는 BottomNav 뒤(z-index 차이)에 가려져 보이지 않는다.

**버그 2 — RoomScene이 BearSpeechBubble 때문에 위쪽으로 중앙정렬이 아닌 위치에 놓임**

`RoomScene`의 `SCENE_STYLE.maxHeight`는 `calc(100dvh - 64px)` (BottomNav만 차감)로 설정되어 있다. 실제로는 BearSpeechBubble(`py-4` + 두 줄 텍스트 ≈ 65px)이 위에 있으므로 RoomScene에 주어진 flex-1 공간보다 maxHeight가 크게 계산된다. 결과적으로 RoomScene이 중앙정렬 영역을 아래로 벗어나 보인다.

**수정 방향**

1. `<main>`의 `inset-0`을 제거하고 `top-0 inset-x-0 bottom-[64px]`로 교체 → BottomNav 높이만큼 main 하단을 올려서 겹침 제거. LastReadNote가 BottomNav 위에 자연스럽게 위치.
2. `SCENE_STYLE`의 `maxHeight`/`maxWidth` 계산식을 제거하고 부모 flex-1 컨테이너에 맞게 `height: '100%'` + `maxHeight: '100%'` + `maxWidth: '100%'`로 교체.

참고: `body`의 `pb-[64px]`(root layout.tsx)는 다른 페이지(`/settings` 등)의 자연 흐름 레이아웃을 위해 그대로 유지한다.

## 작업

### 1. `src/app/page.tsx`

`<main>` className 변경:

```
변경 전: "fixed inset-0 bg-[var(--color-border)] flex flex-col"
변경 후: "fixed top-0 inset-x-0 bottom-[64px] bg-[var(--color-border)] flex flex-col"
```

이것만 변경. BearStateProvider, BearSpeechBubble, RoomScene, LastReadNote의 순서와 내용은 수정하지 않는다.

### 2. `src/components/room/RoomScene.tsx`

`SCENE_STYLE` 상수 교체:

```ts
// 변경 전
const SCENE_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '640 / 400',
  maxHeight: 'calc(100dvh - 64px)',
  maxWidth: 'calc((100dvh - 64px) * 1.6)',
}

// 변경 후
const SCENE_STYLE: React.CSSProperties = {
  position: 'relative',
  aspectRatio: '640 / 400',
  height: '100%',
  maxHeight: '100%',
  maxWidth: '100%',
}
```

`width: '100%'`는 제거한다 — `height: '100%'`와 `aspectRatio` 조합이 부모 flex-1 컨테이너에서 올바르게 작동한다.

### 3. `src/app/page.test.tsx`

기존 테스트는 그대로 유지하면서 아래 테스트를 추가한다:

```ts
it('renders LastReadNote', async () => {
  await renderPage()
  // LastReadNote가 렌더되는지 확인 (독서 기록 없음 케이스)
  expect(screen.getByText('아직 독서 기록이 없어요')).toBeInTheDocument()
})
```

테스트가 통과하지 않으면 구현을 수정한다(테스트는 삭제하지 않는다).

## Acceptance Criteria

```bash
bun build
```
0 에러.

```bash
bun lint
```
0 에러.

```bash
bun test
```
전체 통과 (기존 + 신규 포함).

## 검증 절차

1. AC 커맨드 순서대로 실행.
2. `bun dev` 후 `/`에서 수동 확인:
   - BearSpeechBubble(상단), RoomScene(중앙), LastReadNote(하단) 모두 보임
   - LastReadNote가 BottomNav 뒤에 가려지지 않음
   - RoomScene이 남은 공간에서 중앙 정렬됨 (BearSpeechBubble에 밀리지 않음)
3. `phases/4-mvp-polish/index.json`의 step 0 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
4. 커밋:
   - `feat(4-mvp-polish): step0 — layout-fix`
   - `chore(4-mvp-polish): step 0 output`

## 금지사항

- `BottomNav`의 높이나 스타일을 변경하지 마라.
- `body`의 `pb-[64px]`(root layout.tsx)를 제거하지 마라 — 다른 페이지 레이아웃이 깨진다.
- SCENE_STYLE에 `calc(100dvh - ...)` 형태의 계산식을 다시 추가하지 마라.
- 기존 테스트를 삭제하거나 skip하지 마라.
- 이 step에서 설정 sprite, 테마 토글 변경은 하지 마라.
