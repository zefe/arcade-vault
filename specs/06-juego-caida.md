# SPEC 06 — Juego CAÍDA real en el reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-11-10
> **Objetivo:** Adaptar `references/started-games/03-tetris/` como motor TypeScript en canvas para que `/juegos/caida/jugar` sea un juego real con ranking, sobre `PlayerShell`.

## Por qué existe esta spec

CAÍDA es hoy la simulación de SPEC 01: su score sube solo y `ranked = false`.
`game.js` usa globals, listeners sin limpiar, un `requestAnimationFrame` que se cancela y relanza al pausar, HUD en el DOM, overlay propio de PAUSA y GAME OVER, y un selector de tema con `localStorage`.
Por eso no se puede montar tal cual en una ruta de Next.
CAÍDA es el segundo juego real, así que esta spec también sustituye `game.id === "rocas"` por un registro de players, como se difirió en SPEC 04 y SPEC 05.
Además amplía `PlayerShell` para un HUD sin vidas y con líneas.

## Alcance

**Dentro:**

- Motor en `lib/games/caida/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas de `game.js`:
  - Tablero de 10×20 celdas.
  - 8 piezas: las 7 estándar y la tuerca, elegidas al azar con probabilidad uniforme.
  - Movimiento lateral y rotación horaria con wall kicks `[0, -1, 1, -2, 2]`.
  - Bajada suave y caída instantánea.
  - Pieza fantasma y vista previa de la siguiente pieza.
  - Limpieza de líneas, puntuación clásica por nivel, nivel cada 10 líneas y aceleración de la caída.
  - Fin de partida cuando la pieza nueva colisiona al aparecer.
- Gravedad por tiempo acumulado en segundos, idéntica al original a cualquier frecuencia de refresco.
- Paleta neón de la plataforma con 3 colores derivados.
- Mundo lógico 800×600 con el tablero centrado y la vista previa SIGUIENTE dibujada en el mismo canvas.
- Canvas dentro de `.crt-screen`, escalado y nítido en HiDPI.
- HUD React de la plataforma con puntuación, líneas y nivel, sin vidas.
- Ampliación opcional de `PlayerShell`: `lives` opcional y `lines` nuevo, sin cambios en ROCAS ni en la simulación.
- Overlay inicial con controles y `PULSA ESPACIO`.
- PAUSA real con botón, `P` o `Esc`, y auto-pausa al perder foco o cambiar de pestaña.
- FIN y fin de partida abren el modal FIN DEL JUEGO existente.
- Guardado en `scores` con `game_id = 'caida'` mediante una migración que pone `ranked = true`.
- Aviso `REQUIERE TECLADO` en táctil, sin bloquear el juego.
- Registro `components/game-players.ts` que sustituye `game.id === "rocas"`.
- Ficha de `caida` corregida: `long` fiel a lo implementado y `controls = 'TECLADO'`.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance: sin lock delay, sin hold, sin bolsa de 7, sin DAS/ARR propio.
- Antifraude, topes de score o Auth real.
- Revisar `TOP JUGADORES` de Home, que compara marcas de juegos distintos.
- Implementar otros juegos.
- Tests automatizados.
- Descartado de la referencia: selector de tema claro/oscuro y su clave `tetris-theme` en `localStorage`, overlay propio de PAUSA y GAME OVER, botón `Reiniciar`, panel lateral de controles en el DOM y canvas aparte `#next-canvas`.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0002_juego_caida.sql`:

```sql
update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Piezas geométricas descienden desde la oscuridad, incluida una tuerca hueca de 3×3. Muévelas, rótalas y encástralas para limpiar líneas. La pieza fantasma marca dónde caerán y el panel anticipa la siguiente. La velocidad aumenta cada 10 líneas.'
where id = 'caida';
```

`title`, `short`, `cat` (`PUZZLE`), `cover` (`cover-tetro`), `color` (`magenta`) y `sort_order` (`2`) no cambian.

Contrato del motor (`lib/games/caida/engine.ts`):

