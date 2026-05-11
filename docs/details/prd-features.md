<!-- execute.py 자동 주입 대상 아님. step.md "읽어야 할 파일"에 명시적으로 추가할 것. -->

## 5. 핵심 기능 (Features)
각 기능의 목적·최소 동작·MVP 비포함 항목만 요약한다. 구체 행동은 §7 사용자 스토리에서 수락 기준으로 고정한다.

| # | 기능 | 목적 | MVP 최소 | MVP 비포함 |
|---|------|------|----------|-------------|
| F1 | 도트 방 메인 | 정서적 재방문 보상 | 5개 hitbox 렌더·이동, 곰 idle 애니메이션, 낮/밤 테마 전환, 곰 상태 반응(독서 패턴 기반 variant 교체), 곰 상태 말풍선(K.K. 스타일: 닉네임 헤더 + 곰 상태 본문), hitbox 클릭 어포던스(1px dashed outline + 우상단 점), 마지막 독서 경과(하단 LastReadNote), 야간 램프 on/off 토글(localStorage 유지), 닉네임 폴백 `'책곰이'` | 다수 방 전환, 시즌 테마, 커스텀 테마 에디터 |
| F2 | 책 등록 | 내 책장 구축 | 바코드/검색 탭, 알라딘 프록시 | 수기 등록, CSV 임포트 |
| F3 | 책장 | 시각적 책 탐색 | 표지 그리드, 빈 상태, 목표 진행률 뱃지 | 태그·정렬 필터, 폴더 |
| F4 | 독서 세션 | 날짜·페이지 진행 기록 + 목표 관리 | 날짜/페이지/분, 타이머, 목표 완독일 진행률, diary 링크 | 목표 알림, 통계 대시보드 |
| F5 | 다이어리 | 문장·독후감 저장·회고 | 타입 탭, 리스트, 편집/삭제, 책장에서 "일기 쓰기" CTA(`/diary/new?bookId=...`), 일기 폼 내 책 picker, 일기 목록/상세에 연결 책 제목 표시 | 마크다운, 태그 |
| F6 | 책 캘린더 | 시간 기반 회고 | 월 그리드, 날짜별 표지 | 연 단위, 주간 히트맵 |
| F7 | 설정 | 기본 메타 관리 | 닉네임, 로그아웃 | 테마 에디터, export |
| F8 | 로그인 | 기기 간 동기화 | 이메일+비밀번호, 이메일 확인 메일 | SSO |

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

### US-5. 회원 가입 및 로그인
- 가입: `/signup`에서 이메일/비밀번호/닉네임 입력 → 확인 메일 발송 안내.
- 확인: 메일 링크 클릭 → `/auth/callback` → 세션 수립 → `/`로 이동.
- 로그인: `/login`에서 이메일+비밀번호 입력 → 세션 수립 → `/`로 이동.
- LocalStore 처리:
  - 삭제하지 않음.
  - `dbd:preferences.localArchived = true` 플래그를 설정해 UI에 표시하지 않음.
  - 서버로 업로드하지 않음.
- `/settings`에 "로컬 데이터를 계정으로 동기화" 토글은 **disabled + tooltip "v1.1에서 제공"**.
- 오류:
  - 이메일 또는 비밀번호 불일치 → "이메일 또는 비밀번호가 일치하지 않아요"
  - 미확인 계정 로그인 → "메일을 확인해 주세요. 확인 메일을 다시 받으려면 [여기]를 클릭하세요"
  - 이미 가입된 이메일 → "이미 가입된 이메일이에요"
  - 비밀번호 8자 미만 → "비밀번호는 8자 이상이어야 해요"
  - 콜백 code 없음/만료 → `/login?error=link_expired`
  - profile upsert 실패 → `/login?error=profile_setup_failed`

### US-7. 로그아웃
- 성공: `/settings`에서 [로그아웃] → `supabase.auth.signOut()` → `router.refresh()` → 비회원 모드로 복귀하되 `localArchived` 플래그는 유지(로컬 데이터 재노출 안 함).

### US-8. 설정에서 닉네임 편집 (회원)
- 성공: 입력 → 저장 → `profiles.nickname` 업데이트 → 성공 토스트.
- 검증: 1~30자, 앞뒤 공백 제거, 중복 허용(unique 아님).
- 비회원: 닉네임은 `dbd:preferences.nickname`에 저장(로컬).

## 8. 온보딩 & 빈 상태 & 카피

### 8.1 첫 방문 온보딩
- 방문 시 방 상단에 배너 1회 (GuestBanner):
  - 비회원에게만 노출.
  - 카피: "이 방은 당신의 거예요. 로그인하면 어떤 기기에서도 책장을 꺼낼 수 있어요."
  - 닫기 버튼 → `dbd:preferences.guestBannerDismissed = true`.
- 홈 hitbox 진입점 안내 모달 1회 (HomeGuide):
  - 회원·비회원 모두에게 최초 방문 시 1회 노출.
  - 5개 hitbox(다이어리/책장/캘린더/책 등록/설정)의 이름과 이동 경로를 리스트로 안내.
  - 닫기 버튼("방을 둘러볼게요") → `dbd:preferences.homeGuideDismissed = true`.
  - IndexedDB에만 저장. 서버 전송 없음. 기기별 독립 1회 노출.
- 그 외 일반 툴팁, 코치마크, 추가 온보딩 단계는 여전히 금지(원칙 1 유지).

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
- **닉네임 기본값**: 미설정·빈값 시 `'책곰이'`로 대체한다. `getDisplayNickname()` 단일 헬퍼로 일원화.

## 9. 설정 페이지 스펙 (`/settings`)

| 섹션 | 항목 | 동작 | 회원/비회원 |
|------|------|------|-------------|
| 계정 | 로그인 상태 표시 | 이메일 또는 "비회원" | 둘 다 |
| 계정 | [로그인] 버튼 | `/login` 이동 | 비회원만 |
| 계정 | [회원가입] 버튼 | `/signup` 이동 | 비회원만 |
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

## 15. 성공 지표 (목표)
측정 인프라는 v1.1. MVP는 목표만 기록:
- 가입 전환: 비회원 세션 → 로그인 전환 ≥ 20%
- 재방문: 첫 책 등록 후 7일 이내 재방문 ≥ 40%
- 기능 도달: 첫 세션에서 "책 등록 → 다이어리 작성" ≥ 50%
- 품질 KPI: 상기 출시 기준을 항상 유지
