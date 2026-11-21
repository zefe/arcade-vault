# SPEC JAM ranaria 02 — Niveles, amenazas y bonus de RANARIA

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07, `game-jam/ranaria/01-juego-ranaria`
> **Fecha:** 2026-11-18
> **Objetivo:** Dar a RANARIA una progresión real con 5 trazados de carril, boyas que se sumergen, una anguila en la mediana, una luciérnaga de bonus, tiempo por rana decreciente y vidas extra.

## Por qué existe esta spec

La SPEC JAM 01 deja un único trazado de carriles que solo acelera un 10 % por nivel hasta 1,5×.
A partir del nivel 6 todas las rondas son iguales: un jugador experto puede alargar la partida sin límite y el Nivel del HUD deja de significar nada.
Esta spec añade contenido propio del tema: cada nivel cambia qué hay en cada carril, el río gana plataformas traicioneras, la mediana deja de ser siempre segura y los nenúfares ofrecen un bonus que obliga a arriesgar.
También endurece el contra reloj: menos segundos por rana en cada nivel.
Cambia el balance de la 01 (velocidades, tiempo por rana y bonus de ronda); cada cambio está justificado en Decisiones.

## Alcance

**Dentro:**

- `lib/games/ranaria/levels.ts` con 5 trazados (`LEVELS`), el primero idéntico a la tabla de nivel 1 de la 01.
- Ciclo de trazados: el nivel `n` usa `LEVELS[(n − 1) mod 5]`; cada vuelta completa a los 5 multiplica las velocidades.
- Boyas que se sumergen: en los carriles de boyas marcados, una cadena se hunde cada 5 s con aviso previo.
- Anguila eléctrica en la mediana (fila 6) desde el nivel 3.
- Luciérnaga de bonus que aparece en un nenúfar libre: llegar a él suma 200 puntos más.
- Tiempo por rana decreciente: de 30 s en nivel 1 a 20 s desde el nivel 6.
- Vida extra cada 5000 puntos, hasta 5 vidas.
- Bonus de ronda creciente con el nivel.
- `long` de la ficha actualizado con los niveles, las amenazas y los bonus.

**Fuera de alcance (specs futuras):**

- Controles táctiles, popups de puntos, salpicaduras y destellos: SPEC JAM `ranaria` 03.
- Editor o selector de niveles.
- Más tipos de vehículo o plataforma que los de la 01.
- Sonido.
- Antifraude, topes de score o Auth real.
- Tests automatizados.

## Modelo de datos

Sin cambios de esquema. Migración `supabase/migrations/0006_ranaria_niveles.sql`:

```sql
update public.games
set long = 'Guía a una rana de neón casilla a casilla: cruza el tráfico, salta sobre troncos y boyas a la deriva y alcanza uno de los cinco nenúfares antes de que se agote el tiempo. Cinco trazados de carril se alternan y aceleran en cada vuelta; las boyas se hunden, una anguila eléctrica patrulla la mediana y cada nivel resta segundos. Cada fila nueva, cada nenúfar y cada segundo sobrante suman; la luciérnaga vale 200 más y cada 5000 puntos ganas una vida.'
where id = 'ranaria';
```

`title`, `short`, `cat`, `cover`, `color`, `controls`, `ranked` y `sort_order` no cambian.

Contrato del motor: `RanariaPhase`, `RanariaSnapshot` y los métodos públicos de `RanariaEngine` no cambian. `lives` pasa a ir de 0 a 5.

Niveles (`lib/games/ranaria/levels.ts`):

```ts
import type { LaneDef } from "./entities";

export type LevelDef = {
  name: string; // solo informativo, no se dibuja
  lanes: LaneDef[]; // 9 carriles: filas 1–5 y 7–10
};

export const LEVELS: LevelDef[]; // 5 trazados de la tabla de Convenciones
```

Cambios en entidades (`lib/games/ranaria/entities.ts`):