```ts
export type CaidaPhase = "ready" | "playing" | "gameover";

export type CaidaSnapshot = {
  phase: CaidaPhase;
  paused: boolean;
  score: number;
  lines: number;
  level: number;
};

export class CaidaEngine {
  constructor(canvas: HTMLCanvasElement, onChange: (s: CaidaSnapshot) => void);
  mount(): void; // registra listeners, arranca el loop y queda en "ready"
  start(): void; // "ready" → "playing"
  pause(): void;
  resume(): void;
  end(): void; // cualquier fase → "gameover"
  restart(): void; // partida nueva, directamente en "playing"
  destroy(): void; // quita listeners y cancela el RAF
}
```

Entidades (`lib/games/caida/entities.ts`):

```ts
export type Board = number[][]; // ROWS × COLS; 0 = vacía, 1–8 = tipo de pieza
export type Piece = { type: number; shape: number[][]; x: number; y: number };
// createBoard, randomPiece, collide, rotateCW, clearFullRows y drawBlock(ctx, …)
```

Cambio en las props de `components/player-shell.tsx`:

```ts
type PlayerShellProps = {
  // ...props actuales
  lives?: number; // si es undefined, no se pinta la estadística Vidas
  lines?: number; // si está definido, se pinta Líneas entre Puntuación y Nivel
};
```

Registro (`components/game-players.ts`):

```ts
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  caida: CaidaPlayer,
};
```

`app/juegos/[id]/jugar/page.tsx` usa `const Player = GAME_PLAYERS[game.id] ?? GamePlayer`.

Convenciones:

- Mundo lógico fijo de 800×600 y `dt` en segundos con tope de 50 ms.
- Tablero: `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, dibujado en `x = 250…550`, `y = 0…600`.
- Vista previa SIGUIENTE: caja de 120×120 a la derecha del tablero, con celdas de 30 px y la pieza centrada en una rejilla de 4×4, como `drawNext()`.
- Valores de juego sin cambios:
  - Piezas `PIECES[1..8]` con las matrices de `game.js`, incluida la tuerca `[[8,8,8],[8,0,8],[8,8,8]]`.
  - Aparición en `x = floor(COLS / 2) - floor(ancho / 2)`, `y = 0`.
  - `LINE_SCORES = [0, 100, 300, 500, 800]`, multiplicado por el nivel previo a la limpieza.
  - Caída instantánea: +2 por celda recorrida. Bajada suave: +1 por fila bajada; si no puede bajar, fija la pieza sin puntos.
  - Nivel `floor(lines / 10) + 1`.
  - Intervalo de caída `dropIntervalFor(level) = max(0.1, 1 - (level - 1) * 0.09)` segundos, exportado desde `constants.ts`.
  - La pieza se fija en cuanto no puede bajar, sin lock delay.
- Gravedad: `dropAccum += dt`; si `dropAccum >= dropInterval`, se pone a `0` y la pieza baja una fila o se fija, como el original.
- Movimiento con `←` `→` `↓` mantenidas: autorepeat del sistema operativo, un paso por `keydown`.
- Pieza fantasma con `globalAlpha = 0.2`, y brillo superior de 4 px con `rgba(255,255,255,0.12)` en cada bloque.
- Colores en `lib/games/caida/constants.ts`:
  - I: `#00f5ff`.
  - O: `#f5ff00`.
  - T: `#ff006e`.
  - S: `#00ff88`.
  - Z: `#ff3b3b`.
  - J: `#3d7bff`.
  - L: `#ff8a00`.
  - Tuerca: `#e6e9ff`.
  - Rejilla del tablero y borde de la caja SIGUIENTE: `#00f5ff` con alpha.
- Glow (`shadowBlur`) solo en la pieza actual y en la vista previa; los bloques fijados y el fantasma, sin glow.
- El canvas dibuja el texto `SIGUIENTE` sobre la caja de vista previa. No dibuja score, líneas ni nivel.
- En `ready` se ven el tablero vacío, la primera pieza y la siguiente, sin avanzar.
- Backing store `800 × dpr` por `600 × dpr`, con `dpr` limitado a 2.

Teclas:

