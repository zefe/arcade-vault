# SPEC 05 — Leaderboard real y tabla de juegos

> **Estado:** aprobado
> **Depende de:** SPEC 01, SPEC 03, SPEC 04
> **Fecha:** 2026-11-06
> **Objetivo:** Mover el catálogo a una tabla `games` de Supabase y guardar y mostrar puntuaciones reales en una tabla `scores`, eliminando los datos inventados de rankings y estadísticas.

## Por qué existe esta spec

La BD remota no tiene tablas y el catálogo vive en `lib/games.ts`.
Los rankings son falsos (`seededScores`, `TICKS`, `TOP_PLAYERS`, `best`, `plays`) y las puntuaciones se quedan en `av_scores`.
ROCAS ya produce puntuaciones reales, pero nadie puede competir con ellas.

Sin Auth real, esta spec acepta un riesgo explícito: las puntuaciones son anónimas y falseables.
Las validaciones en BD protegen la integridad de los datos, no la legitimidad de la marca.

## Alcance

**Dentro:**

- Tablas `games` y `scores`, con RLS, en `supabase/migrations/0001_games_scores.sql`.
- Seed de los 8 juegos actuales en la migración, con `ranked = true` solo en `rocas`.
- Vistas `games_with_stats` y `leaderboard`.
- Tipos regenerados en `lib/supabase/database.types.ts`.
- Capa de lectura server en `lib/data.ts` y guardado cliente en `lib/scores.ts`.
- Home, Biblioteca, ficha, reproductor y Salón leyendo datos reales con render dinámico.
- Guardado anónimo desde el modal FIN DEL JUEGO con validación, estado de envío, error y reintento.
- Modal sin guardado en juegos no ranked, con el mensaje `SIMULACIÓN: NO PUNTÚA`.
- Salón limitado a juegos ranked.
- Ficha de juegos no ranked con `RANKING NO DISPONIBLE`.
- Estadística `Partidas` renombrada a `Marcas`, con el total de puntuaciones guardadas.
- `Mejor global` y `MEJOR PUNTUACIÓN` calculados desde `scores`, con `—` si no hay marcas.
- Sección ACTIVIDAD EN VIVO de Home con últimas 5 marcas y `TOP JUGADORES` real.
- Estados vacíos en cada ranking.
- `app/error.tsx` (`SEÑAL PERDIDA` + `REINTENTAR`) y `app/loading.tsx`.
- Eliminación de `GAMES`, `PLAYERS`, `getGame`, `seededScores`, `best`, `plays`, `saveScore` y `av_scores`.
- Eliminación de la fila `TU MEJOR MARCA` del Salón.

**Fuera de alcance (specs futuras):**

- Supabase Auth real, `proxy.ts` y scores asociados a usuarios.
- Antifraude, `max_score` por juego, rate limit o validación server de la partida.
- Moderación o filtro de nombres.
- Importar marcas de `av_scores`.
- Fila `TU MEJOR MARCA`, que vuelve con Auth.
- Contador real de partidas.
- Supabase Realtime y refresco sin navegar.
- Panel de administración del catálogo.
- Cifras de marketing de Home (`STATS`).
- Implementar otros juegos y cambiar `game.id === "rocas"` por un registro.
- Tests automatizados.

## Modelo de datos

### Tablas

```sql
create table public.games (
  id text primary key,                -- "rocas"
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,                -- clase CSS, "cover-rocas"
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  controls text,                      -- null = "TECLADO / TÁCTIL"
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

create index scores_game_rank_idx on public.scores (game_id, score desc, created_at);
create index scores_created_at_idx on public.scores (created_at desc);
```

### Vistas

Ambas se crean `with (security_invoker = true)` para respetar la RLS de las tablas.

```sql
-- games_with_stats: todas las columnas de games, más:
--   best  integer   max(scores.score), null sin marcas
--   marks bigint    count(scores.id), 0 sin marcas

-- leaderboard: mejor marca de cada nombre por juego
--   game_id, name, score, created_at
--   rank = row_number() over (partition by game_id order by score desc, created_at, id)
```

### Permisos

| Rol                     | `games` | `scores`                                     | Vistas |
| ----------------------- | ------- | -------------------------------------------- | ------ |
| `anon`, `authenticated` | SELECT  | SELECT; INSERT de `game_id`, `name`, `score` | SELECT |

