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
- 곰 → `/add-book` (메뉴 팝오버 대신 직접 이동으로 확정)
- 우상단 톱니 → `/settings`
- Tab 키 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 설정

### 4.3 빠른 등록 흐름(핵심 재방문 고리)
`/` → 곰 클릭 → `/add-book` → 검색/바코드 → 추가 → `/bookshelf` → 표지 클릭 → `/reading/[id]` → 세션 기록 → "문장 기록" 버튼 → `/diary/new?bookId=…&type=quote`. 이 한 사이클이 2분 안에 돌아야 한다.

## 5. 핵심 기능 (Features)
각 기능의 목적·최소 동작·MVP 비포함 항목만 요약한다. 구체 행동은 §7 사용자 스토리에서 수락 기준으로 고정한다.

| # | 기능 | 목적 | MVP 최소 | MVP 비포함 |
|---|------|------|----------|-------------|
| F1 | 도트 방 메인 | 정서적 재방문 보상 | 5개 hitbox 렌더·이동, 곰 idle 애니메이션, 낮/밤 테마 전환, 곰 상태 반응(독서 패턴 기반 variant 교체), 메인 letterbox HUD(곰 상태·마지막 독서 경과), 야간 램프 on/off 토글(localStorage 유지) | 다수 방 전환, 시즌 테마, 커스텀 테마 에디터 |
| F2 | 책 등록 | 내 책장 구축 | 바코드/검색 탭, 알라딘 프록시 | 수기 등록, CSV 임포트 |
| F3 | 책장 | 시각적 책 탐색 | 표지 그리드, 빈 상태, 목표 진행률 뱃지 | 태그·정렬 필터, 폴더 |
| F4 | 독서 세션 | 날짜·페이지 진행 기록 + 목표 관리 | 날짜/페이지/분, 타이머, 목표 완독일 진행률, diary 링크 | 목표 알림, 통계 대시보드 |
| F5 | 다이어리 | 문장·독후감 저장·회고 | 타입 탭, 리스트, 편집/삭제 | 마크다운, 태그 |
| F6 | 책 캘린더 | 시간 기반 회고 | 월 그리드, 날짜별 표지 | 연 단위, 주간 히트맵 |
| F7 | 설정 | 기본 메타 관리 | 닉네임, 로그아웃 | 테마 에디터, export |
| F8 | 로그인 | 기기 간 동기화 | 매직링크, Google OAuth | 비번 로그인, SSO |

## 6. 사용자 여정 (Journeys)
대표 5개. 각 여정은 §7에서 US로 분해된다.

1. **J1 첫 방문 체험**: 비회원이 `/`에 진입 → 방을 구경 → `/add-book`에서 첫 책 등록 → 책장 확인.
2. **J2 문장 수집**: 지하철에서 모바일로 `/diary/new?type=quote` → 책 선택 → 본문 저장.
3. **J3 독후감 작성**: 집에서 `/reading/[id]`에서 세션 마감 → "독후감 작성" → `/diary/new?type=review`.
4. **J4 회고**: 주말에 `/book-calendar`를 열어 지난 달을 돌아봄 → 날짜 셀 → 해당 책 `/reading/[id]`.
5. **J5 회원 전환**: 비회원이 써본 뒤 `/login` → 매직링크 → 이후부터 RemoteStore로 기록.

## 7. 사용자 스토리 & 수락 기준

### US-1. 첫 책 등록 (비회원)
- 전제: 처음 방문, 로그인 안 함.
- 성공 경로:
  - `/add-book` 진입 시 **검색 탭**이 기본 선택.
  - 쿼리 입력 후 제출 → 결과 1건 이상 → 표지·제목·저자·출판사 렌더.
  - "내 책장에 추가" 클릭 → `LocalStore.addBook` 성공 → 토스트 "책장에 담았어요" → `/bookshelf`로 이동.
- 대안 경로:
  - 결과 0건: 빈 상태 UI + "키워드를 바꿔보세요" 메시지 + 최근 검색어 유지.
  - 같은 `(user_id or local, isbn)` 중복: 모달 "이미 등록된 책이에요" + [책 페이지로 이동] / [취소].
- 오류 경로:
  - 알라딘 5xx/타임아웃(5s): 배너 "책 정보를 가져오지 못했어요" + [다시 시도]. 검색어는 유지.
  - 네트워크 끊김: 배너 "인터넷 연결을 확인해 주세요".
  - 알라딘 rate limit 초과(429): 배너 "잠시 후 다시 시도해 주세요".
