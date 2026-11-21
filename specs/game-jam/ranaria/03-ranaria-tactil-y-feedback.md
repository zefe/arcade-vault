# SPEC JAM ranaria 03 — Controles táctiles y feedback visual de RANARIA

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 09, `game-jam/ranaria/01-juego-ranaria`, `game-jam/ranaria/02-ranaria-niveles`
> **Fecha:** 2026-11-18
> **Objetivo:** Hacer RANARIA jugable en móvil con deslizar y tocar, y añadir popups de puntos, salpicaduras y destellos que expliquen cada suma y cada muerte.

## Por qué existe esta spec

RANARIA es un juego de un salto por gesto y se presta al táctil; hoy es el único juego real que aún avisa `REQUIERE TECLADO` (los otros 4 ya cumplen SPEC 09).
Tras la 01 y la 02 la puntuación tiene cuatro fuentes (avance, nenúfar, tiempo, luciérnaga) más el bonus de ronda y las vidas extra, pero el jugador solo ve subir un número en el HUD.
Tampoco distingue a simple vista si murió por agua, por boya hundida o por vehículo.
Esta spec añade control táctil propio y feedback en el canvas sin tocar el balance de la 02.
Sigue el contrato táctil de SPEC 09 (mismo patrón que SERPENTINA: swipe con `classifySwipe`).

## Alcance

**Dentro:**

- API de acción pública `hop(dir)` en el motor, usada por teclado y gestos (SPEC 09).
- Gestos sobre el canvas: deslizar en 4 direcciones salta en esa dirección; tocar salta hacia arriba.
- Inicio en táctil: tocar el CRT en `ready` llama a `start()` desde el listener del canvas (el overlay `.ranaria-ready` ya tiene `pointer-events: none`) y ese toque no salta.
- Overlay de `ready` en táctil: `TOUCH_CONTROLS` propios (`Desliza ↑ ↓ ← →` Saltar · `Toca` Saltar arriba) y `TOCA PARA EMPEZAR`, sin `REQUIERE TECLADO`. `pauseHint` táctil `PULSA REANUDAR PARA CONTINUAR` (ya cableado).
- Popups de puntos en el canvas: `+10` por avance, `+N` al llegar a un nenúfar (nenúfar, tiempo y luciérnaga sumados), `RONDA +N` al completar la ronda y `+1 VIDA` al ganar una vida.
- Salpicadura de partículas al caer al agua o con una boya hundida; la muerte por vehículo, anguila, seto o tiempo conserva el aspa de la 01.
- Destello del nenúfar al ocuparlo y triple destello de los 5 nenúfares al completar la ronda.
- Respeto a `prefers-reduced-motion`: sin destellos ni partículas, popups sin desplazamiento.
- Ficha con `controls = 'TECLADO / TÁCTIL'`.

**Fuera de alcance (specs futuras):**

- Cruceta o botones en pantalla.
- Vibración (`navigator.vibrate`).
- Gestos con ratón o arrastre de escritorio.
- Sonido.
- Controles táctiles para ROCAS, CAÍDA, BLOQUE BUSTER o SERPENTINA.
- Cambios de balance respecto a la 02.
- Tests automatizados.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0007_ranaria_tactil.sql`:

```sql
update public.games
set controls = 'TECLADO / TÁCTIL'
where id = 'ranaria';
```

`long` no cambia: describe el juego, no los controles.

Contrato del motor: `RanariaPhase` y `RanariaSnapshot` no cambian. Nuevo método público `hop(dir: Dir): void` (sustituye al `hop` privado como punto de entrada; respeta búfer y fases). El motor registra los listeners de puntero del canvas en `mount()` y los quita en `destroy()`.

Entidades nuevas (`lib/games/ranaria/entities.ts`):

```ts
export type PopupKind = "advance" | "pad" | "round" | "life";

export type Popup = {
  kind: PopupKind;
  text: string; // "+10", "+450", "RONDA +700", "+1 VIDA"
  x: number;
  y: number;
  t: number; // s transcurridos
};

