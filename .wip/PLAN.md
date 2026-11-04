# NOW (4 Nov 2026): the Liquor Shelf, a new page under Brennan's in the Bartender's Ledger: every bottle in the owner's five photographs, researched, with a tableside presentation and description

## Context
The owner photographed Brennan's back bar (five photos, 4 November 2026) and asks the Ledger for a liquor shelf tab under Brennan's, with a deep dive on each liquor and a tableside presentation and description of each. The Ledger's "The stock" is not a bottle list (it is generic on/off ingredient chips held as `SHELF` and `progress.shelf`), and almost none of these brands appear anywhere in the Ledger: Lazzaroni, Mathilde, Leyenda del Milagro, Dobel, Agave de Cortés, El Gobernador and O.F.C. are nowhere; Don Julio, Patrón and Martell only as menu-reading words. The Coffee and tea page (`js/ui-brew.js`, `js/data-brew.js`, `tools/brew/`, 18 October) is the exact model: a generated data file, an index and a detail page, a deck and a quiz kept apart from levels, and the house's own drinks drawn live from the pack.

## The bottles read from the photos
- **Clear (27):**
  - **Liqueurs and amari:** Lazzaroni Maraschino; Mathilde Cassis; Bénédictine D.O.M.; Yellow Chartreuse; Green Chartreuse; Drambuie; Grand Marnier Cordon Rouge; Chambord.
  - **Cognac:** Martell XO.
  - **Tequila, mezcal and pisco:** Leyenda del Milagro Silver and Añejo; Don Julio 1942, Blanco and Reposado; Patrón Reposado; Agave de Cortés mezcal; El Gobernador pisco.
  - **American whiskey:** Weller Special Reserve and Weller 12; O.F.C. Vintage 2005; Thomas H. Handy Sazerac Rye; George T. Stagg; Stagg; Rabbit Hole Cavehill (four grain) and Heigold (high rye).
- **Probable, confirmed by research or else asked at the bar:** Luxardo Fernet (the label reads "…rdo …rnet amaro"); a Maestro Dobel special edition; Lunazul (the label reads "Lun…"); an aperitivo whose label reads "…rosia aperitivo".
- **Unreadable, listed as "Name this bottle at the bar":** two cognac decanters on the top shelf; a whiskey decanter; the black figural tequila bottle; the colourful wax-topped bottles (likely more Rabbit Hole); the green bottles with red seals; the clear bottles behind Mathilde and Drambuie.

## The design (Ledger source; namespace `backbar`, so nothing collides with the stock's `SHELF`)
- **Files:** `js/data-backbar.js` (BACKBAR_GUIDE, generated), `js/ui-backbar.js`, `css/backbar.css`, `tools/backbar/` (plan.json, style.txt, schema.mjs, build-backbar.mjs with `--check`, fragments, reviews, the five photographs as evidence, never shipped), `tools/check-backbar.mjs`, `tools/check-backbar-browser.mjs`. On screen: "The liquor shelf".
- **The tab:** a sub-nav button "The liquor shelf" in Bar studies after Coffee and tea (`house-flow.js`), its door on the studies overview, `state.menu.view = 'backbar'`; addresses `#/menu/backbar` and `#/menu/backbar/<id>`; Back from a bottle to the shelf, from the shelf to Brennan's.
- **The shelf page:** grouped as the bar is (Liqueurs and amari; Cognac; Tequila, mezcal and pisco; American whiskey; To confirm at the bar), a search, Practise the cards, Take the quiz.
- **A bottle, top to bottom, the wine card's order:** name as the label prints it, Say it, category, producer and place; **At the table**: the forty-five second description (90 to 110 words: what it is, where and how it is made, how it tastes, how we pour it, one line of story), then **The sale** (two sentences: the hook and the pour or the drink), then the ten and twenty second lines; **How we pour it** (neat, rocks, the glass, the classic it belongs in); **At the house** (the house's drinks that use it, read live from the pack by component and printed ingredient); **The facts** (base, age, cask, proof as the label states it, the house that makes it); **What guests ask**; **The story**; links out to the Ledger's producer library, the Cask Atlas chapter (bourbon, American rye, cognac), the canon drinks it belongs in, and the house's producer profile where the pack has one; recall cards and three quiz questions; sources.
- **The rules:** no price; nothing volatile (allocations, release prices); proof stated as "the label states it; each year's release differs" where it does (the Antique Collection, O.F.C.); nobody living named (historic founders only); British spelling; no dash; no allergen talk beyond the fixed pointer.

