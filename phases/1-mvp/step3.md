# Step 3: room-scene-theme-switch

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§2 디렉토리 room)
- `/docs/ADR.md` (ADR-005 도트 아트, ADR-018 테마)
- `/docs/UI_GUIDE.md` (반응형 RoomScene 전략)
- `/src/components/room/RoomScene.tsx`
- `/src/app/page.tsx`
- `/src/lib/theme.ts` (step2 결과)
- `/public/sprites/day/` 파일 목록
- `/public/sprites/night/` 파일 목록

## 작업

`RoomScene`이 테마에 따라 스프라이트 경로를 바꾸도록 확장한다.

### 1. RoomScene 시그니처

```ts
interface RoomSceneProps {
  theme: 'day' | 'night'
  diaryHref?: string
  bookshelfHref?: string
  calendarHref?: string
  addBookHref?: string
  settingsHref?: string
}
```

- `theme` prop은 **필수**. 기본값을 두지 않는다(호출부가 반드시 전달).
- 내부에 `const SPRITE_BASE = theme === 'day' ? '/sprites/day' : '/sprites/night'`.
- `SPRITE_DEFS`의 `src` 값은 파일명만 보관하고 렌더 시점에 `${SPRITE_BASE}/${filename}` 조합.
- 기존 `HITBOX_DEFS`, `SCENE_STYLE`은 변경하지 않는다.
- `theme` 변경 시 스프라이트가 교체되며 `settledCount`가 재초기화되어야 한다. `useEffect`로 `theme` 변경 감지하여 카운터 리셋.

### 2. 파일명 정리

현재 `public/sprites/day/`와 `public/sprites/night/`의 파일명이 완전히 일치해야 한다. 불일치가 있으면(예: `Bookstack.png` vs `BookStack.png`) **이 step에서 파일을 이동/이름변경하지 마라**. 대신:
- `SPRITE_DEFS`에 파일명을 배열로 두지 말고, 테마별로 서로 다를 가능성을 고려해 `{ day: 'Bookstack.png', night: 'BookStack.png' }` 구조로 상수를 둔다.
- 간단화를 위해 `const SPRITE_FILES: Record<string, { day: string; night: string }>`를 상수화.

### 3. `src/app/page.tsx`

- 서버에서 세션 + preference → `resolveTheme` → `<RoomScene theme={theme} ... />`.
- 비회원은 `'system'` 기본 → `resolveTheme('system', new Date())`.
- 기존 `<GuestBanner>`, 레터박스 레이아웃은 유지.

### 4. 테스트

- `RoomScene.test.tsx`:
  - `theme="day"`일 때 `img[src^="/sprites/day/"]`가 렌더되는지.
  - `theme="night"`일 때 `img[src^="/sprites/night/"]`가 렌더되는지.
  - `theme` prop 변경 시 `src`가 바뀌는지(rerender).
  - hitbox label/href 매핑은 기존 테스트가 통과 유지.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - `theme` prop이 필수(optional ?X)이고 `'day' | 'night'` 유니온인가?
   - 파일명 불일치가 있다면 `SPRITE_FILES` 맵에서 테마별로 분리되어 있는가?
   - `<Image>` 또는 `<img>`의 `alt`, `aria-hidden` 기존 접근성 속성이 유지되는가?
3. `phases/1-mvp/index.json` step 3 업데이트.
4. 커밋 분리.

## 금지사항

- 스프라이트 파일명을 이 step에서 바꾸지 마라. 이유: 에셋 이동은 리뷰 범위를 흐린다. 맵으로 흡수한다.
- `RoomScene`을 Server Component로 바꾸지 마라. 이유: `useRouter`, `useEffect` 사용 중(기존 구조 유지).
- `app/page.tsx`에서 client로 테마를 결정하지 마라. 이유: SSR 초기 렌더가 반대 테마로 깜빡인다.
- 기존 테스트를 깨뜨리지 마라.