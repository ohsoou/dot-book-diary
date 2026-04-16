# Step 7: add-book

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 2번, US-1, US-2, 에러/엣지 케이스 §13)
- `/docs/ARCHITECTURE.md` ("데이터 흐름 - 책 등록", "폼 패턴", "혼합 렌더링 패턴")
- `/docs/ADR.md` (ADR-004, ADR-015)
- 이전 step: `src/lib/aladin.ts`, `src/app/api/books/search/route.ts`, `src/app/api/books/isbn/route.ts`, `src/lib/storage/*`, `src/components/ui/*`

## 작업

`/add-book` 페이지를 만든다. 검색이 기본 탭이고, 바코드는 폴백 경로까지 확정된 상태로 구현한다.

1. **`src/app/add-book/page.tsx`**
   - Server Component. 제목 metadata + `<AddBookTabs />` 렌더.
   - `loading.tsx`: Skeleton 형태.

2. **`src/components/book/AddBookTabs.tsx`** (`"use client"`)
   - `<ToggleTabs>` — `barcode` / `search` 전환. 기본 탭: `search`.
   - 탭 전환 시 이전 탭 상태(결과 목록)는 초기화.

3. **`src/components/book/BarcodeScanner.tsx`** (`"use client"`)
   - `@zxing/browser` 클라이언트에서만 사용. `dynamic import`.
   - **스캐너 UI**: 비디오 화면 위에 도트 스타일의 사각형 가이드 라인(`border-dashed`)과 "바코드를 사각형 안에 맞춰주세요" 안내 문구 오버레이.
   - **피드백**: 스캔 성공 시 화면이 짧게 반짝이거나(Flash 효과) 성공 토스트를 띄워 사용자에게 인지시킴.
   - **HTTPS 필수**: `location.protocol !== 'https:'` && `hostname !== 'localhost'`이면 "HTTPS 환경에서만 카메라를 사용할 수 있어요" 메시지 + 검색 탭으로 폴백.
   - 권한 거부(`NotAllowedError`) → "카메라 권한이 필요해요" + 검색 탭으로 폴백.
   - 미지원 브라우저(`NotSupportedError` / `getUserMedia` 없음) → `UnsupportedEnvScreen` 표시.
   - 디코드 성공 → `GET /api/books/isbn?isbn=<code>` → `{ data: BookSearchResult }` 처리.
   - unmount 시 `stream.getTracks().forEach(t => t.stop())` 반드시 호출.

4. **`src/lib/barcode.ts`**
   - `startScanner(videoEl, onDecode, onError)` / `stopScanner()` 래퍼.
   - ZXing 인스턴스 외부 노출 없음.

5. **`src/components/book/BookSearchForm.tsx`** (`"use client"`)
   - 폼 패턴: `useActionState` + `pending` 상태로 버튼 disable.
   - 검색 제출 → `GET /api/books/search?q=...` → 성공 응답은 `{ data: BookSearchResult[] }`.
   - 로딩: 결과 영역 Skeleton.
   - 결과 없음: `<EmptyState message="검색 결과가 없어요" />`.
   - **중복 ISBN**: `useStore().findBookByIsbn(isbn)` 확인 → 이미 있으면 `<ConfirmDialog>` "이미 책장에 있는 책이에요. 책장으로 이동할까요?" → 확인: `/bookshelf`, 취소: 그대로.
   - "내 책장에 추가" 버튼 → `useStore().addBook(...)` → 성공: toast("책을 추가했어요") + `/bookshelf` 이동. 실패: toast(에러 메시지).
   - `FieldError`로 검증 에러 인라인 표시.

6. **저장 흐름**
   - `BookSearchForm`은 `onAddBook(input): Promise<ActionResult<Book>>` 계약만 안다.
   - 회원: `onAddBook`은 Server Action(`lib/actions/books.ts`의 `addBookAction`) 어댑터를 사용한다.
   - 비회원: `onAddBook`은 client에서 `useStore().addBook()`을 호출한 뒤 `ActionResult<Book>`로 감싼다.
   - 폼 컴포넌트는 `RemoteStore`를 직접 import하거나 호출하지 않는다.

7. **테스트**
   - `src/components/book/BookSearchForm.test.tsx`: 검색 제출, 결과 렌더, 중복 ISBN 모달, 추가 성공/실패.
   - `src/components/book/BarcodeScanner.test.tsx`: HTTPS 폴백, 권한 거부 폴백, unmount stream 정리.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 기본 탭이 검색인가?
   - `aladin.co.kr` 직접 fetch가 없는가?
   - 중복 ISBN 시 모달 분기가 있는가?
   - HTTPS 폴백 로직이 있는가?
   - unmount 시 카메라 스트림 정리가 있는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- Client에서 알라딘 URL 하드코드 금지.
- ZXing 인스턴스를 unmount 시 정리하지 않는 코드 금지.
- `@zxing/browser`를 SSR 환경에서 직접 import하지 마라 — `dynamic(() => import(...), { ssr: false })` 사용.
- 기존 테스트를 깨뜨리지 마라.
