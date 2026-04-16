# 도트 북 다이어리

따뜻한 도트 그림체의 "방"을 메타포로 한 개인 독서 기록 웹앱.  
회원은 Supabase에 저장, 비회원은 브라우저 로컬(IndexedDB)에만 저장합니다.

## 요구사항

- **Bun** ≥ 1.1 (런타임 + 패키지 매니저)
- **Node.js** ≥ 20 (Bun이 내부적으로 사용)

## Galmuri11 폰트 수동 설치

이 프로젝트는 [Galmuri11](https://github.com/quiple/galmuri) 픽셀 폰트를 사용합니다.  
라이선스 문제로 폰트 파일은 저장소에 포함되지 않습니다.

1. [Galmuri 릴리즈 페이지](https://github.com/quiple/galmuri/releases)에서 최신 릴리즈를 다운로드합니다.
2. 아카이브에서 `Galmuri11-Regular.woff2` 파일을 꺼냅니다.
3. 꺼낸 파일을 `public/fonts/galmuri/Galmuri11-Regular.woff2` 경로에 복사합니다.

> 폰트가 없어도 앱은 동작하지만, `monospace` 폴백 폰트로 표시됩니다.

## 시작하기

```bash
# 1. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 필요한 값 입력

# 2. 패키지 설치
bun install

# 3. 개발 서버 실행
bun dev
# http://localhost:3000 접속
```

## 명령어

| 명령어 | 설명 |
|---|---|
| `bun dev` | 개발 서버 실행 (http://localhost:3000) |
| `bun build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 실행 |
| `bun lint` | ESLint 실행 |
| `bun test` | Vitest 테스트 실행 |
| `bun db:migrate` | Supabase 스키마 배포 (`supabase db push --linked`) |
| `bun db:types` | Supabase TypeScript 타입 생성 |

## 기술 스택

- **Next.js 15** (App Router, Server Components 기본)
- **TypeScript** strict mode
- **Tailwind CSS v4**
- **Bun** (런타임 / 패키지 매니저)
- **Supabase** (Auth + Postgres + Storage, RLS)
- **Vitest** + **@testing-library/react**