# SPEC <NN> — Juego <TITLE> real en el reproductor

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05<, SPEC XX>
> **Fecha:** <YYYY-MM-DD del contexto>
> **Objetivo:** <Adaptar `references/started-games/<carpeta>/` | Crear> como motor TypeScript en canvas para que `/juegos/<id>/jugar` sea un juego real con ranking, sobre `PlayerShell`.

## Por qué existe esta spec

<Estado actual del juego: simulación de SPEC 01 o inexistente en el catálogo.>
<Qué impide montar la referencia tal cual: globals, listeners, RAF, HUD propio… | Juego sin referencia: qué se diseña.>
<Qué gana la plataforma: segundo juego ranked, registro de players, etc.>

## Alcance

**Dentro:**

- Motor en `lib/games/<id>/`, sin globals, con ciclo de vida explícito y limpieza completa al desmontar.
- Mecánicas: <lista concreta>.
- <Física/temporizadores normalizados por `dt`, idénticos al original a 60 Hz.>
- <Paleta neón de la plataforma | sprites de la referencia en `public/games/<id>/`>.
- Canvas dentro de `.crt-screen`, escalado y nítido en HiDPI.
- HUD React de la plataforma con <campos>. <Efectos de juego que siguen en canvas.>
- Overlay inicial con controles y `PULSA <TECLA>`.
- PAUSA real con botón, `P` o `Esc`, y auto-pausa al perder foco o cambiar de pestaña.
- FIN y fin de partida abren el modal FIN DEL JUEGO existente.
- Guardado en `scores` con `game_id = '<id>'` mediante una migración que pone `ranked = true`.
- Aviso `REQUIERE TECLADO` en táctil.
- [si 2.º juego real] Registro `components/game-players.ts` que sustituye `game.id === "rocas"`.
- [si HUD distinto] Ampliación opcional de `PlayerShell` para <campo>.
- Ficha de <id> corregida: `long` fiel a lo implementado y `controls = '<TECLADO>'`.

**Fuera de alcance (specs futuras):**

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance.
- Antifraude, topes de score o Auth real.
- Implementar otros juegos.
- Tests automatizados.
- <Lo que la referencia trae y se descarta.>

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/<NNNN>_juego_<id>.sql`:

```sql
-- [fila existente]
update public.games
set ranked = true,
    controls = '<TECLADO>',
    long = '<texto>'
where id = '<id>';

-- [fila nueva]
insert into public.games (id, title, short, long, cat, cover, color, controls, ranked, sort_order)
values ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', 'cover-<x>', '<color>', '<TECLADO>', true, <n>);
```

Contrato del motor (`lib/games/<id>/engine.ts`):

```ts
export type <Id>Phase = "ready" | "playing" | <...> | "gameover";

export type <Id>Snapshot = {
  phase: <Id>Phase;
  paused: boolean;
  score: number;
  <campos de HUD>;
};

