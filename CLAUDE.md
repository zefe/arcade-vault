# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Currently a fresh `create-next-app` scaffold (only `app/layout.tsx`, `app/page.tsx`, `app/globals.css`).

Workflow is **Spec Driven Design** via `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (install: `npx skills@latest add Klerith/fernando-skills`). Write a spec before implementing features.

New real games (with leaderboard): run `/nuevo-juego <reference folder | catalog id | description>` (`.claude/skills/nuevo-juego/`) to generate the game spec from the SPEC 04/05 pattern, then `/spec-impl`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Stack notes

- Next.js 16.3 App Router, React 19.2, TypeScript strict. Next 16 APIs differ from training data — check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using Next APIs.
- Typed route helpers are global (e.g. `LayoutProps<"/">` in `app/layout.tsx`), generated into `.next/types` by `next dev`/`next build`.
- Tailwind CSS v4 via `@tailwindcss/postcss`: no `tailwind.config`; theme tokens defined in `app/globals.css` with `@theme inline` (CSS vars `--background`/`--foreground`, Geist fonts from `next/font`).
- Import alias `@/*` → repo root.
- Supabase (project `qkbdukluudjmeslfezke`): clients in `lib/supabase/` — `client.ts` (browser), `server.ts` (async, Server Components/Route Handlers/Server Actions), `env.ts` (`getSupabaseEnv()`). Env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`); never use secret/`service_role` keys in app code. Regenerate `lib/supabase/database.types.ts` with `npm run db:types` (needs `npx supabase login`). Migrations go in `supabase/migrations/`. Health check: `GET /api/health`.
- Real games: engine in `lib/games/<id>/` and component `components/<id>-player.tsx` on top of `PlayerShell` (`components/player-shell.tsx`), registered in `GAME_PLAYERS` (`components/game-players.ts`, map `id → player`) and picked in `app/juegos/[id]/jugar/page.tsx` with `GAME_PLAYERS[game.id] ?? GamePlayer`. Games without an engine keep the `GamePlayer` simulation. Real games now: `rocas`, `caida`. `PlayerShell` HUD: `lives` optional (omitted → no Vidas), `lines` optional (shown as Líneas).
- Data: catalog lives in table `games`, marks in `scores` (anonymous and forgeable until real Auth); views `games_with_stats` and `leaderboard` (best mark per name). `lib/games.ts` holds only types and `CATS`. Server reads go through `lib/data.ts` (server-only, dynamic rendering); saving goes through `lib/scores.ts` (browser client, RLS).
- `games.ranked = true` only for games with a real engine, set only by migration: it opens the public leaderboard, and a simulation's score rises by itself.
