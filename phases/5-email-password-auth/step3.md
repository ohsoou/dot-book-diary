# Step 3: login-form-password

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 인증 폼 스펙 섹션 (step 0에서 추가됨)
- `docs/ADR.md` — ADR-029
- `src/components/auth/LoginForm.tsx` — 현재 OTP 기반 구현 전체
- `src/app/login/page.tsx` — ERROR_MESSAGES 맵과 searchParams 처리
- `src/lib/errors.ts` — INVALID_CREDENTIALS, EMAIL_NOT_CONFIRMED (step 0에서 추가됨)
- `src/lib/validation/auth.ts` — emailSchema, passwordSchema (step 1에서 추가됨)
- `src/components/auth/SignupForm.tsx` — 폼 스타일/패턴 일관성 확인 (step 1에서 추가됨)
- `src/components/ui/Button.tsx` — pending prop 패턴

## 배경

현재 `LoginForm`은 `signInWithOtp` + Google OAuth 버튼으로 구성되어 있다.
이를 `signInWithPassword` 단일 경로로 완전히 재작성한다.

**로그인 흐름**: 이메일 + 비밀번호 입력 → `supabase.auth.signInWithPassword()` 클라이언트 직접 호출 →
성공 시 페이지 새로고침(`router.refresh()`) 또는 `router.push('/')`.

Google OAuth 버튼, 매직링크 로직, `sent` 상태 관련 코드를 모두 제거한다.

**TDD**: 테스트를 먼저 재작성하고, 테스트가 통과하도록 구현하라.

## 작업

### 1. `src/components/auth/LoginForm.tsx` 재작성

`'use client'` 선언 유지.

```tsx
export function LoginForm({ error, reason }: LoginFormProps)
```

구현 지침:
- **제거**: `signInWithOtp`, `signInWithOAuth`, Google 버튼, `sent` 상태, 매직링크 관련 UI 전부 삭제.
- **유지**: `error` + `reason` prop 처리 (LoginForm.tsx:7-11의 `ERROR_MESSAGES` 맵).
  - `oauth_failed` 키는 이제 더 이상 표시될 일이 없지만 타입 에러가 없도록 처리.
- **추가**: `password` 상태 (`useState('')`).
- **변경**: 폼 제출 시 `supabase.auth.signInWithPassword({ email, password })` 호출.
  - 에러 처리:
    - Supabase 에러 메시지에 "Invalid login credentials" 포함 → "이메일 또는 비밀번호가 일치하지 않아요" 표시
    - Supabase 에러 메시지에 "Email not confirmed" 포함 → `EMAIL_NOT_CONFIRMED` 처리: "이메일을 확인해 주세요." 표시 + 재발송 버튼(선택: `supabase.auth.resend({ type: 'signup', email })`)
    - 그 외 → "로그인에 실패했어요. 잠시 후 다시 시도해 주세요."
  - 성공 시 `router.push('/')` (useRouter 사용).
- **추가**: 폼 아래에 링크 두 개:
  - "비밀번호를 잊으셨나요?" → `/forgot-password`
  - "아직 계정이 없으신가요? 회원가입" → `/signup`
- UI 스타일: UI_GUIDE.md 인증 폼 스펙 준수. 비밀번호 입력 필드 추가.

### 2. `src/app/login/page.tsx` 수정

`ERROR_MESSAGES` 맵에서 `oauth_failed` 키를 제거하거나 유지하되 메시지를 일반화한다.
(이 에러는 이제 발생하지 않지만, URL에 직접 입력하는 경우를 대비해 일반 에러 메시지로 처리)

수정 사항:
- `oauth_failed: '소셜 로그인에 실패했어요.'` → 제거 또는 `'로그인에 실패했어요.'`로 변경
- 그 외 구조 변경 없음.

### 3. `src/components/auth/LoginForm.test.tsx` (신규 또는 재작성)

기존 OTP/OAuth 테스트는 삭제하고 password 기반 테스트로 교체:

- 이메일 + 비밀번호 필드가 렌더되는지 확인
- 폼 제출 시 `signInWithPassword` 호출됨 (createClient 모킹)
- 잘못된 자격증명 에러 시 "이메일 또는 비밀번호" 에러 메시지 표시
- "비밀번호를 잊으셨나요?" 링크가 `/forgot-password`를 가리키는지 확인
- "회원가입" 링크가 `/signup`을 가리키는지 확인
- `error=link_expired` prop 전달 시 해당 에러 메시지 표시
- `reason=expired` prop 전달 시 "세션이 만료됐어요" 메시지 표시

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
bun test src/components/auth/LoginForm
```
통과.

```bash
bun test
```
전체 통과 (기존 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `LoginForm.tsx`에 `signInWithOtp`, `signInWithOAuth`, Google 관련 코드가 없는지 확인:
   `grep "signInWithOtp\|signInWithOAuth\|google\|Google" src/components/auth/LoginForm.tsx` → 결과 없음.
3. `phases/5-email-password-auth/index.json`의 step 3을 업데이트한다.
4. 커밋:
   - `feat(5-email-password-auth): step 3 — login-form-password`
   - `chore(5-email-password-auth): step 3 output`

## 금지사항

- Google OAuth 버튼을 남기지 마라 — 완전히 제거한다.
- `signInWithOtp`을 어떤 형태로도 남기지 마라.
- 비밀번호 필드를 `type="text"`로 만들지 마라 — 반드시 `type="password"`.
- 보라/인디고 색상을 UI에 사용하지 마라.
- 기존 테스트를 단순 skip으로 처리하지 마라 — 제거하거나 새 로직으로 교체하라.
