# Producers and flagships: the authors' and refuters' brief (21 November 2026)

The owner asked, in these words: "we will move to the Bartenders Ledger and do the same by adding 5 of the most famous
and well known producers of each style such as Pappy Van Winkle for wheated bourbon, the same for all region's of
Scotland, Cognac, Armagnac, etcetera". And: "make this the best app possible to help me learn and progress in my
career".

"The same" is the Sommelier's Codex's Producers and flagships tab. So every style of the Whisky & Brandy tab gains five
houses a bartender is expected to know, each with the one bottling a guest asks for, told in depth: what is in the
bottle, how and where it is made, the wood and the time, the strength, how it tastes, how it is poured, the words on
its label, the line to say at the table, and the story behind it. Wave one is 32 groups of five, 160 records, whisky
and brandy. You write one group at a time, as one JSON file: `tools/caskhouses/fragments/<group>.json`. This brief,
`plan.json` and the pilot fragment (`fragments/wheated-bourbon.json`) are all you need. Read the pilot before you
write a word.

The Bartender's Ledger is the owner's own study tool. He tends bar and studies for his career. It is never sold and is
used by him alone: no legal notice, no price, no gating, ever.

## What a pick is

A pick is the label a guest asks for, not the company behind it: Pappy Van Winkle, W. L. Weller, Larceny, Lagavulin,
Hennessy. `producer` is that label as printed. `madeBy` names the distillery or company that makes it where another
name does (Weller is made by Buffalo Trace Distillery); it is `""` where the label makes its own. `flagship` is the one
bottling of the label a guest means. The plan's `why` says why this house and this bottling stand in the group, and
its `note` says what the planner could not confirm and asks you to. Neither ships. Your record must settle every
question the note raises, or say in `report` that it could not.

## What you may run, and what you may not

| You run | What it does |
|---|---|
| `nice -n 19 node tools/caskhouses/show.mjs <group>` | Prints what the Ledger already holds on the group and each of its five houses. Writes nothing. |
| `nice -n 19 node tools/caskhouses/show.mjs <pick key>` | The same for one house (`pappy-van-winkle`). |
| `nice -n 19 node tools/caskhouses/build-caskhouses.mjs --lint <group> [<group> ...]` | Holds your fragment to `schema.mjs`. Writes nothing. |
| `nice -n 19 node tools/caskhouses/build-caskhouses.mjs --lint --chunk <c1 to c11>` | The same, for your whole chunk. |
| `nice -n 19 node tools/caskhouses/schema.mjs --caps` | Prints every cap. |

Authors and refuters run `--lint` and nothing else. **Never**: the writing build (`build-caskhouses.mjs` with no
`--lint`), `--freeze`, an edit to `js/data-caskhouses.js`, `keys.v1.json`, `schema.mjs`, `build-caskhouses.mjs`, another
group's fragment, or any file of the app (`index.html`, `sw.js`, anything under `js/` or `css/`). `plan.json` changes
only by a swap (below). `people.json` may grow: whoever finds a living person adds the name there in the same commit.

The lint prints two kinds of line. A line that starts `fragments/<group>.json:` is a PROBLEM: the field, then the
rule. Fix every one. A line that starts `note:` is advice for a second reader: a word that speaks of the present
(today, now, still), a claim of a first or an only, a distiller's role with no year beside it, a record with no primary
source, a shop among the sources, a record not yet refuted, the count of reading words. Read each note, fix it if it is
fair, leave it if the sentence is right. `sound` means no problem stands.

Commit by explicit path, never `git add -A` or `git add .`, never `commit -a`, never a rebase, an amend or a force
push, never a change of branch. Through the lock your task names, then push:

    flock <the lock> bash -c "cd /home/user/bartendersledger && git add tools/caskhouses/fragments/<group>.json && git commit -q -F <message file> && git push -q origin houses-wip"