| Tecla       | Acción                         | Fases activas         |
| ----------- | ------------------------------ | --------------------- |
| `←` `→`     | Mover una columna (con repeat) | `playing`             |
| `↓`         | Bajada suave (con repeat)      | `playing`             |
| `↑` / `X`   | Rotar en sentido horario       | `playing`, sin repeat |
| `Espacio`   | Caída instantánea              | `playing`, sin repeat |
| `Espacio`   | Empezar                        | `ready`               |
| `P` / `Esc` | Pausar o reanudar              | `playing`             |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente y su uso desde Server Components. Aplicar `/frontend-design` para overlays y estilos.
2. Crear `components/game-players.ts` con `rocas` y usarlo en `app/juegos/[id]/jugar/page.tsx` con `GamePlayer` como fallback. Verificar: `/juegos/rocas/jugar` y `/juegos/caida/jugar` (aún simulación) funcionan igual.
3. Ampliar `PlayerShell` con `lives?` y `lines?`. Verificar: ROCAS y la simulación muestran el mismo HUD que antes.
4. Crear `lib/games/caida/constants.ts` con tamaños, piezas, `LINE_SCORES`, `dropIntervalFor`, colores, `MAX_DT` y `MAX_DPR`.
5. Crear `lib/games/caida/entities.ts` con `Board`, `Piece`, `createBoard`, `randomPiece`, `collide`, `rotateCW`, `clearFullRows` y `drawBlock`.
6. Crear `lib/games/caida/engine.ts` con estado, gravedad, movimiento, rotación con wall kicks, bajadas, fijado, limpieza, puntuación, nivel, fin de partida y `end()`, sin dibujo ni loop. Sin reinicio por tecla en `gameover`.
7. Añadir el dibujo del tablero, rejilla, bloques, fantasma, pieza actual y caja SIGUIENTE, sin HUD ni overlay de game over. Configurar el backing store con `dpr`.
8. Añadir el loop y los listeners: `mount()`, `destroy()`, `pause()`, `resume()`; `onChange` solo si cambia el snapshot; en pausa se dibuja sin `update`; al pausar se limpian `keys` y `justPressed`; `blur` y `visibilitychange` pausan.
9. Añadir la gestión de teclas por fase de la tabla anterior, con `preventDefault` solo fuera de `gameover`.
10. Crear `components/caida-player.tsx` (`"use client"`) sobre `PlayerShell`, con el motor en `useEffect`, `destroy()` en el cleanup, `lines` en el HUD y sin `lives`.
11. Añadir el overlay de `ready` con controles, `PULSA ESPACIO` y `REQUIERE TECLADO` en táctil (`useSyncExternalStore`).
12. Conectar los botones: PAUSA y FIN desactivados en `ready`, `blur()` tras cada click, `pauseHint` `PULSA P O REANUDAR PARA CONTINUAR`.
13. Añadir `caida: CaidaPlayer` a `GAME_PLAYERS`.
14. Añadir a `app/globals.css` `.caida-crt` (misma fórmula 4:3 que `.rocas-crt`) y los estilos `.caida-ready`, `.caida-controls`, `.caida-start` y `.caida-touch`.
15. Crear la migración `0002_juego_caida.sql`, aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
16. Actualizar `CLAUDE.md` (Stack notes): los juegos reales se seleccionan por `GAME_PLAYERS` en `components/game-players.ts`, y `PlayerShell` admite `lives` y `lines` opcionales.
17. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/caida/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con `←` `→`, `↑` / `X`, `↓`, `Espacio`, `P` y `PULSA ESPACIO`, y la pieza no baja.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `Espacio` empieza la partida, oculta el overlay y no suelta la primera pieza.

**Mecánicas**

