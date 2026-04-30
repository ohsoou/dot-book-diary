# 도트 북 다이어리

따뜻한 도트 그림체의 "방"을 메타포로 한 개인 독서 기록 웹앱.  
회원은 Supabase에 저장, 비회원은 브라우저 로컬(IndexedDB)에만 저장합니다.

## 주요 기능

- 도트 픽셀 아트 방 화면 — 곰 캐릭터가 독서 습관에 따라 다른 모습으로 등장
- 책 검색 및 등록 (알라딘 Open API 연동)
- 독서 세션 기록 (읽은 날짜, 페이지, 메모)
- 인용 문장 / 독후감(diary) 작성 및 관리
- 월간 캘린더로 독서 이력 조회
- 책장 — 등록한 책 표지 그리드
- 낮/밤 테마 전환 + 야간 램프 on/off 토글
- 회원가입 없이 즉시 사용 (로컬 저장), 로그인 시 클라우드 동기화

## 화면 구성

| 라우트 | 역할 |
|---|---|
| `/` | 도트 방 메인 (곰 캐릭터 클릭 → 설정) |
| `/bookshelf` | 책장 — 등록한 책 그리드 |
| `/add-book` | 책 등록 (바코드 / 키워드 검색) |
| `/reading/[bookId]` | 독서 세션 기록 |
| `/diary` | 인용·독후감 목록 및 작성 |
| `/book-calendar` | 월간 독서 캘린더 |
| `/settings` | 닉네임, 테마, 로그인/로그아웃 |
| `/login` | 이메일+비밀번호 로그인 |
| `/signup` | 이메일+비밀번호+닉네임 회원가입 |
| `/forgot-password` | 비밀번호 재설정 메일 요청 |
| `/reset-password` | 비밀번호 재설정 |

## 요구사항

- **Bun** ≥ 1.1 (런타임 + 패키지 매니저)

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
| `bun run test` | Vitest 테스트 실행 |
| `bun db:migrate` | Supabase 스키마 배포 (`supabase db push --linked`) |
| `bun db:types` | Supabase TypeScript 타입 생성 |

## Supabase 대시보드 설정

개발 또는 배포 전 아래 설정을 Supabase 대시보드에서 1회 적용해야 합니다.

1. Authentication → Providers → Email
   - Enable Email provider: ON
   - Confirm email: **ON** (가입 후 메일 클릭 후 로그인 가능)
   - Secure email change: ON
2. Authentication → Providers → Google: **OFF** (사용 안 함)
3. Authentication → URL Configuration → Redirect URLs에 추가:
   - `http://localhost:3000/auth/callback` (개발)
   - `http://localhost:3000/reset-password` (개발)
   - `{NEXT_PUBLIC_APP_URL}/auth/callback` (프로덕션)
   - `{NEXT_PUBLIC_APP_URL}/reset-password` (프로덕션)
4. 카카오톡 OG 캐시 갱신: https://developers.kakao.com/tool/clear/og

## 기술 스택

- **Next.js 15** (App Router, Server Components 기본)
- **TypeScript** strict mode
- **Tailwind CSS v4**
- **Bun** (런타임 / 패키지 매니저)
- **Supabase** (Auth + Postgres + Storage, RLS)
- **Vitest** + **@testing-library/react**