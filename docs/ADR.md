# Architecture Decision Records

## 철학
MVP 속도와 정서적 완성도를 동시에 노린다. 외부 의존성은 최소화하되, "도트 방"이라는 비주얼 정체성만큼은 타협하지 않는다. 작동하는 최소 구현을 선택하고, 범용 라이브러리(달력/상태관리 등)는 필요해지는 순간 도입한다.

## ADR 템플릿
각 ADR은 아래 구조를 따른다:
- **상태**: Proposed / Accepted / Superseded by ADR-XXX
- **날짜**: YYYY-MM-DD
- **컨텍스트**: 무엇을 결정하려 하는가
- **결정**: 무엇을 택했는가
- **대안**: 검토 후 탈락한 것들
- **결과/제약**: 이 결정이 만드는 후속 제약

---

## ADR-001: Next.js 15 App Router
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 프런트 + 얇은 백엔드(알라딘 프록시 등)를 한 레포에서 처리할 프레임워크.
- **결정**: Next.js 15 App Router. Server Components 기본, Client Component는 인터랙션 지점만.
- **대안**:
  - Remix: 러닝커브 + 에코시스템이 Next.js 대비 얕음
  - SvelteKit: 팀 익숙도 부족
  - Vite + 별도 API 서버: 배포/운영 복잡도↑
- **결과/제약**:
  - 라우트 핸들러로 알라딘 프록시 가능
  - Server/Client 경계 설계 필수 — `"use client"`가 트리 위로 전염되는 실수 주의
  - 배포 타겟은 Vercel(ADR-010)
  - `middleware.ts`로 Supabase 세션 refresh(필수)
  - Server Action은 React 19 `useActionState`와 조합해 폼 패턴을 통일(ADR-015)

---

## ADR-002: Supabase 단일 백엔드 (Auth + Postgres + Storage)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 인증·DB·파일을 한 벤더로 묶어 운영 부담을 줄인다.
- **결정**: Supabase(Auth + Postgres + Storage). `@supabase/ssr`로 쿠키 기반 세션. 모든 테이블 RLS 필수.
- **대안**:
  - Firebase: NoSQL이 관계형 독서 데이터에 부적합
  - 자체 백엔드(Fastify/NestJS + 관리형 Postgres): 운영 인력 필요
  - Clerk + Neon: 벤더 2개 동시 관리
- **결과/제약**:
  - Vendor lock-in. Supabase 장애 시 전체 다운
  - anon key가 클라이언트에 노출되므로 RLS 누락은 치명적(CLAUDE.md CRITICAL)
  - 서버리스 cold start로 간헐 지연
  - `SUPABASE_SERVICE_ROLE_KEY`는 **존재 자체를 코드에서 참조하지 않음**
  - DB 마이그레이션은 Supabase CLI `supabase db push` 경유(ADR-013)

---

## ADR-003: 비회원은 IndexedDB 로컬 전용 (v1.1까지 서버 업로드 없음)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 가입 장벽 없이 체험시키고 싶지만, 식별되지 않은 사용자 데이터를 서버에 쌓으면 개인정보·보존·삭제 책임이 커진다.
- **결정**: 비회원 데이터는 `idb-keyval`로 IndexedDB에만 저장. 서버로 전송하지 않는다. 로그인 후에도 로컬 데이터는 **보존·숨김**(`dbd:preferences.localArchived=true`) 처리만 하고, 서버 업로드는 v1.1 명시 동의 UI 이후.
- **대안**:
  - localStorage: 용량 5MB 제한 + 구조화 쿼리 불가
  - 서버에 익명 계정 자동 생성: GDPR/탈퇴 복잡도↑
  - 쿠키: 용량 부족
- **결과/제약**:
  - **iOS Safari ITP**: 7일 이상 미사용 시 IndexedDB eviction 가능. 메인 상단에 "로그인하면 안전하게 보관됩니다" 배너 1회 고지
  - **Private/Incognito**: 쿼터/세션 종료 시 삭제 — 사용자에게 안내하지 않음(브라우저 기본 동작)
  - 기기 변경 시 유실 → v1.1 export/import 제공 예정
  - 로그인 성공 후 LocalStore 데이터는 **삭제·업로드 모두 하지 않음**
  - `Store` 인터페이스를 통해 LocalStore/RemoteStore가 동일 shape을 보장해야 함
  - Feature flag `NEXT_PUBLIC_FF_SYNC_GUEST_DATA=false`가 `true`로 바뀔 때까지 업로드 코드 진입 불가

---

## ADR-004: 책 메타데이터는 알라딘 Open API (서버 프록시 경유)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 국내서 커버리지·표지·페이지 메타데이터가 필요.
- **결정**: `lib/aladin.ts`를 통해 `app/api/books/{search,isbn}/route.ts`에서만 호출. TTB 키는 `ALADIN_TTB_KEY` 환경변수.
- **대안**:
  - Google Books: 국내서 메타 약함
  - 카카오 책 API: 사업자 승인 필요
  - 네이버 책: 센터키 발급 허들
  - 국립중앙도서관: 표지 없음
