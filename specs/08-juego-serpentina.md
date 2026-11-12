# SPEC 08 — Juego SERPENTINA real en el reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-11
> **Objetivo:** Crear un juego de serpiente como motor TypeScript en canvas para que `/juegos/serpentina/jugar` sea un juego real con ranking, sobre `PlayerShell`.

## Por qué existe esta spec

SERPENTINA es hoy la simulación de SPEC 01: su score sube solo y `ranked = false`.
No hay código de referencia: las mecánicas, el balance y el dibujo se diseñan aquí.
`references/source-assets/snake-assets/` solo trae `fruits.png` y `sprites.js`, extraídos del arte de un juego comercial.
Por eso no se usan: la comida se dibuja con frutas vectoriales neón originales.
El registro `components/game-players.ts` y el HUD opcional de `PlayerShell` ya existen desde SPEC 06: esta spec solo añade una entrada y usa `score` y `level`, sin `lives`.

## Alcance

**Dentro:**

- Motor en `lib/games/serpentina/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas:
  - Rejilla de 32×24 casillas; la serpiente avanza una casilla por paso.
  - Giros con flechas o WASD, con cola de hasta 2 giros y sin giro de 180°.
  - Comer una fruta alarga la serpiente una casilla y suma `10 × nivel` puntos.
  - Cada 5 frutas sube un nivel y el paso se acorta 10 ms, hasta el nivel 10.
  - Chocar con un muro o con el propio cuerpo termina la partida.
  - Llenar la rejilla termina la partida.
- Movimiento por pasos con acumulador de `dt`, independiente de los FPS.
- Paleta neón de la plataforma con formas vectoriales y 4 frutas originales, sin imágenes.
- Mundo lógico 800×600 dentro de `.crt-screen`, escalado y nítido en HiDPI.
- HUD React de la plataforma con puntuación y nivel, sin Vidas. `PlayerShell` no cambia.
- Overlay inicial con controles, `PULSA ESPACIO` y `REQUIERE TECLADO` en táctil.
- PAUSA real con botón, `P` o `Esc`, y auto-pausa al perder foco o cambiar de pestaña.
- FIN, chocar y llenar la rejilla abren el modal FIN DEL JUEGO existente.
- Guardado en `scores` con `game_id = 'serpentina'` mediante una migración que pone `ranked = true`.
- Entrada `serpentina: SerpentinaPlayer` en `GAME_PLAYERS`.
- Ficha de `serpentina` corregida: `long` fiel a lo implementado y `controls = 'TECLADO'`.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido.
- Mundo toroidal, obstáculos internos, frutas con puntos distintos, frutas temporales o power-ups.
- Movimiento interpolado entre casillas.
- Antifraude, topes de score o Auth real.
- Revisar `TOP JUGADORES` de Home, que compara marcas de juegos distintos.
- Implementar otros juegos.
- Tests automatizados.
- Descartado de `references/source-assets/snake-assets/`: `fruits.png` y `sprites.js`. No se copian a `public/`.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0004_juego_serpentina.sql`:

```sql
update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Una serpiente de luz recorre una rejilla de 32×24 casillas comiendo frutas de neón. Cada fruta la alarga una casilla y vale 10 puntos por nivel. Cada 5 frutas sube de nivel y acelera, hasta el nivel 10. Chocar con un muro o con tu propia cola termina la partida.'
where id = 'serpentina';
```

`title`, `short`, `cat` (`ARCADE`), `cover` (`cover-snake`), `color` (`green`) y `sort_order` (`3`) no cambian.

Contrato del motor (`lib/games/serpentina/engine.ts`):

