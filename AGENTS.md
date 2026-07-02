# AGENTS.md — Starting Six

Canonical, tool-agnostic orientation for any AI coding agent or human working in this repo (Claude
Code, Codex, Cursor, Aider, Zed, Gemini CLI, …). This file is self-contained: you can build, test,
and navigate Starting Six from what's here. Links point to depth, never for a baseline.

> Claude Code users: `CLAUDE.md` imports this file and adds a Claude-only section. Don't duplicate
> content from here into `CLAUDE.md`.

---

## What Starting Six is

A self-hosted web app for building and analyzing Pokémon teams across game playthroughs. Pick up to
6 Pokémon per named run, assign moves + ability + Tera type to each, and get full team analysis:
type coverage, move coverage, role balance, and ability highlights. Single user, runs in Docker
(typically a Synology NAS behind a Caddy reverse proxy). A public read-only demo runs on EC2.

Data comes from the free public PokéAPI, bulk-synced once into SQLite — the app never calls PokéAPI
at request time. Status: Phases 1–4 shipped (full scaffold + data layer + Pokémon browser, team
builder, analysis engine, PWA/mobile polish); Phase 5 (polish — security, testing, performance, UX,
competitive features) is next.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + React 19, TypeScript (strict) |
| Runtime | Node 22 LTS (`.nvmrc`), npm |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Auth | Better Auth (credentials) |
| Data source | PokéAPI (public, no auth) — bulk-synced to SQLite |
| PWA | @serwist/turbopack |
| Tests | Vitest |
| Deploy | Docker Compose (Synology + Caddy); public demo on EC2 |

## Commands

All commands run from the repo root. Use `npm`, not yarn/pnpm/bun.

```bash
npm run dev              # dev server (http://localhost:3000)
npm run build            # production build (also the type-check gate)
npm run lint             # eslint
npm test                 # vitest run

npm run db:push          # apply schema to the SQLite file
npm run db:studio        # Drizzle Studio DB browser

# Docker (dev, port 3000)
docker compose up -d
# Docker (prod — Synology, port 3002; requires .env.production)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

CI (`.github/workflows/ci.yml`) runs lint + tests + build.

## Repo map

```
src/
├── middleware.ts         # re-exports proxy.ts (Next.js entrypoint)
├── proxy.ts              # auth gate + rate limiting + demo-mode blocking
├── app/
│   ├── layout.tsx        # root layout, async session fetch
│   ├── page.tsx          # dashboard: playthroughs list
│   ├── login/  setup/    # credentials login + first-run account creation
│   ├── playthroughs/     # team builder (new / [id] view+analysis / [id]/edit)
│   ├── pokemon/          # browser (virtualized grid) + [slug] detail
│   ├── settings/         # general (current game) + system (sync trigger + log)
│   └── api/              # auth, setup, health, sync (SSE), pokemon,
│                         #   playthroughs (+ analysis), settings
├── components/
│   ├── layout/           # LayoutShell, Sidebar, Header, UserMenu, DemoBanner
│   ├── pokemon/          # PokemonGrid (react-virtuoso), PokemonCard, TypeBadge
│   ├── team/             # TeamGrid, TeamMemberCard, move/ability/Tera selectors
│   └── sync/             # SyncStatus progress bar
├── lib/
│   ├── auth.ts  auth-client.ts  auth-helpers.ts   # Better Auth singleton + helpers
│   ├── config.ts  validations.ts  demo.ts         # env config, Zod schemas, isDemoMode()
│   ├── db/               # schema.ts (all tables), index.ts (WAL, ensureSchema), queries.ts
│   ├── pokeapi/          # typed client (retry + inter-batch delay) + response types
│   ├── sync/             # 6-stage sync orchestrator with SSE — see Architecture
│   └── analysis/         # pure functions: typeChart, defense, offense, roles, abilities
└── types/index.ts        # PokemonType, POKEMON_TYPES, SyncProgress
```

Path alias: `@/` → `src/`. Type hex colors are exported as `TYPE_COLORS` from `tailwind.config.ts`.

## Architecture in brief

**Cache-first.** PokéAPI is bulk-synced into SQLite once; the UI and API read exclusively from the
DB and never hit PokéAPI at request time.

**6-stage sync** (`src/lib/sync/index.ts`), orchestrated with an SSE progress stream
(`{ stage, stageName, processed, total }` → `SyncStatus` bar):

1. Version groups → `version_groups`
2. Game dexes (per version group) → `game_pokemon`
3. Species (paginated list + per-species legendary/mythical flags)
4. Pokémon forms (per-form) → `pokemon` + `pokemon_abilities` + `pokemon_moves`
5. Abilities (de-duped from stage 4) → `abilities`, flag ~50 notable slugs
6. Moves (de-duped from stage 4) → `moves`

Concurrency: batches of 10 with a 100ms inter-batch delay (~15–25 min, one-time). Resumable — each
stage compares `COUNT(*)` to the expected total and skips if already populated. Form display names
are normalized (`-alola` → `(Alolan)`, `-galar` → `(Galarian)`, …).

**Analysis engine** (`src/lib/analysis/`) — pure functions, no DB calls; take team data, return
computed results: defensive weakness/resistance/immunity counts, offensive move-coverage per
defending type, role classification from base stats (sweeper/wall/tank…), and notable-ability
highlights. Type effectiveness comes from a hardcoded Gen 9 18×18 chart in `typeChart.ts`.

**Auth.** Better Auth (credentials) via a lazy singleton in `src/lib/auth.ts`; `proxy.ts` gates
non-public routes and rate-limits.

## Database

SQLite via Drizzle ORM. Schema is the single source of truth in `src/lib/db/schema.ts`;
`ensureSchema()` in `src/lib/db/index.ts` creates all tables inline with WAL pragmas, so a fresh
install needs no separate migration step. Key tables:

| Table | Purpose |
|-------|---------|
| `pokemon` | One row per form/variant (Alolan Raichu ≠ Raichu) |
| `abilities` / `pokemon_abilities` | Abilities (+ `isNotable`) and the pokemon↔ability junction (slot 1–3, isHidden) |
| `moves` / `pokemon_moves` | Moves (type, damage class, power, accuracy) and the pokemon↔move junction |
| `version_groups` / `game_pokemon` | Game catalog (Gen 1–9) and species↔game-dex links |
| `playthroughs` / `team_members` | Named runs and their 6 slots (pokemon + ability + 4 moves + teraType) |
| `settings` / `sync_log` | App config (current-game preference) and sync history |
| `user`, `session`, `account`, `verification` | Better Auth tables |

## Conventions

- **TypeScript strict, no `any`.** Functional components.
- **React:** Server Components by default; add `'use client'` only for interactivity.
- Path alias `@/` → `src/`.
- **No `cn()` helper** — concatenate classes with template literals (the established pattern).
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`). Feature branches off `main`.

