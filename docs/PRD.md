# PRD: 도트 북 다이어리

## 0. 한 줄 요약
읽은 책·문장·독후감을 "도트 그림체의 따뜻한 방" 메타포 위에서 기록하고 회고하는 1인용 웹앱.

## 1. 제품 원칙 (Principles)
이 네 줄과 충돌하는 결정은 거부한다.
1. **정서가 기능보다 먼저다.** 방문 이유는 "방에 다시 들어오고 싶어서"다. 실용성만 올리는 기능은 보류한다.
2. **픽셀은 흉내가 아니라 정체성이다.** 모서리·그림자·애니메이션 곡선은 픽셀 규칙에 맞춘다(→ `docs/UI_GUIDE.md`).
3. **비회원도 1등 시민.** 로그인 유도가 체험을 가로막으면 안 된다. 비회원 플로우는 회원 플로우와 동등 수준으로 돌아간다.
4. **사용자 데이터는 사용자 것.** 비회원 데이터는 서버로 몰래 올리지 않는다. 회원 데이터는 탈퇴 시 CASCADE로 지운다.

## 2. 사용자와 페르소나

### 2.1 1차 페르소나: "책을 꾸준히 읽고 기록하고 싶은 30대 직장인"
- 주 1권 정도 읽고 싶지만 회고가 약해 기록이 흩어진다.
- 인스타·노션으로 기록한 적이 있으나 "시각적 정서"가 없어 금방 그만둔다.
- 지하철·카페에서 모바일로 인용 문장 메모, 집에서 데스크톱으로 독후감 정리.
- **필요한 것**: 예쁜 회고 화면, 빠른 문장 저장, 책/날짜별 재탐색.

### 2.2 2차 페르소나: "가입 싫은 체험자"
- 친구 추천으로 방문, 가입 없이 바로 써보고 싶다.
- 써보다 마음에 들면 로그인. 로컬 데이터는 v1.1에 동기화.
- **필요한 것**: 가입 장벽 없음, 데이터 유실 가능성 고지, 나중에 회원 전환 경로.

### 2.3 비목표 사용자
- 독서 통계/랭킹을 원하는 사용자 (MVP 제외)
- 다수가 팔로우·공유하는 커뮤니티형 사용자 (MVP 제외)
- 종이책 스캔/OCR을 원하는 사용자 (MVP 제외)

## 3. 문제와 해결

### 3.1 문제
- 독서 기록 앱은 실용적이지만 정서적 만족이 없어 재방문 동기가 약하다.
- 인스타/노션은 시각적이지만 "책 단위 데이터 모델"이 없어 통합 회고가 어렵다.
- 가입 요구가 초기 체험을 가로막는다.

### 3.2 해결
- "도트 방"이라는 공간 메타포로 재방문 자체를 보상으로 만든다.
- 책·세션·문장을 관계형 데이터로 엮어 날짜/책 기준 양쪽으로 회고 가능하게 한다.
- 가입 없이 동일한 UX로 즉시 체험 + 로그인 시 기기 간 동기화.

## 4. 정보 구조 & 라우팅

### 4.1 라우트 맵
| 라우트 | 역할 | 렌더 |
|--------|------|------|
| `/` | 도트 방 메인. 5개 hitbox로 분기 | RSC + Client(RoomScene) |
| `/add-book` | 바코드 / 검색 탭 | RSC + Client(Tabs) |
| `/bookshelf` | 등록한 책 표지 그리드 | RSC(회원) / Client(비회원) 분기 |
| `/reading/[bookId]` | 독서 세션 기록 + 해당 책의 diary 링크 | RSC + Client(Form) |
| `/diary` | quote/review 리스트 + 필터 | RSC/Client |
| `/diary/new` | 작성 | Client |
| `/diary/[id]` | 상세/편집/삭제 | RSC + Client(Edit) |
| `/book-calendar` | 월간 그리드, 날짜별 표지 | Client |
| `/settings` | 닉네임, 로그인/로그아웃, v1.1 예약 토글 | Client |
| `/login` | 매직링크 + Google OAuth | Client |
| `/auth/callback` | 인증 콜백(code 교환) | Route Handler |
| `/api/books/search` | 알라딘 키워드 검색 프록시 | Route Handler |
| `/api/books/isbn` | 알라딘 ISBN 단건 프록시 | Route Handler |

### 4.2 메인 hitbox 매핑
- 다이어리(곰 왼쪽) → `/diary`
- 책더미(곰 오른쪽) → `/bookshelf`
- 창문 → `/book-calendar`
- 책더미 위 책장(우측 벽) → `/add-book`
- 곰 캐릭터 클릭 → `/settings` 설정 페이지 이동 (4-mvp-polish step 7~)
- Tab 키 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 곰(설정)

### 4.3 빠른 등록 흐름(핵심 재방문 고리)
`/` → 곰 클릭 → `/add-book` → 검색/바코드 → 추가 → `/bookshelf` → 표지 클릭 → `/reading/[id]` → 세션 기록 → "문장 기록" 버튼 → `/diary/new?bookId=…&type=quote`. 이 한 사이클이 2분 안에 돌아야 한다.

## 12. 도메인 정책 (Authoritative)