```ts
export type SerpentinaPhase = "ready" | "playing" | "gameover";

export type SerpentinaSnapshot = {
  phase: SerpentinaPhase;
  paused: boolean;
  score: number;
  level: number; // 1–10
};

export class SerpentinaEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: SerpentinaSnapshot) => void,
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

Entidades (`lib/games/serpentina/entities.ts`):

```ts
export type Cell = { col: number; row: number };
export type Dir = "up" | "down" | "left" | "right";
export type FruitKind = "apple" | "cherry" | "lemon" | "grape";
export type Fruit = Cell & { kind: FruitKind };
// snake: Cell[] con la cabeza en el índice 0
// drawGrid, drawSnake, drawFruit(ctx, …)
```

Registro (`components/game-players.ts`):

```ts
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  caida: CaidaPlayer,
  "bloque-buster": BloqueBusterPlayer,
  serpentina: SerpentinaPlayer,
};
```

Convenciones:

- Mundo lógico fijo de 800×600 y `dt` en segundos con tope de 50 ms.
- Valores de juego:
  - `CELL = 25` px, `COLS = 32`, `ROWS = 24` (768 casillas).
  - Serpiente inicial de 3 casillas: cabeza en `(16, 12)`, cuerpo en `(15, 12)` y `(14, 12)`, dirección `right`.
  - `BASE_STEP = 0.15` s, `STEP_DECREMENT = 0.01` s por nivel, `MIN_STEP = 0.06` s.
  - Paso por nivel: `BASE_STEP - (level - 1) * STEP_DECREMENT` (nivel 1: 150 ms; nivel 10: 60 ms).
  - `FRUITS_PER_LEVEL = 5`, `MAX_LEVEL = 10`.
  - Nivel: `min(1 + floor(frutas / 5), 10)`, recalculado tras cada fruta.
  - Puntos por fruta: `10 × nivel` antes de recalcular el nivel.
  - Puntuación máxima: 74.250 (765 frutas hasta llenar la rejilla).
- Paso:
  - `acc += dt`; si `acc >= step`, `acc -= step` y se ejecuta un paso. Con `MAX_DT = 0.05` y `MIN_STEP = 0.06` hay como mucho un paso por frame.
  - Al empezar cada paso se saca el primer giro de la cola, si lo hay.
  - Nueva cabeza = cabeza + dirección. Fuera de `0…31` × `0…23` → `gameover`.
  - Si la nueva cabeza cae en la fruta, la serpiente crece (no se quita la cola) y se genera otra fruta.
  - Si no, se quita la cola antes de comprobar el choque, así seguir la propia cola es válido.
  - Nueva cabeza sobre el cuerpo → `gameover`.
- Cola de giros: máximo 2. Un giro se añade si no es igual ni opuesto al último giro en cola, o a la dirección actual si la cola está vacía. Con la cola llena se ignora.
- Fruta: casilla libre aleatoria y tipo aleatorio entre los 4. Si no hay casillas libres, `gameover`.
- En `ready` se ven la rejilla, la serpiente inicial y la primera fruta, sin avanzar.
- Colores en `lib/games/serpentina/constants.ts`, con los valores de los tokens de `globals.css`:
  - Cuerpo: `#00ff88`, con 2 px de margen dentro de la casilla.
  - Cabeza: `#00ff88` con glow y dos ojos `#e6e9ff` orientados según la dirección.
  - Rejilla: puntos en las intersecciones con `rgba(230,233,255,0.08)`.
  - Borde del mundo: línea de 2 px `#00f5ff`.
  - Manzana `#ff006e` con hoja `#00ff88`; cereza: dos círculos `#ff006e` con rabito `#00ff88`; limón: elipse `#f5ff00`; uva: racimo de 6 círculos `#00f5ff`.
- Glow (`shadowBlur`) solo en la cabeza y la fruta.
- El canvas no dibuja score, nivel, pausa ni game over.
- Backing store `800 × dpr` por `600 × dpr`, con `dpr` limitado a 2.

Teclas:

| Tecla           | Acción            | Fases activas        |
| --------------- | ----------------- | -------------------- |
| `↑` `↓` `←` `→` | Girar             | `playing`, sin pausa |
| `W` `A` `S` `D` | Girar             | `playing`, sin pausa |
| `Espacio`       | Empezar           | `ready`              |
| `P` / `Esc`     | Pausar o reanudar | `playing`            |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para overlays y estilos.
2. Crear `lib/games/serpentina/constants.ts` con tamaños, valores de juego, colores, `MAX_DT`, `MAX_DPR`, `stepForLevel` y `randInt`.
3. Crear `lib/games/serpentina/entities.ts` con los tipos y las funciones de dibujo de rejilla, serpiente y las 4 frutas. Cada `draw` recibe `ctx`.
4. Crear `lib/games/serpentina/engine.ts` con estado, cola de giros, paso, crecimiento, generación de fruta, choques, niveles, fin de partida y `end()`, sin dibujo ni loop. Sin reinicio por tecla en `gameover`.
5. Añadir el dibujo de rejilla, borde, fruta y serpiente, sin HUD ni overlays. Configurar el backing store con `dpr`.
6. Añadir el loop y los listeners: `mount()`, `destroy()`, `pause()`, `resume()`; `onChange` solo si cambia el snapshot; en pausa se dibuja sin `update`; al pausar se vacía la cola de giros; `blur` y `visibilitychange` pausan.
7. Añadir la gestión de teclas por fase con `preventDefault` solo fuera de `gameover`; los giros ignoran `e.repeat`.
8. Crear `components/serpentina-player.tsx` (`"use client"`) sobre `PlayerShell`, con el motor en `useEffect`, `destroy()` en el cleanup y `score` y `level` en el HUD, sin `lives`.
9. Añadir el overlay de `ready` con controles, `PULSA ESPACIO` y `REQUIERE TECLADO` en táctil (`useSyncExternalStore`).
10. Conectar los botones: PAUSA y FIN desactivados en `ready`, `blur()` tras cada click, `pauseHint` `PULSA P O REANUDAR PARA CONTINUAR`.
11. Añadir `serpentina: SerpentinaPlayer` a `GAME_PLAYERS`.
12. Añadir a `app/globals.css` `.serpentina-crt` (misma fórmula 4:3 que `.rocas-crt`) y los estilos `.serpentina-ready`, `.serpentina-controls`, `.serpentina-start` y `.serpentina-touch`.
13. Crear la migración `0004_juego_serpentina.sql`, aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
14. Actualizar `CLAUDE.md` (Stack notes): juegos reales `rocas`, `caida`, `bloque-buster` y `serpentina`.
15. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/serpentina/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con flechas, WASD, `P` / `Esc` y `PULSA ESPACIO`, y la serpiente no se mueve.
- [ ] En `ready`, las flechas y WASD no cambian la dirección inicial.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `Espacio` empieza la partida, oculta el overlay y la serpiente avanza hacia la derecha.

