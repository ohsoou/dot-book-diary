# Step 6: room-scene

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 1번, hitbox 매핑, "2분 플로우" 요건)
- `/docs/UI_GUIDE.md` (스프라이트 스케일, 애니메이션 규칙, 포커스 스타일, prefers-reduced-motion)
- `/docs/ADR.md` (ADR-005, ADR-011, ADR-017)
- 이전 step: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/*`

## 작업

메인 페이지 `/`에 도트 방 씬을 구현한다. 실제 아트 에셋은 자리표시자로 시작하되, 레이어 구조와 hitbox 네비게이션은 최종 형태로 만든다.

1. **`src/components/room/RoomScene.tsx`** (`'use client'`)
   - 아트보드 고정 크기: 640×400.
   - `position: relative` 컨테이너. 레이어 순서(z-index 오름차순) 및 대략적 위치 가이드:
     1. 방 배경 (z-0): `top-0 left-0 w-full h-full`
     2. 창문 (z-10): `top-[40px] left-[80px]`
     3. 러그 (z-10): `bottom-[20px] left-[160px]`
     4. 책더미 (z-20): `bottom-[60px] right-[120px]` (곰 오른쪽)
     5. 다이어리 (z-20): `bottom-[60px] left-[120px]` (곰 왼쪽)
     6. 곰 (z-30): `bottom-[40px] left-1/2 -translate-x-1/2` (중앙)
     7. 램프 (z-40): `top-[180px] right-[100px]`
   - **로딩 최적화**: 모든 이미지가 로드될 때까지 씬 전체를 `opacity-0`으로 유지하다가, `onLoad` 이벤트를 카운트하여 모두 완료되면 `opacity-100 transition-opacity duration-300`으로 노출하여 깜빡임(Flickering) 방지.
   - 각 레이어는 `<img className="pixel absolute" ...>` (CSS `image-rendering: pixelated`).
   - 파일이 없을 때: 색상 CSS box로 영역 표시 (`bg-[#3a2a1a]` + 라벨 텍스트).
   - 뷰포트 너비에 따라 정수배 scale: `< 640px → scale(1)`, `≥ 1280px → scale(2)`. `transform-origin: top center`.

2. **에셋 경로 고정**
   - `public/sprites/night/{room,window,rug,books,diary,bear,lamp}.png`
   - 이 경로는 코드에서 하드코드. `public/sprites/day/`는 빈 디렉토리만.

3. **Hitbox (5개 `<button>`)**
   - 투명 `<button>` 절대좌표 오버레이.
   - `aria-label` 필수. focus ring: `outline: 1px dashed #e89b5e; outline-offset: 2px`.
   - Tab 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 설정.
   - 클릭 → `router.push(href)`. `href`는 컴포넌트 prop.
   - 기본 href 매핑:
     ```
     다이어리(곰 왼쪽)  → /diary
     책장(곰 오른쪽)    → /bookshelf
     창문              → /book-calendar
     곰               → /add-book
     설정(우상단)       → /settings
     ```

4. **접근성 / 모션**
   - 방 씬 컨테이너: `role="img" aria-label="곰이 책을 읽는 따뜻한 방"`.
   - 곰 idle 애니메이션: `steps(N)` easing, 2s loop. `@media (prefers-reduced-motion: reduce)` 시 `animation: none`.
   - 램프 flicker: 같은 처리.

5. **`src/app/page.tsx`** — Server Component
   - metadata 설정 + `<RoomScene>` 렌더.
   - `GuestBanner`도 이 페이지에서 렌더 (`isGuest` 판단 후 조건부).

6. **테스트**
   - `src/components/room/RoomScene.test.tsx`
   - 5개 hitbox `aria-label` 존재 확인.
   - `router.push` 호출 확인 (각 hitbox 클릭 시).
   - `prefers-reduced-motion` 시 애니메이션 클래스 제거 확인.

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
- `public/sprites/*` flat 경로(night/ 없이)로 에셋 참조하지 마라.
- 비정수 scale 값(1.5x, 1.7x 등) 사용하지 마라.
- 기존 테스트를 깨뜨리지 마라.
