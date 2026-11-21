# SPEC JAM ranaria 01 — Juego RANARIA real en el reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-18
> **Objetivo:** Crear un juego de cruce por rejilla como motor TypeScript en canvas para que `/juegos/ranaria/jugar` sea un juego real con ranking, sobre `PlayerShell`.

## Por qué existe esta spec

El tema de la jam fija el concepto: una rana cruza carriles de tráfico y un río de troncos por rejilla hasta los nenúfares, contra reloj, y puntúa por avance, nenúfar y tiempo sobrante.
RANARIA es hoy la simulación de SPEC 01: la fila `ranaria` (`ranked = false`, `cover-rana`, orden 7) ya describe este concepto, pero su score sube solo.
El usuario decidió el 2026-11-18 reutilizar esa fila en vez de crear una nueva, como hicieron SPEC 06–08.
No hay código de referencia: mecánicas, carriles, balance y dibujo se diseñan aquí, con arte vectorial neón original y sin assets.
El registro `components/game-players.ts` y el HUD opcional de `PlayerShell` ya existen desde SPEC 06: esta spec solo añade una entrada y usa `score`, `lives` y `level` tal cual.
Aporta a la plataforma la primera mecánica de timing y cruce, distinta de disparo (ROCAS), encaje (CAÍDA), rebote (BLOQUE BUSTER) y crecimiento (SERPENTINA).

## Alcance

**Dentro:**

- Motor en `lib/games/ranaria/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas:
  - Rejilla de 15 columnas × 12 filas de 50 px; la rana salta una casilla por pulsación.
  - Mitad inferior: acera de salida (fila 11), 4 carriles de tráfico (filas 7–10) y mediana segura (fila 6).
  - Mitad superior: 5 carriles de río (filas 1–5) con troncos y cadenas de boyas que arrastran a la rana, y la orilla de meta (fila 0) con 5 nenúfares.
  - Mueren la rana: un vehículo, caer al agua, salir arrastrada por un borde, saltar al seto o a un nenúfar ocupado y agotar el tiempo.
  - 30 s por rana; cada muerte resta una vida y vuelve la rana a la salida. 3 vidas.
  - Puntos por cada fila nueva más alta alcanzada, por nenúfar y por segundos sobrantes al llegar.
  - Llenar los 5 nenúfares completa la ronda: bonus, nenúfares vacíos, nivel +1 y carriles un 10 % más rápidos, hasta 1,5×.
- Movimiento de carriles y temporizador por `dt`, independientes de los FPS.
- Paleta neón de la plataforma con formas vectoriales, sin imágenes.
- Mundo lógico 800×600 dentro de `.crt-screen`, escalado y nítido en HiDPI.
- HUD React de la plataforma con puntuación, vidas y nivel. `PlayerShell` no cambia.
- Barra de tiempo dibujada en el canvas como efecto de juego.
- Overlay inicial con controles, `PULSA ESPACIO` y `REQUIERE TECLADO` en táctil.
- PAUSA real con botón, `P` o `Esc`, y auto-pausa al perder foco o cambiar de pestaña.
- FIN y perder la última vida abren el modal FIN DEL JUEGO existente.
- Guardado en `scores` con `game_id = 'ranaria'` mediante una migración que pone `ranked = true` en la fila existente.
- Ficha de `ranaria` corregida: `long` fiel a lo implementado y `controls = 'TECLADO'`.
- Entrada `"ranaria": RanariaPlayer` en `GAME_PLAYERS`.

**Fuera de alcance (specs futuras):**

- Niveles con trazados de carril propios, boyas que se sumergen, anguila en la mediana, luciérnaga de bonus, tiempo por rana decreciente y vida extra: SPEC JAM `ranaria` 02.
- Controles táctiles (deslizar y tocar), popups de puntos y salpicaduras: SPEC JAM `ranaria` 03.
- Sonido.
- Antifraude, topes de score o Auth real.
- Revisar `TOP JUGADORES` de Home, que compara marcas de juegos distintos.
- Implementar otros juegos.
- Tests automatizados.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0005_juego_ranaria.sql`:

```sql
update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Guía a una rana de neón casilla a casilla: cruza cuatro carriles de tráfico, salta sobre troncos y boyas a la deriva y alcanza uno de los cinco nenúfares antes de que se agoten sus 30 segundos. Cada fila nueva suma puntos, cada nenúfar más, y el tiempo sobrante es bonus. Llena los cinco para subir de nivel y acelerar el río y la carretera. Tienes 3 vidas.'
where id = 'ranaria';
```

`title` (`RANARIA`), `short`, `cat` (`ARCADE`), `cover` (`cover-rana`), `color` (`green`) y `sort_order` (`7`) no cambian. La tabla no tiene columna `description`: la descripción larga es `long`.

Contrato del motor (`lib/games/ranaria/engine.ts`):

```ts
export type RanariaPhase = "ready" | "playing" | "gameover";

export type RanariaSnapshot = {
  phase: RanariaPhase;
  paused: boolean;
  score: number;
  lives: number; // 0–3
  level: number; // 1, 2, 3…
};

export class RanariaEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: RanariaSnapshot) => void,
  );
  mount(): void; // registra listeners, arranca el loop y queda en "ready"
  start(): void; // "ready" → "playing"
  pause(): void;
  resume(): void;
  end(): void; // cualquier fase → "gameover"
  restart(): void; // partida nueva, directamente en "playing"
  destroy(): void; // quita listeners y cancela el RAF
}
```

El tiempo restante no va en el snapshot: cambia en cada frame y lo dibuja el canvas.

Entidades (`lib/games/ranaria/entities.ts`):

```ts
export type Dir = "up" | "down" | "left" | "right";
export type LaneKind = "safe" | "road" | "river" | "goal";
export type MoverKind =
  "moto" | "coche" | "camion" | "bolido" | "tronco" | "boyas";

export type LaneDef = {
  row: number; // 0–11
  kind: LaneKind;
  mover?: MoverKind;
  dir?: 1 | -1; // 1 = hacia la derecha
  speed?: number; // px/s a nivel 1
  length?: number; // casillas por entidad
  count?: number; // entidades por carril
};

export type Lane = LaneDef & { offset: number }; // px, avanza con speed × dir × factor × dt

export type FrogState = "idle" | "hopping" | "dying";

export type Frog = {
  x: number; // borde izquierdo en px (continuo en el río)
  row: number; // fila lógica 0–11
  facing: Dir;
  state: FrogState;
  hopT: number; // s transcurridos del salto
  fromX: number;
  fromRow: number;
  deathT: number; // s transcurridos de la animación de muerte
};

// moverX(lane, i) devuelve el borde izquierdo de la entidad i
// drawBackground, drawLane, drawMover, drawBays, drawFrog, drawDeath, drawTimeBar(ctx, …)
```

Registro (`components/game-players.ts`):

```ts
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  caida: CaidaPlayer,
  "bloque-buster": BloqueBusterPlayer,
  // serpentina: SerpentinaPlayer, si SPEC 08 ya está implementada
  ranaria: RanariaPlayer,
};
```

Convenciones:

- Mundo lógico fijo de 800×600 y `dt` en segundos con tope de 50 ms (`MAX_DT = 0.05`).
- Rejilla:
  - `CELL = 50` px, `COLS = 15`, `ROWS = 12`, `GRID_X = 25` (margen lateral decorativo de 25 px a cada lado).
  - Columna `c` ocupa `x = 25 + 50c … 75 + 50c`; su centro es `50 + 50c`. Fila `r` ocupa `y = 50r … 50r + 50`.
  - Fila 0: meta. Filas 1–5: río. Fila 6: mediana segura. Filas 7–10: carretera. Fila 11: acera de salida.
- Rana:
  - Aparece en la columna 7 (centro `x = 400`), fila 11, mirando arriba.
  - `HOP_TIME = 0.1` s. Durante el salto la rana está en el aire: no la golpean vehículos ni la arrastra el río.
  - Una pulsación durante un salto se guarda (búfer de 1) y se ejecuta al aterrizar; las siguientes se ignoran.
  - Arriba y abajo cambian de fila; izquierda y derecha mueven ±50 px desde la `x` actual.
  - Bajar desde la fila 11 se ignora. Un salto lateral cuyo centro quedaría fuera de `50…750` se ignora.
  - Al aterrizar en filas 6–11 la `x` se ajusta a la columna más cercana: `c = clamp(round((cx − 50) / 50), 0, 14)`.
  - Caja de choque: la casilla de la rana con 8 px de margen por lado (34×34).
