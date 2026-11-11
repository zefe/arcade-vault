# SPEC 07 — Juego BLOQUE BUSTER real en el reproductor

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05, SPEC 06
> **Fecha:** 2026-11-10
> **Objetivo:** Adaptar `references/started-games/04-arkanoid/` como motor TypeScript en canvas para que `/juegos/bloque-buster/jugar` sea un juego real con ranking, sobre `PlayerShell`.

## Por qué existe esta spec

BLOQUE BUSTER es hoy la simulación de SPEC 01: su score sube solo y `ranked = false`.
`game.js` usa globals, listeners sueltos en `document` y en el canvas, un `requestAnimationFrame` infinito y un `dt` sin tope.
Además dibuja el HUD, la pausa con selector de nivel y los overlays de GAME OVER y victoria dentro del canvas, y carga un spritesheet y dos `Audio`.
Por eso no se puede montar tal cual en una ruta de Next.
El registro `components/game-players.ts` y el HUD opcional de `PlayerShell` ya existen desde SPEC 06: esta spec solo añade una entrada y usa `score`, `lives` y `level` tal cual.

## Alcance

**Dentro:**

- Motor en `lib/games/bloque-buster/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas de `game.js` y `levels.js`:
  - Paleta controlada con `←` `→` y con el ratón sobre el canvas.
  - Pelota con rebote en paredes laterales, techo y paleta.
  - Colisión AABB con bloques: un bloque por frame, invierte `vy` y suma 10 puntos.
  - Animación de explosión de 150 ms al romper un bloque.
  - 3 vidas; al caer la pelota se pierde una y la pelota sale de nuevo desde la paleta.
  - 5 niveles con los patrones de `levels.js` y multiplicador de velocidad por nivel.
  - Al limpiar un nivel se carga el siguiente; al limpiar el nivel 5 termina la partida.
- Física ya expresada en px/s en el original; solo se añade el tope de `dt` de 50 ms.
- Paleta neón de la plataforma con formas vectoriales, sin spritesheet.
- Mundo lógico 800×600 dentro de `.crt-screen`, escalado y nítido en HiDPI.
- HUD React de la plataforma con puntuación, vidas y nivel. `PlayerShell` no cambia.
- Overlay inicial con controles, `PULSA ESPACIO` y `REQUIERE TECLADO O RATÓN` en táctil.
- PAUSA real con botón, `P` o `Esc`, y auto-pausa al perder foco o cambiar de pestaña.
- FIN, perder la última vida y completar el nivel 5 abren el modal FIN DEL JUEGO existente.
- Guardado en `scores` con `game_id = 'bloque-buster'` mediante una migración que pone `ranked = true`.
- Entrada `'bloque-buster': BloqueBusterPlayer` en `GAME_PLAYERS`.
- Ficha de `bloque-buster` corregida: `long` fiel a lo implementado y `controls = 'TECLADO / RATÓN'`.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance: saque manual, ángulo de rebote según el punto de impacto, power-ups, bucle de niveles tras el 5.
- Antifraude, topes de score o Auth real.
- Revisar `TOP JUGADORES` de Home, que compara marcas de juegos distintos.
- Implementar otros juegos.
- Tests automatizados.
- Descartado de la referencia: spritesheet `spritesheet-breakout.png` y `spritesheet.js`, `ball-bounce.mp3` y `break-sound.mp3`, selector de nivel 1–5 en la pausa y su listener `click`, HUD dibujado en canvas, overlays `GAME OVER` y `¡Completaste el juego!` en canvas, estado `win`.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0003_juego_bloque_buster.sql`:

```sql
update public.games
set ranked = true,
    controls = 'TECLADO / RATÓN',
    long = 'Pilota una paleta de neón y rebota la pelota para pulverizar muros de bloques. Cinco niveles con patrones distintos: parrilla completa, pirámide, tablero de ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota y tienes 3 vidas para completarlos todos.'
where id = 'bloque-buster';
```

`title`, `short`, `cat` (`ARCADE`), `cover` (`cover-bricks`), `color` (`cyan`) y `sort_order` (`1`) no cambian.

Contrato del motor (`lib/games/bloque-buster/engine.ts`):