- 엣지:
  - 쿼리 공백만 → 제출 비활성.
  - 특수문자 포함 쿼리 → `encodeURIComponent` 후 프록시 호출.
  - 결과 중 `title` 필드 없는 항목은 렌더에서 제외.

### US-2. 바코드로 등록
- 전제: HTTPS(또는 localhost + `--experimental-https`), 카메라 권한 허용.
- 성공: `@zxing/browser`가 ISBN-13 디코드 → `/api/books/isbn?isbn=...` → 단건 결과 → "내 책장에 추가".
- 대안: 디코드된 값이 ISBN-10이면 내부에서 13으로 변환 후 조회.
- 오류:
  - 권한 거부 → "검색 탭에서 찾아보세요" 폴백 + 탭 자동 전환.
  - HTTPS 아님(getUserMedia 실패) → 동일 폴백 + 토스트 "HTTPS 환경이 필요해요".
  - ISBN 단건 결과 없음(404) → "해당 ISBN의 책 정보를 찾지 못했어요" + 검색 탭으로 전환 제안.
- 엣지:
  - 연속 디코드 중복 호출: 1초 쓰로틀.
  - unmount 시 카메라 스트림 `stop()` 호출(자원 누수 방지).

### US-3. 독서 세션 기록
- 성공: `/reading/[bookId]` 진입 → 오늘 날짜 기본 → `startPage`, `endPage`, `durationMinutes` 입력 → 저장 → 리스트 상단 추가.
- 검증 실패(인라인 에러, 저장 차단):
  - `startPage < 0`
  - `endPage < startPage`
  - `totalPages`가 있고 `endPage > totalPages`
  - `readDate > today(local)`
  - `durationMinutes < 0`
- 삭제: 각 세션 행의 [삭제] → confirm 모달 → `deleteReadingSession`.
- 엣지:
  - `startPage`/`endPage`/`durationMinutes` 전부 빈 값 허용(세션만 기록, 페이지/시간은 선택).
  - 동일 일자 복수 세션 허용.
- 책 삭제:
  - 위치: `/reading/[bookId]` 상단 책 메타 영역의 [책 삭제].
  - 동작: confirm "이 책을 책장에서 삭제할까요? 관련 독서 세션도 함께 삭제돼요."
  - 성공 후: `/bookshelf`로 이동.

### US-4. 문장/독후감 작성
- 성공: `/diary/new?type=quote&bookId=...` → `body` 입력 → 저장 → `/diary`.
- 검증:
  - `body.trim().length ≥ 1`, 최대 5,000자.
  - `entryType ∈ {'quote','review'}`.
- 이탈 보호(둘 다 구현):
  - `beforeunload`로 경고.
  - 30초 간격 autosave → `dbd:diary_draft:{entryId|new}` (비회원도 동일).
  - 저장 성공 또는 삭제 성공 시 해당 draft를 즉시 제거.
- 렌더 안전:
  - 본문은 HTML 이스케이프 + `white-space: pre-wrap`으로 줄바꿈 보존.
  - 링크 자동 변환 없음(MVP).
- 편집/삭제:
  - `/diary/[id]`에서 편집 모드 토글 → 저장 시 `updateDiaryEntry`.
  - 삭제는 confirm 후 `deleteDiaryEntry` → `/diary`로 복귀.

### US-5. 캘린더 회고
- 성공: `/book-calendar` → 이번 달 기본, `?year=YYYY&month=MM` 지원.
- 셀: 해당 날짜의 `reading_sessions`에서 참조된 책 표지 최대 3개 + `+N`.
- 클릭: 첫 책 `/reading/[id]`로 이동(간단). 드로어는 v1.1.
- 엣지:
  - 월의 첫 주가 월요일 시작(한국 관례와 달라 보일 수 있으나 MVP는 **일요일 시작**으로 확정. 이전 계획에 남아 있던 월요일 시작안은 폐기한다).
  - 시간대: 기록은 저장 당시 로컬 `YYYY-MM-DD` 그대로 비교. UTC 변환 없음.