- Carriles de nivel 1 (`WRAP = 1000` px, `spacing = WRAP / count`, `moverX = mod(offset + i × spacing, 1000) − 200`):

| Fila | Tipo | Entidad | Dir | Velocidad (px/s) | Largo (casillas) | Nº  | Hueco (px) |
| ---- | ---- | ------- | --- | ---------------- | ---------------- | --- | ---------- |
| 1    | río  | boyas   | →   | 80               | 2                | 4   | 150        |
| 2    | río  | tronco  | ←   | 50               | 3                | 3   | 183        |
| 3    | río  | tronco  | →   | 90               | 4                | 3   | 133        |
| 4    | río  | boyas   | ←   | 70               | 3                | 3   | 183        |
| 5    | río  | tronco  | →   | 60               | 2                | 3   | 233        |
| 7    | ruta | bolido  | ←   | 150              | 1                | 2   | 450        |
| 8    | ruta | camion  | →   | 55               | 2                | 3   | 233        |
| 9    | ruta | coche   | ←   | 90               | 1                | 4   | 200        |
| 10   | ruta | moto    | →   | 70               | 1                | 3   | 283        |

- `offset` inicial de cada carril: `fila × 137` px, para que las entidades no salgan alineadas en columna.
- Velocidad efectiva: `speed × speedFactor(level)`, con `speedFactor(level) = min(1 + 0.1 × (level − 1), 1.5)` (nivel 6 y siguientes: 1,5×).
- Río:
  - La rana está a salvo si su centro `cx` está dentro de `[moverX, moverX + largo × 50]` de alguna entidad de su carril; si no, cae al agua.
  - En tierra (sin salto) sobre el río: `x += speed × dir × factor × dt` cada frame.
  - Si el centro sale de `25…775`, muere arrastrada.
- Carretera: muere si su caja de choque solapa la caja de un vehículo (casilla del vehículo con 4 px de margen vertical) mientras no está en el aire.
- Meta (fila 0):
  - Nenúfares en las columnas 1, 4, 7, 10 y 13 (centros `x = 100, 250, 400, 550, 700`).
  - Aterrizaje válido si `|cx − centro| ≤ 25` en un nenúfar libre: la rana queda ahí dibujada y el nenúfar pasa a ocupado.
  - Seto (resto de la fila 0) o nenúfar ocupado: muere.
- Tiempo: `TIME_PER_FROG = 30` s, se reinicia con cada rana nueva. Se congela durante la muerte y en pausa. Llegar a 0 mata a la rana.
- Muerte: `DEATH_TIME = 0.6` s de animación; los carriles siguen moviéndose y la entrada se ignora. `lives − 1` al empezar la animación. Al terminar: si `lives = 0`, `gameover`; si no, rana nueva en la salida con 30 s.
- Puntuación:
  - `ADVANCE_POINTS = 10` al aterrizar en una fila más alta que la mejor de esta rana (filas 10 a 1: máximo 100 por rana). La fila 0 no cuenta como avance.
  - `PAD_POINTS = 50` por nenúfar.
  - `TIME_POINTS = 10` por segundo entero sobrante: `10 × floor(tiempo)`.
  - `ROUND_BONUS = 500` al llenar los 5 nenúfares.
  - Tope por rana: el cruce más corto son 11 saltos (1,1 s), así que sobran como mucho 28 s: `100 + 50 + 280 = 430`. Tope por ronda: `5 × 430 + 500 = 2650`.
  - No hay puntuación máxima de partida: las rondas no terminan mientras queden vidas. Llegar a 99.999.999 exige unas 37.700 rondas perfectas, inalcanzable en la práctica.
