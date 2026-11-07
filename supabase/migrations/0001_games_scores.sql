-- SPEC 05: catálogo de juegos y puntuaciones anónimas.

-- Tablas

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  controls text,
  ranked boolean not null default false,
  sort_order integer not null unique
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id) on delete restrict,
  name text not null check (
    char_length(name) between 1 and 10
    and name = btrim(name)
    and name = upper(name)
  ),
  score integer not null check (score between 1 and 99999999),
  created_at timestamptz not null default now()
);

-- Índices

create index scores_game_rank_idx on public.scores (game_id, score desc, created_at);
create index scores_created_at_idx on public.scores (created_at desc);

-- Vistas: security_invoker respeta la RLS de las tablas.

create view public.games_with_stats
with (security_invoker = true) as
select
  g.id,
  g.title,
  g.short,
  g.long,
  g.cat,
  g.cover,
  g.color,
  g.controls,
  g.ranked,
  g.sort_order,
  max(s.score) as best,
  count(s.id) as marks
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

-- Mejor marca de cada nombre por juego. Empate: gana la marca más antigua.
create view public.leaderboard
with (security_invoker = true) as
select
  b.game_id,
  b.name,
  b.score,
  b.created_at,
  row_number() over (
    partition by b.game_id
    order by b.score desc, b.created_at, b.id
  ) as rank
from (
  select distinct on (s.game_id, s.name)
    s.id,
    s.game_id,
    s.name,
    s.score,
    s.created_at
  from public.scores s
  order by s.game_id, s.name, s.score desc, s.created_at, s.id
) b;

-- RLS

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"
  on public.games
  for select
  to anon, authenticated
  using (true);

create policy "scores_select_public"
  on public.scores
  for select
  to anon, authenticated
  using (true);

-- Solo se publican marcas de juegos con motor real.
create policy "scores_insert_ranked_games"
  on public.scores
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.games g
      where g.id = game_id
        and g.ranked
    )
  );

-- Permisos: Supabase concede todo por defecto, así que se parte de cero.

revoke all on public.games from anon, authenticated;
revoke all on public.scores from anon, authenticated;
revoke all on public.games_with_stats from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;

grant select on public.games to anon, authenticated;
grant select on public.scores to anon, authenticated;
grant insert (game_id, name, score) on public.scores to anon, authenticated;
grant select on public.games_with_stats to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
