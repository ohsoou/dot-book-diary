# Step 0: docs-and-error-codes

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/PRD.md` — §5 기능 목록(F8 로그인), §7 사용자 스토리(US-5/US-6), §9 설정 페이지, §11.6 보안
- `docs/ARCHITECTURE.md` — §6.4 로그인 시퀀스, §14 미들웨어, §15 인증·콜백 라우트
- `docs/ADR.md` — 마지막 ADR 번호 확인 (현재 ADR-028까지 존재. 이 step에서 ADR-029를 추가한다)
- `docs/UI_GUIDE.md` — 폼 UI 스펙 섹션 확인
- `src/lib/errors.ts` — 현재 AppErrorCode 유니온 타입과 AppError 클래스
- `src/lib/errors.test.ts` — 테스트 파일이 있다면 기존 테스트 패턴 파악

## 배경

이 프로젝트는 현재 Supabase Auth + 매직링크(OTP) + Google OAuth로 구현되어 있다.
이를 **이메일 + 비밀번호** 단일 경로로 전환한다:
- 회원가입: 이메일 + 비밀번호 + 닉네임 입력 → 확인 메일 발송 → 클릭 후 계정 활성화
- 로그인: 이메일 + 비밀번호 (확인 메일 반복 불필요)
- OTP/Google OAuth 완전 제거

이 step의 목적은 **코드 작성 전에 명세를 확정**하는 것이다(TDD/문서 우선).

## 작업

### 1. `docs/ADR.md` — ADR-029 추가

파일 끝에 다음 내용을 추가하라:

```
## ADR-029: 이메일+비밀번호 인증 채택, 매직링크/OTP/OAuth 제거

**결정**: 로그인 방식을 이메일+비밀번호 단일 경로로 변경한다. 매직링크(OTP)와 Google OAuth는 제거한다.

**이유**: 매직링크는 로그인할 때마다 이메일 메일함을 열어 링크를 클릭해야 해서 사용자 마찰이 과도하다. 단순 개인 독서 기록 앱에 불필요한 절차다. 비밀번호 기반은 한 번 가입 후 확인 메일 1회 클릭으로 계정을 활성화하고, 이후로는 비밀번호만 사용한다.

**결과·제약**:
- `/signup` 페이지 신규 추가 (이메일 + 비밀번호 + 닉네임)
- `/forgot-password` + `/reset-password` 페이지 신규 추가
- `src/lib/actions/auth.ts` 신규 (signUpAction)
- `src/lib/validation/auth.ts` 신규 (emailSchema, passwordSchema, nicknameSchema)
- `src/components/auth/LoginForm.tsx` 재작성 (signInWithPassword 사용)
- `src/components/auth/SignupForm.tsx` 신규
- `src/app/auth/callback/route.ts` 단순화 (OAuth 분기 제거, 닉네임 저장 추가)
- Supabase 대시보드 설정 필요: "Confirm email" ON, Magic Link/Google provider OFF
- `NEXT_PUBLIC_APP_URL` 환경변수 기반 콜백 URL (기존과 동일)
```

### 2. `docs/PRD.md` — 3곳 수정

**§5.5 F8 로그인 행** (표에서 "매직링크, Google OAuth" 부분):
- "매직링크, Google OAuth" → "이메일+비밀번호, 이메일 확인 메일"

**§7 US-5 회원 전환** 섹션 전체를 다음으로 교체:
```
### US-5. 회원 가입 및 로그인
- 가입: `/signup`에서 이메일/비밀번호/닉네임 입력 → 확인 메일 발송 안내.
- 확인: 메일 링크 클릭 → `/auth/callback` → 세션 수립 → `/`로 이동.
- 로그인: `/login`에서 이메일+비밀번호 입력 → 세션 수립 → `/`로 이동.
- 오류:
  - 이메일 또는 비밀번호 불일치 → "이메일 또는 비밀번호가 일치하지 않아요"
  - 미확인 계정 로그인 → "메일을 확인해 주세요. 확인 메일을 다시 받으려면 [여기]를 클릭하세요"
  - 이미 가입된 이메일 → "이미 가입된 이메일이에요"
  - 비밀번호 8자 미만 → "비밀번호는 8자 이상이어야 해요"
  - 콜백 code 없음/만료 → `/login?error=link_expired`
  - profile upsert 실패 → `/login?error=profile_setup_failed`
```

**§9 설정 페이지 표** (계정 섹션):
- "비회원만" 행에서 "[로그인] 버튼" 옆에 "[회원가입] 버튼 → `/signup`" 추가

### 3. `docs/ARCHITECTURE.md` — 2곳 수정

**§6.4 로그인 시퀀스**를 다음으로 교체:
```
**회원가입**:
Client /signup
  └─> signUpAction({ email, password, nickname })
        (supabase.auth.signUp + user_metadata.nickname 저장)
        (확인 메일 발송, emailRedirectTo: origin/auth/callback)

사용자가 확인 메일 링크 클릭
  └─> GET /auth/callback?code=...
        ├─ supabase.auth.exchangeCodeForSession(code)
        ├─ profiles upsert (user_metadata.nickname 포함, 없으면 '책곰이' 폴백)
        └─ redirect('/')

