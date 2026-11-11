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

-- Seed: los 8 juegos de lib/games.ts, en el mismo orden. Solo ROCAS tiene motor real.

insert into public.games (id, title, short, long, cat, cover, color, controls, ranked, sort_order) values
  (
    'bloque-buster',
    'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'ARCADE',
    'cover-bricks',
    'cyan',
    null,
    false,
    1
  ),
  (
    'caida',
    'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'PUZZLE',
    'cover-tetro',
    'magenta',
    null,
    false,
    2
  ),
  (
    'serpentina',
    'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'ARCADE',
    'cover-snake',
    'green',
    null,
    false,
    3
  ),
  (
    'gloton',
    'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'ARCADE',
    'cover-glot',
    'yellow',
    null,
    false,
    4
  ),
  (
    'invasores',
    'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'SHOOTER',
    'cover-invaders',
    'green',
    null,
    false,
    5
  ),
  (
    'rocas',
    'ROCAS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para activar el disparo triple durante 5 segundos.',
    'SHOOTER',
    'cover-rocas',
    'yellow',
    'TECLADO',
    true,
    6
  ),
  (
    'ranaria',
    'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'ARCADE',
    'cover-rana',
    'green',
    null,
    false,
    7
  ),
  (
    'duelo-pixel',
    'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'VERSUS',
    'cover-duelo',
    'cyan',
    null,
    false,
    8
  );
