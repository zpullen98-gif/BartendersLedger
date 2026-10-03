/* Does option length give away the answer in the Ledger's quiz bank?
 *
 * The 196 authored KNOWLEDGE questions are dealt with their options shuffled
 * (qKnowledge in ui-study.js), so position is clean. Length is not shuffled:
 * a careful key tends to be written longer than its distractors, and a
 * student who has learned nothing can pick the longest option and beat
 * chance. The Codex was measured on this exact metric and repaired from
 * 44.6% to 28.1%; this is the Ledger's copy of that gate.
 *
 * Two numbers, over the bank exactly as the app builds it (data-core.js,
 * then data-questions.js and data-service.js push onto it):
 *
 *   pick-longest   the score of "choose the longest option, and when several
 *                  tie for longest, split the credit between them". Chance is
 *                  25%; the gate is 27%.
 *   unique-longest the count of questions whose correct option is strictly
 *                  the longest. The gate is 25 questions.
 *
 * Length is counted in characters after trimming. Mean lengths of keys and
 * distractors are printed alongside so a drift is visible before it trips
 * the gate. The repair when it trips is editorial: shorten the key, or give
 * one distractor real, true-sounding content. Never pad, never make a
 * distractor correct.
 *
 *   node ledger/tools/check-options.mjs
 *   node ledger/tools/check-options.mjs --list      (name every flagged stem)
 *   LEDGER_JS=<dir> node ledger/tools/check-options.mjs   (another copy of js/)
 *
 * Exits non-zero when either gate is exceeded, or when a question is
 * malformed (fewer than two options, an answer index off the end, or a
 * duplicated option).
 *
 * THE DEALING PROOF, below the bank: the Menu round's house questions
 * (qMyBarLine, qMyBarUpsell and qMyBarParts in js/house-bar.js) are not
 * authored, they are dealt at run time off the marks a person kept on the
 * House, so there is no bank to measure. Instead the three are dealt a few
 * thousand times over a house of six drinks with every mark kept, and the
 * deal itself is held to the rules: the answer lands in each of the four
 * positions about a quarter of the time (the gate is 17 to 33 percent, where
 * the draw's own spread is under one point), every option is distinct, the
 * answer is among them, no stem carries its answer, and on the offer next
 * question every option is a drink of this house. The engine comes from
 * OOT_SHARED=<dir>, or the shared folder beside this checkout; none is a
 * note and a skip, and a named folder without the engine is a failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadWing, LEDGER } from './load-wing.mjs';

const LONGEST_GATE = 0.27;   /* pick-longest strategy score, as a fraction */
/* A RATE WITH A FLOOR, not a flat count. This was 25 against a bank of 196,
   which is 12.8 percent of it. A flat count silently tightens as the bank
   grows: at 292 questions the same 25 is 8.6 percent, so a pass that lowers
   the rate can still trip a gate nobody re-decided. The floor keeps the
   original strictness for a bank of 196 or smaller. */
const uniqueGate = (n) => Math.max(25, Math.round(0.128 * n));

/* data-ontap.js joined the bank when beer got its own tab; without it the
   nineteen draught questions are ungated. */
const w = loadWing(['data-core.js', 'data-questions.js', 'data-service.js', 'data-ontap.js']);
const KNOWLEDGE = w.get('KNOWLEDGE');
if (!Array.isArray(KNOWLEDGE) || !KNOWLEDGE.length) {
  console.error('check-options: could not load KNOWLEDGE from the wing');
  process.exit(2);
}

const list = process.argv.includes('--list');
const len = (s) => String(s).trim().length;

const malformed = [];
const unique = [];
let strategy = 0;
/* the other direction: a bank repaired too far hands the key to whoever
   avoids the longest option, so both mirror scores are printed, ungated */
let shortest = 0, avoidLongest = 0;
let keyChars = 0, keyN = 0, distChars = 0, distN = 0;