```ts
export type LaneDef = {
  // ...campos de la 01
  diving?: boolean; // solo carriles de boyas: la entidad 0 se sumerge
};

export type DiveState = "up" | "warning" | "down";

export type Eel = {
  x: number; // borde izquierdo en px
  dir: 1 | -1;
  active: boolean; // nivel >= 3
};

export type Firefly = {
  bay: number | null; // índice 0–4 del nenúfar, null = no visible
  t: number; // s dentro del ciclo de 10 s
};

// diveState(lane, t), drawEel, drawFirefly(ctx, …)
```

Convenciones:

- Mundo, rejilla, rana, choques, meta, muerte y puntos de avance, nenúfar y tiempo: sin cambios respecto a la 01.
- Trazados (`WRAP = 1000`, `spacing = 1000 / count`; dir `→` = 1, `←` = −1; `*` = carril con `diving`):

| Fila | 1 · Arranque      | 2 · Hora punta    | 3 · Corriente     | 4 · Convoy        | 5 · Tormenta      |
| ---- | ----------------- | ----------------- | ----------------- | ----------------- | ----------------- |
| 1    | boyas → 80 ·2·4   | boyas\* → 85 ·2·4 | tronco → 100 ·3·3 | boyas\* → 90 ·2·4 | tronco → 140 ·2·3 |
| 2    | tronco ← 50 ·3·3  | tronco ← 55 ·3·3  | boyas\* ← 80 ·2·4 | tronco ← 120 ·2·3 | boyas\* ← 95 ·2·4 |
| 3    | tronco → 90 ·4·3  | tronco → 95 ·3·3  | tronco → 70 ·2·3  | boyas\* → 85 ·3·3 | tronco → 110 ·3·3 |
| 4    | boyas ← 70 ·3·3   | boyas\* ← 75 ·3·3 | tronco ← 110 ·4·2 | tronco ← 80 ·3·3  | boyas\* ← 90 ·3·3 |
| 5    | tronco → 60 ·2·3  | tronco → 65 ·2·3  | boyas\* → 75 ·3·3 | tronco → 130 ·4·2 | tronco → 120 ·2·3 |
| 7    | bolido ← 150 ·1·2 | bolido ← 170 ·1·2 | coche ← 120 ·1·4  | camion ← 85 ·3·2  | bolido ← 230 ·1·3 |
| 8    | camion → 55 ·2·3  | camion → 60 ·2·3  | bolido → 190 ·1·2 | coche → 130 ·1·4  | camion → 95 ·2·3  |
| 9    | coche ← 90 ·1·4   | coche ← 100 ·1·4  | camion ← 70 ·2·3  | bolido ← 210 ·1·2 | coche ← 140 ·1·4  |
| 10   | moto → 70 ·1·3    | moto → 80 ·1·4    | moto → 90 ·1·4    | camion → 75 ·2·3  | moto → 110 ·1·4   |

Formato de cada celda: entidad, dirección, velocidad en px/s, largo en casillas, número de entidades.

- Hueco mínimo entre entidades: 133 px (tronco de 4 casillas con 3 por carril); todos los trazados se pueden cruzar. El camión de 3 casillas (150 px) cabe en los 200 px fuera de pantalla del `WRAP`.
- Velocidad efectiva: `speed × speedFactor(level)` con `speedFactor(level) = min(1 + 0.15 × floor((level − 1) / 5), 1.6)`. Niveles 1–5: 1×; 6–10: 1,15×; 11–15: 1,3×; 16–20: 1,45×; 21 y siguientes: 1,6×. Sustituye la fórmula de la 01.
- Velocidad más alta posible: bólido de Tormenta a 1,6× = 368 px/s; con `dt` de 50 ms avanza 18,4 px por frame, menos que la caja de 34 px de la rana.
- `offset` inicial de cada carril al cargar un nivel: `fila × 137` px, como la 01. Los carriles sí se recolocan al cambiar de nivel, porque cambia su contenido.
- Boyas que se sumergen:
  - Solo la entidad 0 de cada carril con `diving`; las demás cadenas del carril nunca se hunden.
  - `DIVE_CYCLE = 5` s, con desfase `fila × 0.7` s. Tiempo `t = mod(reloj + desfase, 5)`.
  - `up` de 0 a 3,6 s; `warning` de 3,6 a 4,2 s (parpadeo a 8 Hz, sigue siendo plataforma); `down` de 4,2 a 5 s (no es plataforma).
  - Una rana sobre una cadena que pasa a `down` cae al agua y pierde una vida.
  - El reloj de inmersión avanza solo en `playing` sin pausa.
  - Dibujo: `warning` alterna alpha 1 y 0,35; `down` dibuja solo un anillo de 1 px `rgba(0,245,255,0.25)` por boya.
