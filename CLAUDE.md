# Starting Six — Pokémon Team Builder

## Project Overview

Self-hosted web application for building and analyzing Pokémon teams across game playthroughs. Pick up to 6 Pokémon per named run, assign moves + ability + Tera type to each, and get full team analysis: type coverage, move coverage, role balance, and ability highlights. Deployed on Synology NAS via Docker.

**Status**: Phase 1 scaffold in progress.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) / TypeScript |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Data | PokéAPI (public, no auth) — bulk synced to SQLite |
| Auth | Better Auth (credentials) |
| Scheduling | None (sync is user-triggered, one-time) |
| PWA | @serwist/turbopack (Phase 4) |
| Deployment | Docker Compose (Synology NAS + Caddy reverse proxy) |

---

## Directory Structure

```
starting-six/
├── CLAUDE.md                    # This file (committed)
├── CLAUDE.local.md              # Personal config (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts               # Standalone output, serwist, remote patterns
├── tailwind.config.ts           # shadcn CSS vars + 18 Pokémon type hex colors (TYPE_COLORS export)
├── drizzle.config.ts
├── vitest.config.ts
├── docker/
│   └── Dockerfile
├── docker-compose.yml           # Dev (port 3000)
├── docker-compose.prod.yml      # Prod (port 3002, NAS)
├── scripts/
│   ├── start.mjs                # Drizzle migrations + Next.js standalone
│   └── deploy.sh
├── .github/workflows/ci.yml
└── src/
    ├── middleware.ts             # Re-exports proxy
    ├── proxy.ts                 # Auth gate + rate limiting
    ├── app/
    │   ├── layout.tsx           # Root layout, async session fetch
    │   ├── globals.css
    │   ├── page.tsx             # Dashboard: playthroughs list
    │   ├── login/               # Credentials login
    │   ├── setup/               # First-run account creation
    │   ├── playthroughs/        # Phase 2: team builder
    │   ├── pokemon/             # Pokémon browser + detail
    │   ├── settings/            # General + system sub-pages
    │   └── api/
    │       ├── auth/[...all]/   # Better Auth handler
    │       ├── setup/           # Account creation endpoint
    │       ├── health/          # Docker healthcheck
    │       ├── sync/            # PokéAPI sync (SSE)
    │       └── pokemon/         # Pokémon API
    ├── components/
    │   ├── layout/              # LayoutShell, Sidebar, Header, UserMenu
    │   ├── pokemon/             # PokemonGrid (react-virtuoso), PokemonCard, TypeBadge
    │   └── sync/                # SyncStatus progress bar
    ├── lib/
    │   ├── auth.ts              # Better Auth lazy proxy singleton
    │   ├── auth-client.ts       # Client-side auth
    │   ├── auth-helpers.ts      # getSession, requireUserId, requireUserIdFromRequest
    │   ├── config.ts            # Env var config
    │   ├── validations.ts       # Zod schemas
    │   ├── db/
    │   │   ├── schema.ts        # Drizzle schema (all tables)
    │   │   ├── index.ts         # DB singleton, WAL pragmas, ensureSchema
    │   │   └── queries.ts       # Typed query helpers
    │   ├── pokeapi/
    │   │   ├── types.ts         # PokéAPI response shapes
    │   │   └── client.ts        # Typed fetch + retry + 100ms inter-batch delay
    │   ├── sync/
    │   │   ├── types.ts         # ProgressCallback, SyncResult
    │   │   ├── index.ts         # 6-stage orchestrator with SSE
    │   │   ├── games.ts         # Stages 1-2: version groups + game dexes
    │   │   ├── pokemon.ts       # Stages 3-4: species + forms
    │   │   ├── abilities.ts     # Stage 5: abilities, isNotable flagging
    │   │   └── moves.ts         # Stage 6: moves
    │   ├── analysis/            # Phase 3: pure analysis functions
    │   │   ├── typeChart.ts     # Gen 9 18×18 effectiveness matrix
    │   │   ├── defense.ts       # Team weakness/resistance analysis
    │   │   ├── offense.ts       # Move coverage analysis
    │   │   ├── roles.ts         # Role classification from base stats
    │   │   └── abilities.ts     # Notable ability highlights
    │   └── utils/
    │       └── api.ts           # apiSuccess, apiError, apiUnauthorized, etc.
    └── types/
        └── index.ts             # PokemonType, POKEMON_TYPES, SyncProgress
```

---

## Database Schema

SQLite managed by Drizzle ORM. Key tables:

| Table | Purpose |
|-------|---------|
| `pokemon` | One row per form/variant (Alolan Raichu separate from Raichu) |
| `abilities` | All abilities with effect text and isNotable flag |
| `pokemon_abilities` | Junction: pokemon ↔ abilities (slot 1-3, isHidden) |
| `moves` | All moves with type, damage class, power, accuracy |
| `pokemon_moves` | Junction: pokemon ↔ moves (version-agnostic) |
| `version_groups` | Game catalog (Gen 1-9) |
| `game_pokemon` | Links species to version groups (game dex filter) |
| `playthroughs` | Named runs with game selection |
| `team_members` | 6 slots per run: pokemon + ability + 4 moves + teraType |
| `settings` | App config (current_game preference) |
| `sync_log` | PokéAPI sync history |
| `user`, `session`, `account`, `verification` | Better Auth tables |

