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
- `/spec-impl-game <NN-spec-name | game-jam/<id>/NN-...>`: same flow as `/spec-impl` (reads and follows `.claude/skills/spec-impl`), then runs `skin-designer` and afterwards `mobile-porter` (sequential, never parallel) on the implemented game (`.claude/skills/spec-impl-game/SKILL.md`). Never commits.
- `/nuevo-juego <reference folder | catalog id | description>`: specialization of `/spec` for new real games with leaderboard, following the SPEC 04/05 pattern (`.claude/skills/nuevo-juego/`: `SKILL.md`, `patron-juego-real.md`, `template.md`). Saves spec in Borrador; then `/spec-impl-game`.
- New game flow: `game-planner` agent (pick the game) → `/nuevo-juego` (spec in Borrador) → approve → `/spec-impl-game`.
- Game jam flow: `game-jam` agent + theme → specs in `specs/game-jam/<game-id>/` (Borrador) → review/approve → `/spec-impl-game`.
- `/spec` and `/spec-impl` come from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (pinned in `skills-lock.json`; install: `npx skills@latest add Klerith/fernando-skills`).
- Spec header: `> **Estado:**` (Borrador → Aprobado → Implementado), `Depende de`, `Fecha`, `Objetivo`. When done, set state to Implementado and update this file.

Specs: 01 MVP pantallas · 02 landing y acerca · 03 integración Supabase · 04 juego ROCAS · 05 leaderboard y tabla games · 06 juego CAÍDA · 07 juego BLOQUE BUSTER · 08 juego SERPENTINA · 09 controles táctiles (all implemented). Game jam: `ranaria/01-juego-ranaria` (implementing; 02 niveles, 03 táctil y feedback in Borrador).

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Agents

Subagents live in `.claude/agents/`; project memory in `.claude/agent-memory/<agent>/` (committed).

- `game-planner` (`.claude/agents/game-planner.md`, model opus, `memory: project`): plans and decides which game fits the platform next. Invoke when asking for ideas, the next game, or to evaluate a proposal (e.g. "usa game-planner para sugerir el próximo juego").
  - Reads `CLAUDE.md`, `references/implemented-games.md`, specs, `lib/games/`, `references/started-games/`, `patron-juego-real.md`; optional read-only SQL on `games`.
  - Scores candidates on 7 criteria (1–5 each, /35: technical viability, leaderboard, variety, controls, neon aesthetics, `PlayerShell` fit, originality) + effort S/M/L. Prioritizes catalog games without engine (`ranked = false`).
  - Proposes 3 candidates, picks 1, returns a ready `/nuevo-juego <...>` command.
  - Memory: suggestions TODO `references/game-suggestions-todo.md` (IDs `S-NNN`, never deleted, only change state: pendiente / en curso / implementado / descartado) + `.claude/agent-memory/game-planner/MEMORY.md` (user preferences, rejections with reason, learned criteria). Never repeats pending or discarded suggestions.
  - Never writes specs, code, migrations or DB data.
- When a game moves to spec/implemented, update its entry in `references/game-suggestions-todo.md`.
- `game-jam` (`.claude/agents/game-jam.md`, model opus, `memory: project`): given a theme, autonomously designs one original game (3 internal concepts scored /35, picks 1) and writes 2–3 complete specs in `Borrador` to `specs/game-jam/<game-id>/` (`01-juego-<id>.md` core playable + ranked insert; `02-<id>-<contenido>.md` progression; optional `03-<id>-<extra>.md`), same format as SPEC 06–08. Invoke e.g. "usa game-jam con el tema océano".
  - Always a new `games` row; no questions (defaults recorded in Decisiones); read-only SQL; never writes code, `.sql` files or `references/`.
  - Memory: `.claude/agent-memory/game-jam/MEMORY.md` (themes, ids, discarded concepts).
