# SPEC 04 — Juego ROCAS real en el reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-04
> **Objetivo:** Adaptar `references/started-games/02-asteroids/` como motor TypeScript en canvas para que `/juegos/rocas/jugar` sea un juego real, con el HUD, la pausa y el guardado de puntuación de la plataforma.

## Por qué existe esta spec

El reproductor de SPEC 01 solo simula una partida con un score que sube solo.
ROCAS es el primer juego real y deja el patrón que seguirán los de `references/started-games/`.
`game.js` usa globals, listeners sin limpiar y un `requestAnimationFrame` infinito, así que no se puede montar tal cual en una ruta de Next.

## Alcance

**Dentro:**

- Motor en `lib/games/rocas/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas de `game.js`: rotación, propulsión, disparo, mundo toroidal, división de rocas, 3 vidas, invencibilidad al reaparecer, niveles, partículas y power-up `3x`.
- Rozamiento normalizado por `dt`, idéntico al original a 60 Hz.
- Paleta neón de la plataforma con formas vectoriales y glow.
- Canvas dentro de `.crt-screen`, escalado y nítido en pantallas HiDPI.
- HUD React de la plataforma con puntuación, vidas y nivel reales. El indicador `3x` sigue en canvas.
- Overlay inicial con controles y `PULSA ESPACIO`.
- PAUSA real con botón, `P` o `Esc`.
- Auto-pausa al perder foco o cambiar de pestaña.
- FIN y fin de vidas abren el modal FIN DEL JUEGO existente.
- Guardado en `av_scores` con el `saveScore` actual.
- Aviso `REQUIERE TECLADO` en dispositivos táctiles.
- Extracción del marco común del reproductor a `components/player-shell.tsx`.
- Ficha de ROCAS corregida: sin OVNIs y con etiqueta `TECLADO`.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Supabase, Auth real o tabla de puntuaciones.
- Mostrar puntuaciones reales en detalle o Salón de la Fama.
- OVNIs, mecánicas nuevas o cambios de balance.
- Sonido.
- Implementar otros juegos. Los otros 7 siguen con la simulación de SPEC 01.
- Sistema genérico de plugins de juegos.
- Tests automatizados.

## Modelo de datos

No hay persistencia nueva. `av_scores` conserva el formato `{ game, score, name, at }`, con `game: "rocas"`.

Cambio en el catálogo (`lib/games.ts`):

```ts
export type Game = {
  // ...campos existentes
  controls?: string; // etiqueta de detalle; por defecto "TECLADO / TÁCTIL"
};
```

Ficha de `rocas`:

```ts
controls: "TECLADO",
long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para activar el disparo triple durante 5 segundos.",
```

Contrato del motor (`lib/games/rocas/engine.ts`):

```ts
export type RocasPhase = "ready" | "playing" | "dead" | "gameover";

export type RocasSnapshot = {
  phase: RocasPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
};

export class RocasEngine {
  constructor(canvas: HTMLCanvasElement, onChange: (s: RocasSnapshot) => void);
  mount(): void; // registra listeners, arranca el loop y queda en "ready"
  start(): void; // "ready" → "playing"
  pause(): void;
  resume(): void;
  end(): void; // cualquier fase → "gameover"
  restart(): void; // partida nueva, directamente en "playing"
  destroy(): void; // quita listeners y cancela el RAF
}
```

Props de `components/player-shell.tsx`:

```ts
type PlayerShellProps = {
  game: Game;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  controlsDisabled?: boolean; // desactiva PAUSA y FIN
  crtClassName?: string; // clase extra para `.crt`
  pauseHint?: string; // texto bajo EN PAUSA
  onTogglePause: () => void;
  onEnd: () => void;
  onRestart: () => void;
  children: React.ReactNode; // contenido de `.crt-screen`
};
```

Convenciones:

- Mundo lógico fijo de 800×600 y `dt` en segundos con tope de 50 ms, como el original.
- Valores de juego sin cambios:
  - `RADII [0, 16, 30, 50]`, `SPEEDS [0, 85, 55, 32]`, `POINTS [0, 100, 50, 20]`.
  - Vidas 3, invencibilidad 3 s, reaparición 2 s, cooldown de disparo 0,2 s.
  - Power-up: probabilidad 15 %, garantizado a la 5.ª roca, duración 5 s, vida 12 s.
  - Niveles: 4 rocas al inicio y `3 + level` al subir.
- Rozamiento por tick: `Math.pow(0.987, dt * 60)`.
- Colores del canvas en `lib/games/rocas/constants.ts`, con los mismos valores que los tokens de `globals.css`:
  - Nave: `#00f5ff`.
  - Rocas: `#f5ff00`.
  - Balas: `#e6e9ff`.
  - Power-up e indicador `3x`: `#ff006e`.
  - Llama del propulsor: `#d97a3a`.
  - Partículas: `#f5ff00` con alpha, sin glow.