Schema defined in `src/lib/db/schema.ts`. `ensureSchema()` in `src/lib/db/index.ts` creates all tables inline (no separate migration needed for fresh installs).

---

## PokéAPI Sync Strategy

6 stages, orchestrated in `src/lib/sync/index.ts`:

1. **Version Groups** — single paginated request → `version_groups`
2. **Game Dexes** — per-dex detail for each version group → `game_pokemon`
3. **Species** — paginated list + individual species fetches (legendary/mythical flags)
4. **Pokémon Forms** — per-form fetch → `pokemon` + `pokemon_abilities` + `pokemon_moves`
5. **Abilities** — de-duped from stage 4, per-ability fetch → `abilities`; flag ~50 notable slugs
6. **Moves** — de-duped from stage 4, per-move fetch → `moves`

- **Concurrency**: batches of 10, 100ms inter-batch delay (~15-25 min, one-time)
- **Resumability**: each stage checks `COUNT(*)` vs expected — skipped if already populated
- **Progress**: SSE stream `{ stage, stageName, processed, total }` → `SyncStatus` progress bar
- **Form display names**: `-alola` → `(Alolan)`, `-galar` → `(Galarian)`, etc.
- **Type chart**: hardcoded Gen 9 18×18 matrix in `src/lib/analysis/typeChart.ts`

---

## Analysis Engine (`src/lib/analysis/`) — Phase 3

Pure functions — no DB calls inside. Takes team data as input, returns computed results.

- `typeChart.ts` — Gen 9 18×18 effectiveness matrix
- `defense.ts` — per-type weakness/resistance/immunity counts across team
- `offense.ts` — move coverage per defending type
- `roles.ts` — role labels from base stats (physical-sweeper, special-wall, etc.)
- `abilities.ts` — filter notable ability callouts

---

## App Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard: all playthroughs |
| `/playthroughs/new` | Create playthrough (Phase 2) |
| `/playthroughs/[id]` | Team view + Analysis tab (Phase 2-3) |
| `/playthroughs/[id]/edit` | Edit team (Phase 2) |
| `/pokemon` | Pokémon browser: virtualized grid, search + filter |
| `/pokemon/[slug]` | Pokémon detail: stats, types, abilities, learnset |
| `/settings` | General: current game preference |
| `/settings/system` | Sync status, re-sync trigger, sync log |
| `/login` | Credentials login |
| `/setup` | First-run account creation |

---

## Development Commands

```bash
# Start dev server
npm run dev

# Database
npm run db:push          # Apply schema
npm run db:studio        # Drizzle Studio

# Linting + tests
npm run lint
npm test

# Docker (dev)
docker compose up -d

# Docker (prod — Synology, port 3002)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## Code Conventions

- Same as Hoard: strict TypeScript, no `any`, functional components
- Server Components by default, `'use client'` only when needed
- `@/` path alias to `src/`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- No `cn` utility — use template literals for class concatenation

---

## Phased Roadmap

### Phase 1: Full Scaffold + Data Layer + Pokémon Browser ← IN PROGRESS
- [x] Project scaffolding, Docker, database schema
- [x] Better Auth (credentials)
- [x] Layout shell: sidebar + header + mobile tabs
- [x] Login/setup pages
- [ ] PokéAPI client + 6-stage sync pipeline with SSE
- [ ] `/settings/system` — sync trigger + status
- [ ] `/pokemon` — virtualized browser (react-virtuoso)
- [ ] `/pokemon/[slug]` — detail page

### Phase 2: Team Builder
Playthroughs CRUD, 6-slot team grid, Pokémon search modal, move selector, ability selector, Tera type dropdown.

### Phase 3: Analysis Engine
Type chart, defense/offense/roles/abilities analysis, analysis API, Analysis tab on playthrough page.

### Phase 4: PWA + Mobile Polish
Serwist service worker, PWA manifest, mobile layout final pass.

### Phase 5: Polish Plans
Security, testing, performance, UX polish, competitive features.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite path (default: `./data/starting-six.db`) |
| `BETTER_AUTH_SECRET` | Yes | Session encryption key |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | App URL (inlined at build time) |

---

## Claude Code Agents

Reusing Hoard agent types from `.claude/` (global). Relevant agents for this project:

| Agent | Purpose |
|-------|---------|
| `phase-implementer` | Implement features per roadmap |
| `ui-builder` | React components, design system |
| `db-assistant` | Schema changes, queries |
| `pre-commit-check` | Type check, lint, build |
| `code-reviewer` | Quality review |

---

## End-of-Session Workflow

1. Commit (conventional commit message)
2. `git push origin main`
3. `gh run watch` — wait for CI
4. `./scripts/deploy.sh`
5. Update `MEMORY.md` and this file if status changed