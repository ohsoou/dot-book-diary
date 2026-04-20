# Step 6: room-scene

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 1번, hitbox 매핑, "2분 플로우" 요건)
- `/docs/UI_GUIDE.md` (스프라이트 스케일, 애니메이션 규칙, 포커스 스타일, prefers-reduced-motion)
- `/docs/ADR.md` (ADR-005, ADR-011, ADR-017)
- 이전 step: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/*`

## 작업

메인 페이지 `/`에 도트 방 씬을 구현한다. 실제 아트 에셋은 자리표시자로 시작하되, 레이어 구조와 hitbox 네비게이션은 최종 형태로 만든다.

1. **`src/components/room/RoomScene.tsx`** (`'use client'`)
   - **반응형 컨테이너** — 가로모드 전용 레터박스.
     - `aspect-ratio: 640/400` 유지. `max-height: calc(100dvh - 64px)` + `max-width: calc((100dvh - 64px) * 1.6)`. 64px는 BottomNav 고정 높이.
     - 세로로 길어질 경우 아트보드는 중앙 정렬, 위아래 여백은 `--color-border`(#1a100a) 레터박스.
   - **스프라이트 레이어(10개) — 단일 좌표 세트**:
     - `SPRITE_DEFS` 배열의 각 항목은 `style` 하나(landscape 기준 640×400 퍼센트 좌표)만 갖는다.
     - `z-index` 오름차순: 배경(0) → 창밖(5) → 창문(10) → 식물·벽선반(12) → 침대 테이블(22) → 곰·램프(25) → 책더미·다이어리(30).
     - 각 레이어는 `<img className="pixel absolute" ...>` (`image-rendering: pixelated`).
     - 배경은 `object-fit: cover`.
   - **로딩 게이트**: `settledCount >= TOTAL_SPRITES` 충족 시 `opacity-100`으로 전환(깜빡임 방지).
   - 파일이 없을 때: `bg-[#3a2a1a]` 박스 + 라벨 텍스트.

2. **에셋 경로 고정**
   - `public/sprites/day/{Background,Outside_view,Window,Hanging_plant,Wall_shelf,Bed_Table,Table_Lamp,Bookstack,Diary,Bear}.png`
   - 이 경로는 코드에서 하드코드.

3. **Hitbox (5개 `<button>`)**
   - 투명 `<button>` 백분율 좌표 오버레이. `HITBOX_DEFS` 배열도 `style` 단일 필드(landscape 기준)를 갖는다.
   - `aria-label` 필수. focus ring: `outline: 1px dashed #e89b5e; outline-offset: 2px`.
   - Tab 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 설정.
   - 클릭 → `router.push(href)`. `href`는 컴포넌트 prop.
   - 기본 href 매핑:
     ```
     다이어리(Diary)       → /diary
     책장(Wall_shelf)     → /bookshelf
     캘린더(Window)       → /book-calendar
     책 등록(Bookstack)    → /add-book
     설정(우상단)          → /settings
     ```

4. **접근성 / 모션**
   - 방 씬 컨테이너: `role="img" aria-label="곰이 책을 읽는 따뜻한 방"`.
   - 곰 idle 애니메이션: `steps(N)` easing, 2s loop. `@media (prefers-reduced-motion: reduce)` 시 `animation: none`.
   - 램프 flicker: 같은 처리.

5. **`src/app/page.tsx`** — Server Component
   - metadata 설정 + `<RoomScene>` 렌더.
   - `GuestBanner`도 이 페이지에서 렌더 (`isGuest` 판단 후 조건부).
   - `h-dvh bg-[var(--color-border)] flex flex-col` — 레터박스 배경 적용.
   - 아트보드는 `flex-1 flex items-center justify-center overflow-hidden` 래퍼로 수직 중앙 정렬.

6. **테스트**
   - `src/components/room/RoomScene.test.tsx`
   - 5개 hitbox `aria-label` 존재 확인.
   - `router.push` 호출 확인 (각 hitbox 클릭 시).
   - `prefers-reduced-motion` 시 애니메이션 클래스 제거 확인.
   - 곰 스프라이트 좌표 확인.

## Acceptance Criteria

```bash
bun run build
bun test
bun dev   # 수동: localhost:3000에서 방 레이어 렌더 확인
```

## 검증 절차

1. AC 실행. `bun dev`는 수동 확인 후 종료.
2. 체크리스트:
   - 에셋 경로가 `public/sprites/night/*`로 고정됐는가?
   - hitbox가 `<button>`인가 (`<div onClick>` 금지)?
   - Tab 순서가 명세와 일치하는가?
   - 페이지 전체를 `"use client"`로 올리지 않았는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- hitbox를 `<div onClick>`으로 만들지 마라.
- `public/sprites/*` flat 경로(day/ 또는 night/ 없이)로 에셋 참조하지 마라.
- portrait 좌표 세트를 별도로 만들지 마라 — 가로모드 단일 좌표만 사용한다.
- 기존 테스트를 깨뜨리지 마라.
