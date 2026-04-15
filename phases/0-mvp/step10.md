# Step 10: settings-and-auth

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 7, 8번)
- `/docs/ADR.md` (ADR-002, ADR-003)
- `/CLAUDE.md`
- 이전 step: `src/lib/supabase/*`, `src/lib/storage/*`

## 작업

로그인과 설정 페이지를 마지막으로 붙여 MVP를 완성한다.

1. **`src/app/login/page.tsx`**
   - Supabase Auth: 이메일 매직링크 + Google OAuth.
   - `@supabase/ssr`의 쿠키 기반 세션이 쿠키에 설정되어야 Server Component가 RemoteStore를 선택할 수 있음.
   - 성공 시 `/`로 리다이렉트.
2. **`src/app/settings/page.tsx`** (`'use client'` 부분 허용)
   - 표시: 현재 로그인 상태(이메일 또는 "비회원").
   - 액션: 로그아웃 버튼(`supabase.auth.signOut()` → `router.refresh()`), 닉네임(로컬 프리퍼런스, IndexedDB 키 `dbd:preferences`에 저장).
   - (v1.1 예약) "로컬 데이터를 계정으로 동기화" 버튼은 **disabled** 상태로 두고 tooltip "v1.1에서 제공".
3. **`src/lib/storage/index.ts`** 최종화
   - 서버 컨텍스트: `createServerClient`로 세션 조회 → 있으면 `RemoteStore`, 없으면 `LocalStore`.
   - 클라이언트 컨텍스트: `createBrowserClient`로 동일 분기. React context나 훅으로 `useStore()` 제공.
4. **미들웨어** (optional) — `src/middleware.ts`에서 `@supabase/ssr`의 세션 refresh. 필요 시만.
5. **글로벌 네비게이션** — 톱니 hitbox가 이미 있으므로 별도 네비 바는 생략. 단, 로그인 페이지 진입 경로를 `/settings`의 버튼으로도 열 수 있게 한다(비회원 상태에서 "로그인" 버튼 노출).
6. **테스트**
   - `settings/page` 로그인/비로그인 분기 렌더 테스트(Supabase 모킹).
   - `lib/storage/index.ts`의 factory 테스트: 세션 유무에 따라 올바른 구현이 반환되는지.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
bun dev   # 수동 MVP 플로우 확인
```

수동 플로우(PRD "최종 MVP 기준"):
1. 비회원으로 `/add-book` → ISBN 검색 → 책 추가
2. `/bookshelf`에 표지 노출 → 클릭 → `/reading/[id]`에서 세션 기록
3. `/diary/new`에서 문장/독후감 작성
4. `/book-calendar`에서 해당 날짜 표지 미리보기
5. `/login`에서 Supabase 로그인 → 동일 플로우를 회원으로 수행 → `RemoteStore` 경로 확인

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - CLAUDE.md CRITICAL 3개 모두 준수(외부 API는 라우트 핸들러, RLS 켜짐, 비회원 데이터 서버 전송 없음).
   - UI_GUIDE 금지 사항 grep: `rounded-`, `backdrop-blur`, `bg-gradient`, `indigo`, `purple` 검색해서 0건.
3. `phases/0-mvp/index.json` 업데이트 및 task 전체를 `completed`로 마크.

## 금지사항

- 비회원의 IndexedDB 데이터를 로그인 직후 자동 업로드하지 마라. 이유: ADR-003. v1.1에서 명시 동의 UI 필요.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 아닌 `SERVICE_ROLE_KEY`를 클라이언트에 노출하지 마라. 이유: RLS 우회.
- OAuth 리다이렉트 URL을 하드코드하지 마라. 환경변수 또는 현재 origin 사용.
- 기존 테스트를 깨뜨리지 마라.