Every commit message ends with the two attribution lines the task gives. Never the name of a model or an assistant in
a file. Commit after each group, so nothing is lost if you are cut off.

## Read first

1. `show.mjs <group>`: the roster's row, the style's own page in brief (its law, its three lines, the houses it
   names), and for each house the pick, the liquor shelf bottle the roster links (in full), the Library's record, and
   every sentence of the Cask Atlas, the styles and the shelf that names the label.
2. Build on what the app already teaches and never contradict a reviewed page. The Cask Atlas, the styles and the
   liquor shelf were written under the house voice and checked: a fact they state needs no new source. The Library's
   older records (`PRODUCERS`) were written before it: take their facts, check them, and never their wording. Where
   you believe a page of this repo is wrong, keep your record right and say so in `report`.
3. Research the rest. WebFetch is refused for many hosts here: try a host once and never retry a refused one.
   WebSearch works; restrict it to a producer's or a regulator's own domain (`allowed_domains`) to read that body
   through its search summary, and mark the source `"read": "search"`.

## The voice, for every string

The Ledger's, the strictest reading. The lint holds all of it.

- **No dash of any kind**: not the long one, not the short one, not an entity, not two hyphens, not a hyphen standing
  alone between spaces. Use a comma, a colon or a full stop. A range is "1935 to 1972", "12 to 15", never with a
  hyphen. Nothing at or above U+2190 (no arrows, no stars), no degree sign, no fraction glyph.
- **British spelling** in our own words: colour, flavour, ageing, centre, litre, labelled, recognise, savoury, per
  cent. Whisky for Scotch, Japanese and Canadian, whiskey for Irish and American. A label's own words stay as the
  label prints them (`bottle.name`, a label `term`, another bottling's `name`).
- **No superlative and no selling word.** Refused: best, finest, greatest, rarest, smoothest, purest, richest, oldest,
  most famous (and most celebrated, prized, coveted, sought, popular, iconic, beloved, revered, respected, awarded,
  decorated), world's, legendary, iconic, ultimate, unparalleled, unrivalled, exquisite, award winning, best selling,
  sought after, coveted, cult, holy grail, unicorn, perfect, perfectly, amazing, delicious, unique, incredible, world
  class, luxurious, premium, crown jewel, masterpiece; and largest, biggest, smallest, youngest, longest, shortest,
  tallest, earliest, heaviest, lightest, sweetest, softest, smokiest, peatiest, strongest, highest, lowest, boldest,
  truest, definitive, quintessential, "the most ..." and "the least ...". The owner's own phrase, "most famous", is
  refused: say what the house is and why a bartender must know it. The one exception is the label's own name: the
  roster's flagship may print such a word (Ballantine's Finest) and the name stands as a name.
- **No price** and no currency: price, priced, pricing, pricey, cost, costly, dollars, cents, cheap, expensive, bargain,
  value for money, affordable, msrp, retail, resale, any currency sign.
- **No score and no medal**: points, a mark out of a hundred, score, rating, rated, medal, double gold, trophy, whisky
  of the year, distillery of the year, hall of fame.
- **No allocation and no scarcity talk**: allocated, allocation, lottery, secondary market, flipping, sold out, hard to
  find, limited supply, in stock, out of stock, portfolio, scarce, scarcity, rarity, waiting list, unobtainable,
  shortage, queue, limited quantities, limited availability, once a year, collector, collectible. A bottling released
  yearly is "a yearly release", and its strength follows the rule below.
- **No allergen, dietary or health talk**: allergen, gluten, coeliac, dairy free, nut free, vegan, vegetarian, kosher,
  halal, sulphites, safe for, healthy, detox, antioxidants, good for you, medicinal benefits, cure, remedy, aids
  digestion. (Medicinal whiskey under Prohibition is history and stands.)
- **No pour size stated as ours**: no figure in ounces, millilitres or centilitres, no "a shot", "an ounce", "two
  fingers". Say how it is poured (neat, with a little water, over one large cube, in a highball), never how much.