- Backing store del canvas: `800 × dpr` por `600 × dpr`, con `dpr` limitado a 2.

Teclas:

| Tecla       | Acción            | Fases activas     |
| ----------- | ----------------- | ----------------- |
| `←` `→`     | Rotar             | `playing`         |
| `↑`         | Propulsar         | `playing`         |
| `Espacio`   | Empezar           | `ready`           |
| `Espacio`   | Disparar          | `playing`         |
| `P` / `Esc` | Pausar o reanudar | `playing`, `dead` |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para overlays y estilos (instrucción de `CLAUDE.md`).
2. Extraer `components/player-shell.tsx` desde `components/game-player.tsx`: HUD, botones, `.crt`, overlay de pausa y modal con guardado. `GamePlayer` queda con la simulación. Verificar: `/juegos/caida/jugar` funciona igual que antes.
3. Crear `lib/games/rocas/constants.ts` con tamaños, valores de juego, colores y utilidades `wrap`, `dist`, `rand`, `randInt`.
4. Crear `lib/games/rocas/entities.ts` con `Bullet`, `Asteroid`, `PowerUp` y `Particle`. Cada `draw` recibe `ctx` por parámetro.
5. Añadir `Ship` a `entities.ts`. Recibe el input por parámetro en `update` y aplica el rozamiento normalizado.
6. Crear `lib/games/rocas/engine.ts` con estado, `update`, colisiones, niveles y `end()`, sin dibujo ni loop todavía. Quitar el reinicio con `Espacio` de `gameover`.
7. Añadir a `engine.ts` el dibujo del mundo y el indicador `3x`. No dibujar score, nivel, vidas ni overlay de game over. Configurar el backing store con `dpr`.
8. Añadir a `engine.ts` el loop y los listeners:
   - `mount()`, `destroy()`, `pause()` y `resume()`.
   - `onChange` solo cuando cambia algún campo del snapshot.
   - En pausa se dibuja sin llamar a `update`.
   - Al pausar se limpian `keys` y `justPressed`.
   - `blur` y `visibilitychange` llaman a `pause()`.
9. Añadir la gestión de teclas según fase. `preventDefault` en `←`, `→`, `↑` y `Espacio` solo en `ready`, `playing` y `dead`, para no bloquear el input del modal.
10. Crear `components/rocas-player.tsx` (`"use client"`): crea el motor en `useEffect`, lo destruye en el cleanup, renderiza `<canvas>` dentro de `PlayerShell` y conecta el snapshot a HUD y modal.
11. Añadir en `RocasPlayer` el overlay de `ready` con controles y `PULSA ESPACIO`. En táctil (`(hover: none) and (pointer: coarse)`, vía `useSyncExternalStore`) añadir `REQUIERE TECLADO`. `Espacio` sigue funcionando para quien conecte un teclado.
12. Conectar los botones: PAUSA y FIN desactivados en `ready`, y `blur()` del botón tras cada click. `pauseHint`: `PULSA P O REANUDAR PARA CONTINUAR`.
13. En `app/juegos/[id]/jugar/page.tsx`, renderizar `RocasPlayer` si `game.id === "rocas"` y `GamePlayer` en el resto.
14. Añadir a `app/globals.css`:
    - `.crt-screen canvas`: `display: block; width: 100%; height: 100%`.
    - `.rocas-crt`: ancho limitado por la altura del viewport y centrado.