- `skin-designer` (`.claude/agents/skin-designer.md`, model opus, `memory: project`): audits and implements the 3 mandatory skins per real game — `clasico` (default, flat 80s arcade, no glow), `neon` (current palette + glow), `retro` (monochrome green/amber phosphor + scanlines) — with dark-mode contrast checks (entities ≥ 3:1, text ≥ 4.5:1 vs bg). Invoke e.g. "usa skin-designer para revisar skins" (audit only: "solo auditar").
  - Contract: `lib/skins.ts` (`SkinId`, `DEFAULT_SKIN`, `BaseSkin`), `lib/use-skin.ts` (`useSkin(gameId)`, localStorage `av_skin_<gameId>`), `lib/games/<id>/skins.ts` (`SKINS: Record<SkinId, Palette>`), engine `setSkin()` hot-swap, chips selector in `PlayerShell` (`skin`/`onSkinChange` props, `.crt.skin-<id>`).
  - Never touches Supabase, scores or gameplay; updates `patron-juego-real.md`/`template.md` so new games ship with skins.
  - Memory: `.claude/agent-memory/skin-designer/MEMORY.md` (audits, palettes, preferences).
- `mobile-porter` (`.claude/agents/mobile-porter.md`, model opus, `memory: project`): audits and fixes the mobile experience — mobile web (portrait first, landscape) and installed app (PWA standalone; no native app) — using SPEC 09 as the touch contract. Invoke e.g. "usa mobile-porter para revisar el móvil" (audit only: "solo auditar").
  - Checklist per route: no horizontal scroll at 360–414 px, `dvh`, touch targets ≥ 44 px, inputs ≥ 16 px, no hover-only UI, safe areas, `viewport` export, SPEC 09 contract per real game.
  - Fixes CSS/layout/touch wiring directly; new features (PWA manifest/icons, landscape player, fullscreen, vibration, mobile menu) go to a new spec in Borrador, never implemented by the agent.
  - Never touches Supabase, scores, gameplay/balance or skins.
  - Memory: `.claude/agent-memory/mobile-porter/MEMORY.md` (audits, decisions, proposed specs, 👁 pending device checks).

## Tooling

- Scripts: `npm run dev | build | start | lint | format | db:types`.
- Prettier (`.prettierrc.json`: semi, double quotes, trailing commas) + ESLint 9 flat config (`next/core-web-vitals`, `next/typescript`, `eslint-config-prettier`).
- Hook `.claude/hooks/format-lint.sh` (PostToolUse on Write/Edit): runs Prettier and `eslint --fix` on the edited file; ESLint errors block (exit 2) — fix them, don't bypass.
- Supabase MCP configured in `.mcp.json` (project `qkbdukluudjmeslfezke`): use it to inspect tables, run SQL, apply migrations.
- `references/` (ignored by ESLint, not app code): `templates/` original UI prototype (React UMD + Babel, `styles.css` ported to `globals.css`), `started-games/` reference games (`02-asteroids`, `03-tetris`, `04-arkanoid`) used as input for `/nuevo-juego`, `source-assets/` raw assets, `implemented-games.md` (real games summary), `game-suggestions-todo.md` (game-planner TODO). Don't ship assets taken from commercial games (e.g. `snake-assets/` is reference only; SPEC 08 draws original vector fruit).

## Stack notes

