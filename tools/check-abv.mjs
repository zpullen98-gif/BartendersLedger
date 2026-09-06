/**
 * Does every measured spirit line carry an ABV, and does every measured
 * non-alcoholic line stay out of the spirit column?
 *
 * PORTED FROM THE WING, where it has lived alone since the strength work, and
 * where the standalone could not run it. That asymmetry is itself the bug this
 * header should record: the ABV numbers were edited in the standalone and gated
 * only in the monorepo, so every check ran one sync too late.
 *
 * Two silent failure modes, both found by running the app's own functions over
 * its own specs rather than by reading the code:
 *
 *   1. lineABV() returned 0 for any line no ABV_TABLE row matched, so a whole
 *      spirit the table had no row for ("2 oz rhum agricole blanc") scored as
 *      water. Tools > Strength printed a Ti' Punch at 0 percent and "you can
 *      serve two", and Dealer's Choice taught the same band.
 *   2. classifyLine() falls through to 'strong' for any line no regex matches,
 *      so Pour Cost billed "5 oz cold water" at the bottle rate.
 *
 * THE VOCABULARY VERSION adds three checks the regex table could not support,
 * each one a rule the review found being broken:
 *
 *   6. every row must resolve an abv, through its own field or its parents.
 *      An alcoholic KIND with no number is a bug; a juice or a syrup takes a
 *      zero by default, which is why absent and zero have to stay different.
 *   7. an authored zero must survive the walk. Written as `row.abv || parent`
 *      it is silently discarded, and the zero-proof rows exist to say zero.
 *   8. an either/or must take the MAX of its members. A ref with `anyOf` has no
 *      id, so an id-keyed lookup returned nothing for eleven volume-bearing
 *      lines including the Old Fashioned, and read them as containing no
 *      alcohol. Max rather than first, because understating how much was
 *      poured is the dangerous direction in a tool that teaches standard
 *      drinks.
 *
 * Zero-volume units (mint leaves, a pinch of salt) contribute nothing to either
 * number and are not checked.
 *
 * Exits non-zero on any failure, naming the drink and the line.
 * Honours LEDGER_JS=<dir> like the other gates.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const JS = process.env.LEDGER_JS || new URL('../js/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (f) => readFileSync(join(JS, f), 'utf8');
const sandbox = {
  window: {}, navigator: {},
  localStorage: { getItem: () => null, setItem() {} },
  document: { getElementById: () => null, querySelector: () => null },
};
const FILES = ['data-core.js', 'data-lore.js', 'data-service.js', 'data-ingredients.js',
  'ingredients.js', 'engine.js', 'ui-reference.js', 'ui-prep.js', 'ui-practice.js'];
const W = vm.runInNewContext(FILES.map(read).join(';\n') +
  ';({COCKTAILS,SHOTS,NA_DRINKS,INGREDIENTS,ING,specUnits,classifyLine,lineABV,estimateABV,' +
  'specRefs,rowAbv,rowValue,refAbv})', sandbox);

const WATER = /\bwater\b|seltzer|club soda|\bsoda\b|tonic|ginger beer|ginger ale|lemonade|\bcola\b/i;
const LONG_OR_SOUR = /^(Highball|Sour)$/;
const BOOZY_KINDS = ['spirit', 'liqueur', 'fortified', 'wine', 'beer'];

const fail = [];
const say = [];

/* ---- 1 to 5, the checks the wing has always run ------------------------- */
const spiritZero = [], naScored = [], waterScored = [], buildZero = [];
let units = 0, builds = 0;
W.COCKTAILS.forEach((c) => {
  let strongUnits = 0;
  (c.spec || []).forEach((l) => W.specUnits(l).forEach((u) => {
    if (!(u.oz > 0)) return;
    units++;
    const k = W.classifyLine(u.text);
    const abv = W.lineABV(u.text);
    if (k === 'strong') strongUnits++;
    if ((k === 'strong' || k === 'modifier') && !(abv > 0)) spiritZero.push(c.name + ' | ' + k + ' | ' + u.text);
    if (k === 'na' && abv > 0) naScored.push(c.name + ' | ' + u.text + ' | ' + abv);
    if (WATER.test(u.text) && abv > 0) waterScored.push(c.name + ' | ' + k + ' | ' + u.text + ' | ' + abv);
  }));
  if (LONG_OR_SOUR.test(c.family || '') && strongUnits > 0) {
    builds++;
    const e = W.estimateABV(c, 25);
    if (!e || !(e.alcOz > 0)) buildZero.push(c.name + ' | ' + c.family + ' | alcOz ' + (e ? e.alcOz : 'null'));
  }
});
say.push(`${W.COCKTAILS.length} cocktails, ${units} measured units`);
if (spiritZero.length) fail.push(['spirit or modifier units scoring ABV 0', spiritZero]);
else say.push('every measured spirit and modifier unit scores');
if (naScored.length) fail.push(['non-alcoholic units scoring ABV', naScored]);
if (waterScored.length) fail.push(['water, soda or tonic units scoring ABV', waterScored]);
if (buildZero.length) fail.push([`long or sour builds with a spirit line (${builds}) coming out at alcOz 0`, buildZero]);
else say.push(`${builds} long and sour builds all come out above zero`);