| 항목 | 결정 | 구현 위치 |
|------|------|-----------|
| 같은 사용자의 ISBN 중복 등록 | 차단(모달 + 기존 책 이동) | DB: unique index / LocalStore: `findBookByIsbn` 체크 |
| ISBN 없는 책(수기) | MVP 비노출 | — |
| 책 삭제 | `reading_sessions` CASCADE, `diary_entries.book_id` → SET NULL | SQL |
| diary body 길이 | 1~5,000자, NOT NULL, trim 후 검증 | zod + DB CHECK |
| `startPage`/`endPage` | ≥ 0, `end ≥ start`, `end ≤ totalPages`(있을 때) | zod + DB CHECK + 폼 |
| `readDate` | ≤ today(local) | zod + 폼 |
| `durationMinutes` | ≥ 0 | zod + DB CHECK |
| 바코드 ISBN-10 | 내부에서 13 변환 | `lib/isbn.ts` |
| 표지 이미지 | 알라딘 URL 직접 링크 | DB `cover_url` |
| 매직링크 만료 | Supabase 기본(10분) | Auth |
| 세션 refresh | `middleware.ts` 자동 | `@supabase/ssr` |
| 비회원 로컬 데이터 → 로그인 후 | 보존·숨김(v1.1 동기화) | `dbd:preferences.localArchived` |
| 알라딘 응답 캐시 | 동일 쿼리 60초 | Next fetch cache |
| 알라딘 타임아웃/재시도 | 5초 + 1회 재시도 | `AbortController` |
| 탭 간 쓰기 충돌 | last-write-wins | — |
| 닉네임 | 1~30자, trim, 중복 허용 | `profiles.nickname` / `dbd:preferences.nickname` |
| 캘린더 주 시작 요일 | 일요일 | `components/calendar` |
| 시간대 | 로컬만, `YYYY-MM-DD` 직접 포맷 | `lib/date.ts` |
| 표지 로드 실패 | 제목 이니셜 플레이스홀더 | `BookCover` |
| 이탈 보호 | `beforeunload` + 30초 autosave | `DiaryEntryForm` |
| 테마 기본값 | `'system'`, 로컬 시각 18:00~06:00은 night, 외는 day | `lib/theme.ts` |
| 테마 저장 | 회원 `profiles.theme_preference`, 비회원 `dbd:preferences.themePreference` | SQL + `preferences.ts` |
| 타이머 동시성 | 단일 활성 세션만 허용. 다른 책 진입 시 기존 정리 확인 모달 | `lib/reading-timer.ts` |
| 타이머 → 분 기록 | 정지 시 초→분 반올림하여 `durationMinutes` 프리필, 저장은 수동 | `ReadingTimer` |
| 목표 완독일 | `books.target_date` (nullable, `≥ book.createdAt`) | SQL + zod + 폼 |
| 진도 상태 라벨 | 페이지% ≥ 날짜%면 "순항", 10%p 이상 뒤지면 "밀림", 경과 후 미완이면 "지연" | `GoalProgress` |

## 14. 출시 기준 (Release Criteria)
MVP "출시"라고 부르려면 다음이 모두 참이어야 한다.
- `bun run build` 0 에러
- `bun lint` 0 에러
- `bun test` 전체 통과 + §15의 핵심 플로우 테스트 포함
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 (로컬 프로덕션 빌드 기준)
- 수동 플로우 통과: 비회원 → 책 등록 → 세션 기록 → 문장 저장 → 캘린더 확인 → 로그인 → 회원 플로우 동일 동작
- CLAUDE.md CRITICAL 3개 준수(외부 API 라우트 핸들러, RLS, 비회원 업로드 없음)
- UI_GUIDE 금지 사항 grep 0건: `rounded-`, `backdrop-blur`, `bg-gradient`, `indigo`, `purple`
- `.env.example` 최신, `.env.local` 미커밋

## 16. 디자인 요약
- **도트 그림체 일관성**: 정적 PNG 스프라이트 레이어 합성(ADR-005). `image-rendering: pixelated`.
- **폰트**: Galmuri11(OFL) 셀프호스팅. `font-display: swap`, fallback `monospace`.
- **색상**: 야간 전용(MVP). 배경 `#2a1f17`, 포인트 `#e89b5e`.
- **금지**: `rounded-*`, `backdrop-filter`, `gradient`, `box-shadow` blur, 보라/인디고 색.
- **Reduced motion**: `prefers-reduced-motion: reduce` 시 idle 정지.
- 자세한 규칙은 `docs/UI_GUIDE.md`.

## 17. 용어집 (Glossary)
| 용어 | 뜻 |
|------|----|
| 도트 방 | 메인(`/`)의 픽셀 아트 방 씬 |
| hitbox | 방 스프라이트 위의 투명 `<button>` 오버레이 |
| 세션 | `reading_sessions` 1건. 특정 책의 한 차례 독서 기록 |
| 엔트리 | `diary_entries` 1건. quote 또는 review |
| LocalStore | 비회원용 IndexedDB Store 구현 |
| RemoteStore | 회원용 Supabase Store 구현 |
| BookSearchResult | 알라딘 응답을 앱 도메인으로 정규화한 타입 |
| `localArchived` | 로그인 후 로컬 데이터를 UI에서 숨기는 플래그 |
| TTB | 알라딘 Open API 키(Things To Buy) |
| 주간/야간 테마 | 배경이 크림/어두움. MVP는 야간 고정 |

---
> 세부 내용(기능·스토리·온보딩·에러표 등)은 `docs/details/prd-features.md` 참조.