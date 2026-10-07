# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Currently a fresh `create-next-app` scaffold (only `app/layout.tsx`, `app/page.tsx`, `app/globals.css`).

Workflow is **Spec Driven Design** via `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (install: `npx skills@latest add Klerith/fernando-skills`). Write a spec before implementing features.

## Skills
Usa siempre /frontend-design para diseñar la interfaz de usuario. 

## Stack notes

- Next.js 16.3 App Router, React 19.2, TypeScript strict. Next 16 APIs differ from training data — check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using Next APIs.
- Typed route helpers are global (e.g. `LayoutProps<"/">` in `app/layout.tsx`), generated into `.next/types` by `next dev`/`next build`.
- Tailwind CSS v4 via `@tailwindcss/postcss`: no `tailwind.config`; theme tokens defined in `app/globals.css` with `@theme inline` (CSS vars `--background`/`--foreground`, Geist fonts from `next/font`).
- Import alias `@/*` → repo root.
