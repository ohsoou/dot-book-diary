# Step 1: lib-partition

## 읽어야 할 파일

먼저 아래 파일들을 읽고 현재 구조와 import 패턴을 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md` — step 0에서 이미 분리된 버전 (§2 디렉토리 구조 섹션 집중)
- `src/lib/aladin.ts`
- `src/lib/bear-state.ts`
- `src/app/page.tsx`
- `src/components/room/BearStateHydrator.tsx`
- `src/components/book/ReadingTimer.tsx`

이전 step 산출물: `docs/details/arch-data-model.md`, `docs/details/arch-feature-impls.md` (step 0에서 생성됨)

## 배경

`src/lib/` 루트에 도메인 구분 없이 파일이 혼재해 있다. phase가 쌓일수록 어떤 파일을 읽어야 할지 파악하는 오버헤드가 증가한다. 도메인별 서브 디렉토리로 그룹화한다.

## 작업

### 1. 파일 이동 (소스 + 테스트 코로케이션 유지)

아래 파일들을 새 경로로 이동한다. 각 파일의 내용은 그대로 유지하고 경로만 바꾼다.

**`src/lib/book/` 생성:**
| 이동 전 | 이동 후 |
|---------|---------|
| `src/lib/isbn.ts` | `src/lib/book/isbn.ts` |
| `src/lib/isbn.test.ts` | `src/lib/book/isbn.test.ts` |
| `src/lib/barcode.ts` | `src/lib/book/barcode.ts` |
| `src/lib/aladin.ts` | `src/lib/book/aladin.ts` |
| `src/lib/aladin.test.ts` | `src/lib/book/aladin.test.ts` |

**`src/lib/reading/` 생성:**
| 이동 전 | 이동 후 |
|---------|---------|
| `src/lib/reading-timer.ts` | `src/lib/reading/timer.ts` |
| `src/lib/reading-timer.test.ts` | `src/lib/reading/timer.test.ts` |
| `src/lib/goal.ts` | `src/lib/reading/goal.ts` |
| `src/lib/goal.test.ts` | `src/lib/reading/goal.test.ts` |
| `src/lib/last-read.ts` | `src/lib/reading/last-read.ts` |
| `src/lib/last-read.test.ts` | `src/lib/reading/last-read.test.ts` |
| `src/lib/last-read-store.ts` | `src/lib/reading/last-read-store.ts` |

**`src/lib/room/` 생성:**
| 이동 전 | 이동 후 |
|---------|---------|
| `src/lib/bear-state.ts` | `src/lib/room/bear-state.ts` |
| `src/lib/bear-state.test.ts` | `src/lib/room/bear-state.test.ts` |
| `src/lib/lamp-state.ts` | `src/lib/room/lamp-state.ts` |
| `src/lib/lamp-state.test.ts` | `src/lib/room/lamp-state.test.ts` |
| `src/lib/nickname.ts` | `src/lib/room/nickname.ts` |
| `src/lib/nickname.test.ts` | `src/lib/room/nickname.test.ts` |

**주의:** `src/lib/barcode.ts`에 대응하는 테스트 파일은 lib 루트가 아닌 `src/components/book/BarcodeScanner.test.tsx`에 있다. 별도 이동 불필요.

### 2. import 경로 업데이트 — 소스 파일

아래 파일들에서 import 경로를 변경한다:

**`src/lib/book/aladin.ts`** (이동 후):
- `@/lib/isbn` → `@/lib/book/isbn`
- `@/lib/lru-cache` → 그대로 유지 (루트 잔류)
- `@/lib/errors` → 그대로 유지

**`src/app/api/books/isbn/route.ts`**:
- `@/lib/aladin` → `@/lib/book/aladin`

**`src/app/api/books/search/route.ts`**:
- `@/lib/aladin` → `@/lib/book/aladin`

**`src/components/book/BarcodeScanner.tsx`** (동적 import 2곳):
- `import('@/lib/barcode')` → `import('@/lib/book/barcode')`

**`src/components/book/ReadingTimer.tsx`**:
- `@/lib/reading-timer` → `@/lib/reading/timer` (2곳: import * as 와 import type)

**`src/components/book/GoalProgress.tsx`**:
- `@/lib/goal` → `@/lib/reading/goal`

**`src/app/page.tsx`**:
- `@/lib/last-read` → `@/lib/reading/last-read`
- `@/lib/bear-state` → `@/lib/room/bear-state`
- `@/lib/nickname` → `@/lib/room/nickname`

**`src/components/room/BearStateHydrator.tsx`**:
- `@/lib/last-read-store` → `@/lib/reading/last-read-store`
- `@/lib/bear-state` → `@/lib/room/bear-state`
- `@/lib/nickname` → `@/lib/room/nickname`

**`src/components/room/LastReadNote.tsx`**:
- `@/lib/bear-state` → `@/lib/room/bear-state`

**`src/components/room/RoomScene.tsx`**:
- `@/lib/lamp-state` → `@/lib/room/lamp-state`
- `@/lib/bear-state` 참조가 있다면 → `@/lib/room/bear-state`

**`src/components/room/BearStateContext.tsx`**:
- `@/lib/nickname` → `@/lib/room/nickname`

### 3. import 경로 업데이트 — 테스트 파일

**`src/lib/book/aladin.test.ts`** (이동 후):
- `@/lib/isbn` → `@/lib/book/isbn`
- `@/lib/aladin` → `@/lib/book/aladin`

**`src/app/api/books/isbn/route.test.ts`**:
- `vi.mock('@/lib/aladin', ...)` → `vi.mock('@/lib/book/aladin', ...)`

**`src/app/api/books/search/route.test.ts`**:
- `vi.mock('@/lib/aladin', ...)` → `vi.mock('@/lib/book/aladin', ...)`

**`src/components/book/BarcodeScanner.test.tsx`**:
- `vi.mock('@/lib/barcode', ...)` → `vi.mock('@/lib/book/barcode', ...)`

**`src/components/book/ReadingTimer.test.tsx`**:
- `@/lib/reading-timer` → `@/lib/reading/timer` (2곳)

**`src/components/room/BearStateHydrator.test.tsx`**:
- `@/lib/last-read-store` → `@/lib/reading/last-read-store` (8곳 — vi.mock + import 모두)

### 4. ARCHITECTURE.md §2 디렉토리 구조 동기화

`docs/ARCHITECTURE.md` §2 "디렉토리 구조" 섹션을 실제 코드와 일치하도록 수정한다.

**추가할 항목** (코드에 있으나 §2에 없음):
- `app/` 라우트: `signup/`, `forgot-password/`, `reset-password/`
- `app/api/books/_guard.ts`
- `lib/` 루트: `rate-limit.ts`, `lru-cache.ts`
- `lib/client-actions/` (useBookActions.ts, useDiaryActions.ts, useReadingSessionActions.ts)
- `lib/hooks/useUnsavedChanges.ts`
- `components/nav/BottomNav.tsx`
- `components/room/BearSpeechBubble.tsx`, `BearStateContext.tsx`, `BearStateHydrator.tsx`
- Hydrator 컴포넌트: BookGridHydrator.tsx, CalendarHydrator.tsx, DiaryListHydrator.tsx, ReadingPageHydrator.tsx 등 (존재하는 것만)
- `components/onboarding/HomeGuide.tsx`
- 새 lib 서브디렉토리: `lib/book/`, `lib/reading/`, `lib/room/`

**제거할 항목** (§2에 있으나 코드에 없음 — 미구현):
- `app/diary/[id]/not-found.tsx`
- `app/reading/[bookId]/not-found.tsx`
- `app/bookshelf/error.tsx`

### 5. CLAUDE.md 업데이트

`CLAUDE.md`의 모듈 의존성 계층 또는 lib/ 설명에서 구 경로 예시(`isbn`, `escape` 등)를 새 구조로 업데이트한다. 현재: `lib/ (유틸: date, isbn, escape, errors, validation, env)` → 새 구조 반영.

## Acceptance Criteria

```bash
bun build    # 타입·import 경로 에러 없음
bun run test # 기존 테스트 전부 통과
bun lint     # ESLint 에러 없음
```

```bash
# 이동 완료 확인 — 결과 없어야 함 (구 경로 잔류 없음)
grep -r "@/lib/aladin\|@/lib/isbn\|@/lib/barcode\|@/lib/bear-state\|@/lib/lamp-state\|@/lib/nickname\|@/lib/reading-timer\|@/lib/goal\b\|@/lib/last-read\b\|@/lib/last-read-store" src/
```

## 검증 절차

1. 위 AC 커맨드 순서대로 실행
2. grep 확인 — 구 import 경로 잔류 없음
3. `src/lib/book/`, `src/lib/reading/`, `src/lib/room/` 디렉토리 존재 + 내용 확인
4. 이동 전 루트 파일들이 삭제됐는지 확인 (`ls src/lib/*.ts` — 이동 대상 파일 없어야 함)
5. `phases/14-docs-and-lib-refactor/index.json` step 1 상태 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "lib/ 10파일→book/reading/room 파티셔닝 + 테스트 8개 이동 + import 경로 전체 업데이트 + ARCHITECTURE.md §2 동기화"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
6. 커밋 2개 분리:
   - `feat(14-docs-and-lib-refactor): step 1 — lib partition into book/reading/room`
   - `chore(14-docs-and-lib-refactor): step 1 output`

## 금지사항

- 파일 내부 로직을 수정하지 마라. 이동과 import 경로 수정만 한다.
- `src/lib/` 루트 잔류 파일(`errors.ts`, `date.ts`, `escape.ts`, `env.ts`, `theme.ts`, `validation.ts`, `lru-cache.ts`, `rate-limit.ts`, `middleware.ts`)은 건드리지 마라.
- `lib/actions/`, `lib/auth/`, `lib/client-actions/`, `lib/hooks/`, `lib/storage/`, `lib/supabase/`, `lib/validation/` 서브디렉토리는 현 위치에서 이동하지 마라.
- 기존 테스트를 깨뜨리지 마라.
- `--no-verify`로 커밋 훅을 우회하지 마라.
