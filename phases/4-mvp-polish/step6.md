# Step 6: remove-settings-sprite-hitbox

## 읽어야 할 파일

- `src/components/room/RoomScene.tsx` — `SPRITE_FILES` (L36-49), `SPRITE_DEFS` (L52-136), `HITBOX_DEFS` (L141-167), `TOTAL_SPRITES` (L138)
- `src/app/globals.css` — `.hitbox-bob.delay-4` CSS 규칙 (hitbox-bob 섹션)
- `src/components/room/RoomScene.test.tsx` — hitbox 개수·Setting 관련 테스트 전체
- `docs/UI_GUIDE.md` — §RoomScene Hitbox 어포던스, §Settings Sprite

이전 step에서 완료된 내용:
- step 5: `<main>` → CSS grid 3-row, `.room-scene-wrapper` container-type → inline-size, `.room-scene-box` width → dvh 기반

## 배경

step 1(settings-sprite)에서 추가한 톱니바퀴 이미지(`Setting.png`)와 해당 hitbox를 제거한다. 설정 진입점은 step 7에서 곰 sprite 위에 올릴 hitbox로 대체되므로, `settingsHref` prop과 `HrefKey` 타입은 **이 step에서 건드리지 않는다**.

제거 범위:
1. `SPRITE_FILES`에서 `setting` 항목
2. `SPRITE_DEFS`에서 `setting` 엔트리
3. `HITBOX_DEFS`에서 `설정` 엔트리
4. `globals.css`에서 `.hitbox-bob.delay-4` CSS 규칙
5. `public/sprites/day/Setting.png`, `public/sprites/night/Setting.png` 파일
6. 관련 테스트 업데이트

`TOTAL_SPRITES`는 `SPRITE_DEFS.length`로 자동 계산되므로 수동 수정 불필요.

## 작업

### 1. `src/components/room/RoomScene.tsx`

#### 1-1. `SPRITE_FILES`에서 `setting` 항목 제거

```ts
// 삭제
setting:      { day: 'Setting.png',       night: 'Setting.png' },
```

#### 1-2. `SPRITE_DEFS`에서 `setting` 엔트리 제거

```ts
// 삭제
{
  fileKey: 'setting',
  label: '설정',
  z: 35,
  animClass: 'hitbox-bob',
  extraClass: 'delay-4',
  style: { top: '2%', right: '1.25%', width: '6.25%', height: '10%' },
},
```

#### 1-3. `HITBOX_DEFS`에서 `설정` 엔트리 제거

```ts
// 삭제
{
  label: '설정',
  hrefKey: 'settingsHref',
  style: { top: '2%', right: '1.25%', width: '6.25%', height: '10%' },
},
```

`settingsHref` prop, `HrefKey` 타입, `hrefMap`의 `settingsHref` 항목은 **삭제하지 않는다** — step 7에서 곰 hitbox가 이를 재사용한다.

### 2. `src/app/globals.css`

`.hitbox-bob.delay-4` 규칙만 제거한다. 나머지 hitbox-bob, delay-1~3 규칙은 유지:

```css
/* 삭제 */
.hitbox-bob.delay-4 { animation-delay: 1.2s; }
```

### 3. 스프라이트 파일 삭제

```bash
rm public/sprites/day/Setting.png
rm public/sprites/night/Setting.png
```

### 4. `src/components/room/RoomScene.test.tsx`

아래 테스트를 수정한다:

#### 4-1. `'renders 5 hitbox buttons with correct aria-labels'` 수정

```ts
// 변경 전
it('renders 5 hitbox buttons with correct aria-labels', () => {
  render(<RoomScene theme="day" />)
  expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '캘린더' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책 등록' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '설정' })).toBeInTheDocument()
})

// 변경 후 (설정 제거, 제목도 4개로)
it('renders 4 hitbox buttons with correct aria-labels', () => {
  render(<RoomScene theme="day" />)
  expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '캘린더' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책 등록' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '설정' })).toBeNull()
})
```

#### 4-2. `'navigates to correct href on each hitbox click'` 수정

`'설정'` 버튼 클릭 블록 제거:
```ts
// 삭제
fireEvent.click(screen.getByRole('button', { name: '설정' }))
expect(mockPush).toHaveBeenCalledWith('/settings')
```

#### 4-3. `'hitbox-mapped sprites have hitbox-bob class when reduced motion is off'` 수정

```ts
// 변경 전
expect(bobCount).toBe(5)

// 변경 후
expect(bobCount).toBe(4)
```

#### 4-4. `'hitbox buttons have no dashed outline'` 수정

```ts
// 변경 전
for (const label of ['다이어리', '책장', '캘린더', '책 등록', '설정']) {

// 변경 후
for (const label of ['다이어리', '책장', '캘린더', '책 등록']) {
```

#### 4-5. `'renders setting sprite image'` 테스트 삭제

```ts
// 전체 삭제
it('renders setting sprite image', () => {
  render(<RoomScene theme="day" />)
  const imgs = document.querySelectorAll('img.pixel')
  const srcList = Array.from(imgs).map((img) => (img as HTMLImageElement).src)
  expect(srcList.some((src) => src.includes('Setting.png'))).toBe(true)
})
```

## Acceptance Criteria

```bash
bun build   # 0 에러
bun lint    # 0 에러
bun run test    # 전체 통과
```

## 검증 절차

1. AC 커맨드 순서대로 실행.
2. `bun dev` 후 `/`에서 수동 확인:
   - 방 화면 우상단에 톱니바퀴 이미지(Setting.png)가 보이지 않음
   - 톱니바퀴 영역 클릭 시 `/settings`로 이동하지 않음
   - 나머지 4개 hitbox(다이어리/책장/캘린더/책 등록)는 정상 동작
3. `phases/4-mvp-polish/index.json`의 step 6 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
4. 커밋:
   - `feat(4-mvp-polish): step6 — remove-settings-sprite-hitbox`
   - `chore(4-mvp-polish): step 6 output`

## 금지사항

- `settingsHref` prop, `HrefKey` 타입, `hrefMap`의 `settingsHref` 항목을 삭제하지 마라 — step 7에서 재사용된다.
- `hitbox-bob`, `delay-1`, `delay-2`, `delay-3` CSS 규칙을 건드리지 마라 — 다른 sprite에서 사용 중.
- `bear` sprite의 `animClass: 'bear-idle'`을 수정하지 마라.
- 기존 테스트를 삭제 대신 skip 처리하지 마라 — 완전 삭제 또는 수정만 허용.
