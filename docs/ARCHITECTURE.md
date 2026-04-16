# 아키텍처

## 0. 목표와 비목표

### 0.1 목표
- 회원/비회원이 동일한 코드 경로로 동일한 UX를 받는다.
- 외부 API 키 노출 0, 서버 측 검증 예외 0.
- Server Components 중심으로 초기 로드 JS를 최소화한다.
- 도트 방 정체성을 저해하는 어떤 라이브러리·패턴도 받아들이지 않는다.

### 0.2 비목표
- 전역 클라이언트 상태 스토어
- 범용 컴포넌트 라이브러리(shadcn 등)
- 오프라인 동기화 큐 (v1.1)
- 실시간(pub/sub) 기능

## 1. 시스템 개요
```
┌──────────────┐    HTTPS     ┌─────────────────────────────────────────┐
│   Browser    │◄────────────►│           Next.js 15 (Vercel)            │
│              │              │                                          │
│  RSC + CSR   │              │  app/                                    │
│  IndexedDB   │              │   ├─ (page.tsx ... RSC)                  │
│   (guest)    │              │   ├─ error.tsx / loading.tsx / 404       │
└─────┬────────┘              │   ├─ api/books/{search,isbn}/route.ts    │
      │                       │   └─ auth/callback/route.ts              │
      │                       │  middleware.ts (Supabase session refresh)│
      │                       │  lib/{aladin,supabase,storage,...}       │
      │                       └──────────┬───────────────────────┬──────┘
      │                                  │                       │
      │                                  ▼                       ▼
      │                         ┌───────────────┐      ┌────────────────┐
      │                         │  Supabase     │      │  Aladin Open   │
      └────────────────────────►│  (Auth+PG+    │      │  API (ItemSearch│
               (cookie)         │   Storage)    │      │   ItemLookUp)  │
                                │   RLS on      │      │                │
                                └───────────────┘      └────────────────┘
```

## 2. 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx                  # <html lang="ko"> + globals.css + 폰트 preload
│   ├── page.tsx                    # 도트 방 메인 (RSC → RoomScene Client)
│   ├── error.tsx                   # 루트 에러 경계
│   ├── global-error.tsx            # layout 자체 실패 폴백
│   ├── not-found.tsx
│   ├── loading.tsx
│   ├── globals.css
│   ├── sitemap.ts                  # 정적 routes만
│   ├── robots.ts
│   ├── diary/
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   ├── bookshelf/
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   └── loading.tsx
│   ├── book-calendar/page.tsx
│   ├── add-book/page.tsx
│   ├── reading/[bookId]/
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   └── loading.tsx
│   ├── settings/page.tsx
│   ├── login/page.tsx
│   ├── auth/
│   │   └── callback/route.ts       # OAuth/매직링크 code 교환
│   └── api/
│       └── books/
│           ├── search/route.ts
│           └── isbn/route.ts
├── components/
│   ├── room/
│   │   ├── RoomScene.tsx           # Client
│   │   ├── Bear.tsx                # 장식 sprite
│   │   ├── Hitbox.tsx              # 접근성 처리된 <button>
│   │   ├── Lamp.tsx
│   │   └── Window.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── PixelFrame.tsx          # 1px hard border 래퍼
│   │   ├── ToggleTabs.tsx
│   │   ├── Toast.tsx               # ToastProvider + useToast
│   │   ├── ConfirmDialog.tsx
│   │   ├── Modal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Skeleton.tsx
│   │   ├── FieldError.tsx
│   │   ├── GuestBanner.tsx
│   │   └── UnsupportedEnvScreen.tsx
│   ├── calendar/
│   │   ├── MonthGrid.tsx
│   │   └── DayCell.tsx
│   ├── diary/
│   │   └── DiaryEntryForm.tsx
│   └── book/
│       ├── BookCover.tsx
│       ├── BookGrid.tsx
│       ├── AddBookTabs.tsx
│       ├── BarcodeScanner.tsx
│       ├── BookSearchForm.tsx
│       └── ReadingSessionForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient + cookies()
│   │   ├── client.ts               # createBrowserClient
│   │   └── middleware.ts           # updateSession util
│   ├── storage/
│   │   ├── Store.ts                # 인터페이스
│   │   ├── LocalStore.ts
│   │   ├── RemoteStore.ts
│   │   ├── index.ts                # getStore() / useStore()
│   │   ├── keys.ts                 # IndexedDB 키 상수
│   │   └── preferences.ts          # guest preferences + diary draft
│   ├── env.ts                      # zod 검증
│   ├── validation.ts               # zod 도메인 스키마
│   ├── errors.ts                   # AppError + code
│   ├── isbn.ts                     # ISBN-10 ↔ 13
│   ├── barcode.ts                  # @zxing/browser 래퍼
│   ├── aladin.ts                   # server-only
│   ├── date.ts                     # YYYY-MM-DD, 로컬 타임존
│   ├── escape.ts                   # HTML 이스케이프
│   ├── actions/                    # Server Actions
│   │   ├── books.ts
│   │   ├── reading-sessions.ts
│   │   ├── diary-entries.ts
│   │   └── profile.ts
│   └── log.ts                      # console 래퍼
├── middleware.ts                   # Supabase 세션 refresh
├── types/
│   ├── index.ts                    # Book, ReadingSession, DiaryEntry, BookSearchResult, Profile
│   └── store.ts
└── (services/)                     # 외부 API 추가 시 이관

