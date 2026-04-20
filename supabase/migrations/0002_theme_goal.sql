-- MVP1: 테마 선호도(profiles.theme_preference) + 목표 완독일(books.target_date) 추가

alter table profiles
  add column theme_preference text not null default 'system'
    check (theme_preference in ('system', 'day', 'night'));

alter table books
  add column target_date date null;

alter table books
  add constraint books_target_date_check
    check (target_date is null or created_at::date <= target_date);