### US-6. 회원 전환 (비회원 → 로그인)
- 성공: `/login`에서 매직링크 또는 Google → `/auth/callback`에서 세션 수립 → `/`로 복귀.
- LocalStore 처리:
  - 삭제하지 않음.
  - `dbd:preferences.localArchived = true` 플래그를 설정해 UI에 표시하지 않음.
  - 서버로 업로드하지 않음.
- `/settings`에 "로컬 데이터를 계정으로 동기화" 토글은 **disabled + tooltip "v1.1에서 제공"**.
- 오류:
  - 매직링크 만료/재사용 → `/login?error=link_expired` 에러 카드.
  - OAuth provider 실패/콜백 에러 → `/login?error=oauth_failed`.
  - 세션 수립은 됐으나 프로필 생성 트리거 실패 → `/login?error=profile_setup_failed` + 재시도.

### US-7. 로그아웃
- 성공: `/settings`에서 [로그아웃] → `supabase.auth.signOut()` → `router.refresh()` → 비회원 모드로 복귀하되 `localArchived` 플래그는 유지(로컬 데이터 재노출 안 함).

### US-8. 설정에서 닉네임 편집 (회원)
- 성공: 입력 → 저장 → `profiles.nickname` 업데이트 → 성공 토스트.
- 검증: 1~30자, 앞뒤 공백 제거, 중복 허용(unique 아님).
- 비회원: 닉네임은 `dbd:preferences.nickname`에 저장(로컬).

## 8. 온보딩 & 빈 상태 & 카피

### 8.1 첫 방문 온보딩
- 방문 시 방 상단에 배너 1회:
  - 카피: "이 방은 당신의 거예요. 책을 담고 문장을 남겨 보세요. 로그인하면 어디서든 이어갈 수 있어요."
  - 닫기 버튼 → `dbd:preferences.guestBannerDismissed = true`.
- 튜토리얼 툴팁 없음(원칙 1: 정서 우선, 과도한 가이드 금지).

### 8.2 빈 상태 카피
| 위치 | 상태 | 카피 | CTA |
|------|------|------|-----|
| `/bookshelf` | 0권 | "아직 책장이 비어 있어요" | [책 등록하기] → `/add-book` |
| `/diary` | 0건 | "남긴 문장이 아직 없어요" | [문장 남기기] → `/diary/new?type=quote` |
| `/book-calendar` | 이번 달 세션 0건 | 비어 있어도 격자는 그대로 렌더 + 하단 안내 "이번 달은 아직 조용해요" | 없음 |
| `/reading/[id]` | 해당 책 세션 0건 | "이 책과 함께한 시간이 아직 없어요" | 없음 |
| `/add-book` 검색 결과 0건 | — | "검색 결과가 없어요. 키워드를 바꿔 볼까요?" | 없음 |

### 8.3 카피 톤
- 1인칭 단수 반말체 사용 안 함. "~요", "~어요" 존댓말 유지.
- 마케팅 수식어 금지("최고의", "가장", "완벽한").
- 이모지 금지. 특수문자는 · 와 — 만 허용.
- 에러 문구는 원인보다 **사용자 다음 행동**을 제시한다 ("다시 시도" > "서버 오류").

## 9. 설정 페이지 스펙 (`/settings`)

| 섹션 | 항목 | 동작 | 회원/비회원 |
|------|------|------|-------------|
| 계정 | 로그인 상태 표시 | 이메일 또는 "비회원" | 둘 다 |
| 계정 | [로그인] 버튼 | `/login` 이동 | 비회원만 |
| 계정 | [로그아웃] 버튼 | `signOut` + refresh | 회원만 |
| 프로필 | 닉네임 입력 | 1~30자, 저장 | 회원 → `profiles`, 비회원 → `dbd:preferences.nickname` |
| 동기화 | 로컬 데이터를 계정으로 동기화 | disabled + tooltip "v1.1에서 제공" | 회원만(비활성), 비회원은 hidden |
| 정보 | 버전, 라이선스(OFL 고지), 피드백 링크(없으면 생략) | 정적 텍스트 | 둘 다 |

이 외 항목(테마, 알림, 언어)은 MVP 비노출.

## 10. MVP 범위 / 비포함 / v1.1 예정

### 10.1 포함 (In Scope)
§5의 F1~F8 최소 동작.

### 10.2 비포함 (Out of Scope, 영구 또는 유보)
- 소셜(공유/팔로우/피드)
- 통계/그래프 대시보드
- 푸시 알림
- 다국어 (한국어만)
- 커스텀 테마 에디터 (MVP1은 낮/밤 토글까지만, 에디터는 비포함)
- 마크다운 에디터
- CSV/JSON 임포트
- 종이책 OCR

