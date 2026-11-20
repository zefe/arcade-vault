# SPEC 09 — Controles táctiles en los juegos reales

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-11-19
> **Objetivo:** Hacer jugables de principio a fin en un móvil táctil en vertical los 4 juegos reales (ROCAS, CAÍDA, BLOQUE BUSTER, SERPENTINA), con gestos o botones en pantalla según el juego.

## Por qué existe esta spec

Los 4 motores solo escuchan teclado; BLOQUE BUSTER además `mousemove`.
En táctil el overlay muestra `REQUIERE TECLADO` y ni siquiera se puede empezar: el inicio es `Espacio`.
SPEC 04–08 dejaron los controles táctiles fuera de alcance de forma explícita.
Los 4 players duplican el mismo `TOUCH_QUERY` + `useSyncExternalStore`; esta spec lo extrae.

## Alcance

**Dentro:**

- Hook compartido `lib/use-is-touch.ts` (`useIsTouch()`), que sustituye la copia duplicada en los 4 players.
- Helper de gestos `lib/games/gestures.ts`, compartido por CAÍDA y SERPENTINA.
- API de acciones pública en cada motor. Teclado y táctil llaman a los mismos métodos.
- Pointer events (`pointerdown` / `pointermove` / `pointerup` / `pointercancel`) sobre el canvas en los 4 motores, con limpieza en `destroy()`.
- Inicio en táctil: tocar la pantalla CRT en `ready` empieza la partida. Teclado sigue con `Espacio`.
- Esquema por juego:
  - **SERPENTINA:** swipe en 4 direcciones (umbral 24 px CSS) entra en la cola de giros existente.
  - **CAÍDA:** tap = rotar; arrastre horizontal = 1 columna por cada `BLOCK` del mundo arrastrado; arrastre lento hacia abajo = bajar; swipe rápido hacia abajo = caída instantánea.
  - **BLOQUE BUSTER:** arrastrar el dedo en el CRT mueve la paleta a esa X (misma conversión que el ratón).
  - **ROCAS:** botones bajo el CRT, solo en táctil: `←` `→` a la izquierda; `↑` y `FUEGO` a la derecha. Multitouch; mantener `←` `→` `↑` = tecla mantenida; cada toque de `FUEGO` = un disparo (como `Espacio`).
- Nueva prop opcional `touchControls?: ReactNode` en `PlayerShell`, pintada justo debajo de `.crt`. Solo la usa ROCAS.
- Overlay inicial en táctil: lista de controles táctiles propia del juego y `TOCA PARA EMPEZAR`. Desaparece `REQUIERE TECLADO`.
- `pauseHint` en táctil: `PULSA REANUDAR PARA CONTINUAR`.
- Layout del reproductor en vertical: CRT al ancho disponible, botones de ROCAS debajo, sin scroll, zoom por doble toque, selección de texto ni pull-to-refresh al jugar.
- Migración `0005_controles_tactiles.sql` que actualiza `games.controls` de los 4 juegos.
- `allowedDevOrigins` en `next.config.ts` (cambio ya presente sin commitear) para probar en un móvil real por LAN.

**Fuera de alcance (specs futuras):**

- Layout específico en horizontal (controles a los lados del CRT).
- Auditoría responsive del resto del sitio (landing, librería, salón, ficha).
- Joystick virtual o D-pad en pantalla para SERPENTINA o CAÍDA.
- Vibración (`navigator.vibrate`) y sonido.
- Pantalla completa (`requestFullscreen`) o bloqueo de orientación.
- Ajustes de sensibilidad o remapeo de controles por el usuario.
- Cambios de gameplay o balance (velocidades, cadencia de disparo).
- Simulaciones (`GamePlayer`) sin motor.
- Tests automatizados.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0005_controles_tactiles.sql`:

```sql
update public.games set controls = 'TECLADO / TÁCTIL'
where id in ('rocas', 'caida', 'serpentina');

