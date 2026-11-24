# SPEC 11 — Registro, login y autenticación

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03, SPEC 05
> **Fecha:** 2026-11-23
> **Objetivo:** Sustituir el login simulado por Supabase Auth con email y contraseña, Google y GitHub, y un alias único por jugador.

## Por qué existe esta spec

`/auth` solo guarda un nombre en `localStorage` (`av_user`): no hay cuentas, contraseñas ni sesión.
Esta spec crea las cuentas reales. La asociación de puntuaciones a usuarios se separa en SPEC 12 (pendiente de escribir) para mantener los diffs revisables.

Estado de partida en Supabase (2026-11-23): email activo con confirmación obligatoria, Google y GitHub desactivados, 0 usuarios, 12 marcas anónimas.

## Alcance

**Dentro:**

- Registro con alias, email y contraseña, con confirmación de correo.
- Login con email y contraseña.
- Login con Google y GitHub.
- Pantalla `REVISA TU CORREO` y reenvío del correo de confirmación con espera de 60 s.
- Tabla `profiles` con alias único, trigger de alta y RPC `is_name_available`.
- Pantalla `/auth/alias` (`ELIGE TU ALIAS`) para quien tiene sesión sin perfil.
- `proxy.ts` que refresca la sesión.
- `UserProvider` alimentado desde el servidor y eliminación de `av_user`.
- Menú de usuario en nav (escritorio y móvil) con `CERRAR SESIÓN`.
- Vuelta a la página de origen tras entrar (`next` validado; por defecto `/juegos`).
- Configuración documentada de Supabase Auth, Google y GitHub para localhost y LAN.

**Fuera de alcance (specs futuras):**

- SPEC 12: `scores.user_id`, ranking por usuario, invitados que siguen guardando, protección de alias registrados en `scores` y `TU MEJOR MARCA`.
- Recuperar o cambiar contraseña.
- SMTP propio y URLs de producción (requisitos antes de desplegar).
- Página de perfil, editar alias, avatar, cambiar email y borrar cuenta.
- Vincular proveedores manualmente, MFA, passkeys y CAPTCHA.
- Proteger rutas: todo sigue siendo jugable como invitado.
- Moderación de alias.
- Tests automatizados.

## Modelo de datos

### Migración `supabase/migrations/0007_perfiles.sql`

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null unique check (
    name ~ '^[A-Z0-9_]{3,10}$'
    and name <> 'INVITADO'
  ),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, name) on public.profiles to authenticated;

create function public.is_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where name = p_name);
$$;

revoke all on function public.is_name_available(text) from public, anon, authenticated;
grant execute on function public.is_name_available(text) to anon, authenticated;

-- Alta por email: reserva el alias. OAuth no envía av_name y pasa por /auth/alias.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'av_name' then
    insert into public.profiles (id, name)
    values (new.id, new.raw_user_meta_data ->> 'av_name');
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- La clave es `av_name` y no `name`, porque Google y GitHub rellenan `name` por su cuenta.
- Un alias inválido u ocupado aborta el alta completa en `auth.users`.
- Nadie tiene `UPDATE` ni `DELETE` sobre `profiles`.

### Tipos TypeScript

```ts
// lib/auth/player.ts (server-only)
export type Session =
  | { status: "guest" }
  | { status: "needs-alias" } // sesión sin fila en profiles
  | { status: "player"; id: string; name: string };

export async function getSession(): Promise<Session>; // getClaims() + profiles

// lib/user-context.tsx
export type User = { name: string };
type UserContextValue = { user: User | null; needsAlias: boolean };

// lib/auth/validation.ts (compartido, sin dependencias de servidor)
export const PASSWORD_MIN = 8;
export const RESEND_WAIT_S = 60;
export function normalizeAlias(raw: string): string; // trim + mayúsculas
export function isValidAlias(alias: string): boolean;
export function safeNext(raw: string | null | undefined): string; // por defecto "/juegos"

// app/auth/actions.ts ("use server")
export type AuthField = "alias" | "email" | "password";
export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: AuthField }
  | { status: "check-email"; email: string }
  | { status: "unconfirmed"; email: string };
```

