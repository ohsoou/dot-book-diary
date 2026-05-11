# Step 1: local-store-aggregation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/lib/storage/Store.ts` — step 0에서 확장된 인터페이스(5개 신규 메서드)
- `src/lib/storage/LocalStore.ts` — IndexedDB 구현. 현재 throw로 채워진 5개 메서드 본문을 채우는 작업
- `src/lib/storage/LocalStore.test.ts` — 기존 테스트 패턴
- `src/types/index.ts` — `ReadingStats`, `ReadingStreak`, `DiarySearchQuery`, `SessionsByDate`
- `src/lib/date.ts` — 날짜 유틸 (이미 있는 함수 재사용)

## 배경

비회원 환경은 IndexedDB이고 데이터 양이 한정적(브라우저 한 개)이다. 모든 신규 메서드를 메모리 reduce로 구현해도 비용이 충분히 작다. RemoteStore의 SQL aggregate 구현(step 2)과 결과가 동일해야 하므로 의미 정의를 정확히 맞춰라.

## 작업

### 1. `LocalStore.ts`에 5개 메서드 구현

#### `getReadingStats(period?)`

`listReadingSessions({ from, to })`로 받은 세션 배열을 reduce:
- `totalMinutes`: `durationMinutes`의 합 (undefined는 0)
- `totalSessions`: 길이
- `totalPagesRead`: `endPage`와 `startPage`가 모두 정의된 세션에 대해 `max(0, endPage - startPage)`의 합
- `daysActive`: `readDate` set 크기
- `booksTouched`: `bookId` set 크기

period 없을 때는 전체 세션 대상.

#### `getReadingStreak()`

전체 세션의 `readDate` set을 정렬한 뒤:
- `lastReadDate`: 최댓값 (없으면 null)
- `current`: 오늘부터 거꾸로 연속 day 수 (오늘 또는 어제까지 읽었어야 streak 유효 — 그 외엔 0)
- `longest`: 정렬된 날짜 집합에서 연속 길이 최대값

날짜 비교는 `src/lib/date.ts`의 기존 헬퍼 사용. timezone은 KST 기준(다른 코드와 동일).

#### `listSessionsGroupedByDate(period)`

period 범위의 세션을 `readDate`로 그룹핑:
- `date`: YYYY-MM-DD
- `totalMinutes`: 그룹 내 합
- `bookIds`: 중복 제거된 bookId 배열, 안정 정렬(첫 등장 순)

결과는 `date` 오름차순.

#### `searchDiaryEntries(query)`

`listDiaryEntries({ bookId, entryType })`로 1차 필터 후 메모리에서:
- `q`가 있으면 `entry.body.toLowerCase().includes(q.toLowerCase())` 매칭
- `from`/`to`가 있으면 `createdAt`을 `YYYY-MM-DD`로 잘라 비교(둘 다 inclusive)
- 결과를 `createdAt` 내림차순 정렬
- `limit`(default 50)으로 자름
- `cursor`는 비회원 환경에선 무시(LocalStore 데이터 양이 적어 의미 없음). 시그니처는 받되 사용하지 않는 점을 주석으로 남길 것.

#### `countBooks()`

`listBooks().length`.

### 2. `LocalStore.test.ts`에 테스트 추가 (최소 18개)

- `getReadingStats`: 빈 데이터 → 0, period 필터, totalPagesRead의 음수 방지, undefined duration 처리
- `getReadingStreak`: 빈 데이터 → null/0, 오늘만 읽음 → current 1, 어제까지 7일 연속 → longest 7 current 0(오늘 안 읽음 케이스), 오늘+어제 연속 → current 2
- `listSessionsGroupedByDate`: 그룹핑 정확성, bookIds 중복 제거, 빈 결과
- `searchDiaryEntries`: q 부분 일치, 대소문자 무관, bookId 필터 결합, entryType 필터, 날짜 범위, limit 적용, 빈 q여도 동작
- `countBooks`: 0/N

테스트는 fake-indexeddb 또는 기존 LocalStore.test.ts가 사용하는 모킹 패턴 그대로.

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

새 테스트 18개 이상 통과 + 기존 테스트 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `grep -n "not implemented" src/lib/storage/LocalStore.ts` 결과 0건 (5개 메서드 모두 구현됨).
3. `phases/10-store-aggregation-search/index.json` step 1 업데이트.
4. 커밋:
   - `feat(10-store-aggregation-search): step 1 — local-store-aggregation`
   - `chore(10-store-aggregation-search): step 1 output`

## 금지사항

- `RemoteStore.ts`를 수정하지 마라 — step 2 책임.
- 인터페이스(`Store.ts`)를 수정하지 마라 — step 0에서 확정됨.
- `client-actions` facade에 신규 메서드를 노출하지 마라 — phase 종료 후 별도 작업.
- 검색에서 정규식이나 한국어 형태소 분석을 도입하지 마라. 이유: 비회원은 단순 부분 일치로 충분, 회원의 fulltext는 step 2에서 SQL `to_tsvector`/`ilike`로 다룬다.
- streak 계산에 timezone 라이브러리(date-fns-tz, dayjs)를 추가하지 마라 — `src/lib/date.ts`만 사용.