KNOWLEDGE.forEach((k, i) => {
  const opts = Array.isArray(k.options) ? k.options : [];
  const seen = new Set(opts.map(o => String(o).trim().toLowerCase()));
  if (opts.length < 2 || !Number.isInteger(k.a) || k.a < 0 || k.a >= opts.length || seen.size !== opts.length) {
    malformed.push('#' + i + ' ' + (k.q || '(no stem)'));
    return;
  }
  const lens = opts.map(len);
  const max = Math.max(...lens);
  const atMax = lens.filter(l => l === max).length;
  if (lens[k.a] === max) {
    strategy += 1 / atMax;
    if (atMax === 1) unique.push({ i, k, lens });
  } else {
    avoidLongest += 1 / (lens.length - atMax);
  }
  const min = Math.min(...lens);
  if (lens[k.a] === min) shortest += 1 / lens.filter(l => l === min).length;
  lens.forEach((l, j) => {
    if (j === k.a) { keyChars += l; keyN++; } else { distChars += l; distN++; }
  });
});

const n = KNOWLEDGE.length - malformed.length;
const pct = (x) => (100 * x).toFixed(1) + '%';
console.log('check-options: ' + n + ' questions' + (malformed.length ? ' (' + malformed.length + ' malformed, excluded)' : ''));
console.log('  pick-longest strategy (ties split): ' + pct(strategy / n) + '  gate ' + pct(LONGEST_GATE));
console.log('  key is the unique longest option:   ' + unique.length + '  gate ' + uniqueGate(n)
	+ ' (12.8% of ' + n + ')');
console.log('  mean length, keys: ' + (keyChars / keyN).toFixed(1) + ' chars; distractors: ' + (distChars / distN).toFixed(1) + ' chars');
console.log('  for the record (not gated): pick-shortest ' + pct(shortest / n) + ', avoid-the-longest ' + pct(avoidLongest / n) + '; chance is 25.0%');
if (list) {
  unique.forEach(u => {
    const k = u.k;
    console.log('    #' + u.i + ' [' + (k.topic || 'craft') + '] ' + k.q);
    k.options.forEach((o, j) => console.log('       ' + (j === k.a ? '*' : ' ') + ' (' + u.lens[j] + ') ' + o));
  });
}
malformed.forEach(m => console.log('  malformed: ' + m));

let fail = false;
if (malformed.length) { console.error('check-options: malformed questions'); fail = true; }
if (strategy / n > LONGEST_GATE) { console.error('check-options: pick-longest ' + pct(strategy / n) + ' is above the ' + pct(LONGEST_GATE) + ' gate'); fail = true; }
if (unique.length > uniqueGate(n)) { console.error('check-options: ' + unique.length + ' unique-longest keys is above the gate of ' + uniqueGate(n)); fail = true; }

