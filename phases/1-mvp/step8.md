# Step 8: release-hardening-mvp1

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/PRD.md` (§14 출시 기준, §10.4 MVP1 추가 범위)
- `/docs/ADR.md` (ADR-018~020)
- `/docs/UI_GUIDE.md` (AI 슬롭 안티패턴 표)
- `/phases/1-mvp/index.json` (step 0~7 summary)

## 작업

MVP1 출시 기준을 검증하고 릴리스 가드레일을 통과시킨다. 신규 기능 코드는 추가하지 않는다.

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
# 신규/변경된 src/ 파일에서 0건이어야 한다
grep -rn "rounded-" src/
grep -rn "backdrop-blur" src/
grep -rn "bg-gradient" src/
grep -rn "indigo" src/
grep -rn "purple" src/
```

- 기존 파일에 있더라도 MVP1에서 추가되지 않았는지 git diff로 확인. 새로 추가된 위반은 제거.

### 3. 테마 매트릭스 수동 체크리스트

코드 변경 없이 아래 시나리오를 문서로 기록한다(`phases/1-mvp/index.json`의 step8 summary에 요약):

- `/` 메인 방
  - `themePreference='night'` → 야간 스프라이트
  - `themePreference='day'` → 주간 스프라이트
  - `themePreference='system'` + 현재 로컬 시각에 따른 자동 선택
- 테마 전환 시 `<html data-theme>`만 바뀌고 컴포넌트는 재마운트되지 않음
- 낮/밤 모두 텍스트 대비 ≥ 4.5:1(실측은 Lighthouse로 대체 가능, 주요 화면 1회)
- 곰/램프 애니메이션이 `prefers-reduced-motion: reduce`에서 정지

### 4. 타이머 수동 체크리스트

- 시작 → 일시정지 → 재개 → 정지 누적 정확
- 탭 닫고 다시 열어도 상태 복원
- 다른 책 페이지로 이동 후 복귀 시에도 유지
- 다른 책 타이머 시작 시 확인 모달
- 정지 후 `durationMinutes` 필드 프리필 + 포커스

### 5. 목표 진행률 수동 체크리스트

- `targetDate` 설정 전: 진행률 없음, CTA 표시
- `targetDate` 설정 후: `on-track`, `behind`, `overdue` 세 상태가 데이터에 따라 올바름
- `/bookshelf` compact 뱃지: `targetDate` 있는 책만 막대 노출

### 6. 기타 확인

- `.env.example`에 **새 환경변수가 없어야 함** (MVP1은 환경변수 추가 없음).
- `supabase/migrations/0002_theme_goal.sql`이 존재하고 `0001_init.sql`과 충돌하지 않음.
- `phases/index.json`에서 `1-mvp.status`는 최종 `"completed"`로 기록될 예정(execute.py가 처리, 수동 설정 금지).

### 7. 회귀 테스트 커버리지 확인

다음 파일들에 1건 이상의 테스트가 있는지 확인:
- `src/lib/theme.ts`
- `src/lib/reading-timer.ts`
- `src/lib/goal.ts`
- `src/components/theme/ThemeHydrator.tsx`
- `src/components/settings/ThemeSelector.tsx`
- `src/components/book/ReadingTimer.tsx`
- `src/components/book/GoalProgress.tsx`

누락 시 최소 smoke 1건 추가.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
```

모두 0 에러. 그리고:

```bash
# 아래 각 grep 결과에서 MVP1 변경분(git diff main..HEAD)에 추가된 위반 0건
git diff main..HEAD -- src/ | grep -E "(\+.*rounded-|\+.*backdrop-blur|\+.*bg-gradient|\+.*indigo|\+.*purple)"
```

빈 결과여야 한다.

## 검증 절차

1. AC 커맨드 전부 통과.
2. 위 수동 체크리스트를 수행한 결과를 `phases/1-mvp/index.json` step8 summary에 한 줄 요약으로 기록.
3. 결과에 따라 status 업데이트.
4. 커밋 분리: 실제 버그 수정이 있다면 `fix:`로, 없다면 이 step은 메타(`chore:`) 커밋만.

## 금지사항

- 새 기능 추가 금지. 이유: 이 step은 하드닝 전용.
- `eslint-disable-next-line`, `// @ts-ignore`, `vi.mock` 남용으로 실패를 회피하지 마라. 이유: 품질 가드의 의미 상실.
- 수동 체크리스트 문서를 별도 .md 파일로 만들지 마라. 이유: 인덱스 summary 한 줄로 충분.
- 기존 테스트를 깨뜨리지 마라.