export type Particle = {
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  t: number; // s transcurridos
};

export type Flash = {
  bay: number | "all"; // índice 0–4 o los 5 nenúfares
  t: number; // s transcurridos
};

// drawPopup, drawParticle, drawFlash(ctx, …)
```

Estado nuevo del motor (privado): `popups: Popup[]`, `particles: Particle[]`, `flashes: Flash[]`, `pointer: { id: number; x: number; y: number; t: number } | null`, `reducedMotion: boolean`.

Convenciones:

- Mundo, balance, puntos, niveles y amenazas: sin cambios respecto a la 02.
- Gestos (eventos `pointerdown`, `pointerup` y `pointercancel` en el canvas, cualquier `pointerType`, como en SPEC 09):
  - Se sigue un único puntero; un segundo dedo se ignora mientras el primero está apoyado.
  - Distancia medida en px CSS entre `pointerdown` y `pointerup`.
  - Umbrales compartidos de `lib/games/gestures.ts` (no duplicar): `classifySwipe(dx, dy)` con `SWIPE_MIN_PX` (24 px; eje dominante) y `SWIPE_MAX_MS = 400` local en `constants.ts`: deslizar si dura como mucho 0,4 s.
  - Tocar: movimiento ≤ `TAP_MAX_PX` (10 px) y duración ≤ `TAP_MAX_MS` (250 ms) → salto arriba.
  - En `ready`, el `pointerup` solo llama a `start()` y se consume.
  - Gestos fuera de estos rangos se ignoran.
  - Cada gesto llama a `hop(dir)`, igual que una tecla: mismo búfer de 1 durante el salto, mismas fases activas (`playing`, sin pausa ni muerte).
  - `pointercancel`, `pause()`, `blur` y `visibilitychange` descartan el puntero en curso.
  - `preventDefault` en `pointerdown` solo fuera de `gameover`.
- `touch-action: none` ya lo da `.crt-screen canvas` (bloque «Táctil (SPEC 09)» de `globals.css`); no añadir regla propia.
- Popups:
  - Duración `POPUP_TIME = 0.7` s; suben 30 px y su alpha baja de 1 a 0 de forma lineal. Con `reducedMotion`, no suben.
  - Máximo `MAX_POPUPS = 8`; al superar el máximo se descarta el más antiguo.
  - `advance` en el centro de la rana al aterrizar, `#e6e9ff`, 12 px.
  - `pad` sobre el nenúfar, `#00ff88`, 14 px, con el total sumado al llegar.
  - `round` en el centro del mundo (`x = 400`, `y = 300`), `#f5ff00`, 20 px, durante 1,2 s en vez de 0,7.
  - `life` sobre la rana, `#ff006e`, 14 px.
  - Fuente del canvas: `bold` + tamaño del tipo + `px monospace` (p. ej. `bold 12px monospace`), centrada. Sin glow.
- Salpicadura:
  - 10 partículas desde el centro de la rana, ángulos repartidos cada 36°, velocidad 120 px/s, gravedad 300 px/s².
  - Duración `SPLASH_TIME = 0.5` s, círculos de 2 px `#00f5ff` con alpha `1 − t / 0.5`. Sin glow.
  - Sustituye al aspa en las muertes por agua, arrastre y boya hundida; `DEATH_TIME` sigue siendo 0,6 s.
- Destellos:
  - Nenúfar ocupado: anillo `#00ff88` que crece de 18 a 30 px de radio en `FLASH_TIME = 0.4` s con alpha `1 − t / 0.4`.
  - Ronda completa: los 5 nenúfares alternan relleno `rgba(0,255,136,0.6)` y vacío 3 veces en 0,9 s, antes de vaciarse.
- `reducedMotion` se lee con `matchMedia("(prefers-reduced-motion: reduce)")` en `mount()` y se actualiza con su evento `change`, retirado en `destroy()`. Con `reducedMotion`: sin partículas ni destellos (la muerte por agua usa el aspa) y popups sin desplazamiento.
- Popups, partículas y destellos se actualizan solo en `playing` sin pausa; en pausa se dibujan congelados. `restart()` los vacía.
- Glow: sin cambios respecto a la 02; los efectos nuevos no llevan `shadowBlur`.
- El canvas sigue sin dibujar score, vidas, nivel, pausa ni game over: los popups muestran incrementos, no totales.

