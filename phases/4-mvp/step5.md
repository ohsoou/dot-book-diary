# Step 5: docs-update

## 읽어야 할 파일

아래 파일들을 먼저 읽어 현재 상태를 파악한 뒤 수정하라:

- `docs/PRD.md` — §5 F1/F5, §10.6 MVP3, §8.3 카피 톤
- `docs/ARCHITECTURE.md` — §22.6 (마지막 MVP3 섹션)
- `docs/ADR.md` — ADR-023 (마지막 ADR), ADR-016 (닉네임 관련)
- `docs/UI_GUIDE.md` — §BearStatusBar (MVP2) 섹션, §포커스 스타일
- `phases/4-mvp/step{0..4}.md` — 구현 결정 사항들 (작업 컨텍스트)

## 작업 (문서 수정만. 코드 수정 금지)

### 1. `docs/PRD.md`

**§5 핵심 기능 표 수정**:
- F1 행의 "MVP 최소" 셀에 추가:
  - "곰 상태 말풍선(K.K. 스타일, 닉네임 헤더 + 곰 상태 본문, in-canvas overlay)"
  - "hitbox 1px dashed outline + 우상단 인디케이터 점 (모바일/데스크탑 항상 표시)"
  - "닉네임 폴백 `'책벌레'` 기본값 적용"
  - 기존 "메인 letterbox HUD(곰 상태·마지막 독서 경과)" 에서 BearStatusBar 부분을 말풍선으로 교체 기술
- F5 행의 "MVP 최소" 셀에 추가:
  - "책장에서 '일기 쓰기' CTA → `/diary/new?bookId=...`"
  - "일기 폼 내 책 picker (native select, LocalStore/RemoteStore 양쪽)"
  - "일기 목록/상세에 연결된 책 제목 표시"

**§8.3 카피 톤 추가**:
```
닉네임 기본값: 미설정·빈값 시 "책벌레"로 대체한다. `getDisplayNickname()` 단일 헬퍼.
```

**§10.7 MVP4 추가 범위 신설** (§10.6 바로 아래):

```
### 10.7 MVP4 추가 범위 (phases/4-mvp)
MVP3(3-mvp) 릴리스 이후 "방이 나를 알아본다"는 정서를 강화하기 위한 확장:
- F1: 곰 상태 말풍선 (BearSpeechBubble) — 방 캔버스 안 곰 위에 K.K. 스타일 픽셀 말풍선. 헤더=닉네임, 본문=곰 상태 라벨. `BearStatusBar` 제거, 말풍선이 단독 표시. z-index 35 (sprite 25 < bubble < hitbox 50) — ADR-024
- F1: hitbox 클릭 어포던스 — 5개 hitbox에 항상 보이는 1px dashed outline(`#e89b5e`/60%) + 우상단 8px 인디케이터 점. hover/focus-visible 시 alpha 강조. 모바일·데스크탑 동일 — ADR-025
- F1/F7: 닉네임 반영 카피 — `getDisplayNickname()` 헬퍼. 폴백 `'책벌레'`. 말풍선 헤더에 적용 — ADR-026
- F5: 일기↔책 연결 UI — 책장 카드에 "일기 쓰기" CTA, 일기 폼 내 BookPicker(native select), 일기 목록/상세에 연결 책 제목 표시 (FK는 기존 존재)
```

### 2. `docs/ARCHITECTURE.md`

**§22.7 MVP4 신설** (§22.6 아래에 추가):

```
## 22.7 곰 말풍선 / 닉네임 / hitbox 어포던스 (MVP4)

### 22.7.1 닉네임 헬퍼 (`src/lib/nickname.ts`)
- `getDisplayNickname(nickname?: string | null): string` — 폴백 `'책벌레'`. null·undefined·빈값·공백 전부 폴백.
- 단일 진실원. page.tsx(회원 SSR)·BearStateHydrator(게스트)·기본값 모두 이 함수만 사용.

### 22.7.2 nickname hydration 흐름
```
회원(SSR):
  page.tsx → profiles.select('theme_preference, nickname') → getDisplayNickname(profile?.nickname)
  → BearStateContextValue.nickname → BearSpeechBubble 헤더

게스트(CSR):
  BearStateHydrator → getPreferences().nickname → getDisplayNickname(prefs.nickname)
  → setGuestState({ ..., nickname }) → BearSpeechBubble 헤더
```

### 22.7.3 BearSpeechBubble 배치
- `src/components/room/BearSpeechBubble.tsx` — `'use client'`
- RoomScene 내 absolute 배치. z-index 35. 곰 sprite 위쪽(bottom ≈ 38%, left ≈ 58%).
- `role="status" aria-live="polite" aria-atomic="true"`. label null이면 unmount.
- 헤더: nickname (`text-[#f4e4c1]`), 본문: bearLabel (`text-[#d7c199]`).
- 꼬리: 하단 CSS border trick 삼각형.
- `BearStatusBar` 제거됨. 하단 `LastReadNote`는 유지.

### 22.7.4 hitbox 어포던스
- HITBOX_DEFS 5개(`다이어리/책장/캘린더/책 등록/설정`)에만 적용.
- 버튼: `outline outline-1 outline-dashed outline-[#e89b5e]/60 hover:outline-[#e89b5e] focus-visible:outline-[#e89b5e] transition-[outline-color] duration-100`.
- 인디케이터 점: `absolute top-1 right-1 w-2 h-2 bg-[#e89b5e] border border-[#1a100a] aria-hidden`.
- 램프 전원 버튼은 제외.

