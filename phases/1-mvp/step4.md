# Step 4: settings-theme-toggle

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` (ThemeSelector 컴포넌트 사양, ToggleTabs)
- `/docs/ARCHITECTURE.md` (§13 revalidate)
- `/docs/ADR.md` (ADR-018)
- `/src/app/settings/page.tsx`
- `/src/components/ui/ToggleTabs.tsx`
- `/src/components/settings/NicknameForm.tsx`
- `/src/lib/actions/profile.ts`
- `/src/lib/storage/preferences.ts` (step1 결과)
- `/src/lib/theme.ts` (step2 결과)
- `/src/components/theme/ThemeHydrator.tsx` (step2 결과)

## 작업

`/settings`에 테마 선택 토글을 추가한다. 회원/비회원 경로 모두 지원.

### 1. `src/components/settings/ThemeSelector.tsx`

```ts
interface ThemeSelectorProps {
  initialPreference: 'system' | 'day' | 'night'
  isLoggedIn: boolean
}
```

- `'use client'`.
- UI: `ToggleTabs` 3칸 (`자동` / `낮` / `밤`). 내부 value는 `'system'` / `'day'` / `'night'`.
- 변경 시 동작:
  1. 낙관적으로 UI 상태 즉시 갱신.
  2. `document.documentElement.dataset.theme = resolveTheme(next)`로 즉시 화면 테마 반영.
  3. 저장:
     - 회원: `updateThemePreferenceAction(next)` Server Action 호출.
     - 비회원: `preferences.ts.updatePreferences({ themePreference: next })`.
  4. 실패 시 이전 값으로 롤백 + 토스트("테마를 저장하지 못했어요").
- 보조 텍스트: `text-xs text-[var(--color-text-secondary)]`로 "밤에는 어둡게, 낮에는 밝게 보여요".

### 2. `src/lib/actions/profile.ts`

- `updateThemePreferenceAction(pref)` 추가:
  - 입력 zod 검증(`z.enum(['system','day','night'])`).
  - 세션 확인, 없으면 `UNAUTHORIZED`.
  - `supabase.from('profiles').update({ theme_preference: pref }).eq('user_id', uid)`.
  - 성공 후 `revalidatePath('/')`, `revalidatePath('/settings')`.
  - 반환: `ActionResult<void>`.

### 3. `src/app/settings/page.tsx`

- 회원/비회원 분기 내부에 `<ThemeSelector ... />` 섹션 추가.
- 회원: 서버에서 `profiles.theme_preference`를 읽어 `initialPreference`로 전달.
- 비회원: 기본값 `'system'` 전달. mount 후 `ThemeSelector`가 preferences에서 실제값을 로드하도록 `useEffect` 사용.
- 기존 계정/프로필/동기화 섹션 위치는 유지.

### 4. 테스트

- `ThemeSelector.test.tsx`:
  - 3개 탭 렌더 + 초기값 선택 상태.
  - 회원 경로: action mock → 클릭 시 호출, 실패 시 롤백.
  - 비회원 경로: preferences mock → 클릭 시 `updatePreferences` 호출.
  - `document.documentElement.dataset.theme` 즉시 교체.
- `profile.test.ts`: `updateThemePreferenceAction` 성공/실패/검증.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - 비회원 경로에서 서버로 데이터가 전송되지 않는가(CLAUDE.md CRITICAL)?
   - `updateThemePreferenceAction`이 RLS로 `user_id = auth.uid()` 조건을 건 업데이트인가?
   - 낙관적 UI + 실패 롤백이 구현되었는가?
3. `phases/1-mvp/index.json` step 4 업데이트.
4. 커밋 분리.

## 금지사항

- `ThemeSelector`를 Server Component로 만들지 마라. 이유: `document` 접근 + 상호작용.
- 비회원의 `themePreference`를 서버 Action으로 전송하지 마라. 이유: CLAUDE.md CRITICAL (비회원 서버 업로드 금지).
- `<html>` 변경을 layout.tsx에서 매 렌더 재계산하지 마라. 이유: 이미 step2에서 서버에서 결정. 여기서는 클라이언트가 data-theme만 갱신.
- 기존 테스트를 깨뜨리지 마라.
