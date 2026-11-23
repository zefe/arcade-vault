# SPEC JAM ranaria 04 — Rendimiento de RANARIA en móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 09, `game-jam/ranaria/01-juego-ranaria`
> **Fecha:** 2026-11-23
> **Objetivo:** Quitar los tirones de RANARIA en móvil cacheando su fondo estático en un canvas aparte y aligerando el fondo CSS del reproductor, medido con un medidor de FPS solo de desarrollo.

## Por qué existe esta spec

En un móvil real RANARIA da tirones (FPS bajos) mientras se mueven los carriles.
Cada frame el motor repinta entero, sobre un backing store de 1600×1200 (DPR 2):

- `drawBackground()`: seto, río con 5 filas de corrientes, carretera con líneas discontinuas (`setLineDash`), mediana y acera. Todo es estático.
- `drawBays()`: 15 bloques de seto con `strokeRect`, 5 nenúfares y las ranas de los ocupados. Solo cambia al ocupar un nenúfar o completar la ronda.
- Carriles, rana y barra de tiempo (dinámicos, con `shadowBlur` en neón/retro).

Además, detrás del CRT siguen activos en `/jugar` la rejilla `.av-bg::before` (perspectiva 3D + `gridscroll` infinito) y las scanlines `.av-bg::after` con `mix-blend-mode: overlay` a pantalla completa, que obligan al compositor a mezclar cada frame.

No hay forma de medir el problema: no existe medidor de FPS. Esta spec lo añade primero para tener una línea base.

## Alcance

**Dentro:**

- Helper compartido `lib/perf-meter.ts` (`PerfMeter`): FPS medio por segundo y tiempo de frame (media y p95 de `update + draw`). Solo en desarrollo y con `?perf=1` en la URL. En esta spec solo lo usa RANARIA.
- Línea base: medir RANARIA antes de optimizar (escritorio + móvil real, skin `neon`) y anotar los números en esta spec.
- Caché del fondo de RANARIA en un canvas fuera de pantalla (`document.createElement("canvas")`, mismo tamaño que el backing store): `bg` + `drawBackground()` + `drawBays()` se pintan en él y cada frame se copia con un solo `drawImage`.
- Invalidación de la caché: al cambiar de skin (`setSkin`), al cambiar `occupied` (nenúfar ocupado, ronda completa, `initGame`).
- Fondo CSS en el reproductor: con `body:has(.av-player)` se para la animación `gridscroll` de `.av-bg::before` y se quita el `mix-blend-mode` de `.av-bg::after` (scanlines con opacidad equivalente). El resto de rutas no cambia.
- Aspecto idéntico o casi: mismo dibujo, misma paleta, mismos 3 skins.

**Fuera de alcance (specs futuras):**

- Sprites pre-renderizados con glow horneado (quitar `shadowBlur` por frame).
- Loop en reposo (no redibujar en `ready` / pausa / game over).
- Bajar `MAX_DPR` en táctil.
- Optimizar los motores de ROCAS, CAÍDA, BLOQUE BUSTER y SERPENTINA (pueden reutilizar `PerfMeter` en otra spec).
- Degradar efectos visuales en móvil o con `prefers-reduced-motion`.
- Cambios de gameplay, balance, puntuación, controles o Supabase.

## Modelo de datos

Sin cambios de esquema ni de BD.

### `lib/perf-meter.ts` (nuevo)

```ts
// true solo si NODE_ENV !== "production" y la URL lleva ?perf=1. false en el servidor.
export function isPerfEnabled(): boolean;

export class PerfMeter {
  // Marca el inicio del trabajo del frame (performance.now()).
  begin(): void;
  // Marca el final; acumula duración y cuenta el frame.
  end(): void;
  // Pinta el panel en la esquina superior izquierda del mundo lógico (800×600).
  // Texto monoespaciado sobre caja negra translúcida: "FPS 58 · 4.2 ms · p95 7.9 ms".
  draw(ctx: CanvasRenderingContext2D): void;
}
```