- **A per cent sign only in a strength**: "45% ABV (90 proof)". Elsewhere write per cent ("70 per cent corn").
- **The owner's workplace is never named**, in any field.
- **Taste is this bottling's**, in concrete words, with no figure. Name the thing (honey, baked apple, toasted bread,
  cinnamon), never a verdict (smooth, lovely). Where bottles differ, say often or usually.

### People

**Nobody living is named**: not in prose, not on a card, not in a question, not in a source's title. Say the role:
the founder, the founder's grandson, the family, its master distiller, the blender who made it. `people.json` lists
the names the lint refuses; it grows as you and the refuter find more. Add a name the moment a source shows one.

A house keeps its name. Pappy Van Winkle, Jack Daniel's, Jim Beam, Evan Williams and George Dickel are labels, and
the label is never refused. A person is refused only when named as a person, and the lint cannot always tell: where a
label is also a living person's name, the name stands only for the house.

**The dead are named with their dates**, once, where the story first meets them: "William Larue Weller (1825 to
1899)". If you cannot find a person's dates in two sources, describe the person instead ("a Louisville salesman").
Where a dead person's name carries a living person's (the father of a living namesake), the lint refuses it until the
name stands in `people.json`'s `historic` list: add it there in the same commit, and state the year of death and your
two sources in `report`.

A name never follows a distiller's or a blender's title ("master distiller Xx" is refused). Write the dead the other
way round: "Elmer T. Lee (1919 to 2013), then master distiller, ...".

### Ownership and the present

**Ownership is history, and only history.** In `story` and `traps`, a sale may be told with its year: "sold to
Norton Simon in 1972", "bought by the Sazerac Company in 1999". The words owned by, acquired, acquisition, bought by
and sold to stand only there and only in a sentence that carries a year. Ownership as a present state is refused
everywhere: is owned by, now owned, today part of, its current owner, belongs to, a brand of, parent company,
currently. Do not write "has been owned by X since 1999": write "the Sazerac Company bought the label in 1999" and
stop.

**A present distiller or blender is never named and never described as a present fact.** "Its current master
distiller", "today's blender" and "the master distiller is" are refused. A role in dated history is fine.

Nothing true only this year: no production figure, no count of warehouses or stills given as fixed, no latest release.
A habit that has held for decades (every bottle dipped in wax by hand) stands.

## The sources rule

- **Every fact rests on two independent sources, or on one primary one.** Primary: the producer's own pages for its
  own dates and methods, hedged where it is the house's claim ("by its own account", "as the brand tells it"); the
  regulation itself for a legal class (27 CFR Part 5 for American whiskey, the Scotch Whisky Regulations 2009, the
  Irish Whiskey technical file, the Cognac and Armagnac cahiers des charges, a state statute).
- **A writer's own site and a shop's tasting note are leads, not sources for a fact.** Follow them to the producer or
  to a second independent account. A shop's photograph of the label may confirm a label term and nothing more.
- **A legend is told as a legend** ("the story goes", "the brand's claim"). A founding year that is the brand's claim
  for an ancestor, not for the label, is said so.
- **What you cannot confirm, leave out**, and say so in `report`. An empty field is a true answer.
- **Four or five sources a record**, each `{ "title", "url", "kind", "read" }`. Every `url` is https and stands once.
  `title` is the publisher and the page ("Maker's Mark: Our story", "eCFR: 27 CFR 5.143, Whisky"), never an author.
  `kind` is `primary` or `secondary`. `read` is `page` (you read the page) or `search` (a search summary drawn from
  that site).

## The fragment

One JSON object: `{ "group": "<group key>", "records": [ five records, in the roster's order ] }`. Each record, with
its cap in words and one line of example:

| field | what it holds | cap | example |
|---|---|---|---|
| `key` | the pick's key | | `"larceny"` |
| `group`, `producer`, `madeBy`, `style`, `chapter`, `shelf`, `library` | copied exactly: `producer`, `madeBy`, `shelf`, `library` from your pick; `group`, `style`, `chapter` from its group (`""` stays `""`) | | `"madeBy": "Heaven Hill"` |
| `say` | a respelling where a guest would stumble, syllables joined by hyphens, the stressed one in capitals; `""` where nobody stumbles | at most 10 | `"lah-FROYG"` |
| `place` | the town, then the county or region, then the state or country | 2 to 14 | `"Loretto, Marion County, Kentucky"` |
| `year` | a founding or first release year, only where two sources agree; else `""` | 4 figures | `"2012"` |
| `yearIs` | `"founded"` or `"first released"` beside a year; `""` beside none | | `"first released"` |
| `bottle.name` | the flagship as the label prints it; it carries every word of the roster's flagship | 1 to 14 | `"Larceny Small Batch Kentucky Straight Bourbon Whiskey"` |
| `bottle.class` | its class as the law and the label state it | 2 to 20 | `"Kentucky straight bourbon whiskey"` |
| `bottle.mash` | what it is made from; say plainly where the house does not publish its mash bill | 6 to 45 | `"Corn, wheat in place of rye, and malted barley; the house publishes no percentages."` |
| `bottle.still` | where and how it is distilled | 8 to 50 | `"Distilled at Bernheim in Louisville on a column still and a doubler."` |
| `bottle.wood` | the wood and the time, with the age statement if the label carries one | 6 to 45 | `"New charred American oak; no age statement on the label."` |
| `bottle.strength` | as the label states it; a yearly or batch release begins "Varies by batch" or "Varies by release" and carries no year | at most 20 | `"46% ABV (92 proof)"` |
| `bottle.taste` | how it tastes, in named things, no figure | 20 to 60 | `"Fresh bread, toffee and butterscotch, then honey and a soft, round finish."` |
| `bottle.pour` | how it is poured and the classic drinks it belongs in; no size | 12 to 45 | `"Neat or over one large cube; it belongs in an Old Fashioned."` |
| `bottle.label` | 2 to 4 `{ term, means }`: the words a guest meets on the label | term 1 to 6, means 4 to 24 | `{ "term": "Small Batch", "means": "No legal meaning: a marriage of a chosen number of barrels." }` |
| `table` | the line to say at the table, naming the house and the flagship | 30 to 50, one or two sentences | see the pilot |
| `story` | the backstory with its turning points | 140 to 220, at least two different years | see the pilot |
| `others` | 1 to 3 `{ name, note }`: other bottlings of the house a guest meets | name 1 to 12, note 4 to 30 | `{ "name": "Larceny Barrel Proof", "note": "The same recipe bottled uncut, in batches." }` |
| `traps` | 1 to 3: what is commonly got wrong | 8 to 40 each | `"Larceny is a label of Heaven Hill, not a distillery of its own."` |
| `cards` | exactly 2 `{ id, prompt, answer }` | id at most 24 characters; prompt 5 to 25; answer 6 to 50 | `{ "id": "namesake", "prompt": "Who is Larceny named for?", "answer": "..." }` |
| `quiz` | exactly 2 `{ id, tag, card, q, options, a, explain }` | stem 8 to 40; option at most 12; explain 8 to 45 | see below |
| `sources` | 4 or 5 `{ title, url, kind, read }` | title 2 to 20 | see above |
| `report` | never shipped: sentences for the refuter, the integrator and the owner; `[]` for none | at most 8 | |
| `checked` | never shipped: `null` until the refuter writes it | | `null` |

A record reads in at most 680 words (place, the bottle and its label, table, story, others and traps together). The
pilot's five records measure what a phone page reads well: the lint prints each record's count.

### The bottle, field by field

