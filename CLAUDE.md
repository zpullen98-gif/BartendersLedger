# The Bartender's Ledger — PWA

Installable, offline-first bartending study app. Vanilla JS, no frameworks, no build step.
Split from a single-file claude.ai artifact into this project (Aug 2026).

## Run it

```bash
py serve.py 8631
```

Then open http://localhost:8631. Use `serve.py` (not `python -m http.server`) — it sends
`Cache-Control: no-cache` so edits show up on reload.

## Architecture

- `index.html` — shell + script tags. **Load order matters**: classic scripts share one
  global scope; everything loads in original source order. Asset URLs carry `?v=N`.
- `js/data-core.js` — COCKTAILS (365, tiers 1–12), FAMILIES, KNOWLEDGE, STUDY
- `js/engine.js` — helpers, `store`/`progress` persistence, balance engine, riff dealer, state
- `js/data-questions.js` — scenario/knowledge question packs
- `js/data-lore.js` — LORE (a story for all 365 cocktails) + GLOSSARY (68 terms)
- `js/data-service.js` — **Behind the Stick**: SERVICE_STUDY (6 sections, 105 rows: beer/draught, wine, law & refusal, register, conflict & safety, glassware), SERVICE_REF (81 reference entries), and ~106 topic-tagged KNOWLEDGE questions
- `js/srs.js` — SM-2-lite scheduler (`scheduleCard`, `srsMigrate`, `srsForecast`)
- `js/ui-study.js` — home (+dashboard), families, library (+print mode), flashcards, quiz, notes, riffs
- `js/ui-practice.js` — tasting room, practice drills, tools (batching/ABV/cost/convert/**My Data**)
- `js/ui-reference.js` — shots, zero proof, producers
- `js/ui-prep.js` — prep room, video-link builders
- `js/ui-mybar.js` — My Bar: the venue's own list, drilled by the same engines
- `js/ui-new.js` — nav clusters, hash router, search overlay, SVG charts, riff critique, ornaments/glass icons, export/import
- `js/app.js` — `render()`, the one delegated click handler (`data-act`), keyboard shortcuts, boot, SW registration
- `sw.js` — cache-first service worker, explicit precache list

## Checks

`node tools/check.mjs` — the first gate. Family standards (3–5 observable marks
and a fault per family, every cocktail's family resolves, no mark names a
specific drink, forked-method marks carry a condition word) plus the closures:
LORE↔COCKTAILS both ways, unique slugs per routed collection (through the app's
own `slugify`, extracted from ui-new.js at run time), SHELF preset ids resolve,
and `sw.js` ASSETS agrees with index.html both directions. Run it after any
data or asset edit; every check has been proven able to fail.

## Update discipline (deploying a change)

1. Edit files.
2. Bump `?v=N` on the changed files' URLs in `index.html` (any new number).
3. **Bump `CACHE` in `sw.js`** (`ledger-v2` → `ledger-v3`). This is the whole update
   mechanism — installed clients show a "new edition is pressed" toast, tap to refresh.
4. If you add a file, add it to `ASSETS` in `sw.js` AND a `<script>`/`<link>` tag.

## Dev gotchas (hard-won)

- **Stale caches**: `?nosw` in the URL skips SW registration. The SW precaches with
  `cache:'reload'` requests so it never snapshots the browser's stale HTTP cache.
- **bfcache**: navigating to an already-visited URL can restore the old JS heap without
  re-executing scripts. When testing, use a unique query string (`?fresh=anything`).
- **Progress data**: localStorage key `bartenders-ledger-v1`. Never rename fields
  (`cards{r,w,ef,ivl,reps,due,last}`, `quizzes`, `practice`, `tastings`, `vidPrefs`, `shelf`, `bar`, `pours`, `bottles`, `spills`, `openBottles`, `streakData`).
  **Every new progress field needs a named clause in `dataImport`'s merge** — unnamed
  incoming stores are silently ignored, which is right for prefs and wrong for records.
  All changes must be additive; `srsMigrate` is idempotent and runs at boot.
- **Live inputs**: `render()` rebuilds `#view`, eating anything typed into an input.
  `captureLiveInputs()` in app.js grabs the known live fields into state before every
  delegated-handler render — add any NEW live input's id to that list when you mint one.
- **Wing sync**: the OutsideOfTime wing (`OutsideOfTime/ledger/`) diverges deliberately
  (OOT.profiles `KEY()` in engine/app, TILE_BANDS home in ui-study, nav re-clustering in
  ui-new). Sync = three-way `git merge-file -p wing base new` per file with base = the
  last synced upstream commit (currently `2d71f34`); lineage-check both inheritances;
  bump wing `?v=`/CACHE past the WING's own numbers (wing CACHE is at ledger-v41).
- **Adding drinks**: LORE is keyed by exact `name`. Router slugs come from `slugify(name)`.
- **Quiz questions** carry an optional `topic` (`service` | `beerwine` | `craft`). Legacy entries
  have none: `topicOf()` sends anything starting "SCENARIO —" to `service`, everything else to `craft`.
  `buildRound(mode)` shuffles options — never pass `k.options` through unshuffled, since most
  authored entries put the answer in slot 2.
- **Drills**: a `hidden:true` DRILLS entry (e.g. `rail`) charts on the dashboard but is skipped by the
  drills list — that's how the Ticket Rail lives in its own view. `pick:N` makes the drill deal its own subjects.
- **Streak**: `progress.streakData = {last, n, hands, lastHands}`. A night counts on cards+quiz;
  only a logged physical drill increments `hands`. Breaking the streak resets both.

## Icons

`icons/icon.svg` is the master. Regenerate PNGs with `@resvg/resvg-js`
(see git-less scratch script pattern: render at 512/192/180 + maskable at 80% on felt).