- Ventana de 1 s: al cerrar cada ventana se recalculan FPS (frames / s), media y p95 de `begin→end`. Entre ventanas se muestran los últimos valores.
- Sin dependencias, sin React, sin globals: cada motor crea su instancia.

### `RanariaEngine` (cambios)

- Constructor: cuarto parámetro opcional `options?: { perf?: boolean }`. Si `perf`, crea un `PerfMeter`.
- Campos nuevos: `private bgCache: HTMLCanvasElement`, `private bgCtx: CanvasRenderingContext2D`, `private bgDirty = true`, `private perf: PerfMeter | null`.
- `private renderBackground()`: pinta `p.bg` + `drawBackground` + `drawBays` en `bgCtx` (transform `dpr`) y pone `bgDirty = false`.
- `draw()`: si `bgDirty` → `renderBackground()`; copia la caché con transform identidad (`drawImage(bgCache, 0, 0)`, píxel a píxel) y después pinta carriles, rana y barra de tiempo con transform `dpr`. Si `perf`, al final `perf.draw(ctx)`.
- `loop()`: `perf?.begin()` antes de `update`, `perf?.end()` tras `draw`.
- `bgDirty = true` en `setSkin()`, `landOnGoal()` (ocupado y ronda completa) e `initGame()`.
- `destroy()`: suelta la caché (`bgCache.width = 0`).

Orden de pintado nuevo: fondo + bahías (caché) → carriles → rana → tiempo. Antes las bahías iban después de los carriles; es equivalente porque ningún carril tiene entidades en la fila 0 (`ROW_GOAL`).

### `components/ranaria-player.tsx`

- Pasa `{ perf: isPerfEnabled() }` al crear el motor (dentro del `useEffect`, ya en cliente).

### `app/globals.css`

```css
/* Reproductor: fondo quieto y sin blend (rendimiento, SPEC JAM ranaria 04) */
body:has(.av-player) .av-bg::before {
  animation: none;
}
body:has(.av-player) .av-bg::after {
  mix-blend-mode: normal;
  opacity: <equivalente>;
}
```

## Plan de implementación

1. **Medidor.** Crear `lib/perf-meter.ts` y cablearlo en `RanariaEngine` + `ranaria-player.tsx`. Sin optimizar nada. Verificar que sin `?perf=1` y en `npm run build && npm start` no aparece.
2. **Línea base.** Medir con `?perf=1`, skin `neon`, 30 s jugando: escritorio y móvil real (vía `allowedDevOrigins`). Anotar FPS, media y p95 en la sección _Mediciones_ de esta spec.
3. **Caché del fondo.** Añadir `bgCache` / `renderBackground()` / `bgDirty` e invalidaciones. Comparar a ojo los 3 skins antes/después (captura de `ready` y con nenúfares ocupados).
4. **Fondo CSS.** Reglas `body:has(.av-player)` en `globals.css`. Comprobar que `/`, `/juegos` y `/salon` siguen animados.
5. **Medición final.** Repetir el paso 2 y anotar resultados. `npm run lint` y `npm run build` limpios.
6. **Cierre.** Estado → Implementado; actualizar la línea de game jam en `CLAUDE.md`.

## Criterios de aceptación

