# Step 0: docs-split

## 읽어야 할 파일

먼저 아래 파일들을 전부 읽고 내용을 파악하라:

- `CLAUDE.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_GUIDE.md`
- `docs/ADR.md`
- `src/lib/storage/Store.ts` — Store 인터페이스 현행 메서드 확인
- `src/types/index.ts` — Book 타입 현행 필드 확인
- `supabase/migrations/20260507000000_book_status_rating.sql` — ADR-031 실제 컬럼명 확인

## 배경

`execute.py`는 `docs/*.md` 전체를 매 step 프롬프트에 자동 주입한다. 현재 4개 파일 합계 2,561줄로, step과 무관한 내용(feature 구현 세부사항·데이터 모델·컴포넌트 사양)까지 항상 로드된다. 핵심 내용만 `docs/`에 남기고 세부 내용은 `docs/details/`(자동 주입 안 됨)로 분리해 corpus를 ~1,250줄로 축소한다.

## 작업

### 1. `docs/details/` 디렉토리 생성 + 5개 파일 생성

아래 내용을 해당 `docs/` 파일에서 **잘라내어** 각 details 파일로 이동한다. 원본 파일에서 해당 섹션을 삭제하고 details 파일에 붙여넣는다.

#### `docs/details/prd-features.md` (PRD.md에서 이동)
PRD.md의 아래 섹션을 통째로 이동:
- §5 핵심 기능 (Features)
- §6 사용자 여정 (Journeys)
- §7 사용자 스토리 & 수락 기준
- §8 온보딩 & 빈 상태 & 카피
- §9 설정 페이지 스펙
- §10 MVP 범위 / 비포함 / v1.1 예정
- §11 비기능 요구사항 (NFR)
- §13 에러·엣지케이스 처리 표
- §15 성공 지표

PRD.md에 **유지할 섹션**: §0 한 줄 요약, §1 제품 원칙, §2 사용자와 페르소나, §3 문제와 해결, §4 정보 구조 & 라우팅, §12 도메인 정책, §14 출시 기준, §16 디자인 요약, §17 용어집

#### `docs/details/arch-data-model.md` (ARCHITECTURE.md에서 이동)
ARCHITECTURE.md의 아래 섹션을 통째로 이동:
- §9 데이터 모델 (Postgres, RLS on)
- §10 Store 인터페이스
- §10.1 Guest preferences / draft 인터페이스

**이동하면서 동시에 아래 GAP을 수정한다 (현행 코드와 불일치):**

§9 `books` 테이블 SQL에 아래 컬럼 추가 — `supabase/migrations/20260507000000_book_status_rating.sql` 에서 실제 컬럼명 확인 후 반영:
- `status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('want', 'reading', 'finished'))`
- `rating SMALLINT CHECK (rating BETWEEN 1 AND 5)`
- `finished_at DATE`
- `memo TEXT CHECK (char_length(memo) <= 500)`

§10 Store 인터페이스에 아래 메서드 추가 — `src/lib/storage/Store.ts` 에서 실제 시그니처 확인 후 반영:
- `getReadingStats`
- `getReadingStreak`
- `listSessionsGroupedByDate`
- `searchDiaryEntries`
- `countBooks`

#### `docs/details/arch-feature-impls.md` (ARCHITECTURE.md에서 이동)
ARCHITECTURE.md의 아래 섹션을 통째로 이동:
- §22.1 독서 타이머 지속성 (`lib/reading-timer.ts`)
- §22.2 테마 결정 (`lib/theme.ts`)
- §22.3 책 목표 진행률
- §22.4 곰 상태 파생 (`lib/bear-state.ts`)
- §22.5 Letterbox HUD
- §22.6 야간 램프 on/off 토글 (`lib/lamp-state.ts`)
- §22.7 곰 말풍선 / 닉네임 / hitbox 어포던스
- §22.8 4-mvp-polish — 메인 페이지 정비

ARCHITECTURE.md에서 §22 날짜·타임존 (기본 항목)은 유지하고 §22.1 이하만 이동한다.