### 10.3 v1.1 예정
- 비회원 → 회원 로컬 데이터 동기화 (명시 동의 UI)
- 데이터 내보내기 (JSON export)
- 회원 탈퇴 UI (MVP는 Supabase 대시보드 수동)
- 캘린더 드로어(날짜 셀 클릭 시 세션 요약)

### 10.4 MVP1 추가 범위 (phases/1-mvp)
MVP(0-mvp) 릴리스 이후 정서적/기능적 갭을 메우기 위한 확장:
- F1: 낮/밤 테마 전환(system/day/night 3택, 18:00~06:00 자동) — ADR-018
- F1: 곰 idle 애니메이션 실제 구현(CSS `@keyframes`, 2s steps 호흡)
- F4: 독서 타이머(시작/일시정지/정지, localStorage 지속, 단일 세션) — ADR-019
- F4: 책 목표 완독일(`books.target_date`) + 진행률 막대 — ADR-020

### 10.5 MVP2 추가 범위 (phases/2-mvp)
MVP1(1-mvp) 릴리스 이후 "방이 살아있다"는 정서를 강화하기 위한 확장:
- F1: 곰 상태 반응 — 마지막 독서 경과 시간에 따라 곰 스프라이트 variant 교체 — ADR-021
  - 경과 < 1시간: 기본 `Bear.png`
  - 1시간 ≤ 경과 < 7일: `Bear_drinking / eating / healing / playing / working` 중 랜덤 1택 (날짜+lastReadAt 해시 시드, 하루 단위 고정)
  - 경과 ≥ 7일 또는 독서 기록 없음: `Bear_sleeping.png`
- F1: letterbox HUD — 상단 여백에 곰 상태 라벨, 하단 여백에 "마지막 독서: N일 전" — ADR-022
- 기준 데이터: `reading_sessions.created_at` (시각 해상도 기반, UTC ISO)
- 회원: SSR에서 Supabase 쿼리. 비회원: 클라이언트 마운트 시 LocalStore 조회(ThemeHydrator 패턴)

### 10.6 MVP3 추가 범위 (phases/3-mvp)
MVP2(2-mvp) 릴리스 이후 "나의 방"이라는 정서적 소유감을 강화하기 위한 확장:
- F1: 야간 램프 on/off 토글 — 밤 테마에서 램프 클릭 시 on/off 교체. off 상태에서는 `Background_off.png`, `Table_Lamp_off.png`로 스프라이트 교체 및 `lamp-flicker` 애니메이션 정지. 상태는 `localStorage` (`dbd:lamp_state`) 에 저장하여 재방문 시 복원 — ADR-023

### 10.7 피처 플래그
- `NEXT_PUBLIC_FF_SYNC_GUEST_DATA` (기본 `false`) — v1.1 동기화 토글 활성화 제어.

## 11. 비기능 요구사항 (NFR)

### 11.1 성능
- 초기 로드 LCP ≤ 2.5s (로컬 Fast 3G throttling 기준)
- 메인 방 스프라이트 합계 ≤ 200KB
- Galmuri11 woff2 ≤ 500KB (KS X 1001 서브셋)
- `/_next/static` 첫 JS ≤ 250KB gzipped
- Lighthouse Performance ≥ 90

### 11.2 접근성 (WCAG 2.1 AA)
- 모든 인터랙티브 요소는 `<button>`/`<a>` + `aria-label` + 키보드 Tab/Enter/Space 탐색.
- 텍스트/배경 대비비 ≥ 4.5:1, 보조 텍스트 ≥ 3:1.
- `prefers-reduced-motion: reduce` 시 곰/램프 애니메이션 정지.
- 방 전체 장식은 `role="img" aria-label="곰이 책을 읽는 따뜻한 방"`, 개별 hitbox는 별도 `aria-label`.
- Lighthouse Accessibility ≥ 95.
- 스크린리더에서 메인 방의 Tab 순서가 명확(§4.2).

