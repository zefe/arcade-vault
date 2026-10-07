# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Aprovado
> **Depende de:** —
> **Fecha:** 2026-10-07
> **Objetivo:** Portar a Next.js App Router las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor, auth, salón) con datos mock y sin juegos reales.

## Por qué existe esta spec

El template es un prototipo React UMD + Babel con router por hash en una sola página.
Hay que llevarlo a la estructura real del proyecto (Next 16, TS strict, rutas App Router) sin cambiar el aspecto.
Los estilos del template ya están portados en `app/globals.css`; esta spec solo cubre markup, rutas y estado mock.

## Alcance

**Dentro:**

- Rutas App Router: `/` (biblioteca), `/juegos/[id]` (detalle), `/juegos/[id]/jugar` (reproductor), `/auth`, `/salon`.
- Nav (desktop + panel móvil con hamburguesa) y footer compartidos en `app/layout.tsx`.
- Biblioteca: hero, buscador por nombre, chips de categoría, grid de tarjetas con efecto tilt, estado "NO HAY RESULTADOS".
- Detalle: portada, tags, descripción, stat-strip, botones JUGAR AHORA / VOLVER AL VAULT, leaderboard mock de 10 filas.
- Reproductor: HUD, arena CRT decorativa, score simulado que sube solo, PAUSA/REANUDAR, FIN, SALIR, modal FIN DEL JUEGO con guardar puntuación, JUGAR DE NUEVO, VOLVER AL VAULT.
- Auth: tabs INICIAR SESIÓN / CREAR CUENTA, campo email solo en crear cuenta, JUGAR COMO INVITADO, botones sociales decorativos.
- Salón de la Fama: tabs por juego, podio top 3, tabla de 12 filas, fila "TU MEJOR MARCA" falsa si hay usuario.
- Usuario mock en localStorage (`av_user`) compartido vía context cliente.
- Guardado de puntuación mock en localStorage (`av_scores`).
- Página 404 estilo arcade para ids de juego inexistentes y rutas desconocidas.

**Fuera de alcance (specs futuras):**

- Implementación de cualquier juego real.
- Backend, base de datos o autenticación real (Google/GitHub incluidos).
- Mostrar puntuaciones de `av_scores` en Salón o leaderboard de detalle.
- Contador de créditos funcional (queda fijo en `CRÉDITOS · 03`).
- Menú de cuenta desplegable (el botón con el nombre solo cierra sesión, como el template).
- Migrar las clases CSS a utilidades Tailwind.
- Tests automatizados.

## Modelo de datos

Todo en `lib/games.ts`, portado de `references/templates/data.jsx` con los mismos valores.

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug, ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // clase CSS, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;       // ej. "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"

export const GAMES: Game[];                       // los 8 juegos del template
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, mismo algoritmo
```

Usuario y puntuaciones mock en `lib/user-context.tsx`:

```ts
export type User = { name: string };              // name en mayúsculas, máx 10 chars
export type SavedScore = { game: string; score: number; name: string; at: number };

