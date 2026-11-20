# Memoria de mobile-porter

Experiencia móvil de Arcade Vault: web móvil (vertical prioridad, horizontal) + app móvil = PWA instalable (no hay app nativa). Patrón táctil de referencia: `specs/09-controles-tactiles.md`.

## Auditorías

- 2026-11-19 — agente creado. Estado inicial conocido: SPEC 09 implementada (4 juegos reales táctiles). `app/layout.tsx` sin `export const viewport`; sin `app/manifest.ts` ni iconos PWA. Resto del sitio sin auditar.

## Decisiones

- Breakpoints existentes en `globals.css`: 840, 760, 720, 560, 520, 380 px. Reutilizar antes de crear nuevos.
- Juegos con chips de skin: CRT limitado a `100dvh - 290px` (ver memoria skin-designer).

## Specs propuestas

(ninguna aún)

## Preferencias del usuario

- 2026-11-19: el agente revisa que se vea bien en web y en "aplicación móvil", con SPEC 09 como referencia.

## Pendientes 👁

(ninguno aún)
