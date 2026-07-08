# Screenshot shot list

The README screenshots in this directory were captured against the live public demo
(<https://starting-six.smithadifd.com>) with Playwright (headless Chromium, 1440×900 viewport
at 2× device scale). This file documents each shot so they can be re-captured consistently after
UI changes.

Because the demo resets every Sunday (4am UTC), the seeded "Scarlet Nuzlocke" playthrough used
below may be re-seeded with different data over time — re-capture from whatever demo playthrough
has a full six-member team.

## Login

- Go to `/login`, sign in with the demo credentials from the README
  (`demo@example.com` / `demo1234!`).

## `team-builder.png`

- Open a seeded playthrough with a full 6-member team (e.g. `/playthroughs/2`).
- Frame the team grid: the run title, "Adventure Team 6/6", and all six member cards
  (species, moves, ability, Tera type).

## `analysis-panel.png`

- On the same playthrough page, scroll to the **Team Analysis** section and click
  **"Click to analyze"** to expand it.
- Scroll so **Defensive Coverage** sits near the top of the frame; capture the defensive grid,
  the offensive-coverage bar, and the start of Team Roles.

## `pokemon-browser.png`

- Go to `/pokemon`.
- Frame the virtualized grid with the search bar and the type/generation filters visible.

## Notes

- Capture at 2× scale for crisp images; the "Demo Mode" banner at the top is expected and fine
  to include.
- If the live demo is unreachable, capture the same views from a local dev instance
  (`npm run dev`, seed a playthrough manually).
