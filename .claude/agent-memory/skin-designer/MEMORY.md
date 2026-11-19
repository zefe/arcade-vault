# Memoria de skin-designer

Skins obligatorios por juego real: `clasico` (default), `neon`, `retro`. Contrato en `lib/skins.ts` + `lib/games/<id>/skins.ts`.

## Auditorías

- 2026-11-18 — agente creado; sin infra de skins aún. Juegos reales sin skins: rocas, caida, bloque-buster.
- 2026-11-18 — infra común creada (`lib/skins.ts`, `lib/use-skin.ts`, chips en `PlayerShell`, CSS `.crt.skin-*`). rocas → conforme. caida, bloque-buster → sin skins (fuera de alcance de la petición).

## Decisiones de implementación (difieren o concretan §3)

- Chips del selector en el bisel `.crt-bottom` (sustituyen "CARGA · 1MB"), no en el HUD: no cambia altura del HUD; `.crt-model` se oculta < 560px. Juegos con chips: ancho CRT con `100dvh - 290px` (antes 282).
- `scanlines` lo pinta solo CSS (`.crt.skin-retro .crt-screen::after`); el engine no lo usa.
- Fósforo por juego vía `--phosphor` / `--phosphor-rgb` en `.<id>-crt` (default verde en `.crt`); el chip RETRO activo lo hereda.
- Engine pinta `palette.bg` con `fillRect` (antes `clearRect` sobre `.crt-screen` #000).
- Player: `skinRef` para crear el engine con el skin vigente sin deps; effect `[skin]` → `setSkin`.

## Paletas

- rocas — retro **ámbar** `#ffb000` / bg `#0a0600`. Ratios mín: clásico 6.06 (powerup/hudText `#ff4040`), neón 5.15 (magenta), retro 3.19 (partícula `#805800`, decoración; entidades ≥ 5.53). Sin ajustes por contraste.
- Siguiente sugerido: caida → retro verde `#33ff66`; bloque-buster → ámbar o verde según variedad.

## Preferencias del usuario

- 2026-11-18: el agente audita **e implementa** código (no solo specs).
- 2026-11-18: Clásico = arcade 80s sobrio sin glow; Neón = paleta actual con glow; Retro = fósforo CRT monocromo.
- 2026-11-18: selector de skin en `PlayerShell`, persistido por juego en localStorage (`av_skin_<gameId>`).

## Pendientes

- Migrar caida y bloque-buster (`skins.ts`, `setSkin`, `useSkin`, `--phosphor` en su `.<id>-crt`, revisar `- 282px` → 290px).
- Sección **Skins** en specs Borrador/Aprobado sin motor (`specs/08-juego-serpentina.md`, `specs/game-jam/*/01-*.md`): no hecha en esta pasada.
