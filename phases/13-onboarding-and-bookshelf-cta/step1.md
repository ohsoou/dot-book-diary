# Step 1: bookshelf-add-book-cta

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/PRD.md` — §4.1 라우트 맵, §8.2 빈 상태 카피 테이블
- `docs/UI_GUIDE.md` — §Button(Primary), §레이아웃, §타이포그래피, §금지 사항
- `docs/ARCHITECTURE.md` — §2 디렉토리 구조, §5.1 Server Components 기본
- `CLAUDE.md` — CRITICAL 규칙 3가지, 임포트 경로(`@/`)
- `src/app/bookshelf/page.tsx` — 현재 회원/비회원 두 분기 구조
- `src/components/book/BookGrid.tsx` — EmptyState CTA 패턴 확인
- `src/components/ui/EmptyState.tsx` — CTA 구현 방식

이전 step에서 생성된 파일:
- `docs/PRD.md` (step 0에서 갱신됨)
- `docs/UI_GUIDE.md` (step 0에서 갱신됨)

## 배경

현재 `/bookshelf`에 책이 1권 이상 있으면 `/add-book` 진입점이 화면에서 완전히 사라진다. 사용자가 다음 책을 추가하려면 홈으로 돌아가 책더미 hitbox를 찾아야 한다. 이 step은 헤더 우측에 상시 노출되는 Primary 링크 버튼 하나를 추가하여 이 문제를 해결한다.

**레이아웃 결정**: h1 "책장" 왼쪽, "책 등록" 링크 버튼 오른쪽의 `flex justify-between` 헤더. 회원/비회원 두 분기 모두 동일한 헤더로 통일한다.

## 작업

### 1. `src/app/bookshelf/page.tsx` 수정

**회원 분기**의 `<h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>`를 아래 헤더 블록으로 교체한다:

```tsx
<header className="flex items-center justify-between mb-6">
  <h1 className="text-base text-[#f4e4c1]">책장</h1>
  <Link
    href={'/add-book' as never}
    className="text-sm px-3 py-2 bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] active:translate-y-px transition-colors duration-100 ease-linear"
  >
    책 등록
  </Link>
</header>
```

**비회원 분기** (BookGridHydrator를 렌더하는 `<main>`)도 동일하게 헤더를 교체한다.

파일 최상단에 `import Link from 'next/link'`를 추가한다(아직 없는 경우).

### 2. `src/components/book/BookGrid.tsx` — 변경 없음

책 0권일 때의 `EmptyState` CTA("첫 책 등록하기" → `/add-book`)는 **그대로 유지**한다. 두 위치의 의도가 다르다:
- 헤더 버튼: 상시 등록 진입점
- EmptyState CTA: 빈 책장 정서 카피 + 행동 유도

둘 다 필요하며 중복이 아니다.

### 3. `src/app/bookshelf/page.test.tsx` 신규 작성

아래 최소 3개 케이스를 포함한다:

**모킹 패턴** (`src/app/page.test.tsx` 참조):
```ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/storage', () => ({
  getStore: vi.fn(),
}))
```

**케이스**:
1. 회원 분기 — 헤더에 `href="/add-book"` Link가 노출됨
2. 비회원 분기 — 동일한 헤더 Link가 노출됨 (`BookGridHydrator` path)
3. 헤더 Link의 텍스트가 "책 등록"임

**회원 분기 렌더 패턴**:
```ts
// createClient → getUser: { user: { id: '...' } }
// getStore → { listBooks: () => [], listReadingSessions: () => [] }
const { default: BookshelfPage } = await import('./page')
const jsx = await BookshelfPage()
render(jsx as React.ReactElement)
expect(screen.getByRole('link', { name: '책 등록' })).toHaveAttribute('href', '/add-book')
```

**비회원 분기 렌더 패턴**:
```ts
// createClient → getUser: { user: null }
const { default: BookshelfPage } = await import('./page')
const jsx = await BookshelfPage()
render(jsx as React.ReactElement)
expect(screen.getByRole('link', { name: '책 등록' })).toHaveAttribute('href', '/add-book')
```

`next/navigation`, `next/link` 모킹이 필요하면 `vitest.setup.ts` 또는 파일 내 `vi.mock` 추가(기존 page.test.tsx 패턴 참조).

## Acceptance Criteria

```bash
bun run build && bun lint && bun run test
```

신규 bookshelf 테스트 3건 통과. 기존 테스트 회귀 없음.

## 검증 절차

1. AC 커맨드 실행.
2. `bun dev` 후 `/bookshelf`에서 헤더 우측 "책 등록" 버튼 수동 확인.
   - 책 0권: EmptyState CTA와 헤더 버튼 **둘 다** 보여야 함.
   - 책 N권: 헤더 버튼만 보임(EmptyState 숨김).
   - 클릭 시 `/add-book` 이동 확인.
3. UI_GUIDE 금지 패턴 grep:
   ```bash
   rg -n "rounded-|backdrop-blur|bg-gradient|indigo|purple" src/app/bookshelf/
   ```
   0건이어야 함.
4. 결과에 따라 `phases/13-onboarding-and-bookshelf-cta/index.json`의 step 1 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "bookshelf 헤더에 /add-book Primary Link 추가, 테스트 3건 통과"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
5. 커밋:
   - `feat(13-onboarding-and-bookshelf-cta): step 1 — bookshelf-add-book-cta`
   - `chore(13-onboarding-and-bookshelf-cta): step 1 output`

## 금지사항

- `BookGrid.tsx`의 EmptyState CTA를 제거하지 마라. 이유: PRD §8.2 빈 상태 정서 카피의 역할이 있다.
- `<button onClick={() => router.push('/add-book')}>` 사용 금지. 이유: 단순 내비게이션은 RSC prefetch가 가능한 `<Link>`가 더 가볍고 의미론적으로 맞다.
- `rounded-*`, `backdrop-blur`, `gradient` 사용 금지 (UI_GUIDE §AI 슬롭 안티패턴).
- `src/app/add-book/page.tsx` 또는 `src/components/book/AddBookTabs.tsx`는 수정하지 마라. 이유: 이 step의 범위 밖이다.
- 기존 테스트를 깨뜨리지 마라.
