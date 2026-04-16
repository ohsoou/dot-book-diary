# Step 9: reading-session

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 4번, US-3, 에러/엣지 케이스 §13)
- `/docs/ARCHITECTURE.md` ("혼합 렌더링 패턴", `reading_sessions`, revalidatePath 표)
- 이전 step: `src/lib/storage/*`, `src/components/book/BookCover.tsx`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/FieldError.tsx`

## 작업

`/reading/[bookId]`를 구현한다. 책 상세, 세션 기록·수정·삭제, diary deep-link까지 이 step에서 닫는다.

1. **`src/app/reading/[bookId]/page.tsx`**
   - Server Component 셸. 세션 판단.
   - 회원: `getStore().getBook(bookId)` + `listReadingSessions(bookId)`.
   - 비회원: Client hydrator.
   - `bookId`에 해당하는 책 없으면 `notFound()`.
   - `loading.tsx`: Skeleton.
   - 책 메타 영역 우측에 [책 삭제] 버튼을 둔다.

2. **`src/components/book/ReadingSessionForm.tsx`** (`"use client"`)
   - **추가 폼**: `readDate` (기본값: `formatLocalYmd(new Date())`), `startPage`, `endPage`, `durationMinutes`.
   - **수정 모드**: 기존 세션 선택 시 폼에 값 프리필. 수정 제출 → `updateReadingSession`.
   - **삭제**: 세션 항목마다 삭제 버튼 → `<ConfirmDialog>` "이 기록을 삭제할까요? 되돌릴 수 없어요." → 확인: `deleteReadingSession`.
   - 폼 패턴: `useActionState` + `pending`. `FieldError`로 검증 에러 인라인 표시.
   - 검증: `startPage/endPage/durationMinutes >= 0`, `endPage >= startPage`, `readDate <= today`.

3. **`src/lib/actions/reading-sessions.ts`** — Server Action
   - `addReadingSessionAction(prevState, formData): Promise<ActionResult<ReadingSession>>`
   - `updateReadingSessionAction(id, prevState, formData): Promise<ActionResult<ReadingSession>>`
   - `deleteReadingSessionAction(id): Promise<ActionResult<void>>`
   - 성공 후 `revalidatePath('/reading/[bookId]')` + `revalidatePath('/book-calendar')`.

4. **링크 버튼**
   - "이 책으로 문장 기록" → `<Link href="/diary/new?bookId={book.id}&type=quote">`
   - "독후감 작성" → `<Link href="/diary/new?bookId={book.id}&type=review">`

5. **책 삭제**
   - 위치: `/reading/[bookId]` 상단 책 메타 영역.
   - confirm 문구: "이 책을 책장에서 삭제할까요? 관련 독서 세션도 함께 삭제돼요."
   - 확인 시 `deleteBookAction(book.id)` 호출.
   - 성공 후 `/bookshelf`로 이동.

6. **테스트**
   - `src/components/book/ReadingSessionForm.test.tsx`
   - 시나리오: 추가 제출, 수정 프리필, 삭제 confirm → 실행, 삭제 confirm → 취소, `endPage < startPage` 검증 에러, 책 삭제 버튼 confirm 흐름.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `startPage/endPage/durationMinutes` 검증이 `validation.ts`와 폼 에러 UI 양쪽에서 동작하는가?
   - `readDate` 기본값이 today(local)인가?
   - 삭제가 confirm 없이 바로 실행되지 않는가?
   - 수정(edit) 흐름이 구현됐는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 음수 페이지/시간이 저장되게 두지 마라.
- 삭제 UI를 confirm 없이 구현하지 마라.
- `updateReadingSession`을 구현 없이 stub으로 두지 마라.
- 기존 테스트를 깨뜨리지 마라.
