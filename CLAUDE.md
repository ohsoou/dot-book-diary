# 프로젝트: 도트 북 다이어리 (dot-book-diary)

따뜻한 도트 그림체의 "방"을 메타포로 한 개인 독서 기록 웹앱. 회원은 Supabase에 저장, 비회원은 브라우저 로컬에만 저장.

## 기술 스택
- Next.js 15 (App Router, Server Components 기본)
- TypeScript strict mode (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- Tailwind CSS v4
- Bun (런타임 / 패키지 매니저 / 테스트 러너 연동)
- Supabase (Auth + Postgres + Storage, RLS 필수)
- Vitest + @testing-library/react

## 아키텍처 규칙
- CRITICAL: 외부 API(알라딘 Open API 등)는 반드시 `src/app/api/` 라우트 핸들러에서만 호출한다. 클라이언트 컴포넌트에서 직접 호출 금지 — TTB 키 노출 + CORS 문제.
- CRITICAL: Supabase 테이블은 모두 RLS 활성화. 모든 SELECT/INSERT/UPDATE/DELETE 정책은 `user_id = auth.uid()`가 기본. anon key가 클라이언트에 노출되기 때문에 예외 없음.
- CRITICAL: 비회원(로그인 전) 데이터는 서버로 전송하지 않는다. IndexedDB에만 저장한다. "로그인하면 동기화" 동의는 v1.1 스코프.
- 데이터 접근은 `src/lib/storage/`의 `Store` 인터페이스 한 곳으로만 한다. 회원=`RemoteStore`(Supabase), 비회원=`LocalStore`(IndexedDB). 상위 레이어는 어떤 구현이 주입됐는지 몰라야 한다.
- 컴포넌트는 `src/components/`, 타입은 `src/types/`, 외부 API 래퍼는 `src/services/` 또는 `src/lib/` 하위에 분리한다.
- 서버 전용 모듈(`lib/aladin.ts`, `lib/supabase/server.ts` 등)은 파일 상단에 `import 'server-only'` 추가. 클라이언트 번들 포함 방지.
- UI: `rounded-*`, `backdrop-blur`, `gradient`, box-shadow blur, 보라/인디고 색상 금지. 이유는 `docs/UI_GUIDE.md` 참조.

## 모듈 의존성 계층 (위→아래만 허용, 역방향 금지)
```
app/ (라우트, page, layout, error, loading)
  ↓
components/ (UI 컴포넌트)
  ↓
lib/actions/ (Server Actions)
  ↓
lib/storage/ (Store 인터페이스 + LocalStore + RemoteStore)
  ↓
lib/ (유틸: date, isbn, escape, errors, validation, env)
  ↓
types/ (순수 타입 정의)
```

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 테스트 파일은 소스 파일과 동일 디렉토리에 배치. `foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.tsx`.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:, chore:)
- Harness 프레임워크 워크플로우(`.claude/skills/harness/SKILL.md`)를 따른다. 작업은 `phases/{task}/` 단위로 설계·실행한다.

## 임포트 경로
- `@/` 는 `src/` 의 절대 경로 alias. 예: `import { AppError } from '@/lib/errors'`
- 상대 경로는 동일 디렉토리 내에서만 허용. 디렉토리를 넘나드는 경우 `@/` 사용.

## 명령어
```bash
bun dev           # 개발 서버 (http://localhost:3000)
bun build         # 프로덕션 빌드 (타입 에러 없음 확인)
bun lint          # ESLint
bun run test          # Vitest (= vitest run, 비대화형)
bun db:migrate    # supabase db push --linked (스키마 배포)
bun db:types      # supabase gen types typescript --linked > src/types/supabase.ts
```

## 환경변수 (.env.local — 절대 커밋하지 않는다)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALADIN_TTB_KEY=
NEXT_PUBLIC_FF_SYNC_GUEST_DATA=false
```
진실원: `.env.example`. Vercel 대시보드에 수동 동기화.
**[주의]** `SUPABASE_SERVICE_ROLE_KEY`(Secret Key)는 RLS를 우회하므로 절대 `NEXT_PUBLIC_` 접두사를 붙여 노출하지 않으며, 앱의 일반 로직에서는 사용을 지양한다.

