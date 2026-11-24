-- SPEC 11: perfiles con alias único y alta por trigger.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null unique check (
    name ~ '^[A-Z0-9_]{3,10}$'
    and name <> 'INVITADO'
  ),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, name) on public.profiles to authenticated;

create function public.is_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where name = p_name);
$$;

revoke all on function public.is_name_available(text) from public, anon, authenticated;
grant execute on function public.is_name_available(text) to anon, authenticated;

-- Alta por email: reserva el alias. OAuth no envía av_name y pasa por /auth/alias.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'av_name' then
    insert into public.profiles (id, name)
    values (new.id, new.raw_user_meta_data ->> 'av_name');
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