```ts
export type BloqueBusterPhase = "ready" | "playing" | "gameover";

export type BloqueBusterSnapshot = {
  phase: BloqueBusterPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number; // 1–5
};

export class BloqueBusterEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: BloqueBusterSnapshot) => void,
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

Entidades (`lib/games/bloque-buster/entities.ts`):

```ts
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}; // elapsed en segundos
// collideAABB, drawPaddle, drawBall, drawBlock y drawExplosion(ctx, …)
```

Niveles (`lib/games/bloque-buster/levels.ts`):

```ts
export type LevelDef = {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
};
export const LEVELS: LevelDef[]; // los 5 niveles de levels.js, mismos patrones, colores y velocidades
```

Registro (`components/game-players.ts`):

```ts
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  caida: CaidaPlayer,
  "bloque-buster": BloqueBusterPlayer,
};
```

Convenciones:

- Mundo lógico fijo de 800×600 y `dt` en segundos con tope de 50 ms.
- Valores de juego sin cambios:
  - Paleta: 81×14 en `y = 560`, centrada al empezar, `PADDLE_SPEED = 400` px/s, limitada a `0…719`.
  - Pelota: 16×16, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300` px/s, multiplicados por `LEVELS[n].speed`.
  - Bloques: `BLOCK_W = 64`, `BLOCK_H = 24`, rejilla 10×6 con origen `x = 80`, `y = 80`.
  - Velocidades por nivel: `1.00`, `1.10`, `1.21`, `1.33`, `1.46`.
  - Bloques por nivel: 60, 40, 30, 39 y 39. Puntuación máxima: 2080.
  - 10 puntos por bloque. 3 vidas.
  - `EXPLOSION_DURATION = 0.15` s, en 4 pasos: `min(floor(elapsed / 0.15 * 4), 3)`.
- Física como el original:
  - Pared izquierda, derecha y techo: recoloca la pelota en el borde y fuerza el signo de `vx` o `vy`.
  - Paleta: rebota si `vy > 0`, hay solape horizontal y el borde inferior de la pelota está entre `paddle.y` y `paddle.y + 14 + 8`; recoloca la pelota encima y fuerza `vy` negativo. `vx` no cambia.
  - Bloque: primer bloque vivo en solape AABB; se marca muerto, se crea la explosión, `+10` y `vy = -vy`. Solo uno por frame.
  - Pelota perdida si `ball.y > 600`: `lives - 1`; con 0 vidas, `gameover`; si no, la pelota vuelve centrada encima de la paleta con la velocidad del nivel y sale al instante.
  - Nivel limpio: si `level < 5`, se carga el siguiente, se vacían las explosiones y la pelota vuelve encima de la paleta, que no se recoloca. Si `level = 5`, `gameover`.
- Ratón: `mousemove` en el canvas; `paddle.x = clamp(mouseX - 40.5, 0, 719)` con `mouseX = (clientX - rect.left) * 800 / rect.width`. Solo se aplica en `playing` sin pausa.
- Cursor visible sobre el canvas.
- Colores en `lib/games/bloque-buster/constants.ts`, con los valores de los tokens de `globals.css` y 3 derivados:
  - Paleta: `#00f5ff`.
  - Pelota: `#e6e9ff`.
  - Bloques `cyan` `#00f5ff`, `yellow` `#f5ff00`, `magenta` `#ff006e`, `green` `#00ff88`.
  - Bloques derivados: `red` `#ff3b3b`, `hotpink` `#ff4fd8`, `gray` `#8a8fb8`.
- Bloques con relleno de su color, borde interior oscuro de 1 px y brillo superior de 4 px con `rgba(255,255,255,0.12)`, sin glow.
- Explosión: rectángulo del color del bloque que crece 2 px por lado en cada paso, con `globalAlpha = (4 - paso) / 4`, sin glow.
- Glow (`shadowBlur`) solo en paleta y pelota.
- En `ready` se ven los bloques del nivel 1, la paleta centrada y la pelota encima, sin avanzar.
- El canvas no dibuja score, vidas, nivel, pausa ni game over.
- Backing store `800 × dpr` por `600 × dpr`, con `dpr` limitado a 2.

Teclas y ratón:

