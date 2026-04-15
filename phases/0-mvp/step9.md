# Step 9: book-calendar

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 6번)
- `/docs/UI_GUIDE.md`
- 이전 step: `src/lib/storage/*`

## 작업

`/book-calendar` — 월간 달력에 날짜별 책 표지 미리보기.

1. **`src/components/calendar/MonthGrid.tsx`** (`'use client'`)
   - Props: `year`, `month`(1-12), `sessionsByDate: Record<string /*YYYY-MM-DD*/, Book[]>`.
   - 7열 그리드. 주 시작 월요일(한국 관례에 따라 월/일 선택 가능하되 이 MVP는 월요일 시작).
   - 각 셀에 해당 날짜의 책 표지 썸네일 최대 3개 + "+N" 표기.
2. **`src/components/calendar/DayCell.tsx`** — 날짜 숫자 + 표지 썸네일. 클릭 → 해당 날짜의 세션/엔트리 상세 패널(간단한 Drawer 또는 리스트) 또는 `/reading/[firstBookId]` 이동.
3. **`src/app/book-calendar/page.tsx`**
   - 현재 월을 기본. 쿼리스트링으로 `?year=YYYY&month=MM` 지원.
   - Store에서 `listReadingSessions()` 전체 또는 범위 조회 → `bookId`로 `getBook` join → 날짜별 그룹핑.
   - `<MonthGrid />` 렌더 + 이전/다음 월 버튼.
4. **테스트**
   - `MonthGrid.test.tsx`: 임의 월(예: 2026-04)에 대해 셀 개수(28~31)와 주 배열(앞뒤 빈칸 포함 6주 이하).
   - 특정 날짜에 책 표지가 올바르게 매핑되는지.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 날짜 계산에 외부 라이브러리(date-fns, dayjs) **없이** 표준 `Date`로 구현. 이유: 의존성 최소화.
   - 시간대는 로컬. UTC 변환으로 날짜가 어긋나지 않도록 `YYYY-MM-DD`를 직접 포맷.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- date-fns / dayjs / luxon 도입 금지. 이유: MVP 스코프 + 번들 사이즈.
- 셀에 3개 이상의 표지를 겹쳐 표시해 레이아웃을 깨뜨리지 마라.
- 기존 테스트를 깨뜨리지 마라.