/* ---- 6. every row resolves an abv --------------------------------------- */
const noAbv = W.INGREDIENTS.filter((r) => W.rowAbv(r.id) === undefined);
if (noAbv.length) {
  fail.push(['vocabulary rows with no abv, through their own field or a parent',
    noAbv.map((r) => r.id + ' (' + r.kind + ')')]);
} else {
  const authored = W.INGREDIENTS.filter((r) => Object.prototype.hasOwnProperty.call(r, 'abv')).length;
  say.push(`every one of the ${W.INGREDIENTS.length} rows resolves an abv (${authored} authored, the rest inherited or a non-alcoholic zero)`);
}

/* ---- 7. an authored zero survives the walk ------------------------------
   Written as `row.abv || inherited` a zero is discarded, and the zero-proof
   rows exist precisely to say zero. This asserts the LOOKUP, not the value,
   because a gate that reads the field cannot see the bug. */
const zeroRows = W.INGREDIENTS.filter((r) => r.abv === 0).map((r) => r.id);
const zeroLost = zeroRows.filter((id) => W.rowAbv(id) !== 0);
if (!zeroRows.length) fail.push(['no row authors an abv of 0, so rule 7 is untested', []]);
else if (zeroLost.length) fail.push(['rows authoring abv 0 whose lookup does not return 0', zeroLost]);
else say.push(`all ${zeroRows.length} authored zeros survive the lookup`);

/* ---- 8. an either/or takes the max of its members ------------------------ */
const anyOfSeen = [], anyOfBad = [];
[...W.COCKTAILS, ...W.SHOTS, ...W.NA_DRINKS].forEach((d) => {
  (d.spec || []).forEach((l) => {
    W.specRefs(l).forEach((r) => {
      if (r.role !== 'ingredient' || !r.anyOf || r.anyOf.length < 2) return;
      anyOfSeen.push(d.name + ' | ' + l);
      const members = r.anyOf.map((id) => W.rowAbv(id)).filter((v) => v !== undefined);
      if (!members.length) return;
      const want = Math.max(...members);
      const got = W.refAbv(r);
      if (got !== want) anyOfBad.push(d.name + ' | ' + l + ' | got ' + got + ', max is ' + want);
    });
  });
});
if (!anyOfSeen.length) fail.push(['no either/or ref found in the whole bank, so rule 8 is untested', []]);
else if (anyOfBad.length) fail.push(['either/or refs not taking the max of their members', anyOfBad]);
else say.push(`all ${anyOfSeen.length} either/or refs take the max of their members`);

/* ---- report -------------------------------------------------------------- */
console.log('\n  Checking the strength numbers\n');
for (const s of say) console.log('  ' + s);
if (fail.length) {
  console.log('');
  for (const [what, rows] of fail) {
    console.log('  ✗ ' + what + ': ' + rows.length);
    for (const r of rows.slice(0, 20)) console.log('      ' + r);
    if (rows.length > 20) console.log('      ... and ' + (rows.length - 20) + ' more');
  }
  console.log('\n  check-abv: FAIL\n');
  process.exit(1);
}
console.log('\n  check-abv: OK\n');
