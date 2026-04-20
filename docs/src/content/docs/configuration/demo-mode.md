---
title: Demo mode
description: What DEMO_MODE=true does, what it blocks, how the public demo is seeded, and how to run one yourself.
---

The public demo lives at [https://starting-six.smithadifd.com](https://starting-six.smithadifd.com). It runs the same Docker image as a self-hosted deployment with two environment variables added: `DEMO_MODE=true` on the server and `NEXT_PUBLIC_DEMO_MODE=true` baked into the client bundle at build time.

## Demo credentials

```text
Email:    demo@example.com
Password: demo1234!
```

These are defined as constants in `src/lib/demo.ts` (`DEMO_USER.email` and `DEMO_USER.password`) and used by `scripts/seed-demo.mjs` to create the demo account on first startup. The login page does not display them. They surface here and in the repo's README — the intention is that visitors who find the project through GitHub or these docs have a direct path in, while casual passers-by encounter a normal login form. That is a deliberate product decision, not an oversight.

## What demo mode blocks

`src/proxy.ts` checks `DEMO_MODE` and returns `403 { error: "This action is disabled in demo mode." }` for any request that matches the block list:

| Method | Path prefix |
| --- | --- |
| `POST` | `/api/sync` |
| `PUT` | `/api/settings` |
| `PATCH` | `/api/settings` |
| `POST` | `/api/setup` |

This covers the two mutations that would change shared state: triggering a PokéAPI sync and modifying settings. The `/api/setup` block prevents anyone from creating a new user account via the setup route, which is the only registration path the app exposes.

Read operations — browsing playthroughs, viewing team members, searching Pokémon — are unrestricted.

Session expiry drops from 30 days to 24 hours in demo mode. This is set in `src/lib/auth.ts`, which checks `process.env.DEMO_MODE === 'true'` when configuring the Better Auth session.

## Scheduler behavior

Starting Six has no in-process cron scheduler. There is no `src/lib/scheduler/` directory. Sync is triggered manually via the UI or directly via `POST /api/sync`, which is blocked in demo mode (see above). There is nothing to disable.

## Weekly reset

The `DemoBanner` component (`src/components/layout/DemoBanner.tsx`) shows "Demo Mode — data resets weekly." at the top of every page. The reset itself is not handled by the application — it is an EC2 cron job that wipes the `starting_six_demo_data` Docker volume and restarts the container, which re-runs the seed script on the fresh database. The schedule and implementation live in the deployment infrastructure, not in this repo.

## Seed data

`scripts/seed-demo.mjs` runs on container startup and creates the demo user account plus three sample playthroughs if they do not already exist:

- **Scarlet Nuzlocke** (Gen 9, in progress) — six members including Meowscarada, Ceruledge, and Tinkaton
- **Kanto Classic** (Gen 1, completed) — four members including Charizard and Pikachu
- **Violet Competitive** (Gen 9, in progress) — six members including Great Tusk, Gholdengo, and Iron Valiant

The script is idempotent: it checks for `demo@example.com` before inserting and exits early if the account already exists. Team members are seeded with real ability and move data pulled from the pre-populated PokéAPI tables — the script picks the first non-hidden ability and the four strongest offensive moves for each Pokémon.

Passwords are hashed using the same `scrypt` parameters as Better Auth (N=16384, r=16, p=1, 64-byte key) so the demo account authenticates through the normal sign-in flow.

## Running your own demo

1. Set `DEMO_MODE=true` in your server environment and `NEXT_PUBLIC_DEMO_MODE=true` as a build arg (client variables are inlined at build time, not runtime).
2. Use `docker-compose.demo.yml` as a reference. It sets both variables, exposes the app on port `3012`, and uses a named volume (`starting_six_demo_data`) for the database.
3. Run a full PokéAPI sync once to populate Pokémon data, then run `node scripts/seed-demo.mjs` to create the demo user and sample playthroughs. The seed script reads `DATABASE_URL` from the environment; the default is `./data/starting-six.db`.
4. With `DEMO_MODE=true` active, mutation endpoints are blocked immediately on the next request — no restart required beyond the initial build.

The demo compose file sets a 300 MB memory limit (`deploy.resources.limits.memory`). That is sufficient for the app at idle and under light read traffic.

---

For the flag definitions and their defaults, see [Environment variables](/starting-six/configuration/environment-variables/).