- `name`: read it off the label or the producer's own page. If the label's words cannot carry the roster's flagship
  (the bottling was renamed, or the roster's words were loose), that is a swap of the bottling: see A swap.
- `class`: the law's words and the label's. "Kentucky straight bourbon whiskey", "Tennessee whiskey", "single malt
  Scotch whisky", "Cognac VSOP, Fine Champagne". Where a word on the label has no legal meaning (small batch,
  reserve), say so in `label`, not here.
- `mash`: grains, or grapes, or fruit, in words. Give a figure only where the producer publishes it or two sources
  agree, and write per cent. Where the house does not publish its mash bill, say so plainly, and a widely given
  recipe is then "given as": "The house states only that wheat takes the place of rye; the recipe is widely given as
  70 per cent corn, 16 wheat and 14 malted barley."
- `still`: the distillery, the still (column and doubler, pot, Charentais alembic, continuous Armagnac still), the
  number of distillations where it matters, the proof off the still only where the producer gives it. Where a label
  is distilled under contract or the source is not disclosed, say that.
- `wood`: the cask (new charred American oak, former bourbon barrels, sherry butts, Limousin oak), the time, and the
  age statement as the label prints it, or "no age statement". Never an age the label does not carry, save as "the
  producer says about six years".
- `strength`: "45% ABV (90 proof)" for American labels, "40% ABV" where no proof is printed, then a market note after
  a comma if the label differs by market ("43% ABV, 40% in the United Kingdom"). A yearly or batch release never
  gives one year's figure: "Varies by batch, uncut" or "Varies by release, about 60 to 65% ABV".
- `taste`: this bottling's, in named things. Refused in spirit: "smooth and rich" (it teaches nothing).
- `pour`: neat, with water, on the rocks, in a highball, and the classics it belongs in by their names (an Old
  Fashioned, a Manhattan, a Rob Roy, a Sidecar). No pour size, no "we" for a house that is not ours.
- `label`: the words a guest reads and what each means. Print only what you are sure the label carries.

### The table line

Thirty to fifty words, one or two sentences, naming the house and the flagship: what it is, where it comes from, what
makes it itself, how it tastes or how to pour it. It is spoken, so no bracket and no list longer than three. Refused
in spirit: "One of the greatest bourbons ever made, loved by collectors" (a judgement, and no fact a guest can keep).

### The story

140 to 220 words, at least two different years: the founding or the first release, the people with their dates, the
turning points (a law, Prohibition, a fire, a sale, a closure, a revival, a move of stills), and why the flagship
matters behind a bar. Tell it in order. Hedge a legend. Ownership is dated history here and nowhere but here and the
traps. Close on what the bottle means to a bartender, not on a present fact that will age.

### Others and traps

- `others`: the bottlings a guest meets next ("Weller Antique 107", "Maker's Mark 46"). A name with a refused word in
  it is left out.
- `traps`: what is commonly got wrong. "Weller is a label of Buffalo Trace, not a distillery." "Small batch has no
  legal meaning in the United States."

### Cards: the id is a saved key

Exactly two. `prompt` is the cue and `answer` the answer; the prompt never gives the answer away, and one face names
the house or its flagship, because a card is dealt in a mixed deck. One card on the bottle, one on the story, is the
habit.

`id` is the card's own short name in lower case words and hyphens (`wheat`, `wax-seal`, `namesake`). The card's key is
`Cask Houses · <pick key>/<id>`, and that key is the owner's saved record of the card. Choose an id that names what
the card is about, so it stays true if the wording changes. **Once a group is built an id never changes**: reword the
card freely, keep its id. The two ids of a record differ.

### Questions

