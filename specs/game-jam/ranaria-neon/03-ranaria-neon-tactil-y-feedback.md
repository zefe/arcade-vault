# SPEC JAM ranaria-neon 03 — Controles táctiles y feedback visual de RANARIA NEÓN

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07, `game-jam/ranaria-neon/01-juego-ranaria-neon`, `game-jam/ranaria-neon/02-ranaria-neon-niveles`
> **Fecha:** 2026-11-17
> **Objetivo:** Hacer RANARIA NEÓN jugable en móvil con deslizar y tocar, y añadir popups de puntos, salpicaduras y destellos que expliquen cada suma y cada muerte.

## Por qué existe esta spec

RANARIA NEÓN es un juego de un salto por gesto: se presta al táctil mejor que cualquier otro juego real del catálogo, que hoy solo avisan `REQUIERE TECLADO`.
Tras la 01 y la 02 la puntuación tiene cuatro fuentes (avance, nenúfar, tiempo, luciérnaga) más el bonus de ronda y las vidas extra, pero el jugador solo ve subir un número en el HUD.
Tampoco distingue a simple vista si murió por agua, por boya hundida o por vehículo.
Esta spec añade control táctil propio y feedback en el canvas sin tocar el balance de la 02.
Será el primer juego real con `controls = 'TECLADO / TÁCTIL'`; el patrón de gestos queda documentado para otros juegos de rejilla.

## Alcance

**Dentro:**

- Gestos táctiles sobre el canvas: deslizar en 4 direcciones salta en esa dirección; tocar salta hacia arriba.
- `touch-action: none` en el canvas de RANARIA NEÓN para que los gestos no desplacen la página.
- Overlay de `ready` en táctil: `TOCA PARA EMPEZAR` sustituye a `REQUIERE TECLADO` y tocar el overlay llama a `start()`.
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

Sin cambios de esquema. Migración `supabase/migrations/0007_ranaria_neon_tactil.sql`:

```sql
update public.games
set controls = 'TECLADO / TÁCTIL'
where id = 'ranaria-neon';
```

`long` no cambia: describe el juego, no los controles.

Contrato del motor: `RanariaNeonPhase`, `RanariaNeonSnapshot` y los métodos públicos no cambian. El motor registra los listeners de puntero del canvas en `mount()` y los quita en `destroy()`.

Entidades nuevas (`lib/games/ranaria-neon/entities.ts`):

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
- Gestos (eventos `pointerdown`, `pointerup` y `pointercancel` en el canvas, solo con `pointerType` `touch` o `pen`):
  - Se sigue un único puntero; un segundo dedo se ignora mientras el primero está apoyado.
  - Distancia medida en px CSS entre `pointerdown` y `pointerup`.
  - `SWIPE_MIN = 24` px y `SWIPE_MAX_TIME = 0.4` s: deslizar si la distancia es al menos 24 px y dura como mucho 0,4 s. Dirección del eje dominante (`|dx| ≥ |dy|` → horizontal).
  - `TAP_MAX = 12` px y `TAP_MAX_TIME = 0.25` s: tocar si se mueve como mucho 12 px y dura como mucho 0,25 s → salto arriba.
  - Gestos fuera de estos rangos se ignoran.
  - Cada gesto entra por el mismo camino que una tecla: mismo búfer de 1 durante el salto, mismas fases activas (`playing`, sin pausa ni muerte).
  - `pointercancel`, `pause()`, `blur` y `visibilitychange` descartan el puntero en curso.
  - `preventDefault` en `pointerdown` solo fuera de `gameover`.
- `.ranaria-neon-crt canvas { touch-action: none; }`.
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
| Tocar el overlay  | Empezar           | `ready`, solo táctil           |
| `P` / `Esc`       | Pausar o reanudar | `playing`                      |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para el overlay táctil y el estilo de popups y destellos.
2. Añadir a `lib/games/ranaria-neon/constants.ts` `SWIPE_MIN`, `SWIPE_MAX_TIME`, `TAP_MAX`, `TAP_MAX_TIME`, `POPUP_TIME`, `MAX_POPUPS`, `SPLASH_TIME` y `FLASH_TIME`.
3. Añadir a `entities.ts` `Popup`, `Particle`, `Flash`, `drawPopup`, `drawParticle` y `drawFlash`.
4. Refactorizar en `engine.ts` la entrada de salto a un único método privado `requestHop(dir)` usado por teclado y gestos. Verificar: el teclado se comporta igual que en la 02.
5. Añadir los listeners `pointerdown`, `pointerup` y `pointercancel` del canvas en `mount()` y quitarlos en `destroy()`, con la lógica de gesto de Convenciones.
6. Añadir la creación de popups, salpicaduras y destellos en los puntos de avance, nenúfar, ronda, vida extra y muerte por agua, y su actualización y dibujo.
7. Añadir `reducedMotion` con `matchMedia` y su listener `change`, retirado en `destroy()`.
8. Cambiar `components/ranaria-neon-player.tsx`: en táctil el overlay de `ready` muestra `TOCA PARA EMPEZAR`, es pulsable y llama a `start()` tras `blurFocused()`; en escritorio no cambia.
9. Añadir a `app/globals.css` `touch-action: none` en `.ranaria-neon-crt canvas` y el estilo pulsable de `.ranaria-neon-touch`.
10. Crear la migración `0007_ranaria_neon_tactil.sql` (renumerar si está tomada), aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
11. Actualizar la ficha de `ranaria-neon` en `references/implemented-games.md` (controles `TECLADO / TÁCTIL`) y `CLAUDE.md` (Stack notes: primer juego real con gestos táctiles).
12. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/ranaria-neon/jugar` no muestra errores ni warnings de hidratación en consola, en escritorio ni en emulación móvil.

**Inicio**

- [ ] En escritorio el overlay de `ready` es el de la 01, con `PULSA ESPACIO` y sin `TOCA PARA EMPEZAR`.
- [ ] En un dispositivo táctil (o emulación móvil de DevTools) el overlay muestra `TOCA PARA EMPEZAR` y no muestra `REQUIERE TECLADO`.
- [ ] Tocar el overlay en táctil empieza la partida.
- [ ] En `ready`, deslizar sobre el canvas no mueve la rana.

**Mecánicas**

- [ ] Deslizar hacia arriba, abajo, izquierda o derecha al menos 24 px en menos de 0,4 s salta una casilla en esa dirección.
- [ ] Tocar el canvas sin desplazar el dedo salta una casilla hacia arriba.
- [ ] Deslizar en diagonal salta en la dirección del eje con mayor recorrido.
- [ ] Un gesto lento (más de 0,4 s) o un movimiento entre 13 y 23 px no salta.
- [ ] Dos gestos muy seguidos dan dos saltos; un tercero durante el mismo salto se ignora.
- [ ] Un segundo dedo apoyado mientras el primero desliza no genera otro salto.
- [ ] Deslizar sobre el canvas no desplaza la página.
- [ ] Con el ratón, hacer click o arrastrar sobre el canvas no mueve la rana.
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
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'ranaria-neon'` y la puntuación mostrada.
- [ ] JUGAR DE NUEVO empieza sin popups, partículas ni destellos de la partida anterior.