`safeNext` acepta solo rutas internas: empieza por `/`, no por `//`, sin `\` ni caracteres de control, y nunca `/auth` ni sus subrutas. Al resolverla contra el origen debe conservar ese origen.

### Server Actions

| Acción               | Comportamiento                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `signIn`             | `signInWithPassword`; éxito → `next`                                                        |
| `signUp`             | valida, `is_name_available`, `signUp` con `data: { av_name }`; éxito → estado `check-email` |
| `signInWithOAuth`    | solo `google` o `github`; redirige a la URL del proveedor                                   |
| `resendConfirmation` | `auth.resend({ type: "signup" })`                                                           |
| `chooseAlias`        | exige sesión sin perfil; inserta en `profiles`; éxito → `next`                              |
| `signOut`            | `signOut({ scope: "local" })`; redirige a `/`                                               |

Las acciones que cambian la sesión o el perfil llaman a `revalidatePath("/", "layout")` antes de redirigir.
El servidor valida siempre, aunque el formulario ya haya validado.

## Rutas y comportamiento

| Ruta             | Comportamiento                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/auth`          | Pestañas. `?modo=registro` abre CREAR CUENTA; `?next=` destino. Con `player` → `next`; con `needs-alias` → `/auth/alias` |
| `/auth/alias`    | `guest` → `/auth`; `player` → `next`                                                                                     |
| `/auth/callback` | Route Handler `GET`. Canjea `code`; sin perfil → `/auth/alias`; con perfil → `next`                                      |

- Callback con `flow=email` y canje fallido (otro navegador) → `/auth?aviso=correo`.
- Callback con `error` o canje OAuth fallido → `/auth?aviso=oauth`; enlace de correo con `error` → `/auth?aviso=enlace`.
- Los `aviso` son una lista cerrada: nunca se pinta texto de la URL.
- El origen de `redirectTo` y del callback sale del `Host` de la petición, para funcionar en localhost y LAN; la allowlist de Supabase limita los destinos.
- `getClaims()` valida la sesión; nunca se confía en `getSession()` de Supabase en servidor.
- Si Supabase falla al leer sesión o perfil, se registra el error y la UI queda como invitado; un error de lectura nunca se interpreta como `needs-alias`.

### Textos

| Caso                     | Texto                                        |
| ------------------------ | -------------------------------------------- |
| Credenciales incorrectas | `CORREO O CONTRASEÑA INCORRECTOS`            |
| Alias ocupado            | `ALIAS NO DISPONIBLE`                        |
| Alias inválido           | `ALIAS: 3–10 CARACTERES, A-Z, 0-9 Y _`       |
| Email inválido           | `CORREO NO VÁLIDO`                           |
| Contraseña corta         | `MÍNIMO 8 CARACTERES`                        |
| Correo sin confirmar     | `CONFIRMA TU CORREO PARA ENTRAR`             |
| Límite de peticiones     | `DEMASIADOS INTENTOS. ESPERA UN MOMENTO`     |
| Otro error               | `SEÑAL PERDIDA. INTÉNTALO DE NUEVO`          |
| Registro enviado         | `REVISA TU CORREO`                           |
| `aviso=correo`           | `SI YA CONFIRMASTE TU CORREO, INICIA SESIÓN` |
| `aviso=oauth`            | `NO SE PUDO COMPLETAR EL ACCESO`             |
| `aviso=enlace`           | `ENLACE CADUCADO O NO VÁLIDO`                |

- El alias `INVITADO` está reservado y se muestra como `ALIAS NO DISPONIBLE`.
- Registrar un correo ya existente muestra también `REVISA TU CORREO`, para no revelar cuentas.
- Durante el envío: botón desactivado con `CONECTANDO…` y sin doble envío.
- Los errores usan `role="alert"` y conservan alias y email, nunca la contraseña.
- `autoComplete`: `username` no se usa; `nickname`, `email`, `current-password` y `new-password`.

### Nav

- `guest`: `Iniciar Sesión` → `/auth?next=<ruta actual>`.
- `needs-alias`: `ELEGIR ALIAS` → `/auth/alias?next=<ruta actual>`.
- `player`: `<ALIAS> ▾` abre un menú con `CERRAR SESIÓN`; cierra con Escape, clic fuera o navegación.
- El panel móvil ofrece las mismas opciones.
- `/auth/alias` también ofrece `CERRAR SESIÓN`.

