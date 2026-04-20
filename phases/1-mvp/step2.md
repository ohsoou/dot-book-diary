# Step 2: theme-resolver-and-layout

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.2 테마 결정, §15 인증·콜백)
- `/docs/ADR.md` (ADR-018)
- `/src/app/layout.tsx`
- `/src/app/globals.css` (step0 결과)
- `/src/lib/storage/preferences.ts` (step1 결과)
- `/src/lib/supabase/server.ts`
- `/src/types/index.ts` (step1 결과)

## 작업

테마를 결정하는 순수 함수와 SSR 레이아웃/클라이언트 hydrator를 도입한다.

### 1. `src/lib/theme.ts`

```ts
export type ThemePreference = 'system' | 'day' | 'night';
export type Theme = 'day' | 'night';

export function resolveTheme(pref: ThemePreference, now?: Date): Theme {
  // 'day' | 'night'는 그대로 반환
  // 'system'은 로컬 시각 기준: 18:00~06:00 night, 외는 day
}
```

- 내부 구현은 `now?.getHours() ?? new Date().getHours()` 1줄 수준.
- SSR에서 호출되므로 `window` 참조 금지.
- `'use client'`/`'use server'` 디렉티브 없음(어디서든 호출 가능한 순수 함수).

### 2. `src/app/layout.tsx` 서버 분기

- `createServerClient()`로 세션 조회.
- 세션이 있으면 `profiles.theme_preference` 읽기(없으면 `'system'` 폴백).
- 없으면 `'system'` 사용.
- `resolveTheme(pref)` 결과를 `<html lang="ko" data-theme={theme}>`로 설정.
- 비회원은 preferences를 서버에서 읽을 수 없으므로 일단 `'system'`(→ 시각 기반) 기본값 사용.
- `data-theme`는 항상 `'day'` 또는 `'night'`. `'system'`을 그대로 속성값에 쓰지 마라.

### 3. `src/components/theme/ThemeHydrator.tsx`

- `'use client'`.
- mount 시 `preferences.ts.getPreferences()`로 `themePreference` 읽고 `resolveTheme` 재계산.
- 서버가 이미 쓴 값과 다르면 `document.documentElement.dataset.theme`을 교체.
- 렌더는 `null` 반환. 순수 부수효과.
- `'system'`일 때 시간이 넘어가면(예: 18시 진입) 다시 평가하도록 15분 `setInterval`을 등록한다. cleanup 필수.
- `storage` 이벤트(`dbd:preferences`는 idb-keyval이므로 이벤트 없음)는 구독하지 않는다. 탭 간 즉시 동기화는 MVP1 비범위.

`layout.tsx`에서 `<body>` 최상단에 `<ThemeHydrator />`를 배치한다.

### 4. 테스트

- `theme.test.ts`:
  - `resolveTheme('day', X)` → `'day'`
  - `resolveTheme('night', X)` → `'night'`
  - `resolveTheme('system', new Date('2026-04-20T03:00:00'))` → `'night'`
  - 17:59 → `'day'`, 18:00 → `'night'`, 05:59 → `'night'`, 06:00 → `'day'` (로컬 타임존 기준, `setHours` 사용하여 타임존 독립적 테스트 작성)
- `ThemeHydrator.test.tsx`: preferences mock 후 mount → `document.documentElement.dataset.theme`이 예상값으로 교체되는지.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - `lib/theme.ts`가 `'use client'`/`'use server'` 없이 순수 함수인가?
   - SSR 초기 렌더에서 `<html data-theme>`가 서버에서 확정되는가?
   - 테스트의 시각 경계가 18:00 / 06:00 정각에서 명확히 나뉘는가?
3. `phases/1-mvp/index.json` step 2 업데이트.
4. 커밋 분리.

## 금지사항

- `ThemeHydrator`에서 `localStorage`를 직접 읽지 마라. 이유: 비회원은 IndexedDB(`preferences.ts`)가 진실원.
- `lib/theme.ts`를 client 전용으로 만들지 마라. 이유: 서버에서도 호출해야 SSR `<html data-theme>` 결정 가능.
- 페이지 단위 테마 토글을 여기서 만들지 마라. 이유: step4에서.
- 기존 테스트를 깨뜨리지 마라.