#### `docs/details/ui-components.md` (UI_GUIDE.md에서 이동)
UI_GUIDE.md의 아래 섹션을 통째로 이동:
- §컴포넌트 사양 (Button, BottomNav, PixelFrame, ToggleTabs, Card, input fields, FieldError, Toast, ConfirmDialog, EmptyState, Skeleton, GuestBanner, HomeGuide, UnsupportedEnvScreen, ThemeSelector, ReadingTimer, GoalProgress, BearSpeechBubble, LastReadNote 등 전체)
- §포커스 스타일
- §RoomScene Hitbox 어포던스
- §ThemeSelector (MVP1 / 4-mvp-polish) (§컴포넌트 사양 섹션에 이미 포함되어 있으면 중복 제거)
- §애니메이션 규칙
- §아이콘
- §이미지
- §카피 톤 & 보이스
- §커스텀 커서

UI_GUIDE.md에 **유지할 섹션**: 디자인 원칙, AI 슬롭 안티패턴 — 하지 마라, 색상 토큰, 스페이싱 시스템, 반응형 브레이크포인트, Z-Index 스케일, 타이포그래피, 레이아웃

#### `docs/details/adr-domain.md` (ADR.md에서 이동)
ADR.md의 ADR-016 ~ ADR-032 전체를 이동.

ADR.md에 **유지할 항목**: ADR-001 ~ ADR-015

### 2. details 파일 상단에 주석 추가

각 details 파일 최상단에 아래 한 줄을 추가한다:

```markdown
<!-- execute.py 자동 주입 대상 아님. step.md "읽어야 할 파일"에 명시적으로 추가할 것. -->
```

### 3. 원본 파일에 참조 힌트 추가

`docs/PRD.md` 맨 끝에 추가:
```markdown
---
> 세부 내용(기능·스토리·온보딩·에러표 등)은 `docs/details/prd-features.md` 참조.
```

`docs/ARCHITECTURE.md` 맨 끝에 추가:
```markdown
---
> 데이터 모델·Store 인터페이스: `docs/details/arch-data-model.md`
> Feature 구현 세부사항: `docs/details/arch-feature-impls.md`
```

`docs/UI_GUIDE.md` 맨 끝에 추가:
```markdown
---
> 컴포넌트 사양·애니메이션·카피: `docs/details/ui-components.md`
```

`docs/ADR.md` 맨 끝에 추가:
```markdown
---
> ADR-016 이후 도메인·기능·UI 결정: `docs/details/adr-domain.md`
```

## Acceptance Criteria

```bash
bun build   # 컴파일 에러 없음 (docs 파일은 코드가 아니지만 빌드 통과 확인)
```

## 검증 절차

1. `docs/` 파일 4개 라인 수 확인 — 각각 약 140 / 550 / 260 / 300줄 이하가 되어야 함:
   ```bash
   wc -l docs/PRD.md docs/ARCHITECTURE.md docs/UI_GUIDE.md docs/ADR.md
   ```
2. `docs/details/` 파일 5개 존재 확인:
   ```bash
   ls docs/details/
   ```
3. 원본 섹션이 details 파일에 있고 원본에서 삭제됐는지 교차 확인
4. `arch-data-model.md`에 `books` 테이블 `status` 컬럼이 있는지 확인
5. `arch-data-model.md`에 `getReadingStats` 메서드 시그니처가 있는지 확인
6. `phases/14-docs-and-lib-refactor/index.json` step 0 상태 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "docs 4개 분리 완료: prd-features/arch-data-model/arch-feature-impls/ui-components/adr-domain 생성, GAP 2건 수정"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 내용"`
7. 커밋 — 코드 변경 없으므로 단일 커밋: `chore(14-docs-and-lib-refactor): step 0 — docs split`

## 금지사항

- `src/` 내부 파일을 수정하지 마라. 이 step은 docs만 건드린다.
- 섹션을 요약·편집하지 마라. 원본 텍스트를 그대로 이동한다.
- 새로운 내용을 창작하지 마라. GAP 수정은 `src/lib/storage/Store.ts`와 migration SQL에서 실제 시그니처·컬럼을 읽어 반영한다.
- 기존 테스트를 깨뜨리지 마라.
