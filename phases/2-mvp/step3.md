# Step 3: letterbox-hud-components

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.5 Letterbox HUD)
- `/docs/ADR.md` (ADR-022 letterbox HUD)
- `/docs/UI_GUIDE.md` (BearStatusBar / LastReadNote 스펙, 카피 톤 & 보이스)
- `/src/app/page.tsx` — 현재 레이아웃 파악 필수
- `/src/lib/bear-state.ts` — step 0에서 생성됨. BearStateResult 타입 참조.
- `/src/components/theme/ThemeHydrator.tsx` — 클라이언트 hydration 패턴 참조

## 작업

### 1. `src/components/room/BearStatusBar.tsx` 생성

```ts
interface BearStatusBarProps {
  label: string | null  // null이면 컨테이너 렌더하되 빈 텍스트 (레이아웃 공간 유지)
}
```

- `<p aria-live="polite" aria-atomic="true">` 래핑.
- 스타일: `py-1 text-center text-sm text-[var(--color-text-secondary)]`
- `label`이 null이면 `&nbsp;` 또는 비어있는 `<p>` 렌더 (HUD 자리 유지, Layout Shift 방지).

### 2. `src/components/room/LastReadNote.tsx` 생성

```ts
interface LastReadNoteProps {
  lastReadAt: string | null  // UTC ISO 또는 null
  now?: Date                  // 테스트 주입용, 기본 new Date()
}
```

- `formatElapsed`(`src/lib/bear-state.ts` export)를 사용하여 경과 시간 표시.
- `lastReadAt`이 null이면 "아직 독서 기록이 없어요".
- 파싱 실패 시도 null 취급.
- `<p className="py-1 text-center text-xs text-[var(--color-text-secondary)]">` 래핑.
- 시각 표시 부분은 `<time dateTime={lastReadAt}>` 으로 래핑.

### 3. `src/app/page.tsx` — 레이아웃 수정

현재 구조:
```
<main className="fixed inset-0 bg-[var(--color-border)] flex flex-col">
  {isGuest && <GuestBanner />}
  <div className="flex-1 flex items-center justify-center overflow-hidden">
    <RoomScene theme={theme} />
  </div>
</main>
```

변경 후:
```
<main className="fixed inset-0 bg-[var(--color-border)] flex flex-col">
  {isGuest && <GuestBanner />}
  <BearStatusBar label={bearLabel} />
  <div className="flex-1 flex items-center justify-center overflow-hidden">
    <RoomScene theme={theme} bearAsset={bearAsset} />
  </div>
  <LastReadNote lastReadAt={lastReadAt} />
</main>
```

`page.tsx` (서버 컴포넌트)에서 회원일 때:
- `getLastReadAtFromSupabase(user.id, supabase)` → `lastReadAt`
- `computeBearState(lastReadAt, { now: new Date() })` → `{ asset, label }`
- `bearAsset = result.asset`, `bearLabel = result.label`

비회원일 때:
- `lastReadAt = null`, `bearAsset = undefined`, `bearLabel = null`
- (클라이언트 hydration은 step 4에서 추가)

### 4. 테스트 (먼저 작성)

`src/components/room/BearStatusBar.test.tsx`:
1. `label="곰이 자고 있어요"` → 해당 텍스트 렌더 확인
2. `label={null}` → `aria-live="polite"` 컨테이너 존재 확인 (빈 텍스트)
3. `aria-live="polite"`, `aria-atomic="true"` 속성 확인

`src/components/room/LastReadNote.test.tsx`:
1. `lastReadAt={null}` → "아직 독서 기록이 없어요" 렌더
2. `lastReadAt` 제공 + `now` 주입 → "N일 전" 등 올바른 경과 렌더
3. `<time dateTime>` 요소 존재 확인
4. 잘못된 ISO 문자열 → "아직 독서 기록이 없어요" 폴백

## Acceptance Criteria

```bash
bun test src/components/room/BearStatusBar.test.tsx
bun test src/components/room/LastReadNote.test.tsx
bun run build
bun lint
```

## 검증 절차

1. AC 커맨드 실행.
2. `/` 페이지 빌드 후 브라우저에서 상단/하단 여백에 텍스트가 보이는지 확인 (회원 기준).
3. 비회원에서는 HUD 공간은 있으나 텍스트가 null/비어있음 확인 (step 4 전 상태).
4. `BearStatusBar`, `LastReadNote`가 CSS 변수만 사용하는지 확인 (`text-[#...]` 하드코드 금지).
5. 결과에 따라 `phases/2-mvp/index.json`의 step 3 업데이트.
6. 커밋 — 코드 변경(`feat:`)과 메타데이터(`chore:`) 분리 커밋

## 금지사항

- `rounded-*`, `backdrop-blur`, `bg-gradient`, indigo/purple 사용 금지. 이유: UI_GUIDE 금지사항.
- HUD에 고정 높이(`h-8` 등) 지정 금지. 이유: ADR-022에서 텍스트 높이로 자연 결정, 뷰포트 다양성 대응.
- `BearStatusBar`, `LastReadNote`에 `'use client'` 추가 금지. 이유: 두 컴포넌트는 순수 렌더 컴포넌트로 서버에서도 렌더 가능해야 함.
- 기존 테스트를 깨뜨리지 마라.