- Ronda completa: bonus, nenúfares vacíos, `level + 1`, rana nueva en la salida con 30 s; los carriles no se recolocan.
- En `ready` se ven el mundo y la rana en la salida con los carriles quietos en su `offset` inicial y la barra de tiempo llena.
- Colores en `lib/games/ranaria/constants.ts`, con los valores de los tokens de `globals.css` y 4 derivados:
  - Rana: `#00ff88` con glow; ojos `#e6e9ff`; ranas en nenúfares: `#00ff88` sin glow.
  - Moto `#f5ff00`, coche `#ff006e`, camión derivado `#ff8a00`, bólido derivado `#ff3b3b`; carrocería con trazo de 2 px y relleno del mismo color con alpha 0,25.
  - Tronco: trazo `#ffcf3a` (`--gold`), relleno `rgba(255,207,58,0.15)` y vetas de 1 px.
  - Boyas: círculos de 18 px de radio con trazo `#00f5ff` y relleno `rgba(0,245,255,0.15)`.
  - Agua: `#001f2a` (derivado, el mismo de `cover-rana`) con líneas de corriente `rgba(0,245,255,0.18)`.
  - Carretera: `#0a0a0f` (`--bg`) con líneas discontinuas `rgba(230,233,255,0.15)`.
  - Acera y mediana: `rgba(0,255,136,0.08)` con bordes de 1 px `rgba(0,255,136,0.4)`.
  - Seto: bloques con trazo `rgba(0,255,136,0.5)` sobre `#0b2a1e` (derivado); nenúfar libre: círculo con muesca, trazo `#00ff88`.
  - Barra de tiempo: `#00ff88` con más de 10 s, `#f5ff00` entre 5 y 10 s, `#ff006e` con menos de 5 s.
  - Muerte: aspa y 8 rayos `#ff006e` que crecen y se desvanecen en 0,6 s.
- Barra de tiempo: 6 px de alto en `y = 590`, desde `x = 25`, ancho `750 × tiempo / 30`. Es el único indicador de juego que dibuja el canvas.
- Glow (`shadowBlur`) solo en la rana, los vehículos (como mucho 12) y la barra de tiempo con menos de 5 s. Troncos, boyas, agua, seto y nenúfares sin glow.
- El canvas no dibuja score, vidas, nivel, pausa ni game over.
- Backing store `800 × dpr` por `600 × dpr`, con `dpr` limitado a 2 (`MAX_DPR = 2`).

Teclas:

| Tecla           | Acción            | Fases activas                  |
| --------------- | ----------------- | ------------------------------ |
| `↑` `↓` `←` `→` | Saltar            | `playing`, sin pausa ni muerte |
| `W` `A` `S` `D` | Saltar            | `playing`, sin pausa ni muerte |
| `Espacio`       | Empezar           | `ready`                        |
| `P` / `Esc`     | Pausar o reanudar | `playing`                      |