| Entrada     | Acción            | Fases activas        |
| ----------- | ----------------- | -------------------- |
| `←` `→`     | Mover la paleta   | `playing`, sin pausa |
| Ratón       | Mover la paleta   | `playing`, sin pausa |
| `Espacio`   | Empezar           | `ready`              |
| `P` / `Esc` | Pausar o reanudar | `playing`            |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para overlays y estilos.
2. Crear `lib/games/bloque-buster/constants.ts` con tamaños, valores de juego, colores, `EXPLOSION_DURATION`, `MAX_DT`, `MAX_DPR` y `clamp`.
3. Crear `lib/games/bloque-buster/levels.ts` con `LevelDef` y los 5 `LEVELS` de `levels.js`, sin cambios.
4. Crear `lib/games/bloque-buster/entities.ts` con los tipos, `collideAABB` y las funciones de dibujo. Cada `draw` recibe `ctx`.
5. Crear `lib/games/bloque-buster/engine.ts` con estado, carga de nivel, movimiento de paleta, física de pelota, colisiones, explosiones, vidas, cambio de nivel, fin de partida y `end()`, sin dibujo ni loop. Sin reinicio por tecla en `gameover`.
6. Añadir el dibujo de bloques, explosiones, paleta y pelota, sin HUD ni overlays. Configurar el backing store con `dpr`.
7. Añadir el loop y los listeners: `mount()`, `destroy()`, `pause()`, `resume()`; `onChange` solo si cambia el snapshot; en pausa se dibuja sin `update`; al pausar se limpian `keys`; `blur` y `visibilitychange` pausan.
8. Añadir la gestión de teclas por fase con `preventDefault` solo fuera de `gameover`, y el `mousemove` del canvas, ambos retirados en `destroy()`.
9. Crear `components/bloque-buster-player.tsx` (`"use client"`) sobre `PlayerShell`, con el motor en `useEffect`, `destroy()` en el cleanup y `score`, `lives` y `level` en el HUD.
10. Añadir el overlay de `ready` con controles, `PULSA ESPACIO` y `REQUIERE TECLADO O RATÓN` en táctil (`useSyncExternalStore`).
11. Conectar los botones: PAUSA y FIN desactivados en `ready`, `blur()` tras cada click, `pauseHint` `PULSA P O REANUDAR PARA CONTINUAR`.
12. Añadir `"bloque-buster": BloqueBusterPlayer` a `GAME_PLAYERS`.
13. Añadir a `app/globals.css` `.bloque-buster-crt` (misma fórmula 4:3 que `.rocas-crt`) y los estilos `.bloque-buster-ready`, `.bloque-buster-controls`, `.bloque-buster-start` y `.bloque-buster-touch`.
14. Crear la migración `0003_juego_bloque_buster.sql`, aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
15. Actualizar `CLAUDE.md` (Stack notes): juegos reales `rocas`, `caida` y `bloque-buster`.
16. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/bloque-buster/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con `←` `→`, ratón, `P` / `Esc` y `PULSA ESPACIO`, y la pelota no se mueve.
- [ ] En `ready`, mover el ratón o pulsar `←` `→` no mueve la paleta.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `Espacio` empieza la partida, oculta el overlay y la pelota sale hacia arriba a la derecha.

**Mecánicas**

- [ ] `←` y `→` mueven la paleta de forma continua y no sale de los bordes del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta bajo el cursor, también con la CRT a otro tamaño.
- [ ] La pelota rebota en las paredes laterales, el techo y la paleta, y nunca sale por ellos.
- [ ] Romper un bloque suma exactamente 10 puntos y muestra la explosión.
- [ ] El nivel 1 muestra la parrilla completa de 60 bloques en 6 colores.
- [ ] Al limpiar un nivel, el HUD pasa al nivel siguiente y aparecen sus bloques: pirámide (2), ajedrez (3), filas con huecos (4), marco con cruz (5).
- [ ] La velocidad de la pelota en el nivel 5 es 1,46 veces la del nivel 1.
- [ ] Perder la pelota resta una vida y la pelota sale de nuevo desde encima de la paleta.
- [ ] La puntuación máxima posible es 2080.

**HUD y visual**

