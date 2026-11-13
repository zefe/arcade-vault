# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Neon/CRT arcade UI, catalog + leaderboards on Supabase, real canvas games on top of a shared player shell.

Routes (`app/`): `/` (landing, `components/home.tsx`), `/acerca`, `/juegos` (library: search + category chips), `/juegos/[id]` (detail), `/juegos/[id]/jugar` (player), `/salon` (hall of fame), `/auth` (mock login), `GET /api/health`. Plus `error.tsx`, `loading.tsx`, `not-found.tsx`.

## Workflow

**Spec Driven Design**: write a spec in `specs/NN-<name>.md` before implementing features.

- `/spec <feature>`: guided spec designer (asks questions, builds section by section).
- `/spec-impl <NN-spec-name>`: implements a spec whose state is Aprobado; creates branch `spec-NN-<name>`, goes step by step pausing for diff review.
- `/nuevo-juego <reference folder | catalog id | description>`: specialization of `/spec` for new real games with leaderboard, following the SPEC 04/05 pattern (`.claude/skills/nuevo-juego/`: `SKILL.md`, `patron-juego-real.md`, `template.md`). Saves spec in Borrador; then `/spec-impl`.
- `/spec` and `/spec-impl` come from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (pinned in `skills-lock.json`; install: `npx skills@latest add Klerith/fernando-skills`).
- Spec header: `> **Estado:**` (Borrador → Aprobado → Implementado), `Depende de`, `Fecha`, `Objetivo`. When done, set state to Implementado and update this file.

Specs: 01 MVP pantallas · 02 landing y acerca · 03 integración Supabase · 04 juego ROCAS · 05 leaderboard y tabla games · 06 juego CAÍDA · 07 juego BLOQUE BUSTER (all implemented) · 08 juego SERPENTINA (Aprobado, pending implementation).

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Tooling

- Scripts: `npm run dev | build | start | lint | format | db:types`.
- Prettier (`.prettierrc.json`: semi, double quotes, trailing commas) + ESLint 9 flat config (`next/core-web-vitals`, `next/typescript`, `eslint-config-prettier`).
- Hook `.claude/hooks/format-lint.sh` (PostToolUse on Write/Edit): runs Prettier and `eslint --fix` on the edited file; ESLint errors block (exit 2) — fix them, don't bypass.
- Supabase MCP configured in `.mcp.json` (project `qkbdukluudjmeslfezke`): use it to inspect tables, run SQL, apply migrations.
- `references/` (ignored by ESLint, not app code): `templates/` original UI prototype (React UMD + Babel, `styles.css` ported to `globals.css`), `started-games/` reference games (`02-asteroids`, `03-tetris`, `04-arkanoid`) used as input for `/nuevo-juego`, `source-assets/` raw assets. Don't ship assets taken from commercial games (e.g. `snake-assets/` is reference only; SPEC 08 draws original vector fruit).

## Stack notes

- Next.js 16.3 App Router, React 19.2, TypeScript strict. Next 16 APIs differ from training data — check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using Next APIs.
- Typed route helpers are global (e.g. `LayoutProps<"/">` in `app/layout.tsx`), generated into `.next/types` by `next dev`/`next build`.
- Tailwind CSS v4 via `@tailwindcss/postcss`: no `tailwind.config`; theme tokens defined in `app/globals.css` with `@theme inline` (CSS vars `--background`/`--foreground`, Geist fonts from `next/font`). Most UI styles are plain classes in `globals.css` (ported from the template); per-game overlay/control styles live there too.
- Import alias `@/*` → repo root.
- Supabase: clients in `lib/supabase/` — `client.ts` (browser), `server.ts` (async, Server Components/Route Handlers/Server Actions), `env.ts` (`getSupabaseEnv()`). Env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`); never use secret/`service_role` keys in app code. Regenerate `lib/supabase/database.types.ts` with `npm run db:types` (needs `npx supabase login`). Migrations go in `supabase/migrations/` numbered `NNNN_<name>.sql` (`0001_games_scores`, `0002_juego_caida`, `0003_juego_bloque_buster`).
- Auth is mock: `lib/user-context.tsx` (`UserProvider`/`useUser`) stores `{ name }` in localStorage `av_user`, read after mount (hydration-safe). `/auth` form only sets the name; no real Supabase Auth yet.
- Real games: engine in `lib/games/<id>/` (`constants.ts`, `entities.ts`, `engine.ts`, optional `levels.ts`; no globals, explicit lifecycle, full cleanup on unmount, `dt`-based update, 800×600 logical world in `.crt-screen` scaled for HiDPI, pause on visibility change, no key restart in `gameover`) and component `components/<id>-player.tsx` on top of `PlayerShell` (`components/player-shell.tsx`), registered in `GAME_PLAYERS` (`components/game-players.ts`, map `id → player`) and picked in `app/juegos/[id]/jugar/page.tsx` with `GAME_PLAYERS[game.id] ?? GamePlayer`. Games without an engine keep the `GamePlayer` simulation. Real games now: `rocas`, `caida`, `bloque-buster` (next: `serpentina`, SPEC 08). `PlayerShell` HUD: `score`, `level`, `lives` optional (omitted → no Vidas), `lines` optional (shown as Líneas). Players handle keyboard, mouse and touch input and blur focus before game actions.
- Data: catalog lives in table `games`, marks in `scores` (anonymous and forgeable until real Auth); views `games_with_stats` and `leaderboard` (best mark per name). `lib/games.ts` holds only types and `CATS`. Server reads go through `lib/data.ts` (server-only, dynamic rendering); saving goes through `lib/scores.ts` (browser client, RLS) from the FIN DEL JUEGO modal.
- `games.ranked = true` only for games with a real engine, set only by migration: it opens the public leaderboard, and a simulation's score rises by itself.
