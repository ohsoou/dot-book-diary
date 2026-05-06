# Step 1: diary-entries-action-tests

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/actions/diary-entries.ts` — 테스트 대상. `addDiaryEntryAction`, `updateDiaryEntryAction`, `deleteDiaryEntryAction`
- `src/lib/actions/books.test.ts` — step 0에서 만든 패턴 참조
- `src/lib/validation.ts` — `diaryEntrySchema`, `toValidationError`
- `src/lib/errors.ts` — `AppError`, `ActionResult`
- `src/types/index.ts` — `DiaryEntry` 타입 (`entryType: 'quote' | 'review'`)

step 0에서 정착한 모킹 패턴(`vi.mock('@/lib/storage')`, `vi.mock('next/cache')`)을 동일하게 사용하라.

## 배경

`addDiaryEntryAction` / `updateDiaryEntryAction`은 `FormData` 입력을 zod 검증 후 store에 위임하는 구조다. `extractInput`의 빈 문자열 처리(`bookId === ''` → undefined), `parseOptionalInt`의 NaN 처리, zod 실패 시 `VALIDATION_FAILED` + `fieldErrors` 매핑, `parsed.data.bookId` 유무에 따른 `revalidatePath` 분기 등이 회귀 위험 지점이다.

## 작업

### 1. `src/lib/actions/diary-entries.test.ts` 신규 생성

`FormData` 헬퍼를 테스트 파일 상단에 둬라:

```ts
function makeFormData(input: Record<string, string | undefined>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(input)) if (v !== undefined) fd.set(k, v)
  return fd
}
```

테스트 케이스(최소 18개):

**addDiaryEntryAction (8)**
- 정상(quote, bookId 있음): `revalidatePath('/diary')` + `revalidatePath('/reading/[bookId]', 'page')` 둘 다 호출
- 정상(review, bookId 없음): `/diary`만 revalidate
- bookId가 빈 문자열 `''` → undefined로 정규화되어 store에 전달
- page가 빈 문자열 → undefined
- page가 비정수 문자열(`"abc"`) → `parseOptionalInt` NaN → undefined
- page가 소수(`"3.7"`) → `Math.trunc` → 3
- zod 검증 실패(예: body 누락) → `code: 'VALIDATION_FAILED'`, `fieldErrors`에 `body` 포함
- store가 `AppError` 던짐 → 매핑

**updateDiaryEntryAction (6)**
- 정상: id 그대로 store에 전달, revalidatePath 호출
- bookId 빈 문자열 → undefined
- zod 실패 → `VALIDATION_FAILED` + fieldErrors
- store `AppError` 매핑
- store가 일반 Error 던짐 → `UPSTREAM_FAILED`
- 본문이 5000자 초과 → zod 실패(현재 schema 그대로 검증, 변경 금지)

**deleteDiaryEntryAction (4)**
- 정상: `store.deleteDiaryEntry(id)` 호출 + `revalidatePath('/diary')`
- `AppError` 매핑
- 일반 Error → `UPSTREAM_FAILED`
- 빈 id 전달 시 store 호출되는 동작 그대로 검증

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

`diary-entries.test.ts` 모든 케이스 통과 + 기존 테스트 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `bun run test src/lib/actions/diary-entries.test.ts` 단독 실행 시 18개 이상 통과.
3. `phases/8-action-server-tests/index.json` step 1 업데이트.
4. 커밋:
   - `test(8-action-server-tests): step 1 — diary-entries-action-tests`
   - `chore(8-action-server-tests): step 1 output`

## 금지사항

- `src/lib/actions/diary-entries.ts` 본체를 수정하지 마라. 이유: 현재 동작 락인이 목적.
- `diaryEntrySchema`(`src/lib/validation.ts`)를 수정하지 마라. 이유: 검증 규칙 변경은 별도 ADR 필요.
- 실제 zod 스키마를 모킹하지 마라 — schema는 진짜로 통과시켜 통합 검증한다.
- reading-sessions 액션 테스트는 step 2에서 다룬다.