Los saltos ignoran `e.repeat`: mantener una tecla da un solo salto.

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para el overlay, los estilos y la cover.
2. Crear `lib/games/ranaria/constants.ts` con rejilla, tabla de carriles de nivel 1, valores de rana, tiempo, puntos, `speedFactor`, colores, `MAX_DT`, `MAX_DPR`, `clamp` y `mod`.
3. Crear `lib/games/ranaria/entities.ts` con los tipos, `moverX` y las funciones de dibujo de fondo, carriles, vehículos, troncos, boyas, nenúfares, rana, muerte y barra de tiempo. Cada `draw` recibe `ctx`.
4. Crear `lib/games/ranaria/engine.ts` con estado, carriles, saltos con búfer, arrastre, choques, meta, tiempo, muertes, vidas, puntuación, rondas y `end()`, sin dibujo ni loop. Sin reinicio por tecla en `gameover`.
5. Añadir el dibujo completo del mundo sin HUD ni overlays. Configurar el backing store con `dpr`.
6. Añadir el loop y los listeners: `mount()`, `destroy()`, `pause()`, `resume()`; `onChange` solo si cambia el snapshot; en pausa se dibuja sin `update`; al pausar se vacían `keys` y el búfer de salto; `blur` y `visibilitychange` pausan.
7. Añadir la gestión de teclas por fase con `preventDefault` solo fuera de `gameover`; los saltos ignoran `e.repeat`.
8. Crear `components/ranaria-player.tsx` (`"use client"`) sobre `PlayerShell`, con el motor en `useEffect`, `destroy()` en el cleanup y `score`, `lives` y `level` en el HUD.
9. Añadir el overlay de `ready` con controles, `PULSA ESPACIO` y `REQUIERE TECLADO` en táctil (`useSyncExternalStore`).
10. Conectar los botones: PAUSA y FIN desactivados en `ready`, `blur()` tras cada click, `pauseHint` `PULSA P O REANUDAR PARA CONTINUAR`.
11. Añadir `"ranaria": RanariaPlayer` a `GAME_PLAYERS`.
12. Añadir a `app/globals.css` `.ranaria-crt` (misma fórmula 4:3 que `.rocas-crt`), `.ranaria-ready`, `.ranaria-controls`, `.ranaria-start` y `.ranaria-touch`. `.cover-rana` ya existe y no cambia.
13. Crear la migración `0005_juego_ranaria.sql` (renumerar si `0005` ya está tomada al implementar), aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
14. Actualizar `CLAUDE.md` (Stack notes y lista de specs) con `ranaria` como juego real, y `references/implemented-games.md`: añadir su fila y ficha y quitar `ranaria` de la lista de simulaciones. Marcar S-001 como en curso en `references/game-suggestions-todo.md`.
15. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/ranaria/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con flechas, WASD, `P` / `Esc` y `PULSA ESPACIO`, y ningún carril se mueve.
- [ ] En `ready`, flechas y WASD no mueven la rana.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `Espacio` empieza la partida, oculta el overlay, los carriles se mueven y la barra de tiempo empieza a bajar.

**Mecánicas**

- [ ] La rana aparece en la columna central de la acera inferior, mirando arriba.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una casilla; mantener la tecla da un solo salto.
- [ ] Pulsar `↑` dos veces muy seguidas da dos saltos; una tercera pulsación durante el mismo salto se ignora.
- [ ] Bajar desde la acera inferior y salir lateralmente de la rejilla no tienen efecto.
- [ ] Los 9 carriles se mueven en la dirección de la tabla de Convenciones y sus entidades reaparecen por el borde opuesto sin saltos visibles.
- [ ] Tocar un vehículo resta una vida y la rana vuelve a la salida tras la animación.
- [ ] La rana sobre un tronco o unas boyas se desplaza con ellos.
- [ ] Saltar al agua sin plataforma resta una vida.
- [ ] Dejarse arrastrar hasta el borde del río resta una vida.
- [ ] Saltar al seto o a un nenúfar ocupado resta una vida.
- [ ] Agotar los 30 s resta una vida y la barra se rellena con la rana nueva.
- [ ] Cada fila nueva más alta suma 10 puntos; volver a pisar una fila ya alcanzada no suma.
- [ ] Llegar a un nenúfar libre con 20,4 s restantes suma `50 + 200` puntos y deja la rana dibujada en él.
- [ ] Un cruce perfecto desde la salida hasta un nenúfar suma al menos 150 puntos más el bonus de tiempo.
- [ ] Llenar los 5 nenúfares suma 500, vacía los nenúfares y pasa el HUD a nivel `02`.
- [ ] En nivel 2 los carriles van 1,1 veces más rápido que en nivel 1, y a partir del nivel 6 no aceleran más (1,5×).
- [ ] Tras la muerte, la nueva rana vuelve a puntuar avance desde la fila 10.

**HUD y visual**