- Anguila eléctrica:
  - Activa desde el nivel 3. 2 casillas de largo (100 px), fila 6, `EEL_SPEED = 60` px/s × `speedFactor(level)`.
  - Empieza en `x = 25` hacia la derecha y rebota entre `x = 25` y `x = 675` (borde derecho en 775).
  - Caja de choque: 100×20 centrada en la fila. La rana en tierra que la solapa con su caja de 34×34 pierde una vida.
  - Color `#ff006e` con 3 segmentos y zigzag de 2 px `#f5ff00`; con glow.
- Luciérnaga:
  - Ciclo `FIREFLY_CYCLE = 10` s: invisible de 0 a 6 s, visible de 6 a 10 s en un nenúfar libre elegido al azar al empezar cada aparición.
  - Si no hay nenúfares libres, esa aparición se salta.
  - Llegar al nenúfar con luciérnaga suma `FIREFLY_POINTS = 200` además de nenúfar y tiempo, y la luciérnaga desaparece hasta el siguiente ciclo.
  - Dibujo: círculo de 6 px `#f5ff00` con glow y dos alas de 1 px `#e6e9ff`, oscilando ±3 px en vertical a 2 Hz.
  - El ciclo se reinicia a 0 al empezar cada nivel.
- Tiempo por rana: `timeForLevel(level) = max(30 − 2 × (level − 1), 20)` s. Nivel 1: 30; 2: 28; 3: 26; 4: 24; 5: 22; 6 y siguientes: 20. La barra se escala a ese total; los umbrales de color (10 s y 5 s) no cambian.
- Vidas:
  - `MAX_LIVES = 5`, `EXTRA_LIFE_EVERY = 5000`.
  - Al cruzar cada múltiplo de 5000 (5000, 10000, 15000…) se suma una vida si hay menos de 5; si hay 5, ese múltiplo se pierde.
  - La partida sigue empezando con 3 vidas.
- Bonus de ronda: `roundBonus(level) = 500 + 100 × (level − 1)`, calculado con el nivel que se completa. Nivel 1: 500; nivel 5: 900. Sustituye los 500 fijos de la 01.
- Tope por rana en el nivel `n`: `100 + 50 + 200 + 10 × floor(timeForLevel(n) − 1.1)`. Nivel 1: 630; nivel 6+: 530.
- No hay puntuación máxima de partida: los niveles no terminan mientras queden vidas, y la vida extra no tiene tope de veces. A 99.999.999 no se llega en la práctica: con rondas perfectas y el bonus de ronda creciente harían falta unas 1.390 rondas seguidas.
- Colores nuevos: ninguno fuera de los tokens; la anguila usa `#ff006e` y `#f5ff00`, la luciérnaga `#f5ff00` y `#e6e9ff`.
- Glow (`shadowBlur`) suma solo la anguila y la luciérnaga a los elementos de la 01.
- El canvas sigue sin dibujar score, vidas, nivel, pausa ni game over.

Teclas: sin cambios respecto a la 01.

| Tecla           | Acción            | Fases activas                  |
| --------------- | ----------------- | ------------------------------ |
| `↑` `↓` `←` `→` | Saltar            | `playing`, sin pausa ni muerte |
| `W` `A` `S` `D` | Saltar            | `playing`, sin pausa ni muerte |
| `Espacio`       | Empezar           | `ready`                        |
| `P` / `Esc`     | Pausar o reanudar | `playing`                      |

## Skins

