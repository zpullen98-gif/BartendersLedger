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
 */
import { loadWing } from './load-wing.mjs';

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
if (fail) { console.error('check-options: FAIL'); process.exit(1); }
console.log('check-options: OK');
