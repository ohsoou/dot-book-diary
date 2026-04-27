# Step 2: guest-theme-disable

## 읽어야 할 파일

- `src/components/settings/ThemeSelector.tsx` — 전체 (특히 `isLoggedIn` prop 사용부)
- `src/components/settings/NicknameForm.tsx` — 비회원 분기 UI 패턴(L9-18) 참고
- `src/app/settings/page.tsx` — ThemeSelector 호출부, `isGuest` 플래그 (L35)
- `docs/UI_GUIDE.md` — 색상 토큰, 금지 클래스 확인

## 배경

**버그**: 비회원이 `/settings`에서 테마를 변경하면 IndexedDB에는 저장되지만, `settings/page.tsx`는 server component이므로 IndexedDB를 읽을 수 없다. 새로고침 시 ThemeSelector가 `initialPreference='system'`으로 리셋되어 보인다. 또한 `page.tsx` 홈도 비회원에게는 `themePreference: 'system'` 고정이라서 `RoomScene`에 전달되는 sprite 경로(`/sprites/day` vs `/sprites/night`)가 사용자 선택과 무관하다.

**정책 결정 (ADR-027)**: 이 불일치는 SSR↔IndexedDB 동기화 없이는 근본 해결이 어렵다. 이번 phase에서는 비회원 테마 토글을 비활성화하여 "저장된 것처럼 보이지만 반영 안 됨" 혼란을 제거한다. 회원만 테마를 변경할 수 있으며, 비회원에게는 로그인 유도 안내를 표시한다.

**참고**: `settings/page.tsx`는 이미 `isLoggedIn={!isGuest}`를 ThemeSelector에 전달하고 있다. ThemeSelector에서 이 prop을 사용하여 분기만 추가하면 된다.

## 작업

### 1. `src/components/settings/ThemeSelector.tsx` — 비회원 분기 추가

`!isLoggedIn`이면 ToggleTabs 대신 NicknameForm 비회원 분기와 동일한 톤의 안내 블록을 렌더한다:

```tsx
if (!isLoggedIn) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[#6b5540]">로그인하면 테마를 저장할 수 있어요.</p>
      <Link
        href="/login"
        className="inline-block text-sm text-center bg-[#3a2a1a] border border-[#1a100a] px-4 py-2 text-[#d7c199] hover:border-[#a08866] transition-colors duration-100 ease-linear"
      >
        로그인
      </Link>
    </div>
  )
}
```

- `Link`는 `next/link`에서 import.
- `ToggleTabs`는 비회원 분기에서 렌더하지 않는다.
- `useState`, `useEffect`, toast 관련 로직은 회원 분기에만 실행되므로 그대로 유지한다.

**NicknameForm 비회원 분기**(참고용, 동일한 톤 유지):
```tsx
// src/components/settings/NicknameForm.tsx
if (isGuest) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[#6b5540]">...</p>
      <Link href="/login" className="inline-block text-sm text-center bg-[#3a2a1a] border border-[#1a100a] px-4 py-2 text-[#d7c199] ..." />
    </div>
  )
}
```

### 2. `src/components/settings/ThemeSelector.test.tsx` — 신규 작성

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeSelector } from './ThemeSelector'

describe('ThemeSelector', () => {
  it('renders theme toggle for logged-in user', () => {
    render(<ThemeSelector initialPreference="system" isLoggedIn={true} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('does not render toggle for guest', () => {
    render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('shows login prompt for guest', () => {
    render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)
    expect(screen.getByText('로그인하면 테마를 저장할 수 있어요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
  })
})
```

테스트 작성 → 실패 확인 → 구현 순서로 진행한다.

## Acceptance Criteria

```bash
bun test src/components/settings/ThemeSelector.test.tsx
```
3개 테스트 전부 통과.

```bash
bun build && bun test
```
전체 통과.

## 검증 절차

1. AC 커맨드 실행.
2. `bun dev` 후 비회원(시크릿 또는 로그아웃) `/settings`:
   - 테마 섹션에 ToggleTabs가 보이지 않음
   - "로그인하면 테마를 저장할 수 있어요." 텍스트와 로그인 링크가 보임
3. 회원 로그인 후 `/settings`:
   - 기존 ToggleTabs가 정상 렌더됨
   - 테마 변경 → Supabase 저장 동작 확인 (Network 탭 또는 새로고침 후 선택 유지)
4. `phases/4-mvp-polish/index.json`의 step 2 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
5. 커밋:
   - `feat(4-mvp-polish): step2 — guest-theme-disable`
   - `chore(4-mvp-polish): step 2 output`

## 금지사항

- `updatePreferences()` 함수를 삭제하거나 수정하지 마라. 다음 phase에서 SSR↔IndexedDB 동기화 시 다시 사용한다.
- `settings/page.tsx`에서 ThemeSelector 렌더를 조건부로 숨기지 마라. 비회원도 테마 섹션을 볼 수 있어야 하고, 안내 UI가 표시되어야 한다.
- `ToggleTabs`에 `disabled` prop을 추가하지 마라. 이번 방식은 분기 렌더로 처리한다.
- `rounded-*`, `backdrop-blur`, `gradient`, indigo, purple 클래스를 사용하지 마라.
- 이 step에서 레이아웃이나 sprite는 변경하지 마라.
