<!-- execute.py 자동 주입 대상 아님. step.md "읽어야 할 파일"에 명시적으로 추가할 것. -->

# 기능 구현 세부사항

## 22.1 독서 타이머 지속성 (MVP1, `lib/reading-timer.ts`)

- 저장소: `localStorage` 키 `dbd:reading_timer`. 값: `{ bookId, startedAt(ms), pausedAt?(ms), accumulatedMs, status: 'running'|'paused'|'stopped' }`.
- API: `read()`, `start(bookId)`, `pause()`, `resume()`, `stop() → { seconds, bookId }`, `clear()`. 모두 동기.
- 단일 활성 타이머: `start(bookId)` 호출 시 다른 책의 running/paused 상태가 있으면 `AppError('VALIDATION_FAILED')` 또는 caller가 확인 후 `stop()` 호출.
- UI는 1초 `setInterval`로 재렌더. 상태 진실원은 localStorage.
- 탭 간 동기화: `window.addEventListener('storage', ...)`로 다른 탭 변경 반영.
- `stop()` 결과를 `ReadingSessionForm`이 받아서 `durationMinutes = Math.round(seconds/60)`로 프리필한다. 자동 저장하지 않는다.
- SSR에서 접근하지 않는다(전부 `'use client'` 컴포넌트에서만 사용).

## 22.2 테마 결정 (MVP1, `lib/theme.ts`)

```ts
export type ThemePreference = 'system' | 'day' | 'night';
export type Theme = 'day' | 'night';

export function resolveTheme(pref: ThemePreference, now: Date = new Date()): Theme {
  if (pref === 'day') return 'day';
  if (pref === 'night') return 'night';
  const h = now.getHours();
  return (h >= 18 || h < 6) ? 'night' : 'day';
}
```

- 서버 컴포넌트: `createServerClient()`로 세션 조회 → `profiles.theme_preference` → `resolveTheme` → `<html data-theme>`.
- 비회원 SSR: 기본 `night` 렌더 → `ThemeHydrator`가 mount 시 `preferences.ts.getPreferences().themePreference`로 재계산하여 `document.documentElement.dataset.theme` 교체.
- 교체 순간 깜빡임을 줄이기 위해 `<html>` 자체는 항상 CSS 변수로 색을 받는다(테마별 variable set만 교체).

## 22.3 책 목표 진행률 (MVP1)

- 모델: `books.target_date date` (nullable). 검증: `target_date ≥ book.createdAt(로컬 ymd)`.
- 계산(순수 함수, `GoalProgress` 안 또는 별도 유틸):
  - `pageProgress = maxEndPage / totalPages` (둘 다 있을 때)
  - `dateProgress = (today - createdAt) / (targetDate - createdAt)` (targetDate 있을 때, 0 이하 clamp)
  - 상태: `page ≥ date` → `'on-track'`, `date - page ≥ 0.1` → `'behind'`, `today > targetDate && pageProgress < 1` → `'overdue'`.
- revalidate: `updateBook(target_date)` 성공 후 `/bookshelf`, `/reading/[bookId]`.

## 22.4 곰 상태 파생 (MVP2, `lib/bear-state.ts`)

- **상태 종류**: `'fresh' | 'active' | 'sleeping'`
- **기준 데이터**: `reading_sessions.created_at` (마지막 세션의 UTC ISO 시각)
- **판정 규칙**:
  - `lastReadAt === null` 또는 `elapsed < 0` → `fresh`, `Bear.png`, "곰이 책을 기다려요"
  - `elapsed < 1h` → `fresh`, `Bear.png`, "곰이 책을 읽고 왔어요"
  - `1h ≤ elapsed < 7d` → `active`, variant 1택, "곰이 {행동}하고 있어요"
  - `elapsed ≥ 7d` → `sleeping`, `Bear_sleeping.png`, "곰이 자고 있어요"
- **Variant 풀** (`active` 상태): `Bear_drinking | Bear_eating | Bear_healing | Bear_playing | Bear_working`
- **랜덤 시드**: `YYYY-MM-DD(오늘) + lastReadAt` 문자열 해시 → mulberry32 기반 시드 rng. 하루 단위 안정, 새 독서 기록 생성 시 variant 변경. `rng`는 주입 가능하여 테스트에서 결정적.
- **Night 테마**: day·night 동일 파일명 규칙. `public/sprites/night/Bear_*.png` 에셋 존재 전제.
- **API** (`lib/last-read.ts`):
  - `getLastReadAtFromStore(store: Store): Promise<string | null>` — LocalStore에서 전체 세션 로드 후 `created_at DESC` 1건
  - `getLastReadAtFromSupabase(userId: string, supabase): Promise<string | null>` — `select('created_at').eq('user_id',...).order('created_at',{ascending:false}).limit(1).maybeSingle()`. `server-only` 임포트 필수.

## 22.5 Letterbox HUD (MVP2)

- **BearStatusBar**: 메인 씬 상단 여백에 곰 상태 라벨. `aria-live="polite" aria-atomic="true"`.
- **LastReadNote**: 메인 씬 하단 여백에 경과 시간. `<time dateTime={lastReadAt}>` 래핑.
- **레이아웃**: `src/app/page.tsx`의 `<main>` flex-col 내부에서 상단 HUD → `flex-1` 씬 → 하단 HUD 3단 배치. HUD는 단일 텍스트 줄 높이로 최소화하여 씬 크기에 영향 없음.
- **비회원**: `BearStateHydrator` (ThemeHydrator 패턴) — 클라이언트 마운트 시 LocalStore 조회 → React Context로 HUD·RoomScene에 전파. 회원은 SSR prop으로 초기값 제공, hydrator 비활성.

