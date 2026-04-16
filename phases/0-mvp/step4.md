# Step 4: aladin-service

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` ("데이터 흐름 - 책 검색", "HTTP 매핑", "캐싱·재검증")
- `/docs/ADR.md` (ADR-004, ADR-012)
- `/CLAUDE.md`
- 이전 step: `src/types/index.ts`, `src/lib/isbn.ts`, `src/lib/errors.ts`, `src/lib/env.ts`

## 작업

알라딘 Open API를 감싸는 서버 전용 서비스와 Next.js 라우트 핸들러 2개를 구현한다.

1. **`src/lib/aladin.ts`** — 서버 전용
   - 파일 상단에 `import 'server-only'`.
   - `searchByKeyword(query: string): Promise<BookSearchResult[]>`
   - `fetchByIsbn(isbn: string): Promise<BookSearchResult | null>`
   - **타임아웃**: `AbortController` 5초. 실패 시 1회 재시도(총 2회 시도). 재시도 후에도 실패 → `AppError('UPSTREAM_FAILED', ...)`.
   - **ISBN 변환**: 입력이 ISBN-10이면 `lib/isbn.ts`로 13자리로 변환 후 조회.
   - **응답 정규화**: 알라딘 응답 → `BookSearchResult`. `title` 없는 항목 필터. `subInfo.itemPage`는 없어도 무시.
   - **rate limit**: 알라딘이 429 반환 시 `AppError('RATE_LIMITED', ...)` — 재시도 하지 않음.
   - **캐싱**: 외부 `fetch`에 `{ next: { revalidate: 60 } }` 옵션.

2. **`src/app/api/books/search/route.ts`** — `GET ?q=<query>`
   - `q` 없거나 빈 문자열 → 400 `{ error: { code: 'VALIDATION_FAILED', message: '검색어를 입력해 주세요' } }`
   - `q` 최대 100자 초과 → 400.
   - `RATE_LIMITED` → 429.
   - `UPSTREAM_FAILED` → 502.
   - 성공 → 200 `{ data: BookSearchResult[] }`.

3. **`src/app/api/books/isbn/route.ts`** — `GET ?isbn=<isbn>`
   - `isbn` 없거나 빈 문자열 → 400.
   - 결과 없음 → 404 `{ error: { code: 'NOT_FOUND', message: '책을 찾을 수 없어요' } }`.
   - `RATE_LIMITED` → 429.
   - `UPSTREAM_FAILED` → 502.
   - 성공 → 200 `{ data: BookSearchResult }`.

4. **테스트**
   - `src/lib/aladin.test.ts`: `fetch` mock. happy path, 타임아웃(2회 모두 실패), rate limit, title 없는 항목 필터, ISBN-10 입력 처리.
   - `src/app/api/books/search/route.test.ts`: 빈 쿼리, 정상 응답, 429 매핑.
   - `src/app/api/books/isbn/route.test.ts`: 결과 없음 404, 정상 응답.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `src/lib/aladin.ts` 상단에 `import 'server-only'`가 있는가?
   - 클라이언트에서 `aladin.co.kr`로 직접 fetch하지 않는가?
   - 5초 timeout + 1회 재시도(rate limit 제외)가 코드/테스트로 고정됐는가?
   - 응답이 `BookSearchResult`로 정규화됐는가 (원본 그대로 노출 금지)?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 응답을 원본 그대로 반환하지 마라. 반드시 `BookSearchResult`로 정규화.
- TTB 키를 하드코드하지 마라 (`env.ts`의 `ALADIN_TTB_KEY` 사용).
- 클라이언트 컴포넌트에서 `/api/books/*` 외 알라딘 URL을 직접 fetch하지 마라.
- 기존 테스트를 깨뜨리지 마라.
