---
title: Environment Variables
description: Every environment variable the app reads, whether it is required, and its default.
---

Environment variables are loaded from `.env.local` in development and passed in via `docker-compose.prod.yml` (or an `--env-file`) in production. The source of truth for what the app actually reads is `src/lib/config.ts`; `.env.example` is the template you copy when setting up a new environment.

## Required

|Variable|Description|Example|
|---|---|---|
|`BETTER_AUTH_SECRET`|Secret key used by Better Auth to sign and encrypt sessions. Generate with `openssl rand -base64 32`.|`k3f9...==`|

## Optional

|Variable|Default|Description|
|---|---|---|
|`DATABASE_URL`|`./data/starting-six.db`|Path to the SQLite database file. In the production container this is set to `/app/data/starting-six.db` and backed by the `starting_six_data` volume.|
|`APP_URL`|`http://localhost:3000`|Base URL of the app. In `docker-compose.prod.yml` this is used to populate `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` at build time, falling back to `https://starting-six.home`.|
|`BETTER_AUTH_URL`|`http://localhost:3000`|URL Better Auth uses to build callback and cookie origins.|
|`DEMO_MODE`|unset|Set to `true` to enable demo mode on the server (blocks mutations, disables sync, shortens sessions).|

## Public (client-side) variables

`NEXT_PUBLIC_*` variables are inlined into the client bundle at build time, not read at runtime. In the production Docker image they must be passed as build args, not just runtime environment — `docker-compose.prod.yml` does this via the `NEXT_PUBLIC_APP_URL` build arg.

- `NEXT_PUBLIC_APP_URL` — absolute URL of the app, used by client code that needs an origin.

Changing this requires a rebuild, not just a container restart.

## Demo mode

Setting `DEMO_MODE=true` on the server turns the deployment into a public demo: mutation endpoints return 403, PokéAPI sync is blocked, registration is disabled, and session expiry drops to 24 hours. The login page does not display the demo credentials — they live in the repo's README and these docs instead, so the demo stays pointed at visitors who find the project through GitHub or the docs site. See [Demo Mode](/starting-six/configuration/demo-mode/) for the full behavior.
