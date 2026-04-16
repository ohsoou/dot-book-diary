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