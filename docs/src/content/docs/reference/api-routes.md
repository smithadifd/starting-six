---
title: API routes reference
description: Every route under /api — methods, auth requirements, demo-mode blocking, and key request/response shapes.
---

All API routes live under `/api` and are implemented as Next.js App Router route handlers. They return `NextResponse.json` with a consistent `{ data, error? }` envelope via helpers in `src/lib/utils/api.ts`. Auth is enforced by `requireUserIdFromRequest()` from `src/lib/auth-helpers` — any route that calls it returns 401 if no valid session cookie is present. Two routes are intentionally public: `GET /api/health` and `POST /api/setup`. The `api/auth/[...all]` catch-all is handled entirely by Better Auth.

## Route table

| Method | Path | Purpose | Auth | Demo-blocked |
| ------ | ---- | ------- | ---- | ------------ |
| GET | `/api/health` | Liveness check — database connectivity and sync state | Public | No |
| GET, POST | `/api/auth/[...all]` | Better Auth session management (sign-in, sign-out, session) | Public | No |
| POST | `/api/setup` | Create the first user account (blocked if any user exists) | Setup-guarded | Yes |
| GET | `/api/settings` | Read all settings key/value pairs | Required | No |
| PUT | `/api/settings` | Write a single setting key (currently `current_game`) | Required | Yes |
| PATCH | `/api/settings` | Write a single setting key | Required | Yes |
| POST | `/api/sync` | Trigger a full PokéAPI sync; streams progress as SSE | Required | Yes |
| GET | `/api/pokemon` | List Pokémon with filtering and pagination | Required | No |
| GET | `/api/pokemon/[id]/moves` | Moves (and optionally abilities) for a single Pokémon | Required | No |
| GET | `/api/playthroughs` | List all playthroughs for the authenticated user | Required | No |
| POST | `/api/playthroughs` | Create a new playthrough | Required | No |
| GET | `/api/playthroughs/[id]` | Fetch one playthrough including its team | Required | No |
| PATCH | `/api/playthroughs/[id]` | Update playthrough fields | Required | No |
| DELETE | `/api/playthroughs/[id]` | Delete a playthrough | Required | No |
| GET | `/api/playthroughs/[id]/analysis` | Team composition analysis (defense, offense, roles, abilities) | Required | No |
| GET | `/api/playthroughs/[id]/team` | List team members for a playthrough | Required | No |
| POST | `/api/playthroughs/[id]/team` | Add a Pokémon to the team (auto-benched if active slots full) | Required | No |
| PATCH | `/api/playthroughs/[id]/team/[memberId]` | Update a team member, or bench/activate it | Required | No |
| DELETE | `/api/playthroughs/[id]/team/[memberId]` | Remove a team member | Required | No |
| POST | `/api/playthroughs/[id]/team/swap` | Swap a benched member into an active slot | Required | No |

## Route details

### GET /api/health

Returns `{ status, checks }` where `status` is `"healthy"` (200), `"degraded"` (503), or `"unhealthy"` (503). The `checks` object has two boolean fields: `database` (a `SELECT 1` probe) and `synced` (whether the Pokémon table has any rows). The route requires no session and is used by uptime monitors.

### POST /api/setup

Only works before any user account exists — if a user row is already in the database, the route returns 403 with `"Setup already completed. Please sign in."` That makes it safe to leave publicly accessible: once setup is done, it does nothing. This route is blocked in demo mode to prevent overwriting the demo account.

### POST /api/sync

The most complex route in the codebase. It runs a full PokéAPI sync and streams progress back as [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events). The response has `Content-Type: text/event-stream`.

The stream emits two event types:

- `progress` — `{ stage, stageName, processed, total }` fired after each batch within a stage
- `complete` — `{ status, totalProcessed, totalFailed, stages }` when all stages finish
- `error` — `{ message }` if the sync throws

Concurrent syncs are blocked with a module-level flag. If a sync is already running, the route returns 400 immediately (via `apiValidationError`). For the full six-stage pipeline, see [Sync pipeline](/starting-six/architecture/sync-pipeline/).

This route is rate-limited to 3 requests per minute and is blocked in demo mode.

### GET /api/pokemon

Returns a paginated list of Pokémon. Accepts the following query params:

- `search` — name substring match
- `type` — filter by primary or secondary type
- `generation` — integer generation number
- `versionGroupId` — integer; filters to Pokémon available in a specific game version group
- `page` — page number (default 1)
- `pageSize` — results per page

Response shape: `{ data: Pokemon[], meta: { page, pageSize, total, totalPages } }`.

### GET /api/pokemon/[id]/moves

Returns the move list for a Pokémon. Pass `?include=abilities` to also receive the Pokémon's abilities in the same response: `{ data: { moves: Move[], abilities: Ability[] } }`. Without the param, the response is `{ data: Move[] }`.

### POST /api/playthroughs/[id]/team

When adding a Pokémon to the team, the route calls `getNextTeamSlot` to find the first open active slot. If all six active slots are full, the member is added to the bench (`slot = null`). The response includes a `benched: true` field when this happens so the UI can react without a second fetch.

### PATCH /api/playthroughs/[id]/team/[memberId]

Handles three distinct operations in one route, disambiguated by the request body shape:

- Bench action (`{ action: "bench" }`) — moves an active member to the bench
- Activate action (`{ action: "activate", slot?: number }`) — moves a benched member to an active slot; returns 400 if no slots are available
- General update — changes nickname, ability, tera type, or move assignments

### POST /api/playthroughs/[id]/team/swap

Swaps a benched member directly into a specific active slot, displacing the current occupant to the bench. Body: `{ benchMemberId: number, activeSlot: number }`. Returns `{ data: { swapped: true } }`. For the design rationale behind the bench/swap model, see [Bench and swap](/starting-six/design-decisions/bench-swap/).

### GET /api/playthroughs/[id]/analysis

Runs four pure-function analysis passes over the active team members and returns the results in a single response:

- `defense` — type coverage gaps and resistances
- `offense` — move type coverage
- `roles` — stat-based role classification (e.g., physical sweeper, wall)
- `abilities` — highlights of notable abilities

Returns 400 if the team has no active members. Only active members (not benched) are included in the analysis. For implementation detail, see [Analysis internals](/starting-six/architecture/analysis-internals/).

## Demo mode

Four routes are blocked when `DEMO_MODE=true`: `POST /api/sync`, `PUT /api/settings`, `PATCH /api/settings`, and `POST /api/setup`. Blocked requests receive 403 with `{ error: "This action is disabled in demo mode." }`. The full list is maintained in `src/proxy.ts`. See [Demo mode](/starting-six/configuration/demo-mode/) for how to configure this.

## Auth environment variables

Session signing requires `BETTER_AUTH_SECRET` to be set. See [Environment variables](/starting-six/configuration/environment-variables/) for the full list of required and optional env vars.