/* ---- the dealing proof: the house questions, dealt and measured ---------- */
const POSITION_LOW = 0.17, POSITION_HIGH = 0.33;
const DEALS_PER_DRINK = 400;
const SHARED_DEFAULTS = ['../../shared/', '../../worldtable/static/shared/'];
const sharedDir = process.env.OOT_SHARED
  ? process.env.OOT_SHARED.replace(/[\\/]?$/, '/')
  : SHARED_DEFAULTS.map((d) => new URL(d, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).find((d) => existsSync(join(d, 'oot-house.js')));
const HOUSE_ENGINE = sharedDir ? join(sharedDir, 'oot-house.js') : null;
if (process.env.OOT_SHARED && !existsSync(HOUSE_ENGINE)) {
  console.error('check-options: OOT_SHARED names ' + sharedDir + ' but it holds no oot-house.js');
  process.exit(1);
}

/* the fixture house with six drinks, every mark kept: a ten second line, the
   five parts with a sauce of its own, and an upsell to the next drink */
function sixDrinkHouse() {
  const house = JSON.parse(readFileSync(join(LEDGER, 'tools', 'fixtures', 'house-min.json'), 'utf8'));
  const base = house.cocktails[0];
  const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  const ids = words.map((_, i) => 'b-drink00' + String(i + 1).padStart(2, '0'));
  house.cocktails = ids.map((id, i) => {
    const c = JSON.parse(JSON.stringify(base));
    c.id = id; c.name = 'House Drink ' + words[i];
    c.spec = ['50 ml gin', (20 + i) + ' ml lemon'];
    const ts = 1790672400000;
    c.parts = { value: { main: 'Gin', technique: 'Shaken', sauce: 'Lemon and syrup number ' + (i + 1), sides: 'A coupe', taste: 'Sharp' }, by: 'person', ts };
    c.lines = { value: { s10: 'The ten second line for drink number ' + (i + 1) + '.', s20: '', s45: '' }, by: 'person', ts };
    c.upsells = { value: [ids[(i + 1) % ids.length]], by: 'person', ts };
    for (const k of ['say', 'guest', 'why', 'pairs', 'origin', 'ingredientsNamed']) delete c[k];
    return c;
  });
  house.tastings = []; house.mixUps = []; house.scenarios = [];
  return house;
}
const fold = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function dealingProof() {
  if (!HOUSE_ENGINE) {
    console.log('check-options: SKIPPED the house dealing proof: no shared folder beside this checkout (OOT_SHARED=<dir> names one)');
    return true;
  }
  const APP = ['data-core.js', 'data-lore.js', 'data-ontap.js', 'data-coffee.js', 'data-service.js', 'data-ingredients.js',
    'ingredients.js', 'engine.js', 'srs.js', 'ui-study.js', 'ui-practice.js', 'ui-reference.js', 'ui-prep.js', 'ui-new.js',
    'menu-drinks.js', 'ui-menu.js', 'ui-import.js', 'data-levels.js', 'levels.js', 'ui-levels.js', 'house-bar.js'];
  const w = loadWing(APP);
  vm.runInContext(readFileSync(HOUSE_ENGINE, 'utf8'), w, { filename: 'oot-house.js' });
  const OOT = w.get('OOT');
  const lib = OOT.houseLib;
  OOT.house = lib.createHouseApi(lib.mapStorage(), { from: 'ledger' });
  const house = sixDrinkHouse();
  const imported = await OOT.house.importPack(JSON.stringify(lib.buildPack(house, 'tools', Date.now())), { mode: 'new' });
  if (!imported.ok || !imported.current) { console.error('check-options: the six drink house would not import: ' + imported.said); return false; }
  const out = await w.get('houseSyncIn')();
  const bar = w.get('progress').bar;
  if (!out || !out.ok || bar.length !== 6) { console.error('check-options: the six drink house did not reach the list (' + bar.length + ' rows)'); return false; }
  const houseNames = house.cocktails.map((c) => c.name);
  let ok = true;
  for (const name of ['qMyBarLine', 'qMyBarUpsell', 'qMyBarParts']) {
    const fn = w.get(name);
    const positions = [0, 0, 0, 0];
    const faults = [];
    let deals = 0;
    for (const b of bar) {
      for (let i = 0; i < DEALS_PER_DRINK; i++) {
        const q = fn(b);
        if (!q) { faults.push(name + ' dealt nothing for ' + b.name); break; }
        deals++;
        const opts = Array.isArray(q.options) ? q.options : [];
        if (opts.length !== 4) faults.push(name + ': ' + opts.length + ' options for ' + b.name);
        if (new Set(opts.map(fold)).size !== opts.length) faults.push(name + ': a repeated option for ' + b.name);
        const at = opts.indexOf(q.answer);
        if (at < 0) faults.push(name + ': the answer is not among the options for ' + b.name);
        else positions[at]++;
        if (fold(q.prompt).indexOf(fold(q.answer)) >= 0) faults.push(name + ': the stem carries its answer for ' + b.name);
        if (name === 'qMyBarUpsell') for (const o of opts) if (houseNames.indexOf(o) < 0) faults.push(name + ': ' + o + ' is not a drink of this house');
        if (faults.length > 8) break;
      }
      if (faults.length > 8) break;
    }
    const shares = positions.map((c) => deals ? c / deals : 0);
    console.log('  ' + name + ': ' + deals + ' deals; the answer in each position ' + shares.map(pct).join(', ') + '  gate ' + pct(POSITION_LOW) + ' to ' + pct(POSITION_HIGH));
    const seen = {};
    for (const f of faults) if (!seen[f]) { seen[f] = true; console.error('  ' + f); }
    if (faults.length) ok = false;
    if (shares.some((x) => x < POSITION_LOW || x > POSITION_HIGH)) { console.error('  ' + name + ': the answer favours a position'); ok = false; }
  }
  return ok;
}

console.log('check-options: the house questions, dealt');
if (!(await dealingProof())) { console.error('check-options: the house dealing proof failed'); fail = true; }

if (fail) { console.error('check-options: FAIL'); process.exit(1); }
console.log('check-options: OK');