Entradas:

| Entrada           | Acción            | Fases activas                  |
| ----------------- | ----------------- | ------------------------------ |
| `↑` `↓` `←` `→`   | Saltar            | `playing`, sin pausa ni muerte |
| `W` `A` `S` `D`   | Saltar            | `playing`, sin pausa ni muerte |
| Deslizar (táctil) | Saltar            | `playing`, sin pausa ni muerte |
| Tocar (táctil)    | Saltar arriba     | `playing`, sin pausa ni muerte |
| `Espacio`         | Empezar           | `ready`                        |
| Tocar el CRT      | Empezar           | `ready`                        |
| `P` / `Esc`       | Pausar o reanudar | `playing`                      |

## Skins

Los colores viven en `lib/games/ranaria/skins.ts` (`RanariaPalette`); los hex de esta spec son los del skin **NEÓN**. Popups, splash y destellos añaden claves a `RanariaPalette` (mismas claves en los tres skins) y **ningún color literal** en `engine.ts`/`entities.ts`; los alpha van con `globalAlpha`.

| Clave        | Uso                                  | CLÁSICO   | NEÓN      | RETRO (ámbar)      |
| ------------ | ------------------------------------ | --------- | --------- | ------------------ |
| `popAdvance` | popup `advance`                      | `#f5f0dc` | `#e6e9ff` | `#ffb000` (100 %)  |
| `popPad`     | popup `pad`                          | `#40c040` | `#00ff88` | `#ffe6b3` (núcleo) |
| `popRound`   | popup `round`                        | `#f0d040` | `#f5ff00` | `#ffe6b3` (núcleo) |
| `popLife`    | popup `life`                         | `#ff6060` | `#ff006e` | `#ffe6b3` (núcleo) |
| `splash`     | partículas de chapuzón               | `#7aa0ff` | `#00f5ff` | `#b37b00` (70 %)   |
| `padFlash`   | anillo de nenúfar y relleno de ronda | `#40c040` | `#00ff88` | `#ffe6b3` (núcleo) |

