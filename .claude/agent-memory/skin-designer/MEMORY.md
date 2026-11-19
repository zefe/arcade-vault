# Memoria de skin-designer

Skins obligatorios por juego real: `clasico` (default), `neon`, `retro`. Contrato en `lib/skins.ts` + `lib/games/<id>/skins.ts`.

## Auditorías

- 2026-11-18 — agente creado; sin infra de skins aún. Juegos reales sin skins: rocas, caida, bloque-buster.

## Paletas

(por juego: fósforo retro verde/ámbar, colores ajustados por contraste)

## Preferencias del usuario

- 2026-11-18: el agente audita **e implementa** código (no solo specs).
- 2026-11-18: Clásico = arcade 80s sobrio sin glow; Neón = paleta actual con glow; Retro = fósforo CRT monocromo.
- 2026-11-18: selector de skin en `PlayerShell`, persistido por juego en localStorage (`av_skin_<gameId>`).

## Pendientes

- Primera ejecución: crear infra común y migrar rocas, caida, bloque-buster.