- `UPDATE` y `DELETE` no se conceden a roles públicos en ninguna tabla.
- El grant de columnas impide que el cliente fije `id` o `created_at`.
- La política `INSERT` de `scores` exige `exists (select 1 from games where id = game_id and ranked)`.
- Las políticas `SELECT` de `games` y `scores` usan `using (true)`.

### Seed

- Los 8 juegos conservan `id`, `title`, `short`, `long`, `cat`, `cover`, `color` y `controls` de `lib/games.ts`.
- `sort_order` sigue el orden actual del array, de 1 a 8.
- `best` y `plays` no se migran porque son inventados.

### Tipos TypeScript

```ts
// lib/games.ts: conserva tipos y CATS; sin datos ni funciones
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  controls: string | null;
  ranked: boolean;
  best: number | null;
  marks: number;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export type RecentScore = {
  name: string;
  score: number;
  gameTitle: string;
  color: GameColor;
  ago: string; // "hace 5 min"
};

// lib/data.ts: solo server; lanza Error si falla la consulta
export async function getGames(): Promise<Game[]>;
export async function getRankedGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export async function getRecentScores(limit: number): Promise<RecentScore[]>;
export async function getTopPlayers(limit: number): Promise<ScoreRow[]>;

// lib/scores.ts: cliente
export function normalizeName(raw: string): string; // trim + mayúsculas + 10 caracteres + trim
export async function submitScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false }>;
```

Convenciones:

- Fechas de ranking en `dd/mm/aaaa`, calculadas en servidor con zona UTC.
- Tiempo relativo calculado en servidor: `hace N min`, `hace N h` o `hace N d`.
- Empate en ranking: gana la marca más antigua.
- `TOP JUGADORES` ordena `leaderboard` por `score` descendente y `created_at` ascendente.
- `lib/data.ts` valida los nullables de las vistas y convierte `cat` y `color` a sus tipos.
- Límites: ficha 10, Salón 12, Home 5.
- `ranked = true` solo se activa en juegos con motor real.
- Filas de prueba con nombre `TEST_*`, eliminadas con SQL al terminar la verificación.

### Estados del modal FIN DEL JUEGO

| Caso                     | Muestra                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `ranked = false`         | `SIMULACIÓN: NO PUNTÚA`, sin campo ni botón de guardar.          |
| `ranked` y `score = 0`   | `SIN PUNTOS: NO SE GUARDA`, sin campo ni botón de guardar.       |
| Nombre vacío tras `trim` | `GUARDAR PUNTUACIÓN` desactivado.                                |
| Enviando                 | Campo y botón desactivados; botón con `GUARDANDO…`.              |
| Error                    | `ERROR AL GUARDAR. INTÉNTALO DE NUEVO`; conserva nombre y score. |
| Guardado                 | `▸ PUNTUACIÓN GUARDADA_`, como ahora.                            |

## Plan de implementación

1. Leer `node_modules/next/dist/docs/` sobre datos en Server Components, `error.js` (prop `retry`) y `loading.js`. Aplicar `/frontend-design` para estados nuevos (instrucción de `CLAUDE.md`).
2. Crear `supabase/migrations/0001_games_scores.sql` con tablas, índices, RLS, permisos y vistas.
3. Añadir a la migración el seed de los 8 juegos.
4. Aplicar la migración con MCP `apply_migration`. Revisar `get_advisors` de seguridad y comprobar RLS como rol `anon` con `execute_sql`.
5. Regenerar `lib/supabase/database.types.ts` con MCP `generate_typescript_types`. Verificar: `npm run build`.
6. Crear `lib/data.ts` con las lecturas y su mapeo, sin consumidores todavía. Los campos `best` y `plays` siguen en `lib/games.ts`, así que `lib/data.ts` usa temporalmente un tipo propio.
7. Crear `app/error.tsx` (`SEÑAL PERDIDA`, `REINTENTAR` con `retry()`) y `app/loading.tsx`.
8. Cambiar `app/juegos/page.tsx` para pasar `getGames()` a `Library`. `Library` y `GameCard` reciben datos por props.
9. Cambiar `app/juegos/[id]/jugar/page.tsx` para usar `getGame()`, y quitar `generateStaticParams`.
10. Cambiar `app/juegos/[id]/page.tsx`:
    - Usar `getGame()` y `getLeaderboard(id, 10)`.
    - Quitar `generateStaticParams`.
    - Renombrar `Partidas` a `Marcas`.
    - Mostrar `—` si `best` es `null`.
    - Mostrar `RANKING NO DISPONIBLE` o el estado vacío `SÉ EL PRIMERO`.
