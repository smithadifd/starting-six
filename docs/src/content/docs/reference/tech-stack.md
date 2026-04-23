---
title: Tech stack
description: Every meaningful dependency in Starting Six, with versions and a brief note on why each is here.
---

Starting Six is a Next.js 16 app built on React 19 and TypeScript strict mode, persisting data to SQLite via Drizzle ORM. It runs in a single Docker container with no external database process. The stack deliberately mirrors Andrew's other self-hosted projects (hoard, investing_companion) — shared knowledge across codebases matters more than picking different tools for novelty.

## Packages and versions

| Category | Package | Version | Purpose |
| --- | --- | --- | --- |
| Runtime | Node.js | 22 LTS | Pinned in `.nvmrc` and Dockerfile base image (`node:22-alpine`) |
| Framework | `next` | ^16.2.2 | App Router, Server Components, standalone output mode |
| Framework | `react` / `react-dom` | ^19.2.4 | UI rendering |
| Language | `typescript` | ^5.6.0 | Strict mode, target ES2017, bundler module resolution |
| Database | `drizzle-orm` | ^0.45.2 | Type-safe SQL query builder, SQLite dialect |
| Database | `drizzle-kit` | ^0.31.10 | Migration tooling (`db:generate`, `db:push`, `db:studio`) |
| Database | `better-sqlite3` | ^12.8.0 | Synchronous SQLite driver; runs server-side only |
| Auth | `better-auth` | ^1.4.18 | Credentials-based session auth |
| Validation | `zod` | ^4.3.6 | Schema validation on API inputs and env vars |
| UI | Radix UI primitives | ^1-2.x | Accessible headless components (dialog, dropdown, select, tabs, tooltip, progress) |
| UI | `tailwindcss` | ^3.4.0 | Utility-first styling with CSS variable color tokens |
| UI | `lucide-react` | ^1.6.0 | Icon set |
| UI | `sonner` | ^2.0.7 | Toast notifications |
| UI | `class-variance-authority` / `clsx` / `tailwind-merge` | ^0.7 / ^2.1 / ^3.4 | Component variant utilities |
| PWA | `@serwist/turbopack` + `serwist` | ^9.5.7 | Service worker via Serwist; hooked into Next.js via `withSerwist` |
| Testing | `vitest` | ^4.1.4 | Unit and integration tests |
| Testing | `@vitest/coverage-v8` | ^4.1.4 | Coverage reports |
| Linting | `eslint` / `eslint-config-next` | ^9.39.2 / ^16.2.2 | Flat config, zero-warning policy |

### TypeScript config

`tsconfig.json` has `strict: true`, `target: "ES2017"`, and `moduleResolution: "bundler"`. The `@/*` path alias maps to `src/`. `better-sqlite3` is listed in `serverExternalPackages` in `next.config.ts` so Next.js does not try to bundle it.

## Why these choices

Some of these are obvious defaults; a few are worth a brief explanation.

**SQLite over Postgres.** Starting Six is single-user and self-hosted. The full database after a PokéAPI sync fits in single-digit megabytes. SQLite means one fewer container, no credentials to manage, and backup is copying one file. See [Why SQLite](/starting-six/design-decisions/why-sqlite/) for the full reasoning and trade-offs.

**Hardcoded type chart.** Pokemon type matchups are static game data. Rather than deriving them at runtime from PokéAPI, the app ships a hardcoded lookup table. See [Type chart](/starting-six/design-decisions/type-chart/) for why that's the right call.

**Bulk sync, not live API calls.** PokéAPI data syncs into SQLite on demand; the UI never calls PokéAPI directly. This keeps pages fast and the app functional offline. See [Bulk sync vs. live API](/starting-six/design-decisions/bulk-sync/) for the details.

**Serwist for the service worker.** The app is a PWA. Serwist integrates with Next.js's Turbopack build and handles precaching of the static shell, making the app installable and partially usable offline without writing service worker code by hand.

## License

Starting Six is open source under the [MIT License](https://github.com/smithadifd/starting-six/blob/main/LICENSE).
