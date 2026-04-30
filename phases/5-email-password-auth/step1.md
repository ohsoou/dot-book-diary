# Step 1: signup-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — 모듈 의존성 계층, §6.4 로그인 시퀀스
- `docs/ADR.md` — ADR-002(Supabase), ADR-016(닉네임/프로필), ADR-029(이메일+비밀번호)
- `docs/UI_GUIDE.md` — 인증 폼 스펙 섹션 (step 0에서 추가됨), Button 컴포넌트 스펙
- `src/lib/errors.ts` — AppErrorCode 유니온 (EMAIL_TAKEN, WEAK_PASSWORD 등 step 0에서 추가됨)
- `src/lib/validation.ts` — 기존 profileSchema, toValidationError 패턴 파악
- `src/lib/actions/profile.ts` — Server Action 패턴 (auth 체크, zod 검증, Supabase 호출, ActionResult 반환)
- `src/app/login/page.tsx` — 로그인 페이지 구조 (signup 페이지 동일 패턴)
- `src/components/auth/LoginForm.tsx` — 인증 폼 컴포넌트 패턴 (클라이언트, useState, pending 상태)
- `src/components/ui/Button.tsx` — pending prop 패턴

## 배경

인증 방식을 OTP → 이메일+비밀번호로 전환하는 과정에서 회원가입 페이지가 신규로 필요하다.
이전에는 OTP 단일 진입점(로그인 = 가입)이었지만, 이제 가입과 로그인이 분리된다.

**가입 흐름**: `/signup` → 이메일+비밀번호+닉네임 입력 → `signUpAction` 서버 액션 호출 →
`supabase.auth.signUp()` → 확인 메일 발송 → 성공 안내 표시.

닉네임은 `user_metadata.nickname`으로 저장해 이메일 확인 후 callback에서 `profiles` 테이블에 저장된다.
(callback 처리는 Step 2에서 담당)

**TDD**: 테스트를 먼저 작성하고, 테스트가 통과하도록 구현하라.

## 작업

### 1. `src/lib/validation/auth.ts` (신규)

`src/lib/validation.ts`의 `toValidationError` 유틸을 재사용하되 auth 전용 스키마를 별도 파일로 분리한다.

```ts
import { z } from 'zod'

export const emailSchema = z.string().email('올바른 이메일 형식이 아니에요')

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 해요')
  .regex(/[a-zA-Z]/, '영문자를 포함해야 해요')
  .regex(/[0-9]/, '숫자를 포함해야 해요')

export const nicknameSchema = z.string().min(1, '닉네임을 입력해 주세요').max(30, '닉네임은 30자 이하여야 해요').trim()

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
})

export type SignUpInput = z.infer<typeof signUpSchema>
```

### 2. `src/lib/validation/auth.test.ts` (신규, TDD 우선 작성)

- `emailSchema` — 올바른 이메일 통과, 잘못된 형식 실패
- `passwordSchema` — 8자+영문+숫자 통과, 7자 실패, 숫자 없음 실패, 영문 없음 실패
- `nicknameSchema` — 빈 문자열 실패, 31자 실패, 정상 통과, trim() 적용 확인

### 3. `src/lib/actions/auth.ts` (신규)

파일 최상단에 `'use server'` 선언.

```ts
export async function signUpAction(
  input: SignUpInput
): Promise<ActionResult<{ email: string }>>
```

