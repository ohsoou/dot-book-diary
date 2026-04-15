# Step 3: aladin-service

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` ("데이터 흐름 - 책 검색")
- `/docs/ADR.md` (ADR-004)
- `/CLAUDE.md` (외부 API는 라우트 핸들러에서만 CRITICAL)
- 이전 step: `src/types/index.ts`, `src/lib/storage/*`

## 작업

알라딘 Open API를 감싸는 서버 전용 서비스와 Next.js 라우트 핸들러 2개를 만든다.

1. **`src/lib/aladin.ts`** (서버 전용, 상단에 `import 'server-only'`)
   - `searchByKeyword(query: string): Promise<BookSearchResult[]>`
   - `fetchByIsbn(isbn: string): Promise<BookSearchResult | null>`
   - `BookSearchResult` 타입은 `src/types/index.ts`에 추가(isbn, title, author, publisher, coverUrl, totalPages).
   - TTB 키는 `process.env.ALADIN_TTB_KEY`. 없으면 throw.
   - 베이스 URL: `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx`, `ItemLookUp.aspx`. Output=JS, Version=20131101.
   - 응답 JSON을 `BookSearchResult`로 정규화(알라딘 필드명: `itemId`, `title`, `author`, `publisher`, `isbn13`, `cover`, `subInfo.itemPage`).
2. **`src/app/api/books/search/route.ts`** — `GET ?q=...`. 빈 쿼리 400. 결과 배열 JSON 응답.
3. **`src/app/api/books/isbn/route.ts`** — `GET ?isbn=...`. 단건 또는 404.
4. **테스트** — `src/lib/aladin.test.ts`에서 `global.fetch`를 `vi.fn()`으로 모킹하여:
   - 키워드 검색 URL에 TTB 키와 `Query` 파라미터가 들어가는지,
   - 응답 정규화가 `BookSearchResult` shape에 맞는지,
   - `ALADIN_TTB_KEY` 미설정 시 throw.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `src/lib/aladin.ts` 상단에 `import 'server-only'`가 있다.
   - 어디에서도 `'use client'` 컴포넌트가 `lib/aladin`을 import하지 않는다(grep으로 확인).
   - 라우트 핸들러가 입력 검증(빈 문자열, 길이 제한 등) 없이 호출하지 않는다.
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 클라이언트 컴포넌트에서 직접 `aladin.co.kr`로 fetch 하지 마라. 이유: TTB 키 노출 + CORS.
- 응답을 원본 그대로 반환하지 마라. 이유: 알라딘 필드명 변경 시 UI가 깨진다. 반드시 `BookSearchResult`로 정규화.
- TTB 키를 코드에 하드코드하지 마라.
- 기존 테스트를 깨뜨리지 마라.
