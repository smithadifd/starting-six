# Contributing to Starting Six

Thanks for your interest in Starting Six — a self-hosted Pokémon playthrough team builder and
analysis tool. This is a small, single-maintainer project, but contributions and bug reports are
welcome.

## Read this first: `main` auto-deploys to the public demo

The public demo at <https://starting-six.smithadifd.com> tracks `main`. An EC2 cron polls `main`
every ~5 minutes and automatically rebuilds and redeploys, so **anything merged to `main` ships to
the live demo within minutes.** Two consequences:

- **Never push to `main` directly, and never merge unrelated changes.** Work on a feature branch and
  open a PR; keep each PR tightly scoped.
- **Any new mutation API endpoint must be blocked in `src/proxy.ts`** (the `DEMO_MODE` gate), or it
  leaks into the public demo. When `DEMO_MODE=true`, PokéAPI sync, settings mutations, and
  registration are all expected to return 403.

The demo's data volume is also wiped and reseeded every Sunday at 4am UTC, so don't rely on demo
data persisting.

## Orientation

Start with **[`AGENTS.md`](AGENTS.md)**. It's the canonical project guide — stack, exact
run/build/test/lint commands, repo map, architecture, database schema, conventions, and the gotchas
that will bite you if you skip them (the auto-deploy above, demo-mode blocking, the hardcoded Gen 9
type chart, one-time resumable sync). It's written for AI coding agents but reads just as well for
humans, and it's kept current.

## Quick start

```bash
nvm use                      # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:push              # create the SQLite schema
npm run dev                  # http://localhost:3000
```

On first launch you'll create an account and trigger the one-time PokéAPI data sync (~15–25 min;
it's resumable and skips stages that are already populated). See the Environment table in
[`AGENTS.md`](AGENTS.md) for the full variable reference.

Prefer Docker?

```bash
docker compose up -d         # dev, port 3000
```

## Making a change

1. Branch off `main` (`feat/…`, `fix/…`, `docs/…`, `refactor:`, `chore:`). `main` is protected —
   no direct pushes (and see the auto-deploy warning above).
2. Follow the conventions in [`AGENTS.md`](AGENTS.md): TypeScript strict (**no `any`**), functional
   components, Server Components by default (`'use client'` only for interactivity), Tailwind +
   shadcn/ui styling. Note there is **no `cn()` helper** — concatenate classes with template
   literals, matching the surrounding code. Path alias `@/` → `src/`.
3. Add or update tests next to the code you touch (`*.test.ts`, run with `npm test`). The analysis
   engine (`src/lib/analysis/`) is pure functions and is where most of the coverage lives.
4. Before opening a PR, make sure these three pass locally — **they are the CI gate**
   (`.github/workflows/ci.yml`):
   ```bash
   npm run lint     # eslint . --max-warnings 0
   npm test         # vitest run — 138 tests across 10 suites
   npm run build    # next build (this is also the type-check gate)
   ```
   CI additionally runs a non-blocking `npm audit` and a Docker image build
   (`docker/Dockerfile`, no push).
5. Use [Conventional Commit](https://www.conventionalcommits.org/) messages (`feat:`, `fix:`,
   `docs:`, `refactor:`, `chore:`).
6. Open a PR with a short summary and a test plan. CI runs two jobs: **Lint & Build** and
   **Docker Build**.

## A few things that will save you time

- **Adding a mutation API endpoint?** Block it in `src/proxy.ts`'s demo-mode gate, or it leaks into
  the public demo. (Next.js 16 uses `proxy.ts` directly as the middleware entrypoint — there's no
  separate `middleware.ts` file to edit.)
- **Changing type effectiveness?** The type chart is a hardcoded Gen 9 18×18 matrix in
  `src/lib/analysis/typeChart.ts`. The bulk sync does **not** touch it — it's a manual edit.
- **Schema change?** Edit `src/lib/db/schema.ts` (the single source of truth). `ensureSchema()` in
  `src/lib/db/index.ts` creates all tables inline with WAL pragmas, so a fresh install needs no
  separate migration step; `npm run db:push` applies the schema to your local SQLite file.
- **The data sync is one-time, user-triggered, and resumable** — never wire it into a cron.

Full detail on all of the above lives in [`AGENTS.md`](AGENTS.md). When in doubt, match the
surrounding code.
