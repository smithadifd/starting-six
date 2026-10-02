---
title: API routes reference
description: Every route under /api — methods, auth requirements, demo-mode blocking, and key request/response shapes.
---

Local JSON handlers return `{ data }` on success (sometimes with `meta`) and `{ error }` on failure, without `data` in the error response. Health returns `{ status, checks }`; Better Auth controls `/api/auth/[...all]` responses; and a successful sync trigger streams Server-Sent Events (SSE). Protected handlers return 401 without a valid session. Health and setup are public; setup also checks that no user exists yet.

## Route table

| Method | Path | Purpose | Auth | Demo-blocked |
| ------ | ---- | ------- | ---- | ------------ |
| GET | `/api/health` | Liveness check — database connectivity and sync state | Public | No |
| GET, POST | `/api/auth/[...all]` | Better Auth session management (sign-in, sign-out, session) | Public | No |
| POST | `/api/setup` | Create the first user account (blocked if any user exists) | Setup-guarded | Yes |
| GET | `/api/settings` | Read all settings key/value pairs | Required | No |
| PUT | `/api/settings` | Write a single setting key (currently `current_game`) | Required | Yes |
| POST | `/api/sync` | Trigger a full PokéAPI sync; streams progress as SSE | Required | Yes |
| GET | `/api/sync/schedule` | Read schedule and attempt state | Required | No |
| PUT | `/api/sync/schedule` | Set schedule enabled state and frequency | Required | Yes |
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

Local handlers return 500 for caught server or database failures unless a different status is specified below. Protected handlers return 401 when session validation fails; the proxy can also return 401 when the session cookie is missing.

### GET /api/health

Takes no body or session. Returns `{ status, checks: { database, synced } }`; `database` is true only if `SELECT 1 as ok` returns `ok: 1`, while `synced` is true if the Pokémon count is positive. A passing database probe returns `healthy` (200), even if `synced` is false. A failed probe returns `degraded` (503); an exception returns `unhealthy` (503).

### GET, POST /api/auth/[...all]

Both methods delegate to Better Auth. Request shapes, responses, and status codes depend on the Better Auth endpoint invoked, rather than the local JSON helpers.

### POST /api/setup

Accepts `{ name, email, password }`: name is 1–100 characters, email must be valid and at most 255 characters, and password is 8–128 characters. Returns `{ data: { message: "Account created successfully" } }` (200); invalid fields return 400, an existing account returns 403, and malformed JSON or creation failure returns 500. This public route is blocked in demo mode.

### GET, PUT /api/settings

GET takes no body and returns all settings in `{ data }` (500 on read failure). PUT accepts `{ key: "current_game", value: string }` with a value of at most 1,000 characters and returns `{ data: { key, value } }`; invalid JSON or fields return 400 and write failure returns 500. PUT is blocked in demo mode.

### POST /api/sync

Accepts `{ type: "pokeapi" }`; invalid JSON or fields return 400. A successful request streams [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) with `Content-Type: text/event-stream`.

The stream emits these events:

- `progress` — `{ stage, stageName, processed, total }` fired after each batch within a stage
- `complete` — `{ status, totalProcessed, totalFailed, stages }` when all stages finish
- `error` — `{ message }` if the sync throws

Manual and scheduled syncs share a SQLite owner-token lock. A claim expires after 30 minutes; release only clears a matching token, so an older run cannot release a newer claim. If a lock is held, the route returns 400 before streaming. See [Sync pipeline](/starting-six/architecture/sync-pipeline/).

This route is blocked in demo mode. Non-GET requests under `/api/sync` share a 3-token-per-minute tier (burst 3); exhaustion returns 429 with `Retry-After`.

### GET, PUT /api/sync/schedule

GET takes no body and returns `{ data: { enabled, frequency, lastAttemptAt, lastAttemptStatus, lastSuccessAt, attemptsToday, attemptsTodayDate } }`. Before a schedule row exists, it defaults to `enabled: false`, `frequency: "weekly"`, null dates/status, and zero attempts. Read failure returns 500.

PUT accepts `{ enabled: boolean, frequency: "weekly" | "monthly" }` and returns the same state after saving. Invalid JSON or fields return 400; save or read failure returns 500. PUT is blocked in demo mode and shares the non-GET `/api/sync` rate tier of 3 tokens per minute (burst 3), with 429 and `Retry-After` when exhausted. GET bypasses proxy rate limiting.

### GET /api/pokemon

Returns a paginated list of Pokémon. Accepts the following query params:

