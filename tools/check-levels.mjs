/**
 * The four levels' gate. Run: `node tools/check-levels.mjs` (exits non-zero on
 * any problem).
 *
 * What it holds, against the items the app SHIPS (tools/levels/lib.mjs reads
 * them through the app's own scripts):
 *   - every item placed exactly once in tools/levels/placements.json, no
 *     placement for an item that does not exist, every placement with a
 *     reason, the fixed rules (tiers 1 and 2 at Level I, tier 3 at II, tiers
 *     4 to 12 never at I), every craft question filed under a subsection
 *   - js/data-levels.js is EXACTLY what the placements emit, and pure ASCII
 *   - supply: every level can deal its level test with headroom, and every
 *     subsection holds at least one met-able unit at every level
 *   - every drill carries a `ready` figure, and its description says it
 *   - when js/levels.js exists, its LEVEL_TEST_SHAPE never asks a level for
 *     more than the level holds
 *
 * It prints the placement per level per subsection. This file also runs
 * inside the Outside Of Time wing, from ledger/tools/; keep the two copies
 * identical.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { universe, loadApp, emitDataLevels, problemsOf, SUBSECTIONS, SUB_KEYS, LEVEL_NAMES, DATA_FILE, ROOT } from './levels/lib.mjs';

const PLACEMENTS = join(ROOT, 'tools', 'levels', 'placements.json');

/** The fewest of each kind a level holds, for the level test and its headroom. */
export const SUPPLY = {
	'cocktails card': 8,
	'shots card': 4,
	'ontap card': 2,
	'ontap question': 2,
	'spirits question': 3,
	'technique question': 2,
	'stick question': 6,
	'prep question': 2,
	'coffee card': 2
};

const problems = [];
const W = loadApp();
const uni = universe(W);
const byKey = new Map(uni.map((r) => [r.key, r]));

if (!existsSync(PLACEMENTS)) problems.push('tools/levels/placements.json does not exist: place the items (tools/levels/README.md)');
const placements = existsSync(PLACEMENTS) ? JSON.parse(readFileSync(PLACEMENTS, 'utf8')) : [];
problems.push(...problemsOf(placements, uni));

/* the emitted file is exactly the placements */
if (!existsSync(DATA_FILE)) problems.push('js/data-levels.js does not exist: run node tools/levels/set-levels.mjs --emit');
else {
	/* line endings as git may have checked them out: the text is compared, not the bytes */
	const text = readFileSync(DATA_FILE, 'utf8').replace(/\r\n/g, '\n');
	if (/[^\x00-\x7f]/.test(text)) problems.push('js/data-levels.js carries a non-ASCII byte: it is machine written; re-emit it');
	if (placements.length && text !== emitDataLevels(placements, uni)) problems.push('js/data-levels.js is not what tools/levels/placements.json emits: run node tools/levels/set-levels.mjs --emit');
}

/* counts per level, per subsection and kind */
const count = (level, pred) => placements.filter((p) => p.level === level && pred(p, byKey.get(p.key))).length;
for (const level of [1, 2, 3, 4]) {
	for (const [what, min] of Object.entries(SUPPLY)) {
		const [sub, kind] = what.split(' ');
		const n = count(level, (p, r) => r && p.sub === sub && r.kind === kind);
		if (n < min) problems.push(`Level ${level} holds ${n} ${what}(s); the level test needs at least ${min}`);
	}
	for (const sub of SUB_KEYS) {
		const n = count(level, (p, r) => r && p.sub === sub && r.metable);
		if (!n) problems.push(`Level ${level}, ${sub}: nothing met-able; every subsection holds at least one unit at every level`);
	}
}

/* every drill's ready figure, and the sentence that states it */
for (const d of W.get('DRILLS')) {
	const r = d.ready;
	if (!r || !['lt', 'ge', 'order', 'whole'].includes(r.op)) { problems.push(`drill ${d.id}: no ready figure (DRILLS in js/engine.js)`); continue; }
	if (r.op === 'lt' || r.op === 'ge') {
		if (typeof r.v !== 'number') problems.push(`drill ${d.id}: ready.${r.op} carries no number`);
		else if (!new RegExp(`(^|\\D)${r.v}(\\D|$)`).test(d.desc)) problems.push(`drill ${d.id}: ready at ${r.v}, and its description never says ${r.v}`);
	}
	if (r.op === 'order' && !/\border\b/.test(d.desc)) problems.push(`drill ${d.id}: ready means the order is right, and its description never says so`);
	if (r.op === 'whole' && !/whole round/.test(d.desc)) problems.push(`drill ${d.id}: ready means the whole round held, and its description never says so`);
}

/* the test shape never asks for more than the supply above guarantees */
const LEVELS_JS = join(ROOT, 'js', 'levels.js');
if (existsSync(LEVELS_JS)) {
	const shape = vm.runInNewContext(readFileSync(LEVELS_JS, 'utf8') + ';LEVEL_TEST_SHAPE', { LEVEL_ITEMS: {}, window: {} });
	const need = {};
	for (const s of shape) need[s.sub + ' ' + (s.from === 'bank' ? 'question' : 'card')] = (need[s.sub + ' ' + (s.from === 'bank' ? 'question' : 'card')] || 0) + s.n;
	for (const [what, n] of Object.entries(need)) {
		if (SUPPLY[what] === undefined || SUPPLY[what] < n) problems.push(`LEVEL_TEST_SHAPE asks ${n} ${what}(s) of a level, and SUPPLY guarantees ${SUPPLY[what] ?? 0}`);
	}
}

/* the table */
const pad = (s, n) => String(s).padEnd(n);
console.log('  ' + pad('', 24) + LEVEL_NAMES.map((n) => pad(n, 16)).join(''));
for (const s of SUBSECTIONS) {
	const cells = [1, 2, 3, 4].map((l) => {
		const met = count(l, (p, r) => r && p.sub === s.key && r.metable);
		const read = count(l, (p, r) => r && p.sub === s.key && !r.metable);
		return pad(`${met}${read ? ` +${read} read` : ''}`, 16);
	});
	console.log('  ' + pad(s.title, 24) + cells.join(''));
}

if (problems.length) {
	console.error(`\n  ✗ ${problems.length} problem(s)`);
	for (const p of problems.slice(0, 60)) console.error(`    ${p}`);
	if (problems.length > 60) console.error(`    ... and ${problems.length - 60} more`);
	process.exit(1);
}
console.log(`\n  ✓ the four levels hold: ${placements.length} items placed, supply met at every level, every drill ready figure stated`);
