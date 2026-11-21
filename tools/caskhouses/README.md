# tools/caskhouses: Producers and flagships

The pipeline behind Producers and flagships, the page of the Whisky & Brandy tab that gives every style five houses a
bartender is expected to know, each with its one flagship bottling in depth, its story, two recall cards and two
questions. Nothing in this folder ships: it writes one generated file, `js/data-caskhouses.js` (the global
`CASK_HOUSES`), and the keys a person's saved cards hang on. Run every command with `nice -n 19` on a shared machine.

## The files

| File | What it is |
|---|---|
| `plan.json` | The roster: 32 groups of five picks in 11 chunks (wave one, whisky and brandy). A pick is the label a guest asks for, with `madeBy` for the distillery, the one `flagship`, the planner's `why` and `note`, and the links (`shelf`, `library`; the group's `style` and `chapter`). It changes only by a swap. |
| `plan-lanes/` | The planners' six lane files, kept as written: the alternates for a swap are there. Nothing reads them. |
| `BRIEF.md` | The contract for authors and refuters: the record field by field, the voice, the people, the sources, the report, the checked block, a swap. |
| `schema.mjs` | The one validator of a fragment, a record and the roster. `--caps` prints every cap; `--test` proves the rules on seeded records. |
| `build-caskhouses.mjs` | The build and the lint. Writes `js/data-caskhouses.js`, `keys.v1.json` and `build-log.json`. |
| `show.mjs` | Prints what the Ledger already holds on a group or a label, so an author starts from the app's own words. |
| `people.json` | `names`: the living, never named. `historic`: the dead whose names would otherwise be refused. It only grows. |
| `keys.v1.json` | Every recall card key, in the roster's order, and whether the list is frozen. |
| `build-log.json` | Written by the build: what shipped, the reading words a house, what is missing, refused or waiting for a refuter. |
| `fragments/<group>.json` | One group: `{ group, records }`, five records in the roster's order. The pilot is `wheated-bourbon.json`. |

## The modes

    node tools/caskhouses/show.mjs <group | pick key | --groups>          what the app already says; writes nothing
    node tools/caskhouses/schema.mjs --caps | --test                      the caps; the rules proved on seeded records
    node tools/caskhouses/build-caskhouses.mjs --lint <group ...>         hold fragments to the schema; writes nothing
    node tools/caskhouses/build-caskhouses.mjs --lint --chunk <c1..c11>   the same for a chunk
    node tools/caskhouses/build-caskhouses.mjs --lint --all               the same for every fragment on disk
    node tools/caskhouses/build-caskhouses.mjs --plan                     the roster proved against the shipped data
    node tools/caskhouses/build-caskhouses.mjs --check                    the shipped file and the keys are the build
    node tools/caskhouses/build-caskhouses.mjs                            the writing build, the roster whole
    node tools/caskhouses/build-caskhouses.mjs --partial                  the writing build, a roster not yet whole
    node tools/caskhouses/build-caskhouses.mjs --partial --unrefuted      a pilot: ships sound records no refuter has read
    node tools/caskhouses/build-caskhouses.mjs --freeze                   the whole build, then the keys are frozen
    options: --fragments <dir> --out <file> --keys <file> --log <file>    scratch copies and gates

Authors and refuters run `show`, `--caps` and `--lint`, and nothing else. The writing build belongs to the pipeline
engineer, the page engineer and the integrator.

## The rules, in one page

- **A group ships only whole**: its fragment present, its five records sound by `schema.mjs`, and every record carrying
  a refuter's `checked` block. The whole build ships every group of the roster or writes nothing. `--partial` ships
  the groups that can and lists the rest. `--unrefuted` stands only beside `--partial`; the whole build and
  `--freeze` refuse it, and the data file says in its head and in `meta.unrefuted` when it holds unread records.
- **The data file is generated**, pure ASCII (everything beyond is written as a backslash-u escape), one record a
  line, never edited by hand. `--check` fails when it is not byte for byte what the fragments build.
- **The record** follows the Sommelier's Codex's flagship record, turned to spirits: the house (the label, how to say
  it, the place, who makes it, a year only where two sources agree), the bottle (name, class, mash, still, wood,
  strength, taste, pour, label terms), the table line, the story with at least two dated turning points, other
  bottlings, traps, two cards, two questions, four or five https sources, and `report` and `checked`, which never
  ship. A record reads in at most 680 words; `schema.mjs --caps` has every cap.
- **The links** a record carries are copied from the roster and each is resolved against the shipped data, and
  refused when it does not resolve: the group's `style` (a `CASK_STYLES` id) and `chapter` (a `CASK_CHAPTERS` id), the
  pick's `shelf` (a `BACKBAR_GUIDE` entry id) and `library` (a name in the Library's `PRODUCERS`, its apostrophe
  included; the page's address is the app's `slugify` of it). An empty link is `""`.
- **The keys.** A card's key is `Cask Houses · <pick key>/<card id>`: the pick's key from the roster, the card's own
  short id from the fragment. Nothing is minted, so a reworded card and a swapped bottling keep their keys. A
  question has no key: it ships the key of the card it is paired with, as `ckey`. While `keys.v1.json` says
  `frozen: false` it follows the build; after `--freeze` the build may add a key and never loses one, and a lost key
  refuses the build. A pick's key never changes once its group is built.
- **The voice** is the Ledger's, the strictest reading, and its lists are imported from `tools/backbar/schema.mjs`,
  `tools/caskstyles/schema.mjs` and `tools/brew/schema.mjs`, never copied: British spelling; no dash in any form and
  no spaced or doubled hyphen; nothing at or above U+2190, no degree sign, no fraction glyph; no superlative and no
  selling word; no price, score, medal, allocation or scarcity talk; no allergen, dietary or health talk; no pour
  size; the owner's workplace never named. A label's own printed words keep their spelling, and the roster's
  flagship may carry a word the voice refuses.
- **Two departures from the styles and the shelf, on purpose.** Names are refused by a list of living people
  (`people.json`), not allowed by a list of proper nouns: a house's own name is the house, and a person is refused
  only when named as a person. Ownership is history: the words owned by, acquired, acquisition, bought by and sold to
  stand in the story and the traps, in a sentence with its year, and nowhere else; ownership as a present state, and
  a present distiller or blender as a present fact, are refused everywhere.
- **The sources.** Every fact rests on two sources or one primary one: the producer's own pages for its own dates and
  methods, the regulation for a legal class. A writer's own site and a shop's tasting note are leads. What cannot be
  confirmed is left out and said in `report`.
- **A swap** is recorded in the group's `swaps` in `plan.json`, with the refuter's agreement: of the bottling (the pick
  keeps its key) or, before the group is built, of the house (a new key). `--plan` must still pass.

## Where things stand (21 November 2026)

The roster is whole and proved. One group is written, the pilot `wheated-bourbon`, and no refuter has read it yet:
`js/data-caskhouses.js` holds those five houses as an unrefuted pilot and says so. No page loads the file. The page
(`js/ui-caskhouses.js`, `css/caskhouses.css`), its hooks in the shell and its gates are another engineer's work.
`keys.v1.json` holds ten keys and is not frozen: freeze it only with the roster whole, before the page reaches the
owner's device.