- [ ] El HUD React muestra Jugador, Puntuación, Vidas y Nivel, y coincide con la partida.
- [ ] El canvas no dibuja score, vidas ni nivel.
- [ ] Bloques, paleta y pelota usan los colores de Convenciones y las líneas son nítidas en HiDPI.
- [ ] El canvas no carga ninguna imagen ni audio (pestaña Network).
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las teclas de juego no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran EN PAUSA, sin selector de nivel.
- [ ] REANUDAR, `P` y `Esc` continúan con la misma puntuación y la pelota en la misma posición.
- [ ] En pausa, `←` `→` y el ratón no mueven la paleta.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Una tecla mantenida al perder el foco no sigue activa al reanudar.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` no vuelve a pausar.

**Fin de partida y guardado**

- [ ] Al perder la tercera vida se abre el modal con la puntuación real.
- [ ] Al limpiar el nivel 5 se abre el modal con la puntuación real.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios en el campo de nombre.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'bloque-buster'` y la puntuación mostrada.
- [ ] Terminar con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA`.
- [ ] JUGAR DE NUEVO empieza en `playing` con nivel `01`, 3 vidas, 0 puntos y los 60 bloques.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] `select id from games where ranked` devuelve `rocas`, `caida` y `bloque-buster`.
- [ ] Como `anon`, insertar en un juego no ranked sigue fallando.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.
- [ ] Tras guardar, la marca aparece en la ficha de `bloque-buster`, en su pestaña del Salón y en ACTIVIDAD EN VIVO.
- [ ] La ficha de `bloque-buster` muestra `TECLADO / RATÓN` y el texto de `long` de la migración.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera la pelota.

**Regresiones**

- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04 y su HUD muestra Vidas.
- [ ] `/juegos/caida/jugar` conserva las mecánicas de SPEC 06 y su HUD muestra Líneas sin Vidas.
- [ ] `/juegos/serpentina/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/started-games/04-arkanoid/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** motor TS con ciclo de vida sobre `PlayerShell`. Patrón de SPEC 04.
- **Sí:** `ranked = true` por migración. Regla de SPEC 05: solo juegos con motor real.
- **Sí:** reutilizar la fila `bloque-buster`. Ya describe este juego y conserva cover, color y orden.
- **No:** fila nueva. Dejaría `bloque-buster` como simulación duplicada.
- **Sí:** reescribir `long`. La ficha debe describir los 5 niveles y las 3 vidas, no "patrones imposibles".
- **Sí:** mantener balance, velocidades y puntuación originales. El objetivo es adaptar, no rediseñar.
- **Sí:** paleta de 81 px, como `game.js`. El README habla del sprite de 162 px, pero el código dibuja 81.
- **Sí:** añadir solo el tope de `dt` de 50 ms. La física ya va en px/s; el tope evita que la pelota atraviese bloques tras un frame largo.
- **Sí:** completar el nivel 5 abre el modal FIN DEL JUEGO. Equivale al estado `win` sin cambiar el balance.
- **No:** bucle de niveles tras el 5. Es mecánica nueva y haría partidas infinitas.
- **Sí:** ratón y teclado. Es el control original; el ratón es el más preciso.
- **Sí:** ratón ignorado en `ready`, pausa y `gameover`. El original lo aplicaba siempre, pero mover la paleta en pausa da ventaja.
- **Sí:** cursor visible. El original no lo oculta.
- **Sí:** saque inmediato al empezar, al perder vida y al cambiar de nivel. Es el comportamiento original.
- **No:** pelota pegada hasta `Espacio`. Es mecánica nueva.
- **Sí:** `Espacio` para empezar. Convención de ROCAS y CAÍDA.
- **Sí:** quitar el selector de nivel de la pausa. Con ranking permitiría saltar niveles.
- **Sí:** paleta neón vectorial con 4 tokens y 3 derivados. Coherente con ROCAS y CAÍDA, y sin carga de assets.
- **No:** spritesheet de la referencia. Exige cargar y liberar una imagen y desentona con la plataforma.
- **Sí:** explosión vectorial de 4 pasos en 150 ms. Conserva la duración y el ritmo de los 4 frames originales.
- **Sí:** glow solo en paleta y pelota. Hasta 60 bloques con `shadowBlur` bajarían los FPS.
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.
- **Sí:** aviso `REQUIERE TECLADO O RATÓN` en táctil, sin bloquear. El juego admite ambos y una tablet puede tener teclado.
- **Sí:** `PlayerShell` sin cambios. El juego usa exactamente puntuación, vidas y nivel.
- **Sí:** clave `"bloque-buster"` entre comillas en `GAME_PLAYERS`. El id del catálogo lleva guion.
- **Sí:** dejar `TOP JUGADORES` como está. Revisarlo merece su propia spec.

## Riesgos

| Riesgo                                                          | Mitigación                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| React Strict Mode duplica el loop en dev                        | `destroy()` cancela el RAF y quita listeners; motor creado en `useEffect`.   |
| `Espacio` activa el botón con foco                              | `blur()` tras cada click y `preventDefault` en la partida.                   |
| `preventDefault` global rompe el input del modal                | Nunca en `gameover`.                                                         |
| `onChange` en cada frame provoca renders                        | Solo se emite si cambia el snapshot.                                         |
| `shadowBlur` baja los FPS                                       | Glow solo en paleta y pelota.                                                |
| La CRT supera el alto del viewport                              | `.bloque-buster-crt` limita el ancho con `100dvh`.                           |
| El ratón calcula mal la posición con la CRT escalada            | Coordenada convertida con `800 / rect.width`, criterio de aceptación propio. |
| Los pseudo-elementos CRT tapan el canvas y bloquean `mousemove` | Verificar `pointer-events: none` en los pseudo-elementos de `.crt-screen`.   |
| La pelota queda dentro de un bloque y rebota varias veces       | Comportamiento original con un bloque por frame; riesgo aceptado.            |
| Puntuación máxima fija de 2080: empates en el ranking           | Riesgo aceptado; la vista `leaderboard` desempata por la marca más antigua.  |
| `TOP JUGADORES` mezcla marcas de juegos con escalas distintas   | Riesgo aceptado; se revisa en una spec propia.                               |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance: saque manual, ángulo de rebote, power-ups, bucle de niveles.
- Spritesheet y selector de nivel de la referencia.
- Antifraude o Auth real.
- Revisión de `TOP JUGADORES`.
- Otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
