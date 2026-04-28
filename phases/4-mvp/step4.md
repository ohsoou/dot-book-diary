# Step 4: diary-book-linking-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` (§9 데이터 모델, §10 Store 인터페이스, §22.7 MVP4)
- `docs/ADR.md` (ADR-005 도트 스프라이트, ADR-015 폼 패턴)
- `docs/UI_GUIDE.md` (§입력 필드, §Button, §Card, §카피 톤)
- `src/types/index.ts` — `DiaryEntry.bookId?: string`, `Book` 타입
- `src/lib/storage/Store.ts` — `listBooks(): Promise<Book[]>` 인터페이스
- `src/lib/storage/use-store.ts` — `useStore()` 훅 (클라이언트에서 LocalStore 반환)
- `src/components/diary/DiaryEntryForm.tsx` — `initialBookId` hidden input 현황, 폼 구조
- `src/components/diary/DiaryList.tsx` — 엔트리 목록 렌더
- `src/components/diary/DiaryEntryDetail.tsx` — 엔트리 상세 렌더
- `src/components/book/BookGrid.tsx` — 책 카드 현황 (`/bookshelf` 에서 사용)
- `src/app/bookshelf/page.tsx` — 책장 페이지 (회원/게스트 분기)
- `src/app/diary/page.tsx` — 다이어리 페이지 서버 컴포넌트
- `src/components/diary/DiaryListHydrator.tsx` — 게스트 다이어리 hydrator
- `src/components/diary/DiaryEntryForm.test.tsx` — 기존 테스트 패턴

## 배경

`diary_entries.book_id` FK와 `DiaryEntry.bookId?: string` 타입은 이미 존재한다.
`/diary/new?bookId=...` URL 파라미터를 통한 연결도 이미 작동한다.

**아직 없는 것**:
1. 책장 카드에서 바로 "이 책으로 일기 쓰기" 링크
2. 일기 폼 내에서 책 선택 picker (initialBookId를 URL에 의존하지 않고 폼 안에서 선택)
3. 일기 목록/상세에서 연결된 책 제목 표시

## 작업

### 1. `src/components/diary/BookPicker.tsx` 신규 생성

```ts
interface BookPickerProps {
  value: string | undefined      // 현재 선택된 bookId
  onChange: (bookId: string | undefined) => void
}
export function BookPicker({ value, onChange }: BookPickerProps)
```

- 클라이언트 컴포넌트 (`'use client'`)
- `useStore().listBooks()` 로 책 목록 비동기 로드 (useEffect, 마운트 1회)
- 로딩 중: "불러오는 중..." 텍스트
- 책 없음: "책장에 책이 없어요." + `<a href="/add-book">책 등록하기</a>` 링크
- 책 있음: 네이티브 `<select>` — 첫 옵션 "책 선택 (선택)" (값 `""`)
  이후 `books.map(book => <option value={book.id}>{book.title}</option>)`
- 선택 변경 시 `onChange(selectedValue || undefined)` 호출
- `value`가 `undefined`이면 첫 번째 "선택" 옵션이 선택된 상태
- 스타일: UI_GUIDE 입력 필드 스펙 (`bg-[#2a1f17] border border-[#1a100a] text-[#f4e4c1] px-3 py-2 appearance-none`)
- `<select>` 에 `aria-label="연결할 책"` 부여

### 2. `src/components/diary/DiaryEntryForm.tsx` 수정

- `initialBookId` hidden input(`<input type="hidden" name="bookId" value={initialBookId} />`) 제거
- 대신 `const [bookId, setBookId] = useState<string | undefined>(initialBookId)` 관리
- 폼 안에 `<BookPicker value={bookId} onChange={setBookId} />` 추가 (body textarea 위)
- `bookId`가 있을 때 `<input type="hidden" name="bookId" value={bookId} />`를 form data에 포함
- autosave(`setDiaryDraft`)에 `bookId` 주입 유지 (이미 `initialBookId`를 넘기던 기존 코드를 state 기반으로 교체)
- 편집 모드(`entryId` 있음): `initialBookId`는 기존 엔트리의 bookId로 전달되므로 초기값 그대로 적용
- dirty 감지: `bookId !== initialBookId` 조건도 `isDirty` 계산에 포함

### 3. `src/components/book/BookGrid.tsx` 수정

각 책 카드(`<li>`)에 "이 책으로 일기 쓰기" 링크 추가:

```tsx
<Link
  href={`/diary/new?bookId=${book.id}` as never}
  className="text-xs text-[#a08866] hover:text-[#d7c199] transition-colors duration-100 ease-linear"
  onClick={(e) => e.stopPropagation()}
>
  일기 쓰기
</Link>
```

