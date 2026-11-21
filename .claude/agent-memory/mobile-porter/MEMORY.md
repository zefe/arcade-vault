# Memoria de mobile-porter

Experiencia móvil de Arcade Vault: web móvil (vertical prioridad, horizontal) + app móvil = PWA instalable (no hay app nativa). Patrón táctil de referencia: `specs/09-controles-tactiles.md`.

## Auditorías

- 2026-11-19 — agente creado. Estado inicial conocido: SPEC 09 implementada (4 juegos reales táctiles). `app/layout.tsx` sin `export const viewport`; sin `app/manifest.ts` ni iconos PWA. Resto del sitio sin auditar.
- 2026-11-20 — `/juegos/ranaria/jugar` → vertical OK, SPEC 09 parcial a propósito (táctil diferido a JAM ranaria 03), horizontal ❌ (todos los juegos, → SPEC 10). Corregido global: `viewport` (cover + themeColor), safe areas (#root, nav, panel, footer), HUD/chips ≥44 en `pointer: coarse`, modal FIN móvil (input 16px, apilado, scroll).

## Decisiones

- Breakpoints existentes en `globals.css`: 840, 760, 720, 560, 520, 380 px. Reutilizar antes de crear nuevos.
- Juegos con chips de skin: CRT limitado a `100dvh - 290px` (ver memoria skin-designer).
- Táctil ≥44px vía `@media (pointer: coarse)` (no por ancho): `.player-hud .btn` min-height 44; `.skin-chip::after` inset -10px -2px (cabe en padding de `.crt`, no roba toques al canvas).
- Safe areas: `#root` padding-inline env(left/right); nav/panel/footer suman env(top/bottom). Modal ≤560: `.modal-bd` align flex-start + overflow auto + `.modal` margin auto.

## Specs propuestas

- SPEC 10 `10-reproductor-horizontal` — Borrador (2026-11-20). Layout apaisado del reproductor (media `landscape and max-height 500px`).
- Pendiente de escribir: PWA (manifest/iconos/SW/appleWebApp) — no existe `app/manifest.ts`.
- 2026-11-20: ajustada sección táctil de JAM ranaria 03 a SPEC 09 (hop público, gestures.ts, tocar CRT no overlay, cualquier pointerType).

## Preferencias del usuario

- 2026-11-19: el agente revisa que se vea bien en web y en "aplicación móvil", con SPEC 09 como referencia.

## Pendientes 👁

- Chips de skin: área ~42px real en dispositivo; modal FIN con teclado iOS abierto; safe areas en iPhone con notch (horizontal + standalone).
