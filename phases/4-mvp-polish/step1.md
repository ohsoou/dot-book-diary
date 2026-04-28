# Step 1: settings-sprite

## 읽어야 할 파일

- `src/components/room/RoomScene.tsx` — `SPRITE_FILES` (L35-47), `SPRITE_DEFS` (L50-119), `HITBOX_DEFS` (L124-150), `TOTAL_SPRITES` (L121)
- `public/sprites/day/` 디렉토리 목록 확인
- `public/sprites/night/` 디렉토리 목록 확인
- `src/components/room/RoomScene.test.tsx` — 기존 테스트 구조 파악
- `docs/UI_GUIDE.md` — §RoomScene Hitbox 어포던스

## 배경

현재 5개 hitbox(다이어리/책장/캘린더/책 등록/설정) 중 **설정 hitbox에만 sprite가 없다**. 나머지 4개는 각자 SPRITE_DEFS에 대응하는 이미지가 있어 클릭 가능한 물건이 시각적으로 보인다. 설정 hitbox는 우상단(`top: 2%, right: 1.25%, w: 6.25%, h: 10%`)에 hitbox 버튼만 있고 그 아래 sprite가 없어 시각적 일관성이 깨진다.

`/public/Setting.png` 파일이 이미 추가되어 있다(git untracked). 이 파일을 sprite로 등록한다.

day/night 동일 이미지(사용자 선택)이므로 두 sprite 디렉토리에 같은 파일을 배치한다.

**TOTAL_SPRITES 주의**: `SPRITE_DEFS`에 항목을 추가하면 `TOTAL_SPRITES`도 자동으로 증가한다(`SPRITE_DEFS.length`). `settledCount` 로딩 완료 조건이 올바르게 동작하도록 순서에 주의한다.

## 작업

### 1. 이미지 파일 배치

`/public/Setting.png`을 두 sprite 디렉토리에 복사한다:

```bash
cp public/Setting.png public/sprites/day/Setting.png
cp public/Setting.png public/sprites/night/Setting.png
```

파일 크기가 1.4MB로 크다. 가능하면 imagemagick 또는 squoosh CLI로 축소한다:

```bash
# imagemagick이 있을 경우
magick public/sprites/day/Setting.png -resize 80x50 public/sprites/day/Setting.png
magick public/sprites/night/Setting.png -resize 80x50 public/sprites/night/Setting.png
```

이미지 최적화 도구가 없거나 축소 후 품질이 나쁘면 원본 그대로 진행하고 step3 docs에 "추후 최적화 필요" 메모만 추가한다.

### 2. `src/components/room/RoomScene.tsx` — SPRITE_FILES 추가

```ts
const SPRITE_FILES: Record<string, { day: string; night: string }> = {
  // ... 기존 항목 유지 ...
  setting: { day: 'Setting.png', night: 'Setting.png' },
}
```

기존 항목 순서는 변경하지 않는다. `setting` 항목을 마지막에 추가한다.

### 3. `src/components/room/RoomScene.tsx` — SPRITE_DEFS 추가

```ts
const SPRITE_DEFS: SpriteConfig[] = [
  // ... 기존 항목 유지 ...
  {
    fileKey: 'setting',
    label: '설정',
    z: 35,
    style: { top: '2%', right: '1.25%', width: '6.25%', height: '10%' },
  },
]
```

**좌표는 `HITBOX_DEFS[설정]`과 정확히 동일하게** 유지한다(`top: '2%', right: '1.25%', width: '6.25%', height: '10%'`). z-index는 35 (hitbox의 50보다 낮음, 인디케이터 점이 sprite 위에 표시됨).

`animClass`는 추가하지 않는다.

### 4. `src/components/room/RoomScene.test.tsx` — 테스트 추가

```ts
it('renders setting sprite image', () => {
  render(<RoomScene theme="day" />)
  // aria-hidden이므로 role="img"가 아닌 alt 속성으로 찾는다
  const imgs = document.querySelectorAll('img.pixel')
  const srcList = Array.from(imgs).map((img) => (img as HTMLImageElement).src)
  expect(srcList.some((src) => src.includes('Setting.png'))).toBe(true)
})
```

테스트 작성 → 실패 확인 → 구현 순서로 진행한다.

## Acceptance Criteria

```bash
bun build
```
0 에러.

```bash
bun test
```
전체 통과.

설정 sprite가 hitbox 좌표와 동일한 위치에 렌더됨:
- `SPRITE_DEFS`에서 `fileKey: 'setting'`의 style이 `HITBOX_DEFS[설정]`의 style과 동일한지 코드 검토.
- `TOTAL_SPRITES === SPRITE_DEFS.length` 확인.

## 검증 절차

1. AC 커맨드 실행.
2. `bun dev` 후 `/`에서 수동 확인:
   - 우상단에 설정 sprite 이미지가 보임
   - 다른 hitbox들(다이어리/책장/캘린더/책 등록)과 동일한 dashed outline + 점 인디케이터가 설정 sprite 위에 표시됨
   - 설정 sprite 클릭 시 `/settings` 이동 확인
3. `phases/4-mvp-polish/index.json`의 step 1 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
4. 커밋:
   - `feat(4-mvp-polish): step1 — settings-sprite`
   - `chore(4-mvp-polish): step 1 output`

## 금지사항

- `HITBOX_DEFS[설정]`의 좌표를 변경하지 마라. sprite가 hitbox와 다른 위치에 있으면 클릭 영역이 불일치한다.
- z-index를 50 이상으로 설정하지 마라. hitbox 버튼(z-index 50)이 sprite 위에 있어야 클릭이 작동한다.
- `SPRITE_FILES`에 `setting.day`와 `setting.night`를 다른 파일명으로 설정하지 마라 (이번엔 동일 이미지).
- `animClass`를 설정 sprite에 추가하지 마라.
- 이 step에서 테마 토글이나 레이아웃은 변경하지 마라.
