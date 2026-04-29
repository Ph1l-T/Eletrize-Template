create table if not exists public.user_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scenes enable row level security;

drop policy if exists "users can read own scenes" on public.user_scenes;
create policy "users can read own scenes"
on public.user_scenes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own scenes" on public.user_scenes;
create policy "users can insert own scenes"
on public.user_scenes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own scenes" on public.user_scenes;
create policy "users can update own scenes"
on public.user_scenes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own scenes" on public.user_scenes;
create policy "users can delete own scenes"
on public.user_scenes
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_user_scenes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_scenes_set_updated_at on public.user_scenes;
create trigger user_scenes_set_updated_at
before update on public.user_scenes
for each row
execute function public.set_user_scenes_updated_at();
