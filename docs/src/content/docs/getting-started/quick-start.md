---
title: Quick Start (Docker)
description: Clone the repo, set required env vars, run Docker Compose, and complete first-run setup.
---

## Prerequisites

- Docker with Compose
- `git`

Nothing else needs to be installed on the host. The Dockerfile builds with `node:22-alpine` internally.

## 1. Clone the repo

```bash
git clone https://github.com/smithadifd/starting-six.git
cd starting-six
```

## 2. Set environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and set `BETTER_AUTH_SECRET`. Compose will refuse to start without it. Generate one with:

```bash
openssl rand -base64 32
```

The other values in `.env.example` (`DATABASE_URL`, `BETTER_AUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`) have sensible defaults for local use.

## 3. Start the container

```bash
docker compose up -d
```

The `app` service binds to host port `3000` (mapped to `3000` inside the container) and persists SQLite data to `./data` on the host.

## 4. First-run setup

1. Open `http://localhost:3000` in a browser.
2. Create your first account at `/setup`.
3. Go to `/settings/system` and trigger the PokeAPI sync.

The initial sync pulls ~1,000 Pokemon plus moves and abilities and takes roughly 15-25 minutes. Progress streams live over SSE. See [First Run & PokeAPI Sync](/starting-six/getting-started/first-run/) for what to expect stage by stage.

## Updating

```bash
git pull
docker compose up -d --build
```