// localStorage keys
// "av_user"   → JSON User | ausente
// "av_scores" → JSON SavedScore[]
```

Convenciones:

- Seeds iguales al template: detalle `id.length * 17 + 3`, salón `id.length * 23 + 7`.
- Números formateados con `toLocaleString("es-ES")`.
- Todo acceso a localStorage va en `try/catch` y solo tras montar (sin leer en render del servidor).

## Plan de implementación

1. Crear `lib/games.ts` con tipos, `GAMES`, `CATS`, `getGame`, `seededScores`. Verificar: `npm run build` sin errores de tipos.
2. Crear `lib/user-context.tsx` (`"use client"`): `UserProvider`, hook `useUser()` → `{ user, login(u), logout(), saveScore(entry) }`, hidratando `av_user` en `useEffect`.
3. Crear `components/nav.tsx` (`"use client"`): logo enlaza a `/`, links Biblioteca/Salón con estado activo vía `usePathname` (Biblioteca activo también en `/juegos/*`), contador de créditos fijo, botón login/nombre, panel móvil. Crear `components/footer.tsx`.
4. Actualizar `app/layout.tsx`: envolver en `UserProvider`, montar `Nav`, `main.av-main` y `Footer`. Mantener fuentes y fondos actuales.
5. Biblioteca: `app/page.tsx` (server) renderiza `components/library.tsx` (`"use client"`, búsqueda + chips + grid) y `components/game-card.tsx` (tilt con ref). Tarjeta y botón JUGAR navegan a `/juegos/[id]`.
6. Detalle: `app/juegos/[id]/page.tsx` (server) con `generateStaticParams` desde `GAMES`, `params` como Promise, `notFound()` si no existe. Botones como `Link`.
7. Reproductor: `app/juegos/[id]/jugar/page.tsx` (server, `generateStaticParams`, `notFound()`) renderiza `components/game-player.tsx` (`"use client"`) con la simulación del template (intervalo 220 ms, subida de nivel, pausa, modal, guardar vía `saveScore`).
8. Auth: `app/auth/page.tsx` con `components/auth-form.tsx` (`"use client"`). Submit llama `login({ name })` y `router.push("/")`. Invitado llama `logout()` y va a `/`.
9. Salón: `app/salon/page.tsx` con `components/hall-of-fame.tsx` (`"use client"`, tabs, podio, tabla, fila del usuario).
10. Crear `app/not-found.tsx` con mensaje arcade y `Link` a `/`. Borrar contenido placeholder antiguo de `app/page.tsx`.
11. Pasar `npm run lint` y `npm run build`; corregir warnings.

Notas:

- Antes de cada pantalla, aplicar el skill `/frontend-design` (instrucción de `CLAUDE.md`) manteniendo fidelidad al template.
- Consultar `node_modules/next/dist/docs/` para `params`, `generateStaticParams`, `notFound` y `PageProps` en Next 16.
- Usar `next/link` para navegación declarativa y `useRouter` solo en handlers.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/` muestra hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] Escribir "ser" en el buscador deja solo SERPENTINA.
- [ ] Chip SHOOTER deja solo INVASORES y ROCAS.
- [ ] Búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Click en tarjeta de CAÍDA lleva a `/juegos/caida` con título, tags, stats y leaderboard de 10 filas.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 arcade.
- [ ] JUGAR AHORA lleva a `/juegos/[id]/jugar`; la puntuación del HUD sube sola.
- [ ] PAUSA congela la puntuación y muestra "EN PAUSA"; REANUDAR continúa.
- [ ] FIN abre el modal con la puntuación final; GUARDAR añade una entrada a `localStorage.av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] JUGAR DE NUEVO reinicia score a 0, vidas a 3 y nivel a 01.
- [ ] En `/auth`, tab CREAR CUENTA muestra el campo email; INICIAR SESIÓN lo oculta.
- [ ] Enviar el formulario con usuario "kai" redirige a `/` y el nav muestra "KAI ▾".
- [ ] Recargar la página mantiene el usuario logueado.
- [ ] Click en "KAI ▾" cierra sesión y el nav vuelve a "Iniciar Sesión".
- [ ] `/salon` muestra podio top 3 y tabla de 12 filas; cambiar de tab cambia los datos.
- [ ] Con usuario logueado, `/salon` muestra la fila "TU MEJOR MARCA EN …"; sin usuario no.
- [ ] Link activo del nav resaltado en `/`, `/juegos/*` (Biblioteca) y `/salon` (Salón).
- [ ] Bajo 768 px de ancho aparece la hamburguesa y el panel móvil abre y cierra.
- [ ] No hay errores de hidratación en consola en ninguna ruta.
- [ ] Comparación visual lado a lado con `references/templates/Arcade Vault.html`: misma estructura y estilos en las 5 pantallas.

## Decisiones

- **Sí:** rutas reales App Router. URLs compartibles y SSG con `generateStaticParams`.
- **No:** router por hash del template. Ignora Next y rompe historial/SEO.
- **Sí:** simulación demo en el reproductor. Permite ver HUD, pausa y modal sin juego real.
- **No:** reproductor estático. Dejaría sin validar el flujo de fin de partida.
- **Sí:** usuario y puntuaciones mock en localStorage (`av_user`, `av_scores`). Mismas keys que el template, cero backend.
- **No:** auth real. Va en spec propia.
- **Sí:** reusar clases ya portadas en `app/globals.css`. Fidelidad 1:1, menos riesgo.
- **No:** migrar a utilidades Tailwind. Mucho trabajo sin cambio visual.
- **Sí:** datos en `lib/games.ts`, componentes en `components/`.
- **No:** separar `data/` y `types/`. Innecesario para 8 juegos.
- **Sí:** rankings solo mock con `seededScores`. Integrar `av_scores` va en otra spec.
- **Sí:** `notFound()` + `app/not-found.tsx` para ids inválidos.
- **No:** redirect silencioso a `/`. Oculta errores de enlace.
- **Sí:** `UserProvider` cliente en layout. Nav reacciona al login sin recargar.
- **No:** leer localStorage por pantalla. Nav quedaría desincronizado.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Mismatch de hidratación al leer `av_user` | Leer localStorage solo en `useEffect`; primer render siempre como invitado. |
| localStorage bloqueado (modo privado) | `try/catch` en lectura/escritura; app funciona sin persistir. |
| APIs de Next 16 distintas (`params` Promise, `PageProps`) | Consultar `node_modules/next/dist/docs/` antes de escribir rutas. |
| `toLocaleString("es-ES")` distinto entre servidor y cliente | Formatear dentro de componentes cliente o con locale fijo; verificar consola sin warnings. |
| Clases de `globals.css` divergentes del template | Diff de `globals.css` vs `references/templates/styles.css` antes de empezar. |

## Lo que **no** entra en esta spec

- Juegos reales.
- Backend, BD o auth real (incluye Google/GitHub).
- Puntuaciones guardadas visibles en rankings.
- Créditos funcionales.
- Menú de cuenta.
- Migración a Tailwind.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
