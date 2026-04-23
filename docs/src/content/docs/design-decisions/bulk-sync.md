---
title: Bulk sync vs. live API
description: Why Starting Six bulk-syncs PokéAPI into SQLite at setup and never calls it again during normal operation.
---

Starting Six calls PokéAPI once — during the initial sync — and then never again in the hot path. Every page load, team build, filter query, and analysis call reads from local SQLite. If PokéAPI goes down after your first sync, nothing breaks.

## Why cache-first

**Speed.** A SQLite read takes microseconds. A PokéAPI round-trip takes 50–500ms, plus whatever your network is doing that day. The team builder, Pokédex browser, and analysis engine all fan out across many rows; doing that live would make the app feel sluggish in a way that's hard to paper over with spinners.

**Reliability.** PokéAPI has had outages. It's a free service run by volunteers. Building the app to require it at render time would mean PokéAPI's uptime becomes Starting Six's uptime, which isn't a trade worth making.

**Determinism.** Team analysis is a pure function over local data. The same team returns the same coverage result whether PokéAPI is up, down, rate-limiting, or returning a slightly different payload than it did yesterday.

**Rate-limit hygiene.** PokéAPI is free and community-operated. Hitting it on every page load — across potentially many concurrent users — would be rude and would eventually get the app throttled. The bulk sync approach pulls each resource once, caches it forever (until re-sync), and stays well within polite usage.

## What PokéAPI is called for

### During sync only

All calls to PokéAPI go through `src/lib/pokeapi/client.ts`. That client is only imported by the four sync modules — `src/lib/sync/games.ts`, `src/lib/sync/pokemon.ts`, `src/lib/sync/abilities.ts`, and `src/lib/sync/moves.ts`. Nothing outside `src/lib/sync/` imports it.

The sync pipeline is triggered by `POST /api/sync`, which requires an authenticated session and streams progress back over SSE. That's the only entry point.

### Not called in the hot path

Once sync is complete, PokéAPI is out of the picture entirely. Team building, Pokédex browsing, filtering, analysis, playthrough CRUD, and auth all read from or write to SQLite directly. There is no fallback that calls PokéAPI if a query returns empty — if the data isn't in the database, it isn't in the app.

## What breaks if PokéAPI goes down

If your database is already populated: nothing. The app continues to function normally.

If PokéAPI goes down mid-sync, or you haven't synced yet, you'll see whatever error the affected sync stage emits. The client retries each request up to three times with exponential backoff (delays of 1s and 2s before the final attempt), so transient blips usually self-heal. If the outage lasts longer, the sync fails gracefully — the pipeline logs the failure to `sync_log` and reports how many items succeeded and how many failed, rather than throwing an unhandled error.

For the full retry and failure-handling details see [PokéAPI sync pipeline](/starting-six/architecture/sync-pipeline/).

## Re-sync path

When you want fresher data — PokéAPI added a new ability, a new generation shipped, or a stage failed partway through — go to `/settings/system` and run the sync again. You can also trigger it directly with `POST /api/sync`.

Re-running is safe. Every stage checks the relevant table's row count before doing any network work. Stages that already have data return `skipped: true` and the pipeline moves on. Stages that are empty or partially populated run their fetch. Existing rows are upserted, not wiped. You won't lose playthroughs or team data by re-syncing.

## Trade-offs and where this breaks down

The app's Pokédex data is frozen at whenever you last synced. If PokéAPI adds new Pokémon, moves, or games, they won't appear until you re-run the sync. This is intentional — the app shows a sync timestamp in `/settings/system` (backed by the `sync_log` table) so you can see how fresh your data is.

If a future feature needed PokéAPI data that the current sync pipeline doesn't pull — evolution chains are one example worth checking if you're extending the pipeline — you'd have to add a new stage or extend an existing one. The orchestrator in `src/lib/sync/index.ts` runs stages sequentially and is straightforward to extend.

These trade-offs are acceptable for a project that uses a mostly-static Pokédex as its data source. If the requirement were "always reflect PokéAPI changes within minutes of them going live," the calculus would change. For a personal team builder, syncing on demand is the right call.

---

For the stage-by-stage pipeline and retry details see [PokéAPI sync pipeline](/starting-six/architecture/sync-pipeline/).

For why local data lives in SQLite instead of Postgres see [Why SQLite](/starting-six/design-decisions/why-sqlite/).