- **결과/제약**:
  - **Rate limit**: TTB 키 일일 5,000회 — 동일 쿼리 60초 캐시(Next fetch cache)로 완화. 초과 시 `RATE_LIMITED` + 429
  - **약관**: 알라딘 개인 개발자 약관 범위 내 사용. 상업 배포 전 재확인 필요
  - **응답 스키마 방어**: 알라딘은 `itemId`, `title`, `author`, `publisher`, `isbn`, `isbn13`, `cover`, `subInfo.itemPage`를 돌려준다. 파서는 `title`만 필수, 나머지는 optional. 알라딘 필드 변경 시에도 UI가 죽지 않도록 한다
  - **타임아웃**: 5초 `AbortController`, 실패 시 1회 재시도
  - **ISBN 변환**: 바코드는 ISBN-13, 알라딘은 10/13 모두 허용 — `lib/isbn.ts`에서 ISBN-10→13 변환 후 쿼리
  - **표지 이미지**: 알라딘 URL 직접 링크(ADR-012). 자체 재업로드 금지

---

## ADR-005: 도트 아트는 정적 PNG 스프라이트 레이어 합성
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 도트 방 메인 화면을 어떻게 그릴 것인가.
- **결정**: 방 배경 + 곰 + 다이어리 + 책더미 + 창문 + 램프를 개별 PNG로 절대좌표 합성. `image-rendering: pixelated`. 파일명 고정.
- **대안**:
  - SVG 픽셀 아트: 코드 생성 공수 과다
  - Canvas 런타임 렌더: 초기 비용 + 접근성 비용↑
  - CSS `box-shadow` 도트: 유지보수 불가