구현 지침:
- `signUpSchema.safeParse(input)` 로 검증. 실패 시 `VALIDATION_FAILED` + `fieldErrors` 반환.
- `createClient()` 후 `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { nickname } } })` 호출.
  - `emailRedirectTo` = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`
- Supabase 에러 처리:
  - 에러 메시지에 "already registered" 또는 "User already registered" 포함 → `EMAIL_TAKEN` 반환
  - 에러 메시지에 "Password should be" 포함 → `WEAK_PASSWORD` 반환
  - 그 외 → `UPSTREAM_FAILED` 반환
- 성공 시 `{ ok: true, data: { email } }` 반환 (세션은 아직 없음 — 확인 메일 클릭 후 생성됨)
- `server-only` import 불필요 (`'use server'` 선언으로 충분)

### 4. `src/lib/actions/auth.test.ts` (신규, TDD 우선 작성)

- 검증 실패(이메일 없음) → `ok: false`, `code: 'VALIDATION_FAILED'`
- 이미 가입된 이메일 → `ok: false`, `code: 'EMAIL_TAKEN'`
- Supabase 성공 → `ok: true`, `data.email` 반환
- Supabase 일반 오류 → `ok: false`, `code: 'UPSTREAM_FAILED'`

Supabase 클라이언트는 vi.mock으로 모킹한다. `createClient`의 반환값을 제어한다.

### 5. `src/components/auth/SignupForm.tsx` (신규)

`'use client'` 선언.

```tsx
export function SignupForm()
```

구현 지침:
- `useTransition`으로 서버 액션 호출. `isPending` → 버튼 pending 상태.
- 필드: 이메일, 비밀번호(`type="password"`), 닉네임
- 성공(`ok: true`) 시 폼 대신 "확인 메일을 보냈어요. 메일함을 확인해 주세요." 안내 텍스트 표시.
- 실패 시 에러 코드에 따른 한국어 메시지 표시:
  - `EMAIL_TAKEN` → "이미 가입된 이메일이에요"
  - `WEAK_PASSWORD` → "비밀번호는 영문+숫자 8자 이상이어야 해요"
  - `VALIDATION_FAILED` → `fieldErrors` 가 있으면 해당 필드 아래 표시, 없으면 일반 에러
  - `UPSTREAM_FAILED` → "가입에 실패했어요. 잠시 후 다시 시도해 주세요."
- "이미 계정이 있으신가요? 로그인" 링크 → `/login`
- UI 스타일: UI_GUIDE.md의 인증 폼 스펙 준수 (보라/인디고 금지)

### 6. `src/components/auth/SignupForm.test.tsx` (신규, TDD 우선 작성)

- 폼이 이메일/비밀번호/닉네임 필드를 렌더하는지 확인
- 제출 시 `signUpAction` 호출됨 (vi.mock)
- 성공 시 "확인 메일" 안내 텍스트 표시
- `EMAIL_TAKEN` 에러 시 에러 메시지 표시
- "로그인" 링크가 `/login`을 가리키는지 확인

### 7. `src/app/signup/page.tsx` (신규)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = { title: '회원가입' }

export default async function SignupPage()
```

구현 지침:
- `createClient()` → `getUser()` 체크. 이미 로그인된 사용자는 `/`로 redirect.
- 로그인 안 된 경우 `<SignupForm />`을 렌더.
- 레이아웃: `login/page.tsx`와 동일 (`flex min-h-screen items-center justify-center px-4` + `max-w-sm` 래퍼).

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
bun test src/lib/validation/auth
bun test src/lib/actions/auth
bun test src/components/auth/SignupForm
```
모두 통과.

```bash
bun test
```
전체 통과 (기존 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `/signup` 라우트가 빌드에 포함됐는지 확인 (`.next/types/app/signup/page.ts` 생성 여부).
3. `phases/5-email-password-auth/index.json`의 step 1을 업데이트한다.
4. 커밋:
   - `feat(5-email-password-auth): step 1 — signup-page`
   - `chore(5-email-password-auth): step 1 output`

## 금지사항

- `LoginForm.tsx`를 이 step에서 수정하지 마라 — Step 3에서 담당한다.
- `src/app/auth/callback/route.ts`를 이 step에서 수정하지 마라 — Step 2에서 담당한다.
- 기존 `src/lib/validation.ts` 파일을 삭제하거나 수정하지 마라 — `validation/auth.ts`는 별도 신규 파일이다.
- 보라/인디고 색상(`violet`, `indigo`, `purple`)을 UI에 사용하지 마라.
- 기존 테스트를 삭제하거나 skip하지 마라.