**Mecánicas**

- [ ] La serpiente empieza con 3 casillas en el centro de la rejilla.
- [ ] En el nivel 1 avanza una casilla cada 150 ms (unas 20 casillas en 3 s).
- [ ] Flechas y WASD giran la serpiente.
- [ ] Pulsar la dirección opuesta a la actual no tiene efecto.
- [ ] Pulsar `↑` y `←` rápido mientras va a la derecha ejecuta los dos giros en pasos consecutivos.
- [ ] Comer una fruta alarga la serpiente exactamente una casilla y aparece otra fruta en una casilla libre.
- [ ] En el nivel 1 cada fruta suma 10 puntos; en el nivel 3, 30.
- [ ] La quinta fruta pasa el HUD a nivel `02` y la serpiente acelera.
- [ ] El nivel no pasa de `10` y el paso no baja de 60 ms.
- [ ] Salir de la rejilla por cualquier borde termina la partida.
- [ ] Chocar con el propio cuerpo termina la partida.
- [ ] Moverse a la casilla que deja libre la cola no termina la partida.
- [ ] Aparecen los 4 tipos de fruta a lo largo de una partida.

**HUD y visual**

- [ ] El HUD React muestra Jugador, Puntuación y Nivel, sin Vidas ni Líneas, y coincide con la partida.
- [ ] El canvas no dibuja score ni nivel.
- [ ] Serpiente, rejilla, borde y frutas usan los colores de Convenciones y las líneas son nítidas en HiDPI.
- [ ] Los ojos de la cabeza miran en la dirección de avance.
- [ ] El canvas no carga ninguna imagen ni audio (pestaña Network).
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las teclas de juego no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran EN PAUSA.
- [ ] REANUDAR, `P` y `Esc` continúan con la misma puntuación y la serpiente en la misma posición y dirección.
- [ ] En pausa, flechas y WASD no cambian la dirección al reanudar.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` no vuelve a pausar.

**Fin de partida y guardado**

- [ ] Al chocar se abre el modal con la puntuación real.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios y las letras W, A, S y D en el campo de nombre.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'serpentina'` y la puntuación mostrada.
- [ ] Terminar con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA`.
- [ ] JUGAR DE NUEVO empieza en `playing` con nivel `01`, 0 puntos y la serpiente de 3 casillas hacia la derecha.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] `select id from games where ranked` devuelve `rocas`, `caida`, `bloque-buster` y `serpentina`.
- [ ] Como `anon`, insertar en un juego no ranked sigue fallando.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.
- [ ] Tras guardar, la marca aparece en la ficha de `serpentina`, en su pestaña del Salón y en ACTIVIDAD EN VIVO.
- [ ] La ficha de `serpentina` muestra `TECLADO` y el texto de `long` de la migración.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera la serpiente.

**Regresiones**

- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04 y su HUD muestra Vidas.
- [ ] `/juegos/caida/jugar` conserva las mecánicas de SPEC 06 y su HUD muestra Líneas sin Vidas.
- [ ] `/juegos/bloque-buster/jugar` conserva las mecánicas de SPEC 07.
- [ ] `/juegos/gloton/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/`.
- [ ] `public/` no contiene `fruits.png`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** motor TS con ciclo de vida sobre `PlayerShell`. Patrón de SPEC 04.
- **Sí:** `ranked = true` por migración. Regla de SPEC 05: solo juegos con motor real.
- **Sí:** reutilizar la fila `serpentina`. Ya describe este juego y conserva cover, color y orden.
- **No:** fila nueva. Dejaría `serpentina` como simulación duplicada.
- **Sí:** reescribir `long`. La ficha debe describir frutas, niveles y muros, no "núcleos magenta".
- **Sí:** juego de género diseñado desde cero. No hay referencia de código.
- **No:** `fruits.png` y `sprites.js`. Son arte extraído de un juego comercial: riesgo de licencia y copiaría su aspecto.
- **Sí:** 4 frutas vectoriales neón originales, solo visuales. Variedad sin assets y coherente con la plataforma.
- **No:** puntos distintos por fruta. Exige balance propio; queda fuera.
- **Sí:** mundo 800×600 con casillas de 25 px. Reutiliza la fórmula CRT 4:3 de ROCAS y BLOQUE BUSTER.
- **No:** rejilla cuadrada 600×600. Necesitaría una fórmula CRT 1:1 nueva.
- **Sí:** muros que matan. Más exigente para el ranking.
- **No:** mundo toroidal. Hace la partida más fácil y larga.
- **Sí:** niveles cada 5 frutas, paso de 150 ms a 60 ms en 10 niveles. Da sentido al Nivel del HUD y sube la dificultad de forma predecible.
- **No:** acelerar por fruta. El Nivel del HUD quedaría sin significado.
- **Sí:** `10 × nivel` por fruta. Premia aguantar a más velocidad y reduce empates.
- **Sí:** movimiento por pasos sin interpolación. Es la lectura clásica del género y simplifica choques.
- **Sí:** acumulador de `dt` con tope de 50 ms. Mismo ritmo a cualquier FPS y como mucho un paso por frame.
- **Sí:** cola de 2 giros sin 180°. Los giros rápidos no se pierden y no hay muerte instantánea por invertir.
- **Sí:** seguir la propia cola es válido. La cola se retira antes de comprobar el choque.
- **Sí:** llenar la rejilla termina la partida. Cierre natural sin estado `win` aparte.
- **Sí:** flechas y WASD. Ambas convenciones de teclado habituales.
- **Sí:** `Espacio` para empezar. Convención de ROCAS, CAÍDA y BLOQUE BUSTER.
- **Sí:** una sola vida. `PlayerShell` omite Vidas con `lives` sin definir.
- **Sí:** `PlayerShell` sin cambios. Puntuación y nivel bastan.
- **No:** campo Longitud en el HUD. La longitud se deduce de las frutas y obligaría a ampliar `PlayerShell`.
- **Sí:** glow solo en cabeza y fruta. Hasta 768 segmentos con `shadowBlur` bajarían los FPS.
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.
- **Sí:** aviso `REQUIERE TECLADO` en táctil, sin bloquear. Una tablet puede tener teclado.
- **Sí:** `gloton` como simulación de regresión. `serpentina` deja de ser simulación.
- **Sí:** dejar `TOP JUGADORES` como está. Revisarlo merece su propia spec.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| React Strict Mode duplica el loop en dev                                | `destroy()` cancela el RAF y quita listeners; motor creado en `useEffect`.   |
| `Espacio` activa el botón con foco                                      | `blur()` tras cada click y `preventDefault` en la partida.                   |
| `preventDefault` global rompe el input del modal (WASD)                 | Nunca en `gameover`; criterio propio con W, A, S y D.                        |
| `onChange` en cada frame provoca renders                                | Solo se emite si cambia el snapshot.                                         |
| `shadowBlur` baja los FPS con una serpiente larga                       | Glow solo en cabeza y fruta.                                                 |
| La CRT supera el alto del viewport                                      | `.serpentina-crt` limita el ancho con `100dvh`.                              |
| Un frame largo salta casillas y atraviesa un muro o el cuerpo           | Tope de `dt` de 50 ms y `MIN_STEP` de 60 ms: como mucho un paso por frame.   |
| Dos giros en el mismo paso producen un 180° encubierto                  | Cada giro se valida contra el último en cola, no contra la dirección actual. |
| Buscar casilla libre por reintentos se alarga con la rejilla casi llena | Elegir al azar entre la lista de casillas libres.                            |
| `TOP JUGADORES` mezcla marcas de juegos con escalas distintas           | Riesgo aceptado; se revisa en una spec propia.                               |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido.
- Mundo toroidal, obstáculos, frutas con puntos distintos, power-ups.
- Movimiento interpolado.
- Sprites de `references/source-assets/snake-assets/`.
- Antifraude o Auth real.
- Revisión de `TOP JUGADORES`.
- Otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