public/
├── sprites/night/                  # room.png, bear.png, diary.png, books.png, window.png, lamp.png, rug.png
└── fonts/galmuri/                  # Galmuri11-Regular.woff2

supabase/
└── migrations/
    └── 0001_init.sql               # tables + indexes + CHECK + updated_at 트리거 + RLS + profiles + handle_new_user
```

## 3. 모듈 의존성 규칙
상위(`app/`, `components/`)는 하위(`lib/`)를 import할 수 있지만 역방향은 금지. 계층 순서:

```
app/               (routes + Server Actions wiring)
  ↓
components/        (UI)
  ↓
lib/actions/       (Server Actions)
  ↓
lib/storage/       (Store 인터페이스 + 구현)
  ↓
lib/supabase/ , lib/validation/ , lib/errors/ , lib/aladin/
  ↓
lib/env/ , lib/isbn/ , lib/date/ , lib/escape/ , lib/log/
  ↓
types/
```

규칙:
- `lib/storage` 안에서 `lib/aladin`을 import 금지(Store는 외부 API를 모른다).
- `components/`에서 `lib/supabase/server.ts` import 금지(client-only 경계).
- `components/`에서 `lib/aladin.ts` import 금지(server-only 경계).
- 테스트 파일은 대상 파일과 같은 디렉토리에 `*.test.ts(x)`로 colocation.

## 4. 파일·명명 규약
| 대상 | 규칙 | 예 |
|------|------|-----|
| 컴포넌트 파일 | PascalCase | `BookSearchForm.tsx` |
| 컴포넌트 export | `export default function BookSearchForm()` | — |
| 훅 | `use` 접두, camelCase | `useStore`, `useToast` |
| 유틸 파일 | kebab 또는 단일 단어 | `isbn.ts`, `date.ts` |
| Server Action 파일 | kebab-case 도메인 복수 | `books.ts`, `diary-entries.ts` |
| 타입 | PascalCase, 전용 파일 | `types/index.ts` |
| zod 스키마 | `camelCaseSchema` | `diaryEntrySchema` |
| 테스트 | `*.test.ts(x)` colocation | `BookCover.test.tsx` |
| 환경변수 | 서버 전용은 접두 없이, 브라우저는 `NEXT_PUBLIC_` | `ALADIN_TTB_KEY`, `NEXT_PUBLIC_SUPABASE_URL` |
| import alias | `@/...` → `src/...` | `import { Store } from '@/lib/storage/Store'` |

## 5. 패턴

### 5.1 Server Components 기본
클라이언트 인터랙션이 필요한 곳만 `"use client"`: RoomScene, 폼, BarcodeScanner, MonthGrid(월 이동), Toast/Modal Provider.

### 5.2 Store 인터페이스 단일화
회원/비회원은 `getStore()`(서버) 또는 `useStore()`(클라이언트) 어느 한 진입점으로만 얻는다. 직접 `new LocalStore()`, `new RemoteStore()` 호출 금지(팩토리 테스트 예외).

### 5.3 Server Action + React 19 `useActionState`
- 폼은 `<form action={serverAction}>` 기반.
- Client 폼은 `useActionState`로 에러/결과를 받아 FieldError/토스트에 연결.
- 실패 시 Server Action은 `{ error: { code, message, fieldErrors? } }` 반환(throw 대신). 예외는 `error.tsx` 경계로.
- 회원 쓰기 폼은 반드시 Server Action을 호출한다. Client Component가 `RemoteStore`를 직접 호출하지 않는다.
- 비회원 쓰기 폼은 `useStore()` 또는 `preferences.ts`를 호출하되, 반환 shape는 `ActionResult<T>`로 맞춰 같은 폼 UI가 재사용되게 한다.

### 5.4 검증 규약
- 서버 경계(Server Action, Route Handler, LocalStore의 모든 write)는 `lib/validation.ts`의 zod 스키마로 `parse`.
- Client 폼은 `safeParse`로 제출 전 검증하여 빠른 피드백.
- 동일 스키마를 양쪽에서 재사용(ADR-008).

### 5.5 에러 처리
- Server Component: `throw` → 가장 가까운 `error.tsx` 경계.
- Route Handler: `{ error: { code, message } }` + HTTP status.
- Server Action: 리턴 타입에 에러 포함(throw 안 함). 단, 프로그래머 실수는 throw.
- Client: try/catch → 토스트 + 인라인 에러.

### 5.6 캐싱·재검증
- 읽기: Server Component + Next 기본 fetch cache.
- 외부 API: `fetch(url, { next: { revalidate: 60 } })`.
- 쓰기: Server Action 성공 후 `revalidatePath(...)` 해당 라우트.

### 5.7 로딩
- 각 라우트에 `loading.tsx` + Suspense 경계.
- Client 폼은 `useFormStatus`로 pending 상태 노출 → 버튼 비활성 + 스피너 대신 텍스트 `...`.

### 5.8 최적화 업데이트
- 단순 리스트 추가/삭제는 Server Action + `revalidatePath`만. React 19 `useOptimistic`은 도입하지 않는다(MVP 단순성).

## 6. 데이터 흐름 (시퀀스)

### 6.1 책 등록 (회원)
```
Client AddBookTabs
  └─> BookSearchForm.submit (client)
        └─> fetch('/api/books/search?q=...')  (60s cache)
              └─> searchRoute(zod.parse) → lib/aladin.searchByKeyword → Aladin
        ← { data: BookSearchResult[] }
  ← render results