Los colores de la 01 ya viven en `lib/games/ranaria/skins.ts` (`RanariaPalette`, `SKINS: Record<SkinId, RanariaPalette>`); el motor dibuja con `this.palette` y `setSkin()` la cambia en caliente. Los hex de esta spec son los del skin **NEÓN**. Las entidades nuevas añaden claves a `RanariaPalette` (las tres entradas con las mismas claves) y **ningún color literal** en `engine.ts`/`entities.ts`; el glow usa `palette.glow` (0 en CLÁSICO).

| Clave         | Uso                     | CLÁSICO   | NEÓN      | RETRO (ámbar)      |
| ------------- | ----------------------- | --------- | --------- | ------------------ |
| `eel`         | cuerpo de la anguila    | `#e04040` | `#ff006e` | `#ffb000` (100 %)  |
| `eelZigzag`   | zigzag de 2 px          | `#f0d040` | `#f5ff00` | `#ffe6b3` (núcleo) |
| `firefly`     | cuerpo de la luciérnaga | `#f0d040` | `#f5ff00` | `#ffe6b3` (núcleo) |
| `fireflyWing` | alas de 1 px            | `#f5f0dc` | `#e6e9ff` | `#b37b00` (70 %)   |

- Boya `down`: anillo con `palette.buoy` y `globalAlpha = 0.25` (sin `rgba` literal).
- Contraste vs `water`: CLÁSICO mín. 3,95 (eel), NEÓN 4,46 (eel), RETRO 5,28 (ala). Todas ≥ 3:1.
- RETRO: anguila (100 % + zigzag núcleo) y luciérnaga (núcleo + alas 70 %) se distinguen por forma y luminancia, no por tono.
- Criterio: con cada skin la anguila y la luciérnaga se leen sobre el río y el cambio de skin en mitad de partida no reinicia ni altera el score.

## Plan de implementación

1. Crear la rama de trabajo y leer `node_modules/next/dist/docs/` si se toca algún componente cliente. Aplicar `/frontend-design` para el dibujo de anguila, luciérnaga y boyas sumergidas.
2. Añadir a `lib/games/ranaria/constants.ts` `DIVE_CYCLE`, los tramos de inmersión, `EEL_SPEED`, `FIREFLY_CYCLE`, `FIREFLY_POINTS`, `MAX_LIVES`, `EXTRA_LIFE_EVERY`, `timeForLevel`, `roundBonus` y el nuevo `speedFactor`; quitar la tabla de carriles de la 01 de este archivo.
3. Crear `lib/games/ranaria/levels.ts` con `LevelDef` y los 5 `LEVELS` de la tabla.
4. Ampliar `lib/games/ranaria/entities.ts` con `diving`, `DiveState`, `Eel`, `Firefly`, `diveState`, `drawEel` y `drawFirefly`, y el dibujo de boyas en `warning` y `down`.
5. Cambiar `engine.ts`: carga de trazado por nivel, reloj de inmersión, caída por boya sumergida, anguila, luciérnaga, tiempo por nivel, vidas extra y bonus de ronda. Verificar: el nivel 1 se juega igual que en la 01 salvo el tiempo y la luciérnaga.
6. Revisar que `restart()` vuelve a nivel 1, 3 vidas, 30 s, trazado 1, anguila inactiva y luciérnaga a 0.
7. Actualizar la tabla de controles del overlay de `ready` solo si cambia algún texto; las teclas no cambian.
8. Crear la migración `0006_ranaria_niveles.sql` (renumerar si está tomada), aplicarla con MCP `apply_migration` y revisar `get_advisors` de seguridad.
9. Actualizar la ficha de `ranaria` en `references/implemented-games.md` y la línea de specs en `CLAUDE.md`.
10. Pasar `npm run lint` y `npm run build`; corregir errores y warnings.

## Criterios de aceptación

