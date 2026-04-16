# Step 12: settings-and-login

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 7·8번, US-6·US-7·US-8, 설정 페이지 사양 §9)
- `/docs/ARCHITECTURE.md` ("인증·콜백 라우트", "Guest preferences / draft 인터페이스", revalidatePath 표)
- `/docs/ADR.md` (ADR-002, ADR-003, ADR-016)
- 이전 step: `src/lib/supabase/*`, `src/lib/storage/*`, `src/components/ui/*`

## 작업

로그인과 설정 페이지를 붙이고, guest→member 전환의 데이터 정책을 닫는다.

1. **`src/app/login/page.tsx`**
   - 이메일 매직링크 + Google OAuth 버튼.
   - `?error=link_expired` → "링크가 만료됐어요. 다시 로그인 링크를 요청해 주세요."
   - `?error=oauth_failed` → "소셜 로그인에 실패했어요."
   - `?error=profile_setup_failed` → "로그인은 됐지만 프로필 설정에 실패했어요. 잠시 후 다시 시도해 주세요."
   - `?reason=expired` → "세션이 만료됐어요. 다시 로그인해 주세요."
   - 이미 로그인된 사용자: `/`로 redirect.
   - 로그인 성공 후 `auth/callback`으로 이동 — 리다이렉트 URL 하드코드 금지 (`NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin` 사용).

2. **`src/app/auth/callback/route.ts`** (step 3에서 skeleton 작성, 여기서 완성)
   - `exchangeCodeForSession(code)`.
   - 성공 시 `profiles` upsert (`on conflict do nothing`) — trigger 실패 대비 fallback.
   - 성공 → `/`로 redirect.
   - `code` 없음 또는 매직링크/OTP 교환 실패 → `/login?error=link_expired`.
   - OAuth provider callback 에러 → `/login?error=oauth_failed`.
   - profile upsert 실패 → 로그인은 유지, `/login?error=profile_setup_failed`.

3. **`src/app/settings/page.tsx`**
   - Server Component 셸. 세션으로 member/guest 판단.
   - 섹션 구성 (PRD §9 기준):
     - **계정**: 로그인 상태 표시 + 로그인 버튼(비회원) / 로그아웃 버튼(회원).
     - **닉네임**: 편집 폼. 회원 → `updateProfileAction`으로 `profiles.nickname` 갱신. 비회원 → `updatePreferences({ nickname })`.
     - **동기화**: 회원에게만 disabled toggle + tooltip "v1.1에서 제공". 비회원에게는 hidden.
   - 닉네임 편집: `useActionState` 패턴. `FieldError` 인라인.

4. **`src/lib/actions/profile.ts`** — Server Action
   - `updateProfileAction(prevState, formData): Promise<ActionResult<Profile>>`
   - 성공 후 `revalidatePath('/settings')`.

5. **guest archive 정책**
   - 로그인 성공(callback 성공) 시 `updatePreferences({ localArchived: true })`.
   - 로그아웃 후에도 `localArchived` 유지 — 로그아웃 후 `/`로 이동 시 LocalStore 데이터 노출하지 않는다.
   - LocalStore 데이터는 **삭제하지도, 서버에 업로드하지도 않는다**.

6. **로그아웃 흐름**
   - `supabase.auth.signOut()` 후 `revalidatePath('/')` + `/`로 redirect.
   - `localArchived`는 그대로 유지.

7. **테스트**
   - `src/app/settings/settings-page.test.tsx`: 닉네임 편집, 로그아웃 버튼, disabled sync toggle.
   - `src/app/auth/auth-callback.test.ts`: 성공 redirect, code 없음 에러, profile upsert 호출.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 미들웨어를 optional로 되돌리지 않았는가?
   - 비회원 데이터 자동 업로드가 없는가?
   - sync 토글이 실제로 `disabled` 상태인가?
   - `NEXT_PUBLIC_APP_URL`을 사용해 OAuth 리다이렉트 URL을 구성하는가?
   - callback 실패 시 적절한 `?error=` 쿼리로 login 페이지로 돌아오는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 비회원 IndexedDB 데이터를 로그인 직후 자동 업로드하지 마라.
- `SERVICE_ROLE_KEY`를 클라이언트에 노출하지 마라.
- OAuth 리다이렉트 URL을 `http://localhost:3000` 등으로 하드코드하지 마라.
- 기존 테스트를 깨뜨리지 마라.
