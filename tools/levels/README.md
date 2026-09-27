# The four levels: how an item gets its level

The home is four level cards (Barback, Bartender, Head Bartender, Bar
Manager) and one quiet row of doors; each level is the same eight
subsections at that level's difficulty, with training from there. The same
shape as the World Table and the Codex, by the owner's decision of
26 September 2026. Nothing is locked: a level guides, it never bars. A level
is its name and is never numbered where a reader sees or hears it (the
owner, 27 September 2026); 1 to 4 is its key in the placements and the data.

The eight subsections: Cocktails; Shots and Zero Proof; On Tap; Spirits and
Producers; Technique and Method; Behind the Stick; The Prep Room; Coffee and
Tea. What each item is, and which subsection it belongs to, is read from the
shipped scripts by `tools/levels/lib.mjs` (`universe()`): 1,150 items, of
which the met-able ones are the 674 cards (365 cocktails, 75 shots, 85
zero-proof drinks, 115 On Tap cards, 34 coffee and tea cards), the 292 quiz
questions and the 11 drills. The rest (sections of the reference tabs,
producers, flights, prep sheets and lists, the technique plates, the riff
frames) are read, never graded, and are placed so a level page opens the
right part of the book.

Two rules decide levels without an agent: the Core Dozen and the Classics
Canon (33 drinks) are Barback, every drink, and the Extended Canon (24) is
Bartender, every drink. Every other book is placed at Bartender, Head
Bartender or Bar Manager, never Barback. The Menu (My Bar) is the venue's
own list and is never levelled.

## The books inside the levels

The 365 cocktails are filed in twelve books, and the books are not a ladder
beside the levels: they live inside them. Once they were twelve numbered
tiers; by the owner's word of 27 September 2026 they are named and never
numbered anywhere a reader sees or hears one, the rule the levels keep.
`c.tier` in js/data-core.js is still each drink's key into `TIER_NAMES`, and
`state.lib.tier` and `state.fc.tier` still hold it, so no record, backup or
stored filter changed; only what is shown did.

The books read in the order the levels climb, which is `BOOK_ORDER` next to
the names: each book's place is the mean level of its drinks in
`placements.json`, a tie kept in key order. The Core Dozen and the Classics
Canon (Barback, every drink), the Extended Canon and Highballs, Spritzes &
Party Calls (Bartender, every drink), then Modern Craft Classics, the Martini
Book, Tiki & Tropical, Drinks of the World, Frozen & Blended, Dessert, Hot &
After-Dinner, the Golden Age & Prohibition, and the Bartender's Obscura,
mostly Bar Manager. `tools/check-levels.mjs` fails when a placement moves a
book out of that order, so moving drinks and reordering `BOOK_ORDER` go
together.

Where a reader meets them: a level page's Cocktails names the books at that
level, in book order, each a door with its count there into the Library at
that level and that book, and a book that runs on says where it continues
("Continues at Head Bartender"); the Library's and the flashcards' book
filter lists only the books the chosen level holds, with their counts at
it, and falls back to Every book when the level changes under a book it
does not hold; a drink's chip is its level and its book ("Barback · The Core
Dozen"); the search index reads family, spirit and book. The Library reads by
level, then book, then name, and Tonight's Session deals a level's cocktails
book by book in the same order. The drills that deal everyday drinks (the
Ticket Rail, the picked drills) deal from the drinks placed at Barback or
Bartender (`everydayCocktails`), never from a book's key.
`tools/check-home.mjs` holds all of it.

## The standard

**Barback.** A Barback is asked to know the well and the walk-in, not the
book. At the well: the Core Dozen and the Classics Canon (every one of
them), called by name from a blind ticket, with the
family each belongs to and the glass it goes in; the families as a map
rather than as formulas. Behind the stick: ice, juice, the station set and
struck, labels and shelf lives, the opening and closing lists, the pour of a
beer and a beer-clean glass, and the legal floor (ID, refusal, the visibly
intoxicated guest) in its plainest cases. The hands: Station Setup, Garnish
Prep Speed, Glass Call and Free-Pour Calibration at their ready figures. The
signals that place an item here: it is on every menu, a guest expects any
bartender to have it, and it can be taught in one sentence.

**Bartender.** A Bartender runs a full shift alone: the Extended Canon
(every one) plus the house calls from the themed books that
any good bar pours weekly (the Modern Craft classics, the common highballs
and spritzes, the everyday tiki and the everyday sours), with the family
formula understood well enough to rebuild a spec from memory; the shot
board's classic shooters and the zero-proof classics; the draught system,
gas and balance, and the common faults; wine by the glass, the register and
the money, and the law in its cases; the syrups and prep sheets a shift
depends on; and the drills timed to service: Speed Round under 360,
Consistency under 8 g, Dry-Shake Discipline, Hold the Round. The signals: a
good bar pours it weekly, a guest asks about it, it takes a sentence and an
example, and it is the pair a Barback confuses.

