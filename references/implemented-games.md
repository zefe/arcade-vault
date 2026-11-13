# Juegos implementados

Juegos con motor real (`lib/games/<id>/`), registrados en `GAME_PLAYERS` (`components/game-players.ts`) y con `ranked = true` en la tabla `games` (leaderboard público).

Fuente: tabla `games` en Supabase + código, consultado el 2026-11-13.

| #   | ID              | Título        | Categoría | Controles        | Color   | Spec |
| --- | --------------- | ------------- | --------- | ---------------- | ------- | ---- |
| 1   | `rocas`         | ROCAS         | SHOOTER   | TECLADO          | yellow  | 04   |
| 2   | `caida`         | CAÍDA         | PUZZLE    | TECLADO          | magenta | 06   |
| 3   | `bloque-buster` | BLOQUE BUSTER | ARCADE    | TECLADO / RATÓN  | cyan    | 07   |

## ROCAS (`rocas`)

- **Resumen:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para activar el disparo triple durante 5 segundos.
- **Cover:** `cover-rocas` · **Orden:** 6
- **Código:** `lib/games/rocas/`, `components/rocas-player.tsx`

## CAÍDA (`caida`)

- **Resumen:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Piezas geométricas descienden desde la oscuridad, incluida una tuerca hueca de 3×3. Muévelas, rótalas y encástralas para limpiar líneas. La pieza fantasma marca dónde caerán y el panel anticipa la siguiente. La velocidad aumenta cada 10 líneas.
- **Cover:** `cover-tetro` · **Orden:** 2
- **Código:** `lib/games/caida/`, `components/caida-player.tsx`

## BLOQUE BUSTER (`bloque-buster`)

- **Resumen:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Pilota una paleta de neón y rebota la pelota para pulverizar muros de bloques. Cinco niveles con patrones distintos: parrilla completa, pirámide, tablero de ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota y tienes 3 vidas para completarlos todos.
- **Cover:** `cover-bricks` · **Orden:** 1
- **Código:** `lib/games/bloque-buster/`, `components/bloque-buster-player.tsx`

## En curso

- **SERPENTINA** (`serpentina`, ARCADE, SPEC 08 Aprobado): ya existe en la tabla `games` con `ranked = true`, pero aún no tiene motor ni player en código.

## Sin motor (simulación `GamePlayer`, `ranked = false`)

`duelo-pixel` (DUELO PIXEL), `gloton` (GLOTÓN), `invasores` (INVASORES), `ranaria` (RANARIA).