## How it runs (pushed as it goes)
1. **R0, inline:** attach the Ledger source with push access (the permission checker refused it once; this request needs it, and I ask you only if it refuses again); clone; merge ChatGPT's published branch (2937b4e) into main first; create a pushed `backbar-wip` branch; commit the photographs as evidence.
2. **One workflow:**
   - **The frame** (the hooks, the page, the deck, the quiz and the gates on three seed entries), running in parallel with the content.
   - **The content:** five chunks of five to six bottles, one author each (a master bartender: research with WebSearch, two sources for every figure, the photos read for what the label states), then one checker per lane on a sample with a sweep.
   - **The integrator:** build, freeze, gates.
   - **The publish:** Ledger main, sync-wing, check-backbar in check-wings, bump-shared, check-all, the walk on the wing, push, Pages.
3. About 3 million agent tokens.

## Verification
- **Ledger:** every gate including check-backbar (shape, counts, caps, voice, nobody named, links resolve, quiz quality, the house rows), check-nav with the new view, the browser gate (cold addresses, Back, the deck and quiz, 375 and 390 px day and night), the walk.
- **Site:** check-all 9 of 9 with check-backbar on the wing; the walk; Pages success.

# DONE (2 Nov 2026): the Wine Atlas made a course: a guided path, study at the top of every page, map and district drills, compare two regions, readiness, and the fourteen places the Court names that the atlas lacked (codex56)

## Context
The owner asks for a deep review of the Wine Atlas to improve it, expand it and make the flow of learning easier. Two read-only reviews of master de167d5 found the content strong (115 complete region articles, 24 country pages, 129 field maps, 1,384 districts with notes, 952 cards, 885 questions) but the learning hard to reach: no study door on the root, a region's drill below 3,000 words of reading, no guided order, no schedule or readiness for region study, the districts and the map duplicated across screens, and 2 MB fetched on the first visit. The Court's Certified curriculum names places with no article of their own. The owner chose (2 Nov): **the flow work plus the Court's gaps**: about fourteen new region articles and the fixes, about 4 to 5 million agent tokens.

