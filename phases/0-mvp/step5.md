# Step 5: shared-ui-infrastructure

## 읽어야 할 파일

- `/docs/PRD.md` (빈 상태 카피, 에러 매핑)
- `/docs/ARCHITECTURE.md` ("에러 처리 규약", "폼 패턴", "혼합 렌더링 패턴")
- `/docs/UI_GUIDE.md` (컴포넌트 사양 — Button, Card, Toast, ConfirmDialog, EmptyState, Skeleton, FieldError, GuestBanner, UnsupportedEnvScreen)
- 이전 step: `src/app/layout.tsx`, `src/app/error.tsx`, `src/lib/errors.ts`, `src/lib/storage/preferences.ts`

## 작업

여러 화면에서 공통으로 쓰는 UI/에러/빈 상태/guest 안내 인프라를 먼저 만든다.

1. **공통 UI 컴포넌트** (`src/components/ui/`)
   - `Button.tsx`: `variant: 'primary' | 'secondary' | 'danger' | 'text'`, `pending` 상태, `disabled`. UI_GUIDE 사양 그대로.
   - `Card.tsx`: 단순 래퍼. `rounded-*` 없음. 1px hard border.
   - `PixelFrame.tsx`: 도트 테두리 데코레이터 (단순 CSS outline). 범용 프레임.
   - `ToggleTabs.tsx`: 탭 전환 (`variant: string[]`, `value`, `onChange`).
   - `Toast.tsx`: 토스트 컨테이너 + 개별 Toast 아이템. `aria-live`. 3초 자동 dismiss, 수동 닫기.
   - `ConfirmDialog.tsx`: 모달 래퍼. `role="dialog"`, `aria-modal`, ESC 닫기, focus trap.
   - `Modal.tsx`: ConfirmDialog 기반 범용 모달 (제목/콘텐츠/푸터 슬롯).
   - `EmptyState.tsx`: 빈 상태 레이아웃. message + optional CTA. UI_GUIDE 사양.
   - `Skeleton.tsx`: `h`, `w` prop. `animate-pulse`. `prefers-reduced-motion` 정지.
   - `FieldError.tsx`: `role="alert"`, `text-xs text-[#c85a54]`.
   - `GuestBanner.tsx`: `guestBannerDismissed` 읽기 + dismiss 로직. 카피는 PRD §8에서.
   - `UnsupportedEnvScreen.tsx`: IndexedDB/crypto.randomUUID/getUserMedia 감지. 로그인 버튼 제공.

2. **전역 provider**
   - `ToastProvider`: Context + React state. `src/app/layout.tsx`에 마운트.
   - `useToast()` hook: `addToast({ message, variant: 'success'|'error'|'info' })`.

3. **라우트 에러/로딩 패턴**
   - 기능 라우트에서 공통으로 재사용할 `loading.tsx` 패턴 — 카드 Skeleton 3개 기본.
   - `error.tsx` 패턴 — "오류가 생겼어요. {message}" + "다시 시도" 버튼.
   - step 0에서 만든 루트 `error.tsx`와 일관성 유지.

4. **폼 훅**
   - `src/lib/hooks/useUnsavedChanges.ts`: `beforeunload` 이벤트 등록/해제 + `isDirty: boolean` 상태. DiaryEntryForm에서 사용.

5. **테스트**
   - `src/components/ui/Button.test.tsx`: variant, pending, disabled 상태.
   - `src/components/ui/ConfirmDialog.test.tsx`: 열기/닫기, ESC, confirm/cancel 콜백.
   - `src/components/ui/GuestBanner.test.tsx`: dismissed 시 미렌더, dismiss 시 preferences 업데이트.
   - `src/components/ui/EmptyState.test.tsx`: message + CTA 렌더.
   - `src/components/ui/FieldError.test.tsx`: role="alert", 빈 문자열 시 미렌더.
   - `src/components/ui/Toast.test.tsx`: 추가/자동dismiss/수동닫기.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `Button`, `Toast`, `ConfirmDialog`, `Skeleton`, `GuestBanner`, `FieldError`가 모두 존재하는가?
   - `guestBannerDismissed` 동작이 로컬 preference와 연결되는가?
   - `useUnsavedChanges` hook이 있는가?
   - UI_GUIDE 금지 사항(`rounded-*`, `gradient`, `backdrop-blur`)을 쓰지 않았는가?
   - 모든 모달/다이얼로그에 `role="dialog"` + `aria-modal`이 있는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- shadcn, Radix UI, Headless UI 등 범용 UI 라이브러리 도입 금지.
- 디자인 규칙을 이유 없이 완화하지 마라.
- `GuestBanner`에서 IndexedDB를 직접 읽지 마라 — `preferences.ts`를 통한다.
- 기존 테스트를 깨뜨리지 마라.
