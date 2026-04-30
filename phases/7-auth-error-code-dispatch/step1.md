# Step 1: apply-mapper-to-actions

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — §11.5 Supabase Auth 에러 매핑 (step 0에서 추가됨)
- `docs/ADR.md` — ADR-030 (step 0에서 추가됨)
- `src/lib/auth/error-codes.ts` — 매퍼 시그니처와 매핑 테이블 (step 0에서 생성됨)
- `src/lib/auth/error-codes.test.ts` — 매퍼 테스트 (step 0에서 생성됨)
- `src/lib/actions/auth.ts` — 현재 `signUpAction` 구현 (메시지 분기 교체 대상)
- `src/lib/actions/auth.test.ts` — 기존 테스트 패턴
- `src/components/auth/LoginForm.tsx` — 현재 로그인 분기 (메시지 분기 교체 대상)
- `src/components/auth/LoginForm.test.tsx` — 기존 테스트 패턴

step 0에서 만든 매퍼의 매핑 테이블과 fallback 정책을 정확히 이해한 뒤 작업하라.

## 작업

### 1. `src/lib/actions/auth.ts` — 메시지 분기 교체

`signUpAction` 내 Supabase 에러 처리 블록을 매퍼 호출로 교체:

```ts
import { mapSupabaseAuthError } from '@/lib/auth/error-codes'

// ...
if (error) {
  return { ok: false, error: mapSupabaseAuthError(error) }
}
```

- `signUpAction`의 반환 타입과 성공 경로는 변경하지 마라.
- Zod 검증 실패 분기(`toValidationError`)는 그대로 둔다.

### 2. `src/components/auth/LoginForm.tsx` — 메시지 분기 교체

`signInError` 처리 블록을 매퍼 호출로 교체:

```ts
import { mapSupabaseAuthError } from '@/lib/auth/error-codes'

// ...
if (signInError) {
  const { message } = mapSupabaseAuthError(signInError)
  setLocalError(message)
  return
}
```

- 컴포넌트 상단의 `ERROR_MESSAGES` 상수(`link_expired`, `profile_setup_failed`)는 콜백 라우트 쿼리 파라미터용이므로 그대로 유지한다.
- 임포트는 `@/` 절대 경로 사용.

### 3. 테스트 보강

**`src/lib/actions/auth.test.ts`**: code 기반 케이스 추가
- `code: 'user_already_exists'` → `EMAIL_TAKEN`
- `code: 'weak_password'` → `WEAK_PASSWORD`
- 알 수 없는 code → `UPSTREAM_FAILED`

**`src/components/auth/LoginForm.test.tsx`**: code 기반 케이스 추가
- `code: 'invalid_credentials'` → "이메일 또는 비밀번호..." 표시
- `code: 'email_not_confirmed'` → "이메일을 확인해 주세요..." 표시

기존 메시지 기반 테스트는 fallback 검증이므로 삭제하지 마라.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

## 검증 절차

1. AC 커맨드 실행.
2. `src/lib/actions/auth.ts`에서 `error.message.includes(...)` 흔적이 사라졌는지 확인:
   ```bash
   grep -n "msg.includes" src/lib/actions/auth.ts
   # 결과 없어야 함
   ```
3. `src/components/auth/LoginForm.tsx`에서 `signInError.message.includes(...)` 흔적이 사라졌는지 확인:
   ```bash
   grep -n "message.includes" src/components/auth/LoginForm.tsx
   # 결과 없어야 함
   ```
4. `phases/7-auth-error-code-dispatch/index.json` step 1 업데이트.
5. 커밋:
   - `refactor(7-auth-error-code-dispatch): step 1 — apply-mapper-to-actions`
   - `chore(7-auth-error-code-dispatch): step 1 output`

## 금지사항

- `src/lib/auth/error-codes.ts`의 매핑 테이블이나 시그니처를 바꾸지 마라 — step 0에서 안정화된 인터페이스다.
- `src/lib/errors.ts`의 `AppErrorCode` 유니온을 수정하지 마라.
- `auth/callback/route.ts`, `ResetPasswordForm.tsx`, `ForgotPasswordForm.tsx`를 건드리지 마라 — 이번 phase 범위 외다.
- `LoginForm.tsx`의 `ERROR_MESSAGES` 상수를 매퍼와 통합하지 마라.
- 기존 테스트 케이스를 삭제하지 마라.
