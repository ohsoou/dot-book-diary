# Step 5: release-hardening-mvp2

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md` (§10.5 MVP2 추가 범위, §14 출시 기준)
- `/docs/ADR.md` (ADR-021, ADR-022)
- `/docs/UI_GUIDE.md` (AI 슬롭 안티패턴, BearStatusBar / LastReadNote 스펙)
- `/phases/2-mvp/index.json` (step 0~4 summary)

## 작업

MVP2 출시 기준을 검증하고 릴리스 가드레일을 통과시킨다. 신규 기능 코드는 추가하지 않는다.

### 1. 자동 게이트

```bash
bun run build
bun lint
bun test
```

- 위 세 커맨드가 **0 에러**여야 한다.
- 실패 시 근본 원인을 찾아 수정. 회피 목적의 타입 단언(`as any`), `eslint-disable`, `vitest skip` 사용 금지.

### 2. Grep 가드 (UI_GUIDE 금지 사항)

```bash
git diff main..HEAD -- src/ | grep -E "(\+.*rounded-|\+.*backdrop-blur|\+.*bg-gradient|\+.*indigo|\+.*purple)"
```

- 빈 결과여야 한다.

### 3. Bear 상태 수동 체크리스트

코드 변경 없이 아래 시나리오를 검증한다:

**회원 시나리오** (`reading_sessions`에 직접 데이터 삽입):
- 세션 없음 → 곰 `Bear.png`, 상단 "곰이 책을 기다려요", 하단 "아직 독서 기록이 없어요"
- 방금(< 1시간) → 곰 `Bear.png`, "곰이 책을 읽고 왔어요", "N분 전"
- 수시간(1h~7d) → 곰 variant 중 하나, "곰이 [행동]하고 있어요", "N시간/일 전"
- 10일 이상 → 곰 `Bear_sleeping.png`, "곰이 자고 있어요", "1주 전" or "N주 전"

**비회원 시나리오** (IndexedDB 직접 조작 또는 /add-book + reading session 추가):
- 초기 렌더 → HUD 공간 있음 (빈 자리)
- 마운트 후 → LocalStore 세션 기준으로 상태 표시

**테마별**:
- `day` 테마: `/sprites/day/Bear_sleeping.png` 등 로드 확인
- `night` 테마: `/sprites/night/Bear_sleeping.png` 등 로드 확인 (Network 탭)

**랜덤 시드 일관성**:
- 같은 날 방문을 반복해도 active variant가 동일한지 확인
- 새 reading session을 추가하면 variant가 변경되는지 확인

### 4. 회귀 테스트 커버리지 확인

다음 파일에 테스트가 있는지 확인:
- `src/lib/bear-state.ts` → `src/lib/bear-state.test.ts` (step 0)
- `src/lib/last-read.ts` → `src/lib/last-read.test.ts` (step 1)
- `src/components/room/RoomScene.tsx` → `src/components/room/RoomScene.test.tsx` (step 2)
- `src/components/room/BearStatusBar.tsx` → `src/components/room/BearStatusBar.test.tsx` (step 3)
- `src/components/room/LastReadNote.tsx` → `src/components/room/LastReadNote.test.tsx` (step 3)
- `src/components/room/BearStateHydrator.tsx` → `src/components/room/BearStateHydrator.test.tsx` (step 4)

누락 시 최소 smoke 1건 추가.

### 5. 기타 확인

- `.env.example`에 **새 환경변수가 없어야 함** (MVP2는 환경변수 추가 없음).
- `public/sprites/night/Bear_{drinking,eating,healing,playing,sleeping,working}.png` 6종 파일 존재 확인.
- `phases/index.json`에 `2-mvp` 항목이 있는지 확인.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
```

모두 0 에러. 그리고:

```bash
git diff main..HEAD -- src/ | grep -E "(\+.*rounded-|\+.*backdrop-blur|\+.*bg-gradient|\+.*indigo|\+.*purple)"
```

빈 결과여야 한다.

## 검증 절차

1. AC 커맨드 전부 통과.
2. 위 수동 체크리스트를 수행한 결과를 `phases/2-mvp/index.json` step5 summary에 한 줄 요약으로 기록.
3. 결과에 따라 status 업데이트.
4. 커밋 분리: 실제 버그 수정이 있다면 `fix:`로, 없다면 이 step은 메타(`chore:`) 커밋만.

## 금지사항

- 새 기능 추가 금지. 이유: 이 step은 하드닝 전용.
- `eslint-disable-next-line`, `// @ts-ignore`, `vi.mock` 남용으로 실패를 회피하지 마라. 이유: 품질 가드의 의미 상실.
- 수동 체크리스트 문서를 별도 .md 파일로 만들지 마라. 이유: 인덱스 summary 한 줄로 충분.
- 기존 테스트를 깨뜨리지 마라.