11. Cambiar `app/salon/page.tsx` para cargar `getRankedGames()` y el leaderboard de cada uno. Quitar de `HallOfFame` los datos falsos y `TU MEJOR MARCA`.
12. Añadir a `HallOfFame` el podio con `—` en plazas vacías y el estado vacío `SÉ EL PRIMERO` con enlace a jugar.
13. Cambiar `app/page.tsx` para cargar juegos, últimas 5 marcas y top 5, y pasarlos a `Home`.
14. En `Home`, quitar `GAMES`, `TICKS` y `TOP_PLAYERS`, retitular `TOP JUGADORES` y añadir estados vacíos. `STATS` no cambia.
15. Crear `lib/scores.ts` con `normalizeName` y `submitScore`, usando `lib/supabase/client.ts`.
16. Actualizar el modal de `PlayerShell` con los estados de la tabla anterior y `submitScore`.
17. Eliminar de `lib/user-context.tsx` `saveScore`, `SavedScore` y `SCORES_KEY`.
18. Eliminar de `lib/games.ts` `GAMES`, `PLAYERS`, `getGame`, `seededScores`, `best` y `plays`, y adoptar el tipo `Game` final en `lib/data.ts`.
19. Actualizar `CLAUDE.md` (Stack notes) con tablas, `lib/data.ts`, `lib/scores.ts` y la regla de `ranked`.
20. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] Home, Biblioteca, ficha, reproductor y Salón no muestran errores ni warnings de hidratación en consola.
- [ ] `grep -rnE "GAMES|seededScores|av_scores|saveScore|PLAYERS|TICKS|TOP_PLAYERS" app components lib` no devuelve resultados.
- [ ] `grep -rn "generateStaticParams" app/juegos` no devuelve resultados.
- [ ] `grep -rn "service_role\|sb_secret" app components lib` no devuelve resultados.

**Base de datos**

- [ ] `list_tables` muestra `games` con 8 filas y `scores`, ambas con RLS activa.
- [ ] `select id from games where ranked` devuelve solo `rocas`.
- [ ] `get_advisors` de seguridad no reporta niveles `ERROR` sobre `games`, `scores` ni las vistas.
- [ ] Como `anon`, insertar con `game_id = 'rocas'`, nombre válido y score válido funciona.
- [ ] Como `anon`, insertar con `game_id = 'caida'` falla.
- [ ] Como `anon`, insertar con score `0`, score `100000000`, nombre vacío, nombre de 11 caracteres o nombre en minúsculas falla.
- [ ] Como `anon`, insertar con `created_at` explícito falla.
- [ ] Como `anon`, `UPDATE` y `DELETE` sobre `games` y `scores` fallan.
- [ ] `leaderboard` con marcas 100 y 200 de `TEST_A` muestra una fila de `TEST_A` con 200.
- [ ] Dos nombres con el mismo score quedan ordenados con la marca más antigua primero.
- [ ] `supabase/migrations/0001_games_scores.sql` está commiteado y coincide con el esquema aplicado.

**Catálogo**

- [ ] Biblioteca muestra los 8 juegos en el orden actual, y búsqueda y filtros funcionan igual.
- [ ] Editar `title` de un juego en la BD cambia el título en Biblioteca y ficha al recargar, sin rebuild.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404.
- [ ] La ficha de `rocas` muestra `TECLADO`, y la de `caida` muestra `TECLADO / TÁCTIL`.

**Guardado**