사용자: "추가" 클릭
  └─> <form action={addBookAction}>  (Server Action)
        ├─ zod.parse(input)
        ├─ RemoteStore.findBookByIsbn → 중복이면 { error: DUPLICATE_ISBN }
        ├─ RemoteStore.addBook → Supabase insert (RLS)
        ├─ revalidatePath('/bookshelf')
        └─ return { ok: true, data: book }
  ← router.push('/bookshelf')
```

### 6.2 책 등록 (비회원)
```
Client AddBookTabs
  └─> BookSearchForm (동일)
사용자: "추가" 클릭
  └─> localAddBookAction(input)   // 내부에서 useStore().addBook(input) 호출
        ├─ zod.parse(input)
        ├─ LocalStore.findBookByIsbn → 중복이면 throw AppError('DUPLICATE_ISBN')
        ├─ LocalStore.addBook → idb-keyval set
        └─ return { ok: true, data: book }
  ← router.push('/bookshelf')
```

### 6.3 독서 세션 추가
```
Client ReadingSessionForm
  └─> <form action={addReadingSessionAction}>
        ├─ zod.parse (pageRange, readDate ≤ today)
        ├─ Store.addReadingSession
        ├─ revalidatePath(`/reading/${bookId}`)
        ├─ revalidatePath('/book-calendar')
        └─ return { ok: true }
