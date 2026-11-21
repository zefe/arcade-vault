---
name: spec-impl-game
description: Implementa una spec de juego Aprobada con el mismo flujo que /spec-impl (lee y aplica .claude/skills/spec-impl) y, al terminar el último paso, lanza en secuencia (no en paralelo) los agentes skin-designer y mobile-porter sobre el juego implementado.
disable-model-invocation: true
argument-hint: "<NN-spec-name | specs/game-jam/<id>/NN-...>"
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npx tsc:*), Bash(npm run lint:*)
---

# /spec-impl-game — /spec-impl + skin-designer + mobile-porter

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Specs de game jam:
!`ls specs/game-jam/*/ 2>/dev/null || echo "No hay specs de game jam"`

Configuración de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instrucciones

### Fases 1–4 — Igual que /spec-impl

1. Lee `.claude/skills/spec-impl/SKILL.md` completo **antes de hacer nada más**.
2. Sigue sus **Fases 1–4 al pie de la letra** usando como argumento `$ARGUMENTS` y el contexto de sesión de arriba (sustituye al de aquel archivo, cuyos comandos `!` no se ejecutan al leerlo). Mismas reglas: solo specs Aprobadas, rama `spec-NN-slug`, resumen de la spec, confirmación antes del Paso 1, pausa tras cada paso, ambigüedades → opciones y esperar, nada fuera de alcance, **nunca commit**.
3. Ampliación de la Fase 1: la spec también puede estar en `specs/game-jam/<game-id>/` (p. ej. `specs/game-jam/abismo/01-juego-abismo.md`). Para la rama usa el nombre del archivo: `spec-game-jam-<game-id>-NN-slug`.
4. **Única diferencia:** al terminar el último paso **no** muestres el mensaje final de /spec-impl; pasa a la Fase 5.

---

### Fase 5 — Post-implementación: skin-designer → mobile-porter

Los agentes se lanzan **uno después del otro, nunca en paralelo**.

1. **Identificar el juego.** Deduce el `game-id` de la spec (id de la fila `games`, carpeta `lib/games/<id>/`, entrada en `components/game-players.ts`). Si la spec no crea ni modifica un juego real, avísalo y pregunta con AskUserQuestion si lanzar igualmente los agentes; si no, salta al paso 6.
2. **Comprobar que compila.** Ejecuta `npx tsc --noEmit` y `npm run lint`. Si fallan, corrige (dentro del alcance de la spec) antes de seguir.
3. **skin-designer.** Lanza `Agent` con `subagent_type: "skin-designer"` y un prompt autocontenido con:
   - ruta de la spec, `game-id`, rama activa, salida de `git diff --stat`;
   - tarea: "Audita e implementa los 3 skins obligatorios (clasico, neon, retro) del juego `<id>` recién implementado siguiendo tu contrato. No toques Supabase, puntuación ni gameplay. No hagas commit. Termina con un reporte breve: archivos tocados y estado de contraste."

   **Espera a que termine** (notificación de fin) antes de seguir. No lances mobile-porter mientras skin-designer siga en marcha.

4. **Revisión intermedia.** Muestra al usuario un resumen breve del reporte de skin-designer + `git diff --stat`. Si el agente falló o `npx tsc --noEmit` / `npm run lint` quedan rotos, para y pregunta antes de seguir.
5. **mobile-porter.** Lanza `Agent` con `subagent_type: "mobile-porter"` y un prompt autocontenido con:
   - ruta de la spec, `game-id`, rama activa, resumen de lo que hizo skin-designer (incluidos los chips de skin en `.crt-bottom`);
   - tarea: "Audita y corrige la experiencia móvil de `/juegos/<id>/jugar` (y de cualquier pantalla que haya tocado la spec): contrato SPEC 09, vertical 360–414 px, horizontal, safe areas. Features grandes → spec nueva en Borrador, no las implementes. No toques Supabase, puntuación, gameplay ni skins. No hagas commit. Termina con tu reporte final (§8)."

   Espera a que termine.

6. **Reporte final** (conciso):
   - Resumen de la implementación (pasos del plan).
   - skin-designer: archivos tocados, contraste.
   - mobile-porter: tabla ✅/❌/👁, correcciones, specs creadas en Borrador, pendientes de verificación en dispositivo.
   - Cierre:

   ```
   ✅ Spec implementada + skins + móvil revisados.

   Siguiente paso: verifica los criterios de aceptación uno a uno.
   Si pasan, cambia el estado de la spec a "Implementado", actualiza CLAUDE.md
   y haz el commit final antes de mergear la rama.
   ```

## Reglas

- Nunca commit (ni tú ni los agentes), salvo petición explícita del usuario.
- Nunca lances los dos agentes a la vez.
- No relances un agente que ya terminó salvo que el usuario lo pida.
- Si la spec no está Aprobada, se para en la Fase 2 como /spec-impl: no se lanza ningún agente.