**Build y consola**

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/juegos/ranaria/jugar` no muestra errores ni warnings en consola durante 5 niveles.

**Inicio**

- [ ] Al entrar se ve el overlay de la 01 y el trazado 1 quieto.
- [ ] Pulsar `Espacio` empieza en nivel `01` con 3 vidas y la barra de 30 s.

**Mecánicas**

- [ ] El nivel 1 tiene los mismos carriles, direcciones y velocidades que la tabla de la 01.
- [ ] Al completar cada ronda, el HUD sube de nivel y los carriles cambian al trazado siguiente de la tabla.
- [ ] El nivel 6 usa el trazado 1 con velocidades 1,15 veces las del nivel 1.
- [ ] `speedFactor(1)`, `speedFactor(6)`, `speedFactor(21)` y `speedFactor(40)` devuelven `1`, `1.15`, `1.6` y `1.6`.
- [ ] `timeForLevel(1)`, `timeForLevel(3)`, `timeForLevel(6)` y `timeForLevel(12)` devuelven `30`, `26`, `20` y `20`.
- [ ] En el nivel 1 ninguna boya se sumerge.
- [ ] En el nivel 2, una cadena de cada carril de boyas parpadea y luego se hunde durante 0,8 s, y vuelve a salir.
- [ ] Estar sobre una cadena mientras parpadea no resta vida; estar encima cuando se hunde sí.
- [ ] La anguila no aparece en los niveles 1 y 2 y aparece en la mediana desde el nivel 3.
- [ ] La anguila rebota en los dos bordes de la mediana y tocarla resta una vida.
- [ ] La luciérnaga aparece en un nenúfar libre durante 4 s cada 10 s.
- [ ] Llegar al nenúfar de la luciérnaga con 20,4 s restantes suma `50 + 200 + 200` puntos.
- [ ] Llenar los 5 nenúfares en nivel 1 suma 500 de bonus; en nivel 3, 700.
- [ ] Superar los 5000 puntos con 3 vidas pasa el HUD a 4 vidas.
- [ ] Con 5 vidas, superar un múltiplo de 5000 no suma vida y el HUD sigue en 5.

**HUD y visual**

- [ ] El HUD React muestra Puntuación, Vidas y Nivel coherentes con la partida, con Vidas hasta 5.
- [ ] Las boyas en aviso parpadean y las hundidas se ven como anillos tenues.
- [ ] Anguila y luciérnaga usan los colores de Convenciones y tienen glow.
- [ ] La barra de tiempo empieza llena con el total del nivel actual.
- [ ] El canvas no carga ninguna imagen ni audio (pestaña Network).

**Pausa**

- [ ] En pausa se congelan carriles, inmersión de boyas, anguila, luciérnaga y tiempo.
- [ ] Al reanudar, una boya que estaba en aviso sigue en aviso con el mismo tiempo restante.
- [ ] Cambiar de pestaña pausa la partida y al volver sigue en pausa.

**Fin de partida y guardado**

- [ ] Al perder la última vida se abre el modal con la puntuación real.
- [ ] GUARDAR PUNTUACIÓN añade a `scores` una fila con `game_id = 'ranaria'` y la puntuación mostrada.
- [ ] JUGAR DE NUEVO empieza en nivel `01`, 3 vidas, 0 puntos, trazado 1, sin anguila y con 30 s.
- [ ] Ninguna tecla con el modal abierto reinicia la partida.

**Ranking**

- [ ] La ficha de `ranaria` muestra el texto de `long` de la migración `0006`.
- [ ] `select ranked, controls from games where id = 'ranaria'` sigue devolviendo `true` y `TECLADO`.
- [ ] `get_advisors` de seguridad no reporta `ERROR`.

**Ciclo de vida**

- [ ] Tras SALIR, flechas y `Espacio` desplazan otra página con normalidad.
- [ ] Entrar y salir 5 veces de la ruta no acelera carriles, anguila ni ciclo de boyas.

**Regresiones**

- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y `/juegos/bloque-buster/jugar` conservan sus mecánicas.
- [ ] `/juegos/gloton/jugar` conserva la simulación y el modal muestra `SIMULACIÓN: NO PUNTÚA`.
- [ ] `git status` no muestra cambios en `references/`.

**Limpieza**

- [ ] `select count(*) from scores where name like 'TEST\_%'` devuelve `0`.

## Decisiones

- **Sí:** definida por game-jam de forma autónoma a partir del tema «RANARIA: cruza carriles de tráfico y troncos por rejilla hasta los nenúfares contra reloj; puntos por avance, nenúfar y tiempo sobrante». Revisar antes de aprobar.
- **Sí:** 5 trazados en ciclo con aceleración por vuelta. Cada nivel se siente distinto y el Nivel del HUD vuelve a tener sentido.
- **No:** niveles infinitos generados al azar. Rompen la comparabilidad del ranking y pueden generar carriles imposibles.
- **Sí:** el trazado 1 es exactamente el nivel 1 de la 01. Las marcas de la 01 en nivel 1 siguen siendo comparables.
- **Sí:** sustituir el 10 % por nivel de la 01 por 15 % por vuelta hasta 1,6×. La dificultad ya sube con cada trazado; acelerar además cada nivel haría el trazado 5 injugable en la primera vuelta.
- **Sí:** solo una cadena por carril de boyas se hunde. Siempre hay una ruta de cruce y el riesgo se lee con el parpadeo.
- **Sí:** aviso de 0,6 s antes de hundirse. Da tiempo a reaccionar (6 saltos) sin quitar tensión.
- **Sí:** anguila en la mediana desde el nivel 3. La mediana deja de ser un descanso garantizado cuando el jugador ya domina lo básico.
- **No:** amenazas dentro de los nenúfares. Castigan el último salto sin aviso legible y se parecen demasiado a soluciones comerciales del género.
- **Sí:** luciérnaga de 200 puntos. Incentiva elegir nenúfar y arriesgar tiempo, y reduce empates en el ranking.
- **Sí:** tiempo por rana de 30 a 20 s. Endurece el contra reloj del tema y limita el bonus de tiempo en niveles altos.
- **Sí:** vida extra cada 5000 puntos con tope de 5. Premia rondas largas sin hacer la partida eterna; `PlayerShell` ya muestra cualquier número de vidas.
- **Sí:** bonus de ronda `500 + 100 × (nivel − 1)`. Premia llegar lejos más que repetir rondas fáciles.
- **Sí:** recolocar carriles al cambiar de nivel. El contenido del carril cambia y conservar el `offset` no tiene sentido.
- **Sí:** `PlayerShell` sin cambios. Puntuación, vidas y nivel siguen bastando.
- **Sí:** actualizar `long` por migración. La ficha debe describir los niveles, las amenazas y los bonus que ya existen.
- **Sí:** sin sonido. Audio y su control de volumen merecen spec propia.

## Riesgos

| Riesgo                                                             | Mitigación                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Las marcas guardadas con la 01 no son comparables con las de la 02 | Riesgo aceptado: la jam se implementa seguida; si la 01 llega a producción sola, limpiar sus marcas de prueba. |
| Un trazado resulta imposible de cruzar                             | Hueco mínimo de 133 px y como mucho una cadena hundida por carril; probar los 5 trazados a 1,6×.               |
| La rana cae por una boya hundida sin entender por qué              | Parpadeo de 0,6 s y anillo visible en `down`.                                                                  |
| La anguila bloquea la mediana justo donde aterriza la rana         | Se mueve a 60 px/s y es visible desde el inicio del nivel; riesgo de diseño aceptado.                          |
| La luciérnaga desaparece en el mismo frame en que la rana aterriza | El bonus se evalúa al aterrizar, antes de avanzar el ciclo; riesgo de borde aceptado.                          |
| Número de migración `0006` ocupado al implementar                  | Renumerar al siguiente libre; el contenido no cambia.                                                          |
| `shadowBlur` extra en anguila y luciérnaga                         | Son 2 entidades; el total con glow sigue por debajo de 15.                                                     |
| Partidas muy largas a 1,6× con vidas extra                         | El tiempo de 20 s y el tope de 5 vidas acotan el ritmo; riesgo aceptado.                                       |

## Lo que **no** entra en esta spec

- Controles táctiles, popups, salpicaduras y destellos (SPEC JAM `ranaria` 03).
- Editor o selector de niveles.
- Tipos nuevos de vehículo o plataforma.
- Amenazas dentro de los nenúfares.
- Sonido.
- Antifraude o Auth real.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