```

### 6.4 로그인 (매직링크)
```
Client /login
  └─> supabase.auth.signInWithOtp({ email, emailRedirectTo: `${origin}/auth/callback` })
        (메일 발송)
사용자가 링크 클릭
  └─> GET /auth/callback?code=...
        ├─ supabase.auth.exchangeCodeForSession(code)
        ├─ profiles upsert (fallback: handle_new_user 트리거가 이미 생성)
        └─ redirect('/')
실패 시:
  - 매직링크/OTP 교환 실패 → redirect('/login?error=link_expired')
  - OAuth provider callback 실패 → redirect('/login?error=oauth_failed')
  - profiles upsert fallback 실패 → redirect('/login?error=profile_setup_failed')
```

### 6.5 세션 만료
```
모든 요청 → middleware.ts
  └─> updateSession(request)
        ├─ 성공 → response (쿠키 refresh)
        └─ 실패 → response (페이지는 비회원 모드로 통과, 인증이 필요한 쓰기만 UNAUTHORIZED)
```

## 7. 세션·스토어 전환
| 시나리오 | 동작 |
|----------|------|
| 비회원 첫 진입 | LocalStore, 배너 노출 |
| 비회원 → 로그인 | RemoteStore, LocalStore는 `localArchived=true`로 숨김, 업로드·삭제 없음 |
| 로그인 → 로그아웃 | LocalStore로 복귀하되 `localArchived=true` 유지 |
| 탭 A 회원 + 탭 B 비회원 | 독립 동작, 알림 없음 |
| 세션 refresh 실패 | 페이지는 비회원 모드로 통과, 인증이 필요한 쓰기 동작만 `UNAUTHORIZED` |
| 세션 refresh 성공 | 개입 없음 |

## 8. 상태 관리
- 서버 상태: Server Component + Server Action. 회원 데이터 source of truth는 Supabase.
- 클라이언트 상태: `useState`/`useReducer`. 전역 스토어(Zustand/Redux/Jotai) 금지.
- 세션 상태: Supabase SSR 쿠키. `createServerClient()`로 조회.
- 비회원 상태: IndexedDB가 source of truth.
- 토스트/모달: Context Provider(ToastProvider)로 최소 전역 상태만.

### 8.1 혼합 렌더링 패턴 (member/server + guest/client)
- 대상 라우트: `/bookshelf`, `/reading/[bookId]`, `/diary`, `/book-calendar`, `/settings`.
- 서버 셸은 항상 세션 존재 여부만 판단하고, 회원 분기에서는 Server Component가 `getStore()`/Server Action으로 데이터를 읽는다.
- 비회원 분기에서는 서버가 LocalStore를 직접 읽지 않는다. 대신 Client hydrator가 mount 후 `useStore()`와 `preferences.ts`를 통해 IndexedDB 데이터를 읽는다.
- 같은 화면의 UI shape와 빈 상태 카피는 회원/비회원이 동일해야 한다. 분기 차이는 데이터 획득 위치에만 둔다.
- 구현자 재량으로 `page.tsx` 전체를 client로 올리지 않는다. 서버 셸 + guest client leaf 패턴을 기본으로 한다.

## 9. 데이터 모델 (Postgres, RLS on)

### 9.1 스키마
```sql
create extension if not exists "pgcrypto";

