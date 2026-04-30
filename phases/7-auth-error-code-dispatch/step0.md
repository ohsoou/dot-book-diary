# Step 0: docs-and-error-mapper

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — §5.5 에러 처리, §6.4 로그인 시퀀스, §11 에러 처리 규약
- `docs/ADR.md` — 마지막 ADR 번호 확인 (ADR-029까지 존재. 이 step에서 ADR-030 추가)
- `docs/PRD.md` — §7 US-5 (오류 메시지 문구의 진실원)
- `src/lib/errors.ts` — 현재 `AppErrorCode` 유니온과 `AppError` 클래스
- `src/lib/actions/auth.ts:33-42` — 현재 메시지 매칭 분기 (참고용, 이 step에서는 수정하지 않음)
- `src/components/auth/LoginForm.tsx:45-54` — 현재 메시지 매칭 분기 (참고용, 이 step에서는 수정하지 않음)

## 배경

인증 에러 판별이 `error.message.includes()` 문자열 매칭 방식으로 구현되어 있다. GoTrue 서버 메시지가 바뀌면 분기가 조용히 깨지는 문제가 있다. Supabase 공식 가이드는 `AuthApiError.code`(안정 식별자)를 사용할 것을 권장한다.

이 step에서는 코드를 바꾸기 전에 먼저 문서를 확정하고 매퍼 모듈을 안정화한다.

## 작업

### 1. `docs/ADR.md` — ADR-030 추가

파일 끝에 추가:

```
## ADR-030: Supabase Auth 에러는 `error.code` 기반으로 분기, 메시지 매칭은 fallback

**결정**: `error.code`(공식 안정 식별자)를 1순위, 메시지 `.includes()`를 2순위 fallback으로만 사용한다. 변환 로직은 `src/lib/auth/error-codes.ts`의 `mapSupabaseAuthError()` 한 함수로 단일화한다.

**이유**: GoTrue 메시지는 다듬어질 수 있어 메시지 매칭이 조용히 깨진다. `AuthApiError`는 항상 `code`/`status`를 채워주며 공식 문서가 안정 식별자로 권장한다.

**결과·제약**:
- `src/lib/auth/error-codes.ts` 신규: `mapSupabaseAuthError(error) → { code: AppErrorCode; message: string }`.
- `signUpAction`(server)과 `LoginForm`(client) 두 곳 모두 매퍼만 호출한다.
- 매퍼는 `'server-only'`를 임포트하지 않는다 — client/server 양쪽에서 사용한다.
- 사용자 노출 문구는 PRD §7 US-5의 정의를 따른다.
```

### 2. `docs/ARCHITECTURE.md` — §11.1·§11.2 동기화 + §11.5 추가

**§11.1**: `AppErrorCode` 유니온에 Phase 5에서 추가된 4개 코드(`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `EMAIL_NOT_CONFIRMED`) 추가.

**§11.2**: HTTP 매핑 표에 4개 행 추가:
- `WEAK_PASSWORD` → 400
- `INVALID_CREDENTIALS` → 401
- `EMAIL_NOT_CONFIRMED` → 401
- `EMAIL_TAKEN` → 409

**§11.5 신규**: "Supabase Auth 에러 매핑" 섹션 — `mapSupabaseAuthError()` 사용 정책 명시.

### 3. `src/lib/auth/error-codes.ts` 신규

시그니처:
```ts
export function mapSupabaseAuthError(
  error: { message?: string; code?: string } | null | undefined,
): { code: AppErrorCode; message: string }
```

- 1순위: `error.code` → 매핑 테이블
- 2순위: `error.message.includes()` → fallback
- 3순위: `UPSTREAM_FAILED`
- `'server-only'` 임포트 금지

### 4. `src/lib/auth/error-codes.test.ts` 신규

테스트 12개 이상: code 매핑 5개, 메시지 fallback 5개, null/undefined/알 수 없는 코드.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

## 검증 절차

1. AC 커맨드 실행.
2. `docs/ADR.md`에 ADR-030 추가 확인.
3. `docs/ARCHITECTURE.md` §11.1·§11.2·§11.5 업데이트 확인.
4. `src/lib/auth/error-codes.ts` + 동일 디렉토리 테스트 존재 확인.
5. `phases/7-auth-error-code-dispatch/index.json` step 0 업데이트.
6. 커밋:
   - `feat(7-auth-error-code-dispatch): step 0 — docs-and-error-mapper`
   - `chore(7-auth-error-code-dispatch): step 0 output`

## 금지사항

- `src/lib/actions/auth.ts`나 `src/components/auth/LoginForm.tsx`를 이 step에서 수정하지 마라 — step 1의 책임이다.
- 매퍼에 `'server-only'`를 임포트하지 마라.
- 새 `AppErrorCode`를 추가하지 마라 — 기존 4개로 충분하다.
- 사용자 노출 문구를 새로 작문하지 마라.
