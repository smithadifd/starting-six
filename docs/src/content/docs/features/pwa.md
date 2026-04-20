---
title: PWA and offline use
description: How Starting Six installs as a PWA, what the service worker caches, and the honest limits of offline use for a server-side app.
---

Starting Six is installable as a Progressive Web App on desktop and mobile. A service worker caches the app shell so it loads quickly from cache on repeat visits. What it does not do is cache your team data in the browser — that lives in SQLite on the server, so the server still needs to be running for the app to function.

## Installing the app

On desktop Chrome (and most Chromium-based browsers), an install icon appears in the address bar once the PWA criteria are met. Click it to install Starting Six as a standalone window with no browser chrome.

On Android, the browser shows an "Add to Home Screen" prompt, or you can trigger it manually from the browser menu. On iOS, use Safari's Share sheet and tap "Add to Home Screen."

Once installed, the app opens in `standalone` display mode with the dark background color (`#1a1a2e`) matching the manifest. The name shown in the launcher is "Starting Six" (short name from the manifest). Icons are provided at 192x192 and 512x512, with maskable variants for Android adaptive icons.

## Service worker

Starting Six uses [Serwist](https://serwist.pages.dev/) v9, the community successor to `next-pwa`, via the `@serwist/turbopack` adapter. The entry point is `src/app/sw.ts`. The SW is served from `/serwist/sw.js` by a catch-all route handler at `src/app/serwist/[path]/route.ts`.

The service worker does two things:

**Precaching.** At build time, Serwist injects the full list of static assets into `self.__SW_MANIFEST`. The SW precaches all of them, including the root URL (`/`), stamped with the current git commit hash as the revision. This means the app shell loads instantly from cache on repeat visits, even before any network request completes.

**Runtime caching.** The SW uses `defaultCache` from `@serwist/turbopack/worker`, which applies Serwist's built-in runtime caching strategy to navigation requests and static assets. This covers things like fonts, scripts, and stylesheets that weren't precached at build time.

Two flags are set explicitly:

- `skipWaiting: true` — a new SW activates immediately on install rather than waiting for all tabs to close.
- `clientsClaim: true` — the newly activated SW takes control of all open pages without a reload.
- `navigationPreload: true` — the browser starts the network request for a navigation before the SW fully boots, which reduces latency on first load.

## What works offline (and what doesn't)

Starting Six is not an offline-first app in the CouchDB/PouchDB sense. There is no client-side database, no sync queue, and no conflict resolution. Here is the actual picture:

**Works from cache:**

- The app shell loads. You'll see the layout, navigation, and loading states.
- Previously visited routes render their cached HTML shells.

**Requires the server:**

- All team, playthrough, and Pokémon data comes from API routes that query the SQLite database on the server. If the server is unreachable, these calls fail and you'll see empty states or error messages.
- PokéAPI sync (the initial data population step) requires both the server and outbound internet access.
- All mutations — creating playthroughs, adding team members, updating settings — go through server-side API routes.

The practical upshot for a self-hoster: as long as your server is on the local network, the installed PWA behaves like a native app. The service worker buys you fast cold starts and eliminates the browser chrome, not true disconnected operation.

## Manifest and theme

The web app manifest is at `public/manifest.json`. Key values:

| Field | Value |
| --- | --- |
| `name` | Starting Six - Pokemon Team Builder |
| `short_name` | Starting Six |
| `display` | `standalone` |
| `start_url` | `/` |
| `background_color` | `#1a1a2e` |
| `theme_color` | `#1a1a2e` |

The layout also sets `appleWebApp` metadata for iOS home screen behavior (status bar style `black-translucent`, title "Starting Six") and a viewport with `viewportFit: cover` for edge-to-edge display on notched devices.

---

For how data flows from PokéAPI into the local database, see [Architecture overview](/starting-six/architecture/overview/).

For the environment variables that control the app, see [Environment variables](/starting-six/configuration/environment-variables/).
