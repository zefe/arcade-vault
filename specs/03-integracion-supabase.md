# SPEC 03 — Integración base de Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-30
> **Objetivo:** Conectar la app Next.js al proyecto Supabase `qkbdukluudjmeslfezke` con clientes tipados server/browser, variables de entorno y un endpoint `/api/health`, sin cambiar UI ni flujos existentes.

## Por qué existe esta spec

El proyecto ya tiene el MCP de Supabase configurado (`.mcp.json`) pero la app no tiene SDK, clientes ni env vars.
Las siguientes specs (Auth real, tablas de puntuaciones, Realtime, Edge Functions) necesitan una base común.
Esta spec solo deja la tubería lista y verificable; no toca usuario mock ni puntuaciones.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` (dependencias) y `supabase` CLI (devDependency).
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (ignorado) y `.env.example` (commiteado).
- `lib/supabase/env.ts`: lectura y validación de env vars con error claro si faltan.
- `lib/supabase/client.ts`: cliente browser (`createBrowserClient`) tipado.
- `lib/supabase/server.ts`: cliente server (`createServerClient` + `cookies()` de `next/headers`) tipado.
- `lib/supabase/database.types.ts`: tipos generados del esquema (vacío por ahora).
- Script `npm run db:types` para regenerar tipos.
- Carpeta `supabase/migrations/` vacía con `.gitkeep`, convención para migraciones futuras.
- Route handler `app/api/health/route.ts`.

**Fuera de alcance (specs futuras):**

- Supabase Auth real y reemplazo de `av_user` (spec de auth).
- `proxy.ts` de refresco de sesión y rutas protegidas (spec de auth).
- Tablas, RLS y migraciones reales (`profiles`, `scores`…).
- Reemplazo de `av_scores` y leaderboards reales.
- Realtime.
- Edge Functions.
- Supabase CLI local con Docker (`supabase start`).
- Cambios visuales o de flujo en cualquier pantalla.
- Tests automatizados.

## Modelo de datos

Esta feature no introduce tablas ni estructuras de dominio. La BD remota sigue sin tablas en `public`.

Variables de entorno:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://qkbdukluudjmeslfezke.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Tipos y clientes:

```ts
// lib/supabase/database.types.ts — generado, no editar a mano
export type Database = {
  public: {
    Tables: {};
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// lib/supabase/env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string }; // lanza Error si falta alguna

// lib/supabase/client.ts  ("use client" no requerido; solo se importa desde componentes cliente)
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts  (solo server: Server Components, Route Handlers, Server Actions)
export async function createClient(): Promise<SupabaseClient<Database>>;
```

Respuesta de `/api/health`:

```ts
type HealthOk = { ok: true }; // 200
type HealthFail = { ok: false; error: string }; // 503, mensaje corto sin claves
```

Convenciones:

- Migraciones futuras en `supabase/migrations/NNNN_nombre.sql`, aplicadas al remoto y commiteadas.
- Nunca usar `service_role` / secret key en código cliente ni con prefijo `NEXT_PUBLIC_`.
- `getSupabaseEnv()` lee `process.env.NEXT_PUBLIC_*` con acceso literal (sin indexado dinámico) para que Next los inyecte en el bundle cliente.

## Plan de implementación

1. Instalar dependencias: `npm i @supabase/supabase-js @supabase/ssr` y `npm i -D supabase`. Verificar: `npm run build` ok.
2. Env vars:
   - Obtener URL y publishable key con MCP (`get_project_url`, `get_publishable_keys`).
   - Crear `.env.local` con valores reales.
   - Crear `.env.example` con placeholders.
   - Añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignoraría).
   - Verificar: `git status` muestra `.env.example` y no `.env.local`.
3. Crear `lib/supabase/env.ts` con `getSupabaseEnv()`; mensaje de error: `Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local`.
4. Generar tipos con MCP `generate_typescript_types` → `lib/supabase/database.types.ts`. Añadir script `"db:types": "supabase gen types typescript --project-id qkbdukluudjmeslfezke --schema public > lib/supabase/database.types.ts"`.
5. Crear `lib/supabase/client.ts` (`createBrowserClient<Database>`) y `lib/supabase/server.ts` (`createServerClient<Database>` con `await cookies()`, `getAll`/`setAll` y `try/catch` en `setAll` para Server Components). Consultar `node_modules/next/dist/docs/` para `cookies()` en Next 16.
6. Crear `supabase/migrations/.gitkeep`.
7. Crear `app/api/health/route.ts` (`GET`, dinámico):
   - Crear cliente server y llamar `supabase.auth.getClaims()` (valida cliente y cookies; sin sesión devuelve `null`).
   - Comprobar conectividad real con `fetch(`${url}/auth/v1/health`, { headers: { apikey } })`, porque `getClaims()` sin sesión no hace petición de red.
   - OK → 200 `{ ok: true }`. Env ausente, error de red o status ≠ 2xx → 503 `{ ok: false, error }`.
   - Consultar `node_modules/next/dist/docs/` (`route.md`) antes de escribirlo.
8. Actualizar `CLAUDE.md` sección Stack notes: línea sobre `lib/supabase/`, env vars y `npm run db:types`.
9. Pasar `npm run lint` y `npm run build`; corregir warnings.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`.
- [ ] `.env.example` está commiteado con las 2 variables; `.env.local` no aparece en `git status`.
- [ ] Con `.env.local` correcto, `curl -i localhost:3000/api/health` devuelve `200` y `{"ok":true}`.
- [ ] Sin `.env.local` (renombrado), `/api/health` devuelve `503` con `ok:false` y el error menciona las variables faltantes.
- [ ] Con URL inválida en `.env.local`, `/api/health` devuelve `503` con `ok:false`.
- [ ] Ninguna respuesta de `/api/health` contiene la publishable key.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` exportan `createClient` tipado con `Database`.
- [ ] `npm run db:types` (tras `npx supabase login`) regenera `lib/supabase/database.types.ts` sin diff.
- [ ] Existe `supabase/migrations/.gitkeep`.
- [ ] No existe `proxy.ts` ni `middleware.ts`.
- [ ] Login mock, guardado en `av_scores` y todas las pantallas de SPEC 01/02 funcionan igual que antes.
- [ ] `grep -rn "service_role\|sb_secret" app components lib` sin resultados.

## Decisiones

- **Sí:** solo integración base. Auth, BD, Realtime y Edge Functions van en specs propias.
- **No:** meter Auth + scores aquí. Spec demasiado grande y con cambios de UI.
- **Sí:** proyecto remoto + migraciones en `supabase/migrations/`. Versionado sin Docker.
- **No:** Supabase CLI local (`supabase start`). Requiere Docker; innecesario por ahora.
- **No:** cambios solo por MCP sin archivos. Esquema no reproducible.
- **Sí:** clientes en `lib/supabase/`. Sigue convención `lib/` existente.
- **No:** `utils/supabase/` de la guía oficial. Carpeta nueva sin necesidad.
- **Sí:** mock `av_user`/`av_scores` intacto. Cero regresiones en UI.
- **No:** `proxy.ts` ahora. Sin login real no hay sesión que refrescar; va en spec de auth.
- **Sí:** publishable key (`sb_publishable_…`). Formato actual de Supabase, rotable.
- **No:** anon key legacy JWT.
- **Sí:** `/api/health` con `getClaims()` + `GET /auth/v1/health`. Verificable con curl sin tablas.
- **No:** migración `health()` o tabla `profiles` ahora. Adelanta trabajo de otras specs.
- **Sí:** 503 `{ ok:false, error }` en fallo. Estándar para monitoreo.
- **Sí:** tipos generados + `npm run db:types` con CLI como devDependency. Clientes tipados desde el día 1.
- **No:** regenerar tipos solo vía MCP. Depende del agente.

## Riesgos

| Riesgo                                                        | Mitigación                                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.env*` en `.gitignore` ignora `.env.example`                 | Añadir `!.env.example`; verificar con `git status`.                                                 |
| `getClaims()` sin sesión no toca red y da falso positivo      | Health hace además `fetch` a `/auth/v1/health` con `apikey`.                                        |
| Fuga de clave secreta al bundle cliente                       | Solo publishable key con `NEXT_PUBLIC_`; grep de `service_role`/`sb_secret` en criterios.           |
| `cookies()` async y API distinta en Next 16                   | Consultar `node_modules/next/dist/docs/` antes del paso 5.                                          |
| `setAll` falla en Server Components (cookies de solo lectura) | `try/catch` en `setAll`; refresco real llegará con `proxy.ts` en spec de auth.                      |
| `npm run db:types` falla sin `supabase login`                 | Documentado en `CLAUDE.md`; tipos iniciales generados vía MCP.                                      |
| Build falla en CI/Vercel sin env vars                         | `getSupabaseEnv()` solo se llama en runtime (dentro de handlers/funciones), no al importar módulos. |

## Lo que **no** entra en esta spec

- Supabase Auth y `proxy.ts`.
- Tablas, RLS y migraciones reales.
- Puntuaciones y leaderboards reales.
- Realtime.
- Edge Functions.
- Supabase local con Docker.
- Cambios de UI.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
