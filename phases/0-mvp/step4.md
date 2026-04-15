# Step 4: room-scene

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 1번 — 도트 방 메인)
- `/docs/UI_GUIDE.md` (픽셀/색상/애니메이션 규칙)
- `/docs/ADR.md` (ADR-005: PNG 스프라이트)
- 이전 step: `src/app/page.tsx`, `src/app/globals.css`

## 작업

메인 페이지 `/`에 도트 방 씬을 구현한다. 실제 아트 에셋은 자리표시자(단색 PNG 또는 CSS 박스)로 시작하되, 레이어 구조와 hitbox 네비게이션은 최종 형태로 만든다.

1. **`src/components/room/RoomScene.tsx`** (`'use client'`)
   - 고정 아트 보드 `640 × 400` px, 부모에서 `scale`로 확대.
   - 절대 위치 레이어: 방 배경 → 창문 → 러그 → 책더미(곰 오른쪽) → 다이어리(곰 왼쪽) → 곰 → 램프.
   - 각 인터랙티브 요소는 투명 `<button>` hitbox로 오버레이:
     - 다이어리 hitbox → `router.push('/diary')`
     - 책더미 hitbox → `router.push('/bookshelf')`
     - 창문 hitbox → `router.push('/book-calendar')`
     - 곰 hitbox → `router.push('/add-book')`
     - 우상단 톱니 hitbox → `router.push('/settings')`
   - hover 시 `aria-label`을 가진 tooltip 노출(간단한 `<span>` + `group-hover:inline`).
2. **에셋 자리표시자**
   - `public/sprites/{room,window,rug,books,diary,bear,lamp}.png` 파일을 각 단색 픽셀 블록(PNG)으로 만들어 둔다. 실제 아트는 수동 교체 가능하도록 파일명을 고정.
   - 대체 경로: 에셋이 없을 때 `bg-[#5c3d28]` 등 CSS 박스로 폴백해 시각적으로 영역이 보이게 한다.
3. **`src/app/page.tsx`** — Server Component는 제목/메타만, `<RoomScene />`을 렌더(Client).
4. **`src/app/globals.css`** — `img { image-rendering: pixelated; }` 전역(사진은 개별 덮어쓰기).
5. **테스트** (`src/components/room/RoomScene.test.tsx`)
   - 렌더 시 5개 hitbox의 `aria-label`("다이어리", "책장", "캘린더", "책 등록", "설정")이 DOM에 있다.
   - 각 hitbox 클릭 시 `useRouter().push`가 해당 경로로 호출된다(`vi.mock('next/navigation')`).

## Acceptance Criteria

```bash
bun run build
bun test
bun dev   # 수동: localhost:3000 에 방이 보이고 5개 영역 클릭 가능
```

## 검증 절차

1. AC 실행. `bun dev`는 확인만 하고 종료.
2. 체크리스트:
   - hitbox가 `<button>`이며 `aria-label`을 가진다(키보드/스크린리더 접근성).
   - UI_GUIDE 금지사항: `rounded`, `backdrop-blur`, `gradient`, duration>100ms 없음.
   - RoomScene은 Client Component이고, page.tsx는 Server Component.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- hitbox를 `<div onClick>`으로 만들지 마라. 이유: 접근성·포커스·키보드 탐색.
- 방 아트를 `<div>` + Tailwind gradient로 그리지 마라. 이유: ADR-005.
- 곰 애니메이션에 blur/소프트 트랜지션을 쓰지 마라. 이유: UI_GUIDE.
- 기존 테스트를 깨뜨리지 마라.