- Next.js 16.3 App Router, React 19.2, TypeScript strict. Next 16 APIs differ from training data — check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using Next APIs.
- Typed route helpers are global (e.g. `LayoutProps<"/">` in `app/layout.tsx`), generated into `.next/types` by `next dev`/`next build`.
- Tailwind CSS v4 via `@tailwindcss/postcss`: no `tailwind.config`; theme tokens defined in `app/globals.css` with `@theme inline` (CSS vars `--background`/`--foreground`, Geist fonts from `next/font`). Most UI styles are plain classes in `globals.css` (ported from the template); per-game overlay/control styles live there too.
- Import alias `@/*` → repo root.
- Supabase: clients in `lib/supabase/` — `client.ts` (browser), `server.ts` (async, Server Components/Route Handlers/Server Actions), `env.ts` (`getSupabaseEnv()`). Env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`); never use secret/`service_role` keys in app code. Regenerate `lib/supabase/database.types.ts` with `npm run db:types` (needs `npx supabase login`). Migrations go in `supabase/migrations/` numbered `NNNN_<name>.sql` (`0001_games_scores`, `0002_juego_caida`, `0003_juego_bloque_buster`, `0004_juego_serpentina`, `0005_controles_tactiles`, `0006_juego_ranaria`).
- Auth is mock: `lib/user-context.tsx` (`UserProvider`/`useUser`) stores `{ name }` in localStorage `av_user`, read after mount (hydration-safe). `/auth` form only sets the name; no real Supabase Auth yet.
- Real games: engine in `lib/games/<id>/` (`constants.ts`, `entities.ts`, `engine.ts`, optional `levels.ts`; no globals, explicit lifecycle, full cleanup on unmount, `dt`-based update, 800×600 logical world in `.crt-screen` scaled for HiDPI, pause on visibility change, no key restart in `gameover`) and component `components/<id>-player.tsx` on top of `PlayerShell` (`components/player-shell.tsx`), registered in `GAME_PLAYERS` (`components/game-players.ts`, map `id → player`) and picked in `app/juegos/[id]/jugar/page.tsx` with `GAME_PLAYERS[game.id] ?? GamePlayer`. Games without an engine keep the `GamePlayer` simulation. Real games now: `rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria` (keyboard only until SPEC JAM ranaria 03; touch shows `REQUIERE TECLADO`). `PlayerShell` HUD: `score`, `level`, `lives` optional (omitted → no Vidas), `lines` optional (shown as Líneas), `touchControls?: ReactNode` optional (rendered right below `.crt`; only ROCAS uses it). Players handle keyboard, mouse and touch input and blur focus before game actions.
- Touch (SPEC 09): `useIsTouch()` (`lib/use-is-touch.ts`, only copy of `TOUCH_QUERY`; `false` on server) and pure gesture helper `lib/games/gestures.ts` (`classifySwipe`, `SWIPE_MIN_PX` 24, `TAP_MAX_PX`, `TAP_MAX_MS`, `FAST_SWIPE_PX_PER_MS`). Each engine exposes a public action API used by both keyboard and touch (`RocasEngine.setControl/fire`, `CaidaEngine.move/rotate/setSoftDrop/hardDrop`, `SerpentinaEngine.turn`, `BloqueBusterEngine.movePaddleTo`) and listens to pointer events on its canvas (one active pointer, added in `mount()`, removed in `destroy()`); tapping the CRT in `ready` calls `start()` and does nothing else. Schemes: SERPENTINA swipe, CAÍDA tap/drag/fast swipe, BLOQUE BUSTER drag, ROCAS on-screen buttons (`components/rocas-touch-pad.tsx`, only when `useIsTouch()`). In touch the `ready` overlay shows the game's touch controls + `TOCA PARA EMPEZAR` and `pauseHint` is `PULSA REANUDAR PARA CONTINUAR`. `.crt-screen` has `touch-action: none`; `*-ready` overlays `pointer-events: none`. `next.config.ts` `allowedDevOrigins` holds the LAN IP (hostname only) for testing on a real phone.
- Data: catalog lives in table `games`, marks in `scores` (anonymous and forgeable until real Auth); views `games_with_stats` and `leaderboard` (best mark per name). `lib/games.ts` holds only types and `CATS`. Server reads go through `lib/data.ts` (server-only, dynamic rendering); saving goes through `lib/scores.ts` (browser client, RLS) from the FIN DEL JUEGO modal.
- `games.ranked = true` only for games with a real engine, set only by migration: it opens the public leaderboard, and a simulation's score rises by itself.