`PlayerShell` sigue rellenando el nombre del modal con `user?.name`, editable, o `INVITADO`. El guardado en `scores` no cambia hasta SPEC 12.

## Configuración externa (manual, la hace el usuario)

1. Supabase → URL Configuration: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:3000/auth/callback**` y `http://192.168.1.129:3000/auth/callback**`.
2. Supabase → Email: confirmación activada, contraseña mínima 8, plantilla por defecto.
3. Google Cloud: cliente OAuth web con callback `https://qkbdukluudjmeslfezke.supabase.co/auth/v1/callback`.
4. GitHub: OAuth App con el mismo callback.
5. Pegar ID y secreto de ambos en Supabase → Providers y activarlos. Los secretos nunca van al repo ni a `.env.local`.

No hay variables de entorno nuevas.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` las guías de proxy, Server Actions, cookies y redirect. Crear y aplicar `0007_perfiles.sql`, revisar advisors de seguridad y ejecutar `npm run db:types`.
2. Crear `lib/supabase/proxy.ts` y `proxy.ts` (refresco con `getClaims()`, cookies en petición y respuesta, matcher sin estáticos). Actualizar el comentario de `server.ts`.
3. Crear `lib/auth/validation.ts` y `lib/auth/player.ts`.
4. Crear `app/auth/callback/route.ts` y `app/auth/actions.ts`.
5. Reescribir `components/auth-form.tsx` y `app/auth/page.tsx` con `/frontend-design`: registro, login, OAuth, `REVISA TU CORREO`, reenvío y avisos.
6. Crear `app/auth/alias/page.tsx` y `components/alias-form.tsx`.
7. Alimentar `UserProvider` desde `app/layout.tsx`; quitar `login`, `logout` y `av_user` (borrar la clave al montar); actualizar `components/nav.tsx` con el menú.
8. Apuntar los CTA de Home (`CREAR CUENTA`, `EMPEZAR GRATIS`) a `/auth?modo=registro`.
9. Hacer la configuración externa y probar los flujos reales.
10. Ejecutar `npm run lint` y `npm run build`; actualizar `CLAUDE.md` y pasar esta spec a Implementado.

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] Los advisors de seguridad no muestran tablas nuevas sin RLS ni funciones nuevas con `search_path` mutable.
- [x] Registrarse con datos válidos muestra `REVISA TU CORREO` y crea una fila en `auth.users` y otra en `profiles`.
- [ ] Antes de confirmar, el login muestra `CONFIRMA TU CORREO PARA ENTRAR` y el botón de reenvío.
- [ ] El botón de reenvío queda desactivado 60 s tras usarse.
- [x] El enlace abierto en el mismo navegador deja la sesión iniciada y lleva a `next`.
- [ ] El enlace abierto en otro navegador lleva a `/auth` con aviso, y el login con contraseña funciona.
- [ ] Una contraseña errónea y un correo inexistente muestran el mismo mensaje.
- [ ] Registrar un correo ya existente con un alias libre muestra `REVISA TU CORREO`.
- [ ] Un alias ocupado muestra `ALIAS NO DISPONIBLE` y no crea usuario.
- [x] `AB`, `ABCDEFGHIJK`, `A B C` y `AÑO` se rechazan como alias inválido.
- [ ] El primer acceso con Google y con GitHub lleva a `/auth/alias`; el segundo va directo a `next`.
- [ ] Con sesión sin perfil, nav muestra `ELEGIR ALIAS` y los juegos funcionan como invitado.
- [ ] Cancelar en Google o GitHub vuelve a `/auth` con un aviso.
- [x] `next=https://evil.test`, `next=//evil.test` y `next=/\evil.test` acaban en `/juegos`.
- [ ] `/juegos/rocas` → Iniciar Sesión → login termina en `/juegos/rocas`.
- [ ] La sesión sobrevive a recargar y cerrar el navegador, sin parpadeo de invitado ni error de hidratación.
- [ ] `CERRAR SESIÓN` funciona en escritorio y móvil, y nav pasa a `Iniciar Sesión` sin recargar.
- [x] Un usuario no puede leer ni insertar el perfil de otro, ni actualizar el suyo, con la clave publicable.
- [ ] Un invitado puede jugar y guardar puntuación igual que antes.
- [x] `grep -rn "av_user" app components lib` solo devuelve el borrado de la clave.
- [ ] Login y registro se usan con teclado y en 375×667 sin scroll horizontal.
- [x] No hay claves `service_role` ni secretos OAuth en el repo.