- Relleno de ronda completa: `padFlash` con `globalAlpha = 0.6` (equivale a `rgba(0,255,136,0.6)` en NEÓN).
- Contraste de textos vs `bg`: CLÁSICO mín. 7,09 (`#ff6060`, ajustado desde `#e04040` = 3,95 sobre el río), NEÓN 5,15 (`#ff006e`; 4,46 sobre el río, texto bold ≥ 14 px), RETRO 11,03.
- Destellos con alpha ≤ 0,6 y sin rellenos a pantalla completa.

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para el overlay táctil y el estilo de popups y destellos.
2. Añadir a `lib/games/ranaria/constants.ts` `SWIPE_MAX_MS`, `POPUP_TIME`, `MAX_POPUPS`, `SPLASH_TIME` y `FLASH_TIME`.
3. Añadir a `entities.ts` `Popup`, `Particle`, `Flash`, `drawPopup`, `drawParticle` y `drawFlash`.
4. Refactorizar en `engine.ts` la entrada de salto a un método público `hop(dir)` usado por teclado y gestos (el salto interno pasa a otro nombre privado). Verificar: el teclado se comporta igual que en la 02.
5. Añadir los listeners `pointerdown`, `pointerup` y `pointercancel` del canvas en `mount()` y quitarlos en `destroy()`, con `classifySwipe` y los umbrales de `lib/games/gestures.ts`; tocar en `ready` → `start()`.
6. Añadir la creación de popups, salpicaduras y destellos en los puntos de avance, nenúfar, ronda, vida extra y muerte por agua, y su actualización y dibujo.
7. Añadir `reducedMotion` con `matchMedia` y su listener `change`, retirado en `destroy()`.
8. Cambiar `components/ranaria-player.tsx`: en táctil el overlay de `ready` muestra `TOUCH_CONTROLS` y `TOCA PARA EMPEZAR` (sin `REQUIERE TECLADO`), como SERPENTINA; el overlay sigue sin recibir toques. En escritorio no cambia.
9. En `app/globals.css`, quitar `.ranaria-touch` si queda sin uso. `touch-action` y `pointer-events: none` del overlay ya existen.
10. Crear la migración `0007_ranaria_tactil.sql` (renumerar si está tomada), aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
11. Actualizar la ficha de `ranaria` en `references/implemented-games.md` (controles `TECLADO / TÁCTIL`, esquema swipe/tap) y `CLAUDE.md` (Stack notes, línea de esquemas táctiles: RANARIA swipe + tap).
12. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/ranaria/jugar` no muestra errores ni warnings de hidratación en consola, en escritorio ni en emulación móvil.

**Inicio**

- [ ] En escritorio el overlay de `ready` es el de la 01, con `PULSA ESPACIO` y sin `TOCA PARA EMPEZAR`.
- [ ] En un dispositivo táctil (o emulación móvil de DevTools) el overlay muestra `TOCA PARA EMPEZAR` y no muestra `REQUIERE TECLADO`.
- [ ] Tocar el CRT en `ready` empieza la partida y ese toque no hace saltar a la rana.
- [ ] En `ready`, deslizar sobre el canvas no mueve la rana.

**Mecánicas**

- [ ] Deslizar hacia arriba, abajo, izquierda o derecha al menos 24 px en menos de 0,4 s salta una casilla en esa dirección.
- [ ] Tocar el canvas sin desplazar el dedo salta una casilla hacia arriba.
- [ ] Deslizar en diagonal salta en la dirección del eje con mayor recorrido.
- [ ] Un gesto lento (más de 0,4 s) o un movimiento entre 11 y 23 px no salta.
- [ ] Dos gestos muy seguidos dan dos saltos; un tercero durante el mismo salto se ignora.
- [ ] Un segundo dedo apoyado mientras el primero desliza no genera otro salto.
- [ ] Deslizar sobre el canvas no desplaza la página.
- [ ] Con teclado en escritorio el juego se comporta igual que en la 02.
- [ ] Puntuación, niveles, amenazas y tiempos son idénticos a la 02.

**HUD y visual**

- [ ] Cada fila nueva muestra `+10` sobre la rana, que sube y se desvanece en 0,7 s.
- [ ] Llegar a un nenúfar con 20,4 s y luciérnaga muestra `+450` en verde sobre el nenúfar y un anillo que se expande.
- [ ] Completar la ronda en nivel 1 muestra `RONDA +500` en el centro y los 5 nenúfares destellan 3 veces antes de vaciarse.
- [ ] Ganar una vida muestra `+1 VIDA` en magenta sobre la rana.
- [ ] Caer al agua muestra la salpicadura cian; chocar con un vehículo muestra el aspa magenta.
- [ ] Nunca hay más de 8 popups a la vez.
- [ ] Con `prefers-reduced-motion: reduce` activo, no hay destellos ni partículas y los popups no se desplazan.
- [ ] El HUD React sigue mostrando Puntuación, Vidas y Nivel, y el canvas no dibuja totales.
- [ ] El canvas no carga ninguna imagen ni audio (pestaña Network).

**Pausa**

- [ ] En pausa, popups, partículas y destellos se quedan congelados y se reanudan al continuar.
- [ ] En pausa, deslizar o tocar el canvas no mueve la rana al reanudar.
- [ ] Un dedo apoyado al cambiar de pestaña no genera salto al volver y reanudar.

**Fin de partida y guardado**

- [ ] Al perder la última vida se abre el modal con la puntuación real.
- [ ] En táctil, el campo de nombre del modal recibe el foco y el teclado virtual escribe con normalidad.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'ranaria'` y la puntuación mostrada.
- [ ] JUGAR DE NUEVO empieza sin popups, partículas ni destellos de la partida anterior.

**Ranking**