## 22.6 야간 램프 on/off 토글 (MVP3, `lib/lamp-state.ts`)

- **테마 범위**: night 전용. `theme === 'night'`일 때만 램프 버튼 렌더.
- **스프라이트 파일명 규칙**: on 상태는 기본 파일명(`Background.png`, `Table_Lamp.png`), off 상태는 `_off` suffix(`Background_off.png`, `Table_Lamp_off.png`). 대상 에셋: `public/sprites/night/` 하위 두 파일.
- **상태 저장소**: `localStorage` 키 `dbd:lamp_state` (`'on' | 'off'`). `src/lib/lamp-state.ts`의 `readLampState` / `writeLampState` API를 통해서만 접근.
- **SSR 초기값**: `useState('on')` 고정으로 SSR 렌더. 마운트 후 `useEffect`에서 localStorage를 1회 읽어 hydrate. Hydration mismatch 방지.
- **램프 버튼**: `aria-label="램프 전원"`, `aria-pressed={lampState === 'on'}`.
- **애니메이션**: `lamp-flicker` 클래스는 `lampState === 'on'`이고 `prefers-reduced-motion`이 아닐 때만 적용. off 상태에서는 `prefers-reduced-motion` 조건과 동일하게 처리하여 정지.

## 22.7 곰 말풍선 / 닉네임 / hitbox 어포던스 (MVP4)

### 22.7.1 닉네임 헬퍼 (`src/lib/nickname.ts`)
- `getDisplayNickname(nickname?: string | null): string` — 폴백 `'책곰이'`. null·undefined·빈값·공백 전부 폴백.
- 단일 진실원. page.tsx(회원 SSR)·BearStateHydrator(게스트)·기본값 모두 이 함수만 사용.

### 22.7.2 nickname hydration 흐름
```
회원(SSR):
  page.tsx → profiles.select('theme_preference, nickname') → getDisplayNickname(profile?.nickname)
  → BearStateContextValue.nickname → BearSpeechBubble 헤더

게스트(CSR):
  BearStateHydrator → getPreferences().nickname → getDisplayNickname(prefs.nickname)
  → setGuestState({ ..., nickname }) → BearSpeechBubble 헤더
```

### 22.7.3 BearSpeechBubble 배치
- `src/components/room/BearSpeechBubble.tsx` — `'use client'`
- `page.tsx` `<main>` flex-col 내 RoomScene **위** 별도 full-width 블록. absolute 오버레이 아님(4-mvp-polish에서 변경).
- 외부 래퍼: `w-full px-4 py-4`. 내부: `bg-[#3a2a1a] border-2 border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-4 py-3`.
- `role="status" aria-live="polite" aria-atomic="true"`. bearLabel null이면 unmount.
- 헤더: nickname (`text-[#f4e4c1]`), 본문: bearLabel (`text-[#d7c199]`).
- `BearStatusBar` 제거됨. 하단 `LastReadNote`는 유지.

### 22.7.4 hitbox 어포던스
- HITBOX_DEFS 5개(`다이어리/책장/캘린더/책 등록/설정`)에만 적용.
- 버튼: `outline outline-1 outline-dashed outline-[#e89b5e]/60 hover:outline-[#e89b5e] focus-visible:outline-[#e89b5e] transition-[outline-color] duration-100`.
- 인디케이터 점: `absolute top-1 right-1 w-2 h-2 bg-[#e89b5e] border border-[#1a100a] aria-hidden`.
- 램프 전원 버튼은 제외.

### 22.7.5 일기↔책 BookPicker 데이터 흐름
- `BookPicker.tsx` (`'use client'`): `useStore().listBooks()` → native `<select>`. bookId를 state로 관리하여 form에 hidden input으로 직렬화.
- `DiaryEntryForm`: `initialBookId` → `useState(bookId)` → `BookPicker`로 제어. autosave draft에 반영.
- `DiaryList` / `DiaryEntryDetail`: 선택적 `books?: Book[]` prop으로 책 제목 표시.
- 책장 카드(`BookGrid`): "일기 쓰기" 링크 → `/diary/new?bookId={id}`.

## 22.8 4-mvp-polish — 메인 페이지 정비

### 22.8.1 레이아웃 수정 (step0)
- `<main>`의 `inset-0` → `top-0 inset-x-0 bottom-[64px]` 변경. BottomNav(`fixed bottom-0 h-[64px]`)와의 겹침 제거 → `LastReadNote`가 BottomNav 위에 표시됨.
- `RoomScene`의 `SCENE_STYLE` 단순화: `maxHeight: calc(100dvh - 64px)` 제거 → `height:'100%', maxHeight:'100%', maxWidth:'100%'`. 부모 `flex-1` 컨테이너가 높이를 결정.
- `body`의 `pb-[64px]`(root layout.tsx)는 유지 — 다른 페이지 자연 흐름 레이아웃에 필요.

### 22.8.2 설정 sprite (step1)
- `SPRITE_FILES`에 `setting: { day: 'Setting.png', night: 'Setting.png' }` 추가.
- `SPRITE_DEFS`에 `{ fileKey:'setting', label:'설정', z:35, style: { top:'2%', right:'1.25%', width:'6.25%', height:'10%' } }` 추가. 좌표는 `HITBOX_DEFS[설정]`과 동일.
- 파일: `public/sprites/{day,night}/Setting.png` (day/night 동일 이미지).

### 22.8.3 비회원 테마 토글 비활성 (step2)
- `ThemeSelector`에서 `!isLoggedIn`이면 `ToggleTabs` 대신 로그인 유도 안내 + 링크 렌더.
- 근거 및 제약: ADR-027 참조.