### Verificación al cerrar (2026-11-23)

Cerrada por decisión del usuario con criterios sin marcar. Marcado = comprobado con build, BD, log o prueba directa; `next` y alias inválidos se probaron en `safeNext` e `isValidAlias`, y los permisos de `profiles` en una transacción revertida.

Sin marcar:

- **No probado, falta un segundo correo del equipo:** login sin confirmar y enlace en otro navegador (el aviso sí, con un código falso).
- **Parcial, según la BD:** Google y GitHub solo tienen el primer acceso, con alias guardado; falta el segundo. Alias ocupado: lo rechaza la BD, falta verlo en el formulario. Cancelar en el proveedor: solo simulado contra el callback.
- **Sin evidencia independiente:** el usuario indicó que las pruebas pasaban, sin detalle por criterio. Incluye reenvío, mensajes de login, correo existente, vuelta a `/juegos/rocas`, `ELEGIR ALIAS` y juego sin perfil, persistencia e hidratación, menú y cierre de sesión en nav, invitado, teclado y 375×667.

## Decisiones tomadas y descartadas

- **Dos specs.** Auth aquí y puntuaciones en SPEC 12. Descartado: una sola spec, demasiado grande.
- **Email, Google y GitHub.** Descartado: solo email.
- **Login con email.** Descartado: alias + contraseña, que obliga a exponer correos o usar clave secreta.
- **Confirmación de correo obligatoria.** Descartado: entrada directa.
- **SMTP por defecto.** Solo para desarrollo. Descartado por ahora: Resend.
- **Enlace por `/auth/callback`.** Plantilla por defecto y ruta común con OAuth. Descartado: `token_hash`, que exige editar la plantilla.
- **Server Actions.** Cookies y validación en servidor, y PKCE funciona por http en LAN. Descartado: cliente de navegador.
- **Tabla `profiles` con alias único.** Descartado: `user_metadata`, editable y repetible.
- **Alias `^[A-Z0-9_]{3,10}$`.** Evita alias visualmente idénticos y cabe en `scores.name`.
- **Alias en el registro por email, `/auth/alias` en OAuth.** Descartado: alias generado.
- **RPC para comprobar; índice único para garantizar.** Un error del trigger por carrera se vuelve a comprobar y se traduce a `ALIAS NO DISPONIBLE`.
- **`/auth` con pestañas.** Conserva el diseño. Descartado: dos rutas.
- **Vuelta al origen.** Descartado: destino fijo.
- **Eliminar `av_user`.** Descartado: recordarlo como nombre de invitado.
- **`INVITADO` reservado.** Propuesto al redactar, a confirmar en la revisión: es el nombre por defecto del modal.
- **Recuperación de contraseña fuera.** Requiere envío fiable de correo.

## Riesgos identificados

| Riesgo                                                                        | Mitigación                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| El SMTP por defecto solo llega al equipo y tiene límite bajo                  | Probar con correo del equipo; SMTP propio antes de producción |
| Contraseña olvidada sin recuperación                                          | Spec de recuperación antes de producción                      |
| Cuentas sin confirmar retienen alias                                          | Aceptado; limpieza en una spec futura                         |
| `is_name_available` permite enumerar alias                                    | Aceptado: los alias serán públicos en el ranking              |
| Un invitado puede guardar con el alias de un registrado                       | Aceptado hasta SPEC 12                                        |
| Un escáner de correo consume el enlace                                        | `aviso` claro, login manual y reenvío                         |
| La IP LAN cambia                                                              | Actualizar Redirect URLs y `allowedDevOrigins`                |
| Leer sesión en el layout hace dinámicas todas las páginas, incluida `/acerca` | Aceptado para evitar el parpadeo de invitado                  |
