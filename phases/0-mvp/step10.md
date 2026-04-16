# Step 10: diary

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 5번, US-4)
- `/docs/ARCHITECTURE.md` ("폼 패턴", "Guest preferences / draft 인터페이스", revalidatePath 표)
- `/docs/UI_GUIDE.md` (FieldError, Toast, ConfirmDialog)
- 이전 step: `src/lib/storage/*`, `src/lib/escape.ts`, `src/components/ui/*`, `src/lib/hooks/useUnsavedChanges.ts`

## 작업

`/diary`, `/diary/new`, `/diary/[id]`를 구현한다. 이탈 보호(`beforeunload` + autosave)는 선택이 아니라 필수다.

1. **`src/app/diary/page.tsx`**
   - Server Component 셸 + guest hydrator.
   - 최신순 리스트.
   - 필터 탭: 전체 / quote / review (`<ToggleTabs>`).
   - `loading.tsx`: 카드 Skeleton.

2. **`src/app/diary/new/page.tsx`**
   - `searchParams`에서 `bookId`, `type` 읽어 `<DiaryEntryForm>`에 기본값 전달.
   - `type`이 `'quote' | 'review'` 외면 `'quote'`로 폴백.

3. **`src/app/diary/[id]/page.tsx`**
   - 상세 렌더: 텍스트 노드 렌더 + `white-space: pre-wrap`.
   - 편집 토글: 버튼 클릭 → 인라인 `<DiaryEntryForm>` 로드.
   - 삭제: `<ConfirmDialog>` "이 기록을 삭제할까요? 되돌릴 수 없어요." → `deleteDiaryEntry`.
   - 없는 id → `notFound()`.

4. **`src/components/diary/DiaryEntryForm.tsx`** (`"use client"`) — 신규/편집 공용
   - 필드: `entryType` (radio/toggle), `bookId` (optional 선택), `body` (textarea), `page` (optional).
   - `body` 최대 5000자. 글자 수 카운터 표시.
   - **`beforeunload` 이벤트**: `useUnsavedChanges(isDirty)` 훅으로 등록. 계약은 `useUnsavedChanges(isDirty: boolean): void`. dirty = 초기값과 현재 값이 다르면 true.
   - **30초 autosave**: `setInterval(30_000)` → `setDiaryDraft(id, { body, entryType, bookId, page })`. 저장 성공 토스트("임시 저장했어요") 없이 조용히 저장.
   - **draft 복원**: 마운트 시 `getDiaryDraft(id)` → 있으면 "이전에 작성 중이던 내용이 있어요. 불러올까요?" confirm.
   - **저장 성공/삭제 성공 시**: `clearDiaryDraft(id)` 호출.
   - `FieldError`로 검증 에러 인라인 표시.
   - 제출 폼 패턴: `useActionState` + `pending`.

5. **`src/lib/actions/diary-entries.ts`** — Server Action
   - `addDiaryEntryAction(prevState, formData): Promise<ActionResult<DiaryEntry>>`
   - `updateDiaryEntryAction(id, prevState, formData): Promise<ActionResult<DiaryEntry>>`
   - `deleteDiaryEntryAction(id): Promise<ActionResult<void>>`
   - 성공 후 `revalidatePath('/diary')` + `revalidatePath('/reading/[bookId]')` (bookId 있을 때).

6. **렌더 안전**
   - 본문은 React 텍스트 노드 `{body}`로만 렌더한다. `dangerouslySetInnerHTML`는 사용하지 않는다.
   - 상세 렌더: `white-space: pre-wrap` 적용.

7. **테스트**
   - `src/components/diary/DiaryEntryForm.test.tsx`
   - 시나리오: dirty 감지, autosave draft, draft 복원 confirm/거부, 저장 성공 후 draft 제거, `entryType` union 검증.

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `entryType`이 `'quote' | 'review'` union으로 유지되는가?
   - `beforeunload`와 autosave 30초가 둘 다 구현됐는가?
   - 삭제가 confirm을 거치는가?
   - 저장/삭제 성공 시 draft가 `clearDiaryDraft`로 제거되는가?
   - 본문이 텍스트 노드로만 렌더되는가 (`dangerouslySetInnerHTML` 금지)?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 이탈 보호(`beforeunload` + autosave) 중 하나만 구현하고 끝내지 마라.
- 마크다운 에디터 라이브러리 도입 금지.
- 기존 테스트를 깨뜨리지 마라.
