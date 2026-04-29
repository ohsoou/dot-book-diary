# Step 2: callback-rewrite-and-profile

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — §15 인증·콜백 라우트 (step 0에서 업데이트됨)
- `docs/ADR.md` — ADR-016(닉네임/프로필), ADR-029(이메일+비밀번호)
- `src/app/auth/callback/route.ts` — 현재 구현 (OAuth 분기, profile upsert 패턴)
- `src/app/auth/callback/auth-callback.test.ts` — 기존 테스트 케이스 파악
- `supabase/migrations/0001_init.sql` — handle_new_user 트리거 (L74-86), profiles 테이블 구조
- `src/lib/errors.ts` — 에러 코드 확인 (step 0에서 추가됨)
- `src/lib/actions/auth.ts` — signUpAction에서 user_metadata.nickname 저장 방식 확인 (step 1에서 추가됨)

## 배경

이전에 `/auth/callback`은 OAuth provider 에러 분기와 매직링크 교환 로직이 섞여 있었다.
이제 OAuth를 제거했으므로 callback은 **이메일 확인 후 세션 수립** 전용으로 단순화된다.

추가로 닉네임 저장 로직을 강화한다:
- Step 1에서 `signUpAction`이 `user_metadata.nickname`에 닉네임을 저장했다.
- 이메일 확인 후 callback에서 `profiles.nickname`을 함께 upsert한다.
- `user_metadata.nickname`이 없으면 `'책곰이'` 폴백.

**TDD**: 테스트를 먼저 수정하고, 테스트가 통과하도록 구현하라.

## 작업

### 1. `src/app/auth/callback/auth-callback.test.ts` 업데이트 (TDD 우선)

**삭제할 테스트 케이스**:
- `providerError` → `oauth_failed` 케이스 삭제

**유지할 테스트 케이스**:
- `code` 없음 → `/login?error=link_expired`
- code 교환 실패 → `/login?error=link_expired`
- profile upsert 실패 → `/login?error=profile_setup_failed`
- 성공 → `/`로 redirect

**추가할 테스트 케이스**:
- 성공 시 `user_metadata.nickname`이 있으면 `profiles` upsert에 `nickname: '닉네임값'` 포함
- 성공 시 `user_metadata.nickname`이 없으면 `profiles` upsert에 `nickname: '책곰이'` 포함

### 2. `src/app/auth/callback/route.ts` 재작성

```ts
export async function GET(request: NextRequest)
```

구현 지침:
- **제거**: `providerError` 파라미터 확인 및 `oauth_failed` 분기 전체 삭제.
- **유지**: `code` 없을 때 `/login?error=link_expired` redirect.
- **유지**: `exchangeCodeForSession(code)` 실패 시 `/login?error=link_expired` redirect.
  - 이제 OAuth 분기가 없으므로 에러 종류 구분 불필요. 모두 `link_expired`로 처리.
- **변경**: profile upsert 시 닉네임 포함:
  ```ts
  const nickname = user.user_metadata?.nickname ?? '책곰이'
  await supabase.from('profiles').upsert(
    { user_id: user.id, nickname },
    { onConflict: 'user_id' }
  )
  ```
  - `ignoreDuplicates: true` 제거 — 이미 프로필이 있더라도 닉네임을 덮어쓴다. (handle_new_user 트리거는 nickname 없이 생성할 수 있으므로)
  - profile upsert 실패 시 여전히 `/login?error=profile_setup_failed` redirect.
- **유지**: 성공 시 `/`로 redirect.

주석도 업데이트 — OAuth 관련 설명 제거, password 기반 흐름으로 변경.

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
bun test src/app/auth/callback
```
통과.

```bash
bun test
```
전체 통과 (기존 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `route.ts`에 `providerError` 또는 `oauth_failed` 문자열이 없는지 확인: `grep "oauth_failed\|providerError" src/app/auth/callback/route.ts` → 결과 없음.
3. `phases/5-email-password-auth/index.json`의 step 2를 업데이트한다.
4. 커밋:
   - `feat(5-email-password-auth): step 2 — callback-rewrite-and-profile`
   - `chore(5-email-password-auth): step 2 output`

## 금지사항

- `LoginForm.tsx`를 이 step에서 수정하지 마라 — Step 3에서 담당한다.
- `oauth_failed` 에러 코드를 `errors.ts`에서 삭제하지 마라 — Step 5(cleanup)에서 정리한다.
- 기존 테스트를 삭제만 하지 말고, 유지되어야 할 케이스가 빠지지 않도록 확인하라.
- `ignoreDuplicates: true` 옵션을 profile upsert에 넣지 마라 — 닉네임 업데이트를 막는다.
