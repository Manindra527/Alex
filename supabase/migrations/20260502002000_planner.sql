-- PLANNER: persistent planner setup and generated plan data
create table if not exists public.planners (
  id uuid primary key references auth.users(id) on delete cascade,
  target_exam text,
  exam_date date,
  available_hours_per_day numeric,
  subjects text[] not null default '{}',
  plan_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.planners enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_planners_updated_at on public.planners;

create trigger set_planners_updated_at
before update on public.planners
for each row
execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planners'
      and policyname = 'Users can read their own planner'
  ) then
    create policy "Users can read their own planner"
    on public.planners
    for select
    using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planners'
      and policyname = 'Users can create their own planner'
  ) then
    create policy "Users can create their own planner"
    on public.planners
    for insert
    with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planners'
      and policyname = 'Users can update their own planner'
  ) then
    create policy "Users can update their own planner"
    on public.planners
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planners'
      and policyname = 'Users can delete their own planner'
  ) then
    create policy "Users can delete their own planner"
    on public.planners
    for delete
    using (auth.uid() = id);
  end if;
end $$;