- [ ] Aparecen los 8 tipos de pieza, incluida la tuerca hueca de 3×3.
- [ ] La pieza de la caja SIGUIENTE es la que aparece al fijar la actual.
- [ ] `←` y `→` mueven una columna por pulsación y no atraviesan paredes ni bloques.
- [ ] Mantener `←` mueve la pieza de forma continua hasta la pared.
- [ ] `↑` y `X` rotan en sentido horario; mantenerlas pulsadas rota una sola vez.
- [ ] Una pieza I vertical pegada a la pared izquierda o derecha rota desplazándose hacia dentro.
- [ ] `↓` baja una fila y suma 1 punto; contra el suelo fija la pieza sin sumar puntos.
- [ ] `Espacio` deja caer la pieza hasta el fantasma, la fija y suma 2 puntos por celda recorrida.
- [ ] Mantener `Espacio` suelta una sola pieza.
- [ ] El fantasma se ve semitransparente en la posición exacta de aterrizaje.
- [ ] A nivel 1, limpiar 1, 2, 3 o 4 líneas suma 100, 300, 500 u 800 puntos.
- [ ] A nivel 2, limpiar 1 línea suma 200 puntos.
- [ ] Al llegar a 10 líneas el HUD muestra nivel `02`.
- [ ] `dropIntervalFor(1)`, `dropIntervalFor(2)`, `dropIntervalFor(11)` y `dropIntervalFor(15)` devuelven `1`, `0.91`, `0.1` y `0.1`.
- [ ] A nivel 1, sin pulsar teclas, la pieza baja una fila por segundo, también con el monitor a 120 Hz.

**HUD y visual**

