---
title: Why SQLite
description: Why Starting Six uses SQLite instead of Postgres, how Drizzle ORM sits on top of it, and what pragmas the app sets at startup.
---

Starting Six is a single-user, self-hosted app with a fixed data profile: a few thousand Pokémon rows, a similar number of moves and abilities, and small per-playthrough tables. SQLite fits that profile precisely. It needs no separate container, no credentials, and no backup tooling beyond copying one file. Postgres would add all three without providing anything in return at this scale.

## Data profile

After a full PokéAPI sync the database holds roughly:

- ~1,300 rows in `pokemon` (one per form/variant)
- ~900 rows in `moves`
- ~300 rows in `abilities`
- Associated join tables: `pokemon_moves`, `pokemon_abilities`, `game_pokemon`, `version_groups`
- Small user tables: `playthroughs`, `team_members`, `settings`, `sync_log`
- Better Auth tables: `user`, `session`, `account`, `verification`

The entire database fits comfortably in single-digit megabytes. Concurrent writers are essentially one: the app itself. Concurrent readers are low — this is a self-hosted single-user tool, not a service. Nothing about that profile demands a server-process database.

## Why not Postgres

Postgres is the right call when you need write concurrency across multiple connections, a network-accessible data tier, complex analytical queries over large datasets, or a managed PaaS like RDS. Starting Six has none of those requirements.

Adding Postgres to this stack would mean a second container in `docker-compose`, a network dependency between containers, credential management in the env file, and a separate backup strategy. The payoff — better concurrency at scale — isn't relevant here. The cost is real, and ongoing.

Swapping to Postgres later is plausible. Drizzle abstracts the dialect: the schema definitions in `src/lib/db/schema.ts` and the query builder would carry over with targeted changes, and `drizzle.config.ts` exposes `dialect` as a single field. There's no current pressure to make that move.

## Drizzle ORM

The app uses `drizzle-orm` with the `better-sqlite3` driver (`drizzle-orm/better-sqlite3`). Drizzle earns its place here for a few reasons. The schema in `src/lib/db/schema.ts` is the single source of truth — table shapes, column types, foreign keys, and indexes all live there. The query builder stays close to SQL without hiding it, so queries read predictably. And `drizzle-kit` handles the migration workflow: `db:generate` produces SQL migration files into `drizzle/`, and `db:push` applies the current schema directly for development.

`drizzle.config.ts` sets `dialect: 'sqlite'` and defaults the database URL to `./data/starting-six.db`, overrideable via the `DATABASE_URL` env var.

## WAL mode and pragmas

The `better-sqlite3` connection in `src/lib/db/index.ts` sets several pragmas at startup:

```ts
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = 1000000000');
sqlite.pragma('foreign_keys = true');
sqlite.pragma('temp_store = memory');
```

`journal_mode = WAL` (write-ahead logging) lets readers proceed concurrently with a writer. That matters here because the six-stage PokéAPI sync writes thousands of rows while the UI remains readable. Without WAL, any ongoing write would block reads entirely.

`busy_timeout = 5000` tells SQLite to wait up to 5 000 ms before returning a "database is locked" error if another write is in progress, rather than failing immediately.

`synchronous = NORMAL` reduces the number of fsync calls compared to the default `FULL` mode. It's safe for WAL mode — the only data at risk during a hard crash is the last committed transaction, which is an acceptable trade for a personal app.

`foreign_keys = true` enforces referential integrity, which SQLite disables by default.

`cache_size = 1000000000` and `temp_store = memory` keep working data in memory rather than spilling to disk, which matters during the large sync.

## Single-file backup

The entire database is `./data/starting-six.db` (or whatever `DATABASE_URL` points to). Backup is a file copy. The Docker Compose setup maps `./data` as a bind mount, so the file lives on the host and survives container restarts and rebuilds.

There are no dedicated backup scripts in `scripts/` — the project doesn't ship one. For a quick consistent copy, SQLite's `VACUUM INTO '/path/to/backup.db'` produces an atomic snapshot without stopping the app. For simple file-level backup, copying the file while the app is idle (or during low-write periods) is sufficient at this scale.

## Trade-offs and honest limits

SQLite gives up a few things worth knowing:

- No true write concurrency. If two requests write at the same time, one waits. With `busy_timeout = 5000` set, the wait can be up to 5 seconds before an error surfaces. At single-user scale this is rarely noticeable, but it would become a problem with multiple simultaneous users.
- No network access. The database file lives on the container's disk. Querying it remotely requires either exposing the file directly or running a tunnel. Drizzle Studio (`npm run db:studio`) is the supported way to inspect the database from a local machine.
- No hosted PaaS option. You own the volume and its contents. If the volume disappears, so does the data.

These are the right trade-offs for a single-user self-hosted app. If Starting Six ever ran multi-tenant, the calculus flips and a Postgres migration would be the correct next step.

---

For the table-by-table breakdown see [Database schema](/starting-six/architecture/database-schema/).

For why the app bulk-syncs PokéAPI data into the database instead of calling the API live, see [Bulk sync vs. live API](/starting-six/design-decisions/bulk-sync/).
