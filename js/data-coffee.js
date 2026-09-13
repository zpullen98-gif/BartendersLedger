/* ============ COFFEE & TEA ============
   Nine sections, shaped exactly like ONTAP_STUDY and SERVICE_STUDY so one
   renderer pattern, one search-index pattern and one check in tools/check.mjs
   cover all three.

   This tab is REFERENCE AND VIDEO, not a drill deck. COFFEE_REF is deliberately
   absent from DECK_SOURCES, allDrinks, groupsFor and cardTicket, which is the
   older Behind the Stick shape rather than the newer On Tap one. SERVICE_REF
   has shipped that way since the beginning and nothing in either tree assumes
   otherwise: every consumer of a *_REF array names its array explicitly, and
   there is no generic loop over reference tabs. If it ever should become a
   deck source, the shape is already right and the change is a handful of lines
   in ui-study.js.

   The drinks stay where they live. This app already holds 22 coffee and tea
   cocktails, 21 zero-proof drinks under a category called Coffee, Tea & Warm,
   and 12 shots, each with its own lore. Spiked & Service indexes them and
   links out to them; it does not copy a single spec, because a cocktail name
   is a spaced repetition primary key and moving one rewrites study records.

   EVERY WORD IN THIS FILE IS WRITTEN WITHOUT AN EM DASH, on purpose. The
   monorepo counts them across the published tree against a baseline of 14 with
   nine already spent, so dash-free prose is what lets this file be byte
   identical in both trees rather than two diverging copies.
   ============ */

const COFFEE_STUDY = [
  { key:"machine", title:"The Machine", rows:[
  ] },
  { key:"shot", title:"The Shot", rows:[
  ] },
  { key:"milk", title:"Milk & Latte Art", rows:[
  ] },
  { key:"filter", title:"Filter & Cold Brew", rows:[
  ] },
  { key:"tea", title:"Tea Service", rows:[
  ] },
  { key:"leaf", title:"The Leaf", rows:[
  ] },
  { key:"matcha", title:"Matcha & Chai", rows:[
  ] },
  { key:"spiked", title:"Spiked & Service", rows:[
  ] },
  { key:"faults", title:"Faults", rows:[
  ] },
];

/* Reference cards, filed by `dom` against a section key above. A card whose
   dom names no section renders nowhere and searches to a dead route, which is
   why tools/check.mjs closes that loop. */
const COFFEE_REF = [
];