update public.games set controls = 'TECLADO / RATÓN / TÁCTIL'
where id = 'bloque-buster';
```

Hook compartido:

```ts
// lib/use-is-touch.ts
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
export function useIsTouch(): boolean; // false en servidor, valor real tras hidratar
```

Helper de gestos (puro, sin DOM):

```ts
// lib/games/gestures.ts
export type SwipeDir = "up" | "down" | "left" | "right";
export const SWIPE_MIN_PX = 24; // px CSS
export const TAP_MAX_PX = 10; // movimiento máximo para contar como tap
export const TAP_MAX_MS = 250;
export const FAST_SWIPE_PX_PER_MS = 0.8; // umbral de swipe rápido (caída instantánea)
export function classifySwipe(dx: number, dy: number): SwipeDir | null;
```

API de acciones por motor (públicas; el teclado pasa a usarlas):

```ts
// RocasEngine
setControl(control: "left" | "right" | "thrust", down: boolean): void;
fire(): void; // equivale a pulsar Espacio una vez
// CaidaEngine
move(dx: -1 | 1): void;
rotate(): void;
setSoftDrop(down: boolean): void;
hardDrop(): void;
// SerpentinaEngine
turn(dir: SwipeDir): void; // entra en la cola de 2 giros, sin 180°
// BloqueBusterEngine
movePaddleTo(worldX: number): void; // ya existe privado: pasa a público
// Todos
start(): void; // ya existe; tocar el canvas en `ready` lo llama
```

Conversión de coordenadas táctiles a mundo, igual que el ratón de BLOQUE BUSTER: `worldX = (clientX - rect.left) * WORLD_WIDTH / rect.width`.

Textos del overlay en táctil:

| Juego         | Controles táctiles                                                        |
| ------------- | ------------------------------------------------------------------------- |
| ROCAS         | `← →` Rotar · `↑` Propulsar · `FUEGO` Disparar                            |
| CAÍDA         | Toca Rotar · Arrastra ↔ Mover · Arrastra ↓ Bajar · Desliza ↓ rápido Caída |
| BLOQUE BUSTER | Arrastra Mover la paleta                                                  |
| SERPENTINA    | Desliza ↑ ↓ ← → Girar                                                     |

Convenciones:

- Un solo puntero activo por canvas para gestos (`pointerId` del primer `pointerdown`); el resto se ignora.
- Los gestos del canvas funcionan siempre (también con ratón o lápiz); los botones de ROCAS solo se pintan si `useIsTouch()`.
- Las entradas táctiles respetan las mismas reglas que el teclado: ignoradas en `paused`, en `gameover` y (salvo el inicio) en `ready`.

## Plan de implementación

1. Crear `lib/use-is-touch.ts` y sustituir la copia de `TOUCH_QUERY` / `subscribeToTouch` / `getIsTouch` en los 4 players. Sin cambios visibles.
2. Crear `lib/games/gestures.ts` con constantes y `classifySwipe`.
3. Añadir a `app/globals.css`: `touch-action: none` y `user-select: none` en `.crt-screen` y su canvas; `overscroll-behavior: none` en `.av-player`; `touch-action: manipulation` en botones del HUD. Comprobar que los overlays `*-ready` tienen `pointer-events: none` para que el toque llegue al canvas.
4. Ajustar el layout vertical del reproductor (`max-width: 560px`): CRT al 100 % del ancho con su 4:3, HUD compacto sin desbordar, sin scroll horizontal.
5. SERPENTINA: extraer `turn(dir)` y reutilizarlo desde `handleKeyDown`. Manual: teclado igual que antes.
6. SERPENTINA: pointer events en el canvas: tap en `ready` → `start()`; swipe → `turn()`. Limpieza en `destroy()`.
7. SERPENTINA: overlay táctil (lista, `TOCA PARA EMPEZAR`, sin `REQUIERE TECLADO`) y `pauseHint` según `useIsTouch()`.
8. BLOQUE BUSTER: `movePaddleTo` público; pointer events que mueven la paleta al arrastrar y tap en `ready` → `start()`. El `mousemove` existente se sustituye por `pointermove`.
9. BLOQUE BUSTER: overlay táctil y `pauseHint`.
10. CAÍDA: extraer `move`, `rotate`, `setSoftDrop`, `hardDrop` y reutilizarlos desde el teclado.
11. CAÍDA: pointer events con tap / arrastre por columnas / bajar / caída rápida usando `gestures.ts`; tap en `ready` → `start()`.
12. CAÍDA: overlay táctil y `pauseHint`.
13. `PlayerShell`: prop `touchControls?: ReactNode` pintada bajo `.crt`.
14. ROCAS: `setControl` y `fire` públicos y usados por el teclado; tap en el canvas en `ready` → `start()`.
15. ROCAS: componente de botones (`.rocas-touch-pad`) con `onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`, `setPointerCapture`, multitouch; pasado como `touchControls` solo si `useIsTouch()`. Overlay táctil y `pauseHint`.
16. Crear y aplicar `supabase/migrations/0005_controles_tactiles.sql` (MCP Supabase).
17. Mantener `allowedDevOrigins` en `next.config.ts`.
18. Actualizar `CLAUDE.md` (spec 09, `useIsTouch`, `touchControls`, migración 0005), `references/implemented-games.md` y `.claude/skills/nuevo-juego/patron-juego-real.md` + `template.md` para que los juegos nuevos nazcan con controles táctiles.

## Criterios de aceptación

Verificación en móvil real por LAN (`next dev` en la IP local) y en Chrome DevTools con emulación táctil (iPhone o Pixel, vertical).

**Build y consola**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Ningún `/juegos/<id>/jugar` de los 4 muestra errores ni warnings de hidratación.
- [ ] No queda ninguna copia de `TOUCH_QUERY` fuera de `lib/use-is-touch.ts`.

**Común a los 4 juegos (en táctil)**

- [ ] El overlay inicial muestra los controles táctiles del juego y `TOCA PARA EMPEZAR`, y no muestra `REQUIERE TECLADO`.
- [ ] Tocar la pantalla CRT en `ready` empieza la partida y ese toque no ejecuta ninguna acción de juego.
- [ ] Con la partida en curso, tocar o arrastrar en el CRT no hace scroll, zoom ni selección de texto, y arrastrar hacia abajo no recarga la página.
- [ ] PAUSA congela el juego; durante la pausa los gestos y botones no tienen efecto; REANUDAR continúa.
- [ ] El texto de pausa es `PULSA REANUDAR PARA CONTINUAR`.
- [ ] Cambiar de app o de pestaña auto-pausa la partida.
- [ ] FIN abre FIN DEL JUEGO; el input de iniciales abre el teclado del móvil y GUARDAR PUNTUACIÓN guarda la marca, visible después en el leaderboard.
- [ ] A 375 px de ancho en vertical el CRT ocupa el ancho sin scroll horizontal y el HUD no desborda.
- [ ] Con teclado en escritorio, los 4 juegos se comportan igual que antes de esta spec.

**SERPENTINA**

- [ ] Deslizar hacia arriba, abajo, izquierda o derecha gira la serpiente en esa dirección.
- [ ] Deslizar en la dirección opuesta a la actual no tiene efecto.
- [ ] Dos swipes rápidos se ejecutan en pasos consecutivos (cola de 2 giros).
- [ ] Un desplazamiento menor de 24 px no gira.

**BLOQUE BUSTER**

- [ ] Arrastrar el dedo sobre el CRT lleva el centro de la paleta a la X del dedo, limitada a los bordes.
- [ ] El ratón en escritorio sigue moviendo la paleta.

**CAÍDA**

- [ ] Un tap rota la pieza.
- [ ] Arrastrar horizontalmente mueve la pieza una columna por cada celda arrastrada, sin saltar columnas.
- [ ] Arrastrar lento hacia abajo baja la pieza mientras se mantiene el dedo; al soltar deja de bajar.
- [ ] Un swipe rápido hacia abajo hace caída instantánea.

**ROCAS**

- [ ] En táctil aparecen bajo el CRT los botones `←` `→` (izquierda) y `↑` `FUEGO` (derecha); en escritorio sin táctil no aparecen.
- [ ] Mantener `←` o `→` rota la nave mientras se mantiene; soltar la detiene.
- [ ] Mantener `↑` propulsa mientras se mantiene.
- [ ] Se puede mantener `←` y `↑` y tocar `FUEGO` a la vez (multitouch).
- [ ] Cada toque de `FUEGO` dispara una vez.
- [ ] Sacar el dedo del botón sin levantarlo deja de accionar el control.

**Datos**

- [ ] La ficha de `rocas`, `caida` y `serpentina` muestra `TECLADO / TÁCTIL`; la de `bloque-buster`, `TECLADO / RATÓN / TÁCTIL`.

## Decisiones

- **Sí:** los 4 juegos en una spec. Comparten hook, helper, CSS y patrón; separar repetiría la base 4 veces.
- **Sí:** esquema mixto por juego. Gestos donde son naturales; botones en ROCAS, que necesita controles simultáneos.
- **No:** solo botones en todos. Uniforme pero torpe en SERPENTINA y CAÍDA.
- **No:** solo gestos en todos. ROCAS necesita girar, propulsar y disparar a la vez.
- **No:** joystick virtual en ROCAS. Cambia la sensación del juego y es más complejo.
- **Sí:** API de acciones pública en el motor. Teclado y táctil comparten reglas (pausa, `ready`, cola de giros).
- **No:** `KeyboardEvent` sintéticos. Frágiles con `e.repeat`, foco y `preventDefault`.
- **Sí:** pointer events en vez de touch events. Una sola ruta para dedo, ratón y lápiz.
- **Sí:** gestos del canvas activos siempre; botones de ROCAS solo con `useIsTouch()`. Los gestos no molestan con ratón; los botones sí ocuparían sitio.
- **Sí:** tocar el CRT para empezar. Directo y sin botón nuevo en el HUD.
- **No:** botón JUGAR en el HUD. Duplica PAUSA/FIN y cambia el HUD solo en táctil.
- **Sí:** `FUEGO` dispara una vez por toque. Paridad con `Espacio`; disparo continuo sería un cambio de balance.
- **Sí:** CAÍDA mueve 1 columna por cada `BLOCK` arrastrado. Control preciso y predecible.
- **Sí:** umbral de swipe de 24 px CSS. Evita giros por toques temblorosos sin exigir gestos largos.
- **Sí:** `touchControls` en `PlayerShell` bajo `.crt`. Los botones no tapan el juego; los `children` van dentro de `.crt-screen`.
- **Sí:** lista de controles táctil propia en el overlay. Mostrar ambas listas satura una pantalla pequeña.
- **Sí:** solo vertical. Es el uso más común; horizontal va en otra spec.
- **No:** auditoría responsive del sitio. Merece spec propia.
- **Sí:** migración 0005 para `controls`. La ficha debe reflejar que se puede jugar en táctil.
- **Sí:** extraer `useIsTouch`. Elimina 4 copias idénticas.
- **Sí:** incluir `allowedDevOrigins`. Necesario para verificar en un móvil real por LAN.
- **Sí:** actualizar `patron-juego-real.md` y `template.md`. Los juegos nuevos deben nacer con controles táctiles.

## Riesgos

| Riesgo                                                                       | Mitigación                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| El navegador hace scroll, zoom o pull-to-refresh durante el gesto            | `touch-action: none` en `.crt-screen`; `overscroll-behavior: none`.             |
| El overlay `ready` intercepta el toque y no empieza la partida               | `pointer-events: none` en los overlays `*-ready`; criterio propio.              |
| El toque de inicio ejecuta además una acción (rotar en CAÍDA)                | En `ready` el `pointerup` solo llama `start()` y se consume.                    |
| Un botón de ROCAS se queda "pulsado" si el dedo sale o llega `pointercancel` | `setPointerCapture` + soltar en `pointerup`, `pointercancel` y `pointerleave`.  |
| Listeners de pointer duplicados en Strict Mode                               | Se añaden en `mount()` y se quitan en `destroy()`, como los de teclado.         |
| Al blur de la ventana quedan controles táctiles activos                      | `handleBlur` ya limpia `keys`; los controles táctiles usan el mismo estado.     |
| `(hover: none) and (pointer: coarse)` falla en híbridos (portátil táctil)    | Gestos activos siempre; solo los botones de ROCAS dependen de la query.         |
| El CRT 4:3 + HUD + botones no caben en alto en móviles pequeños              | Limitar el ancho del CRT con `100dvh` como en los `*-crt` existentes.           |
| Swipe de CAÍDA ambiguo entre mover y bajar                                   | Eje dominante fijado al superar el umbral; no se cambia hasta levantar el dedo. |

## Lo que **no** entra en esta spec

- Layout en horizontal.
- Responsive del resto del sitio.
- Joystick o D-pad en pantalla para SERPENTINA o CAÍDA.
- Vibración, sonido, pantalla completa o bloqueo de orientación.
- Sensibilidad o remapeo configurables.
- Cambios de gameplay o balance.
- Simulaciones sin motor.
- Tests automatizados.