- [ ] Terminar ROCAS con puntuación mayor que 0 y guardar añade una fila en `scores` con `game_id = 'rocas'` y esa puntuación.
- [ ] Un nombre escrito como ` kai` se guarda como `KAI`.
- [ ] Un usuario mock de más de 10 caracteres guarda su nombre recortado a 10.
- [ ] Con nombre vacío, `GUARDAR PUNTUACIÓN` está desactivado.
- [ ] Doble click en `GUARDAR PUNTUACIÓN` crea una sola fila.
- [ ] Con red bloqueada, el modal muestra `ERROR AL GUARDAR. INTÉNTALO DE NUEVO` y conserva puntuación y nombre.
- [ ] Reintentar con red restaurada guarda la fila y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] JUGAR DE NUEVO tras guardar permite guardar la siguiente partida.
- [ ] Terminar ROCAS con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA` y no crea filas.
- [ ] Terminar `caida` muestra `SIMULACIÓN: NO PUNTÚA`, sin campo ni botón de guardar.
- [ ] Guardar no añade ni modifica `av_scores` en `localStorage`.

**Rankings**

- [ ] Tras guardar y navegar a la ficha de ROCAS o al Salón, la nueva marca aparece en su posición correcta.
- [ ] La ficha muestra como máximo 10 filas, y el Salón como máximo 12.
- [ ] `Mejor global` y `Marcas` de ROCAS coinciden con `max(score)` y `count(*)` de `scores`.
- [ ] La tarjeta de ROCAS muestra su mejor marca real.
- [ ] Sin marcas, ficha y Salón de ROCAS muestran `SÉ EL PRIMERO`, y las estadísticas muestran `—` y `0`.
- [ ] Con 1 o 2 marcas, el podio del Salón muestra `—` en las plazas vacías.
- [ ] La tarjeta y la ficha de un juego no ranked muestran `—` y `0`.
- [ ] La ficha de un juego no ranked muestra `RANKING NO DISPONIBLE`.
- [ ] Las pestañas del Salón solo incluyen juegos ranked.
- [ ] El Salón no muestra `TU MEJOR MARCA`, con o sin usuario mock.

**Home**

- [ ] `ÚLTIMAS PUNTUACIONES` muestra las 5 marcas más recientes con jugador, juego, score y tiempo relativo.
- [ ] `TOP JUGADORES` muestra las 5 mejores marcas de `leaderboard`, sin el texto `HOY`.
- [ ] Sin marcas, ambas tarjetas muestran un estado vacío.
- [ ] Las cifras de `STATS` no cambian.

**Fallos y regresiones**

- [ ] Con `.env.local` sin Supabase o URL inválida, Home, Biblioteca, ficha, reproductor y Salón muestran `SEÑAL PERDIDA`.
- [ ] Tras restaurar la configuración y reiniciar `next dev`, `REINTENTAR` carga la página.
- [ ] `/acerca` y `/auth` funcionan sin Supabase.
- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04.
- [ ] `/juegos/caida/jugar` conserva la simulación de SPEC 01.
- [ ] El login mock con `av_user` funciona igual que antes.
- [ ] `/api/health` devuelve `200` con `{"ok":true}`.

**Limpieza**

- [ ] Tras la verificación, `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** una sola spec. Decisión del usuario, tras evaluar dividir catálogo y ranking; evita estados intermedios con estadísticas falsas.
- **No:** dos specs (05 catálogo, 06 ranking). Mejor para revisar, pero con más ciclos.
- **Sí:** tablas en BD más UI real. Cierra el ciclo de jugar, guardar y competir.
- **No:** solo tablas o solo UI. Dejan el ciclo a medias.
- **Sí:** catálogo completo en `games`, sin copia en código. Una sola fuente de verdad.
- **No:** tabla mínima con catálogo en `lib/games.ts`. Duplica datos.
- **No:** `scores.game_id` con CHECK y sin tabla `games`. No cumple el objetivo.
- **Sí:** guardado anónimo con nombre libre. Permite competir ya; es falseable y se endurece con Auth.
- **No:** Supabase Anonymous Auth. Añade sesión y `proxy.ts` a una spec ya grande.
- **No:** esperar a Auth real. Retrasa el leaderboard.
- **No:** Server Action con rate limit. Añade código y no elimina el fraude.
- **Sí:** insert directo desde el navegador con RLS. Es lo más simple y la BD aplica las reglas.
- **Sí:** solo `rocas` con `ranked = true`, impuesto en BD. El score de una simulación sube solo.
- **No:** puntuar los 8 juegos. Un ranking de simulaciones no tiene valor.
- **Sí:** mejor marca por nombre. Un jugador no llena el podio.
- **No:** todas las partidas como filas del ranking. Permite a uno solo ocupar el top.
- **Sí:** guardar todas las partidas y calcular con una vista. Conserva histórico sin más escrituras.
- **Sí:** renombrar `Partidas` a `Marcas`. Solo se conocen las puntuaciones guardadas.
- **No:** contar partidas reales. Añade una escritura pública fácil de inflar.
- **Sí:** eliminar `seededScores`, `best` y `plays`, con estados vacíos. Un ranking inventado no puede competir con uno real.
- **No:** seed de demo o mezcla con datos falsos. Engañan y hay que limpiarlos.
- **Sí:** `SEÑAL PERDIDA` con `REINTENTAR` en lectura, y error con reintento en guardado. El fallo es visible y no se pierde el score.
- **No:** fallback local del catálogo. Rompe la fuente única de verdad.
- **No:** cola de reenvío en `localStorage`. Añade complejidad y estados.
- **Sí:** render dinámico por petición. Los rankings están al día al navegar, y el build no depende de la BD.
- **No:** ISR de 60 s. Una marca nueva tardaría en verse.
- **No:** Realtime. Merece spec propia.
- **Sí:** `app/loading.tsx`. Con render dinámico, la navegación necesita feedback mientras se consulta la BD.
- **Sí:** conectar ACTIVIDAD EN VIVO a datos reales y retitular `TOP JUGADORES`. No queda actividad inventada.
- **No:** quitar la sección o dejarla falsa.
- **Sí:** `TOP JUGADORES` compara marcas entre juegos. Con un solo juego ranked es exacto; se revisa con el segundo.
- **Sí:** mantener `STATS`. Son cifras de marketing de SPEC 02 y quedan fuera de esta spec.
- **Sí:** retirar `av_scores` sin importar. Las marcas locales no tienen valor verificable.
- **Sí:** retirar `TU MEJOR MARCA`. Un nombre libre no prueba identidad.
- **No:** buscar la marca por nombre de `av_user`. Podría mostrar la de otro jugador.
- **Sí:** nombre de 1 a 10 caracteres, score de 1 a 99.999.999 y solo `INSERT`. Control de datos simple.
- **No:** charset restringido. Rechaza acentos sin aportar seguridad; React ya escapa la salida.
- **No:** `max_score` por juego. Requiere estimar topes y puede rechazar marcas legítimas.
- **Sí:** score 0 no se guarda. Evita filas sin valor.
- **Sí:** vistas con `security_invoker`. Respetan RLS y evitan el aviso de vistas `SECURITY DEFINER`.
- **Sí:** `lib/data.ts` aparte de `lib/games.ts`. Los componentes cliente importan tipos de `lib/games.ts` y no deben arrastrar `next/headers`.

