# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`

## 작업

Next.js 15 App Router 기반 프로젝트를 초기화한다. 런타임은 Bun.

1. **프로젝트 초기화** (레포 루트에 직접 생성, `my-app` 서브폴더 만들지 말 것)
   - `package.json`, `tsconfig.json` (strict mode), `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
   - `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
   - scripts: `dev`, `build`, `start`, `lint`, `test`
2. **Tailwind CSS v4** 설정 — `@tailwindcss/postcss` 플러그인 + `globals.css`의 `@import "tailwindcss";`.
3. **TypeScript strict** — `"strict": true`, `"noUncheckedIndexedAccess": true` 권장.
4. **Vitest + Testing Library** 설치 — `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`. `vitest.config.ts` 생성(`environment: 'jsdom'`).
5. **Galmuri11 폰트** — `public/fonts/galmuri/Galmuri11-Regular.woff2` 경로로 자리를 비워둔다(에셋 실제 다운로드는 수동 과제로 `README`에 명시). `globals.css`에 `@font-face`만 선언하고, `body { font-family: "Galmuri11", monospace; image-rendering: pixelated; }`.
6. **`src/app/page.tsx`** — placeholder "도트 북 다이어리" 텍스트만 렌더. 실제 도트 방은 step 4에서.
7. **`src/app/layout.tsx`** — `<html lang="ko">`, `globals.css` import.
8. **ESLint** — `next/core-web-vitals` + TypeScript.
9. **`.env.example`** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALADIN_TTB_KEY` 주석과 함께. `.gitignore`에 `.env.local` 추가.
10. **디렉토리 자리 만들기** — `src/{components,lib,types,services}/.gitkeep` 생성(빈 폴더 커밋용).
11. **smoke 테스트** — `src/app/page.test.tsx`에 "렌더 시 '도트 북 다이어리' 텍스트가 보인다" 1건.

## Acceptance Criteria

```bash
bun install
bun run build
bun test
```

## 검증 절차

1. 위 AC 커맨드 모두 에러 없이 통과.
2. 아키텍처 체크리스트:
   - ARCHITECTURE.md 디렉토리 구조(`src/app`, `src/components`, `src/lib`, `src/types`, `src/services`)가 생성됐는가?
   - ADR 기술 스택(Next.js 15, TS strict, Tailwind v4, Bun, Vitest)을 따르는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (아직 API 호출 없으므로 주로 디렉토리/설정 준수 여부)
3. `phases/0-mvp/index.json`의 step 0 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "Next.js 15 + Bun + TS strict + Tailwind v4 + Vitest 스캐폴딩 완료, Galmuri11 @font-face 자리 생성"`
   - 실패(3회 재시도 후) → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."`

## 금지사항

- 레포 루트가 아닌 서브폴더에 `create-next-app`을 돌리지 마라. 이유: phases 실행 경로와 어긋남.
- 상태 관리 라이브러리(Zustand/Redux/Jotai 등)를 추가하지 마라. 이유: ARCHITECTURE.md에서 MVP 스코프에 과한다고 명시.
- `rounded-*`, `backdrop-blur`, gradient 유틸을 globals.css나 샘플 컴포넌트에 쓰지 마라. 이유: UI_GUIDE.md 안티패턴.
- 실제 Galmuri11 폰트 파일을 임의 URL에서 다운로드하지 마라. 이유: 라이선스(OFL) 고지 및 버전 고정을 사람이 확인해야 함. 자리만 만들고 `README`에 수동 다운로드 안내 남길 것.
- 기존 테스트를 깨뜨리지 마라.