### 11.3 개인정보·데이터 보존
- 회원 탈퇴 시(Supabase `auth.users` 삭제) `profiles`, `books`, `reading_sessions`, `diary_entries` 모두 `ON DELETE CASCADE`.
- 비회원 데이터 유실 가능성(브라우저 삭제, iOS Safari ITP 7일 eviction, Private 모드)을 §8.1 배너로 고지.
- 서버에 저장되는 정보: 이메일(Supabase), 닉네임(선택), 독서 기록. 제3자 분석/광고 SDK 미사용.

### 11.4 지원 환경
- Chrome 120+, Safari 17+, Firefox 120+, Edge 120+
- iOS Safari 17+ (바코드 스캔은 HTTPS + 카메라 권한)
- 모바일 최소 폭 320px
- 필수 API: IndexedDB, `crypto.randomUUID`, `AbortController`, `fetch`. 미지원 시 차단 페이지.

### 11.5 오프라인
- 회원: 네트워크 끊김 시 Server Component 초기 렌더 캐시만 표시. 쓰기는 차단 + 토스트.
- 비회원: 완전 오프라인(IndexedDB).

### 11.6 보안
- RLS 전 테이블 적용(CLAUDE.md CRITICAL).
- 외부 API(알라딘) 호출은 서버 라우트 핸들러만.
- 사용자 입력은 서버 경계에서 zod로 검증(ADR-008).
- **보안 키 정책**:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 사용하여 RLS(Row Level Security)를 강제한다.
  - `SUPABASE_SERVICE_ROLE_KEY`(Secret Key)는 RLS를 우회하므로 절대 클라이언트에 노출하지 않으며(접두사 금지), 일반 앱 로직에서 참조하지 않는다.
- OAuth 리다이렉트는 `request.nextUrl.origin` 또는 `NEXT_PUBLIC_APP_URL` 환경변수.
- 쿠키: HttpOnly, Secure, SameSite=Lax (Supabase SSR 기본).
- CSP 기본값(ARCHITECTURE §20).

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

## 13. 에러·엣지케이스 처리 표 (UI 매핑)

| 카테고리 | 상황 | UI |
|----------|------|----|
| 상류 실패 | 알라딘 5xx/타임아웃 | 토스트 "책 정보를 가져오지 못했어요" + 재시도 |
| 상류 실패 | 알라딘 rate limit | 토스트 "잠시 후 다시 시도해 주세요" |
| 상류 실패 | 응답 필수 필드 누락 | 해당 항목 결과에서 제외, 나머지 표시 |
| 입력 | 결과 0건 | 빈 상태 + 재입력 유도 |
| 입력 | 검증 실패 | 인라인 필드 에러 + 저장 차단 |
| 입력 | 이탈 시도 | `beforeunload` 경고 + 마지막 draft 자동 저장 유지 |
| 디바이스 | 카메라 권한 거부 | 검색 탭 폴백 + 토스트 |
| 디바이스 | HTTPS 아님 | 검색 탭 폴백 + 토스트 |
| 디바이스 | IndexedDB 미지원 | 차단 페이지 |
| 디바이스 | 쿼터 초과 | 토스트 + 정리 안내 |
| 세션 | 세션 만료 | `/login?reason=expired` |
| 세션 | OAuth 실패 | `/login?error=oauth_failed` |
| 세션 | 매직링크 만료 | `/login?error=link_expired` |
| 세션 | 프로필 트리거 실패 | `/login?error=profile_setup_failed` |
| 도메인 | 중복 ISBN | 모달 [이동]/[취소] |
| 도메인 | 삭제 확인 | confirm 모달 |
| 도메인 | 존재하지 않는 엔티티 | `not-found.tsx` |
| 런타임 | Server 예외 | `error.tsx` 경계 + [다시 시도] |
| 런타임 | Client 예외 | 토스트 "문제가 생겼어요" |
| 리소스 | 표지 로드 실패 | 제목 이니셜 플레이스홀더 |
| 리소스 | Galmuri11 로드 실패 | `monospace` 폴백 유지 |
| 데이터 | 탭 간 충돌 | last-write-wins (알림 없음) |

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

## 15. 성공 지표 (목표)
측정 인프라는 v1.1. MVP는 목표만 기록:
- 가입 전환: 비회원 세션 → 로그인 전환 ≥ 20%
- 재방문: 첫 책 등록 후 7일 이내 재방문 ≥ 40%
- 기능 도달: 첫 세션에서 "책 등록 → 다이어리 작성" ≥ 50%
- 품질 KPI: 상기 출시 기준을 항상 유지

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
