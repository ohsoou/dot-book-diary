# Step 7: reading-goal-progress

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/PRD.md` (§5 F4, §12 도메인 정책 목표 관련 행)
- `/docs/ARCHITECTURE.md` (§22.3 책 목표 진행률)
- `/docs/ADR.md` (ADR-020)
- `/docs/UI_GUIDE.md` (GoalProgress 컴포넌트 사양)
- `/src/components/book/ReadingSessionForm.tsx` (step6 결과)
- `/src/components/book/BookGrid.tsx`
- `/src/components/book/BookCover.tsx`
- `/src/lib/actions/books.ts`
- `/src/lib/validation.ts` (step1 결과 — `bookUpdateSchema`에 targetDate 포함)
- `/src/lib/date.ts`
- `/src/types/index.ts` (step1 결과)

## 작업

책 목표 완독일 입력 UI + 진행률 컴포넌트 + 책장 뱃지를 추가한다.

### 1. `src/lib/goal.ts`

순수 계산 유틸:

```ts
import type { Book, ReadingSession } from '@/types';

export type GoalStatus = 'none' | 'on-track' | 'behind' | 'overdue';

export interface GoalSummary {
  pageProgress: number | null;   // 0..1 또는 null(정보 부족)
  dateProgress: number | null;   // 0..1 또는 null
  maxEndPage: number | null;
  remainingDays: number | null;  // targetDate 있을 때만
  status: GoalStatus;
}

export function computeGoal(
  book: Book,
  sessions: ReadingSession[],
  today: Date = new Date(),
): GoalSummary;
```

- `maxEndPage`는 book과 동일 id의 세션의 `endPage` 중 최대값(없으면 null).
- `pageProgress`: `totalPages`와 `maxEndPage` 둘 다 있을 때만. 1 상한.
- `dateProgress`: `targetDate`와 `book.createdAt`(로컬 ymd) 둘 다 있을 때. 0 하한, 1 상한 제거(overdue 판단용이므로 원본 비율 그대로 반환하되 clamp는 caller가).
- `status`:
  - targetDate 없음 → `'none'`
  - `today > targetDate && pageProgress < 1` → `'overdue'`
  - `pageProgress ≥ dateProgress` → `'on-track'`
  - `dateProgress - pageProgress ≥ 0.1` → `'behind'`
  - 그 외 → `'on-track'`
- `remainingDays`: `Math.ceil((targetDate - today) / 86400000)` 또는 동등. 날짜 경계는 `formatLocalYmd` 기준으로 계산(UTC 변환 금지).

### 2. `src/components/book/GoalProgress.tsx`

```ts
interface GoalProgressProps {
  book: Book;
  sessions: ReadingSession[];
  variant?: 'full' | 'compact';
}
```

- `'use client'` 필요 없음(순수 렌더). 기본 Server Component.
- `variant === 'full'`: 막대 + 숫자 라벨 + 상태 라벨. `targetDate` 없으면 CTA "목표 완독일을 정해 볼까요?" (링크 없음, 인근 편집 UI로 유도하는 보조 텍스트).
- `variant === 'compact'`: 진행 막대만 + "D-5" 식 잔여 일수 뱃지. `/bookshelf` 카드에서 사용.
- 막대 스타일은 UI_GUIDE `GoalProgress` 섹션을 따른다.
- 색상은 반드시 `var(--color-*)` 변수로만 읽는다(테마 전환 대응).

### 3. 목표 완독일 편집 UI

`ReadingSessionForm.tsx`에 "책 설정" 섹션 추가:
- 위치: 책 메타 아래, ReadingTimer 위 또는 "diary 딥링크" 아래. 적절한 시맨틱 순서 선택.
- UI: `<input type="date">` + [저장] 버튼.
- 저장 동작:
  - 회원: `updateBookAction(bookId, { targetDate })` 호출.
  - 비회원: `LocalStore.updateBook(bookId, { targetDate })`.
  - `targetDate`는 `book.createdAt`의 로컬 ymd 이상이어야 한다. 클라이언트에서 `max` 속성 대신 `min`으로 createdAt 설정.
  - 빈 값 저장 시 `targetDate = undefined`로 해제.
- 저장 성공 시 즉시 `<GoalProgress>` 재계산(Optimistic state).

### 4. `/bookshelf` compact 뱃지

`BookGrid` 또는 `BookCover` 하단에 `<GoalProgress variant="compact" />`를 추가한다.
- 회원 경로: `ServerDiaryList`처럼 서버에서 sessions 조회 후 각 book의 sessions를 전달.
- 비회원 경로: Hydrator에서 로드 후 전달.
- 성능 관점에서 session 전체 목록을 bookId로 그룹화하여 `Record<bookId, ReadingSession[]>` 한 번만 만들고 각 카드에 subset 전달.

### 5. `updateBookAction` 확장

`src/lib/actions/books.ts`:
- 이미 존재한다면 `targetDate`가 `bookUpdateSchema`에 포함됨(step1 결과)을 확인하고, 저장 후 `revalidatePath('/bookshelf')`, `revalidatePath(\`/reading/${bookId}\`)` 호출.
- DB 매핑: `targetDate` ↔ `target_date`.

### 6. 테스트

- `goal.test.ts`: 다양한 조합(페이지 없음, 날짜 없음, overdue, behind, on-track, remainingDays 계산).
- `GoalProgress.test.tsx`: `full` / `compact` 렌더, `status`별 라벨.
- `ReadingSessionForm.test.tsx` 또는 부분 테스트: targetDate 저장 플로우(mock action).
- `BookGrid`/`/bookshelf` 테스트: compact 뱃지가 targetDate 있을 때만 렌더되는지.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - 색상이 모두 CSS 변수 참조인가(테마 전환 시 깨지지 않는가)?
   - `targetDate < createdAt` 저장이 거부되는가?
   - `/bookshelf` compact 뱃지가 세션 0건에서도 안전하게 렌더되는가?
   - `updateBookAction` 성공 후 올바른 경로가 revalidate되는가?
3. `phases/1-mvp/index.json` step 7 업데이트.
4. 커밋 분리.

## 금지사항

- `goals` 테이블 신규 생성 금지. 이유: ADR-020(단일 컬럼).
- `target_pages_per_day` 등 보조 컬럼 추가 금지. 이유: ADR-020.
- 날짜 계산에 `date-fns`/`dayjs` 도입 금지. 이유: ARCHITECTURE §22.
- 색상 하드코드(`text-[#...]`) 사용 금지. 이유: 테마 전환 호환성. 변수만 사용.
- 기존 테스트를 깨뜨리지 마라.
