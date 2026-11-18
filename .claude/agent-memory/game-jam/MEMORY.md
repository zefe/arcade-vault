# Memoria de game-jam

Specs generadas en `specs/game-jam/<game-id>/`. No repetir `game-id` ni conceptos.

## Jams

- 2026-11-17 — tema «RANARIA: cruce de tráfico y troncos por rejilla contra reloj» → ranaria (RANARIA, ARCADE) · specs: 01, 02, 03 en `specs/game-jam/ranaria/` · conceptos descartados: ninguno (concepto fijado por el usuario) · 2026-11-18 el usuario eligió reutilizar la fila simulada `ranaria` (update, cover-rana, sort 7); migraciones 0005–0007; id `ranaria-neon` descartado

## Preferencias del usuario

- 2026-11-17: un juego por tema, 3 specs objetivo (mínimo 2), todas completas con el formato de SPEC 06–08.
- 2026-11-17: trabajo autónomo sin preguntas; decisiones en la sección Decisiones; specs en Borrador.
- 2026-11-17: siempre fila nueva en `games`, no reutilizar simulaciones del catálogo.
- 2026-11-18 (corrige la anterior): si el concepto coincide con un juego simulado del catálogo (`ranked = false`), el usuario prefiere reutilizar esa fila con `update` (patrón SPEC 06–08: mismo id, title, cover, sort_order) en vez de crear una nueva. Fila nueva solo si no hay coincidencia.
- 2026-11-17: el usuario puede fijar el concepto en el tema; entonces no se generan 3 alternativas, se diseña directo.