- [ ] `lib/perf-meter.ts` existe y exporta `isPerfEnabled` y `PerfMeter`.
- [ ] Con `?perf=1` en dev se ve el panel FPS / ms / p95 en la esquina del CRT de RANARIA; sin el parámetro no se ve.
- [ ] En build de producción (`npm run build && npm start`) el panel no aparece aunque la URL lleve `?perf=1`.
- [ ] La sección _Mediciones_ tiene la línea base y la medición final (escritorio y móvil, skin `neon`).
- [ ] `drawBackground` y `drawBays` no se llaman en un frame normal; solo tras `setSkin`, al ocupar un nenúfar, al completar la ronda y en `initGame` (verificable con un `console.count` temporal o breakpoint).
- [ ] Cambiar de skin en mitad de partida repinta el fondo con la paleta nueva en el mismo frame.
- [ ] Ocupar un nenúfar muestra la rana en la bahía al instante; al completar la ronda las 5 bahías se vacían.
- [ ] `restart()` deja las 5 bahías vacías.
- [ ] Los 3 skins (`clasico`, `neon`, `retro`) se ven igual que antes en `ready` y en partida (comparación de capturas).
- [ ] En `/juegos/ranaria/jugar` (y cualquier `/jugar`) la rejilla de fondo no se anima y `.av-bg::after` no usa `mix-blend-mode`; en `/` y `/juegos` sigue animada.
- [ ] Móvil real, skin `neon`, 30 s jugando: FPS medio ≥ 55 y p95 del frame menor que en la línea base.
- [ ] Escritorio: FPS medio ≥ 59 (60 Hz).
- [ ] Sin cambios en puntuación, vidas, colisiones ni controles.
- [ ] `npm run lint` y `npm run build` sin errores.

## Mediciones

| Momento    | Dispositivo | Skin | FPS medio | ms medio | p95 ms |
| ---------- | ----------- | ---- | --------- | -------- | ------ |
| Línea base | Escritorio  | neon |           |          |        |
| Línea base | Móvil       | neon |           |          |        |
| Final      | Escritorio  | neon |           |          |        |
| Final      | Móvil       | neon |           |          |        |

## Decisiones

- **Solo RANARIA.** Es donde se nota; los demás motores quedan para otra spec que reutilice `PerfMeter`.
- **Fondo CSS sí entra.** Es común a todos los `/jugar`, no toca motores y quita trabajo del compositor; beneficia también a los otros juegos sin cambiar su código.
- **Selector `body:has(.av-player)`.** Evita tocar `app/layout.tsx` o marcar la ruta con JS; `:has()` está soportado en los navegadores móviles actuales.
- **Canvas DOM y no `OffscreenCanvas`.** No hay worker; `document.createElement("canvas")` basta y tiene soporte universal.
- **Copia con transform identidad.** La caché ya está a resolución `dpr`; copiar píxel a píxel evita reescalado y borrosidad.
- **Medidor compartido en `lib/`.** Reutilizable por otros juegos; pintado dentro del canvas para no provocar renders de React.
- **Medidor solo en dev + `?perf=1`.** No llega a jugadores en producción.
- **Descartado (por ahora):** sprites con glow horneado, loop en reposo, `MAX_DPR` 1.5 en táctil, degradar efectos en móvil. Se priorizó mantener el aspecto y un cambio acotado.
- **Docs del patrón no cambian.** `patron-juego-real.md` no se toca hasta que la técnica se aplique a más de un juego.

## Riesgos

- **`shadowBlur` por frame sigue.** Si tras la caché el móvil no llega a 55 FPS, el coste principal es el glow de carriles/rana. Mitigación: la medición lo dirá; siguiente spec con sprites horneados o `MAX_DPR` en táctil (ya descartadas aquí, no se implementan en esta).
- **Caché desactualizada.** Si se olvida una invalidación, el fondo o las bahías muestran un estado viejo. Mitigación: criterios de aceptación cubren skin, nenúfar, ronda y reinicio.
- **Specs 02 y 03 en Borrador.** Añaden luciérnagas, boyas y destellos de nenúfar: lo animado debe pintarse fuera de la caché o invalidarla. Al implementarlas hay que respetar este contrato (fondo estático en caché, dinámico encima).
- **Memoria.** Un segundo canvas de 1600×1200 ≈ 7,7 MB en DPR 2; aceptable, se libera en `destroy()`.
- **Mediciones dependen del dispositivo.** El umbral de 55 FPS se valida en el móvil del usuario; anotar modelo en _Mediciones_.