- **결과/제약**:
  - 곰 idle 애니메이션은 스프라이트 시트 필요(다중 프레임 PNG + `steps()` easing)
  - 크기 변경 시 에셋 재생산
  - **접근성**: 방 전체 `role="img" aria-label="곰이 책을 읽는 따뜻한 방"` + 개별 hitbox `<button aria-label>` 분리. 장식 이미지는 `alt=""`
  - **테마**: 주간/야간 에셋 두 벌(`/sprites/day/`, `/sprites/night/`) — MVP는 야간만. `/sprites/night/` 경로 고정(ADR-017)
  - **반응형**: 가로모드 전용. `aspect-ratio: 8/5` 유지, `max-height: calc(100dvh - 64px)` 상한. 세로로 길면 위아래를 `--color-border`(#1a100a) 레터박스로 채움. 스프라이트는 landscape 퍼센트 좌표 단일 세트. `image-rendering: pixelated`로 비정수 스케일 깨짐 최소화
  - hitbox는 투명 `<button>` 절대 위치 오버레이로 충분

---

## ADR-006: 픽셀 폰트 Galmuri11 셀프호스팅
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 한글 픽셀 폰트 웹 배포 방식.
- **결정**: Galmuri11(OFL) woff2를 `public/fonts/galmuri/`에 두고 `@font-face` + `font-display: swap` + fallback `monospace`.
- **대안**:
  - Google Fonts: 한글 픽셀 폰트 부재
  - 영문 픽셀 + 시스템 한글 혼용: 톤 불일치
- **결과/제약**:
  - 폰트 업데이트 수동(에셋 커밋)
  - **OFL 고지 의무**: `/settings`에 "오픈소스 라이선스" 링크(v1.1). MVP는 README에 명시
  - **FOUT 방지**: `font-display: swap`으로 fallback(`monospace`) 먼저 → Galmuri11로 swap. 레이아웃 튐 최소화 위해 fallback 메트릭 고려
  - **서브셋**: KS X 1001 기준 한글 서브셋 사용 → woff2 ≤ 500KB 목표
  - **다운로드 자동화 금지**: 라이선스/버전 고정을 사람이 확인해야 함. 파일 자리만 만들고 README에 수동 안내

---

## ADR-007: 에러 처리 전략 — throw + error.tsx 경계
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 서버/클라이언트 에러를 어떻게 표면화·복구할 것인가.
- **결정**:
  - Server Component: 예외 throw → 가장 가까운 `error.tsx` 경계에서 복구 버튼 제공
  - 라우트 핸들러: `{ error: { code, message } }` JSON + 적절한 HTTP status
  - Server Action: `ActionResult<T>` union 반환 (`{ ok: true; data }` | `{ ok: false; error }`)
  - Client 폼: `useActionState`로 상태 수신 → 토스트(비즈니스 에러) + `FieldError`(검증 에러) 분리
  - `Result<T, E>` 래핑 도입 안 함(Server Action 반환은 예외적으로 union 사용)
- **대안**:
  - Result 패턴 전역화: TypeScript 추론은 좋지만 호출부 보일러플레이트 과다
  - 전역 try/catch 미들웨어: Next.js `error.tsx`와 중복
- **결과/제약**:
  - 모든 Server Component는 에러 경계 하나 이상 안에 있어야 함
  - 도메인 에러 코드(`lib/errors.ts`): `VALIDATION_FAILED`, `NOT_FOUND`, `DUPLICATE_ISBN`, `UPSTREAM_FAILED`, `RATE_LIMITED`, `UNAUTHORIZED`, `UNSUPPORTED_ENV`
  - 토스트 컴포넌트는 UI_GUIDE 규정(1px hard border, duration ≤ 100ms) 내에서 구현
  - `global-error.tsx`는 루트 layout 자체 크래시를 잡는다 — 별도 작성 필수

---

## ADR-008: 입력 검증 — zod
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 서버 경계와 폼 단계에서 입력 검증 방식.
- **결정**: zod 도입. `src/lib/validation.ts`에 도메인 스키마(Book, ReadingSession, DiaryEntry, SearchQuery, Profile) 정의. 라우트 핸들러, Server Action, LocalStore 쓰기 전, Client 폼이 모두 동일 스키마를 재사용.
- **대안**:
  - 수동 타입가드: 누락 위험
  - yup: 타입 추론 약함
  - valibot: 생태계 작음
- **결과/제약**:
  - 스키마 변경이 모든 경계에 전파 — 좋음(일관성)
  - 번들 영향: Client에서 재사용 시 zod 런타임(~12KB gzipped) 감수
  - 검증 실패는 `AppError('VALIDATION_FAILED', ...)` + `fieldErrors` 맵으로 통일
  - `SafeParseReturnType`을 직접 쓰지 말고 `lib/validation.ts` 래퍼를 통해 `AppError`로 변환

---

## ADR-009: 캐싱·재검증 — Next fetch cache + revalidatePath
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: Server Component 데이터 신선도 관리.
- **결정**: 읽기는 Next 기본 fetch cache + 라우트별 `revalidate` 지정. 쓰기(Server Action/Route Handler 성공) 후 `revalidatePath(...)`로 해당 라우트 무효화.
- **대안**:
  - SWR / React Query: Client 전역 캐시, Server Component와 이중화
  - 수동 `router.refresh()`: 일관성·선언성 부족
- **결과/제약**:
  - 각 mutation이 어떤 path를 revalidate할지 ARCHITECTURE.md에 표로 명시
  - 알라딘 검색은 `fetch(..., { next: { revalidate: 60 } })`
  - 캐시 키는 쿼리스트링 원형 — URL 정규화(`trim` + `encodeURIComponent`)
  - guest(LocalStore) path에서는 `revalidatePath` 대신 `router.refresh()`를 컴포넌트에서 호출

---

## ADR-010: 배포 타겟 — Vercel
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: MVP 배포 플랫폼.
- **결정**: Vercel. Supabase는 별도 호스팅(Supabase Cloud). 환경변수는 Vercel 대시보드 + `.env.local`(개발).
- **대안**:
  - Cloudflare Pages: Next.js 15 edge 호환성 주의 필요
  - 자체 VPS: 운영 인력
  - Netlify: Next.js 최적화 미흡
- **결과/제약**:
  - 서버리스 cold start 수용
  - `next/image` 최적화 무료 티어 한도 — 알라딘 도메인 `remotePatterns` 필수
  - 로그는 Vercel 대시보드. Sentry는 v1.1
  - 환경변수 sync: `.env.example`을 단일 소스로 두고 Vercel에 수동 반영

---

## ADR-011: 접근성 베이스라인 — WCAG 2.1 AA
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 픽셀 아트 UI에서도 최소 접근성 가드레일이 필요.
- **결정**: WCAG 2.1 AA 준수. Tab 순서, `aria-label`, 색 대비 4.5:1(보조 3:1), `prefers-reduced-motion` 대응을 필수로.
- **대안**:
  - AAA: 비용 대비 효용 낮음
  - 가드레일 없음: 픽셀 아트 특성상 구멍이 쉽게 생김
- **결과/제약**:
  - 보조 텍스트 색(`#a08866` on `#2a1f17`)은 구현 시 실측 후 미달이면 팔레트 조정
  - 곰/램프 애니메이션에 `prefers-reduced-motion` 미디어쿼리로 정지
  - PR 체크리스트에 Lighthouse 접근성 ≥ 95 항목 고정
  - 모든 hitbox는 `<button>` + `aria-label` + 가시 focus ring

---

## ADR-012: 표지 이미지 호스팅 — 알라딘 URL 직접 링크 (MVP)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 책 표지 이미지를 어디서 서빙할 것인가.
- **결정**: MVP는 알라딘이 제공하는 `cover` URL을 그대로 DB에 저장하고 `<Image>`로 직접 렌더. `next.config.ts`의 `images.remotePatterns`에 `image.aladin.co.kr` 허용.
- **대안**:
  - Supabase Storage 업로드: 저작권 + 비용
  - 자체 CDN 캐시: 운영 비용
- **결과/제약**:
  - 알라딘 URL 변경 시 깨짐 → `<Image onError>`에서 이니셜 플레이스홀더로 폴백
  - 저작권: 알라딘 약관 범위 내 링크 사용. 자체 재배포·수정·다운로드 금지
  - v1.1에서 캐시/프록시 전략 재검토

---

## ADR-013: DB 마이그레이션 — Supabase CLI (supabase db push)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 스키마 변경을 어떻게 버전 관리하고 배포할 것인가.
- **결정**: Supabase CLI의 `supabase db push`를 사용. `supabase/migrations/` 디렉토리에 `NNNN_<slug>.sql` 파일로 순서 관리. 로컬 개발은 `supabase start` (Docker) + `supabase db reset`.
- **대안**:
  - Flyway / Liquibase: Supabase 특화 기능 누락, 운영 복잡도↑
  - Drizzle Kit: ORM 도입 비용
  - Supabase 대시보드 직접 편집: 재현 불가, 버전 관리 안 됨
- **결과/제약**:
  - **`supabase/migrations/0001_init.sql`**: 최초 전체 스키마 + RLS + trigger
  - 이후 변경은 `0002_`, `0003_` 순번 append-only
  - **로컬 dev 없이 배포 금지**: `supabase db push`는 CI에서만 실행
  - **마이그레이션 롤백 없음(MVP)**: 파괴적 변경은 신규 마이그레이션으로 forward-only 처리
  - `bun db:migrate` 스크립트: `supabase db push --linked`
  - `bun db:types` 스크립트: `supabase gen types typescript --linked > src/types/supabase.ts`
  - `.gitignore`에 `.supabase/` (Docker 볼륨) 추가

---

## ADR-014: 테스트 전략 — Vitest + Testing Library (E2E MVP 제외)
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 어느 레벨까지 자동 테스트를 강제할 것인가.
- **결정**: 유닛/통합은 Vitest + `@testing-library/react` + `fake-indexeddb`. E2E(Playwright/Cypress)는 MVP 제외. TDD로 진행.
- **대안**:
  - Jest: Bun 런타임과의 호환성 별도 설정 필요
  - Playwright E2E 포함: MVP 일정 초과
  - 테스트 없음: CLAUDE.md CRITICAL 위반
- **결과/제약**:
  - 테스트 파일은 소스와 동일 디렉토리에 배치(`*.test.ts(x)`)
  - IndexedDB 테스트는 `fake-indexeddb`로 격리
  - Supabase 호출은 `vi.mock`으로 격리 — DB 실제 연결 없음
  - 커버리지 게이트: **MVP에선 강제하지 않음** — 단, 모든 도메인 유틸(`lib/*`)과 새 컴포넌트는 최소 1건 테스트 필수
  - 테스트에서 `any` 타입 금지. `vi.mock`의 반환 타입은 명시
  - 기존 테스트를 깨뜨리는 PR은 머지 금지

---

## ADR-015: 폼 패턴 — Server Action + React 19 useActionState
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 회원/비회원 폼 제출을 어떻게 통일할 것인가. Server Component 기본 원칙과 충돌하지 않아야 한다.
- **결정**: 폼 컴포넌트(`"use client"`)가 `useActionState(action, initialState)`로 상태를 받는다. 회원: Server Action 직접 주입. 비회원: `handleSubmit(values)`를 `action`으로 감싼 함수 주입. 컴포넌트는 `ActionResult<T>` shape만 알면 된다.
- **대안**:
  - `onSubmit` + fetch: Server Action 이점 없음
  - 상태관리 라이브러리(Zustand): 금지(CLAUDE.md)
  - React Hook Form: 의존성 추가. Tailwind v4 + Server Action 조합에서 불필요한 제어 역전
- **결과/제약**:
  - `ActionResult<T>` = `{ ok: true; data: T } | { ok: false; error: { code, message, fieldErrors? } }`
  - 모든 Server Action은 `lib/actions/` 디렉토리에 배치
  - 폼 컴포넌트는 `pending` 상태로 버튼 disable + 텍스트 변경
  - 검증 오류는 `FieldError` 컴포넌트로 각 필드 아래에 인라인 노출
  - 비즈니스 오류(UPSTREAM_FAILED, RATE_LIMITED 등)는 Toast로 표면화
  - `useActionState`의 초기 상태는 `null`이 아니라 `{ ok: true; data: null }` 형태로 타입 안전하게 초기화

---

## ADR-016: 닉네임/프로필 저장 — profiles 테이블 + dbd:preferences
- **상태**: Accepted
- **날짜**: 2026-04-15
- **컨텍스트**: 사용자 닉네임을 어디에 저장할 것인가. 회원과 비회원 경로가 다르다.
- **결정**:
  - 회원: `public.profiles` 테이블 (`user_id PK`, `nickname text CHECK(1~30자)`, `created_at`, `updated_at`)
  - 비회원: `dbd:preferences.nickname` (IndexedDB)
  - `auth.users` INSERT 시 `handle_new_user` trigger가 `profiles` row를 자동 생성
  - `auth/callback/route.ts`에서도 trigger 실패 대비 upsert fallback 추가
- **대안**:
  - `auth.users.raw_user_meta_data`: Supabase 내부 필드 오염, RLS 적용 불가
  - 별도 닉네임 API: 오버엔지니어링
- **결과/제약**:
  - `Store` 인터페이스에는 profile 메서드를 넣지 않는다. 책·세션·다이어리만 담당한다
  - 회원 닉네임 변경은 `lib/actions/profile.ts`를 통해 `profiles`를 갱신
  - 비회원 닉네임 변경은 `preferences.ts`가 `dbd:preferences.nickname`을 갱신
  - 닉네임 검증 스키마: `z.string().min(1).max(30).trim()`
  - 닉네임 미설정 시 UI 기본값: `"독서하는 곰"`

---

## ADR-017: 테마 전략 — 야간(night) 전용 MVP, 주간은 v1.1
- **상태**: Superseded by ADR-018
- **날짜**: 2026-04-15
- **컨텍스트**: 주간/야간 두 테마를 처음부터 지원할 것인가, 한 가지만 구현할 것인가.
- **결정**: MVP는 야간 테마만 구현. `/sprites/night/` 경로 고정. `/sprites/day/`는 디렉토리만 생성, 에셋 없음. CSS 변수 구조는 테마 전환을 염두에 두고 설계하되, 실제 토글 UI는 v1.1.
- **대안**:
  - 처음부터 주간/야간 모두: 에셋 두 벌 필요. MVP 범위 초과
  - 시스템 `prefers-color-scheme`: 야간 방이 낮에 보이면 정서 훼손
- **결과/제약**:
  - `globals.css`에서 색상을 CSS 변수(`--color-bg`, `--color-text-primary` 등)로 정의
  - 현재 변수값은 야간 팔레트로만 채워진다
  - v1.1에서 `data-theme="day"` 속성 전환으로 테마 스왑 가능하도록 변수 naming 일관성 유지
  - `/settings` sync 토글처럼 테마 토글도 placeholder + `disabled` 상태로 UI만 노출
  - `body`에 `data-theme="night"` 고정(MVP)

---

## ADR-018: 낮/밤 테마 전환 — 시간대 자동 + 수동 오버라이드 (MVP1)
- **상태**: Accepted
- **날짜**: 2026-04-20
- **컨텍스트**: MVP(0-mvp)에서 야간 전용이었던 테마를 MVP1에서 주간까지 확장한다. 전환 트리거를 어떻게 정할 것인가.
- **결정**:
  - `themePreference`는 3택: `'system' | 'day' | 'night'`. 기본값은 `'system'`.
  - `'system'`일 때 `resolveTheme(pref, now)`가 로컬 시각을 보고 18:00~06:00은 `night`, 그 외는 `day`로 해석. `prefers-color-scheme`은 MVP1에서 참고하지 않는다(야간 방이 낮에 보이면 정서 훼손, ADR-017 동일 이유).
  - 저장 위치:
    - 회원: `profiles.theme_preference` 컬럼. 값 체크 제약으로 세 값만 허용.
    - 비회원: `dbd:preferences.themePreference`.
  - 적용 범위: (1) `<html data-theme="day|night">` 속성, (2) `globals.css`에서 `[data-theme]`별 CSS 변수 세트, (3) `RoomScene`의 스프라이트 베이스 경로(`/sprites/day/` ↔ `/sprites/night/`).
  - SSR: 레이아웃에서 세션→preference 조회 후 `<html data-theme>`를 서버에서 설정한다. 비회원 초기 렌더는 `night` 기본(dark FOUC가 반대보다 덜 자극적) + `ThemeHydrator`가 mount 후 선호도 로드하여 교체.
  - 전환 애니메이션: 없음. UI_GUIDE의 100ms 트랜지션 규칙 하에서도 테마 전체 전환은 즉시(step) 수행.
- **대안**:
  - 시스템 `prefers-color-scheme`만 따름: 유저 의도와 자주 불일치
  - 수동 토글만: 자동 진입감이 약함(재방문 정서 저해)
  - 연속 크로스페이드: 픽셀 아이덴티티 파괴
- **결과/제약**:
  - 낮 테마 팔레트는 `UI_GUIDE.md`에 `[data-theme="day"]` 블록으로 고정한다. 하드코드 색상(`text-[#...]`) 사용부는 MVP1 범위 내에서 점진적으로 CSS 변수로 리팩터링. 신규 코드는 변수만 사용.
  - `/sprites/day/`, `/sprites/night/` 두 벌이 동일 파일명으로 존재해야 한다(현재 상태 유지).
  - `ReadingTimer`처럼 MVP1에 신설되는 컴포넌트는 처음부터 CSS 변수만 사용한다.
  - `<html data-theme>` 서버 값과 클라이언트 교체 사이의 FOUC를 최소화하기 위해 `ThemeHydrator`는 초기 mount에서 한 번만 실행한다.

---

## ADR-019: 독서 타이머 — localStorage 기반 단일 세션, 분 단위 반올림 기록 (MVP1)
- **상태**: Accepted
- **날짜**: 2026-04-20
- **컨텍스트**: `/reading/[bookId]`에 실시간 독서 시간 측정 기능을 추가한다. 브라우저 탭 이동·페이지 전환 중에도 타이머가 지속되고, 정지 시 `reading_sessions.duration_minutes`에 기록되어야 한다.
- **결정**:
  - 전역에 **단일 활성 타이머**만 허용. 동일 브라우저 내 다른 책의 타이머를 시작하려 하면 기존 타이머의 종료 여부를 확인하는 모달을 띄운다.
  - 상태는 `localStorage` 키 `dbd:reading_timer`에 `{ bookId, startedAt, pausedAt?, accumulatedMs, status }` 형태로 저장. 회원/비회원 모두 동일 키. 저장은 지속 탭을 넘겨도 복원할 수 있도록 한다.
  - 시간 계산은 `performance.now()`가 아니라 `Date.now()` 기반. 백그라운드 탭 throttling의 영향을 받지 않는다.
  - 상태값: `'running' | 'paused' | 'stopped'`. `stopped`가 되면 즉시 localStorage에서 키를 제거한다.
  - 정지 시 경과 시간은 **분 단위로 반올림**(`Math.round(totalSeconds / 60)`)하여 `ReadingSessionForm`의 `durationMinutes` 필드에 프리필하고, 폼을 포커스만 한다. 자동 저장하지 않는다 — 페이지/날짜 확인 여지를 준다.
  - 일시정지는 지원한다. `status === 'paused'`에서 시작 버튼은 "재개" 라벨.
  - `reading_sessions`는 기존 `duration_minutes` 컬럼만 사용한다. 초 단위 컬럼을 신설하지 않는다(정확도 요구 없음, 스키마 최소화).
- **대안**:
  - 타이머 상태를 서버(Supabase)에 기록: 오프라인 상태에서 깨지고, 비회원을 지원 못 함
  - multi-session(책별) 지원: UI 복잡도↑, 사용자 의도 불명확
  - 초 단위 컬럼 신설: 회고 UI가 분 단위만 쓴다면 과잉
- **결과/제약**:
  - `lib/reading-timer.ts`는 `read/start/pause/resume/stop/clear` API를 제공하고 UI는 1초 `setInterval`로 재렌더만 한다(상태는 localStorage가 진실원).
  - 탭 A에서 타이머 실행 중인데 탭 B에서 같은 책에 진입하면 `storage` 이벤트로 동기화한다.
  - `prefers-reduced-motion`에도 타이머 숫자 자체는 계속 갱신된다(정보 표시). 깜빡임 애니메이션만 금지.

---

## ADR-020: 책 목표 완독일 — books.target_date 단일 컬럼, 진도 계산은 클라이언트 (MVP1)
- **상태**: Accepted
- **날짜**: 2026-04-20
- **컨텍스트**: 책별로 "언제까지 다 읽을지" 목표를 설정하고 진도 가시화를 제공한다. 데이터 모델을 어떻게 최소화할 것인가.
- **결정**:
  - `books.target_date date` 단일 컬럼(nullable)만 추가한다. `target_pages_per_day` 등 보조 컬럼은 두지 않는다.
  - 진도 계산은 클라이언트 순수 함수로 처리:
    - 페이지 진행률 = `max(reading_sessions.end_page) / books.total_pages` (둘 다 있을 때만. total_pages 없으면 페이지 기반 지표 숨김)
    - 날짜 진행률 = `(today - book.created_at date) / (target_date - book.created_at date)` (target_date 있을 때만)
    - 상태 라벨: 페이지 진행률 ≥ 날짜 진행률이면 "순항", 10%p 이상 뒤지면 "밀림", `today > target_date`이고 진행률 < 1이면 "지연".
  - UI 노출 위치: `/reading/[bookId]` 상단 + `/bookshelf` 카드 하단 소형 진행 막대. 막대는 1px hard border + `var(--color-accent)` fill.
  - 목표일은 `ReadingSessionForm` 상단의 "책 설정" 섹션 옆에 간단 입력으로 편집한다. 별도 페이지를 만들지 않는다.
  - `target_date`는 `book.createdAt`(로컬 ymd) 이상이어야 한다. zod에서 검증.
- **대안**:
  - `goals` 테이블 분리: 1:1 관계에 테이블 하나 더 만드는 비용 > 이득
  - 기간별 목표(주간 페이지 수): 단일 `target_date` 모델보다 복잡. MVP1 범위 초과
- **결과/제약**:
  - 서버/클라이언트 시간대 차이로 인한 진도 계산 오차는 감수한다(저장은 로컬 ymd 기준, ARCHITECTURE §22와 동일).
  - "지연" 라벨은 경고로 해석될 수 있으므로 톤은 UI_GUIDE 카피 원칙(사용자 다음 행동 제시)을 따른다 예: "며칠 더 필요해요".

---

## ADR-021: 곰 상태 판정 — 마지막 독서 경과 기반 variant 교체 (MVP2)
- **상태**: Accepted
- **날짜**: 2026-04-22
- **컨텍스트**: MVP1까지 곰은 idle 애니메이션만 있는 정적 배경이었다. MVP2에서 "방이 살아있다"는 정서를 강화하기 위해 사용자의 독서 패턴에 반응하는 곰 스프라이트 변화를 도입한다.
- **결정**:
  - 판정 기준: `reading_sessions.created_at`(UTC ISO) 중 최신 값과 `now` 사이의 경과 시간.
  - `readDate`(날짜만) 대신 `created_at`을 쓴 이유: 1시간 경계 판정에 시각 해상도가 필요하고, 두 필드를 섞으면 일관성이 깨진다.
  - 상태 3단계:
    1. `fresh` (elapsed < 1h 또는 `lastReadAt === null`): `Bear.png`
    2. `active` (1h ≤ elapsed < 7d): `Bear_drinking / eating / healing / playing / working` 중 1택
    3. `sleeping` (elapsed ≥ 7d): `Bear_sleeping.png`
  - 랜덤 시드: `YYYY-MM-DD(오늘) + lastReadAt` 문자열을 해시해서 mulberry32 prng 시드로 사용. **하루 단위 안정** — 방을 여러 번 열어도 같은 날은 같은 곰. 새 독서 기록이 생기면(`lastReadAt` 변경) variant도 바뀜.
  - Night 테마: `public/sprites/night/Bear_*.png` 6종이 day와 동일 파일명으로 존재. `RoomScene`의 `SPRITE_FILES.bear`는 day/night 각각 같은 파일명을 가리키므로 에셋만 배치하면 자동 적용.
  - 순수 함수(`lib/bear-state.ts`): `computeBearState(lastReadAt, { now, rng? })` — 테마 무관, TDD.
- **대안**:
  - `readDate` 기준: 자정 기준이라 1시간 경계 판정 불가. 경계를 날짜 단위(어제/그제)로 완화하면 UX 설계가 달라짐.
  - 매 방문 `Math.random`: 활기차 보이지만 "슬롯머신" 느낌, 곰에게 인격이 없음.
  - 독서 세션 없을 때 random active: "책을 읽지 않았는데 곰이 논다"는 비직관적 상황.
- **결과/제약**:
  - `lib/last-read.ts`의 `getLastReadAtFromSupabase`는 `server-only` 임포트 필수.
  - 비회원은 SSR에서 `lastReadAt = null` → 클라이언트 hydration 후 교체. FOUC 허용(ThemeHydrator와 동일 수용 기준).
  - 시계 역전(`now < lastReadAt`) → `fresh`로 방어 처리.

---

## ADR-022: Letterbox HUD — 상하 여백에 곰 상태와 경과 시간 표시 (MVP2)
- **상태**: Accepted
- **날짜**: 2026-04-22
- **컨텍스트**: 메인 씬(`RoomScene`)은 `aspect-ratio 8/5` 고정이므로 뷰포트 비율에 따라 상하(letterbox) 또는 좌우(pillarbox) 여백이 생긴다. 이 여백에 방의 "현재 상태"를 속삭이는 정보를 노출한다.
- **결정**:
  - 상단 HUD: `BearStatusBar` — 곰 상태 한 줄 텍스트 (`aria-live="polite"`).
  - 하단 HUD: `LastReadNote` — 마지막 독서 경과 (`<time dateTime>` 래핑).
  - 배치: `src/app/page.tsx`의 `<main>` flex-col 내부에 상단 HUD → `flex-1` 씬 → 하단 HUD 3단. HUD는 단일 줄 텍스트 높이로 최소화하여 씬 크기에 영향 없음.
  - 좁은 letterbox: HUD 높이가 픽셀 수 줄 텍스트 수준이므로 씬과 겹치지 않는다. 뷰포트가 정확히 8:5라면 HUD가 씬을 약간 밀어내지만 `flex-1`이 씬을 수축시키므로 overflow 없음.
  - 접근성: 씬 `role="img"` 영역과 분리된 형제 요소. 스크린리더 순서: 상단 HUD → 씬(img) → 하단 HUD.
  - 애니메이션: 없음. `prefers-reduced-motion` 무관.
- **대안**:
  - 씬 위/아래 절대 위치 오버레이: 씬과 겹침, z-index 관리 필요.
  - 씬 내부 텍스트 오버레이: `role="img"` 의미와 충돌, 접근성 구조 복잡.
- **결과/제약**:
  - HUD는 CSS 변수만 사용. `var(--color-text-secondary)`, `var(--color-border)` 배경색 없음.
  - 비회원 초기 렌더에서 HUD가 `null`이면 빈 자리(공백) 렌더. hydration 후 교체 시 Layout Shift 최소화를 위해 HUD 컨테이너 높이를 고정하지 않는다(텍스트 높이로 자연 결정).

---

## ADR-023: 야간 램프 on/off 토글 — localStorage 상태 저장, night 한정
- **상태**: Accepted
- **날짜**: 2026-04-22
- **컨텍스트**: 밤 방의 램프를 클릭해 끄고 켤 수 있다. 상태를 어디에 저장하고 어느 테마에 적용할지 결정 필요.
- **결정**:
  - 저장소: `localStorage` (`dbd:lamp_state`). 재방문 시 복원.
  - 테마 범위: night 전용. day에서는 버튼 미렌더.
  - 파일명 규칙: `*_off.png` suffix. `SPRITE_FILES` 상수 변경 없이 렌더 함수 내 `resolveFilename` 헬퍼로 처리.
  - 애니메이션: off 상태에서 `lamp-flicker` 제거 (`reducedMotion` 조건과 병렬).
- **대안**:
  - IndexedDB preferences: 비동기 + hydrator 컴포넌트 추가 필요. 과도한 복잡도.
  - in-memory only (useState): 새로고침 시 항상 on으로 초기화. "나의 방" 정서와 맞지 않음.
- **결과/제약**:
  - `Table_Lamp_off.png`, `Background_off.png` 에셋 필요 (`public/sprites/night/`).
  - SSR hydration mismatch 방지: `useState('on')` 초기값 고정, 마운트 후 localStorage 읽기.
  - `books.target_date`가 포함된 모든 경로에서 `updateBookAction` → `revalidatePath('/bookshelf')`, `revalidatePath(`/reading/${bookId}`)`.

## ADR-024: 곰 상태를 말풍선(in-canvas overlay)으로 표시
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: letterbox HUD의 `BearStatusBar`(평문 라벨)를 K.K. 스타일 픽셀 말풍선으로 전환. 닉네임을 헤더에 표시.
- **결정**: `BearSpeechBubble` 컴포넌트를 RoomScene 캔버스 내 absolute 오버레이로 배치. z-index 35. `BearStatusBar` 제거.
- **대안**:
  - 기존 letterbox 그대로 닉네임만 삽입: 방 바깥 HUD와 캔버스가 분리되어 정서 약함.
  - 둘 다 유지(말풍선 + HUD): 정보 중복, 시각 노이즈.
- **결과/제약**:
  - 접근성: `role="status" aria-live="polite"`으로 스크린리더 전달.
  - hitbox(z-index 50)보다 낮아야 클릭 우선순위가 유지됨.
  - 꼬리 방향, 위치는 시각 검수 후 조정.

## ADR-025: hitbox 클릭 어포던스 — 항상 보이는 1px dashed outline + 인디케이터 점
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: 모바일에서 hover 없이 어디를 눌러야 할지 알 수 없다.
- **결정**: 5개 hitbox에 `outline-dashed outline-[#e89b5e]/60` + 우상단 8×8px `bg-[#e89b5e]` 점. 데스크탑/모바일 항상 표시.
- **대안**:
  - hover-only: 모바일에서 미표시(문제 미해결).
  - `@media (hover: none)` 분기: 코드 복잡도↑ 대비 이득 적음.
  - onboarding pulse: 두 번째 방문자가 다시 못 봄.
- **결과/제약**:
  - 어포던스 투명도(60%)는 방 정서를 해치지 않는 선에서 최소화.
  - transition ≤100ms. glow/blur 금지.

## ADR-026: 닉네임 반영 카피 — getDisplayNickname() 헬퍼, 폴백 '책곰이'
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: ADR-016에서 닉네임 저장 전략을 정했으나, UI 표시용 폴백과 말풍선 헤더 적용 방식은 미결.
- **결정**: `src/lib/nickname.ts`의 `getDisplayNickname()` 단일 헬퍼. null·빈값→`'책곰이'`. 말풍선 헤더에만 사용(본문 라벨은 닉네임 무관).
- **대안**:
  - `'독서하는 곰'` 폴백(ADR-016 언급): 말풍선 헤더에 곰 이름이 들어가면 발화 주체가 모호해짐. `'책곰이'`가 독자 정체성 표현에 더 적합.
  - bear-state.ts 라벨에 닉네임 직접 주입: 라벨 로직 복잡도↑, 순수 함수성 저해.
- **결과/제약**:
  - ADR-016의 닉네임 기본값 `'독서하는 곰'`은 설정 페이지 placeholder용으로 유지. 말풍선 표시 폴백은 `'책곰이'`(이 ADR 기준).
  - `getDisplayNickname()`은 `src/lib/` 에 위치하며 UI에 의존하지 않는다.

## ADR-027: 비회원 테마 토글 비활성 — SSR/IndexedDB 불일치 회피 (4-mvp-polish)
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: 비회원이 `/settings`에서 테마를 변경하면 IndexedDB에 저장되지만, `settings/page.tsx`와 `page.tsx`는 server component이므로 IndexedDB를 읽을 수 없다. 새로고침 시 ThemeSelector 토글은 `'system'`으로 리셋되고, `page.tsx`의 `<RoomScene theme={theme} />`도 항상 시간 기반 테마로 결정되어 사용자 선택과 무관한 sprite 경로가 전달된다. "저장된 것처럼 보이지만 반영 안 됨" UX 혼란.
- **결정**: `ThemeSelector`에서 `!isLoggedIn`이면 `ToggleTabs`를 렌더하지 않고 "로그인하면 테마를 저장할 수 있어요." 안내 + 로그인 링크를 표시. 비회원은 테마를 변경할 수 없다.
- **대안**:
  - 비회원 테마를 쿠키에 저장해 SSR이 읽도록: `dbd:preferences`(IndexedDB)와 이중 관리, 쿠키 크기·만료 정책 설계 필요. 작업량 대비 이득이 낮음.
  - Client-side에서 IndexedDB 읽어 `RoomScene` theme prop 교체: SSR→CSR 교체로 CLS 발생, sprite 이미지 이중 로드 가능성.
  - 기능 작동 유지, UI 불일치 허용: 사용자가 직접 보고한 혼란이므로 허용 불가.
- **결과/제약**:
  - 비회원은 `/settings` 테마 섹션에서 로그인 유도 UI만 본다.
  - `updatePreferences()` 함수는 유지 — 닉네임 등 다른 preference 저장에 사용되며, 차후 SSR↔IndexedDB 동기화 phase에서 테마도 포함 가능.
  - ADR-022의 "비회원 초기 SSR: null이면 렌더 생략" 원칙과 일관성 유지.
