# SPEC 10 — Reproductor en horizontal (móvil apaisado)

> **Estado:** Borrador
> **Depende de:** SPEC 09
> **Fecha:** 2026-11-20
> **Objetivo:** Que en un móvil en horizontal (667×375, 844×390) el CRT de cualquier juego real quepa entero en alto sin scroll, con el HUD y los controles en pantalla a los lados.

## Por qué existe esta spec

SPEC 09 dejó fuera el layout en horizontal.
Hoy todos los `*-crt` usan `width: min(100%, max(320px, calc((100dvh - 290px) * 4 / 3 + 48px)))`: con 340–390 px de alto útil el suelo de 320 px manda, y nav + HUD + CRT + bisel suman ~410–450 px.
Resultado: hay que hacer scroll para ver la parte baja del CRT, y el scroll solo funciona fuera del CRT (`touch-action: none`).
Los overlays `ready` en > 560 px de ancho usan la tipografía de escritorio y quedan justos en una pantalla de 204 px de alto.
ROCAS además pinta sus botones bajo el CRT, fuera de la vista.

## Alcance

**Dentro:**

- Media query común `@media (orientation: landscape) and (max-height: 500px)` para el reproductor (`.av-player`).
- Disposición en dos columnas: CRT a la izquierda (o centrado), HUD compacto en columna a la derecha (stats apiladas + PAUSA / FIN / SALIR).
- Ancho del CRT por alto disponible: fórmula `calc((100dvh - Npx) * 4 / 3 + 2·padding)` sin suelo de 320 px en esta media query; `N` = bisel + chips de skin + safe areas.
- Nav del sitio compacta o oculta solo en `/juegos/[id]/jugar` en esta media query (decidir en diseño).
- ROCAS: `touchControls` a ambos lados del CRT (`←` `→` izquierda; `↑` `FUEGO` derecha).
- Overlays `*-ready`: tamaños compactos (los de ≤ 560 px) también en esta media query.
- Safe areas laterales (notch) en el reproductor.

**Fuera de alcance (specs futuras):**

- Pantalla completa (`requestFullscreen`) y bloqueo de orientación.
- PWA (manifest, iconos, service worker).
- Cambios de gameplay, motores o controles táctiles.
- Tablets (alto > 500 px ya cabe con el layout actual).

## Modelo de datos

Sin cambios de esquema ni de motor. Solo `app/globals.css`, `components/player-shell.tsx` (clases/estructura del HUD) y, si hace falta, `components/nav.tsx` / `app/juegos/[id]/jugar/page.tsx` para marcar la ruta del reproductor.

Convenciones:

- Breakpoint nuevo único: `(orientation: landscape) and (max-height: 500px)`; no se tocan los de anchura existentes.
- El CRT conserva 4:3 y su bisel; los chips de skin siguen en `.crt-bottom`.
- `.crt-screen` mantiene `touch-action: none`; el HUD lateral sí permite toques normales.

## Plan de implementación

1. Rama de trabajo; leer `node_modules/next/dist/docs/` si se toca layout o metadata. Diseñar la disposición con `/frontend-design`.
2. `PlayerShell`: envolver HUD y CRT en una estructura que admita grid de 2 columnas sin cambiar el orden en vertical/escritorio.
3. `globals.css`: media query horizontal con grid, HUD apilado, fórmula de ancho del CRT por alto y sin suelo de 320 px para los `*-crt`.
4. Nav: versión compacta u oculta en la ruta del reproductor en horizontal.
5. ROCAS: `.rocas-touch-pad` a los lados del CRT en horizontal.
6. Overlays `*-ready` y `.crt-content` de pausa: tamaños compactos en horizontal.
7. Safe areas laterales en `.av-player`.
8. Actualizar `.claude/skills/nuevo-juego/patron-juego-real.md`, `template.md` y `references/implemented-games.md`.
9. `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] En 667×375 y 844×390 (DevTools y móvil real), en los 5 juegos reales el CRT completo (pantalla + bisel + chips) y el HUD se ven sin scroll.
- [ ] Overlay `ready` y texto de pausa caben dentro del CRT sin cortarse.
- [ ] ROCAS: los 4 botones visibles a los lados del CRT y multitouch operativo.
- [ ] Con notch a la izquierda o a la derecha, ningún botón ni stat queda bajo el notch.
- [ ] Vertical (360–414 px) y escritorio sin cambios visibles.
- [ ] Girar el móvil durante la partida no la reinicia ni pierde la pausa.
- [ ] Modal FIN DEL JUEGO usable en horizontal con el teclado abierto.

## Decisiones

- **Sí:** media query por alto + orientación, no por ancho. Un 844×390 supera todos los breakpoints de anchura actuales.
- **Sí:** HUD en columna lateral. En apaisado sobra ancho y falta alto.
- **No:** bloquear la orientación. No existe API fiable fuera de pantalla completa/PWA y es otra spec.
- **Sí:** una sola spec para los 5 juegos. El layout vive en `PlayerShell` y CSS común.

## Riesgos

| Riesgo                                                   | Mitigación                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Barras del navegador cambian `dvh` al girar              | Fórmula con `dvh`; criterio de giro en dispositivo real.                    |
| Romper el layout vertical o de escritorio                | Todo dentro de la media query nueva; criterio de no regresión.              |
| Ocultar la nav deja sin salida                           | SALIR sigue en el HUD lateral.                                              |
| CRT demasiado pequeño en 667×375 (≈ 260×195 de pantalla) | Riesgo aceptado; pantalla completa iría en spec propia si no es suficiente. |

## Lo que **no** entra en esta spec

- Pantalla completa, bloqueo de orientación.
- PWA.
- Cambios de motor o de controles.
- Layout de tablet.

Cada uno, si llega, va en su propia spec.