**Head Bartender.** A Head Bartender is judged on depth and pace:
the Golden Age and Prohibition book, the Martini book, the tiki canon in full
and the drinks of the world, each with its lore; the wall in full (the
styles, the fault board), cider and perry, sake and mead; wine service in
sequence and the producers behind the bottles, with the flights that train a
palate to tell them apart; double straining, the Ticket Rail in order, Blind
Tasting; conflict and safety on the floor, and the standards a trail shift
is marked against. The signals: it needs a paragraph, it separates a strong
bartender from a competent one, and a guest who knows what they are ordering
will notice a miss.

**Bar Manager.** A Bar Manager owns the whole house: the Obscura,
the frozen and blended book, the dessert, hot and after-dinner drinks, and
the last members of every family; cellar and condition, how beer is made,
and the ledger's money in full (pour cost, the bottle book, spillage,
open-bottle dating); the law at its edges, coffee and tea done properly with
their faults; the riff frames and the critique that says whether a new drink
works; and the judgement to place a drink in its family from the spec alone.
The signals: it is rare on menus or specialist, it is asked of the person
who writes the menu and trains the floor, and knowing it is what lets
somebody teach the three levels below.

**Signals, weighed in this order.** The drink's book (the fixed rules above,
then: a book of house calls leans Bartender, a book of lore and depth leans
Head Bartender, the Obscura, frozen and after-dinner books lean Bar Manager,
and within a book the drinks a good bar pours weekly sit lower than its last
members); how often a guest orders or asks it; how much it takes to explain
(one sentence Barback, a sentence and an example Bartender, a paragraph Head
Bartender, the person who trains the floor Bar Manager); the family (the family's template drinks lower, its
outliers higher); for a question, the level of the lesson it tests; for a
drill, the ready figure and whether a shift depends on it. Ties break DOWN,
because nothing is locked and an item placed low costs nothing while an item
placed high hides it. No quotas; the supply minimums below only catch a
level left empty.

**Supply.** Every level holds, among its met-able units: at least 8
cocktails, 4 shots or zero-proof cards, 2 On Tap cards and 2 On Tap
questions, 3 spirits questions (the bank holds fifteen, so four at every level would need a sixteenth; three still clears the two the test deals), 2 technique questions, 6 Behind the Stick
questions, 2 Prep Room questions and 2 coffee or tea cards, so the level
test (17 questions across the eight subsections) can always be dealt with
headroom; and every subsection holds at least one met-able unit at every
level. `tools/check-levels.mjs` holds the numbers (`SUPPLY`).

## One run

1. **Brief.** `node tools/levels/brief.mjs` writes one brief per group to
   `tools/levels/out/<group>.brief.json` (the standard above, the four
   levels, every item with its signals) and prints the workflow's `args`.
2. **Place.** Run `place.workflow.js` with the Workflow tool (copy it into
   the session's working directory; pass step 1's printed object as `args`).
   Per chunk an assigner places every item with a reason (and, for a craft
   question, the subsection it belongs to), a challenger argues each
   placement from the floor, a reconciler answers every challenge; then one
   critic reads the whole placement across subsections for drift and supply
   and gets one bounded repair.
3. **Write.** `node tools/levels/set-levels.mjs <the run's output file>`.
   All or nothing: it refuses a key that is not an item, an item left
   without a level, a duplicate, a level outside 1 to 4, a fixed rule broken,
   a craft question with no subsection or one outside `CRAFT_SUBS`, or a
   placement with no reason. It writes `tools/levels/placements.json` (the
   authored record, one item per line, with the reason) and
   `tools/levels/audit/<group>.json` (the challenges, the dispositions, the
   critic's moves and notes), then emits `js/data-levels.js`.
4. **Gate.** `node tools/check-levels.mjs`: every item placed exactly once,
   the fixed rules, the supply, `js/data-levels.js` exactly what
   `placements.json` emits, pure ASCII.

## Moving one item later

Edit its line in `tools/levels/placements.json` (the level, the reason) and
run `node tools/levels/set-levels.mjs --emit` to rewrite `js/data-levels.js`
from it; then the gate. A new drink, question, drill or section fails the
gate until it is placed: add its line by hand, or brief it and run the
workflow for that group.