**로그인**:
Client /login
  └─> supabase.auth.signInWithPassword({ email, password })
        ├─ 성공 → 세션 쿠키 설정 → redirect('/')
        └─ 실패 → 에러 메시지 표시 (INVALID_CREDENTIALS 또는 EMAIL_NOT_CONFIRMED)
```

**§15 인증·콜백 라우트**에서 매직링크/OAuth 언급 제거 후 password 기반으로 업데이트:
- `/login/page.tsx`: 이메일+비밀번호 입력 폼, 비밀번호 분실 링크, 회원가입 링크
- `/signup/page.tsx`: 이메일+비밀번호+닉네임 입력 폼, 확인 메일 안내
- `/auth/callback/route.ts`: code 교환 → profiles upsert(닉네임 포함) → redirect('/')
- `/forgot-password/page.tsx`, `/reset-password/page.tsx`: 비밀번호 재설정 흐름

### 4. `docs/UI_GUIDE.md` — 폼 스펙 추가

파일 끝 또는 "컴포넌트" 섹션에 다음을 추가하라:

```
### 인증 폼

공통 규칙:
- 모든 입력 필드: `bg-[#3a2a1a] border border-[#1a100a] px-3 py-2 text-sm text-[#d7c199] placeholder:text-[#6b5540] outline-none focus:border-[#a08866]`
- 에러 텍스트: `text-sm text-[#c85a54] text-center`
- 성공/안내 텍스트: `text-sm text-center text-[#a08866]`
- pending 버튼: `disabled` + pendingLabel prop

**/login 폼 필드**: 이메일, 비밀번호(password input), [로그인] 버튼, "비밀번호를 잊으셨나요?" 링크(/forgot-password), "아직 계정이 없으신가요? [회원가입]" 링크(/signup)

**/signup 폼 필드**: 이메일, 비밀번호(min 8), 닉네임(max 30), [가입하기] 버튼, 성공 시 "확인 메일을 보냈어요. 메일함을 확인해 주세요." 안내, "이미 계정이 있으신가요? [로그인]" 링크

**/forgot-password 폼 필드**: 이메일, [재설정 메일 받기] 버튼, 제출 후 "메일을 확인해 주세요" 안내(이메일 존재 여부 노출 금지)

**/reset-password 폼 필드**: 새 비밀번호(min 8), [비밀번호 변경] 버튼, 성공 시 /login으로 redirect
```

### 5. `README.md` — Supabase 설정 단계 추가

README에 "Supabase 대시보드 설정" 섹션이 없다면 추가하라:

```markdown
## Supabase 대시보드 설정

개발 또는 배포 전 아래 설정을 Supabase 대시보드에서 1회 적용해야 합니다.

1. Authentication → Providers → Email
   - Enable Email provider: ON
   - Confirm email: **ON** (가입 후 메일 클릭 후 로그인 가능)
   - Secure email change: ON
2. Authentication → Providers → Google: **OFF** (사용 안 함)
3. Authentication → URL Configuration → Redirect URLs에 추가:
   - `http://localhost:3000/auth/callback` (개발)
   - `http://localhost:3000/reset-password` (개발)
   - `{NEXT_PUBLIC_APP_URL}/auth/callback` (프로덕션)
   - `{NEXT_PUBLIC_APP_URL}/reset-password` (프로덕션)
4. 카카오톡 OG 캐시 갱신: https://developers.kakao.com/tool/clear/og
```

### 6. `src/lib/errors.ts` — 에러 코드 4개 추가

`AppErrorCode` 유니온 타입에 다음을 추가하라:
- `'EMAIL_TAKEN'` — 이미 가입된 이메일
- `'INVALID_CREDENTIALS'` — 이메일 또는 비밀번호 불일치
- `'WEAK_PASSWORD'` — 비밀번호 강도 부족 (Supabase 정책 미충족)
- `'EMAIL_NOT_CONFIRMED'` — 이메일 확인 전 로그인 시도

### 7. `src/lib/errors.ts` 테스트 (`src/lib/errors.test.ts` 신규 또는 업데이트)

아래 테스트가 통과해야 한다:
- `AppError`를 `new AppError('EMAIL_TAKEN', '...')` 로 생성했을 때 `instanceof AppError === true`
- `AppError`를 `new AppError('EMAIL_NOT_CONFIRMED', '...')` 로 생성했을 때 `.code === 'EMAIL_NOT_CONFIRMED'`
- 기존 에러 코드들이 여전히 타입에 포함되는지 (`UNAUTHORIZED`, `UPSTREAM_FAILED` 등)

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
bun test
```
전체 통과 (기존 + 신규 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `docs/ADR.md`에 ADR-029가 추가됐는지 확인.
3. `src/lib/errors.ts`에 `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `EMAIL_NOT_CONFIRMED`가 추가됐는지 확인.
4. `phases/5-email-password-auth/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
5. 커밋:
   - `feat(5-email-password-auth): step 0 — docs-and-error-codes`
   - `chore(5-email-password-auth): step 0 output`

## 금지사항

- 코드 파일(LoginForm, SignupForm 등)을 이 step에서 수정하지 마라 — 문서와 에러 코드만 다룬다.
- `docs/ADR.md`의 기존 ADR을 수정하지 마라 — 끝에 추가만 한다.
- 기존 테스트를 삭제하거나 skip하지 마라.
- `AppError` 클래스 구조를 변경하지 마라 — 에러 코드 유니온에 추가만 한다.