- [ ] El HUD React muestra Jugador, Puntuación, Líneas y Nivel, sin Vidas, y coincide con la partida.
- [ ] El canvas no dibuja score, líneas ni nivel.
- [ ] Cada pieza usa el color de la tabla de Convenciones y las líneas son nítidas en HiDPI.
- [ ] El tablero queda centrado en la CRT y la caja SIGUIENTE a su derecha.
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las teclas de juego no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran EN PAUSA.
- [ ] REANUDAR, `P` y `Esc` continúan con la misma puntuación y la pieza en la misma posición.
- [ ] En pausa, `←` `→` `↓` `↑` `X` y `Espacio` no mueven la pieza.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Una tecla mantenida al perder el foco no sigue activa al reanudar.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` hace caída instantánea y no vuelve a pausar.

**Fin de partida y guardado**

- [ ] Cuando la pieza nueva colisiona al aparecer, se abre el modal con la puntuación real.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios y la letra `X` en el campo de nombre.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'caida'` y la puntuación mostrada.
- [ ] Terminar con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA`.
- [ ] JUGAR DE NUEVO empieza en `playing` con tablero vacío, 0 puntos, 0 líneas y nivel `01`.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] `select id from games where ranked` devuelve `rocas` y `caida`.
- [ ] Como `anon`, insertar en un juego no ranked sigue fallando.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.
- [ ] Tras guardar, la marca aparece en la ficha de `caida`, en su pestaña del Salón y en ACTIVIDAD EN VIVO.
- [ ] La ficha de `caida` muestra `TECLADO` y el texto de `long` de la migración.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera la caída.

**Regresiones**

- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04 y su HUD muestra Vidas.
- [ ] `/juegos/serpentina/jugar` conserva la simulación, su HUD muestra Vidas y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `grep -rn 'game.id === "rocas"' app` no devuelve resultados.
- [ ] `git status` no muestra cambios en `references/started-games/03-tetris/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** motor TS con ciclo de vida sobre `PlayerShell`. Patrón de SPEC 04.
- **Sí:** `ranked = true` por migración. Regla de SPEC 05: solo juegos con motor real.
- **Sí:** reutilizar la fila `caida`. Ya describe este juego y conserva cover, color y orden.
- **No:** fila nueva. Duplicaría el género y dejaría `caida` como simulación.
- **Sí:** reescribir `long`. La ficha debe mencionar la tuerca, el fantasma y la vista previa, que sí existen.
- **Sí:** 8 piezas con la tuerca, como `game.js`. Es el código real; quitarla cambia el balance.
- **No:** 7 piezas del README. El README no coincide con el código.
- **Sí:** mantener balance, puntuación y velocidades originales. El objetivo es adaptar, no rediseñar.
- **Sí:** `dropAccum = 0` al bajar, como el original. Restar el intervalo cambiaría el ritmo.
- **Sí:** autorepeat del sistema operativo para `←` `→` `↓`. Es el comportamiento original.
- **No:** DAS/ARR propio. Es mecánica nueva.
- **Sí:** rotar y caída instantánea ignoran `e.repeat`. Evita soltar varias piezas sin querer.
- **Sí:** `Espacio` para empezar. Coherente con ROCAS; en `ready` no hay pieza que soltar.
- **No:** `Enter` para empezar. Rompe la convención de la plataforma.
- **Sí:** quitar el reinicio por botón propio y cualquier reinicio en `gameover`. El modal decide y no se pierde la puntuación.
- **Sí:** mundo 800×600 con el tablero centrado y SIGUIENTE en el canvas. Mantiene la CRT 4:3 y la fórmula de `.rocas-crt`.
- **No:** CRT vertical 1:2. Necesita otra fórmula de ancho y otro marco.
- **No:** SIGUIENTE en el HUD React. Es información de juego, no de plataforma.
- **Sí:** `lives` opcional y `lines` nuevo en `PlayerShell`. ROCAS y la simulación no cambian.
- **No:** prop genérica de estadísticas. Obliga a tocar ROCAS y la simulación.
- **No:** mostrar `—` en Vidas. Un HUD con un campo sin sentido confunde.
- **Sí:** paleta neón con 5 tokens y 3 derivados. 8 piezas distinguibles e integradas con el sitio.
- **No:** solo 5 tokens. Repetir colores entre piezas resta legibilidad.
- **No:** colores pastel originales. Desentonan con la plataforma.
- **Sí:** glow solo en la pieza actual y en la vista previa. Hasta 200 bloques fijados con `shadowBlur` bajarían los FPS.
- **Sí:** registro `components/game-players.ts` con el 2.º juego real. Decisión diferida en SPEC 04 y 05.
- **No:** segundo `if` en la página. Aplaza otra vez el registro.
- **Sí:** quitar el selector de tema y su `localStorage`. La plataforma tiene una sola estética.
- **Sí:** solo teclado con aviso, sin sonido. La referencia no trae audio y los controles táctiles requieren diseño propio.
- **No:** bloquear el juego en táctil. Una tablet puede tener teclado conectado.
- **Sí:** dejar `TOP JUGADORES` como está. Revisarlo merece su propia spec.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| React Strict Mode duplica el loop en dev                                   | `destroy()` cancela el RAF y quita listeners; motor creado en `useEffect`.                      |
| `Espacio` activa el botón con foco                                         | `blur()` tras cada click y `preventDefault` en la partida.                                      |
| `preventDefault` global rompe el input del modal (`Espacio`, `X`, flechas) | Nunca en `gameover`.                                                                            |
| `onChange` en cada frame provoca renders                                   | Solo se emite si cambia el snapshot.                                                            |
| `shadowBlur` baja los FPS                                                  | Glow solo en la pieza actual y la vista previa.                                                 |
| La CRT supera el alto del viewport                                         | `.caida-crt` limita el ancho con `100dvh`.                                                      |
| El cambio de `PlayerShell` o el registro rompe ROCAS o la simulación       | Pasos 2 y 3 aislados y verificados antes de crear el motor.                                     |
| `game-players.ts` importa players cliente desde un Server Component        | El módulo no lleva `"use client"` y solo referencia componentes; verificar con `npm run build`. |
| El autorepeat del sistema operativo varía entre equipos                    | Riesgo aceptado: es el comportamiento original. DAS propio, si llega, en otra spec.             |
| Con `dt` limitado a 50 ms, un frame largo retrasa la gravedad              | Igual que ROCAS; solo ocurre con la pestaña ralentizada, que además pausa.                      |
| `TOP JUGADORES` mezcla marcas de CAÍDA y ROCAS con escalas distintas       | Riesgo aceptado; se revisa en una spec propia.                                                  |
| Una puntuación supera 99.999.999 y el insert falla                         | Prácticamente inalcanzable; el modal muestra el error y conserva la puntuación.                 |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance: lock delay, hold, bolsa de 7, DAS/ARR.
- Antifraude o Auth real.
- Revisión de `TOP JUGADORES`.
- Selector de tema de la referencia.
- Otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