### 22.7.5 일기↔책 BookPicker 데이터 흐름
- `BookPicker.tsx` (`'use client'`): `useStore().listBooks()` → native `<select>`. bookId를 state로 관리하여 form에 hidden input으로 직렬화.
- `DiaryEntryForm`: `initialBookId` → `useState(bookId)` → `BookPicker`로 제어. autosave draft에 반영.
- `DiaryList` / `DiaryEntryDetail`: 선택적 `books?: Book[]` prop으로 책 제목 표시.
- 책장 카드(`BookGrid`): "일기 쓰기" 링크 → `/diary/new?bookId={id}`.
```

### 3. `docs/ADR.md`

ADR-023 다음에 세 ADR 추가:

**ADR-024: 곰 상태를 말풍선(in-canvas overlay)으로 표시**
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

**ADR-025: hitbox 클릭 어포던스 — 항상 보이는 1px dashed outline + 인디케이터 점**
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

**ADR-026: 닉네임 반영 카피 — getDisplayNickname() 헬퍼, 폴백 '책벌레'**
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: ADR-016에서 닉네임 저장 전략을 정했으나, UI 표시용 폴백과 말풍선 헤더 적용 방식은 미결.
- **결정**: `src/lib/nickname.ts`의 `getDisplayNickname()` 단일 헬퍼. null·빈값→`'책벌레'`. 말풍선 헤더에만 사용(본문 라벨은 닉네임 무관).
- **대안**:
  - `'독서하는 곰'` 폴백(ADR-016 언급): 말풍선 헤더에 곰 이름이 들어가면 발화 주체가 모호해짐. `'책벌레'`가 독자 정체성 표현에 더 적합.
  - bear-state.ts 라벨에 닉네임 직접 주입: 라벨 로직 복잡도↑, 순수 함수성 저해.
- **결과/제약**:
  - ADR-016의 닉네임 기본값 `'독서하는 곰'`은 설정 페이지 placeholder용으로 유지. 말풍선 표시 폴백은 `'책벌레'`(이 ADR 기준).
  - `getDisplayNickname()`은 `src/lib/` 에 위치하며 UI에 의존하지 않는다.

### 4. `docs/UI_GUIDE.md`

**§BearStatusBar 섹션 업데이트** (기존 섹션을 다음으로 교체):

```
### BearStatusBar — MVP4에서 BearSpeechBubble로 대체됨

MVP2에서 letterbox 상단에 평문 라벨로 있었으나, MVP4에서 `BearSpeechBubble`로 교체됨. 파일 삭제됨.
```

**§BearSpeechBubble 신규 섹션 추가** (BearStatusBar 위치 대체):

```
### BearSpeechBubble (MVP4, `/` RoomScene 내)

위치: RoomScene 캔버스 내 absolute, z-index 35, 곰 sprite 위쪽.

박스:
  bg-[#3a2a1a] border border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-3 py-2
  헤더: text-xs text-[#f4e4c1] (닉네임, 강조)
  본문: text-xs text-[#d7c199] (곰 상태 라벨, 보조)

꼬리: 하단 중앙, 1px hard border CSS 삼각형. no rounded.

접근성: role="status" aria-live="polite" aria-atomic="true".
label null → unmount(빈 공간 없음).

금지:
  - rounded-* 금지
  - backdrop-blur 금지
  - gradient 금지
  - box-shadow glow 금지
  - z-index ≥ 50 금지 (hitbox 우선 보장)
```

**§RoomScene hitbox 어포던스 신규 섹션 추가** (포커스 스타일 섹션 바로 위 또는 아래):

```
### RoomScene Hitbox 어포던스 (MVP4)

5개 hitbox(다이어리/책장/캘린더/책 등록/설정)에 항상 표시되는 클릭 어포던스:

outline:
  outline outline-1 outline-dashed outline-[#e89b5e]/60
  hover:outline-[#e89b5e] focus-visible:outline-[#e89b5e]
  transition-[outline-color] duration-100 ease-linear

인디케이터 점 (우상단):
  absolute top-1 right-1 w-2 h-2 bg-[#e89b5e] border border-[#1a100a]
  aria-hidden="true"

금지:
  - glow / blur shadow 금지
  - transition duration > 100ms 금지
  - rounded-* 금지
  - 램프 전원 버튼에는 적용하지 않는다 (스프라이트가 시각 단서)
```

## Acceptance Criteria

```bash
bun lint
bun build
```

에러 없음 (markdown은 lint 대상 아님. 빌드에서 import 오류만 확인).

## 검증 절차

1. 4개 문서 각각 열어 위 내용이 올바른 위치에 삽입됐는지 확인.
2. ADR 번호 순서(ADR-023 → ADR-024 → ADR-025 → ADR-026) 확인.
3. `phases/4-mvp/index.json` step 5 업데이트.
4. 문서 커밋: `docs(4-mvp): step5 — docs-update`
5. 메타 커밋: `chore(4-mvp): step5 output`

## 금지사항

- 코드 파일(`src/`, `phases/`) 수정 금지. 이유: 이 step은 문서만 담당.
- ADR-023보다 이전 ADR 내용을 바꾸지 마라.
- ADR-016의 닉네임 기본값(`'독서하는 곰'`)을 수정하지 마라. 이유: 설정 페이지 placeholder 용도이며, 말풍선 폴백(ADR-026)은 별도.
