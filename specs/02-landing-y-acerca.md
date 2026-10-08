# SPEC 02 — Landing de inicio y enlace Acerca de

> **Estado:** aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-08
> **Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` a `/`, mover la biblioteca a `/juegos` y añadir el link "Acerca de" con una página placeholder.

## Por qué existe esta spec

El template `home-about` añade una landing de marketing como página de inicio.
Hoy `/` es la biblioteca, así que hay que reubicarla sin romper los enlaces existentes.
El contenido de About (misión + formulario de contacto) se deja para otra spec; aquí solo existe la ruta y el link.

## Alcance

**Dentro:**

- Landing en `/` con las secciones del template: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?" (4 features), "JUEGOS DISPONIBLES AHORA" (rail de 6 mini-cards), stats, "ACTIVIDAD EN VIVO" (ticker + top jugadores), "PRECIOS" (plan + FAQ) y CTA final.
- Biblioteca movida de `/` a `/juegos`.
- Nav con 4 links igual al template: Inicio · Biblioteca · Salón de la Fama · Acerca de (desktop y panel móvil).
- Página `/acerca` placeholder: título "ACERCA DE", texto "PRÓXIMAMENTE" y botón al inicio.
- Animación `.reveal` al hacer scroll mediante hook cliente reutilizable.
- Portar a `app/globals.css` los bloques CSS HOME PAGE, ABOUT PAGE, ACTIVITY y PRICING de `references/templates/home-about/styles.css`.
- Actualizar enlaces existentes que apuntan a la biblioteca para que vayan a `/juegos`.

**Fuera de alcance (specs futuras):**

- Contenido real de About (misión, highlights, divider, formulario de contacto).
- Datos reales en ticker, top jugadores o stats (incluye leer `av_scores`).
- Bloques CSS GAMEPAD y Theme variants del template.
- Cambiar textos del nav a "Games".
- Tests automatizados.

## Modelo de datos

Esta feature no introduce estructuras de datos nuevas. Reutiliza `GAMES` de `lib/games.ts` (SPEC 01).

Datos de la landing hardcodeados dentro de `components/home.tsx`, mismos valores que `home.jsx`:

```ts
type Feature = { i: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; t: string; d: string; c: GameColor };
type Stat = { n: string; u: string; s: string };
type Tick = { p: string; g: string; s: number; t: string; c: GameColor };
type TopPlayer = { r: number; p: string; s: number };
```

Convenciones:

- Rail de juegos: `GAMES.slice(0, 6)`.
- Números con `toLocaleString("es-ES")`, como en SPEC 01.
- Sección activa del nav:
  - `inicio` → `/`
  - `biblioteca` → `/juegos` y `/juegos/*`
  - `salon` → `/salon`
  - `acerca` → `/acerca`
  - `auth` → `/auth`

## Plan de implementación

1. Portar a `app/globals.css` los bloques HOME PAGE (incluye `.reveal` / `.reveal.in`), ACTIVITY, PRICING y ABOUT PAGE. Añadir regla `prefers-reduced-motion: reduce` que deje `.reveal` visible sin transición. Verificar: `npm run build` ok y pantallas existentes sin cambios visuales.
2. Mover biblioteca: crear `app/juegos/page.tsx` que renderiza `<Library />`. Dejar `app/page.tsx` temporalmente igual. Verificar: `/juegos` muestra la biblioteca.
3. Actualizar enlaces de biblioteca a `/juegos`:
   - `app/juegos/[id]/page.tsx` (VOLVER AL VAULT).
   - `components/game-player.tsx` (VOLVER AL VAULT).
   - `components/hall-of-fame.tsx` (VOLVER A LA BIBLIOTECA).
   - Auth (`router.push("/")`) y `app/not-found.tsx` siguen apuntando a `/`.
4. Crear `lib/use-reveal.ts` (`"use client"`): hook `useReveal()` que observa `.reveal` con `IntersectionObserver` (threshold 0.12), añade `in` y desconecta al desmontar.
5. Crear `components/home.tsx` (`"use client"`): `FloatingSilhouettes`, `FeatureIcon`, `MiniCard` y `Home`, fieles al template. Navegación con `next/link`:
   - EXPLORAR JUEGOS, VER TODOS LOS JUEGOS, INSERTAR MONEDA → `/juegos`.
   - CREAR CUENTA, EMPEZAR GRATIS → `/auth`.
   - MiniCard → `/juegos/[id]`.
   - VER SALÓN → `/salon`.
6. Reemplazar `app/page.tsx` para renderizar `<Home />`. Verificar: `/` muestra landing completa.
7. Crear `app/acerca/page.tsx` (server): placeholder con clases `.about`, `.about-hero`, `.about-title`, texto "PRÓXIMAMENTE" y `Link` a `/`.
8. Actualizar `components/nav.tsx`: `sectionFor` con las secciones nuevas, 4 links en desktop y en panel móvil (Inicio, Biblioteca, Salón de la Fama, Acerca de, + Iniciar Sesión/Cuenta en móvil).
9. Pasar `npm run lint` y `npm run build`; corregir warnings.

Notas:

- Aplicar `/frontend-design` antes de la landing (instrucción de `CLAUDE.md`), manteniendo fidelidad al template.
- Consultar `node_modules/next/dist/docs/` antes de crear rutas nuevas.
- SVG del template: convertir atributos a JSX (`strokeWidth`, etc.) y marcar decorativos con `aria-hidden`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ ] `/` muestra hero "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" con siluetas flotantes.
- [ ] `/` muestra las 7 secciones: hero, por qué, juegos, stats, actividad, precios, CTA final.
- [ ] Rail "JUEGOS DISPONIBLES AHORA" muestra 6 mini-cards; click en una lleva a `/juegos/[id]`.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA llevan a `/juegos`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS llevan a `/auth`.
- [ ] VER SALÓN lleva a `/salon`.
- [ ] Ticker muestra 7 filas y top jugadores 5 filas con números en formato `es-ES`.
- [ ] Secciones `.reveal` aparecen al hacer scroll; con `prefers-reduced-motion` se ven sin animación.
- [ ] `/juegos` muestra la biblioteca con búsqueda, chips y 8 tarjetas (comportamiento de SPEC 01 intacto).
- [ ] VOLVER AL VAULT (detalle y reproductor) y VOLVER A LA BIBLIOTECA (salón) llevan a `/juegos`.
- [ ] `/acerca` muestra "ACERCA DE" + "PRÓXIMAMENTE" y un botón que lleva a `/`.
- [ ] Nav desktop muestra 4 links: Inicio, Biblioteca, Salón de la Fama, Acerca de.
- [ ] Link activo resaltado: Inicio en `/`, Biblioteca en `/juegos` y `/juegos/*`, Salón en `/salon`, Acerca de en `/acerca`.
- [ ] Panel móvil (<768 px) muestra los mismos 4 links + Iniciar Sesión/Cuenta.
- [ ] Login desde `/auth` sigue redirigiendo a `/` (landing).
- [ ] No hay errores de hidratación en consola en `/`, `/juegos` ni `/acerca`.
- [ ] Comparación visual lado a lado con `references/templates/home-about/arcade-vault-standalone.html`: landing y nav con misma estructura y estilos.

## Decisiones

- **Sí:** landing en `/`, biblioteca en `/juegos`. Coherente con `/juegos/[id]`.
- **No:** `/biblioteca` o landing en `/home`. Rompe jerarquía o no es inicio real.
- **Sí:** textos del nav igual al template (Inicio, Biblioteca…). Fidelidad 1:1.
- **No:** renombrar a "Games". Se descartó para no divergir del template.
- **Sí:** `/acerca` con placeholder "PRÓXIMAMENTE". El link no cae en 404.
- **No:** link sin ruta o deshabilitado. Mala experiencia.
- **Sí:** datos de landing hardcodeados del template. Visual primero.
- **No:** derivar ticker de `av_scores`. Mezcla persistencia; va en otra spec.
- **Sí:** enlaces "volver a biblioteca" → `/juegos`; auth y 404 → `/`. Cada botón va donde dice su texto.
- **Sí:** portar CSS de Home, Activity, Pricing y About. About queda listo para su spec.
- **No:** portar GAMEPAD y Theme variants. ~360 líneas sin uso.
- **Sí:** hook `lib/use-reveal.ts` reutilizable. About lo usará después.
- **No:** observer inline duplicado por página.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `.reveal` deja contenido invisible si el JS falla o el observer no dispara | Regla `prefers-reduced-motion`; hook se ejecuta en `useEffect` al montar; verificar scroll completo. |
| `useReveal` con `querySelectorAll` global no ve nodos montados después | Landing es estática; llamar el hook en el componente raíz de la página. |
| Enlaces olvidados que siguen apuntando a `/` como biblioteca | `grep -rn 'href="/"' app components` tras paso 3 y revisar cada uno. |
| Clases CSS nuevas chocan con existentes (`.kicker`, `.stat-block`, `.section-title`) | Diff de nombres contra `globals.css` antes de portar; revisar pantallas de SPEC 01. |
| `toLocaleString("es-ES")` distinto servidor/cliente | Componente cliente; verificar consola sin warnings de hidratación. |

## Lo que **no** entra en esta spec

- Contenido de About y formulario de contacto.
- Datos reales en ticker, top jugadores o stats.
- CSS de GAMEPAD y Theme variants.
- Renombrar links del nav a "Games".
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