## Critical gotchas — read before changing these areas

- **Live EC2 auto-deploy.** The public demo's EC2 cron polls `main` every 5 minutes and
  automatically rebuilds + redeploys (`demo-infra/scripts/auto-deploy.sh`). Anything merged to `main`
  ships to the demo within minutes — never push to `main` directly, and keep unrelated changes out.
- **Weekly demo reset.** EC2 cron wipes the demo data volume and restarts Sunday 4am UTC
  (`demo-infra/scripts/reset-demos.sh`). Don't rely on demo data persisting.
- **Demo-mode blocking lives in `proxy.ts`.** When `DEMO_MODE=true`: PokéAPI sync + settings
  mutations return 403, registration is blocked, session expiry drops to 24h. **Any new mutation
  endpoint must be blocked in `proxy.ts`** or it leaks into the public demo. Demo credentials are
  intentionally kept off the login UI (README/docs only).
- **`middleware.ts` only re-exports `proxy.ts`.** Auth + rate limiting live in `proxy.ts` — edit that.
- **Hardcoded Gen 9 type chart** (`src/lib/analysis/typeChart.ts`, 18×18). Effectiveness changes are
  a manual edit here, not something the sync updates.
- **Sync is one-time and resumable** — user-triggered, not scheduled; re-running skips populated
  stages. Don't wire it into a cron.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite path (default `./data/starting-six.db`) |
| `BETTER_AUTH_SECRET` | Yes | Session encryption key |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | App URL — inlined at build time |
| `DEMO_MODE` | No | `true` enables demo mode (server-side) |

Prod env lives in `.env.production`, dev in `.env.local` (both gitignored) — never commit the values.
Demo-mode files: `src/lib/demo.ts` (`isDemoMode()` + constants), `src/components/layout/DemoBanner.tsx`,
`data/demo/demo-seed.db` (committed pre-synced data), `docker-compose.demo.yml` (port 3012, `DEMO_MODE=true`),
`scripts/deploy-demo.sh`. Auto-deploy/reset scripts live in `demo-infra/` (see gotchas).
