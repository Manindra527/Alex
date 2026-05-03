-- PLANNER ENTRIES: one row per planned study session
create table if not exists public.planner_entries (
  user_id uuid references auth.users(id) on delete cascade,
  id text not null,
  entry_date date not null,
  start_time time not null,
  duration_minutes integer not null,
  subject text not null,
  topic text,
  session_type text not null,
  completed boolean default false,
  postponed_from_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

alter table public.planner_entries enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_planner_entries_updated_at on public.planner_entries;

create trigger set_planner_entries_updated_at
before update on public.planner_entries
for each row
execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planner_entries'
      and policyname = 'Users can read their own planner entries'
  ) then
    create policy "Users can read their own planner entries"
    on public.planner_entries
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planner_entries'
      and policyname = 'Users can create their own planner entries'
  ) then
    create policy "Users can create their own planner entries"
    on public.planner_entries
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planner_entries'
      and policyname = 'Users can update their own planner entries'
  ) then
    create policy "Users can update their own planner entries"
    on public.planner_entries
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planner_entries'
      and policyname = 'Users can delete their own planner entries'
  ) then
    create policy "Users can delete their own planner entries"
    on public.planner_entries
    for delete
    using (auth.uid() = user_id);
  end if;
end $$;
