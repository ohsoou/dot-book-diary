# Step 7: reading-session

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 4번)
- `/docs/ARCHITECTURE.md` (데이터 모델의 `reading_sessions`)
- 이전 step: `src/lib/storage/*`, `src/components/book/BookCover.tsx`

## 작업

`/reading/[bookId]` — 개별 책의 독서 세션 기록 페이지.

1. **`src/app/reading/[bookId]/page.tsx`**
   - `getStore().getBook(bookId)` → 없으면 `notFound()`.
   - 책 정보(표지/제목/저자/총페이지) 상단.
   - `ReadingSessionForm` + 이 책의 `listReadingSessions(bookId)` 렌더.
   - 이 책과 연결된 diary 엔트리 리스트(`listDiaryEntries({ bookId })`)도 함께 노출. 각 항목 클릭 → `/diary/[id]`.
2. **`src/components/book/ReadingSessionForm.tsx`** (`'use client'`)
   - 입력: `readDate`(default today), `startPage`, `endPage`, `durationMinutes`.
   - 제출 시 `useStore().addReadingSession(...)` → 낙관적 업데이트 또는 `router.refresh()`.
3. **링크 버튼** — "이 책으로 문장 기록" → `/diary/new?bookId=...&type=quote`, "독후감 작성" → `/diary/new?bookId=...&type=review`.
4. **테스트**
   - `ReadingSessionForm.test.tsx`: 입력값 → 제출 → Store.addReadingSession이 올바른 인자로 호출.
   - `reading/[bookId]/page` 자체는 Server Component라 유닛 테스트는 생략, Storybook/수동 확인으로 대체.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - bookId로 필터된 reading sessions와 diary entries만 표시.
   - 날짜 기본값이 today(로컬 타임존).
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- `startPage`, `endPage`에 음수나 `endPage < startPage`가 통과하지 않도록 폼 단계 검증 필수. 이유: 데이터 무결성.
- 전역 timer/stopwatch 라이브러리 추가 금지. 이유: MVP 스코프.
- 기존 테스트를 깨뜨리지 마라.
