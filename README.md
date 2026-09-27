# The Bartender's Ledger

An offline-first bartending study app. No frameworks, no build step, no tracking.
Open it once and it works on a plane: everything except the Coffee & Tea films is
local, and those are a thumbnail and a player that load only when you open a
lesson that has one, and degrade to text and two links when you are offline.

**365 cocktails · 75 shots · 85 zero-proof drinks · 37 prep recipes · 66 producers · 196 quiz questions**

## What it does

- **Tonight's Session** — one button deals your due reviews, a handful of new cards in canon order,
  a quiz round, and the day's physical drill. Two streaks are tracked: nights run, and nights you
  actually made drinks. Only the second one predicts a trail shift.
- **Spaced repetition** — SM-2-lite scheduling across every drink in the ledger, five flashcard modes
  (name→spec, spec→name, assemble the ticket, fill the missing line, service details).
- **Quiz rounds** by domain — mixed, service & law, beer & wine, spirits & craft, or blind tickets.
- **The Ticket Rail** — four tickets land at once. Build them against the clock, then check your
  sequencing against the answer key.
- **Behind the Stick** — beer and draught, wine service, the legal floor, the register, conflict and
  floor safety, glassware. The half of the job that isn't a cocktail.
- **The Library** — every spec on a ledger ticket with a balance breakdown and a history of the drink.
- **Tools** — batching with a warning engine, shelf inventory with an 86 drill, ABV and dilution,
  pour cost, unit conversion, and JSON export/import of your progress.
- **Practice** — nine logged drills with a stopwatch, a structured tasting journal, twelve guided flights.

## Run it locally

```bash
py serve.py 8631
```

Then open http://localhost:8631. Use `serve.py` rather than `python -m http.server` — it sends
`Cache-Control: no-cache` so edits appear on reload instead of hiding behind the browser cache.

## Install it

Served over HTTPS (or from localhost), it installs to a home screen or desktop as a standalone app
and works fully offline. All progress lives in this browser's `localStorage` — there is no account
and no server. Back it up from **Tools → My Data**.

## Deploying

Every path in the app is relative and the manifest uses `"start_url": "./"`, so it works from a
subdirectory (`example.github.io/BartendersLedger/`) as well as from a domain root. Any static host works.

After changing any file: bump the `?v=` query on the changed assets in `index.html` **and** bump
`CACHE` in `sw.js`. That version string is the entire update mechanism — installed copies show a
"new edition is pressed" toast and refresh on tap.

## Status

Private and in active development. Not published, not indexed, not open source.

## Licence

**© 2026 Zach Pullen. All rights reserved.** See [COPYRIGHT.md](COPYRIGHT.md). The specs, history
essays, curriculum and quiz bank are original work and are not openly licensed. Bundled fonts are
under the SIL Open Font Licence 1.1, which permits commercial use — see [fonts/NOTICE.md](fonts/NOTICE.md).

## For collaborators

Clone it, run `py serve.py 8631`, and open http://localhost:8631. There is no install step and no
build — the repo *is* the artifact. Read [CLAUDE.md](CLAUDE.md) first: it documents the script load
order (which matters — the files share one global scope), the cache-busting discipline for deploys,
and the data shapes you must not rename without a migration.

## Explorer's Library design (27 September 2026)

The production Ledger now uses `css/house.css`, loaded after the original layout
stylesheet. It styles every view: the illustrated Home entrance, compact interior
masthead, named levels, Library and reference shelves, paper recipe tickets,
flashcard faces, quizzes, practice, Menu, Tools, Record and search. The original
stylesheet supplies layout and the print edition; house.css is screen-only.

The presentation hook in `render()` sets `body.dataset.ledgerPage` and
`#view.dataset.tab`. Flashcards add `study-face`, `study-toolbar` and `study-modes`
classes without changing their content, grading or storage. Text remains live;
`img/explorers-library.webp` is decorative, has fixed intrinsic dimensions and
is precached with the self-hosted Cinzel and EB Garamond fonts. Font notices live
in fonts/NOTICE.md and fonts/house-OFL.txt.

Keep the skin and artwork byte-identical in BartendersLedger and the suite's
ledger directory. Change each tree's shell and cache stamps independently. Do not
copy a standalone shell, worker, app.js or ui-study.js over the suite: those files
carry intentional integration and wording differences. Existing content and
progress formats are unchanged.
