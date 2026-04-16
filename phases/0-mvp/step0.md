# Step 0: scaffold-and-quality-gates

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`

## 작업

Next.js 15 App Router 기반 프로젝트를 초기화하고, 이후 step이 공통으로 기대하는 품질 게이트까지 한 번에 고정한다. 런타임은 Bun.

1. **프로젝트 초기화**
   - 레포 루트에 직접 생성한다. 하위 폴더를 만들지 않는다.
   - 최소 파일: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`.
   - 스크립트: `dev`, `build`, `start`, `lint`, `test`, `db:migrate`, `db:types`.

2. **Tailwind CSS v4**
   - `@tailwindcss/postcss` 플러그인 설정.
   - `src/app/globals.css`에 `@import "tailwindcss";`.

3. **TypeScript / Next 설정**
   - `"strict": true`, `"noUncheckedIndexedAccess": true`.
   - `paths`: `"@/*": ["./src/*"]` — 절대 경로 alias.
   - `next.config.ts`에 `experimental.typedRoutes: true`.
   - `images.remotePatterns`에 `https://image.aladin.co.kr`.
   - 보안 헤더: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self)` (카메라 권한은 바코드 스캐너용).
   - CSP 헤더는 ARCHITECTURE.md §17 그대로 반영.

4. **앱 기본 뼈대**
   - `src/app/layout.tsx`: `<html lang="ko" data-theme="night">`, metadata 기본값, `<body>` 전역 폰트/배경.
   - `src/app/page.tsx`: placeholder "도트 북 다이어리" 텍스트만. 실제 방은 step 6에서 구현.
   - `src/app/globals.css`: `@font-face`, CSS 변수 (`--color-bg` 등 UI_GUIDE 전체 토큰), `img.pixel { image-rendering: pixelated; }`, `prefers-reduced-motion` 기본 규칙.
   - `src/app/loading.tsx`: Skeleton 스타일 placeholder.
   - `src/app/error.tsx`: `"use client"`, "오류가 생겼어요" + 재시도 버튼.
   - `src/app/not-found.tsx`: "페이지를 찾을 수 없어요" + 홈 링크.
   - `src/app/global-error.tsx`: `"use client"`, 루트 layout 크래시 잡이. 최소 HTML + reload 버튼.

5. **테스트 기반**
   - Vitest + Testing Library + `jsdom`.
   - `vitest.setup.ts`에 `@testing-library/jest-dom` 등록.
   - `src/app/page.test.tsx` smoke test 1건 (placeholder 텍스트 렌더 확인).

6. **폰트 / 에셋 자리**
   - `public/fonts/galmuri/Galmuri11-Regular.woff2` 빈 자리만 만든다. 실제 다운로드 금지.
   - `public/sprites/night/` 자리 + `public/sprites/day/` 자리.
   - `globals.css`에 `@font-face` 선언 (woff2 경로 참조, 파일 없어도 선언만).

7. **환경변수 / 문서**
   - `.env.example`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `ALADIN_TTB_KEY`, `NEXT_PUBLIC_FF_SYNC_GUEST_DATA=false`.
   - `.gitignore`에 `.env.local`, `.supabase/`.
   - `README.md`에 Bun/Node 버전, Galmuri11 수동 설치 방법, `bun install && bun dev` 기본 실행 절차.

8. **디렉토리 구조 자리 만들기**
   - `src/components/{ui,room,book,calendar,diary}/`
   - `src/lib/{actions,storage,supabase}/`
   - `src/types/`
   - `supabase/migrations/`
   - 각 디렉토리에 `.gitkeep` 또는 향후 step에서 쓸 index 파일 stub.

## Acceptance Criteria

```bash
bun install
bun run build   # 타입 에러 없음
bun lint        # 린트 에러 없음
bun test        # smoke test 통과
```

## 검증 절차

1. 위 AC 커맨드 모두 에러 없이 통과.
2. 아키텍처 체크리스트:
   - `next.config.ts`에 `typedRoutes`, 알라딘 `remotePatterns`, 보안 헤더가 있는가?
   - `tsconfig.json`에 `@/` 경로 alias가 있는가?
   - `globals.css`에 CSS 변수 토큰이 있는가?
   - `global-error.tsx`가 존재하는가?
   - `vitest.setup.ts`와 smoke 테스트가 준비됐는가?
3. `phases/0-mvp/index.json`의 step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "Next.js 15 + Bun + TS strict + Tailwind v4 + Vitest + @/ alias + 보안 헤더 + CSS 변수 토큰 기반 스캐폴딩 완료"`
   - 실패(3회 재시도 후) → `"status": "error"`, `"error_message": "..."`

## 금지사항

- 레포 루트가 아닌 서브폴더에 `create-next-app`을 돌리지 마라.
- 상태 관리 라이브러리(Zustand/Redux/Jotai 등)를 추가하지 마라.
- `rounded-*`, `backdrop-blur`, gradient 유틸을 globals.css나 샘플 컴포넌트에 쓰지 마라.
- 실제 Galmuri11 폰트 파일을 임의 URL에서 다운로드하지 마라.
- 기존 테스트를 깨뜨리지 마라.