- `search` — name substring match, at most 200 characters
- `type` — string filter by primary or secondary type
- `generation` — integer from 1 to 9
- `versionGroupId` — positive integer; filters by game version group
- `page` — positive integer (default 1)
- `pageSize` — integer from 1 to 100 (default 48)

Response shape: `{ data: Pokemon[], meta: { page, pageSize, total, totalPages } }`. Invalid filters return 400; query failure returns 500.

### GET /api/pokemon/[id]/moves

The ID must parse as an integer. Pass `?include=abilities` for `{ data: { moves: Move[], abilities: Ability[] } }`; otherwise the response is `{ data: Move[] }`. Invalid ID returns 400, missing Pokémon returns 404, and query failure returns 500.

### GET, POST /api/playthroughs

GET takes no body and returns the user's playthroughs (500 on failure). POST accepts `{ name, versionGroupId, notes? }`: name is 1–100 characters, versionGroupId is a positive integer, and notes are at most 500 characters. Creation currently returns HTTP 200 with `{ data: playthrough, meta: { status: 201 } }`; invalid JSON or fields return 400, and creation failure returns 500.

### GET, PATCH, DELETE /api/playthroughs/[id]

The ID must parse as an integer. GET returns the playthrough and team. PATCH accepts optional `name` (1–100 characters), `notes` (at most 500 characters or null), `isCompleted` (boolean), and `versionGroupId` (positive integer), then returns the updated run. DELETE takes no body and returns `{ data: { deleted: true } }`. Invalid ID, PATCH JSON, or fields return 400; a missing or inaccessible run returns 404; caught failures return 500.

### GET /api/playthroughs/[id]/team

Takes no body; the ID must parse as an integer. Returns `{ data: TeamMember[] }`. Invalid ID returns 400, missing or inaccessible playthrough returns 404, and query failure returns 500.

### POST /api/playthroughs/[id]/team

The playthrough ID must parse as an integer. Accepts `{ pokemonId, nickname?, abilityId?, teraType? }`: IDs are positive integers, nickname is at most 50 characters, and teraType is one of the 18 Pokémon types. Returns `{ data: { ...member, benched } }`, with `benched: true` when all six active slots are full. Invalid ID, JSON, fields, or nonexistent Pokémon return 400; missing or inaccessible playthrough returns 404; caught failures return 500.

### PATCH /api/playthroughs/[id]/team/[memberId]

Handles three distinct operations in one route, disambiguated by the request body shape:

- Bench action (`{ action: "bench" }`) — moves an active member to the bench
- Activate action (`{ action: "activate", slot?: number }`) — optional slot is an integer from 1 to 6; returns 400 if no slots are available
- General update — optional nullable nickname (at most 50 characters), ability and all four move IDs (positive integers or null), and tera type (one of the 18 Pokémon types or null)

Both path IDs must parse as integers. Invalid ID, JSON, or fields return 400; a missing or inaccessible run or member returns 404; caught failures return 500. DELETE takes no body and returns `{ data: { deleted: true } }` with the same ID, ownership, and failure statuses.

### POST /api/playthroughs/[id]/team/swap

The playthrough ID must parse as an integer. Body: `{ benchMemberId: positive integer, activeSlot: integer from 1 to 6 }`. Returns `{ data: { swapped: true } }`. Invalid ID, JSON, or fields return 400; missing or inaccessible playthrough returns 404; swap failure returns 500. See [Bench and swap](/starting-six/design-decisions/bench-swap/).

### GET /api/playthroughs/[id]/analysis

Runs four pure-function analysis passes over the active team members and returns the results in a single response:

- `defense` — type coverage gaps and resistances
- `offense` — move type coverage
- `roles` — stat-based role classification (e.g., physical sweeper, wall)
- `abilities` — highlights of notable abilities
- `teamSize` — number of active team members analyzed

The ID must parse as an integer; invalid, missing, or inaccessible playthroughs return 404. An empty active team returns 400. Only active members are analyzed. Unexpected analysis errors are handled by the framework. See [Analysis internals](/starting-six/architecture/analysis-internals/).

## Demo mode

Four methods are blocked when `DEMO_MODE=true`: `POST /api/sync`, `PUT /api/sync/schedule`, `PUT /api/settings`, and `POST /api/setup`. Blocked requests receive 403 with `{ error: "This action is disabled in demo mode." }`. The proxy checks these before session validation. GET requests bypass its rate limiter; other API requests use 100 tokens per minute (burst 100) unless they match the `/api/sync` prefix. See [Demo mode](/starting-six/configuration/demo-mode/).

## Auth environment variables

Session signing requires `BETTER_AUTH_SECRET` to be set. See [Environment variables](/starting-six/configuration/environment-variables/) for the full list of required and optional env vars.
