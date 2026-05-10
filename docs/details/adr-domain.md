<!-- execute.py 자동 주입 대상 아님. step.md "읽어야 할 파일"에 명시적으로 추가할 것. -->

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

## ADR-028: 설정 진입점을 톱니바퀴 sprite에서 곰 캐릭터로 변경 (4-mvp-polish)
- **상태**: Accepted
- **날짜**: 2026-04-29
- **컨텍스트**: 4-mvp-polish step 1에서 추가한 톱니바퀴 이미지(Setting.png)가 방 화면 우상단에 위치하며 설정 진입 역할을 했으나, 시각적으로 곰 캐릭터와 분리되어 화면 위계가 산만해졌다. 곰이 메인 화면의 중심 캐릭터인 만큼, 설정 진입점을 곰에 통합해 인터랙션을 단순화한다.
- **결정**: Setting.png sprite와 해당 hitbox를 제거하고, 곰 sprite(bear)와 동일 좌표에 `aria-label="설정"` hitbox를 추가한다. 기존 `settingsHref` prop과 `/settings` 라우팅은 그대로 유지한다.
- **대안**:
  - 톱니바퀴 유지 + 곰에도 hitbox 추가: 진입점 중복으로 오히려 혼란.
  - BottomNav "설정" 탭만 사용: 탭이 이미 존재하지만 곰 인터랙션 결여로 캐릭터 존재감 약화.
- **결과/제약**:
  - Tab 순서 마지막이 곰(설정) — 키보드 사용자에게 자연스러운 흐름.
  - `bear-idle` 애니메이션이 클릭 어포던스 역할을 겸함 (`hitbox-bob` 미적용).
  - Setting.png day/night 자산 삭제. SPRITE_DEFS에서 `setting` 항목 제거.
  - ADR-025(hitbox 어포던스)의 sprite 매핑 표가 갱신됨.

## ADR-029: 이메일+비밀번호 인증 채택, 매직링크/OTP/OAuth 제거

**결정**: 로그인 방식을 이메일+비밀번호 단일 경로로 변경한다. 매직링크(OTP)와 Google OAuth는 제거한다.

**이유**: 매직링크는 로그인할 때마다 이메일 메일함을 열어 링크를 클릭해야 해서 사용자 마찰이 과도하다. 단순 개인 독서 기록 앱에 불필요한 절차다. 비밀번호 기반은 한 번 가입 후 확인 메일 1회 클릭으로 계정을 활성화하고, 이후로는 비밀번호만 사용한다.

**결과·제약**:
- `/signup` 페이지 신규 추가 (이메일 + 비밀번호 + 닉네임)
- `/forgot-password` + `/reset-password` 페이지 신규 추가
- `src/lib/actions/auth.ts` 신규 (signUpAction)
- `src/lib/validation/auth.ts` 신규 (emailSchema, passwordSchema, nicknameSchema)
- `src/components/auth/LoginForm.tsx` 재작성 (signInWithPassword 사용)
- `src/components/auth/SignupForm.tsx` 신규
- `src/app/auth/callback/route.ts` 단순화 (OAuth 분기 제거, 닉네임 저장 추가)
- Supabase 대시보드 설정 필요: "Confirm email" ON, Magic Link/Google provider OFF
- `NEXT_PUBLIC_APP_URL` 환경변수 기반 콜백 URL (기존과 동일)

## ADR-030: SNS 공유 썸네일로 Bear.png 채택

**결정**: og:image로 `public/sprites/day/Bear.png`를 사용한다.

**이유**: 앱 아이덴티티를 대표하는 이미지가 곰 캐릭터이며, 이미 day 스프라이트로 고해상도 PNG가 존재한다. 별도 1200×630 합성본 제작은 현재 스코프 밖이다.

**결과·제약**:
- `src/app/layout.tsx`의 `metadata.openGraph.images`에 절대 URL로 설정.
- `metadataBase`는 `NEXT_PUBLIC_APP_URL` 기반으로 설정.
- 이미지 비율이 1:1에 가까워 SNS 플랫폼별 크롭이 발생할 수 있음 — 허용 범위.
- 카카오톡은 OG 캐시를 가지므로 URL 변경 시 https://developers.kakao.com/tool/clear/og 에서 수동 갱신 필요.

## ADR-030: Supabase Auth 에러는 `error.code` 기반으로 분기, 메시지 매칭은 fallback

**결정**: Supabase auth가 던진 에러를 `AppErrorCode`로 변환할 때 `error.code`(공식 안정 식별자)를 1순위로 사용하고, 메시지 문자열 `.includes()`는 2순위 fallback으로만 사용한다. 변환 로직은 `src/lib/auth/error-codes.ts`의 `mapSupabaseAuthError()` 한 함수로 단일화한다.

**이유**:
- GoTrue 서버 메시지는 다듬어질 수 있어 메시지 매칭이 조용히 깨진다.
- supabase-js의 `AuthApiError`는 `code`/`status`를 항상 채워주며 공식 문서가 안정 식별자로 권장한다.
- 매퍼를 단일화하면 회원가입·로그인 양쪽이 같은 문구 정책을 따를 수 있다.