## Riesgos

| Riesgo                                                                   | Mitigación                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Cualquiera puede publicar scores falsos con la publishable key           | Riesgo aceptado hasta Auth. Límites en BD y sin `UPDATE`/`DELETE` públicos.                            |
| Spam de inserts hace crecer `scores`                                     | Riesgo aceptado. Se limpia con SQL; rate limit en spec futura si ocurre.                               |
| Nombres ofensivos o suplantados                                          | Riesgo aceptado. Se borran con SQL; moderación en spec futura.                                         |
| Una caída de Supabase deja sin Home, Biblioteca, ficha ni Salón          | `SEÑAL PERDIDA` con `REINTENTAR`. `/acerca` y `/auth` siguen funcionando.                              |
| Las vistas generan columnas nullable en los tipos                        | `lib/data.ts` valida y mapea; ningún componente lee tipos de BD directamente.                          |
| `lib/data.ts` llega al bundle cliente                                    | `lib/supabase/server.ts` importa `next/headers`, y el build falla si un componente cliente lo importa. |
| Marcar `ranked` en un juego sin motor abre el ranking a simulaciones     | Regla documentada en `CLAUDE.md`; `ranked` solo se escribe por migración.                              |
| Diferencias de mayúsculas entre JavaScript y Postgres en otros alfabetos | El insert falla y el modal permite corregir el nombre; no se pierde la puntuación.                     |
| Reintentar tras una respuesta perdida duplica la fila                    | Impacto limitado: `leaderboard` no cambia y `Marcas` suma 1.                                           |
| Las filas de prueba contaminan el ranking remoto                         | Nombre `TEST_*` y limpieza incluida en los criterios.                                                  |

## Lo que **no** entra en esta spec

- Auth real, `proxy.ts` y scores por usuario.
- Antifraude, topes por juego y rate limit.
- Moderación de nombres.
- Importar `av_scores`.
- `TU MEJOR MARCA`.
- Contador real de partidas.
- Realtime.
- Panel de administración.
- Cifras de marketing de Home.
- Otros juegos o un registro genérico.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
