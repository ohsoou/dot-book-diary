# Step 2: supabase-remote-store

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` ("데이터 모델", "상태 관리")
- `/docs/ADR.md` (ADR-002: Supabase)
- `/CLAUDE.md` (RLS CRITICAL)
- 이전 step: `src/types/index.ts`, `src/lib/storage/Store.ts`, `src/lib/storage/LocalStore.ts`, `src/lib/storage/index.ts`

Store 인터페이스의 메서드 시그니처를 그대로 구현해야 한다.

## 작업

회원용 `RemoteStore`(Supabase)를 구현하고, 로그인 상태에 따라 `LocalStore`/`RemoteStore`를 선택하는 factory를 완성한다. 마이그레이션 SQL도 이 step에서 파일로 남긴다.

1. **의존성 설치**
   - `@supabase/supabase-js`, `@supabase/ssr`
2. **`src/lib/supabase/server.ts`** — Server Component / Route Handler용. `createServerClient` + Next `cookies()`.
3. **`src/lib/supabase/client.ts`** — Client Component용. `createBrowserClient`.
4. **마이그레이션 SQL** — `supabase/migrations/0001_init.sql` 생성. `docs/ARCHITECTURE.md`의 스키마 블록을 그대로 옮기고, 각 테이블에 `enable row level security` + 4개 정책(select/insert/update/delete 모두 `auth.uid() = user_id`).
5. **`src/lib/storage/RemoteStore.ts`** — `Store` 구현. 생성자는 `SupabaseClient`를 주입받는다. `user_id`는 세션에서 읽어 insert 시 자동 주입.
6. **`src/lib/storage/index.ts`** 수정 — `getStore()`가 서버 컨텍스트에서 세션을 조회해 있으면 `RemoteStore`, 없으면 `LocalStore`를 반환. Client 전용 경로(`'use client'` 컴포넌트)는 별도 `useStore()` 훅으로 분리해도 됨.
7. **테스트**
   - `RemoteStore.test.ts`: Supabase 클라이언트를 `vi.mock`으로 모킹하여 SELECT/INSERT 체이닝 호출이 올바른 테이블/필드로 불리는지 확인.
   - LocalStore 테스트는 그대로 통과해야 함.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `supabase/migrations/0001_init.sql`에 `enable row level security` 3회(테이블당 1회) 포함.
   - 모든 정책이 `auth.uid() = user_id` 조건을 가진다.
   - Client Component에서 `lib/supabase/server.ts`를 import하지 않는다(또는 import 시 빌드 에러가 나야 함).
   - `RemoteStore`는 `Store` 인터페이스를 모두 구현한다.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- RLS 없는 테이블을 만들지 마라. 이유: anon key 노출.
- `.env.local`의 실제 키 값을 커밋하지 마라. `.env.example`만.
- `createClient`를 Server/Client에서 혼용하지 마라. 이유: 쿠키/브라우저 저장소 혼선.
- RemoteStore가 `user_id`를 입력으로 받도록 하지 마라. 이유: 상위가 실수로 타인의 id를 넣을 여지. 내부에서 세션으로 해결.
- 기존 테스트를 깨뜨리지 마라.
