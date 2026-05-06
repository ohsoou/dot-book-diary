# Step 2: ui-status-tabs-and-rating

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 도트 스타일 제약. 특히 `rounded-*`/`backdrop-blur`/`gradient`/보라·인디고 색상 금지
- `src/types/index.ts` — `BookStatus`, `Book` (step 0/1에서 확장됨)
- `src/lib/client-actions/useBookActions.ts` — phase 9에서 도입된 facade. update만 호출하면 store가 알아서 처리
- `src/components/book/BookGrid.tsx` — 책장 그리드. 상태별 탭 추가 대상
- `src/components/book/BookGrid.test.tsx`
- `src/components/book/ReadingSessionForm.tsx` — "완독 표시" 버튼과 별점 UI 추가 대상
- `src/components/book/ReadingSessionForm.test.tsx`
- `src/components/ui/ToggleTabs.tsx` — 기존 탭 컴포넌트 재사용
- `src/components/ui/Button.tsx` — 도트 스타일 버튼

## 배경

데이터 모델·스토어·액션·검증이 step 0/1에서 정리됐다. 이제 사용자에게 노출되는 UI를 추가한다. 도트 스타일을 유지하며:
- 책장: 상태별 필터 탭 (전체/읽고 싶은 책/읽는 중/완독)
- 책 상세(`/reading/[bookId]`): "완독 표시" 버튼 + 별점 1~5 + 한 줄 메모

## 작업

### 1. `BookGrid.tsx`에 상태 필터 탭 추가

```tsx
const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'want', label: '읽고 싶은' },
  { value: 'reading', label: '읽는 중' },
  { value: 'finished', label: '완독' },
] as const
type StatusFilter = typeof STATUS_FILTERS[number]['value']
```

- `useState<StatusFilter>('all')`로 상태 보관
- `ToggleTabs`로 렌더(기존 컴포넌트 재사용 — 도트 스타일 보장)
- 책 배열을 필터링해 표시. 빈 결과면 `EmptyState`로 "이 분류에 책이 없어요" 메시지
- 필터 상태는 컴포넌트 내부 state. URL 쿼리 동기화는 본 phase 범위 외(추후 별도 phase에서 다룸).

### 2. `ReadingSessionForm.tsx`에 status/rating/memo UI

책 상단 메타데이터 영역(`260-285` 부근의 표지/제목 표시 다음)에 추가:

#### "완독 표시" 토글 버튼
- 현재 `book.status === 'finished'`이면 "완독 취소", 아니면 "완독 표시"
- 클릭 시 `bookActions.updateBook(book.id, { status: 'finished' })` 또는 `{ status: 'reading' }` 호출
- `finishedAt` 자동 세팅은 store가 처리하므로 컴포넌트는 status만 보낸다

#### 별점 입력
- 별 5개를 픽셀 아이콘(이미 있는 sprite 재활용 또는 텍스트 `★/☆`로 fallback)
- `book.rating ?? 0` 기준으로 채워짐
- 클릭 시 `updateBook(book.id, { rating: n })`
- 0(미설정)으로 되돌리는 방법: 현재 별을 다시 클릭하면 해제(updateBook으로 `{ rating: undefined }` — 그러나 `Partial`이므로 undefined를 그대로 전달하면 store가 무시해선 안 됨. 해제는 v1에서 제외하고 1~5만 세팅 가능, 나중 phase에서 다룸. summary에 명시)

#### 한 줄 메모
- `<textarea maxLength={500}>` (500자 제한)
- onBlur 또는 별도 "저장" 버튼으로 `updateBook(book.id, { memo: value })` 호출
- 디바운스는 본 phase에서 도입하지 마라 — onBlur 저장으로 충분

### 3. 도트 스타일 검증

- `rounded-*`, `backdrop-blur`, `gradient`, 보라/인디고 사용 금지
- 별점은 box-shadow blur 없이 단색
- 토글 버튼은 `Button` 컴포넌트의 기존 variant 사용

### 4. 테스트 추가

#### `BookGrid.test.tsx` (최소 5)
- 초기 'all' 상태에서 모든 책 노출
- 'want' 탭 클릭 → status가 'want'인 책만 노출
- 'finished' 탭 클릭 → status가 'finished'인 책만 노출
- 빈 결과 → EmptyState 렌더
- 탭 변경 후 책 목록 변하지 않으면(같은 prop) 필터 결과 stable

#### `ReadingSessionForm.test.tsx` (최소 6)
- "완독 표시" 클릭 → `updateBook`이 `{ status: 'finished' }`로 호출
- "완독 취소"(이미 finished인 책) → `{ status: 'reading' }`로 호출
- 별점 클릭 1~5 → `updateBook`이 해당 rating으로 호출
- 메모 onBlur → `updateBook`이 memo로 호출
- 메모 500자 초과 입력은 maxLength로 차단(textarea 동작)
- updateBook 실패(`AppError`) → 토스트로 에러 노출

## Acceptance Criteria

```bash
bun build && bun lint && bun run test
```

새 테스트 + 기존 테스트 통과. 빌드 로그에 도트 스타일 위반 없음(시각 검증은 사용자 수동).

## 검증 절차

1. AC 커맨드 실행.
2. `bun dev` 실행 후 브라우저에서 책장/책 상세 페이지 수동 확인:
   - 상태 탭 동작
   - 완독 토글
   - 별점 클릭
   - 메모 저장
   - 도트 스타일 일관성 (rounded/blur/gradient 없는지)
3. `phases/11-book-status-rating/index.json` step 2 업데이트. summary에 "rating 해제 UI는 v1.x에서 다룸" 명시.
4. 커밋:
   - `feat(11-book-status-rating): step 2 — ui-status-tabs-and-rating`
   - `chore(11-book-status-rating): step 2 output`

## 금지사항

- `rounded-*`, `backdrop-blur`, `bg-gradient-*`, `from-purple-*`, `to-indigo-*` 같은 클래스를 추가하지 마라. 이유: docs/UI_GUIDE.md.
- 별점 컴포넌트로 외부 라이브러리(react-rating, lucide-react 등)를 새로 추가하지 마라. 이유: 의존성 최소화 + 도트 스타일 일관성.
- URL 쿼리 동기화(`?status=finished`)를 도입하지 마라. 이유: 본 phase 범위 외. 별도 phase에서 다룸.
- 메모 입력에 디바운스 라이브러리(use-debounce 등) 추가하지 마라.
- `useBookActions` facade를 우회해 server action을 직접 호출하지 마라.
- `Book.status` 기본값을 컴포넌트에서 임의 부여하지 마라 — store가 처리한다.
- 별점 0(undefined)으로 되돌리는 UI를 v1로 도입하지 마라 — 이유: `updateBook`에 `rating: undefined`를 명시 전달하면 patch 무시 여부가 store 구현에 따라 달라져 회귀 위험. 별도 phase에서 store 시그니처 정리 필요.