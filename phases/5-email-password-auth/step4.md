# Step 4: password-reset-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 인증 폼 스펙 섹션 (forgot-password, reset-password)
- `docs/ADR.md` — ADR-029
- `src/app/signup/page.tsx` — 페이지 구조 패턴 (step 1에서 추가됨)
- `src/components/auth/SignupForm.tsx` — 폼 컴포넌트 패턴 (step 1에서 추가됨)
- `src/lib/validation/auth.ts` — passwordSchema 재사용 (step 1에서 추가됨)
- `src/components/ui/Button.tsx` — pending prop 패턴
- `src/lib/supabase/client.ts` — 클라이언트 Supabase 생성 패턴

## 배경

비밀번호를 잊었을 때의 재설정 흐름을 구현한다. 2단계로 구성된다:

1. **`/forgot-password`**: 이메일 입력 → `supabase.auth.resetPasswordForEmail()` →
   항상 "메일을 확인해 주세요" 응답 (이메일 존재 여부 누설 방지).

2. **`/reset-password`**: Supabase가 재설정 링크 클릭 후 이 URL로 redirect.
   URL에 `#access_token=...&type=recovery` 형태 포함 → Supabase 클라이언트가 자동으로 세션 수립.
   새 비밀번호 입력 → `supabase.auth.updateUser({ password })` → 성공 시 `/login`으로 이동.

**TDD**: 테스트를 먼저 작성하고, 테스트가 통과하도록 구현하라.

## 작업

### 1. `src/components/auth/ForgotPasswordForm.tsx` (신규)

`'use client'` 선언.

```tsx
export function ForgotPasswordForm()
```

구현 지침:
- 이메일 입력 필드 + [재설정 메일 받기] 버튼.
- 제출 시 `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${appUrl}/reset-password })`.
  - `appUrl` = `process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin`
- **Supabase 에러 발생 여부와 관계없이** 항상 성공 메시지 표시:
  "비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요."
  (이메일 존재 여부 노출 방지)
- 성공 후 폼 숨기고 안내 텍스트만 표시.
- 로그인 링크: "로그인으로 돌아가기" → `/login`

### 2. `src/components/auth/ForgotPasswordForm.test.tsx` (신규, TDD 우선)

- 이메일 필드 렌더 확인
- 제출 시 `resetPasswordForEmail` 호출됨 (createClient 모킹)
- 제출 후 성공 안내 텍스트 표시 (Supabase 에러 여부와 관계없이)
- 로그인 링크가 `/login`을 가리키는지 확인

### 3. `src/app/forgot-password/page.tsx` (신규)

```tsx
export const metadata = { title: '비밀번호 재설정' }
export default async function ForgotPasswordPage()
```

- 로그인된 사용자도 접근 가능 (비밀번호 변경 시나리오).
- `<ForgotPasswordForm />` 렌더.
- 레이아웃: `signup/page.tsx`와 동일 (`flex min-h-screen items-center justify-center px-4`).

### 4. `src/components/auth/ResetPasswordForm.tsx` (신규)

`'use client'` 선언.

```tsx
export function ResetPasswordForm()
```

구현 지침:
- 새 비밀번호 입력 필드(`type="password"`) + [비밀번호 변경] 버튼.
- `passwordSchema` 클라이언트 사이드 검증 (`passwordSchema.safeParse(password)`).
- `supabase.auth.updateUser({ password })` 호출.
  - 성공 시 `router.push('/login?reason=password_changed')` (또는 `/login` 직접).
  - 실패 시 에러 메시지: "비밀번호 변경에 실패했어요. 재설정 링크가 만료됐을 수 있어요."
- Supabase `onAuthStateChange`로 `PASSWORD_RECOVERY` 이벤트를 감지해 세션 수립 여부 확인 (선택적 강화).
  - 구현이 복잡해지면 단순히 `updateUser` 직접 호출로만 구현해도 됨.

### 5. `src/components/auth/ResetPasswordForm.test.tsx` (신규, TDD 우선)

- 비밀번호 필드 렌더 확인
- 제출 시 `updateUser` 호출됨 (createClient 모킹)
- 성공 시 `/login` 으로 router.push 호출됨
- 실패 시 에러 메시지 표시

### 6. `src/app/reset-password/page.tsx` (신규)

```tsx
export const metadata = { title: '새 비밀번호 설정' }
export default function ResetPasswordPage()
```

- Client Component('use client') 또는 Server Component 중 선택.
  - Supabase URL fragment(`#access_token=...`)는 클라이언트에서만 접근 가능하므로, `ResetPasswordForm`이 `'use client'`이고 Supabase 클라이언트가 자동으로 처리한다.
  - Page 자체는 Server Component로 유지 가능.
- `<ResetPasswordForm />` 렌더.
- 레이아웃: 동일 패턴.

## Acceptance Criteria

```bash
bun build
```
0 에러.

```bash
bun lint
```
0 에러.

```bash
bun test src/components/auth/ForgotPasswordForm
bun test src/components/auth/ResetPasswordForm
```
모두 통과.

```bash
bun test
```
전체 통과 (기존 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `/forgot-password`, `/reset-password` 라우트가 빌드에 포함됐는지 확인.
3. `phases/5-email-password-auth/index.json`의 step 4를 업데이트한다.
4. 커밋:
   - `feat(5-email-password-auth): step 4 — password-reset-flow`
   - `chore(5-email-password-auth): step 4 output`

## 금지사항

- `resetPasswordForEmail` 호출 결과에 따라 다른 메시지를 보여주지 마라 — 항상 동일한 성공 메시지.
- 비밀번호 필드를 `type="text"`로 만들지 마라.
- 보라/인디고 색상을 UI에 사용하지 마라.
- 기존 테스트를 삭제하거나 skip하지 마라.
