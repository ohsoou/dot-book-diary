# Step 3: supabase-and-auth-backbone

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` ("데이터 모델 SQL", "세션·스토어 전환", "미들웨어", "인증·콜백 라우트")
- `/docs/ADR.md` (ADR-001, ADR-002, ADR-009, ADR-013, ADR-016)
- `/CLAUDE.md` (RLS CRITICAL)
- 이전 step: `src/lib/storage/Store.ts`, `src/lib/storage/LocalStore.ts`, `src/lib/storage/index.ts`, `src/lib/env.ts`

## 작업

Supabase 세션과 회원용 저장소를 붙여 member/server 경로를 완성한다. 이 step이 끝나면 guest/member 저장소 전환이 동작해야 한다.

1. **의존성 설치**
   - `@supabase/supabase-js`
   - `@supabase/ssr`

2. **Supabase 클라이언트 유틸**
   - `src/lib/supabase/server.ts`: `import 'server-only'`. `createServerClient` 래퍼. Server Component / Route Handler / Server Action에서만 사용.
   - `src/lib/supabase/client.ts`: `createBrowserClient` 래퍼. `"use client"` 컴포넌트에서만 사용.
   - `src/lib/supabase/middleware.ts`: `updateSession(request)` 유틸. 쿠키 refresh 담당.

3. **`src/middleware.ts`** — 필수
   - `updateSession`을 모든 요청에 적용.
   - matcher 제외: `_next/static`, `_next/image`, `favicon.ico`, `sprites`, `fonts`, `api/books` (알라딘 프록시는 인증 불필요).
   ```ts
   export const config = {
     matcher: ['/((?!_next/static|_next/image|favicon.ico|sprites|fonts|api/books).*)'],
   };
   ```

4. **`supabase/migrations/0001_init.sql`** — 전체 스키마
   - `docs/ARCHITECTURE.md` §9.1의 SQL을 **그대로 복사**한다. 이 step 안에 별도 축약 SQL 예시를 두지 않는다.
   - 반드시 포함:
     - `books.updated_at`
     - `(user_id, isbn)` unique index (`where isbn is not null`)
     - `reading_sessions`의 `end_page >= start_page` CHECK
     - `profiles/books/reading_sessions/diary_entries` 전부 SELECT/INSERT/UPDATE/DELETE 4개 RLS 정책
     - `handle_new_user`, `set_updated_at`, 각 테이블 trigger

5. **`src/lib/storage/RemoteStore.ts`** — `Store` 구현
   - `import 'server-only'`. Server Action / Route Handler에서만 인스턴스화.
   - `user_id`는 내부에서 `await supabase.auth.getUser()`로 결정. 외부 인자로 받지 않음.
   - 세션 없으면 `AppError('UNAUTHORIZED', ...)` throw.
   - `deleteBook`: cascade로 sessions/entries 자동 삭제 — 별도 처리 불필요.

6. **`src/lib/storage/index.ts`** 최종화
   - Server 경로: `getStore()` — `@supabase/ssr` 세션 확인 → 세션 있으면 `RemoteStore`, 없으면 `LocalStore`.
   - Client 경로: `useStore()` hook — Context + Provider 패턴. `StoreProvider`로 루트 layout에서 주입.
   - guest preference helper re-export 유지.

7. **`src/app/auth/callback/route.ts`** — OAuth/매직링크 콜백
   - `supabase.auth.exchangeCodeForSession(code)`.
   - 성공 후 `profiles` row 보장 (`upsert ... on conflict do nothing`) — trigger 실패 대비.
   - 에러 매핑:
     - `code` 없음 또는 매직링크/OTP 교환 실패 → `/login?error=link_expired`
     - OAuth provider callback 에러 → `/login?error=oauth_failed`
     - 세션 수립 후 profile upsert 실패 → `/login?error=profile_setup_failed`
   - `emailRedirectTo`는 `NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin` 기준으로 구성한다.

8. **테스트**
   - `src/lib/storage/RemoteStore.test.ts` — Supabase 호출은 `vi.mock`으로 격리
   - `src/lib/storage/storage-index.test.ts` — 세션 유무에 따른 분기 테스트

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `0001_init.sql`에 `profiles`, `books`, `reading_sessions`, `diary_entries` 모두 RLS + 인덱스 + CHECK + trigger가 있는가?
   - `RemoteStore`가 `Store` 인터페이스를 모두 구현하는가?
   - `src/middleware.ts`가 optional이 아니라 필수 연결인가? matcher가 `api/books`를 제외하는가?
   - `auth/callback/route.ts`에 profiles upsert fallback이 있는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- RLS 없는 테이블을 만들지 마라.
- `SERVICE_ROLE_KEY`를 코드에 참조하지 마라.
- Client Component에서 `lib/supabase/server.ts`를 import하지 마라.
- `RemoteStore`를 Client Component에서 직접 인스턴스화하지 마라.
- 기존 테스트를 깨뜨리지 마라.