-- 프로필 (닉네임 저장 공간)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname is null or char_length(nickname) between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  isbn text,
  title text not null check (char_length(title) between 1 and 500),
  author text check (char_length(coalesce(author, '')) <= 300),
  publisher text check (char_length(coalesce(publisher, '')) <= 300),
  cover_url text,
  total_pages int check (total_pages is null or total_pages > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index books_user_isbn_unique
  on books(user_id, isbn)
  where isbn is not null;
create index books_user_created_idx on books(user_id, created_at desc);

create table reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  read_date date not null,
  start_page int check (start_page is null or start_page >= 0),
  end_page int check (end_page is null or end_page >= 0),
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_page is null or end_page is null or end_page >= start_page)
);
create index reading_sessions_user_date_idx on reading_sessions(user_id, read_date);
create index reading_sessions_book_idx on reading_sessions(book_id);

create table diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  entry_type text not null check (entry_type in ('quote','review')),
  body text not null check (char_length(body) between 1 and 5000),
  page int check (page is null or page >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diary_entries_user_created_idx on diary_entries(user_id, created_at desc);
create index diary_entries_book_idx on diary_entries(book_id);

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at        before update on profiles
  for each row execute function set_updated_at();
create trigger books_set_updated_at           before update on books
  for each row execute function set_updated_at();
create trigger reading_sessions_set_updated_at before update on reading_sessions
  for each row execute function set_updated_at();
create trigger diary_entries_set_updated_at   before update on diary_entries
  for each row execute function set_updated_at();

-- 신규 가입 시 profiles 자동 생성
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- RLS
alter table profiles         enable row level security;
alter table books            enable row level security;
alter table reading_sessions enable row level security;
alter table diary_entries    enable row level security;

-- 정책 (각 테이블 select/insert/update/delete 4종, auth.uid() = user_id)
create policy profiles_select on profiles for select using (auth.uid() = user_id);
create policy profiles_insert on profiles for insert with check (auth.uid() = user_id);
create policy profiles_update on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_delete on profiles for delete using (auth.uid() = user_id);

create policy books_select on books for select using (auth.uid() = user_id);
create policy books_insert on books for insert with check (auth.uid() = user_id);
create policy books_update on books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy books_delete on books for delete using (auth.uid() = user_id);

create policy reading_sessions_select on reading_sessions for select using (auth.uid() = user_id);
create policy reading_sessions_insert on reading_sessions for insert with check (auth.uid() = user_id);
create policy reading_sessions_update on reading_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reading_sessions_delete on reading_sessions for delete using (auth.uid() = user_id);

create policy diary_entries_select on diary_entries for select using (auth.uid() = user_id);
create policy diary_entries_insert on diary_entries for insert with check (auth.uid() = user_id);
create policy diary_entries_update on diary_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy diary_entries_delete on diary_entries for delete using (auth.uid() = user_id);
```

### 9.2 LocalStore 매핑
- IndexedDB 키: `dbd:books`, `dbd:reading_sessions`, `dbd:diary_entries`, `dbd:preferences`, `dbd:schema_version`, `dbd:diary_draft:{entryId|new}`.
- `dbd:preferences` shape: `{ nickname?: string; localArchived?: boolean; guestBannerDismissed?: boolean }`.
- `id` = `crypto.randomUUID()`. 미지원 브라우저는 `UnsupportedEnvScreen`로 차단.
- `createdAt`/`updatedAt` = `new Date().toISOString()`.
- 쓰기는 전체 배열 재쓰기(last-write-wins). 탭 충돌 알림 없음.
- `dbd:schema_version = 1`. 향후 마이그레이션은 부팅 훅에서 버전 비교 → 변환.
- LocalStore도 Store 호출 전 zod parse(서버와 대칭).

## 10. Store 인터페이스
```ts
import type { Book, ReadingSession, DiaryEntry } from '@/types';

export interface Store {
  // books
  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  findBookByIsbn(isbn: string): Promise<Book | null>;
  addBook(input: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book>;
  updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Book>;
  deleteBook(id: string): Promise<void>;

  // reading sessions
  listReadingSessions(filter?: { bookId?: string; from?: string; to?: string }): Promise<ReadingSession[]>;
  getReadingSession(id: string): Promise<ReadingSession | null>;
  addReadingSession(input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReadingSession>;
  updateReadingSession(id: string, patch: Partial<Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ReadingSession>;
  deleteReadingSession(id: string): Promise<void>;

  // diary entries
  listDiaryEntries(filter?: { bookId?: string; entryType?: DiaryEntry['entryType'] }): Promise<DiaryEntry[]>;
  getDiaryEntry(id: string): Promise<DiaryEntry | null>;
  addDiaryEntry(input: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiaryEntry>;
  updateDiaryEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DiaryEntry>;
  deleteDiaryEntry(id: string): Promise<void>;
}
```

## 10.1 Guest preferences / draft 인터페이스
`Store`는 책·세션·다이어리 도메인만 담당한다. 비회원 전용 preference와 draft는 별도 레이어로 분리한다.

```ts
export type GuestPreferences = {
  nickname?: string;
  localArchived?: boolean;
  guestBannerDismissed?: boolean;
};

export interface GuestPreferencesStore {
  getPreferences(): Promise<GuestPreferences>;
  updatePreferences(patch: Partial<GuestPreferences>): Promise<GuestPreferences>;
  getDiaryDraft(key: string): Promise<DiaryDraft | null>;
  setDiaryDraft(key: string, draft: DiaryDraft): Promise<void>;
  clearDiaryDraft(key: string): Promise<void>;
}

export type DiaryDraft = {
  entryType: 'quote' | 'review';
  body: string;
  bookId?: string;
  page?: number;
};
```

- 회원 닉네임은 `profiles.nickname`으로 저장하고, 비회원 닉네임/배너 상태/로컬 아카이브 플래그/다이어리 draft는 `preferences.ts`가 담당한다.
- 로그인 성공 시 `preferences.ts.updatePreferences({ localArchived: true })`를 호출하고 기존 LocalStore 데이터는 삭제하지 않는다.

## 11. 에러 처리 규약

### 11.1 도메인 에러
```ts
// src/lib/errors.ts
export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'DUPLICATE_ISBN'
  | 'UPSTREAM_FAILED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UNSUPPORTED_ENV';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 11.2 HTTP 매핑 (라우트 핸들러)
| 코드 | HTTP |
|------|------|
| VALIDATION_FAILED | 400 |
| UNAUTHORIZED | 401 |
| NOT_FOUND | 404 |
| DUPLICATE_ISBN | 409 |
| RATE_LIMITED | 429 |
| UPSTREAM_FAILED | 502 |
| (그 외) | 500 |

응답: `{ error: { code, message } }`. 빈 배열·null이 의미 있는 응답은 200 유지.

### 11.3 Server Action 반환
```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string> } };
```
예외는 `error.tsx` 경계로. 예측 가능한 사용자 오류는 반환으로 표면화.

### 11.4 Client 매핑
- 폼: `useActionState`로 `ActionResult` 수신 → 필드 에러는 `FieldError`에, 전역 에러는 토스트.
- 일반 Client fetch 실패: `useToast().error(message)`.
- 권한 실패: `/login?reason=expired`.
- `/api/books/search`, `/api/books/isbn` 성공 응답은 항상 `{ data: ... }`, 실패 응답은 항상 `{ error: { code, message } }`를 사용한다.

## 12. 입력 검증 규약
- 모든 외부 경계에서 zod `parse`.
- Server Action 진입점에서 `FormData`를 domain DTO로 변환(`formdata → object → schema.parse`).
- zod 메시지는 한국어 커스텀. `z.string().min(1, { message: '한 글자 이상 입력해 주세요' })`.

## 13. 캐싱·재검증
- `/api/books/search`, `/api/books/isbn`: `fetch(..., { next: { revalidate: 60 } })`.
- 책장/다이어리/캘린더 라우트: 쓰기 성공 후 Server Action에서 `revalidatePath`.
- 라우트별 revalidate 맵:
  | Mutation | revalidatePath |
  |----------|----------------|
  | addBook / updateBook / deleteBook | `/bookshelf`, `/` |
  | addReadingSession / update / delete | `/reading/[bookId]`, `/book-calendar` |
  | addDiaryEntry / update / delete | `/diary`, `/reading/[bookId]` |
  | updateProfile | `/settings` |

## 14. 미들웨어
```ts
// src/middleware.ts
export { middleware } from '@/lib/supabase/middleware';
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sprites|fonts|api/books).*)'],
};
```
- `api/books/*`는 공개 프록시이므로 세션 refresh 불필요.
- 미들웨어는 MVP 필수다. 모든 앱 라우트에서 세션 refresh를 시도한다.
- 페이지 단위 보호 라우트는 MVP에 두지 않는다. 세션 refresh가 실패해도 `/`, `/add-book`, `/bookshelf`, `/diary`, `/book-calendar`, `/reading/*`, `/settings`, `/login`, `/auth/callback`은 통과하고 비회원 모드로 렌더한다.
- 인증이 필요한 쓰기 동작(Server Action, Auth callback 후 profile 보정 등)만 `UNAUTHORIZED` 또는 `/login?reason=expired`로 처리한다.

## 15. 인증·콜백 라우트
- `/login/page.tsx`: 매직링크 입력 + Google OAuth 버튼. 하단에 `?error=...` 해석 영역.
- `/auth/callback/route.ts`: `code` 교환 → 세션 쿠키 설정 → `redirect('/')`.
- 에러 매핑:
  - `code` 없음 또는 OTP/매직링크 교환 실패 → `/login?error=link_expired`
  - OAuth provider callback 자체 실패 또는 provider 에러 파라미터 수신 → `/login?error=oauth_failed`
  - 세션 수립 후 `profiles` upsert fallback 실패 → `/login?error=profile_setup_failed`
- 매직링크 `emailRedirectTo`는 `new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).toString()`.

## 15.1 Unsaved Changes Hook
- `src/lib/hooks/useUnsavedChanges.ts`의 계약은 `useUnsavedChanges(isDirty: boolean): void`로 고정한다.
- `isDirty === true`일 때만 `beforeunload`를 등록하고, cleanup 시 반드시 제거한다.

## 16. 라우팅 + 메타데이터
- `app/layout.tsx`에서 기본 `metadata`:
  ```ts
  export const metadata: Metadata = {
    title: { default: '도트 북 다이어리', template: '%s · 도트 북 다이어리' },
    description: '따뜻한 도트 방에서 쓰는 독서 기록',
    robots: { index: true, follow: true },
    icons: { icon: '/favicon.ico' },
  };
  ```
- 각 주요 라우트는 `export const metadata: Metadata = { title: '...' }`로 page title 지정.
- `app/sitemap.ts`는 정적 라우트만(동적 아이디 미노출).
- `app/robots.ts`는 MVP에서 전체 allow.
- `experimental.typedRoutes: true` 사용.
- OG 이미지는 MVP 미노출(v1.1 픽셀 OG).

## 17. Next.js 설정 (`next.config.ts`)
```ts
const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.aladin.co.kr' }],
  },
  experimental: { typedRoutes: true },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self)' },
        { key: 'Content-Security-Policy', value: [
          "default-src 'self'",
          "img-src 'self' data: https://image.aladin.co.kr",
          "font-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline'",
          "connect-src 'self' https://*.supabase.co",
          "frame-ancestors 'none'",
        ].join('; ') },
      ],
    }];
  },
};
```

## 18. 접근성 베이스라인
- Tab 순서(메인 방): 다이어리 → 책장 → 캘린더 → 책 등록 → 설정.
- 포커스 링: 1px hard outline `#e89b5e`. Tailwind: `focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#e89b5e]`.
- `prefers-reduced-motion: reduce`: `@media (prefers-reduced-motion: reduce) { .bear-idle, .lamp-flicker { animation: none !important; } }`.
- 색 대비 검증: 보조 텍스트 `#a08866` on `#2a1f17`은 구현 후 실측. 미달 시 `#b99a72`로 조정 예비값.
- `aria-live="polite"` 토스트 컨테이너.
- 모달 오픈 시 focus trap + Esc 닫기 + 배경 스크롤 lock.
- 라이트하우스 A11y ≥ 95를 PR 체크리스트로.

## 19. 환경변수
`src/lib/env.ts`에서 zod parse. 누락 시 부팅 실패.
```ts
// server only
export const serverEnv = z.object({
  ALADIN_TTB_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
}).parse(process.env);

// client safe
export const clientEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_FF_SYNC_GUEST_DATA: z.enum(['true', 'false']).default('false'),
}).parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_FF_SYNC_GUEST_DATA: process.env.NEXT_PUBLIC_FF_SYNC_GUEST_DATA,
});
```

## 20. 보안 헤더·쿠키
- CSP: §17. 알라딘 이미지 도메인 명시. 인라인 스타일/스크립트는 Next.js 내부 필요상 허용.
- 쿠키: Supabase SSR이 HttpOnly + Secure + SameSite=Lax로 설정. 커스텀 쿠키 없음.
- CORS: API 라우트는 same-origin만. CORS 헤더 추가하지 않음.
- 경로 traversal: 라우트 핸들러에서 `new URL(...)`로 파싱.

## 21. 폼 패턴
```tsx
// 예: AddBookForm
'use client';
import { useActionState } from 'react';
import { addBookAction } from '@/lib/actions/books';

const initial = { ok: false, error: { code: 'VALIDATION_FAILED', message: '' } } as const;

export default function AddBookForm({ book }: Props) {
  const [state, action, pending] = useActionState(addBookAction, initial);
  return (
    <form action={action}>
      <input name="title" required />
      <FieldError message={state.error?.fieldErrors?.title} />
      <button type="submit" disabled={pending}>{pending ? '저장 중...' : '내 책장에 담기'}</button>
      {state.error && !state.error.fieldErrors && <Toast>{state.error.message}</Toast>}
    </form>
  );
}
```
- 비회원은 `<form onSubmit={...}>`로 LocalStore 호출(Server Action 대신). 공통 인터페이스는 `handleSubmit(values)` 추상.
- 이탈 보호: 편집 폼은 `useUnsavedChanges()`로 `beforeunload`를 연결하고, `preferences.ts`의 draft API로 30초 autosave를 함께 구현한다. 저장 성공/삭제 성공 시 draft를 제거한다.

## 22. 날짜·타임존 (`lib/date.ts`)
- 저장 포맷: `YYYY-MM-DD` 문자열(로컬 기준).
- 생성: `new Date()` → `formatLocalYmd(date)` — `year-month-day` 패딩 수동.
- 비교: 문자열 사전식 비교 가능(ISO 특성).
- 캘린더: `getMonthMatrix(year, month, weekStartsOn=0)` → 6주 2D 배열(앞/뒤 빈칸 포함).
- 외부 라이브러리(date-fns/dayjs/luxon) 도입 금지.

## 23. 관측·로깅 (`lib/log.ts`)
```ts
export const log = {
  info:  (msg: string, meta?: object) => console.info(msg, meta),
  warn:  (msg: string, meta?: object) => console.warn(msg, meta),
  error: (msg: string, cause?: unknown, meta?: object) => console.error(msg, { cause, ...meta }),
};
```
- 서버: Vercel 로그 자동 수집.
- Client: `log.error`만 사용. 사용자 PII 금지.
- Sentry/OTel: v1.1.

## 24. 테스트 전략
- 단위: `lib/*` 전부 (isbn, date, validation, escape, aladin fetch 모킹, LocalStore fake-indexeddb, errors).
- 컴포넌트: `BookSearchForm`, `DiaryEntryForm`, `ReadingSessionForm`, `BookGrid`, `MonthGrid`, `RoomScene` hitbox.
- Server Component: 타입/빌드만으로 충분(유닛 생략).
- 통합 수동: MVP 플로우 §14 출시 기준.
- 모킹 기본: `vi.mock`, `fake-indexeddb/auto`, `global.fetch` 스텁, `next/navigation` 스텁.
- 커버리지 목표: `lib/` 80%+, 컴포넌트 60%+.