**결과·제약**:
- `src/lib/auth/error-codes.ts` 신규: `mapSupabaseAuthError(error) → { code: AppErrorCode; message: string }`.
- `signUpAction`(server)과 `LoginForm`(client) 두 곳 모두 매퍼만 호출한다. 메시지 분기 로직은 매퍼 안으로만 둔다.
- 매퍼는 `'server-only'`를 임포트하지 않는다 — client/server 양쪽에서 사용한다.
- 매핑 대상 코드: `user_already_exists`/`email_exists` → `EMAIL_TAKEN`, `weak_password` → `WEAK_PASSWORD`, `invalid_credentials` → `INVALID_CREDENTIALS`, `email_not_confirmed` → `EMAIL_NOT_CONFIRMED`. 그 외는 `UPSTREAM_FAILED`.
- 사용자 노출 문구는 PRD §7 US-5의 정의를 따른다.

## ADR-031: Book 도메인에 status/rating/finishedAt/memo 필드 추가

- **상태**: Accepted
- **날짜**: 2026-05-07
- **컨텍스트**: `Book` 타입에 독서 상태(`status`), 평점(`rating`), 완독일(`finishedAt`), 메모(`memo`) 필드가 없어 책장이 단일 덩어리로 관리된다. 책을 "읽고싶음/읽는중/완독"으로 분류하고 완독 후 평가를 남기는 것은 독서 앱의 기본 기능이다.
- **결정**: `Book.status: 'want' | 'reading' | 'finished'`(default `'reading'`), `rating?: 1-5 정수`, `finishedAt?: string`(YYYY-MM-DD), `memo?: string`(최대 500자) 추가.
- **대안**:
  - `BookStatus` 테이블 분리: 1:1 관계에 테이블 추가 비용 > 이득. `Book` 컬럼 확장으로 충분.
  - `rating`을 `reading_sessions`에 붙이기: 세션별 평점은 설계 복잡도↑. 책 단위 평점이 사용자 의도에 맞음.
- **결과·제약**:
  - `BookSearchResult`(알라딘 검색 결과)에는 추가하지 않음 — 검색 결과는 status/rating 미보유.
  - LocalStore schema v2로 마이그레이션. 기존 책은 `status: 'reading'`으로 채움.
  - Supabase ALTER TABLE은 `supabase/migrations/{timestamp}_book_status_rating.sql`로 작성. `bun db:migrate`는 사용자가 수동 실행.
  - `finishedAt`은 YYYY-MM-DD 형식, `status === 'finished'`일 때 의미있음(강제 연동은 하지 않음, UI 단에서 자동 설정).

## ADR-032: 홈 hitbox 진입점 1회 온보딩 모달 도입

- **상태**: Accepted
- **날짜**: 2026-05-08
- **컨텍스트**: 홈 화면의 5개 hitbox(다이어리/책장/캘린더/책 등록/설정)는 시각적 어포던스(`hitbox-bob` 모션)만 있어 첫 방문자가 어디로 이동하는지 직관적으로 알기 어렵다. PRD §8.1은 "튜토리얼 툴팁 없음"을 원칙으로 정했으나, 이는 과도한 코치마크 남용을 막기 위한 규정이었지 최소한의 진입점 안내까지 금지한 의도는 아니었다.
- **결정**: 5개 hitbox 진입점에 한해, 첫 방문 시 1회 전체 모달(`HomeGuide`)로 안내한다. 닫힌 이후 `dbd:preferences.homeGuideDismissed=true`로 IndexedDB에 저장하여 재노출하지 않는다. 회원·비회원 모두 동일 IndexedDB 키로 통제한다(기기별 독립 1회 노출).
- **역할 분리**:
  - `GuestBanner`: 비회원 대상 정서 메시지("이 방은 당신의 거예요") + 로그인 유도.
  - `HomeGuide`: 회원·비회원 공통, 기능 진입점(hitbox → 경로) 안내.
- **대안**:
  - 핀포인트 오버레이(hitbox 위에 직접 라벨): RoomScene 좌표와 실시간 동기화 비용↑, 반응형에서 좌표 어긋남 위험.
  - 코치마크(순서대로 하나씩 강조): 구현 복잡도↑, 픽셀 정서 훼손.
  - 상시 노출 도움말 버튼: 핵심 원칙(정서가 기능보다 먼저)과 충돌.
- **결과/제약**:
  - `GuestPreferences` 타입에 `homeGuideDismissed?: boolean` 1필드 추가.
  - IndexedDB(`dbd:preferences`)에서만 관리. RLS·Supabase와 무관.
  - 비회원이 로그인해도 이미 dismissed면 재노출하지 않음(기기별 경험 독립, v1.1 동기화 범위 외).
  - PRD §8.1의 "그 외 툴팁/코치마크 금지" 원칙은 유지한다.