**Ranking**

- [ ] `select controls from games where id = 'ranaria-neon'` devuelve `TECLADO / TÁCTIL`.
- [ ] La ficha de `ranaria-neon` muestra `TECLADO / TÁCTIL`.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.

**Ciclo de vida**

- [ ] Tras SALIR, tocar y deslizar desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no duplica saltos por gesto ni acelera el juego.

**Regresiones**

- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y `/juegos/bloque-buster/jugar` siguen mostrando su aviso de táctil y conservan sus mecánicas.
- [ ] `/juegos/ranaria/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** definida por game-jam de forma autónoma a partir del tema «RANARIA: cruza carriles de tráfico y troncos por rejilla hasta los nenúfares contra reloj; puntos por avance, nenúfar y tiempo sobrante». Revisar antes de aprobar.
- **Sí:** deslizar y tocar sobre el propio canvas. Un salto por gesto es el control natural de un juego de rejilla y no tapa el mundo.
- **No:** cruceta en pantalla. Tapa parte de los carriles en un mundo 4:3 y exige un diseño de layout propio.
- **Sí:** tocar salta hacia arriba. Es el movimiento más frecuente y acelera el juego en móvil.
- **Sí:** umbrales de 24 px y 0,4 s para deslizar, 12 px y 0,25 s para tocar, con zona muerta entre 13 y 23 px. Evita saltos accidentales por temblor del dedo.
- **Sí:** gestos solo con `pointerType` `touch` o `pen`. Un click de ratón en escritorio no debe mover la rana.
- **Sí:** gestos y teclas por el mismo `requestHop`. Mismo búfer y mismas fases sin duplicar lógica.
- **Sí:** `controls = 'TECLADO / TÁCTIL'` por migración. La ficha debe decir que se juega en móvil.
- **Sí:** popups con incrementos, no totales. El canvas sigue sin duplicar el HUD de la plataforma.
- **Sí:** salpicadura distinta del aspa. El jugador entiende si murió por agua o por choque.
- **Sí:** respetar `prefers-reduced-motion`. Accesibilidad básica sin quitar información.
- **Sí:** efectos sin glow y con tope de 8 popups. `shadowBlur` en partículas bajaría los FPS en móviles.
- **Sí:** sin vibración. La API no existe en todos los navegadores y merece su propia decisión.
- **Sí:** sin cambios de balance. Las marcas de la 02 siguen siendo comparables.
- **Sí:** el resto de juegos reales conservan `REQUIERE TECLADO`. Sus controles táctiles son otro diseño.
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| El navegador desplaza la página o hace zoom con el gesto            | `touch-action: none` en el canvas y `preventDefault` en `pointerdown` fuera de `gameover`.     |
| `preventDefault` en el canvas impide escribir en el modal           | Nunca en `gameover`; el modal está fuera del canvas.                                           |
| Listeners de puntero que sobreviven al desmontaje                   | Registrados en `mount()` y quitados en `destroy()`; criterio de entrar y salir 5 veces.        |
| La conversión de distancia falla con la CRT escalada                | Umbrales en px CSS, sin convertir a coordenadas del mundo.                                     |
| Detección táctil errónea en portátiles con pantalla táctil          | Overlay según `(hover: none) and (pointer: coarse)`; los gestos funcionan siempre con `touch`. |
| Popups encadenados tapan la rana en carreras rápidas                | Tope de 8 y vida de 0,7 s.                                                                     |
| Fuente `monospace` del canvas distinta de la pixel de la plataforma | Riesgo aceptado: cargar la fuente pixel en canvas exige esperar a `document.fonts`.            |
| Número de migración `0007` ocupado al implementar                   | Renumerar al siguiente libre; el contenido no cambia.                                          |

## Lo que **no** entra en esta spec

- Cruceta o botones en pantalla.
- Vibración.
- Gestos con ratón.
- Sonido.
- Controles táctiles para otros juegos.
- Cambios de balance.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
