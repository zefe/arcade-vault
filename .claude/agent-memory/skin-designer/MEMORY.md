# Memoria de skin-designer

Skins obligatorios por juego real: `clasico` (default), `neon`, `retro`. Contrato en `lib/skins.ts` + `lib/games/<id>/skins.ts`.

## Auditorías

- 2026-11-18 — agente creado; sin infra de skins aún. Juegos reales sin skins: rocas, caida, bloque-buster.
- 2026-11-18 — infra común creada (`lib/skins.ts`, `lib/use-skin.ts`, chips en `PlayerShell`, CSS `.crt.skin-*`). rocas → conforme. caida, bloque-buster → sin skins (fuera de alcance de la petición).
- 2026-11-18 — bloque-buster → conforme (skins.ts, setSkin, useSkin, `--phosphor` verde, 290px). caida sigue sin skins.
- 2026-11-18 — serpentina (sin motor) → sección Skins añadida a `specs/08-juego-serpentina.md` (paletas, contraste, pasos 3/7/11/18, criterios). Se implementa con `/spec-impl`.
- 2026-11-20 — ranaria → conforme (skins.ts, setSkin, useSkin, `--phosphor` ámbar). Sección Skins añadida a specs JAM ranaria 01/02/03 (02/03 con claves nuevas propuestas). caida sigue sin skins.

## Decisiones de implementación (difieren o concretan §3)

- Chips del selector en el bisel `.crt-bottom` (sustituyen "CARGA · 1MB"), no en el HUD: no cambia altura del HUD; `.crt-model` se oculta < 560px. Juegos con chips: ancho CRT con `100dvh - 290px` (antes 282).
- `scanlines` lo pinta solo CSS (`.crt.skin-retro .crt-screen::after`); el engine no lo usa.
- Fósforo por juego vía `--phosphor` / `--phosphor-rgb` en `.<id>-crt` (default verde en `.crt`); el chip RETRO activo lo hereda.
- Engine pinta `palette.bg` con `fillRect` (antes `clearRect` sobre `.crt-screen` #000).
- Player: `skinRef` para crear el engine con el skin vigente sin deps; effect `[skin]` → `setSkin`.

## Paletas

- rocas — retro **ámbar** `#ffb000` / bg `#0a0600`. Ratios mín: clásico 6.06 (powerup/hudText `#ff4040`), neón 5.15 (magenta), retro 3.19 (partícula `#805800`, decoración; entidades ≥ 5.53). Sin ajustes por contraste.
- bloque-buster — retro **verde** `#33ff66` / bg `#020a04`. 7 colores de ladrillo → 3 luminancias (`#33ff66`/`#24b347`/`#17732e`) × patrón (`blockPatterns`: solid/outline/stripe). Clásico: rojo `#e04040`, amarillo `#f0d040`, azul `#4a80f0`, violeta `#c050e0`, naranja `#f08020`, verde `#40c040`, gris `#a0a0a0`, paleta `#d8d8d0`, bola `#f5f0dc`, highlight transparente. Ratios mín: clásico 4.98 (rojo), neón 5.15 (magenta), retro 3.37 (45 %). Sin ajustes.
- serpentina (spec 08) — retro **verde** `#33ff66` / bg `#020a04`. Ratios mín: clásico 4.26 (cherry), neón 5.15 (apple/cherry), retro 3.37 (hoja/rabito). Ajuste: ojos NEÓN `#e6e9ff` → `#0a0a0f` (ojo/cabeza 1.12 → 14.73). Neón cabeza = cuerpo `#00ff88` (se distingue por glow + ojos).
- ranaria — retro **ámbar** `#ffb000` / bg `#0a0600`. Claves extra `bodyAlpha` (clásico 1 = cuerpos sólidos, neón/retro 0.25) y `detail` (clásico `#000000` para parabrisas/vetas/banda; null = color de entidad). Relleno alpha vía `globalAlpha` (`fillBody`), no `withAlpha`. Ratios mín (entidad vs su zona): clásico 3.91 (timeDanger/acera), neón 4.46 (muerte/río), retro 5.15. Ajuste: clásico roadDash `#5a5a5a` → `#3a3a3a` (3.04 → 1.85, no compite).
- Siguiente sugerido: caida → retro ámbar (variedad: rocas/ranaria ámbar, bloque-buster/serpentina verde) o verde; 7 piezas → reutilizar patrón luminancia × forma.

## Preferencias del usuario

- 2026-11-18: el agente audita **e implementa** código (no solo specs).
- 2026-11-18: Clásico = arcade 80s sobrio sin glow; Neón = paleta actual con glow; Retro = fósforo CRT monocromo.
- 2026-11-18: selector de skin en `PlayerShell`, persistido por juego en localStorage (`av_skin_<gameId>`).

## Pendientes

- Migrar caida (`skins.ts`, `setSkin`, `useSkin`, `--phosphor` en `.caida-crt`, `- 282px` → 290px).
- Sección **Skins** en specs game-jam sin motor (`specs/game-jam/*/01-*.md`). spec 08 hecho.
