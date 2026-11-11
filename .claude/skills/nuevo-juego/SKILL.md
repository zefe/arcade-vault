---
name: nuevo-juego
description: Especialización de /spec para juegos (lee y aplica .claude/skills/spec antes de escribir). Diseña la spec de un juego real con leaderboard para Arcade Vault, siguiendo el patrón de SPEC 04 (motor ROCAS) y SPEC 05 (tablas games/scores). Parte de una referencia de references/started-games/ o de una descripción desde cero. Pregunta antes de escribir y guarda specs/NN-juego-<id>.md en Borrador para implementarla con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de referencia | id de catálogo | descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /nuevo-juego — Spec de un juego real con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Referencias disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay referencias"`

Motores reales ya implementados (`lib/games/<id>/`):
!`ls lib/games/ 2>/dev/null || echo "Ninguno"`

Migraciones:
!`ls supabase/migrations/ 2>/dev/null || echo "Ninguna"`

Selección de player actual:
!`cat "app/juegos/[id]/jugar/page.tsx" 2>/dev/null || echo "No existe la página de jugar"`

---

Este skill **no escribe código**. Produce una spec que integra un juego real en la plataforma: motor TypeScript en canvas, componente sobre `PlayerShell`, HUD React, pausa, modal FIN DEL JUEGO y guardado en `scores` con `ranked = true`. La implementación se hace después con `/spec-impl`.

Archivos de apoyo en este directorio:

- `patron-juego-real.md`: receta técnica con rutas reales del código. **Léelo siempre.**
- `template.md`: plantilla de la spec, con los bloques comunes ya escritos.

Responde en el idioma del prompt. La spec se escribe en español, como las existentes.

## Referencia obligatoria: el skill `/spec`

Este skill es una especialización de `/spec` para juegos. **Antes de hacer nada más**, lee completos:

- `.claude/skills/spec/SKILL.md`: método de diseño de specs (fases, cómo preguntar, cuándo parar, modo de escritura, guardado, reglas).
- `.claude/skills/spec/template.md`: forma de cada sección y reglas globales del documento.

Aplica ese método en todas las fases. Prioridad cuando choquen:

1. Lo específico de este skill manda: nombre `specs/NN-juego-<id>.md`, plantilla `template.md` de este directorio, preguntas de juego de Fase 2, receta de `patron-juego-real.md`.
2. Para todo lo demás, sigue `/spec`: preguntas en bloques de 3–5 con recomendación, criterio de parada (3 preguntas), escritura completa o por secciones, objetivo en una sola frase, división si la feature es demasiado grande, sin TODOs, nombres concretos, criterios booleanos, sección de decisiones obligatoria, estado `Borrador`, creación de `specs/.spec-config.yml` si no existe, confirmación final y "para aquí".
3. Si `/spec` no se puede leer, díselo al usuario y para: no escribas la spec sin esa referencia.

## Fase 1 — Contexto

0. Lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` (sección anterior).
1. Lee `CLAUDE.md`, `specs/04-juego-rocas.md`, `specs/05-leaderboard-y-tabla-juegos.md` y `patron-juego-real.md`.
2. Si hay specs posteriores a la 05 sobre juegos, léelas también: pueden haber cambiado el patrón (por ejemplo, un registro de players ya creado).
3. Lee el seed de `supabase/migrations/0001_games_scores.sql` y las migraciones posteriores para conocer el catálogo actual (`id`, `cover`, `color`, `sort_order`, `ranked`).
4. Interpreta `$ARGUMENTS`:
   - **Carpeta de referencia** (`03-tetris`, `tetris`, `arkanoid`…): localízala en `references/started-games/`. Lee `README.md`, `CLAUDE.md`, `game.js` completo y extras (`levels.js`, `style.css`, `assets/`). Haz inventario: globals, loop y `requestAnimationFrame`, listeners, estados, constantes de balance, física dependiente del frame, HUD y game over dibujados en canvas, reinicio por tecla, assets y sonido.
   - **Id del catálogo** (`caida`, `bloque-buster`…): busca la fila en el seed y comprueba si alguna referencia encaja.
   - **Descripción libre**: es un juego sin referencia. Pide las mecánicas concretas en Fase 2. Debe ser un diseño original o de género: no la recreación de un juego comercial concreto (nombre, personajes, niveles o aspecto).
   - **Vacío**: lista las referencias y los juegos del catálogo con `ranked = false`, y pregunta cuál.
5. Mapea el juego al catálogo. Equivalencias probables de las referencias: `02-asteroids` → `rocas`, `03-tetris` → `caida`, `04-arkanoid` → `bloque-buster`. Confírmalo en Fase 2.
6. **Para si el juego ya está implementado**: si existe `lib/games/<id>/` o su fila ya tiene `ranked = true`, díselo al usuario y no sigas.
7. Cuenta los juegos reales que hay en la página de jugar. Si solo está `rocas` y aún no hay registro, esta spec debe crear el registro (ver `patron-juego-real.md`, sección Registro).

## Fase 2 — Preguntas

Pregunta en bloques de 3 a 5 con `AskUserQuestion`, con 2–4 opciones y tu recomendación primero. No asumas lo que no esté confirmado. Categorías obligatorias:

- **Catálogo**: ¿fila existente o nueva? Si es nueva: `id`, `title`, `cat`, `color`, `cover` (clase CSS nueva en `globals.css`) y `sort_order`. En todos los casos: `long` fiel a lo que de verdad existe y `controls` (`TECLADO` si no hay táctil).
- **HUD**: `PlayerShell` muestra `score`, `lives` y `level`. Si el juego no tiene alguno (Tetris tiene líneas y no vidas), ¿se amplía `PlayerShell` con etiquetas o campos opcionales sin romper ROCAS ni la simulación, o se mapea a los existentes?
- **Fases y teclas**: tabla tecla / acción / fases; tecla de inicio en `ready`; `P` y `Esc` para pausar; quitar el reinicio por tecla en `gameover`.
- **Mecánicas**: qué se conserva tal cual y qué queda fuera. Por defecto, sin cambios de balance. Toda física dependiente del frame se normaliza por `dt`, idéntica al original a 60 Hz.
- **Visual**: mundo lógico (tamaño del canvas original) y relación de aspecto de la CRT; paleta neón de la plataforma o sprites de la referencia.
- **Assets y sonido**: si la referencia trae sprites o audio, ¿se copian a `public/games/<id>/`? Sonido fuera por defecto.
- **Táctil**: por defecto, aviso `REQUIERE TECLADO` sin bloquear el juego.
- **Registro**: si toca crearlo, confirma nombre y forma (por defecto `components/game-players.ts`, mapa `id → componente`, con `rocas` migrado).

Si una respuesta abre un frente grande (multijugador, controles táctiles, sonido completo, antifraude), propón dejarlo para otra spec.

Para cuando puedas responder sin suponer:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que está terminado?

## Fase 3 — Escribir la spec

Antes de escribir, relee las Fases 3 y 4 de `.claude/skills/spec/SKILL.md` y las reglas globales de `.claude/skills/spec/template.md`. La spec debe cumplir ambas además de esta plantilla.

Usa `template.md`. Sustituye todos los `<...>`, elimina los bloques condicionales que no apliquen (`[si ...]`) y adapta los pasos, criterios, decisiones y riesgos al juego concreto. Los valores de balance van con sus números reales, sacados de la referencia.

Si Fase 2 quedó completa, escribe la spec entera de una vez y pasa a Fase 4, sin pedir confirmación por secciones. Solo si falta información, ve sección a sección.

Evita:

- Criterios no verificables ("que funcione bien").
- Pasos fuera del alcance.
- Nombres de archivo o estructuras que el usuario no confirmó.
- Copiar a ciegas criterios de ROCAS que no apliquen (power-up, mundo toroidal…).

## Fase 4 — Guardar

1. Número siguiente al más alto de `specs/`, con dos dígitos.
2. Archivo `specs/NN-juego-<id>.md`. Si ya existe, pregunta.
3. Cabecera: `**Estado:** Borrador`, `**Depende de:** SPEC 04, SPEC 05` (más las que apliquen, comprobando que existen) y la fecha del contexto.
4. Si no existe `specs/.spec-config.yml`, créalo con el contenido por defecto de la Fase 4 de `/spec`. Si existe, no lo toques.
5. Confirma al usuario:
   - Ruta de la spec.
   - Está en `Borrador`: revisarla y cambiarla a `Aprobado`.
   - Si creaste `specs/.spec-config.yml`, menciónalo (`AutoCreateBranch: true` por defecto).
   - Siguiente paso: `/spec-impl NN-juego-<id>`.
   - **Para aquí.** No propongas implementar.

## Reglas

- Nunca escribas código ni migraciones: solo el `.md` de la spec.
- Nunca modifiques `references/`.
- `ranked = true` solo para juegos con motor real y solo por migración.
- Nunca uses claves `service_role` o secretas en la spec.
- Si el usuario quiere saltarse las preguntas, avisa del coste. Si insiste, anótalo en Decisiones ("Definición rápida sin aclaración detallada").
