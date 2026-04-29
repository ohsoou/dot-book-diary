# Step 4: hitbox-bob-animation

## 읽어야 할 파일

- `src/components/room/RoomScene.tsx` — `SPRITE_DEFS` (L51-126), `SpriteConfig` 타입 (L18-24), `HITBOX_DEFS` (L131-157), hitbox 버튼 렌더 (L310-323), reducedMotion 분기 (L303)
- `src/app/globals.css` — `@keyframes bear-idle`, `.bear-idle`, `.lamp-flicker` 정의 구간
- `src/components/room/RoomScene.test.tsx` — L171-188 (`outline-dashed` 검증, 인디케이터 점 검증)
- `src/components/room/BearSpeechBubble.tsx` — L14 (`py-4`)
- `src/components/room/LastReadNote.tsx` — L30 (`py-4`)
- `docs/UI_GUIDE.md` — §RoomScene Hitbox 어포던스 (이미 MVP4.1 기준으로 업데이트됨)

## 배경

step 0~3에서 레이아웃 정리, Setting sprite 추가, 비회원 테마 비활성화, docs/빌드 검증을 완료했다.

이 step에서는:
1. **hitbox 점선 박스 제거** — `outline-dashed` outline과 우상단 인디케이터 점(2×2px `<span>`) 완전 제거. 키보드 a11y를 위해 `focus-visible:outline` 1px만 유지.
2. **hitbox-bob idle 애니메이션** — 5개 hitbox 영역과 동일 좌표의 SPRITE 이미지에 `hitbox-bob` 애니메이션 적용(1px 상하, 1.8s, `steps(2)`). 동시 움직임 방지를 위해 `delay-1..4` 클래스로 phase 분산.
3. **아트보드 height 확장** — `BearSpeechBubble`과 `LastReadNote`의 외곽 padding을 `py-4`→`py-2`로 축소해 wrapper(flex-1)가 약 32px 더 확보되고 `.room-scene-box`가 동일 비율로 확대됨. `aspect-ratio: 640/400`은 변경 없음.

## Sprite↔Hitbox 매핑 (좌표 동일 확인됨)

| Hitbox label | SPRITE fileKey | animClass | extraClass |
|---|---|---|---|
| 다이어리 | `diary`     | `hitbox-bob` | —          |
| 책장     | `wallShelf` | `hitbox-bob` | `delay-1`  |
| 캘린더   | `window`    | `hitbox-bob` | `delay-2`  |
| 책 등록  | `bookstack` | `hitbox-bob` | `delay-3`  |
| 설정     | `setting`   | `hitbox-bob` | `delay-4`  |

## 작업

### 1. `src/app/globals.css`

`bear-idle` / `lamp-flicker` 정의 바로 아래에 추가:

```css
@keyframes hitbox-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1px); }
}

.hitbox-bob         { animation: hitbox-bob 1.8s steps(2) infinite; }
.hitbox-bob.delay-1 { animation-delay: 0.3s; }
.hitbox-bob.delay-2 { animation-delay: 0.6s; }
.hitbox-bob.delay-3 { animation-delay: 0.9s; }
.hitbox-bob.delay-4 { animation-delay: 1.2s; }
```

`prefers-reduced-motion` 처리는 기존 컴포넌트 내 `reducedMotion` 분기로 동일하게 처리되므로 CSS 레이어 추가 불필요.

### 2. `src/components/room/RoomScene.tsx`

#### 2-1. `SpriteConfig` 타입에 `extraClass` 추가

```ts
interface SpriteConfig {
  fileKey: string
  label: string
  z: number
  animClass?: 'bear-idle' | 'lamp-flicker' | 'hitbox-bob'
  extraClass?: string  // 'delay-1' ~ 'delay-4'
  style: React.CSSProperties
}
```

#### 2-2. `SPRITE_DEFS` 5개 항목에 `animClass` + `extraClass` 추가

```ts
{ fileKey: 'diary',     ..., animClass: 'hitbox-bob' },
{ fileKey: 'wallShelf', ..., animClass: 'hitbox-bob', extraClass: 'delay-1' },
{ fileKey: 'window',    ..., animClass: 'hitbox-bob', extraClass: 'delay-2' },
{ fileKey: 'bookstack', ..., animClass: 'hitbox-bob', extraClass: 'delay-3' },
{ fileKey: 'setting',   ..., animClass: 'hitbox-bob', extraClass: 'delay-4' },
```

#### 2-3. `SpriteImage` 호출부 `extraClass` 계산 수정 (L303 부근)

```ts
extraClass={
  def.animClass &&
  !reducedMotion &&
  !(def.animClass === 'lamp-flicker' && lampState === 'off')
    ? `${def.animClass}${def.extraClass ? ' ' + def.extraClass : ''}`
    : ''
}
```

#### 2-4. Hitbox 버튼 className 변경 (L315)

```ts
// 변경 전
className="absolute bg-transparent outline outline-1 outline-dashed outline-[#e89b5e]/60 hover:outline-[#e89b5e] focus-visible:outline-[#e89b5e] transition-[outline-color] duration-100 ease-linear"

// 변경 후
className="absolute bg-transparent focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#e89b5e]"
```

#### 2-5. 인디케이터 점 `<span>` 제거 (L318-321)

버튼 내부 `<span aria-hidden="true" .../>` 블록 전체 삭제.

### 3. `src/components/room/RoomScene.test.tsx`

#### 삭제

- L171-178: `'hitbox buttons have outline-dashed affordance class'` 테스트 삭제
- L180-188: `'hitbox buttons each contain an aria-hidden indicator dot'` 테스트 삭제

#### 추가

```ts
it('hitbox-mapped sprites have hitbox-bob class when reduced motion is off', () => {
  // window.matchMedia prefers-reduced-motion = false mock 필요
  const { container } = render(<RoomScene theme="day" />)
  const imgs = container.querySelectorAll('img')
  const bobCount = Array.from(imgs).filter(img =>
    img.className.includes('hitbox-bob')
  ).length
  expect(bobCount).toBe(5)
})

it('hitbox buttons have no dashed outline', () => {
  render(<RoomScene theme="day" />)
  for (const label of ['다이어리', '책장', '캘린더', '책 등록', '설정']) {
    const btn = screen.getByRole('button', { name: label })
    expect(btn.className).not.toContain('outline-dashed')
  }
})
```

### 4. `src/components/room/BearSpeechBubble.tsx`

```tsx
// L14 변경 전
className="w-full px-4 py-4"

// 변경 후
className="w-full px-4 py-2"
```

### 5. `src/components/room/LastReadNote.tsx`

```tsx
// L30 변경 전
className="w-full px-4 py-4"

// 변경 후
className="w-full px-4 py-2"
```

## 완료 기준 (AC)

- [ ] 방 씬에서 점선 박스와 인디케이터 점이 보이지 않음
- [ ] 다이어리/책장/창문/책더미/설정 sprite가 살짝 상하로 idle 모션 (동시에 움직이지 않음)
- [ ] 키보드 Tab 순회 시 focus-visible outline 5개 hitbox에 순서대로 표시
- [ ] `prefers-reduced-motion: reduce` 시 hitbox-bob 미적용 (bear-idle, lamp-flicker와 동일 동작)
- [ ] day/night 테마 전환 후 동일 동작
- [ ] 아트보드가 이전보다 약간 더 크게 느껴짐 (상·하단 박스 여백 축소)
- [ ] `bun run test` 전부 통과
- [ ] `bun build` + `bun lint` 0 에러
