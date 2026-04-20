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
- **상태**: Accepted
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
