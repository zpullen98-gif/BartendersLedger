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
- `js/data-core.js` — COCKTAILS (365, in twelve named books: `c.tier` is a drink's key into `TIER_NAMES`, and `BOOK_ORDER` is the order they read in), FAMILIES, KNOWLEDGE, STUDY
- `js/engine.js` — helpers, `store`/`progress` persistence, balance engine, riff dealer, state
- `js/data-questions.js` — scenario/knowledge question packs
- `js/data-lore.js` — LORE (a story for all 365 cocktails) + GLOSSARY (68 terms)
- `js/data-service.js` — **Behind the Stick**: SERVICE_STUDY (5 sections, 82 rows: wine, law & refusal, register, conflict & safety, glassware), SERVICE_REF (67 reference entries), and 87 topic-tagged KNOWLEDGE questions
- `js/data-ontap.js` — **On Tap**: ONTAP_STUDY (11 sections, 110 rows: the pour, beer-clean glass, the system, gas & balance, cask/pumps/growlers, tasting & faults, cellar & condition, the styles, how beer is made, cider & perry, sake & mead), ONTAP_REF (115 cards: 63 styles under `dom:"styles"`, 17 faults under `dom:"faults"`, 14 under `dom:"cider"`, 21 under `dom:"sake"`; **all 115 are a flashcard deck source, so a name is a primary key**), and 115 KNOWLEDGE questions. A card's facts are per family, not per tab: cider and mead carry a Sweetness row and sake carries Sweetness plus Polish, which is safe because nothing grades an On Tap card by fact label. The new prose after the move is written dash-free on purpose, so data-ontap.js is byte-identical in both trees except for the 44 lines that came from Behind the Stick. Beer left Behind the Stick, where it had been the largest of six domains and the one that tab opened on. Two beer GLASSES stayed behind in SERVICE_REF under glassware on purpose: a lesson moves when the tab answering its question moves, a reference card stays where the object lives
- `js/data-coffee.js` — **Coffee & Tea**: COFFEE_STUDY (9 sections, 70 rows: the machine, the shot, milk & latte art, filter & cold brew, tea service, the leaf, matcha & chai, spiked & service, faults), COFFEE_REF (34 cards: 12 espresso drinks, 6 brew methods, 8 teas, 8 faults). **REFERENCE AND VIDEO ONLY, deliberately**: COFFEE_REF is NOT in DECK_SOURCES, allDrinks, groupsFor or cardTicket, which is the older Behind the Stick shape rather than On Tap's. Every consumer of a *_REF array names it explicitly and there is no generic loop over reference tabs, so this costs nothing and lies about nothing. The shape is still ONTAP_STUDY's, so making it drillable later is a handful of lines in ui-study.js.
- `js/data-coffee-films.js` — **MACHINE WRITTEN, never hand-edit**: 18 pinned YouTube films keyed `sec` + `slugify(rowTitle)`. `tools/films-add.mjs` is the only thing that may write a title or channel and takes both from the oEmbed response in the run that proved the id resolves; `tools/films.candidates.json` has no such field and the schema refuses one. Titles are escaped to pure ASCII so a borrowed em dash cannot spend the suite's dash headroom, and `check.mjs` fails on a literal non-ASCII byte in the SOURCE, which is the fingerprint of a hand edit. `tools/check-films.mjs` re-asks YouTube before a release and is deliberately NOT a gate.
- `js/ui-coffee.js` — `renderCoffee` (renderOnTap with the identifiers swapped), the film player, and the computed drinks index. **The playing video id is never put in state**: render() does one innerHTML and destroys any iframe, so `cof-play` early-returns like `lib-print-go` and `cof-ref` repaints only `#cof-refs` and restores focus by hand. Had the id lived in state, every chip tap would have restarted the film with sound. Offline emits no thumbnail and no dead button. `cofIndex()` derives the 40 drink links from the ingredient vocabulary rather than a typed list, so a renamed drink cannot leave a dead link, and they are `<a href>` because `data-hash` is wired to exactly one listener in this app.
- `js/srs.js` — SM-2-lite scheduler (`scheduleCard`, `srsMigrate`, `srsForecast`)
- `js/ui-study.js` — home (+dashboard), families, library (+print mode), flashcards, quiz, notes, riffs
- `js/ui-practice.js` — tasting room, practice drills, tools (batching/ABV/cost/convert/**My Data**)
  The stock panel that used to live here is the Menu tab's Stock view now; the engine
  (`SHELF`, `missingFor`, `bestNextBottles`, `eightySixReport`) stayed in `engine.js`.
- `js/ui-reference.js` — shots, zero proof, producers
- `js/ui-prep.js` — prep room, video-link builders
- `js/ui-menu.js` — Menu: the venue's own list, the bar's stock, and what can be poured right now
- `js/menu-desk.js`: GENERATED by `WorldTable/tools/port-desk.mjs`, never hand-edited. The Menu Desk (reader, sorter, desk file, inbox) as one classic script, with `parseMenuText` as the adapter every existing caller uses; `WorldTable/tools/check-port.mjs` proves it says what the TypeScript says
- `js/menu-drinks.js` — the desk's cocktail share read as drinks (`menuDrinkFromDeskItem`, `menuDraftsFromDesk`, `menuDraftFromText`). NEVER invents a quantity: the spec is the desk's, parts as printed, and a price not in the row's own lines is blanked and flagged
- `js/menu-read.js` — the photograph and address doors (ported; no downloaded OCR engine, no CORS proxy of ours)
- `js/ui-import.js` — **The Menu Desk**: the four doors, the two engines (Read it here; Ask the Maître d' when `window.OOT.maitre` is present), the review step, the hand-off of the other rooms' rows to the shared desk inbox (`oot-menu-desk-v1`, only on the suite's origin, detected by `location.pathname` starting `/ledger`), the desk-file download and import, and the "N cocktails from the Menu Desk" chip the Menu tab and Home show. The desk file is a DRAFT read into the review list and never merged into `progress.bar`: a row reaches the list only through `saveBarRecord`
- `js/ui-new.js` — nav clusters, hash router, search overlay, SVG charts, riff critique, ornaments/glass icons, export/import
- `js/data-levels.js`: **MACHINE WRITTEN, never hand-edit**: `LEVEL_ITEMS[sub][level]`, every item of the Ledger at its level, emitted from `tools/levels/placements.json` by `tools/levels/set-levels.mjs --emit`, pure ASCII
- `js/levels.js`: **the four levels' engine**: what each level holds, what counts as met, the word and the figure, `firstUnmetLevel` and `todayLevel`, the training doors as descriptors (`trainTarget`, `applyTarget`), the quiz rounds from a cell, and the level test (`buildLevelTest`, `ltStart/ltPick/ltNext`). Top level is literals and function declarations only (check-levels reads `LEVEL_TEST_SHAPE` in a bare sandbox)
- `js/ui-levels.js`: the four levels' screens: the home (`homeHTML`, which `renderHome` returns), a level's page (`renderLevel`), the test (`renderLevelTest`), Mine with the record (`renderMine`, `recordHTML`), and `clusterChromeHTML`, the Library's shelf and the one way back that replace the sub-row
- `js/house-study.js`: **the study view of the house's drinks** (WorldTable `docs/study-menus-design.md`, the Ledger's part). See "The study view" below. `css/house-menu.css` is its art, built from house.css's tokens and components only
- `js/ui-nav.js`: **the four tabs, Back and the history** (the consolidation, 4 October 2026; WorldTable `docs/consolidation-design.md`, the Ledger's part). See "The four tabs" below. Top level is literals and function declarations only, so `tools/check-nav.mjs` and `tools/check-import.mjs` load it with no document
- `js/app.js` — `render()`, the one delegated click handler (`data-act`), keyboard shortcuts, boot, SW registration
- `sw.js` — cache-first service worker, explicit precache list

## Checks

`node tools/check-nav.mjs`: the four tabs, Back and the history, on the SHIPPED app (every script in index.html, app.js's boot included) in a small DOM harness: a history with real entries, back() and popstate, a location read from the entry, both storages in memory, and a tap that is the delegated click a real tap makes on the element found in the rendered markup. It holds the five words and their order, every TABS id in one cluster and every id TABS held before the consolidation (a frozen list), every route round-tripping to the same screen key, the parent map total and never the screen itself, the owner's flashcard chain as four pushes with `ootd` 1 to 4 and four Backs down to Home, a flip and the next card writing no entry, a cold deep link walking up with replaces, one action one entry (a search hit, `gotoHash`, and an entry the browser made for a hash link adopted rather than doubled), the quick quiz's results surviving Study this card and Back, Study the misses dealing exactly the missed cards, a cold finished round falling to Quizzes, every old address landing with one Back to its parent, the home four cards and nothing else, one Back and no "Back to" on every screen, no numeral, dash or glyph on the new screens, Due today one number in the pill, the row and the root, and the Library's "At other levels", the depth on a reload (from the entry's state, and from the mirror only on a reload) and 0 on a fresh arrival at the mirrored address, Print cards as `#/library/print` with one Back and no second way back, and, with the House engine and the Brennan's pack beside the checkout (`../../shared/` or `../../worldtable/static/shared/`, or `OOT_SHARED`; absent is a note and a skip), a `#drink=` link held until the wake opening its card in place of the arrival and a cold `#/menu/section/{slug}` keeping its section and address through the wake. `--mutations` proves it can fail eleven ways (a replaceState in the push path, a missing parent, a sixth word, Back drawn twice, `location.hash` back in gotoHash, the new-card top-up taken out, the mirror read on a fresh arrival, a held drink opened by a push, a held section rewritten before the wake, Print cards not a screen, a "Back to" crumb).

`node tools/check-levels.mjs`: the four levels' gate: every item placed exactly once, the fixed rules (the Core Dozen and the Classics Canon are Barback, every drink; the Extended Canon is Bartender, every drink; no other book is ever Barback), every craft question filed under a subsection, `BOOK_ORDER` every book once in the order the levels climb (each book's mean level in the placements, a tie in key order), `js/data-levels.js` exactly what the placements emit and pure ASCII, the supply every level test needs (`SUPPLY`), every drill's `ready` figure stated in its description, and `LEVEL_TEST_SHAPE` inside the supply. Prints the placement per level per subsection.

`node tools/check-home.mjs`: the four levels' screens, loaded from index.html's own script list and held to the shared contract on three records (fresh, partial, Barback met): the home is exactly the four cards then the four doors, each card labelled by its name alone, each card's word and figure equals the gate's OWN reckoning from the placements and the records, the current card is the level the gate works out, the Today door names the level it deals from; every level page has its eight subsections and every door resolves; every level test deals seventeen, ends on what got away with no percentage, no score and no verdict, writes no quiz round, and records the sitting; every Read door names where it goes; a level's Quiz door on the beer and coffee cards draws the card, blind, with the name nowhere in its facts; the Record door lands on the record's heading; and no level is named by a numeral anywhere it is shown (the home, a level page and its switch, the test, the way back, the Library's level filter, the flashcards' level line, a level round's history label, the record's level tests). Mutation-tested: a pooled share in place of the mean, a quiz screen without the card, an unmasked card and an expiring "met" each fail it, and so does a numeral put back at any one of the ten sites that print a level. It holds the books too: no "tier" reaches the Library, the flashcards setup, a drink's chip, the search index or a level page; the book filter (Library and flashcards) lists the books the chosen level holds, in book order, as "name (count at the level)", and falls back to Every book; a drink's chip is its level and its book; the Library reads by level, then book, then name; every level page names its books in book order as 44px doors with their count and where they continue, and each door lands on the Library at that level and that book. Mutation-tested fourteen ways (a Tier chip, a Tier subtitle, the key's order, an unscoped or numbered option, no fallback in either filter, the books reversed, no continuation line, no books, a door that drops its book, counts that leak across levels, the books by key).

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

## The four levels

By the owner's decision of 26 September 2026, shared with the World Table and the Codex, and reshaped by the consolidation of 4 October 2026 (see "The four tabs" below): the home is the four level cards (Barback, Bartender, Head Bartender, Bar Manager) and nothing else; the nav is Home · Flashcards · Quizzes · Library, then a quiet More; each level is the same eight subsections at its difficulty (Cocktails; Shots and Zero Proof; On Tap; Spirits and Producers; Technique and Method; Behind the Stick; The Prep Room; Coffee and Tea), listed on its page behind "Show what {Level} holds"; every level ends on its test, which is the last row of Quizzes. Nothing is locked.

**A level is its name, never a numeral** (the owner, 27 September 2026: anyone who works a bar knows the levels by these names). Nothing a reader sees or hears numbers a level: not the home cards, the level page's title or its switch, the test ("The Barback test"), the way back ("Back to Head Bartender"), the Today door, the Library's level filter, the flashcards' "Dealing from" line, a level round's history label or the record's level tests. `n`, 1 to 4, is still the key in `LEVEL_ITEMS`, `progress.levels`, `data-n`, the `level-N-sub` quiz modes and every other stored or routed place, and `levelInfo(n).name` is how a screen prints it. There is no `roman()` and no `num` field any more.

**The books live inside the levels** (the owner, 27 September 2026: the twelve cocktail tiers were a second numbered ladder beside the four levels, and they are named books now, never numbered anywhere a reader sees or hears one). `c.tier` stays each drink's key into `TIER_NAMES`, and `state.lib.tier` and `state.fc.tier` still hold it, so no record, backup or stored filter changed. `BOOK_ORDER` (js/data-core.js) is the one order the books read in, by the mean level of their drinks: the Core Dozen and the Classics Canon (Barback, every drink), the Extended Canon and the highballs (Bartender, every drink), then Modern Craft Classics, the Martini Book, Tiki, Drinks of the World, Frozen, Dessert and After-Dinner, the Golden Age, and the Obscura. A level page's Cocktails names its books in that order as doors (`levelBooksHTML`, `data-act="book"`, `bookTarget` into `applyTarget`) with each book's count at the level and "Continues at" the next level that holds more of it; the Library's and the flashcards' book filter (`bookOptions`, `bookHeld`, both scoped by the level) lists only the books the level holds; a drink's chip is `drinkPlace(c)`, its level and its book; the search subtitle is family, spirit and book. The Library sorts by level, then book, then name; the session deals a level's cocktails book by book; the Ticket Rail and the picked drills deal `everydayCocktails()`, the drinks placed at Barback or Bartender, where the first four or six keys stood before. See `tools/levels/README.md`.

- **Placement** (`tools/levels/README.md` is the standard and the procedure): 1,150 items, 57 by rule and 1,093 by agents (assigner, challenger, reconciler per chunk, one cross-subsection critic). The authored record is `tools/levels/placements.json`; move an item there and run `node tools/levels/set-levels.mjs --emit`. A new drink, question, drill or section fails `check-levels` until it is placed.
- **Met**: a card with three honest wins and more right than wrong (`cardMet`: `isMastered`'s rule without its expiry, so a level met does not un-meet itself the night a review falls due); a bank question answered right once (`progress.qa`, keyed `qKey(k)` = `'q:' + slugify(q).slice(0, 64)`, written by `qaRecord` from the quiz, a level round and the level test); a drill logged once at its `ready` figure (`DRILLS[].ready`: `lt`, `ge`, `order` for the rail, `whole` for the hold round). Sections, producers, flights, prep sheets, plates and riff frames are read, never graded.
- **The figure**: Untouched, then N% met clamped to 1..99, then Met; a level's N is the MEAN of its subsections' shares, empty ones excluded. Which level a reader is on (`firstUnmetLevel`) and which level Tonight's Session deals new cards from (`todayLevel`, the lowest unmet level with a card never seen) are derived every time and never stored.
- **Tonight's Session** deals My Bar first as before, then the level's cocktails book by book in `BOOK_ORDER`, then its shots, zero proof and coffee; the On Tap seat stays inside the level (a level with no beer left deals none from another), and a level whose only unseen cards are on the wall deals the wall in every seat; reviews come from everything touched. The Today door says what the hand deals: "Today deals from Barback.", "Today deals from your menu, then Barback." (the level's name) or "Reviews only tonight." (check-import pins all three).
- **The doors**: a level page's subsection titles open their Read target (`readDoorTarget`, the Library filtered to the level for Cocktails); the training doors left the page with the consolidation (Flashcards, Quizzes and Hands on are tabs and rows now), and `trainTarget` stays for the checks and the old addresses; Hands on opens the first drill not yet met with its panel in sight (`state.practice.jump`); a Notes door scrolls to the note it opened (`state.noteJump`, ported from the wing); the Maître d' door opens her only where her client is here or can be fetched, else the Tools page that says how she is brought in.
- **Blind fact cards**: a question on a beer or coffee card IS the card, so `renderQuiz` draws `q.factCard`, and `tapTicketHTML(x, true)` masks every word of the name four letters and longer where a fact repeats it (`maskName`). A level round asks each unit once (`levelQuizSource` returns the ways per unit, `levelRound` picks one).
- **The level test** (`buildLevelTest`, `LEVEL_TEST_SHAPE`): seventeen questions across the eight subsections, from the level, decoys from the whole book, what is not yet met first; tickets grade the card (`gradeCardKey`, extracted from `recordCard`), bank questions write `progress.qa`. Untimed. It ends on "What got away, with the right answers." or "Nothing got away." and never on a score; it writes no `progress.quizzes` row, only `progress.levels`.
- **Coffee & Tea is a deck source** (`'Coffee'` in `DECK_SOURCES` and `FACT_SOURCES`, `allDrinks`, `cardTicket` through `tapTicketHTML`, `groupsFor`), shaped like On Tap, so its subsection has something to meet. `cardKey` is `'Coffee · ' + name`.
- **No sub-row**: `NAV_CLUSTERS` still HOLDS every tab (check.mjs requires it, and the lit word follows it), but a cluster tap lands on its first tab's root and the sheet is never opened. Every tab but Home carries the one Back, and the Library's tabs the shelf of the eleven (`clusterChromeHTML`). check.mjs pins the five words and their order.
- The masthead is the page's h1 on every tab, so a level page is h2 then h3 beneath it; the current card carries `aria-current="step"` (a tap navigates, so it is not a toggle) and the words "Your level".

## The four tabs (the consolidation, 4 October 2026)

The owner's answers, shared by the three apps: four tabs, **Home · Flashcards · Quizzes · Library**, then a quiet **More**; Home is the four levels; a level's page opens on Today's study; Back on every screen but Home returns to the exact previous screen; flashcards and quizzes at the centre. `js/ui-nav.js` holds it; the design is WorldTable `docs/consolidation-design.md` (sections 2 and 4, the Critic's changes binding).

- **The tabs**: `NAV_CLUSTERS` is `home` (home, level, menu), `flashcards`, `quizzes` (quiz, practice, riffs), `library` (the ten shelves and `videos`), `more` (mine, record, tools). `TABS` kept every id and gained `record` and `videos`; `mine` is More and its label says so. More is drawn quiet (`cl-more`, `bnav-more`: a rule before it and a lighter weight) and lit only on a More screen; the lit word carries `aria-current="page"`. Search left the bar: the Library root's first door is Search everything and `/` still opens the overlay. The Flashcards word carries Due today's count (`dueToday`), with " due" for a screen reader.
- **The history**: every screen change pushes one entry and every change within a screen replaces it (`syncRoute(kind)` is `navSync`). A screen is its KEY, the route without in-screen state (a flip, the next card, a chip, a search box, a section chosen on the study list, show all). Each entry's state carries `ootd` (the in-app depth), `ootk` (its key) and `ootp` (the key beneath it), merged with whatever was there; the depth is mirrored to sessionStorage `oot-nav-ledger-v1`, read at boot only when the entry carries no `ootd` and `performance.getEntriesByType('navigation')[0].type` is `reload` (a fresh arrival at the address the app last showed, from another room or the hub, starts at depth 0, or Back would leave the app), and the scroll of each address to `oot-scroll-ledger-v1` (sixty, oldest dropped), put back two frames after a pop. A push onto the key beneath (closing what was opened, a tab tapped back to the root it came from) is a `history.back()` instead, so no dead entry is left. `popstate` renders the entry (`navPop`); an entry the browser made for a hash link is adopted one deeper, never pushed again; `gotoHash` and every `a[href^="#/"]` in the view go through the router and never assign `location.hash`. A pop puts focus back on the control that opened the screen (`navOpener`); a push focuses the new heading without scrolling.
- **Back** (`backRowHTML`, drawn by `clusterChromeHTML`): `button.chip` in `div.crumb.backrow`, the word Back and nothing else, sticky at the top; once its sentinel rises above 56px (one IntersectionObserver on `.back-sentinel` with `rootMargin` `-56px` at the top, `NAV_BADGE_BAND`) it is marked stuck and moves to x 64, before it can reach the suite's badge's band (y 10 to 54). Depth above 0: `history.back()`. Depth 0: the screen's logical parent (`parentTab`, `applyParent`) with a replace, so a cold link walks up to Home and the history never grows. With depth 0 and a referrer from another room, one line says the phone's back gesture returns there. No screen carries a second way back: the study card's "Back to the menu", the deck's Quit, the board's Back to decks, the level test's Leave and Back to, and Say it back's Close all went.
- **The chosen level**: `chosenLevel()` reads localStorage `oot-level-ledger-v1` (through `OOT.profiles.key` in the wing) else `firstUnmetLevel()`; opening a level page or choosing one from the scope chip sets it; Home's Your level is it. `dealLevel()` is the level Due today and Tonight's Session deal new cards from: the chosen level once one is chosen, else `todayLevel()` as before. The scope chip (`scopeChipHTML`) heads the Flashcards, Quizzes and Library roots: "{Level} · show all levels", or "All levels · show {Level} only"; show all is in the address (`/all`) and never stored. A Library search with nothing at the level lists the other levels' matches under "At other levels".
- **The level page** (`renderLevel`): the name, the blurb, the standing; **Today's study** (Due today, Quick quiz, Next reading, Tonight's session, each a `button.door`); **My restaurant** (the house line, the desk's waiting line, the count, Study the whole menu, Flashcards for the menu, Drill the menu, the sections as chips to `#/menu/section/{slug}`, The Menu Desk); **Search** (`#lv-q`, its results repainted alone); "Show what {Level} holds" (the eight subsections and the books, closed); "Another level", the switch, at the foot so Today's study is in the first screen at 390 by 844.
- **Due today** (`dueToday`): the cards due, then new cards to make the run up, twenty at most and ten new at most, from `sessionDeckParts` (the menu first); one function gives the run, the row's line, the root's line and the pill, and Tonight's Session deals the same hand. Nothing due and nothing new opens the quick quiz.
- **Flashcards**: `state.fc.stage` `pick` (the root, one deck picker: Due today, My restaurant, the level's subjects and books, Words, Reference cards), `setup` (a deck's screen: its name, "{n} cards · {m} learnt", Narrow this deck, Choose how to study), `run` (the one card screen: "Card {i} of {n} · {deck}", Front and Answer, Flip, Got it, Again) and its Deck done, and `board`. A deck is an id and a preset (`deckDef`, `applyDeck`): `menu`, `menu:{slug}`, `menu-weak`, `menu-line10/20/45`, `menu-parts`, `menu-offer`, `menu-words`, `drink:{id}`, `cocktails`, `cocktails:{book}`, `shots`, `zero-proof`, `on-tap`, `coffee`, `everything`, `trouble`, `unmastered`, `misses`, and the runs `due` and `session`. `state.fc.only` holds a deck's own cards where fcPool's filters cannot (one drink, the misses, the menu's words); the menu's words are the shared engine's term cards, graded under `Words · {front}`, a key the orphan sweep never touches. The study view's Flash cards buttons open these decks (its own deck went), graded through `gradeCardKey` on the same keys.
- **Quizzes**: `state.quiz.stage` `setup` is the root (Quick quiz, My restaurant, the level's subject rounds and the topic rounds, Hands on, the level test last, Recent rounds); `house` is Say it back or Guest at the table (`houseDrillOpen` lands here). The quick quiz is `buildRound('quick')` (`buildQuickRound`: five from the menu, five from the chosen level, each side topped up), recorded as each builder records and as one `progress.quizzes` row labelled "Quick quiz" (`QUIZ_LABELS`). Results: "What you missed", each miss with Answer and Study this card (its study place, a push) or Read about it (where its level reads it), then Replay the misses and Study the misses (`#/flashcards/misses/{keys}/card`).
- **More** (`renderMine` is `moreHTML`): Record and progress (`#/record`, the record), Tools (each `#/tools/{view}`, and The stock), Backup and data (My Data), The Maître d', Settings (`#/tools/video`), About (the privacy line, In the ledger and the pillars, moved off the record). The Library gains `#/videos`, the house's videos list.
- **Addresses**: every old address stays and lands (`#/mybar/...`, `#/service/beer`, `#/level`, `#/level/{slug}`, `#drink=<id>`, `#/mine`, `#/menu`, `#/flashcards`, `#/quiz`, `#/tools`, `#/practice`). Added: `#/library/print` (Print cards, a screen with the Library as its parent: the one Back closes it, and it has no button of its own), `#/flashcards[/all|/board|/{deck}[/card]]`, `#/flashcards/misses/{keys}[/card]`, `#/quiz[/all|/quick|/{mode}[/done]|/say|/guest]`, `#/practice/{view}`, `#/tools/{view}`, `#/level/{slug}/test`, `#/menu/section/{slug}`, `#/menu/view/{stock|add}`, `#/library/all`, `#/record`, `#/videos`. A run's address (a card, a round, its results) renders from memory on a pop while the run is held, and falls to its parent on a cold load. A cold `#/menu/section/{slug}` before the house has woken is held in `NAV_WANT_SEC` with its address kept, applied by `navTryWantSection` from `houseStudyRetry` after each wake and repaint, and dropped once a house with drinks lacks it or the menu is left.

## The study view (3 October 2026)

When a house with cocktails is current and "Edit the menu" is off, the Menu tab's first sub-view is `houseStudyHTML()` (js/house-study.js) instead of `menuListHTML()`: one hook in `renderMenu`. `houseStudyOn()` is `houseHere()`, a current house with named cocktails, `!state.menu.study.editAll` and the `menu` sub-view. The switch is not stored, so every load opens on the study view; with no engine or no house the Menu tab is exactly today's.

- **State**: `state.menu.study = { q, sec, open, editAll, deck, y, jump, pushed, l20, l45, lastId, from, scrollCard }`, made at load by house-study.js the way house-bar.js makes `state.house`. The shift filter (All day and the house's `meals`) is a per-device convenience in `localStorage` under `oot-study-meal-v1`, wrapped in try; an item with no `meals`, or whose `meals` name none of the house's meals (the Roost Bar's three carry the room, the breakfast tasting's pours carry the tasting), shows under every meal. The facts line (menus read, the count) sits at the foot of the list beside "Also in the house", so the first row clears the bottom nav at 390 by 844 (measured: row top 717, nav 779).
- **Kept marks only, and no allergen**. Every house read goes through `hsKept` (`by === 'person'`). The service note is printed verbatim under the fixed eyebrow "Your words. Allergens: confirm at lineup."; nothing here ticks, infers or says what a guest may eat.
- **The card** follows the design's section 1.3 in order (the way back, the position and Next, counted over the whole menu with the words "Not on the {meal} list" when the shift or search hides the drink; the eyebrow; the name and `priceLine`, with "Prices as printed on ..."; Say it; In ten seconds; Offer next, each name and its comma one inline-block piece; the two longer lines; About it; The build with `ticketHTML` once, an empty glass, method or garnish drawn as "not printed; confirm with the bar" and never a dash; the upsells as `hs-open` buttons, Poured with as Table links; the five parts; On the floor; the service note; In this app; In the other rooms; the three doors; her unkept lines in one sentence; Edit and the named neighbours).
- **In this app** is matched at run time by `hsNameIn` over folded text, never hand mapped: the canon by name (seven characters or two words) or by the first clause of the house family, linked to `#/library/<slug>` with the words "Its build is the classic's, not ours." and never the canon's quantities; the first two sentences of its LORE, last in the block inside a closed disclosure labelled "The Library's story, not the house's" (the house's coaching may contradict the Library); GLOSSARY terms in the spec, method, glass, garnish and kept parts; PRODUCERS in the spec and name; the vocabulary's reading of the spec (a `?` sentinel left out) with a door to The stock; the house's lexicon terms; the scenarios Guest at the table deals, each opening it.
- **The links across the rooms** (`hsRoomHref`) are drawn only when `location.pathname` starts `/ledger`, the target is in the current house, and the network is up or the room's own entry point answers from the cache (`hsAskInstalled`); otherwise the name is words. A dish opens at `/table/menu#<id>`, a wine at `/codex/#wine=<id>`.
- **Addresses**: `#drink=<id>` (the id matched by `/^[dbw]-[a-z0-9]{8}$/` and nothing looser) is read once by `houseStudyDeepLink()` in the boot block, immediately before `applyRoute()`, and replaced by `#/menu/<slug>`; a drink not yet in the house is held in `HS_WANT` and tried again after each wake (`houseSyncInNow`) and each `houseRepaint`, then dropped after the first sync of a house with drinks that lacks it; opened after a wake, it is a replace (`state.navForce`), so the card takes the arrival's entry at depth 0 and the phone's gesture still returns to the room that linked it. While the study view shows, `applyRoute`'s menu branch calls `houseStudyRoute(row)`, so the global search's `#/menu/<slug>` opens the study card and not the Build pane, and `#/menu` closes it; `currentRoute` writes the open card's slug through `houseStudyRouteSlug()`. `hs-open` from the list is one history entry (the render's push, js/ui-nav.js; `hsPush` and `hsReplace` stand aside while the history model runs), so the phone's back gesture and the one Back close the card; Next and Previous replace it.
- **Scroll and focus**: one `innerHTML` repaints the tab, so `hs-open` keeps `window.scrollY` in `study.y`, the card's heading carries `data-open` once (render focuses it) and `houseStudyAfterRender()` (called from `houseAfterRender`) scrolls the card's top into sight; on Back it scrolls to `study.y` and focuses, with `preventScroll`, the row that opened the card (`study.from`, set when a card opens from the list, a route or `#drink=`), not the row of the card Next or Previous reached (`lastId`). The search box `hs-q` repaints `#hs-rows` alone on input and writes the live region; it is in `captureLiveInputs` all the same.
- **Flash cards**: `FC_MODES` gains `study` (The house card), fitting `d.src === 'My Bar' && hasKeptLines(d)`, its back drawn by `houseCardBackHTML('study')` from `hsCardBack`. `state.fc.section` (default `'All'`) narrows a My Bar card in `fcPool` to a house section, and a menu deck's screen shows a section select (`fc-section`, heard on change, in `captureLiveInputs`). Since the consolidation the study view keeps no deck of its own: Flash cards, a section's Flash cards, My weak ones and a card's own Flash cards open the Flashcards tab's `menu`, `menu:{slug}`, `menu-weak` and `drink:{id}` decks, graded through `gradeCardKey` on the same keys. My weak ones is the `trouble` rule.
- **Drill this section** is a `mybar` round narrowed by `state.quiz.section` in `buildRound` (wrong answers still from the whole list), cleared when another round starts; a section with fewer than four drinks that make a card offers the whole menu and says why. Both drill buttons say they open Quizzes.
- **The checks**: check-import.mjs holds the study view as the default with a house (23 rows in the house's order, eight sections), Edit the menu and the card's Edit opening today's list and Build pane, the Classic Sazerac card (the canon link, no canon quantity, the upsells as buttons, $13 once, Bitters and Rinse, the eyebrow, no checked box), Catalina Island's Table link on `/ledger/` and none off it, the canon on nine or more drinks and producers on four or more, `#drink=` and the routes, the deck (house drinks only, the section scope, Got it after Flip, the record, the weak deck), the input ids in `captureLiveInputs`, and the no-OOT chain.

## Dev gotchas (hard-won)

- **Stale caches**: `?nosw` in the URL skips SW registration. The SW precaches with
  `cache:'reload'` requests so it never snapshots the browser's stale HTTP cache.
- **bfcache**: navigating to an already-visited URL can restore the old JS heap without
  re-executing scripts. When testing, use a unique query string (`?fresh=anything`).
- **Progress data**: localStorage key `bartenders-ledger-v1`. Never rename fields
  (`cards{r,w,ef,ivl,reps,due,last}`, `quizzes`, `practice`, `tastings`, `vidPrefs`, `shelf`, `bar`, `eightySix`, `eightySixAt`, `pours`, `bottles`, `spills`, `openBottles`, `streakData`, `qa{r,w,last}` per bank question key, `levels` per level `[{ts,total,miss}]`).
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
- **The importer never invents a quantity.** A menu prints ingredients and,
  sometimes, measures. An ounce invented anywhere in `js/menu-drinks.js` reaches
  `lineOz`, and from there `balanceOf`, `estimateABV`, the batch sheet and the
  pour-cost sheet, so a bartender is shown a printed percentage that came from
  nowhere. `tools/check-import.mjs` runs the REAL `lineOz` over every produced
  spec line and asserts every measure it finds is a substring of the raw line
  the row came from, and that `3/4 oz lime` is one part reading 0.75 and never
  a part reading `4 oz` (the desk masks the fraction slash before it splits;
  `MD_LIST_SEP` in menu-drinks.js is the same separator set with the same
  mask). The book's measures are offered as an explicit one-tap fill and never
  applied in bulk. Blank is a true answer; a guess is not.
- **Drafts.** `saveBarRecord(f, id, { allowEmptySpec: true })` is the importer's
  licence and nobody else's: a row the menu printed as a name and nothing else
  is filed with `draft: true`, shown on the list as "needs a spec", and skipped
  by the stock report (`pourSources`, the Stock view's pool, `menuStatus`) and
  by `missingFor`, which fails closed on a draft with a `?` sentinel. It is
  dealt by no flashcard deck (`fcPool`), no Menu quiz round, no mixed-round
  menu question, no rail (`railDeal` always required a spec) and no Tonight's
  Session (`sessionCardPool` is the one seam under `sessionDeckParts`, the
  empty-deck fallback in `startSession` and the dashboard's count; the venue's
  list deals FIRST in that ladder, so an unfiltered pool made the draft the
  first new card every night), and
  `menuCardCount()` is the count behind every promise of a card, including
  the four-drink floor on the Menu round: four names with no spec would open
  a round of nothing. The cost and taste panes need no guard, because
  `unmeasuredReason` and `menuBalanceWords` already answer an empty spec in
  words. Giving it a line clears the flag, because the flag is derived from
  the spec at save.
  `normalizeBarRecords` runs at boot and on the backup import, in BOTH its
  branches (the merge's menu clause runs the backup's list through it before
  any record is pushed or replaces one; the replace branch runs it right after
  `progress = p`), so a spec-less record from any source is a draft rather than
  a false "ready to pour" from "Merged." onwards and not only from the next
  reload. `saveBarRecord` does not call it: it derives `draft` itself from the
  spec it files.
- **Her marks.** `rec.maitre` is the Maître d's block (`guest`, `say`, `why`,
  `pairs`, `origin`, `method`, `glass`, `garnish`, `ingredientsNamed`, each
  `{ value, by:'maitre'|'person', ts, model? }`, plus `kept[]`). A mark is
  hers until `by === 'person'` (Keep and Edit both set it); an unkept mark
  reaches no drill, no rail, no deck, and no plain record field. `saveBarRecord`
  and `normalizeBarRecord` carry it; the backup import's menu clause merges it
  through `mergeMaitre` (newer record's block, `kept` unioned on `ts|q`). There
  is no allergen field in the block and never will be.
  The drink's Build pane is where a person decides, with Keep, Edit and
  Discard on every mark (`data-f` names the field, `guest` when absent):
  `menuGuestHTML` for the guest line, which has no plain field, so Keep and
  Edit set `by:'person'` on the MARK; `menuFieldMarksHTML` for `method`,
  `glass` and `garnish`, which have one each, so Keep writes the value INTO
  the plain field through `keepMaitreField` → `saveBarRecord` and drops the
  mark (a draft keeps the importer's licence there, because Keep changes no
  spec). `saveBarRecord` takes the form's block whenever the form CARRIES one,
  even an empty one; only a form with no `maitre` key keeps the record's,
  or the last mark kept off would come straight back.
- **The desk inbox merges by kind and name, never by id.** So "It is a dish"
  on the shared origin cannot be a write of the re-kinded row (another kind is
  another key, and the cocktail row would stay beside it, re-offered to the
  bar and shown to the World Table twice). `importReKindInbox` rebuilds the
  slot instead: the row goes by id, the re-kinded one comes in, `taken` stays,
  `clear` then `write`; only while the slot's `source.hash` is this list's,
  else the row rides the download and the block says so.
- **Refusals on the Menu Desk are said once.** `importErr` sets `i.err` and
  calls `say()`; the shown div carries no `role=alert`, because `render()`
  re-inserts it on every act and an inserted alert is announced again each
  time. The never-twice panel and the desk file's size notice follow the same
  rule; only `#imp-busy` keeps `role=status`, since its text changes ARE the
  announcement.
- **`tools/check-import.mjs` is the third gate**: the World Table's own
  `menu-parse` and `menu-link` suites ported from vitest to `node:test` and
  pointed at the SHIPPED files through `vm`, plus the cocktail cases written
  here and the desk cases over the three fixtures in `tools/fixtures/` (copied
  from `WorldTable/src/lib/desk/fixtures`, never edited here: the round trip
  `readMenu` → `menuDrinkFromDeskItem` → `saveBarRecord`, the raw-substring
  measure rule, the price guard, drafts in every deck including Tonight's
  Session and the backup import's two branches, `mergeMaitre`,
  `keepMaitreField`, the re-kind rebuild of a Map-backed shared inbox by id,
  and the never-twice answer said once through `say()`). The food fixtures
  are kept verbatim on purpose: they exercise the same code path and rewriting
  them as cocktails would drop coverage while looking like work.
- **Live inputs**: `render()` rebuilds `#view`, eating anything typed into an input.
  `captureLiveInputs()` in app.js grabs the known live fields into state before every
  delegated-handler render — add any NEW live input's id to that list when you mint one.
  Her marks under Edit are two ids into one slot (`mb-guest` for the guest line's
  textarea, `mb-hers` for a field mark's input, both into `state.menu.lines.text`),
  and one is open at a time, keyed on `state.menu.lines.f`. TRAP: `captureLiveInputs`
  runs AFTER the act branches, so an act that USES a live input's text (`lines-keep`,
  like `imp-read` before it) reads the box itself at the top of its branch; read from
  state alone, Keep after Edit filed her original words and threw the person's away.
- **Wing sync**: the OutsideOfTime wing (`OutsideOfTime/ledger/`) diverges deliberately
  (OOT.profiles `KEY()` in engine/app, the dash-free wording, nobody named: the pillars by
  their sources and five renamed questions, a note and a prep sheet, whose level keys
  `KEY_ALIAS` in tools/levels/lib.mjs maps to this repo's). Every level file (data-levels,
  levels, the tools) is identical in both trees; ui-levels.js differs only in the record's
  words. Sync = three-way `git merge-file -p wing base new` per file with base = the
  last synced upstream commit (currently `d0175e6`); lineage-check both inheritances;
  bump wing `?v=`/CACHE past the WING's own numbers (wing CACHE uses the oot-ledger- prefix, not ledger-).
- **Shared helpers with mirror rules**: `specUnits()` in engine.js splits 'oz each:'
  lines — balanceOf and estimateABV both read through it; `strengthBand()` in
  engine.js is the one served-ABV scale (the Tools panel and the Dealer's Choice
  quiz both use it — never fork a second scale).
- **Adding drinks**: LORE is keyed by exact `name`. Router slugs come from `slugify(name)`.
- **`node tools/check-options.mjs`** is the fourth gate: does option LENGTH give the answer away?
  Gates pick-longest at 27% (chance is 25%) and unique-longest keys at 25. Repaired 2026-09-12 from
  37.4% / 58 keys to 15.9% / 20. **Both mirror scores are printed for a reason**: forcing a
  distractor to beat the key on every flagged question took pick-longest to 5.7% and handed
  avoid-the-longest 30%, which is the same tell inverted. The walk-back rule: a key only one or two
  characters longer than its longest distractor was never a cue a human could use, so those
  repairs were reverted. Judge the bank on the WORST of the three strategies, not on the gated one.
- **Quiz questions** carry an optional `topic` (`service` | `ontap` | `wine` | `craft`). `beerwine`
  retired when beer got its own tab; `MODE_WAS` in ui-study.js maps it to `wine` at the one place a
  persisted mode is read, which is a history label and never a round builder. Four sites know the
  topic keys and must change together: `topicOf`, `knowledgeByTopic`, the hardcoded array in
  `spreadKnowledge`, and `QUIZ_MODES`. Miss the third and a dead topic silently deals the WHOLE
  bank, because `knowledgeByTopic` ends `return pool.length ? pool : KNOWLEDGE`. Legacy entries
  have none: `topicOf()` sends anything starting "SCENARIO —" to `service`, everything else to `craft`.
  `buildRound(mode)` shuffles options — never pass `k.options` through unshuffled, since most
  authored entries put the answer in slot 2.
- **Drills**: a `hidden:true` DRILLS entry (e.g. `rail`) charts on the dashboard but is skipped by the
  drills list — that's how the Ticket Rail lives in its own view. `pick:N` makes the drill deal its own subjects.
- **Streak**: `progress.streakData = {last, n, hands, lastHands}`. A night counts on cards+quiz;
  only a logged physical drill increments `hands`. Breaking the streak resets both.

## Shared day and night service

`js/oot-service.js` is an exact copy of the canonical
`WorldTable/static/service/oot-service.js`. Update the canonical file first;
do not fork the controller in this wing. It reads the device preference
`oot.service.v1`, applies `html[data-service="day"|"night"]`, and exposes
`OOT.service.get/set/subscribe`. `css/service-day.css` owns this wing's day
palette and exceptions for filled controls, art headers and status text.
It is screen-only; wine/ingredient illustrations and printed recipes keep
their colours. Both files belong in the worker shell cache.

The Ledger's level picker restores focus to its surviving scope button
after a choice, Show all/one, or Escape. Keep the scope options' associated
group and run `node tools/check-nav.mjs` after changing that flow.

## Icons

The decorative glass symbol illustrates only the first vessel named in a
printed glass field. `glassIconKey` in `js/ui-new.js` keeps Irish coffee, Nick
and Nora, tiki, copper, punch and demitasse shapes distinct. Unknown or blank
fields draw no glass; never infer a house's glass or garnish from a classic.

`icons/icon.svg` is the master. Regenerate PNGs with `@resvg/resvg-js`
(see git-less scratch script pattern: render at 512/192/180 + maskable at 80% on felt).

## Reviewed teaching pictures

`js/data-teaching-images.js` is the reviewed registry, populated only after
artwork is approved. Each stable key holds `{src,width,height,alt,caption}`;
optional `thumb` holds `{src,width,height}` with exactly the same aspect ratio.
Optional `labels` is the numbered HTML key; `notes`, when present, has exactly
one plain-text reading cue per label. Neither field accepts markup.
The first glass-shapes reference
has nine vessel names only and explicitly asks the reader to confirm each
drink's glass with the bar; it makes no house drink-to-glass assignments.
Only versioned WebPs in `img/brennans/`, `img/cards/` and `img/plates/` qualify.
Use `LedgerTeaching.figure(id)` at the relevant reading surface or revealed
answer. An absent entry returns no markup. Do not expose answer pictures on a
blind flashcard front. Captions and alt text describe the actual reviewed art,
with any provisional classic glass clearly distinguished from house practice.
`LedgerTeaching.disclosure(id,title)` loads the picture only when opened. It is
used at the foot of the menu list and within Library's Glassware reference;
individual house cards remain unchanged.
The three craft sheets live in `img/plates/`: `garnish-citrus-v1.webp` (eight
cuts), `ice-v1.webp` (four forms), and `bar-tools-v1.webp` (ten tools), each
with a same-frame `.thumb.webp`. Notes has a routed `#/notes/garnish` panel
beside Technique Plates. Mechanics offers tools at the head and ice beside
its Ice row, so Barback's Technique and Method reading reaches both. The
matching prep sheets and Behind the Stick also offer these references.
Only actual named citrus cuts in a ticket's kept garnish field earn a link;
blind tickets and unspecified house garnishes do not. `LedgerTeaching.lesson`
draws an image and its readable key only in an explicitly opened panel.
The general guidance neither assigns house garnishes nor fixes jigger/spoon
capacities. Ice size alone does not promise a dilution rate. The old muddler
engraving now has a blunt flat working face, consistent with the new tools key.

Primary review references (4 October 2026): Diageo Bar Academy's
[Essential Bar Skills: Garnish](https://www.diageobaracademy.com/en-us/home/bartender-skills-and-techniques/essential-bar-skills-garnish)
for crosswise wheels, lengthwise wedges and peel twists; Cocktail Kingdom's
[equipment catalogue](https://cocktailkingdom.com/products/ultimate-kit-stainless-steel)
for tool identities; and Dave Arnold's
[original crushed/whole ice experiment](https://cookingissues.com/2009/12/03/cocktail-science-does-crushed-ice-dilute-more/)
for the distinction between surface meltwater and size alone. The latter
supports the narrowed Ice notes, not a universal promise for every method.

An opened reference offers a keyboard-accessible full-image link in a new tab.
Closing and reopening retries an illustration only after both size choices fail;
successful images stay in place and unopened references request nothing.

`js/teaching-images.js` is loaded by both the page and the worker. Requested,
validated images use `ledgerart-v1-<encoded installation directory>`, separate
from shell updates and the other rooms. Limits are 512 KiB per image, 64 saved
images and 16 MiB overall, with oldest entries evicted first. No collection is
downloaded automatically. Finished images loaded before the first worker claim
are warmed through that installation's worker; unseen lazy images stay unseen.
Failed downloads retain the readable lesson and can be retried by reopening.
`LedgerTeaching.forget()` removes only this installation's optional art cache.
Unknown paths in those three teaching namespaces are network-only. Saved bodies
are revalidated before use. Worker registration uses `updateViaCache: 'none'`
so imported registry/helper scripts revalidate with each worker update.

Never overwrite a published image. A correction uses a new `-vN.webp` path and
registry entry. Keep pictures out of shell `ASSETS`; the two registry/helper
scripts are shell assets. Run `node tools/check-art.mjs`, the wiring/home/nav
gates, and phone/offline browser QA after art integration. `tools/load-wing.mjs`
supplies the browser URL primitive so existing engine gates load this layer.
The current masthead remains the original picture, with a 768 by 512 WebP
variant selected below 640px. Regenerate that size from the original without
changing its composition. New image folders require explicit copying during
public integration because `sync-wing` skips new `img/` paths.
