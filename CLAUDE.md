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
  The stock panel that used to live here is the Menu tab's Stock view now; the engine
  (`SHELF`, `missingFor`, `bestNextBottles`, `eightySixReport`) stayed in `engine.js`.
- `js/ui-reference.js` — shots, zero proof, producers
- `js/ui-prep.js` — prep room, video-link builders
- `js/ui-menu.js` — Menu: the venue's own list, the bar's stock, and what can be poured right now
- `js/menu-parse.js` — a page of menu text into rows (ported from the World Table, wrapped)
- `js/menu-drinks.js` — those rows read as drinks. NEVER invents a quantity
- `js/menu-read.js` — the photograph and address doors (ported; no downloaded OCR engine, no CORS proxy)
- `js/ui-import.js` — the four doors and the review step
- `js/ui-new.js` — nav clusters, hash router, search overlay, SVG charts, riff critique, ornaments/glass icons, export/import
- `js/app.js` — `render()`, the one delegated click handler (`data-act`), keyboard shortcuts, boot, SW registration
- `sw.js` — cache-first service worker, explicit precache list

## Checks

`node tools/check.mjs` — the first gate. Family standards (3–5 observable marks
and a fault per family, every cocktail's family resolves, no mark names a
specific drink, forked-method marks carry a condition word) plus the closures:
LORE↔COCKTAILS both ways, unique slugs per routed collection (through the app's
own `slugify`, extracted from ui-new.js at run time), SHELF preset ids resolve,
`sw.js` ASSETS agrees with index.html both directions (including fonts
referenced from CSS, icons from HTML, and manifest icons), and a commit that
changes any cached asset after the last sw.js change without bumping CACHE
fails the build. Run it after any data or asset edit; every check has been
proven able to fail.

`node tools/check-ingredients.mjs` — the second gate, over the ingredient
vocabulary in js/data-ingredients.js. It exists because what it checks failed
silently for years: 104 regexes stood where the vocabulary is now, and a spec
line no pattern matched became a need the matcher could not see. A need it
could not see was a need that did not exist, so a drink whose spirit was
unreadable read as MAKEABLE. 169 of 817 spec lines matched nothing, and the
Zero-proof station preset, a shelf with no alcohol on it, offered a Hot Toddy
and a Whiskey Highball. Nothing on screen said so.

It checks: every spec line in COCKTAILS, SHOTS and NA_DRINKS resolves to an
ingredient or a declared NOTE_LINES instruction; the vocabulary is well formed
(parents exist, no cycles, no id or alias claimed twice); every requirement is
reachable from some stock chip, which is what makes strict upward substitution
safe rather than a silent trap; no drink requires nothing at all; preset ids
resolve; the 104 pre-vocabulary shelf ids all still land somewhere under
`migrateShelf`, which is frozen as a literal in the check file so that deleting
a row cannot make the check vacuously pass; and the alcohol-free shelf claims
exactly one cocktail, the Nojito, which is a real mocktail. Honour
`LEDGER_JS=<dir>` to run it against another build.

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
  (`cards{r,w,ef,ivl,reps,due,last}`, `quizzes`, `practice`, `tastings`, `vidPrefs`, `shelf`, `bar`, `eightySix`, `eightySixAt`, `pours`, `bottles`, `spills`, `openBottles`, `streakData`).
  **Every new progress field needs a named clause in `dataImport`'s merge** — unnamed
  incoming stores are silently ignored, which is right for prefs and wrong for records.
  All changes must be additive; `srsMigrate` is idempotent and runs at boot.
- **The Menu tab is called Menu; its records still say `My Bar`.** `cardKey()` is
  `src + ' · ' + name` and `src` comes from `DECK_SOURCES`, so the literal
  `'My Bar'` is a PRIMARY KEY baked into every SRS record and every backup ever
  exported, as well as a filter value in six engines. `srcLabel()` in `ui-study.js`
  is the join: route it through every site that PRINTS a source, leave the literal
  at every site that COMPARES one. Renaming the key would strand every record or
  blind the orphan sweep in `dataImport`, and both failures are silent.
  `TAB_WAS` in `ui-new.js` heals old `#/mybar/<slug>` links.
- **The importer never invents a quantity.** A menu prints ingredients and no
  measures. An ounce invented anywhere in `js/menu-drinks.js` reaches `lineOz`,
  and from there `balanceOf`, `estimateABV`, the batch sheet and the pour-cost
  sheet, so a bartender is shown a printed percentage that came from nowhere.
  `tools/check-import.mjs` runs the REAL `lineOz` over every produced spec line
  and asserts it is 0. The book's measures are offered as an explicit one-tap
  fill and never applied in bulk. Blank is a true answer; a guess is not.
- **`tools/check-import.mjs` is the third gate**, 111 cases: the World Table's
  own `menu-parse` and `menu-link` suites ported from vitest to `node:test` and
  pointed at the SHIPPED files through `vm`, plus the cocktail cases written
  here. The food fixtures are kept verbatim on purpose: they exercise the same
  code path and rewriting them as cocktails would drop coverage while looking
  like work.
- **Live inputs**: `render()` rebuilds `#view`, eating anything typed into an input.
  `captureLiveInputs()` in app.js grabs the known live fields into state before every
  delegated-handler render — add any NEW live input's id to that list when you mint one.
- **Wing sync**: the OutsideOfTime wing (`OutsideOfTime/ledger/`) diverges deliberately
  (OOT.profiles `KEY()` in engine/app, TILE_BANDS home in ui-study, nav re-clustering in
  ui-new). Sync = three-way `git merge-file -p wing base new` per file with base = the
  last synced upstream commit (currently `ff3569e`); lineage-check both inheritances;
  bump wing `?v=`/CACHE past the WING's own numbers (wing CACHE is at ledger-v42).
- **Shared helpers with mirror rules**: `specUnits()` in engine.js splits 'oz each:'
  lines — balanceOf and estimateABV both read through it; `strengthBand()` in
  engine.js is the one served-ABV scale (the Tools panel and the Dealer's Choice
  quiz both use it — never fork a second scale).
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
