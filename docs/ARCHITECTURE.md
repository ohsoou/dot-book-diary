# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                    # 도트 방 메인
│   ├── diary/
│   │   ├── page.tsx                # 엔트리 리스트
│   │   ├── new/page.tsx            # 작성
│   │   └── [id]/page.tsx           # 상세/편집
│   ├── bookshelf/page.tsx          # 책 그리드
│   ├── book-calendar/page.tsx      # 월 달력
│   ├── add-book/page.tsx           # 바코드/검색 탭
│   ├── reading/[bookId]/page.tsx   # 독서 세션
│   ├── settings/page.tsx
│   ├── login/page.tsx
│   └── api/
│       └── books/
│           ├── search/route.ts     # 알라딘 키워드 검색 프록시
│           └── isbn/route.ts       # 알라딘 ISBN 단건 조회 프록시
├── components/
│   ├── room/                       # RoomScene, Bear, DiaryHitbox, BooksHitbox, Window, Lamp
│   ├── ui/                         # Button, Card, PixelFrame, ToggleTabs
│   ├── calendar/                   # MonthGrid, DayCell
│   └── book/                       # BookCover, BookForm, BarcodeScanner
├── lib/
│   ├── supabase/                   # server.ts, client.ts (쿠키 기반 세션)
│   ├── storage/                    # Store 인터페이스 + LocalStore + RemoteStore
│   ├── barcode.ts                  # @zxing/browser 래퍼
│   └── aladin.ts                   # 알라딘 Open API 클라이언트 (서버 전용)
├── types/                          # Book, ReadingSession, DiaryEntry
└── services/                       # 외부 API 래퍼가 여러 개로 늘면 여기로 이동

public/
├── sprites/                        # room.png, bear.png, diary.png, books.png, window.png, lamp.png
└── fonts/galmuri/                  # Galmuri11-Regular.woff2
```

## 패턴
- **Server Components 기본.** 클라이언트 인터랙션(hitbox 네비게이션, 바코드 카메라, 캘린더 월 이동, 폼)에만 `"use client"`.
- **Store 인터페이스 단일화.** `lib/storage/Store.ts`에 `findBooks()`, `addBook()`, `addReadingSession()`, `listDiaryEntries()` 등 메서드를 정의. 비회원은 `LocalStore`(IndexedDB, `idb-keyval`), 회원은 `RemoteStore`(Supabase). `lib/storage/index.ts`의 factory가 Supabase 세션 유무로 구현을 선택한다.
- **API 라우트는 프록시 전용.** 비즈니스 로직은 `lib/aladin.ts`에 두고, `app/api/books/*/route.ts`는 입력 검증 + 호출 + 응답 정규화만 담당.
- **Supabase 클라이언트 분리.** `lib/supabase/server.ts`(RSC/route handler용, cookies 기반)와 `lib/supabase/client.ts`(Client Component용)를 분리. `@supabase/ssr` 사용.

## 데이터 흐름

### 회원 (RemoteStore 주입)
```
Client Component → Server Action / Route Handler
                 → lib/storage/RemoteStore
                 → Supabase Postgres (RLS: user_id = auth.uid())
                 → 응답 → Server Component 리렌더
```

### 비회원 (LocalStore 주입)
```
Client Component → lib/storage/LocalStore
                 → IndexedDB (idb-keyval)
                 → 동일 shape의 메모리 응답 → UI 업데이트
```

### 책 검색 (공통)
```
Client `/add-book` → fetch('/api/books/search?q=...')
                   → app/api/books/search/route.ts
                   → lib/aladin.ts (TTB 키는 process.env.ALADIN_TTB_KEY)
                   → 정규화된 BookSearchResult[] → 선택 시 Store.addBook()
```

## 상태 관리
- **서버 상태**: Server Components + Server Actions. 회원 데이터는 Supabase가 source of truth.
- **클라이언트 상태**: `useState`/`useReducer`. 전역 스토어(Zustand/Redux 등) 도입 금지 — MVP 스코프에 과함.
- **세션 상태**: Supabase SSR 쿠키. Route Handler/Server Component에서 `createClient()`로 읽는다.
- **비회원 상태**: IndexedDB가 source of truth. 페이지 로드 시 Client Component가 `LocalStore`에서 읽어 `useState`에 주입.

## 데이터 모델 (Postgres, RLS on)
```sql
create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  isbn text,
  title text not null,
  author text,
  publisher text,
  cover_url text,
  total_pages int,
  created_at timestamptz default now()
);

create table reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  book_id uuid references books(id) on delete cascade not null,
  read_date date not null,
  start_page int,
  end_page int,
  duration_minutes int,
  created_at timestamptz default now()
);

create table diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  book_id uuid references books(id) on delete set null,
  entry_type text check (entry_type in ('quote','review')) not null,
  body text not null,
  page int,
  created_at timestamptz default now()
);
```
모든 테이블에 `enable row level security` + `create policy "..." using (auth.uid() = user_id) with check (auth.uid() = user_id)` 적용.

`LocalStore`는 동일 TypeScript shape(`types/`)를 IndexedDB key별 배열로 저장한다. `id`는 `crypto.randomUUID()`.
