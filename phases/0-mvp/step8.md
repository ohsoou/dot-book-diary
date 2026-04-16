# Step 8: bookshelf

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 3번, 빈 상태 카피)
- `/docs/ARCHITECTURE.md` ("혼합 렌더링 패턴", revalidatePath 표)
- `/docs/UI_GUIDE.md` (책 표지 이미지 규칙, Skeleton)
- 이전 step: `src/lib/storage/*`, `src/components/book/AddBookTabs.tsx`, `src/components/ui/*`

## 작업

`/bookshelf`를 member/server + guest/client hydrator 패턴의 첫 적용 사례로 구현한다.

1. **`src/app/bookshelf/page.tsx`**
   - Server Component 셸. 세션만 판단.
   - 회원: server 경로에서 `getStore().listBooks()` → `<BookGrid>` 렌더.
   - 비회원: `<BookGridHydrator>` (Client Component, LocalStore 읽기).
   - `loading.tsx`: 표지 크기 Skeleton(`h-36 w-24`) 6개 그리드.

2. **`src/components/book/BookGrid.tsx`**
   - 표지 그리드 (`grid grid-cols-3 md:grid-cols-4 gap-4`).
   - 각 아이템: `<BookCover>` + 제목 한 줄.
   - 클릭 → `href="/reading/{book.id}"` (`<Link>`).
   - 빈 배열: `<EmptyState message="아직 책장이 비어 있어요" cta={{ label: '첫 책 등록하기', href: '/add-book' }} />`.

3. **`src/components/book/BookCover.tsx`**
   - `coverUrl`이 있으면 `<Image>` (next/image). `image-rendering: auto`. 실패(`onError`) 시 이니셜 플레이스홀더.
   - 이니셜 플레이스홀더: `bg-[#3a2a1a] border border-[#1a100a] text-[#a08866] text-xs` + 제목 첫 글자.
   - 크기 고정: `w-24 h-36`.
   - `alt={book.title}` 필수.

4. **`src/lib/actions/books.ts`** — Server Action
   - `addBookAction(prevState, formData): Promise<ActionResult<Book>>`
   - `deleteBookAction(bookId: string): Promise<ActionResult<void>>`
     - 이 액션은 `/reading/[bookId]`의 [책 삭제] 버튼에서 호출한다.
     - 성공 후 `revalidatePath('/bookshelf')` + `revalidatePath('/')`.
   - `updateBookAction(bookId: string, patch, formData): Promise<ActionResult<Book>>`

5. **테스트**
   - `src/components/book/BookGrid.test.tsx`: 리스트 렌더, 빈 상태, 링크 href.
   - `src/app/bookshelf/bookshelf-page.test.tsx`: member 데이터 렌더, guest hydrator 분기.
   - `src/components/book/BookCover.test.tsx`: 이미지 렌더, 오류 시 이니셜 플레이스홀더.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `page.tsx` 전체를 client로 올리지 않았는가?
   - 회원/비회원 모두 동일한 빈 상태 카피를 쓰는가?
   - 책 표지 `<Image>`에 `image-rendering: auto`가 적용됐는가 (pixelated 금지)?
   - `deleteBookAction`이 `revalidatePath`를 올바른 경로로 호출하는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- `page.tsx`를 통째로 `"use client"`로 바꾸지 마라.
- 표지 이미지를 blur/gradient placeholder로 만들지 마라.
- 기존 테스트를 깨뜨리지 마라.
