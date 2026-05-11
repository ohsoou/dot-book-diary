# Step 1: use-reading-session-actions-hook

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/client-actions/useBookActions.ts` — step 0에서 만든 facade 패턴
- `src/lib/client-actions/useBookActions.test.ts` — step 0 테스트 패턴
- `src/lib/actions/reading-sessions.ts` — 회원 경로의 server action 시그니처
- `src/lib/actions/reading-sessions.test.ts` — phase 8 step 2의 회귀 안전망
- `src/lib/storage/Store.ts` — `addReadingSession`/`updateReadingSession`/`deleteReadingSession` 시그니처
- `src/components/book/ReadingSessionForm.tsx` — 마이그레이션 대상. 세션 추가/수정/삭제 + targetDate 저장 + 책 삭제 분기 모두 들어 있음
- `src/components/book/ReadingSessionForm.test.tsx` — 기존 테스트

## 배경

`ReadingSessionForm.tsx`는 가장 많은 회원/비회원 분기가 응축된 컴포넌트다. 한 컴포넌트에서:
- 책 삭제 (phase 9 step 0의 `useBookActions.deleteBook`로 이미 통일)
- 책 targetDate 업데이트 (`useBookActions.updateBook`)
- 세션 추가 (이번 step에서 만들 `useReadingSessionActions.addSession`)
- 세션 수정/삭제 (이번 step)

회원 경로와 비회원 경로의 입력 모양이 살짝 다른 점(예: 회원은 FormData 기반 server action, 비회원은 객체 직접)을 facade가 흡수해 컴포넌트는 객체 입력만 다루게 만든다.

## 작업

### 1. `src/lib/client-actions/useReadingSessionActions.ts` 신규

```ts
'use client'
import type { ActionResult } from '@/lib/errors'
import type { ReadingSession } from '@/types'

export type ReadingSessionInput = Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>

export type UseReadingSessionActions = {
  addSession(input: ReadingSessionInput): Promise<ActionResult<ReadingSession>>
  updateSession(id: string, patch: Partial<ReadingSessionInput>): Promise<ActionResult<ReadingSession>>
  deleteSession(id: string): Promise<ActionResult<void>>
}

export function useReadingSessionActions(opts: { isLoggedIn: boolean }): UseReadingSessionActions
```

핵심 규칙:

- 회원 경로: server action은 FormData를 받으므로 facade 내부에서 객체 → FormData 변환을 캡슐화.
  ```ts
  const fd = new FormData()
  fd.set('bookId', input.bookId)
  fd.set('readDate', input.readDate)
  if (input.startPage != null) fd.set('startPage', String(input.startPage))
  // ... endPage, durationMinutes
  return addReadingSessionAction(null, fd)
  ```
- 비회원 경로: `new LocalStore().addReadingSession(input)` 직접 호출, AppError → ActionResult 래핑.
- update 시 회원 경로의 server action이 `bookId`를 patch에서 누락하는 현재 동작은 그대로 둔다(phase 8 step 2에서 락인됨). facade 입력은 `bookId`를 받지만 회원 경로 전달 시에는 명시적으로 빼지 마라 — server action이 알아서 무시한다.

### 2. `src/lib/client-actions/useReadingSessionActions.test.ts` 신규

테스트 케이스(최소 10개):
- 회원 경로 add: server action이 FormData로 호출되었는지(`fd.get('bookId')` 등) 검증
- 회원 경로 update/delete: id 전달 + FormData 변환 검증
- 비회원 경로 add/update/delete 정상
- 비회원 AppError → 매핑
- 비회원 일반 Error → `UPSTREAM_FAILED`
- 옵셔널 필드(`startPage`, `endPage`, `durationMinutes`)가 undefined일 때 FormData에 키가 set되지 않는지 검증

### 3. `ReadingSessionForm.tsx` 마이그레이션

다음 분기를 모두 facade 호출로 교체:
- 책 삭제 → `bookActions.deleteBook(book.id)` (step 0의 훅 사용)
- targetDate 저장 → `bookActions.updateBook(book.id, { targetDate })`
- 세션 추가 → `sessionActions.addSession(input)`
- 세션 수정 → `sessionActions.updateSession(id, patch)`
- 세션 삭제 → `sessionActions.deleteSession(id)`

기존 토스트, optimistic UI, 리다이렉트 흐름은 그대로 유지. ActionResult 모양 동일.

### 4. 기존 컴포넌트 테스트 통과 확인

`ReadingSessionForm.test.tsx`가 기존에 server action을 직접 모킹했다면 facade 훅을 모킹하도록 최소 수정. 새 테스트 케이스 추가는 금지(step 2의 finalize 단계에서 일괄).

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

전체 테스트 통과. 특히 `ReadingSessionForm.test.tsx`와 phase 8 step 2의 `reading-sessions.test.ts`가 모두 통과해야 한다.

## 검증 절차

1. AC 커맨드 실행.
2. `grep -n "new LocalStore\|addReadingSessionAction\|updateReadingSessionAction\|deleteReadingSessionAction" src/components/book/ReadingSessionForm.tsx` 결과 0건.
3. `phases/9-client-actions-facade/index.json` step 1 업데이트.
4. 커밋:
   - `feat(9-client-actions-facade): step 1 — use-reading-session-actions-hook`
   - `chore(9-client-actions-facade): step 1 output`

## 금지사항

- `src/lib/actions/reading-sessions.ts`를 수정하지 마라. 이유: 회원 server action 동작은 phase 8에서 락인됨.
- `LocalStore`를 수정하지 마라.
- `DiaryEntryForm`, `BookPicker`를 건드리지 마라 — step 2 책임.
- 테스트 케이스를 새로 추가하지 마라 — step 2 finalize에서 일괄.
- 옵셔널 숫자 필드를 `''`으로 강제 변환하지 마라. 이유: server action의 `parseOptionalInt`가 빈 문자열을 undefined로 처리하는 동작과 충돌하지 않도록 facade에서는 `set` 자체를 건너뛴다.