- [ ] El HUD React muestra Jugador, Puntuación, Vidas y Nivel, sin Líneas, y coincide con la partida.
- [ ] El canvas no dibuja score, vidas ni nivel.
- [ ] La barra de tiempo cambia a amarillo por debajo de 10 s y a magenta por debajo de 5 s.
- [ ] Rana, vehículos, troncos, boyas, agua y nenúfares usan los colores de Convenciones y las líneas son nítidas en HiDPI.
- [ ] La rana mira en la dirección del último salto.
- [ ] El canvas no carga ninguna imagen ni audio (pestaña Network).
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las teclas de juego no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan carriles, rana y barra de tiempo y muestran EN PAUSA.
- [ ] REANUDAR, `P` y `Esc` continúan con la misma puntuación, el mismo tiempo y la rana en la misma posición.
- [ ] En pausa, flechas y WASD no mueven la rana al reanudar.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` no vuelve a pausar.

**Fin de partida y guardado**

- [ ] Al perder la tercera vida se abre el modal con la puntuación real, tras la animación de muerte.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios y las letras W, A, S y D en el campo de nombre.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'ranaria'` y la puntuación mostrada.
- [ ] Terminar con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA`.
- [ ] JUGAR DE NUEVO empieza en `playing` con nivel `01`, 3 vidas, 0 puntos, nenúfares vacíos y 30 s.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] `select id from games where ranked` devuelve `rocas`, `caida`, `bloque-buster`, `ranaria` y `serpentina` si SPEC 08 ya está implementada.
- [ ] `select title, cover, sort_order from games where id = 'ranaria'` devuelve `RANARIA`, `cover-rana` y `7`.
- [ ] Como `anon`, insertar en un juego no ranked sigue fallando.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.
- [ ] Tras guardar, la marca aparece en la ficha de `ranaria`, en su pestaña del Salón y en ACTIVIDAD EN VIVO.
- [ ] La ficha de `ranaria` muestra `TECLADO` y el texto de `long` de la migración.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera los carriles.

**Regresiones**

- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04 y su HUD muestra Vidas.
- [ ] `/juegos/caida/jugar` conserva las mecánicas de SPEC 06 y su HUD muestra Líneas sin Vidas.
- [ ] `/juegos/bloque-buster/jugar` conserva las mecánicas de SPEC 07.
- [ ] `/juegos/gloton/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** definida por game-jam de forma autónoma a partir del tema «RANARIA: cruza carriles de tráfico y troncos por rejilla hasta los nenúfares contra reloj; puntos por avance, nenúfar y tiempo sobrante». Revisar antes de aprobar.
- **Sí:** concepto fijado por el usuario, sin generar 3 alternativas. El tema ya define mecánica y puntuación.
- **Sí:** reutilizar la fila `ranaria`. Decisión del usuario el 2026-11-18, que anula para esta jam la regla de fila nueva; es el patrón de SPEC 06–08.
- **No:** fila nueva `ranaria-neon`. Dejaría `ranaria` como simulación duplicada del mismo concepto.
- **Sí:** conservar `title`, `short`, `cat`, `cover`, `color` y `sort_order`. `cover-rana` (franjas de río y rana verde) ya encaja con el juego.
- **Sí:** reescribir `long`. La ficha debe describir los 30 s, los nenúfares, la puntuación y las 3 vidas.
- **Sí:** `gloton` como simulación de regresión. `ranaria` deja de ser simulación.
- **Sí:** juego de género diseñado desde cero, sin nombres, personajes, trazados ni arte de ningún juego comercial. Regla de la jam.
- **Sí:** boyas de neón en vez de animales nadadores. Plataforma original que encaja con la estética vectorial.
- **Sí:** rejilla de 15×12 casillas de 50 px con 25 px de margen. Columna central exacta (rana y nenúfar central en `x = 400`) y mundo 800×600.
- **No:** 16 columnas a sangre. No hay columna central y los 5 nenúfares no quedan simétricos.
- **Sí:** 5 carriles de río y 4 de carretera. Caben en 12 filas con salida, mediana y meta.
- **Sí:** salto de 0,1 s en el aire con búfer de 1. Respuesta inmediata sin perder pulsaciones rápidas ni acumular colas largas.
- **Sí:** saltos ignoran `e.repeat`. Mantener una tecla no debe lanzar la rana a un carril sin querer.
- **Sí:** `x` continua en el río y ajustada a columna en tierra. El arrastre necesita `x` continua; la carretera se lee mejor alineada.
- **Sí:** 30 s por rana y bonus `10 × segundos`. Cumple el contra reloj del tema y diferencia marcas en el ranking.
- **Sí:** avance solo por fila nueva más alta de cada rana. Evita sumar puntos subiendo y bajando.
- **Sí:** bonus de ronda de 500 y aceleración del 10 % por nivel hasta 1,5×. Progresión mínima jugable en la 01; los trazados por nivel llegan en la 02.
- **Sí:** 3 vidas en el HUD. `PlayerShell` ya muestra Vidas con `lives`.
- **Sí:** barra de tiempo en el canvas. Es información de juego que cambia cada frame; meterla en el HUD obligaría a ampliar `PlayerShell` y a emitir 60 snapshots por segundo.
- **No:** campo Tiempo en `PlayerShell`. Ampliación no imprescindible.
- **Sí:** los carriles siguen moviéndose durante la animación de muerte. El mundo no se congela y la pausa sigue siendo la única congelación.
- **Sí:** carriles quietos en `ready`. Coherente con "la partida no avanza" de SPEC 06–08.
- **Sí:** `Espacio` empieza en `ready`; `P` / `Esc` pausan o reanudan en `playing`. Convención de la plataforma.
- **Sí:** sin reinicio por tecla en `gameover`; JUGAR DE NUEVO llama a `restart()`. El modal decide y no se pierde la puntuación.
- **Sí:** `preventDefault` solo fuera de `gameover`. El campo de nombre necesita espacios y WASD.
- **Sí:** auto-pausa con `blur` y `visibilitychange`, vaciando teclas y búfer. Una pestaña oculta no debe matar a la rana.
- **Sí:** aviso `REQUIERE TECLADO` en táctil, sin bloquear. Una tablet puede tener teclado; el táctil llega en la 03.
- **Sí:** glow solo en rana, vehículos (≤ 12) y barra en aviso. `shadowBlur` en troncos, boyas y seto bajaría los FPS sin aportar lectura.
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.
- **Sí:** `controls = 'TECLADO'`. Solo teclado en esta spec.
- **Sí:** dejar `TOP JUGADORES` como está. Revisarlo merece su propia spec.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Número de migración `0005` ocupado al implementar (SPEC 08 reserva `0004`) | Renumerar al siguiente libre; el contenido no cambia.                                                         |
| React Strict Mode duplica el loop en dev                                   | `destroy()` cancela el RAF y quita listeners; motor creado en `useEffect`.                                    |
| `Espacio` activa el botón con foco                                         | `blur()` tras cada click y `preventDefault` en la partida.                                                    |
| `preventDefault` global rompe el input del modal (WASD)                    | Nunca en `gameover`; criterio propio con W, A, S y D.                                                         |
| `onChange` en cada frame provoca renders                                   | Solo se emite si cambia el snapshot; el tiempo no está en el snapshot.                                        |
| `shadowBlur` baja los FPS                                                  | Glow solo en rana, vehículos y barra en aviso.                                                                |
| La CRT supera el alto del viewport                                         | `.ranaria-crt` limita el ancho con `100dvh`.                                                                  |
| Entidades que aparecen de golpe al dar la vuelta                           | `WRAP = 1000` con 200 px fuera de pantalla, mayor que el tronco más largo (200 px).                           |
| Un frame largo hace que un bólido atraviese a la rana sin tocarla          | Tope de `dt` de 50 ms: el bólido avanza como mucho 7,5 px a 1× y 11,25 px a 1,5×, menos que la caja de 34 px. |
| Saltar en el aire atraviesa un vehículo                                    | Riesgo aceptado: 0,1 s de salto es parte del timing del género y se documenta en Decisiones.                  |
| Partidas infinitas a 1,5× con un jugador experto                           | Riesgo aceptado en la 01; la 02 reduce el tiempo por rana y añade amenazas.                                   |
| `TOP JUGADORES` mezcla marcas de juegos con escalas distintas              | Riesgo aceptado; se revisa en una spec propia.                                                                |

## Lo que **no** entra en esta spec

- Trazados por nivel, boyas que se sumergen, anguila, luciérnaga, tiempo decreciente y vida extra (SPEC JAM `ranaria` 02).
- Controles táctiles, popups de puntos y salpicaduras (SPEC JAM `ranaria` 03).
- Sonido.
- Cambios de `title`, `short`, `cover` o `sort_order` de `ranaria`.
- Antifraude o Auth real.
- Revisión de `TOP JUGADORES`.
- Otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