export class <Id>Engine {
  constructor(canvas: HTMLCanvasElement, onChange: (s: <Id>Snapshot) => void);
  mount(): void; // registra listeners, arranca el loop y queda en "ready"
  start(): void; // "ready" → "playing"
  pause(): void;
  resume(): void;
  end(): void; // cualquier fase → "gameover"
  restart(): void; // partida nueva, directamente en "playing"
  destroy(): void; // quita listeners y cancela el RAF
}
```

[si registro]

```ts
// components/game-players.ts
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  <id>: <Id>Player,
};
```

Convenciones:

- Mundo lógico fijo de <W>×<H> y `dt` en segundos con tope de 50 ms.
- Valores de juego sin cambios: <constantes con sus números>.
- <Normalizaciones por `dt`: fórmula exacta.>
- Colores en `lib/games/<id>/constants.ts`, con los valores de los tokens de `globals.css`: <entidad → color>.
- Backing store `<W> × dpr` por `<H> × dpr`, con `dpr` limitado a 2.

Teclas:

| Tecla       | Acción            | Fases activas |
| ----------- | ----------------- | ------------- |
| <...>       | <...>             | `playing`     |
| `<inicio>`  | Empezar           | `ready`       |
| `P` / `Esc` | Pausar o reanudar | <fases>       |

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` sobre componentes cliente. Aplicar `/frontend-design` para overlays y estilos.
2. [si registro] Crear `components/game-players.ts` con `rocas` y usarlo en `app/juegos/[id]/jugar/page.tsx`. Verificar: `/juegos/rocas/jugar` y `/juegos/<simulación>/jugar` funcionan igual.
3. [si HUD distinto] Ampliar `PlayerShell` con <props opcionales>. Verificar: ROCAS y la simulación sin cambios.
4. Crear `lib/games/<id>/constants.ts` con tamaños, valores de juego, colores y utilidades.
5. Crear `lib/games/<id>/entities.ts` con <clases>. Cada `draw` recibe `ctx`.
6. Crear `lib/games/<id>/engine.ts` con estado, `update`, colisiones, <niveles> y `end()`, sin dibujo ni loop. Quitar el reinicio por tecla de `gameover`.
7. Añadir el dibujo del mundo y efectos de juego, sin HUD ni overlay de game over. Configurar el backing store con `dpr`.
8. Añadir el loop y los listeners: `mount()`, `destroy()`, `pause()`, `resume()`; `onChange` solo si cambia el snapshot; en pausa se dibuja sin `update`; al pausar se limpian `keys` y `justPressed`; `blur` y `visibilitychange` pausan.
9. Añadir la gestión de teclas por fase, con `preventDefault` solo fuera de `gameover`.
10. Crear `components/<id>-player.tsx` (`"use client"`) sobre `PlayerShell`, con el motor en `useEffect` y `destroy()` en el cleanup.
11. Añadir el overlay de `ready` con controles, `PULSA <TECLA>` y `REQUIERE TECLADO` en táctil (`useSyncExternalStore`).
12. Conectar los botones: PAUSA y FIN desactivados en `ready`, `blur()` tras cada click, `pauseHint` `PULSA P O REANUDAR PARA CONTINUAR`.
13. Seleccionar `<Id>Player` para `game.id === "<id>"` <en el registro | en la página de jugar>.
14. Añadir a `app/globals.css` `.<id>-crt` (ancho limitado por `100dvh` para <W>:<H>) y los estilos del overlay. [si fila nueva] Añadir `.cover-<x>`.
15. [si assets] Copiar assets a `public/games/<id>/` sin tocar `references/`.
16. Crear la migración `<NNNN>_juego_<id>.sql`, aplicarla con MCP `apply_migration` y revisar `get_advisors`.
17. Actualizar `CLAUDE.md` (Stack notes) si cambia el patrón de juegos reales.
18. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/<id>/jugar` no muestra errores ni warnings de hidratación en consola.

**Inicio**

- [ ] Al entrar se ve el overlay con <teclas> y `PULSA <TECLA>`, y la partida no avanza.
- [ ] PAUSA y FIN están desactivados hasta empezar.
- [ ] Pulsar `<TECLA>` empieza la partida y oculta el overlay.

**Mecánicas**

- [ ] <Un criterio booleano por mecánica, con números: puntos, velocidades, niveles.>

**HUD y visual**

- [ ] <Campos> del HUD React coinciden con la partida.
- [ ] El canvas no dibuja score ni el resto del HUD.
- [ ] <Colores por entidad> y líneas nítidas en HiDPI.
- [ ] A 1440×900, la pantalla CRT completa se ve sin hacer scroll.
- [ ] Las teclas de juego no desplazan la página durante la partida.

**Pausa**

- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran EN PAUSA.
- [ ] REANUDAR, `P` y `Esc` continúan con la misma puntuación.
- [ ] Cambiar de pestaña o de ventana pausa la partida, y al volver sigue en pausa.
- [ ] Una tecla mantenida al perder el foco no sigue activa al reanudar.
- [ ] Tras usar PAUSA y REANUDAR con el ratón, `Espacio` no vuelve a pausar.

**Fin de partida y guardado**

- [ ] Al <condición de derrota> se abre el modal con la puntuación real.
- [ ] FIN abre el mismo modal con la puntuación actual.
- [ ] Se pueden escribir espacios en el campo de nombre.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = '<id>'` y la puntuación mostrada.
- [ ] Terminar con 0 puntos muestra `SIN PUNTOS: NO SE GUARDA`.
- [ ] JUGAR DE NUEVO empieza en `playing` con el estado inicial.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] `select id from games where ranked` devuelve `rocas` y `<id>`.
- [ ] Como `anon`, insertar en un juego no ranked sigue fallando.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.
- [ ] Tras guardar, la marca aparece en la ficha de `<id>`, en su pestaña del Salón y en ACTIVIDAD EN VIVO.
- [ ] La ficha de `<id>` muestra `<controls>` y su texto describe solo lo implementado.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera el juego.

**Regresiones**

- [ ] `/juegos/rocas/jugar` conserva las mecánicas de SPEC 04.
- [ ] `/juegos/<simulación>/jugar` conserva la simulación y muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] [si referencia] `git status` no muestra cambios en `references/started-games/<carpeta>/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** motor TS con ciclo de vida sobre `PlayerShell`. Patrón de SPEC 04.
- **Sí:** `ranked = true` por migración. Regla de SPEC 05: solo juegos con motor real.
- **Sí:** <mantener balance original>. El objetivo es adaptar, no rediseñar.
- **Sí:** quitar el reinicio por tecla en `gameover`. Evita perder la puntuación sin querer.
- **Sí:** solo teclado con aviso. Los controles táctiles requieren diseño propio.
- [si registro] **Sí:** registro `id → player` con el 2.º juego real. Decisión diferida en SPEC 04 y 05.
- <Decisiones de Fase 2, con **Sí:**/**No:** y una frase de justificación.>

## Riesgos

| Riesgo                                                                  | Mitigación                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| React Strict Mode duplica el loop en dev                                | `destroy()` cancela el RAF y quita listeners; motor creado en `useEffect`. |
| `Espacio` activa el botón con foco                                      | `blur()` tras cada click y `preventDefault` en la partida.                 |
| `preventDefault` global rompe el input del modal                        | Nunca en `gameover`.                                                       |
| `onChange` en cada frame provoca renders                                | Solo se emite si cambia el snapshot.                                       |
| `shadowBlur` baja los FPS                                               | Glow solo en entidades principales.                                        |
| La CRT supera el alto del viewport                                      | `.<id>-crt` limita el ancho con `100dvh`.                                  |
| [si registro/HUD] El cambio de `PlayerShell` o la selección rompe ROCAS | Paso aislado y verificado antes de seguir.                                 |
| <Riesgos propios del juego>                                             | <Mitigación>                                                               |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido.
- Mecánicas nuevas o cambios de balance.
- Antifraude o Auth real.
- Otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
