# Step 2: guest-persistence

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` ("LocalStore 매핑", "Guest preferences / draft 인터페이스")
- `/docs/ADR.md` (ADR-003, ADR-014)
- `/CLAUDE.md`
- 이전 step: `src/types/index.ts`, `src/lib/storage/Store.ts`, `src/lib/validation.ts`, `src/lib/storage/keys.ts`

## 작업

비회원용 LocalStore와 guest preference/draft 저장소를 구현한다. 로그인/원격 저장소는 다음 step으로 미룬다. **TDD로 진행: 테스트 먼저.**

1. **의존성 설치**
   - `idb-keyval`
   - `fake-indexeddb` (devDependencies, 테스트 전용)

2. **`src/lib/storage/LocalStore.ts`** — `Store` 구현
   - `crypto.randomUUID()` + `new Date().toISOString()`.
   - 전체 배열 재쓰기(last-write-wins).
   - 모든 write 진입점에서 `validation.ts` zod 스키마 `.parse()` 호출. 실패 시 `AppError('VALIDATION_FAILED', ...)`.
   - `findBookByIsbn`: ISBN 정규화(trim) 후 비교.
   - `updateReadingSession`, `deleteReadingSession` 구현 필수.
   - 닉네임/배너/로컬 아카이브는 `Store`에 넣지 않고 `preferences.ts`가 담당한다.

3. **`src/lib/storage/preferences.ts`** — guest preference / draft
   - `getPreferences(): Promise<GuestPreferences>` — 없으면 default(`{}`) 반환
   - `updatePreferences(patch: Partial<GuestPreferences>): Promise<void>`
   - `getDiaryDraft(id: string): Promise<DiaryDraft | null>`
   - `setDiaryDraft(id: string, draft: DiaryDraft): Promise<void>`
   - `clearDiaryDraft(id: string): Promise<void>`
   - `dbd:preferences` 키: `{ nickname?, localArchived?, guestBannerDismissed? }`
   - `dbd:diary_draft:{id}` 키 (id는 `'new'` 또는 실제 entryId)

4. **schema_version 초기화 및 마이그레이션**
   - LocalStore 최초 호출 시 `dbd:schema_version`이 없으면 `CURRENT_SCHEMA_VERSION`으로 초기화.
   - **마이그레이션 훅**: `runMigrations(storedVersion: number)` 구현.
     ```ts
     // 예시 구조
     if (storedVersion < CURRENT_SCHEMA_VERSION) {
       switch(storedVersion) {
         case 1: // 1 -> 2 마이그레이션 로직
         // default: break;
       }
       await set(KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
     }
     ```

5. **`src/lib/storage/index.ts`** — 임시 guest 전용
   - 현재는 항상 `LocalStore` 인스턴스 반환.
   - `getStore(): Store` export.
   - guest preference helper를 re-export (`getPreferences`, `updatePreferences`, `getDiaryDraft`, `setDiaryDraft`, `clearDiaryDraft`).
   - `useStore()` client hook stub (step 3에서 완성).

6. **테스트** (`fake-indexeddb` 사용)
   - `src/lib/storage/LocalStore.test.ts`
   - `src/lib/storage/preferences.test.ts`
   - 시나리오:
     - add/list/delete book
     - `findBookByIsbn` (있음/없음)
     - readingSession add + filter + `updateReadingSession` + `deleteReadingSession`
     - diaryEntry filter(type) + `updateDiaryEntry` + `deleteDiaryEntry`
     - `updatePreferences({ localArchived: true })`
     - diary draft set/get/clear (`'new'` 키와 UUID 키 모두)
     - 검증 실패 시 `VALIDATION_FAILED` 에러 코드 확인

## Acceptance Criteria

```bash
bun run build
bun test
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트:
   - `LocalStore`가 `Store` 최종 메서드(`updateReadingSession` 포함)를 모두 구현하는가?
   - guest preference와 diary draft가 `Store` 밖 별도 레이어로 분리됐는가?
   - `guestBannerDismissed`, `localArchived`, `nickname` shape가 ARCHITECTURE와 일치하는가?
   - `dbd:schema_version` 초기화가 있는가?
3. `phases/0-mvp/index.json` 업데이트.

## 금지사항

- 컴포넌트에서 `idb-keyval`을 직접 import하지 마라.
- guest preference를 `Store`에 억지로 넣지 마라.
- 기존 테스트를 깨뜨리지 마라.
