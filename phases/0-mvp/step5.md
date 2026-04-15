# Step 5: add-book

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 2번)
- `/docs/ARCHITECTURE.md` ("데이터 흐름 - 책 검색")
- `/CLAUDE.md`
- 이전 step: `src/lib/aladin.ts`, `src/app/api/books/search/route.ts`, `src/app/api/books/isbn/route.ts`, `src/lib/storage/*`

## 작업

`/add-book` 페이지를 만든다. 두 개의 탭: **바코드 스캔** / **검색**.

1. **`src/app/add-book/page.tsx`** (Server Component) — 제목 + `<AddBookTabs />` 렌더.
2. **`src/components/book/AddBookTabs.tsx`** (`'use client'`) — `toggle` state로 `'barcode' | 'search'`.
3. **`src/components/book/BarcodeScanner.tsx`** (`'use client'`)
   - `@zxing/browser`의 `BrowserMultiFormatReader`로 카메라 스트림 연결.
   - ISBN-13/EAN-13 디코드 성공 → `fetch('/api/books/isbn?isbn=...')` → 결과를 부모에 콜백으로 전달.
   - 카메라 권한 거부/미지원 시 "검색 탭을 사용해 주세요" 폴백 메시지.
4. **`src/components/book/BookSearchForm.tsx`** (`'use client'`)
   - 쿼리 input(제목/저자/출판사/ISBN 통합), 제출 시 `fetch('/api/books/search?q=...')`.
   - 결과 리스트를 표지·제목·저자로 표시. "내 책장에 추가" 버튼.
5. **저장 흐름**
   - "추가" 클릭 시 Client에서 `useStore()`로 주입받은 Store의 `addBook()` 호출.
   - 회원(세션 있음)은 RemoteStore, 비회원은 LocalStore가 투명하게 동작해야 한다.
   - 성공 후 `/bookshelf`로 이동.
6. **`src/lib/barcode.ts`** — `@zxing/browser` 초기화/해제 래퍼. 테스트 가능하도록 순수 로직은 함수로 분리.
7. **테스트**
   - `BookSearchForm.test.tsx`: `fetch` 모킹, 쿼리 입력→제출→결과 렌더→추가 버튼 클릭 시 Store.addBook 호출.
   - BarcodeScanner는 카메라 의존이라 DOM 테스트는 최소(렌더/폴백 메시지만).

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `@zxing/browser`는 Client Component에서만 import.
   - `BookSearchForm`이 `aladin.co.kr`로 직접 fetch하지 않음(반드시 `/api/books/*`).
   - 추가 후 `router.push('/bookshelf')` 호출 확인.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- Client에서 알라딘 URL 하드코드 금지. 이유: CLAUDE.md CRITICAL.
- ZXing 인스턴스를 unmount 시 정리하지 않는 코드 금지. 이유: 카메라 스트림 누수.
- 기존 테스트를 깨뜨리지 마라.