Exactly two: `id` is `q1` then `q2`; one `tag` is `bottle` (what is in it, how it is made, its label) and the other
`story` (the house's history). `card` is the id of the card the question is paired with, one card each: a question
has no key of its own. A scene at a table or a fact a bartender is asked. Four options of one kind, one key (`a`, 0
to 3), never NOT or EXCEPT, never all or none of the above, the key never in the stem and never much the longest
option. The two keys of a record sit in different positions, and no position holds more than five of a group's ten.
`explain` says why the key is right and why the nearest wrong option is wrong.

    { "id": "q1", "tag": "bottle", "card": "wheat",
      "q": "A guest asks what sets this bourbon's recipe apart. Which grain takes the place of rye?",
      "options": ["Oats", "Wheat", "Rice", "Millet"], "a": 1,
      "explain": "Wheat stands in for rye as the second grain, which is why the bourbon reads softer; oats play no part in it." }

### Report and checked

`report` is where the truth that did not fit goes. Write, in plain sentences:

- what was left out for want of a source, and where you looked;
- a pick in doubt (a house a guest would not know, a flagship the house does not lead with, a label that has closed);
- a proposed swap, with its reasons;
- where this repo's own pages disagree with your sources (which page, what it says, your source);
- a name you added to `people.json`, and a name you added to its `historic` list with the year of death and the two
  sources;
- every question of the plan's `note` you could not settle.

`checked` stays `null` until a refuter writes it.

## The refuter: refute, then record

A refuter reads each record of a group with one instruction: refute it. Every date, name, grain, still, cask, age,
strength, class, label term and story beat is tried against two sources or one primary. The refuter fixes what is
wrong in place, cuts what cannot be confirmed, never changes a card's `id`, lints the fragment sound, and writes on
every record:

    "checked": { "date": "2026-11-22", "by": "refuter", "verdict": "sound",
                 "changed": [], "open": [] }

or

    "checked": { "date": "2026-11-22", "by": "refuter", "verdict": "changed",
                 "changed": [ "story: the first bottling was 1958 in both sources, not 1959; now 1958." ],
                 "open": [ "bottle.wood: the producer gives no age; about six years rests on one trade source." ] }

`verdict` is `sound` (nothing changed) or `changed`; `changed` lists every change in a sentence, what and why; `open`
lists what the refuter doubts and could not settle, for the integrator. A group ships only whole, and only when every
one of its five records carries a refuter's `checked`: nothing reaches the owner unrefuted.

## A swap

- **Of the bottling.** Where the house does not lead with the roster's flagship, or the label has renamed it, the
  author proposes another bottling in `report`. With the refuter's agreement the pick's `flagship` is changed in
  `plan.json`, in the same commit as the fragment, and recorded in the group's `swaps`. **The pick keeps its key**, and
  so do its two cards:

      { "kind": "bottling", "key": "rebel", "from": "Rebel 100", "to": "Rebel Kentucky Straight Bourbon 100 Proof",
        "why": "the reason in eight words or more", "agreed": true, "date": "2026-11-22" }

- **Of the house.** Where a pick is wrong (a label that has closed, a house that is not of the style), the author
  proposes another house from the lane file (`plan-lanes/`, two alternates a group). With the refuter's agreement the
  pick is replaced under a new key and recorded (`"kind": "pick"`, `key` and `to` the new key, `from` the old one).
  Only before the group is built: a built pick's key never changes. `build-caskhouses.mjs --plan` must still pass:
  every key, producer and flagship once in the roster, five picks a group.

## What the lint cannot hear

The lint counts and refuses; it does not taste and it does not read history. Before you commit, say the table line
aloud: would a guest follow it, and would the house recognise itself in it? Does every note in the taste belong to
that bottling and not to its style in general? Is every date in two sources or on the house's own page, every legend
told as a legend, every person either dead and dated or not named? Is the mash bill the producer's, or marked as
"given as"? Would the owner, having learnt the two cards and the two questions, know the bottle when a guest asks for
it? Is anything in the record true only this year?

## Before you commit

1. `build-caskhouses.mjs --lint <group>` prints `sound`.
2. Every note read and answered.
3. `report` written: what was left out, any doubt, any disagreement with this repo's pages, every name added to
   `people.json`.
4. Your one fragment staged by its path (and `people.json`, and `plan.json` for an agreed swap), committed through the
   lock, pushed.
