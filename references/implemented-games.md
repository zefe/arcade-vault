# Juegos implementados

Juegos con motor real (`lib/games/<id>/`), registrados en `GAME_PLAYERS` (`components/game-players.ts`) y con `ranked = true` en la tabla `games` (leaderboard público).

Fuente: tabla `games` en Supabase + código, consultado el 2026-11-20.

| #   | ID              | Título        | Categoría | Controles        | Color   | Spec |
| --- | --------------- | ------------- | --------- | ---------------- | ------- | ---- |
| 1   | `rocas`         | ROCAS         | SHOOTER   | TECLADO / TÁCTIL         | yellow  | 04, 09 |
| 2   | `caida`         | CAÍDA         | PUZZLE    | TECLADO / TÁCTIL         | magenta | 06, 09 |
| 3   | `bloque-buster` | BLOQUE BUSTER | ARCADE    | TECLADO / RATÓN / TÁCTIL | cyan    | 07, 09 |
| 4   | `serpentina`    | SERPENTINA    | ARCADE    | TECLADO / TÁCTIL         | green   | 08, 09 |
| 5   | `ranaria`       | RANARIA       | ARCADE    | TECLADO                  | green   | JAM ranaria 01 |

## ROCAS (`rocas`)

- **Resumen:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para activar el disparo triple durante 5 segundos.
- **Cover:** `cover-rocas` · **Orden:** 6
- **Código:** `lib/games/rocas/`, `components/rocas-player.tsx`
- **Skins:** clásico (default) · neón · retro ámbar `#ffb000` (`lib/games/rocas/skins.ts`)
- **Táctil:** botones bajo la CRT `◀ ▶` (rotar) · `▲` (propulsar) · `FUEGO` (1 disparo por toque), multitouch (`components/rocas-touch-pad.tsx`).

## CAÍDA (`caida`)

- **Resumen:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Piezas geométricas descienden desde la oscuridad, incluida una tuerca hueca de 3×3. Muévelas, rótalas y encástralas para limpiar líneas. La pieza fantasma marca dónde caerán y el panel anticipa la siguiente. La velocidad aumenta cada 10 líneas.
- **Cover:** `cover-tetro` · **Orden:** 2
- **Código:** `lib/games/caida/`, `components/caida-player.tsx`
- **Táctil:** tap = rotar · arrastre ↔ = 1 columna por celda · arrastre lento ↓ = bajar (1 fila / 50 ms) · swipe rápido ↓ = caída instantánea.

## BLOQUE BUSTER (`bloque-buster`)

- **Resumen:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Pilota una paleta de neón y rebota la pelota para pulverizar muros de bloques. Cinco niveles con patrones distintos: parrilla completa, pirámide, tablero de ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota y tienes 3 vidas para completarlos todos.
- **Cover:** `cover-bricks` · **Orden:** 1
- **Código:** `lib/games/bloque-buster/`, `components/bloque-buster-player.tsx`
- **Skins:** clásico (default) · neón · retro verde `#33ff66`, ladrillos por luminancia + patrón sólido/contorno/franja (`lib/games/bloque-buster/skins.ts`)
- **Táctil:** arrastrar el dedo lleva la paleta a su X (misma conversión que el ratón).

## SERPENTINA (`serpentina`)

- **Resumen:** Crece sin morder tu propia cola.
- **Descripción:** Una serpiente de luz recorre una rejilla de 32×24 casillas comiendo frutas de neón. Cada fruta la alarga una casilla y vale 10 puntos por nivel. Cada 5 frutas sube de nivel y acelera, hasta el nivel 10. Chocar con un muro o con tu propia cola termina la partida.
- **Cover:** `cover-snake` · **Orden:** 3
- **Código:** `lib/games/serpentina/`, `components/serpentina-player.tsx`
- **Skins:** clásico (default) · neón · retro verde `#33ff66` (`lib/games/serpentina/skins.ts`)
- **Táctil:** swipe ↑ ↓ ← → (≥ 24 px) entra en la cola de 2 giros.

## RANARIA (`ranaria`)

- **Resumen:** (sin cambios en `short`).
- **Descripción:** Guía a una rana de neón casilla a casilla: cruza cuatro carriles de tráfico, salta sobre troncos y boyas a la deriva y alcanza uno de los cinco nenúfares antes de que se agoten sus 30 segundos. Cada fila nueva suma puntos, cada nenúfar más, y el tiempo sobrante es bonus. Llena los cinco para subir de nivel y acelerar el río y la carretera. Tienes 3 vidas.
- **Cover:** `cover-rana` · **Orden:** 7
- **Código:** `lib/games/ranaria/`, `components/ranaria-player.tsx` · migración `0006_juego_ranaria`
- **Mecánica:** rejilla 15×12 de 50 px; 4 carriles de tráfico, mediana, 5 de río (troncos/boyas que arrastran), 5 nenúfares; 30 s por rana; +10 % velocidad por nivel hasta 1,5×.
- **Táctil:** todavía no (SPEC JAM ranaria 03); el overlay avisa `REQUIERE TECLADO`.

## Sin motor (simulación `GamePlayer`, `ranked = false`)

`duelo-pixel` (DUELO PIXEL), `gloton` (GLOTÓN), `invasores` (INVASORES).
