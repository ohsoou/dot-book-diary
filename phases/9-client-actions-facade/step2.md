# Step 2: use-diary-actions-and-finalize

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/client-actions/useBookActions.ts`, `useReadingSessionActions.ts` — step 0/1에서 만든 facade들
- `src/lib/actions/diary-entries.ts` — 회원 server action
- `src/lib/actions/diary-entries.test.ts` — phase 8 step 1의 회귀 안전망
- `src/types/index.ts` — `DiaryEntry`, `DiaryDraft`
- `src/components/diary/DiaryEntryForm.tsx` — 마이그레이션 대상(`handleClientSubmit` 152-222 부근)
- `src/components/diary/BookPicker.tsx` — 책 목록 조회 분기(19-25 부근)
- `src/components/diary/DiaryEntryForm.test.tsx` — 기존 테스트

## 배경

Phase 9의 마지막 step이다. 일기 도메인 facade를 도입하고, 책/일기 양쪽 컴포넌트를 모두 마이그레이션해 `new LocalStore()` 직접 인스턴스화와 server action 직접 호출이 컴포넌트 레이어에서 0건이 되도록 한다.

## 작업

### 1. `src/lib/client-actions/useDiaryActions.ts` 신규

```ts
'use client'
import type { ActionResult } from '@/lib/errors'
import type { DiaryEntry } from '@/types'

export type DiaryEntryInput = {
  bookId?: string
  entryType: DiaryEntry['entryType']
  body: string
  page?: number
}

export type UseDiaryActions = {
  listEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<ActionResult<DiaryEntry[]>>
  getEntry(id: string): Promise<ActionResult<DiaryEntry | null>>
  addEntry(input: DiaryEntryInput): Promise<ActionResult<DiaryEntry>>
  updateEntry(id: string, input: DiaryEntryInput): Promise<ActionResult<DiaryEntry>>
  deleteEntry(id: string): Promise<ActionResult<void>>
}

export function useDiaryActions(opts: { isLoggedIn: boolean }): UseDiaryActions
```

핵심 규칙:

- 회원 경로 add/update: 객체 → FormData 변환(빈 문자열 keep, undefined는 `set` 건너뜀). server action이 zod로 검증하므로 facade는 검증을 중복 수행하지 마라.
- 비회원 경로: `LocalStore`의 메서드 시그니처와 server action 시그니처를 facade에서 통일. 비회원도 zod 검증을 통과시키려면 `diaryEntrySchema.parse(input)`을 facade에서 직접 호출(검증 실패 시 `VALIDATION_FAILED` + `fieldErrors`로 변환).
- listEntries / getEntry: 회원 경로에는 현재 server action이 없으므로 비회원과 동일하게 `LocalStore` 또는 `RemoteStore` 인스턴스 호출이 아니라 — **회원 경로에서도 `useStore()` 훅을 사용**해 RemoteStore 호출을 facade에서 흡수. 단 이 경우 facade가 store를 직접 만지지 않도록 별도 헬퍼 `getClientStore(isLoggedIn)`로 분리해도 좋다(설계는 에이전트 재량).

### 2. `src/lib/client-actions/useDiaryActions.test.ts` 신규

테스트 케이스(최소 12개):
- 회원 add: FormData 변환 + server action 호출
- 회원 add: 빈 bookId → undefined 정규화 후 server action에서 처리됨을 검증
- 비회원 add 정상
- 비회원 add: zod 실패(body 누락) → `VALIDATION_FAILED` + `fieldErrors`
- 회원/비회원 update 정상
- 회원/비회원 delete 정상
- listEntries 필터 전달 검증
- AppError 매핑 / 일반 Error → `UPSTREAM_FAILED` (회원/비회원 각각)

### 3. 컴포넌트 마이그레이션

- `DiaryEntryForm.tsx`: `handleClientSubmit` 분기 제거. 단일 경로로 `await diaryActions.addEntry(input)` 또는 `updateEntry(id, input)` 호출.
- `BookPicker.tsx`: 책 목록 조회 분기 제거. `bookActions.listBooks()` 한 줄로 통일.
- `DiaryListHydrator`, `DiaryEntryDetailHydrator`(있다면): 비회원 경로의 `new LocalStore()` 직접 호출을 `useDiaryActions().listEntries/getEntry`로 교체.

### 4. 컴포넌트 테스트 정리

`DiaryEntryForm.test.tsx`, `BookPicker.test.tsx`가 server action 또는 LocalStore를 직접 모킹했다면 facade 훅 모킹으로 통일. 동작 시나리오는 동일하게 유지.

### 5. 최종 grep 검증

```bash
# 컴포넌트 레이어에서 직접 호출 0건 확인
grep -rn "new LocalStore" src/components/    # 결과 없어야 함
grep -rn "from '@/lib/actions/" src/components/   # 결과 없어야 함 (auth 관련 LoginForm/SignupForm 등은 예외 — auth 도메인이라 facade 미적용)
```

`auth` 관련(`LoginForm`, `SignupForm`, `ResetPasswordForm`, `ForgotPasswordForm`, `LogoutButton`)과 `profile` 관련(`NicknameForm` 등)은 이번 phase 범위 외다. 위 grep 결과에 그것들이 남아 있으면 그대로 둬라. book/diary/reading 관련만 0건이면 합격.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

전체 테스트 통과. 특히 phase 8의 모든 액션 테스트와 phase 9의 facade 테스트 모두 통과.

## 검증 절차

1. AC 커맨드 실행.
2. 위 grep 명령으로 컴포넌트 레이어 직접 호출 잔재 확인.
3. `phases/9-client-actions-facade/index.json` step 2 업데이트. summary에 "phase 10에서 Store 인터페이스 확장 시 facade가 흡수할 신규 메서드(검색/통계)를 추가만 하면 컴포넌트 변경 없이 노출 가능"이라는 점 명시.
4. 커밋:
   - `feat(9-client-actions-facade): step 2 — use-diary-actions-and-finalize`
   - `chore(9-client-actions-facade): step 2 output`

## 금지사항

- `auth` / `profile` 도메인을 facade로 묶지 마라. 이유: 이 두 도메인은 서버 세션과 강하게 결합돼 별도 ADR 필요.
- `src/lib/actions/diary-entries.ts`나 `validation.ts`를 수정하지 마라. 이유: phase 8 step 1에서 락인됨.
- 컴포넌트 비즈니스 로직(토스트 메시지, 라우팅, optimistic UI)을 임의로 변경하지 마라.
- facade 훅 안에서 `useEffect`로 자동 fetch를 트리거하지 마라. 이유: 호출 시점은 컴포넌트가 결정한다.