- [ ] `select controls from games where id = 'ranaria'` devuelve `TECLADO / TÁCTIL`.
- [ ] La ficha de `ranaria` muestra `TECLADO / TÁCTIL`.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.

**Ciclo de vida**

- [ ] Tras SALIR, tocar y deslizar desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no duplica saltos por gesto ni acelera el juego.

**Regresiones**

- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/bloque-buster/jugar` y `/juegos/serpentina/jugar` conservan sus controles táctiles de SPEC 09 y sus mecánicas.
- [ ] `/juegos/gloton/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** definida por game-jam de forma autónoma a partir del tema «RANARIA: cruza carriles de tráfico y troncos por rejilla hasta los nenúfares contra reloj; puntos por avance, nenúfar y tiempo sobrante». Revisar antes de aprobar.
- **Sí:** deslizar y tocar sobre el propio canvas. Un salto por gesto es el control natural de un juego de rejilla y no tapa el mundo.
- **No:** cruceta en pantalla. Tapa parte de los carriles en un mundo 4:3 y exige un diseño de layout propio.
- **Sí:** tocar salta hacia arriba. Es el movimiento más frecuente y acelera el juego en móvil.
- **Sí:** umbrales de `lib/games/gestures.ts` (24 px deslizar, 10 px / 250 ms tocar) más 0,4 s máximo de deslizamiento propio de RANARIA. Misma sensibilidad que el resto de juegos (SPEC 09).
- **Sí:** gestos con cualquier `pointerType`, como fija SPEC 09 (gestos activos siempre; híbridos táctiles funcionan). Antes se proponía solo `touch`/`pen`; se alinea con el contrato (mobile-porter, 2026-11-20).
- **Sí:** gestos y teclas por el mismo `hop(dir)` público. Mismo búfer y mismas fases sin duplicar lógica; sin `KeyboardEvent` sintéticos (SPEC 09).
- **Sí:** `controls = 'TECLADO / TÁCTIL'` por migración. La ficha debe decir que se juega en móvil.
- **Sí:** popups con incrementos, no totales. El canvas sigue sin duplicar el HUD de la plataforma.
- **Sí:** salpicadura distinta del aspa. El jugador entiende si murió por agua o por choque.
- **Sí:** respetar `prefers-reduced-motion`. Accesibilidad básica sin quitar información.
- **Sí:** efectos sin glow y con tope de 8 popups. `shadowBlur` en partículas bajaría los FPS en móviles.
- **Sí:** sin vibración. La API no existe en todos los navegadores y merece su propia decisión.
- **Sí:** sin cambios de balance. Las marcas de la 02 siguen siendo comparables.
- **Sí:** no se tocan los controles táctiles de los otros juegos reales (SPEC 09).
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| El navegador desplaza la página o hace zoom con el gesto            | `touch-action: none` en el canvas y `preventDefault` en `pointerdown` fuera de `gameover`. |
| `preventDefault` en el canvas impide escribir en el modal           | Nunca en `gameover`; el modal está fuera del canvas.                                       |
| Listeners de puntero que sobreviven al desmontaje                   | Registrados en `mount()` y quitados en `destroy()`; criterio de entrar y salir 5 veces.    |
| La conversión de distancia falla con la CRT escalada                | Umbrales en px CSS, sin convertir a coordenadas del mundo.                                 |
| Detección táctil errónea en portátiles con pantalla táctil          | Overlay según `useIsTouch()`; los gestos del canvas funcionan siempre.                     |
| Popups encadenados tapan la rana en carreras rápidas                | Tope de 8 y vida de 0,7 s.                                                                 |
| Fuente `monospace` del canvas distinta de la pixel de la plataforma | Riesgo aceptado: cargar la fuente pixel en canvas exige esperar a `document.fonts`.        |
| Número de migración `0007` ocupado al implementar                   | Renumerar al siguiente libre; el contenido no cambia.                                      |

## Lo que **no** entra en esta spec

- Cruceta o botones en pantalla.
- Vibración.
- Gestos con ratón.
- Sonido.
- Controles táctiles para otros juegos.
- Cambios de balance.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