15. Actualizar `lib/games.ts` con `controls` y el nuevo `long`. En `app/juegos/[id]/page.tsx`, mostrar `game.controls ?? "TECLADO / TÁCTIL"`.
16. Añadir a `CLAUDE.md` (Stack notes) una línea con el patrón de juegos reales: motor en `lib/games/<id>/` y componente `components/<id>-player.tsx` sobre `PlayerShell`.
17. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/rocas/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con `←` `→` `↑` `Espacio` `P` y `PULSA ESPACIO`, y las rocas no causan daño.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `Espacio` empieza la partida y oculta el overlay.

**Mecánicas**

- [ ] `←` y `→` rotan la nave, `↑` la propulsa y `Espacio` dispara.
- [ ] Mantener `Espacio` pulsado dispara una sola bala.
- [ ] Nave, balas y rocas que salen por un borde reaparecen por el opuesto.
- [ ] Destruir una roca grande suma 20 y crea 2 medianas.
- [ ] Destruir una mediana suma 50 y crea 2 pequeñas.
- [ ] Destruir una pequeña suma 100 y no crea fragmentos.
- [ ] Recoger el power-up activa disparo triple 5 s y muestra `3x` con cuenta atrás en el canvas.
- [ ] Limpiar el campo sube el nivel y genera `3 + nivel` rocas grandes.
- [ ] Chocar resta una vida, y la nave reaparece a los 2 s en el centro, parpadeando e invencible 3 s.

**HUD y visual**