## A. The content (the regions pipeline in .scripts/regions, committed at bd137bf: roster.cjs, BRIEF-DEEP.md, check-fragment, build-regions with `.more` off-map articles, pin-ids, apply-roster)
- **The fourteen new articles** (off-map, `mapless: 1` under their country's sheet, the existing record schema at the Certified depth with depth tags on places): France: jura, savoie, south-west-france, corsica; Italy: emilia-romagna, marche, lazio, calabria-basilicata, liguria-valle-d-aosta; Spain: txakoli, ribeiro-ribeira-sacra (Valdeorras folded in), canary-islands; Germany: mittelrhein; United States: virginia. The roster's MORE list is trimmed to these fourteen (the other fifteen and the seven new countries move to a DEFERRED list), and its place moves are corrected to the articles' real names (Abruzzo's "Marche, the neighbour to the north", Umbria's Lazio, Campania's Basilicata and Calabria, Bierzo's Ribeira Sacra and Valdeorras).
- **Five chunks, author then refuter** (3, 3, 3, 3, 2 articles), staged under `.scripts/regions/staging/<chunk>/` and committed and pushed as they go; every fact in two sources or one primary, nobody living, no superlative, British, no dash; 6 to 10 cards and 6 to 8 questions each.
- **The fixes:** the 25 articles no CMS subject reaches, and the fourteen new ones, added to their subjects' maps (`.scripts/cms/map/<subject>.json`, then `build-cms`); the duplicated places (Toro inside Toro and the others the review names) removed in the fragments; the resolver misses (Carmel, Israel; Snake River, Idaho) and the Argostolion pin added as aliases; the region questions' answer positions dealt evenly at build (35 per cent sit first today) as build-cms already does; each region's district count written into the index at build so the root needs no fetch; the stale index header rewritten.
- **The maps:** the fourteen show their country's sheet with a "field map to come" line; a brief for ChatGPT names the fourteen field maps to draw (Claude does engineering, ChatGPT the art).

## B. The flow (one layer, `js/codex56.js`, after codex55 and before boot; var and function only; typeof guarded; CSS in `v56-style`; nothing earlier edited, and ChatGPT's atlas-context.js and field atlas only wrapped)
- **The root opens on the learner:** "Start here" for a new learner, else "Continue" with the next region in the Court's order (the 44 subjects already map onto the regions, so the path is the curriculum's own); then study doors (Today's region cards, Drill a country, Map quiz, Compare two regions); then each country with a readiness line (read, cards known, questions right); the sheets and the full list below. No 2 MB fetch: counts come from the index.
- **Region study scheduled:** region cards and questions get due dates in the Codex's own spaced repetition rules (a v56 slot beside codex39's grades, which stay); a due count on the root and the region page; region answers feed the CMS readiness of the subjects that map them.
- **The region page leads with study:** under the title, a sticky row (Summary, Map, Districts, Read, Flash, Drill, Map quiz, Previous, Next in the Court's order); **In one minute**, a summary card drawn from the article's own fields (the climate in a line, the main grapes, the ladder's top tiers, one exam line, one trap); the inline map loads when it scrolls into view; The districts show the first eight with "Show all", and marking a district no longer throws the page to the map.
- **New drills from the data already there:** a **map quiz** on any field map (tap the named place; name the marked place), **district cards** (a district's name to its note and region), **compare two regions** side by side (climate, soils, grapes, wines, the ladder, exam lines).
- **Duplicates folded:** the field map screen and the field atlas index draw as the region page and the root (their addresses keep working); answer links open the region page; the regions index becomes the root's country list; the sheet view gains its study doors; a technique opened from the atlas lights Wine Atlas and climbs back to it.
- **Data shown cleanly:** the field atlas's American spellings and en dashes (ChatGPT's generated data) are corrected at display.

## C. Gates and proof
- check-regions with the fourteen (the trimmed roster whole, ids pinned, the join, the house wines still resolving), build-regions and build-cms `--check`, check-cms with the new map rows.
- New `.scripts/check-atlas-course.js`: the path order equals the curriculum's; due dates and readiness on seeded grades; the summary card's fields; the map quiz's answer is the pin; district cards and compare draw from the records; the folded screens; voice; var and function only; the shell (codex56.js, codex-v115).
- check-atlas, check-atlas-nav, check-house-only and the script-order lists one layer on; every other gate unchanged; the walk extended (the root's path and study doors, a region's study row and summary, a map quiz answered, district cards, compare, the folded addresses, a new article such as Jura, at 375 and 390, day and night).

## D. How it runs (pushed as it goes, at most three agents at once)
1. **W1 content** on `codex56-wip`: two lanes of author then refuter over the five chunks; then one integrator (roster, staging into fragments, apply-roster, the fixes, build, check-regions, the CMS maps, build-cms, the ChatGPT brief).
2. **W2 layer**, in parallel: the layer agent (B) against the current index; when W1's integrator has pushed, the gates and walk agent (C) on the final data.
3. **W3 publish:** merge to master, sync the site, bump-shared, check-all with clean source worktrees, the walk on the wing, push the branch and main, Pages.
Both workflows commit to `codex56-wip` in one checkout under a shared git lock.

## Verification
- Codex: every `.scripts` gate including check-regions (115 + 14), check-cms, check-atlas, check-atlas-course, check-card; the walk at 375 and 390, day and night, clean console.
- Site: check-all 9 of 9; the walk on the served wing; Pages success.

## Findings: the learning flow (read-only review of master de167d5)
1. The root has no study door, and a region's drill sits last, below the map, the districts and the article (codex55:989, 1016-1019).
2. No spaced repetition or due count for region cards and questions; region results feed no readiness (codex39:1915-1920, 684-690; codex53:1166-1184).
3. No guided path, no "start here", no progress on the root; the read count lives on an index nothing links to (codex39:1100; codex54:1008).
4. The districts list is long, always open, and each map pin tap jumps the page (codex55:898-918, 1087).
5. About 2 MB fetched on the first root visit and retried on every visit; a 430 KB map loaded eagerly on every region page (codex55:783-793, 826-847).
6. The field map screen duplicates the region page, and answer links land there instead (codex45:220-248; atlas-context.js:38).
7. The regions index and the field atlas index duplicate the root; the cold Back chain runs through the regions index (codex39:802-805; codex45:98-132).
8. The sheet view is a reading dead end with no deck or drill (codex31:146-197).
9. Next stops at the edge of each sheet and sits at the very bottom (codex39:1024-1027).
10. The Techniques chip leaves the tab; on England, Canada and Eastern Europe the techniques block sits above the map (codex46:44-63, 220-226).
Missing for the Certified exam: a guided order (the Court's 44 subjects already map onto the regions), a start here, per-country readiness, map quizzes, district drills, compare two regions, a summary card per region.

# DONE (2 Nov 2026): the Wine Atlas returns to the bar, the Library moves into More, and every region opens on its map, its districts and everything the Codex knows about it (codex55)

## Context
The owner asks the Sommelier's Codex to move the Library tab into More and bring back the Wine Atlas tab, with all of the regional maps, knowledge and information for each region and the districts within it. The Wine Atlas tab was ChatGPT's (codex47: a word `worldmap`, owner of six atlas views); the CMS edition (codex53) replaced the bar with Home, Brennan's, CMS, Grapes, Library, More and moved the atlas under Library. Nothing has to be written new: the Codex already holds 17 world map sheets (`ATLAS_V2`), 129 field maps (codex45 `FIELD_ATLAS`: 115 regions and 14 countries, 1,284 mapped places with notes, grapes and water), 115 region and 24 country articles (codex39 `REGIONS`: the land, grapes and wines, how it is made, the law and labels, the places, producers, exam, traps, say it, sources), 43 techniques (codex46), the CMS subjects (codex53) and the Court's grid reads. Today a region's field map and its article are separate screens that only link to each other, and the districts appear twice (the map's places and the article's places), never together. The atlas-in-depth content lost with the old container is not part of this; this edition assembles what is published.

## The design (one layer, `js/codex55.js`, after codex54 and before boot; var and function only; every wrapper typeof guarded; CSS in a `v55-style` element; nothing in codex1 to codex54, house-learning-flow.js, atlas-context.js or the css edited)
- **The bar:** `V25_NAV` = Home · Brennan's · CMS · Grapes · Wine Atlas · More. The Library word leaves the bar; codex47's stylesheet stays off (its two-row grid); the due pill moves to More (Practise now lives under it). Widths measured at 320, 375 and 390 in the walk, one row, every word 44 px.
- **Owners and parents:** the six atlas views (worldmap, regions, country, region, fieldatlas, fieldmap) owned by `worldmap` again, `V25_AREA.worldmap = 'worldmap'`, the Wine Atlas root's parent Home; every view owned by `library` (the Library, the bank, Practise, the decks, quizzes, drills and runs that light Library today) owned by `more`, the Library's parent More. Every address keeps working.
- **More:** the page opens with **The Library** as its first group (rows for Practise, The question bank and The reading rooms, each opening its section of the Library page, which keeps its address `#/library` with Back to More), then More's own groups as today. The Library page loses its atlas section (now the tab); a tap on the More word from the Library or anything under it returns to More.
- **The Wine Atlas root** (a hub drawn for `worldmap` with the sheet view still answering `#/v/worldmap/{sheet}`): chips (The World Map, Countries, Every region, Field maps, Techniques); the 17 sheets as doors; then every country in map order with its regions beneath, each row naming the region, its district count and its two doors in one: the region page.
- **The region page, one place for everything** (a wrapper of codex39's article): the field map drawn inline at the top through codex45's own renderer when one exists for the slug (else the sheet with the region marked), then **The districts**, one list joining the article's places (with their sub-places and depth tags) and the field map's places (kind and note), each district a target that highlights its point on the map; then the article's sections as today; then **In the Codex**: the techniques used there (codex46), the CMS subject (codex54's `v54SubjectFor`), the Court's grid reads for that region (`GRID_READS`), the grapes' pages (`v53GrapeKey`), the producers, the region's flashcards and drill. The field map screen stays by address and points to the region page.
- **The country page:** its country field map inline (14 have one), the classification ladder and label words, then its regions as on the root with their district counts.

## Gates and proof
- New `.scripts/check-atlas.js` (sandbox, check-card's loader): the bar's six words in order; owners and parents; More's Library group; the Library without the atlas section; the root's 17 sheet doors and every country with every region; on five regions and two countries: the inline map, the districts joined with no name lost from either source, every In the Codex door resolving; the voice rules; var and function only; the shell.
- Move the pins that hold the old bar: `check-atlas-nav.cjs` (rewritten for codex53's six words; now the Wine Atlas word and More), `check-house-only.cjs` (the bar order, the pill on More, Library's lit word now More), `check-card.js` and `check-cms.js` and `check-grapes.js` where they read a parent or owner of `library`, every script-order list gaining `codex55.js` before `boot.js`. Every other gate runs unchanged.
- The walk (`walk54.mjs` extended): the bar at 320, 375 and 390, day and night; More's Library rows and Back; the Wine Atlas root; three regions (Burgundy, Napa, Rioja) with the inline map, a district tapped and its point marked, every door and Back; a country page; cold reloads of `#/v/region/burgundy`, `#/v/worldmap`, `#/library`; a clean console.

## How it runs (short, pushed as it goes)
1. One workflow, three agents in sequence, on a pushed branch `codex55-wip` (commit and push after every section): the layer (bar, owners, More, root, region and country pages) → the gates and the walk → publish (Codex: index.html `codex55.js?v=1`, sw.js `codex-v114`, CLAUDE.md section, next layer codex56; merge to master; site: sync-wing, bump-shared, check-all with clean source worktrees, the walk on the wing, push the branch and main, Pages).
2. About 1.5 million agent tokens; no content authoring.

## Verification
- Codex: every `.scripts` gate including check-atlas and check-card; the walk at three widths, day and night, clean console.
- Site: check-all 9 of 9; the walk on the served wing; Pages success.

## Running (2 Nov 2026, 16:00 UTC)
- Branch codex56-wip (from master de167d5) holds .wip/PLAN.md, serve.mjs, walk54.mjs and course.workflow.js (3032cab). Run wf_0bd254fd-b0c (scratchpad/card/course.workflow.js): two content lanes (c1 jura+savoie, c3 emilia-romagna+marche+lazio, c5 txakoli+ribeiro-ribeira-sacra+canary-islands; c2 south-west-france+corsica, c4 calabria-basilicata+liguria-valle-d-aosta, c6 mittelrhein+virginia), each author then refuter, staged under .scripts/regions/staging/<chunk>/ and pushed; the layer agent in parallel; then the integrator, the gates and walk, the publish. Commits go through flock on scratchpad/card/git56.lock. Resume with the run id; if the scratchpad is gone, copy the script from .wip on codex56-wip.
