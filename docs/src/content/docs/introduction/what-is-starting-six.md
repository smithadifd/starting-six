---
title: What is Starting Six?
description: Two-paragraph intro to Starting Six with live demo link and feature summary.
---

Starting Six is a self-hosted web app for planning a Pokemon playthrough team before you boot up the game.

A playthrough team is the six Pokemon you commit to for a single run. In practice, most teams get picked on the fly — you grab a starter, catch whatever looks cool on Route 3, and end up with three Water types and no answer for the Elite Four. Starting Six lets you lay out all six slots up front, tied to a specific game, so you can see what you're actually walking into.

Once a team is saved, the analysis engine runs a Gen 9 type chart against it and reports defensive weaknesses, offensive coverage gaps, role distribution from base stats, and notable abilities. Pokemon data syncs from PokeAPI into a local SQLite database on first run, so everything after that is offline and fast. The app is installable as a PWA.

## Try it

Live demo: [starting-six.smithadifd.com](https://starting-six.smithadifd.com). Sign in with `demo@example.com` / `demo1234!`. Data resets weekly and mutations are disabled.

## Features

- Pokemon browser with search and filters for name, type, generation, and stats
- Playthrough management tied to specific games, each with a 6-slot team
- Team builder with move, ability, and Tera type selection per slot
- Type analysis engine covering defensive coverage, team weaknesses, role distribution, and gap detection
- Full learnset and ability pool browsing per Pokemon
- PWA install with offline support after initial sync
- Self-hosted, with all data kept local

## Source and license

Source at [github.com/smithadifd/starting-six](https://github.com/smithadifd/starting-six), MIT licensed.
