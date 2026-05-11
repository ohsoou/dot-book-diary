# Step 0: store-types-and-interface

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md` — 모듈 의존성 계층 (`lib/storage` 위치)
- `docs/ARCHITECTURE.md` — Store 추상화 정책
- `src/types/index.ts` — 기존 도메인 타입
- `src/lib/storage/Store.ts` — 현재 인터페이스 (24줄, list/CRUD만 존재)
- `src/lib/storage/LocalStore.ts` — IndexedDB 구현
- `src/lib/storage/RemoteStore.ts` — Supabase 구현
- `src/app/bookshelf/page.tsx`, `src/app/book-calendar/page.tsx` — 현재 컴포넌트가 매번 전체 list를 받아 reduce 하는 위치(개선 동기 확인용)
- `src/components/diary/DiaryList.tsx` — 검색 적용 대상이 될 곳

## 배경

현재 Store는 list/CRUD만 노출한다. 캘린더/책장/통계가 필요할 때마다 컴포넌트가 전체 데이터를 받아 메모리에서 reduce 한다. 책 100권 + 세션 1000개로 늘어나면 매 페이지 진입마다 전 데이터 다운로드. 또한 다이어리 본문 검색은 아예 불가능하다.

이 step에서는 **인터페이스만** 확장한다. 구현은 step 1(LocalStore) / step 2(RemoteStore)에서 분리한다. TypeScript 컴파일은 통과해야 하므로 두 구현체에 임시 `throw new Error('not implemented')`로 메서드 본문을 채우되, 시그니처는 정확히 맞춘다.

## 작업

### 1. `src/types/index.ts`에 신규 타입 추가

```ts
export type ReadingStatsPeriod = {
  from: string // YYYY-MM-DD inclusive
  to: string   // YYYY-MM-DD inclusive
}

export type ReadingStats = {
  totalMinutes: number
  totalSessions: number
  totalPagesRead: number      // sum of (endPage - startPage) where both defined
  daysActive: number          // distinct readDate count
  booksTouched: number        // distinct bookId count
}

export type ReadingStreak = {
  current: number  // 오늘 기준 연속 독서일
  longest: number  // 전체 기간 최장 연속
  lastReadDate: string | null
}

export type DiarySearchQuery = {
  q?: string                          // case-insensitive 부분 일치 (body 대상)
  bookId?: string
  entryType?: DiaryEntry['entryType']
  from?: string                        // YYYY-MM-DD
  to?: string                          // YYYY-MM-DD
  limit?: number                       // default 50
  cursor?: string                      // 직전 페이지의 마지막 entry id (회원 환경 페이지네이션)
}

export type SessionsByDate = {
  date: string             // YYYY-MM-DD
  totalMinutes: number
  bookIds: string[]
}
```

### 2. `src/lib/storage/Store.ts`에 메서드 5개 추가

```ts
// Aggregation & search
getReadingStats(period?: ReadingStatsPeriod): Promise<ReadingStats>
getReadingStreak(): Promise<ReadingStreak>
listSessionsGroupedByDate(period: ReadingStatsPeriod): Promise<SessionsByDate[]>
searchDiaryEntries(query: DiarySearchQuery): Promise<DiaryEntry[]>
countBooks(): Promise<number>
```

타입 임포트는 `@/types`에서.

### 3. 두 구현체에 시그니처 추가 (구현은 step 1/2에서)

`LocalStore.ts`와 `RemoteStore.ts`에 위 5개 메서드를 추가하되 본문은 다음과 같이:

```ts
async getReadingStats(): Promise<ReadingStats> {
  throw new Error('not implemented — see phase 10 step 1/2')
}
```

이렇게 두면 TypeScript는 인터페이스를 만족하고, 누군가 실수로 호출하면 명확한 메시지가 나온다.

### 4. 인터페이스 단위 테스트 (선택)

이 step에서는 컴파일과 인터페이스 정합성만 보장한다. 새 메서드의 동작 테스트는 step 1/2에서 작성한다. 단, 타입 수준 테스트(타입스크립트 컴파일 통과)만 보장하면 된다.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

전체 테스트 통과(기존 테스트). 새 메서드는 호출되지 않으므로 throw가 떠도 OK.

## 검증 절차

1. AC 커맨드 실행.
2. `grep -n "getReadingStats\|getReadingStreak\|listSessionsGroupedByDate\|searchDiaryEntries\|countBooks" src/lib/storage/Store.ts src/lib/storage/LocalStore.ts src/lib/storage/RemoteStore.ts` — 세 파일 모두에 5개 시그니처가 존재해야 함.
3. `phases/10-store-aggregation-search/index.json` step 0 업데이트.
4. 커밋:
   - `feat(10-store-aggregation-search): step 0 — store-types-and-interface`
   - `chore(10-store-aggregation-search): step 0 output`

## 금지사항

- 실제 집계 로직을 구현하지 마라. 이유: 이 step의 책임은 인터페이스 확정. 구현은 모듈별 step에서 분리해 검증 부담을 줄인다.
- 기존 메서드 시그니처를 변경하지 마라.
- `client-actions` facade(phase 9)에 새 메서드를 노출하지 마라 — step 2 완료 후에 별도 phase에서 다룬다.
- 새 zod 스키마를 도입하지 마라 — 검색 쿼리 검증은 step 1에서 LocalStore와 함께 다룬다.
- 회원 페이지네이션 구현(`cursor`)을 이 step에서 시도하지 마라 — 시그니처만 둔다.