위치: 책 제목 아래 (GoalProgress 위). 카드 전체가 `/reading/[id]`로 이동하는 Link 안에 있으므로
위 링크는 **카드 Link 바깥에** 별도로 배치하거나, 카드 Link의 `<li>` 형제로 추가한다.
기존 카드 구조를 읽고 가장 자연스러운 위치를 선택한다.

`BookGridHydrator.tsx` (게스트용)도 같은 방식으로 처리한다.

### 4. `src/components/diary/DiaryList.tsx` 수정

연결된 책 제목 표시를 위해 `books` prop 추가:

```ts
interface DiaryListProps {
  entries: DiaryEntry[]
  books?: Book[]        // bookId → title lookup용
}
```

- `booksById = books?.reduce(...) ?? {}` 로 map 생성
- 각 엔트리 카드에 `bookId`가 있고 `booksById[entry.bookId]`가 있으면
  `<span className="text-xs text-[#a08866]">📚 {book.title}</span>` 또는 이모지 없이
  `<span className="text-xs text-[#a08866]">· {book.title}</span>` 표시
  (이모지 금지 — UI_GUIDE. `·` 특수문자는 허용)
- `books` prop이 없으면 기존 렌더 그대로 (하위 호환)

**회원 다이어리 페이지** (`src/app/diary/page.tsx`):
- `ServerDiaryList` 함수에서 `store.listBooks()`도 함께 호출
- `<DiaryList entries={sorted} books={books} />` 로 전달

**게스트 `DiaryListHydrator.tsx`**:
- 기존 `store.listDiaryEntries()` 와 함께 `store.listBooks()` 병렬 호출
- `<DiaryList entries={...} books={books} />` 로 전달

### 5. `src/components/diary/DiaryEntryDetail.tsx` 수정

- `book?: Book` prop 추가 (연결된 책이 없으면 표시 안 함)
- 엔트리 상단에 책 정보 표시:
  ```tsx
  {book && (
    <p className="text-xs text-[#a08866]">· {book.title}</p>
  )}
  ```
- `DiaryEntryDetail`을 사용하는 `/diary/[id]/page.tsx`에서 `book`을 로드하여 전달 (회원: store.getBook, 게스트: DiaryEntryDetailHydrator 패턴)

### 6. 테스트

**`src/components/diary/BookPicker.test.tsx` 신규 생성**:
- 책 없음 케이스: "책장에 책이 없어요" 텍스트 렌더
- 책 있음 케이스: select에 책 제목 옵션 렌더
- 선택 변경 시 `onChange` 호출 확인

**`src/components/diary/DiaryEntryForm.test.tsx` 업데이트**:
- `initialBookId` prop이 있을 때 `BookPicker`에 해당 값 초기화 확인
- bookId 변경 시 dirty 상태 전환 확인

**`src/components/diary/DiaryList.test.tsx` 신규 또는 업데이트**:
- `books` prop 있을 때 연결된 책 제목 표시 확인
- `books` prop 없을 때 기존 렌더 동일 확인

## Acceptance Criteria

```bash
bun test src/components/diary/
bun build
bun lint
```

에러 없음. 기존 테스트 전부 통과 + 신규 케이스 통과.

수동 smoke (시각 검수):
1. 책장에서 책 카드의 "일기 쓰기" 링크 → `/diary/new?bookId=...` 이동 + picker에 해당 책 선택됨
2. 폼에서 다른 책으로 변경 → 저장 → 일기 상세에 변경된 책 표시
3. 게스트/회원 양쪽 모두 동작 확인

## 검증 절차

1. AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - `BookPicker`가 `useStore()`만 사용하고 RemoteStore/LocalStore 구현을 직접 참조하지 않는가?
   - `diary_entries` 스키마 변경 없음 확인 (`bookId?`는 이미 있음)
   - 게스트가 회원 데이터를 못 보는지 확인 (LocalStore 격리)
3. `phases/4-mvp/index.json` step 4 업데이트.
4. 코드 커밋: `feat(4-mvp): step4 — diary-book-linking-ui`
5. 메타 커밋: `chore(4-mvp): step4 output`

## 금지사항

- DB 마이그레이션 작성 금지. `diary_entries.book_id` FK는 이미 존재한다.
- `DiaryEntry` 타입에 필드 추가 금지.
- `RemoteStore` / `LocalStore` 클래스를 직접 import하지 마라. `useStore()` 훅을 통해서만.
- 이모지를 텍스트에 넣지 마라 (`📚` 등). 이유: UI_GUIDE 카피 규칙.
- 책 picker를 Combobox/검색 가능 드롭다운으로 만들지 마라. 이유: MVP4는 native select로 충분. 50권 이상 케이스는 별도 step.
