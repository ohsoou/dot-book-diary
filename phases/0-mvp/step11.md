# Step 11: book-calendar

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 6번, US-5, 도메인 정책 §12 — 주 시작 일요일)
- `/docs/ARCHITECTURE.md` (`lib/date.ts` — `getMonthMatrix`, 혼합 렌더링 패턴)
- `/docs/UI_GUIDE.md`
- 이전 step: `src/lib/date.ts`, `src/lib/storage/*`, `src/components/book/BookCover.tsx`

## 작업

`/book-calendar`를 구현한다. PRD가 진실원이며, 주 시작 요일은 **일요일**로 고정한다.

1. **`src/lib/date.ts`의 `getMonthMatrix`** 재확인
   - `getMonthMatrix(year: number, month: number, weekStartsOn = 0): Date[][]`
   - 반환: 6행×7열 2D 배열. 해당 월에 속하지 않는 날짜도 포함(앞달 말일, 다음달 초일).
   - `weekStartsOn = 0` → 일요일 시작. 이 기본값은 변경하지 않는다.
   - **타임존 주의**: 서버/클라이언트 모두 **로컬 날짜** 기준. `new Date().getFullYear()` 등 로컬 메서드 사용. UTC 변환 금지.

2. **`src/components/calendar/MonthGrid.tsx`**
   - Props: `year: number`, `month: number` (1-indexed), `sessionsByDate: Record<string, ReadingSession[]>`, `booksById: Record<string, Book>`.
   - 7열 그리드 헤더: 일 월 화 수 목 금 토.
   - 각 셀: `<DayCell>`.

3. **`src/components/calendar/DayCell.tsx`**
   - 날짜 숫자 + 책 표지 썸네일 (최대 3권 + `+N`).
   - 해당 월 밖 날짜: `text-[#6b5540]` (비활성 색).
   - 클릭: 세션이 있는 경우 **첫 번째 책**의 `/reading/[bookId]`로 이동.
   - 세션 없는 날짜: 클릭 무반응 (링크/버튼 없음).

4. **`src/app/book-calendar/page.tsx`**
   - Server Component 셸 + guest hydrator.
   - `?year=YYYY&month=MM` 쿼리스트링 지원. 없으면 현재 로컬 연/월.
   - 회원: `getStore().listReadingSessions()`의 전체 데이터 + 책 표지 join.
   - 비회원: Client hydrator가 LocalStore 읽기.
   - 월 이전/다음 네비게이션: `<Link href="?year=...&month=...">` 화살표 버튼.
   - `loading.tsx`: 셀 Skeleton 6×7.

5. **테스트**
   - `src/components/calendar/MonthGrid.test.tsx`
   - 시나리오: 일요일 시작 헤더 순서, 6주 그리드 렌더, 표지 썸네일 3개 + +N, 빈 날짜 클릭 무반응, 이전달 날짜 비활성 색상.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 헤더가 "일 월 화 수 목 금 토" 순서인가?
   - 클릭 동작이 drawer가 아니라 첫 책 `/reading/[bookId]` 이동인가?
   - 날짜 계산에 외부 라이브러리(date-fns/dayjs/luxon)를 쓰지 않았는가?
   - `getMonthMatrix(year, month, 0)` 호출인가 (월요일 시작 값 1 사용 금지)?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- date-fns / dayjs / luxon 도입 금지.
- 월요일 시작(`weekStartsOn=1`)으로 구현하지 마라.
- 날짜 계산에 `toUTCString`, `toISOString`, UTC 메서드를 사용하지 마라.
- 기존 테스트를 깨뜨리지 마라.
