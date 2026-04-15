# Step 6: bookshelf

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 3번)
- `/docs/UI_GUIDE.md` (이미지 규칙 — 책 표지는 `image-rendering: auto`)
- 이전 step: `src/lib/storage/*`, `src/types/index.ts`

## 작업

`/bookshelf` — 등록한 책 표지 그리드.

1. **`src/app/bookshelf/page.tsx`** — 서버에서 `getStore().listBooks()` 호출, 결과를 `<BookGrid />`로 전달.
2. **`src/components/book/BookGrid.tsx`** — CSS grid(`grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4`). 각 아이템은 `<Link href={`/reading/${book.id}`}>`로 감싼 표지 카드.
3. **`src/components/book/BookCover.tsx`** — `<img>` `w-24 h-36`, 1px hard border, `image-rendering: auto`(사진). `coverUrl`이 없으면 제목 이니셜 텍스트 플레이스홀더.
4. **빈 상태** — 책이 0권이면 "아직 등록한 책이 없어요" + `/add-book`으로 가는 버튼.
5. **비회원 분기** — Server Component는 세션 없을 때 `LocalStore`를 못 읽으므로, 이 페이지는 **Client Component 래퍼**로 한 번 감싸 로그인 상태에 따라 다르게 fetch한다. (또는 `page.tsx`가 Client. 선택은 구현자 재량이되, 회원/비회원 둘 다 동작해야 함.)
6. **테스트**
   - `BookGrid.test.tsx`: 책 배열을 prop으로 넣었을 때 개수만큼 `<Link>`가 렌더되고 href가 `/reading/{id}`.
   - 빈 배열 시 빈 상태 메시지와 CTA 버튼 렌더.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 책 표지 `<img>`에 `image-rendering: auto` 적용(사진은 pixelated 제외).
   - 카드 모서리 `rounded` 미사용.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 표지 이미지를 blur/gradient placeholder로 만들지 마라. 이유: UI_GUIDE.
- 빈 상태에서 일러스트 애니메이션 금지. 이유: 스코프.
- 기존 테스트를 깨뜨리지 마라.
