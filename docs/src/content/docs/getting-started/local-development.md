---
title: Local Development
description: Install dependencies, push the schema, and run the dev server.
---

For running the app outside Docker against a local SQLite file.

## Prerequisites

- Node 22 (pinned in `.nvmrc`)
- npm
- git

## Install and run

```bash
git clone https://github.com/smithadifd/starting-six.git
cd starting-six
cp .env.example .env.local   # set BETTER_AUTH_SECRET before starting
npm install
npm run db:push
npm run dev
```

The dev server starts on `http://localhost:3000`.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the production bundle. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint with `--max-warnings 0`. |
| `npm run db:generate` | Generate Drizzle migration files from the schema. |
| `npm run db:migrate` | Apply generated migrations to the database. |
| `npm run db:push` | Push the current schema directly to the database. |
| `npm run db:studio` | Launch Drizzle Studio for browsing the database. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run Vitest with v8 coverage. |

## Testing

Tests run on Vitest. Use `npm test` for a single run or `npm run test:watch` while iterating. Coverage via `npm run test:coverage` uses the v8 provider and is scoped to `src/lib/**/*.ts` (excluding `src/lib/db/index.ts`).

## Linting

`npm run lint` runs `eslint . --max-warnings 0`, so any warning fails the command.

## Database

`npm run db:push` applies the current Drizzle schema (`src/lib/db/schema.ts`) to the SQLite file at `./data/starting-six.db` — override the location with the `DATABASE_URL` env var. `npm run db:studio` opens Drizzle Studio for inspecting tables and rows.
