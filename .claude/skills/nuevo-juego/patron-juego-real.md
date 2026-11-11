# Patrón de juego real en Arcade Vault

Receta destilada de SPEC 04 (ROCAS) y SPEC 05 (leaderboard), con rutas del código actual. ROCAS es la implementación de referencia: léela antes de escribir la spec.

## Piezas

| Pieza       | Ruta                                        | Modelo en ROCAS                  |
| ----------- | ------------------------------------------- | -------------------------------- |
| Constantes  | `lib/games/<id>/constants.ts`               | `lib/games/rocas/constants.ts`   |
| Entidades   | `lib/games/<id>/entities.ts`                | `lib/games/rocas/entities.ts`    |
| Motor       | `lib/games/<id>/engine.ts`                  | `lib/games/rocas/engine.ts`      |
| Player      | `components/<id>-player.tsx`                | `components/rocas-player.tsx`    |
| Marco común | `components/player-shell.tsx`               | Compartido, no se duplica        |
| Selección   | `app/juegos/[id]/jugar/page.tsx` o registro | `if (game.id === "rocas")`       |
| Estilos     | `app/globals.css`                           | `.crt-screen canvas`, `.rocas-*` |
| Catálogo    | `supabase/migrations/NNNN_juego_<id>.sql`   | Seed de `0001_games_scores.sql`  |

`lib/games/` no tiene `index.ts`: `@/lib/games` resuelve a `lib/games.ts` (tipos y `CATS`).

## Motor (`lib/games/<id>/engine.ts`)

Contrato:

```ts
export type <Id>Phase = "ready" | "playing" | <fases propias> | "gameover";
export type <Id>Snapshot = { phase; paused; score; lives; level; /* campos de HUD */ };

export class <Id>Engine {
  constructor(canvas: HTMLCanvasElement, onChange: (s: <Id>Snapshot) => void);
  mount(): void;   // listeners + RAF, queda en "ready"
  start(): void;   // "ready" → "playing"
  pause(): void;
  resume(): void;
  end(): void;     // cualquier fase → "gameover"
  restart(): void; // partida nueva directamente en "playing"
  destroy(): void; // quita listeners y cancela el RAF
}
```

Reglas (ver `RocasEngine`):

- Sin globals: todo el estado son campos privados.
- Constructor: `getContext("2d")`, `dpr = min(devicePixelRatio, 2)`, backing store `WORLD_W × dpr` por `WORLD_H × dpr`, `ctx.setTransform(dpr, …)` al dibujar.
- Mundo lógico fijo (el tamaño del canvas original) y `dt` en segundos con tope de 50 ms (`MAX_DT`).
- Física por frame del original (`v *= 0.987`) → `Math.pow(base, dt * 60)`. Contadores por frame → segundos.
- `loop`: `if (!paused) update(dt)`, luego `draw()` y `emit()`. En pausa se dibuja sin actualizar.
- `emit()` solo llama a `onChange` si cambió algún campo del snapshot.
- `pause()` limpia `keys` y `justPressed` en cualquier fase; solo pausa en fases jugables.
- `blur` y `visibilitychange` (si `document.hidden`) llaman a `pause()`.
- `capturesKeys()` es falso en `gameover`: el modal necesita espacios y flechas.
- `keydown`: ignora `ctrl`/`meta`/`alt`; `preventDefault` en las teclas de juego solo si `capturesKeys()`; `P`/`Esc` alternan pausa (ignoran `repeat` y `ready`); en pausa no se procesa nada más; disparos y acciones únicas ignoran `e.repeat`.
- `keyup`: `preventDefault` si `capturesKeys()` y siempre `keys[code] = false`.
- Sin reinicio por tecla en `gameover`: el modal decide.
- El canvas **no** dibuja score, vidas, nivel ni overlay de game over (lo hace React). Sí puede dibujar efectos de juego (como el `3x` de ROCAS).
- `shadowBlur` solo en entidades principales; partículas sin glow.

## Entidades (`entities.ts`)

- Clases con `update(dt, ...)` y `draw(ctx)`; `ctx` y el input llegan por parámetro.
- Flag `dead` para retirarlas.

## Constantes (`constants.ts`)

- Tamaño del mundo, `MAX_DT`, `MAX_DPR`, valores de balance con los números del original, colores y utilidades (`wrap`, `dist`, `rand`, `randInt` si aplican).
- Colores con los mismos valores que los tokens de `app/globals.css`: cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, tinta `#e6e9ff`, verde `#00ff88`.

## Player (`components/<id>-player.tsx`)

Copiar la estructura de `RocasPlayer`:

- `"use client"`; `INITIAL_SNAPSHOT` con las constantes del motor.
- Motor creado en `useEffect`, `mount()` y `destroy()` en el cleanup (aguanta React Strict Mode).
- Táctil con `useSyncExternalStore` sobre `(hover: none) and (pointer: coarse)`, `false` en servidor (sin warnings de hidratación).
- `blurFocused()` antes de cada acción de botón: si no, `Espacio` activaría el botón con foco.
- Props a `PlayerShell`: `over = phase === "gameover"`, `controlsDisabled = phase === "ready"`, `crtClassName = "<id>-crt"`, `pauseHint = "PULSA P O REANUDAR PARA CONTINUAR"`.
- Hijos: `<canvas>` y overlay de `ready` con tabla de controles (`<dl>` + `<kbd>`), `PULSA <TECLA>` y `REQUIERE TECLADO` en táctil.

## `PlayerShell`

Props actuales: `game, score, lives, level, paused, over, controlsDisabled?, crtClassName?, pauseHint?, onTogglePause, onEnd, onRestart, children`.

- El modal ya gestiona el guardado: `SIMULACIÓN: NO PUNTÚA` si `!game.ranked`, `SIN PUNTOS: NO SE GUARDA` si `score = 0`, envío con `submitScore` y `normalizeName` de `lib/scores.ts`, error y reintento.
- Si el juego necesita otro HUD (líneas en vez de vidas), la spec debe ampliar las props de forma opcional y verificar que ROCAS y la simulación (`components/game-player.tsx`) no cambian.

## Registro de players

Con el segundo juego real se sustituye el `if` por id (decisión diferida en SPEC 04 y 05):

- `components/game-players.ts`: mapa `Record<string, ComponentType<{ game: Game }>>` con `rocas` y el nuevo juego.
- `app/juegos/[id]/jugar/page.tsx`: `const Player = GAME_PLAYERS[game.id] ?? GamePlayer`.
- Actualizar la línea de juegos reales en `CLAUDE.md` (Stack notes).
- Criterio: `rocas` y una simulación siguen funcionando igual.

Si el registro ya existe, la spec solo añade una entrada.

## Catálogo y leaderboard

- Esquema en `0001_games_scores.sql`: `games` (`id, title, short, long, cat, cover, color, controls, ranked, sort_order`) y `scores` (`game_id, name 1–10 en mayúsculas sin espacios en los extremos, score 1–99.999.999`).
- La política `INSERT` de `scores` solo deja guardar si `games.ranked`. Activar el juego es una migración nueva:
  - Fila existente: `update public.games set ranked = true, controls = '<...>', long = '<...>' where id = '<id>';`
  - Fila nueva: `insert` con todas las columnas, `sort_order` libre y clase `cover-<x>` añadida en `globals.css`.
- Sin cambios de esquema no hace falta regenerar `lib/supabase/database.types.ts`.
- Aplicar con MCP `apply_migration` y revisar `get_advisors` (seguridad).
- Al activar `ranked`, el juego aparece en pestañas del Salón, ficha con ranking, `Mejor global`/`Marcas` reales y actividad de Home sin tocar esas páginas (`lib/data.ts` ya lo resuelve).
- Pruebas con nombres `TEST_*` y borrado al terminar.

## CSS (`app/globals.css`)

- `.crt-screen canvas` ya existe (`display: block; width: 100%; height: 100%`, sin `position` para que los pseudo-elementos CRT pinten encima).
- `.<id>-crt`: ancho limitado por `100dvh` según la relación de aspecto del mundo. Modelo 4:3: `.rocas-crt { width: min(100%, max(320px, calc((100dvh - 282px) * 4 / 3 + 48px))) }`. Un mundo vertical (300×600) necesita otra fórmula.
- Overlay de `ready`: modelo `.rocas-ready`, `.rocas-controls`, `.rocas-start`, `.rocas-touch` con su media query. Usar `/frontend-design` (instrucción de `CLAUDE.md`).

## Checklist de adaptación de un `game.js` de referencia

- [ ] Globals → campos privados del motor.
- [ ] `addEventListener` sueltos → `mount()`/`destroy()`.
- [ ] RAF infinito → `rafId` cancelable.
- [ ] `setInterval`/`setTimeout` → acumuladores con `dt` (no sobreviven a la pausa ni al desmontaje).
- [ ] Física o temporizadores por frame → normalizados por `dt`.
- [ ] HUD en canvas o DOM propio → HUD de `PlayerShell`.
- [ ] Pausa propia → `pause()`/`resume()` de plataforma.
- [ ] Game over en canvas → modal FIN DEL JUEGO.
- [ ] Reinicio por tecla → eliminado.
- [ ] Colores originales → paleta neón (salvo sprites confirmados).
- [ ] Assets → `public/games/<id>/`, cargados en el motor y liberados en `destroy()`.
- [ ] Sonido → fuera salvo decisión contraria.
- [ ] `references/` intacto (`git status` lo comprueba).
