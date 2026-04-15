# Step 8: diary

## 읽어야 할 파일

- `/docs/PRD.md` (핵심 기능 5번)
- 이전 step: `src/lib/storage/*`, `src/types/index.ts`

## 작업

`/diary`, `/diary/new`, `/diary/[id]` 세 라우트를 구현한다.

1. **`src/app/diary/page.tsx`**
   - `listDiaryEntries()` → 최신순 정렬.
   - 필터 탭: 전체 / quote / review.
   - 각 엔트리는 카드로, 클릭 → `/diary/[id]`.
2. **`src/app/diary/new/page.tsx`** (`'use client'` 또는 Client 래퍼)
   - 쿼리스트링 `bookId`, `type`을 기본값으로 폼 프리필.
   - 입력: `entryType`(quote|review), `body`(textarea), `page`(optional), `bookId`(optional — 등록한 책 중 선택).
   - 제출 → `Store.addDiaryEntry` → `/diary`로 이동.
3. **`src/app/diary/[id]/page.tsx`**
   - `getDiaryEntry(id)` → 없으면 `notFound()`.
   - "편집" 모드 토글 → `updateDiaryEntry`.
   - "삭제" → confirm 후 `deleteDiaryEntry` → `/diary`.
4. **공통 폼 컴포넌트** `src/components/diary/DiaryEntryForm.tsx` — 신규/편집에서 재사용.
5. **테스트**
   - `DiaryEntryForm.test.tsx`: 입력/제출/Store 호출.
   - `diary/page` 렌더에서 필터 탭 클릭 시 보이는 리스트가 달라지는지(Client 분기라면).

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - `entryType`은 type union(`'quote' | 'review'`) 그대로 보존(문자열 허용 금지).
   - 삭제는 반드시 사용자 확인(`confirm` 또는 커스텀 모달).
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 편집 중 저장하지 않은 상태를 lost 시킬 수 있는 라우팅 금지(새로고침 시 경고 또는 autosave 중 하나). 이유: 사용자 데이터 보호.
- 마크다운 에디터 라이브러리 도입 금지. 이유: 스코프. 단순 textarea만.
- 기존 테스트를 깨뜨리지 마라.
