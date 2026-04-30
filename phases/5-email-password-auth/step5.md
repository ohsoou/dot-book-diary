# Step 5: cleanup-and-final-verify

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — 전체 인증 흐름 최종 확인
- `src/components/auth/LoginForm.tsx` — OTP/OAuth 잔재 확인 (step 3에서 재작성됨)
- `src/app/auth/callback/route.ts` — oauth_failed 잔재 확인 (step 2에서 재작성됨)
- `src/app/login/page.tsx` — ERROR_MESSAGES 정리 확인 (step 3에서 수정됨)
- `src/lib/errors.ts` — 에러 코드 전체 확인

## 배경

Step 0~4에서 인증 구조 재설계가 완료됐다. 이 step에서는:
1. OTP/OAuth 관련 코드 잔재를 완전히 제거한다.
2. 최종 빌드/린트/테스트를 통과시킨다.
3. Phase 메타데이터를 완성한다.

## 작업

### 1. 잔재 코드 확인 및 제거

아래 명령을 실행해 잔재를 확인하라:

```bash
grep -r "signInWithOtp\|signInWithOAuth\|oauth_failed\|magic.link\|magicLink" src/ --include="*.ts" --include="*.tsx"
```

발견된 항목을 제거한다. 단, 다음은 예외:
- 테스트 mock에서 함수 이름을 문자열로 테스트하는 경우 (ex: `expect(...).not.toHaveBeenCalledWith(...)`)
- 에러 메시지 맵에 `oauth_failed` 키가 남아있는 경우 — 제거하거나 `'알 수 없는 오류가 발생했어요'`로 변경

### 2. `src/lib/errors.ts` 에서 사용되지 않는 에러 코드 확인

전체 코드베이스에서 `oauth_failed`가 에러 코드로 사용되는 곳이 있는지 확인:
```bash
grep -r "oauth_failed" src/ --include="*.ts" --include="*.tsx"
```
더 이상 사용되지 않는다면 `AppErrorCode` 유니온에 추가하지 않는다 (이미 없으면 그대로).

### 3. 최종 전수 검증

```bash
bun build
bun lint
bun test
```

세 명령 모두 통과해야 한다.

### 4. Phase 메타데이터 완성

`phases/5-email-password-auth/index.json`의 모든 step이 `completed` 상태인지 확인하고, step 5를 완료로 업데이트한다.

## Acceptance Criteria

```bash
bun build && bun lint && bun test
```
0 에러, 전체 테스트 통과.

```bash
grep -r "signInWithOtp\|signInWithOAuth" src/ --include="*.ts" --include="*.tsx"
```
결과 없음 (0건).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. OTP/OAuth 잔재 grep 결과가 0건인지 확인.
3. `phases/5-email-password-auth/index.json`의 step 5를 `completed`로 업데이트한다.
4. 커밋:
   - `feat(5-email-password-auth): step 5 — cleanup-and-final-verify`
   - `chore(5-email-password-auth): step 5 output`

## 금지사항

- 기존 테스트를 삭제하거나 skip해서 통과시키지 마라 — 실제로 통과해야 한다.
- `src/lib/errors.ts`에서 step 0에 추가한 에러 코드(`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `EMAIL_NOT_CONFIRMED`)를 제거하지 마라.
- 이 step에서 새 기능을 추가하지 마라 — 정리와 검증만 한다.