- [ ] Puntuación, vidas y nivel del HUD React coinciden con la partida.
- [ ] El canvas no dibuja score, nivel ni vidas.
- [ ] Nave cian, rocas amarillas, power-up magenta y líneas nítidas en pantalla HiDPI.
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las flechas y `Espacio` no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran EN PAUSA.
- [ ] REANUDAR, `P` y `Esc` continúan la partida con la misma puntuación.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Una tecla mantenida al perder el foco no sigue activa al reanudar.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` dispara y no vuelve a pausar.

**Fin de partida**

- [ ] Al perder la tercera vida se abre el modal con la puntuación real.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios en el campo de nombre del modal.
- [ ] GUARDAR PUNTUACIÓN añade a `av_scores` una entrada con `game: "rocas"` y la puntuación mostrada.
- [ ] JUGAR DE NUEVO empieza en `playing` con puntuación 0, 3 vidas y nivel 1.
- [ ] `Espacio` con el modal abierto no reinicia la partida.

**Ciclo de vida**

- [ ] Tras SALIR, una pulsación de flechas o `Espacio` en otra página desplaza la página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera el juego al volver a entrar.

**Regresiones y ficha**

- [ ] En táctil, el overlay muestra `REQUIERE TECLADO`.
- [ ] La ficha de `/juegos/rocas` muestra `TECLADO`, y su texto no menciona OVNIs.
- [ ] La ficha de otro juego sigue mostrando `TECLADO / TÁCTIL`.
- [ ] `/juegos/caida/jugar` conserva la arena y el score simulados de SPEC 01.
- [ ] `git status` no muestra cambios en `references/started-games/02-asteroids/`.

## Decisiones

- **Sí:** motor TS con ciclo de vida. Limpia recursos y sirve de patrón para Tetris y Arkanoid.
- **No:** iframe a `/public`. Aísla el juego y obliga a usar `postMessage`.
- **No:** todo en un componente React. Mezcla lógica de juego y UI.
- **Sí:** `game.id === "rocas"` en la página de jugar. Con un solo juego real basta.
- **No:** registro genérico de juegos. Se decide con el segundo juego real, cuando haya dos casos.
- **Sí:** `PlayerShell` compartido. Evita duplicar HUD y modal entre simulación y juego real.
- **Sí:** HUD React, con `3x` en canvas. Conserva la UI de la plataforma, y el `3x` es un efecto de juego.
- **No:** HUD en canvas o duplicado. Rompe la consistencia o repite información.
- **Sí:** `av_scores` local. Supabase requiere Auth y RLS para evitar puntuaciones falsas.
- **No:** mostrar puntuaciones reales en detalle o Salón. Va en la spec de puntuaciones.
- **Sí:** mantener la simulación en los otros 7 juegos. Cero regresiones.
- **No:** `PRÓXIMAMENTE` en los otros juegos. Toca detalle, tarjetas y copy sin necesidad ahora.
- **Sí:** paleta neón con las mismas formas. Integra el juego sin tocar la mecánica.
- **No:** blanco y negro original. Queda desconectado del sitio.
- **Sí:** overlay con `PULSA ESPACIO`. No se pierde tiempo de partida y se explican los controles.
- **No:** arranque inmediato. La partida empieza antes de que el jugador esté listo.
- **Sí:** JUGAR DE NUEVO directo a `playing`. El jugador ya conoce los controles y acaba de pedirlo.
- **Sí:** `P` y `Esc`, además del botón. Permiten pausar sin soltar el teclado.
- **Sí:** auto-pausa al perder foco. Evita muertes injustas y teclas pegadas.
- **Sí:** quitar el reinicio con `Espacio` en `gameover`. Evita perder la puntuación sin querer.
- **Sí:** solo teclado con aviso. Los controles táctiles requieren diseño y pruebas propias.
- **No:** bloquear el juego en táctil. Una tablet puede tener teclado conectado.
- **Sí:** rozamiento normalizado por `dt`. A 120 Hz la nave frenaría el doble y las partidas no serían comparables.
- **No:** otros cambios de física o balance. El objetivo es adaptar, no rediseñar.
- **Sí:** corregir la ficha y quitar los OVNIs. La ficha describe lo que existe.
- **No:** añadir OVNIs. Es mecánica nueva.
- **Sí:** `controls` opcional en `Game`. Solo cambia ROCAS, sin tocar los otros 7 juegos.
- **Sí:** mantener `lib/games.ts` junto a `lib/games/`. Evita renombrar imports fuera de alcance.

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta, desmonta y vuelve a montar en dev, duplicando el loop | `destroy()` cancela el RAF y quita listeners; el motor se crea dentro de `useEffect`.                        |
| `Espacio` activa el botón con foco además de disparar                          | `blur()` tras cada click y `preventDefault` en `keydown` y `keyup` durante la partida.                       |
| `preventDefault` global rompe el input del modal                               | Solo se aplica en `ready`, `playing` y `dead`; nunca en `gameover`.                                          |
| `@/lib/games` resulta ambiguo con `lib/games.ts` y `lib/games/`                | TypeScript resuelve primero el archivo; `lib/games/` no tendrá `index.ts`. Verificar con `npm run build`.    |
| `onChange` en cada frame provoca renders innecesarios                          | Solo se emite si cambia algún campo del snapshot.                                                            |
| `shadowBlur` baja los FPS con muchas entidades                                 | Glow solo en nave, rocas y power-up; partículas sin glow.                                                    |
| Los pseudo-elementos CRT quedan bajo el canvas                                 | Canvas sin `position` propia, para que los pseudo-elementos posicionados pinten encima; verificar scanlines. |
| La CRT supera el alto del viewport y el scroll oculta la nave                  | `.rocas-crt` limita el ancho en función de `100dvh`.                                                         |
| La extracción de `PlayerShell` altera la simulación                            | Paso 2 aislado, verificado en `/juegos/caida/jugar` antes de seguir.                                         |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Supabase, Auth real o puntuaciones en la nube.
- Puntuaciones reales en detalle o Salón de la Fama.
- OVNIs, mecánicas nuevas o cambios de balance.
- Sonido.
- Otros juegos o un sistema genérico de plugins.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
