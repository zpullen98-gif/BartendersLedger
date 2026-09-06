/**
 * A first draft of the ingredient vocabulary, for a human to correct.
 *
 * Run by hand, once: `node tools/draft-vocab.mjs > draft.txt`. It is NOT a
 * build step and nothing loads its output. The real vocabulary lives in
 * js/data-ingredients.js and is authored, because the three judgements this
 * cannot make are the ones that matter: whether sloe gin is a gin (it is not),
 * whether owning orange liqueur should cover a call for Grand Marnier (it
 * should) or for blue curacao (it should not), and what to do with the three
 * hundred fragments that appear exactly once.
 *
 * What it CAN do, and what makes it worth writing: it reads every spec line in
 * every shipped source, strips the measure off the front the way the runtime
 * parser will, splits the compound lines, and clusters what is left by its head
 * noun. That produces the alias list, which is the tedious half, and it seeds
 * the ids and labels from the existing 104 SHELF rows so the owner's own
 * wording survives and the shelf migration stays a no-op.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const JS = process.env.LEDGER_JS || new URL('../js/', import.meta.url).pathname.replace(/^\//, '');
const read = (f) => readFileSync(join(JS, f), 'utf8');

const sandbox = {
	window: {}, navigator: {},
	localStorage: { getItem: () => null, setItem() {} },
	document: { getElementById: () => null, querySelector: () => null },
};
const src = ['data-core.js', 'data-lore.js', 'data-service.js', 'engine.js', 'ui-reference.js', 'ui-prep.js']
	.map(read).join(';\n');
const W = vm.runInNewContext(src + ';({COCKTAILS,SHOTS,NA_DRINKS,SHELF})', sandbox);

/* ---- the same normalisation the runtime parser will use -----------------
   Kept deliberately close to what js/ingredients.js does, so the draft and the
   app agree on what a fragment IS. Where they drift, the draft is wrong. */

const FRACTION = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[\\u00BC-\\u00BE\\u2150-\\u215E])';
const UNIT = '(?:oz|ml|cl|l|dash(?:es)?|drops?|barspoons?|bsp|tsp|tbsp|teaspoons?|tablespoons?|parts?|' +
	'cups?|pinch(?:es)?|sprigs?|leaves|leaf|slices?|wedges?|discs?|cubes?|sticks?|shots?|cans?|' +
	'bottles?|pints?|handfuls?|scoops?|heaping tbsp|bar spoons?)';
const QTY = new RegExp('^\\s*' + FRACTION + '?\\s*' + UNIT + '?\\s+', 'i');
const BARE_UNIT = new RegExp('^\\s*' + UNIT + '\\s+', 'i');

/* Words that describe an ingredient without changing which bottle it is.
   Built from a list rather than written as one long literal, because a regex
   literal cannot span lines and a single unreadable line is how the next
   person adds a word in the wrong place. */
const ADJ = new RegExp('^(?:' + [
	'fresh(?:ly squeezed)?', 'cold', 'hot', 'chilled', 'warm', 'strong', 'good',
	'quality', 'ripe', 'homemade', 'real', 'plain', 'whole', 'freezer-cold',
	'room temperature',
].join('|') + ')\\s+', 'i');

/* Tails that are method, not ingredient. */
const TAIL = new RegExp(',?\\s*(?:' + [
	'muddled', 'floated', 'float', 'drizzled', 'grated', 'torn', 'expressed',
	'to top', 'top with', 'cut in wedges', 'blended and strained',
	'frozen into cubes', 'dribbled in', 'poured over a spoon',
	'poured into the glass first', 'on the foam', 'served alongside', 'only',
	'rinse', 'macerated', 'heated gently',
].join('|') + ')\\s*$', 'i');

function stripQty(s) {
	let out = s.trim();
	let prev;
	do { prev = out; out = out.replace(QTY, '').replace(BARE_UNIT, ''); } while (out !== prev);
	return out.trim();
}

function normalise(frag) {
	let s = String(frag).toLowerCase().trim();
	s = s.replace(/\s+/g, ' ');
	s = s.replace(/\([^)]*\)/g, ' ');            /* parentheticals are handled separately */
	s = s.replace(TAIL, '');
	s = stripQty(s);
	s = s.replace(ADJ, '');
	s = s.replace(/[.,;:]+$/, '').trim();
	return s;
}

/* Split only at bracket depth zero.
   "chocolate syrup (Fox's U-Bet, traditionally)" is ONE ingredient with an
   aside, and splitting on its comma produced a fragment called "traditionally)"
   in the first run of this script. The World Table's parser learned the same
   lesson on "Sticky toffee pudding (N, G, D)". */
function splitTop(s, re) {
	const out = [];
	let depth = 0, start = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === '(' || c === '[') depth++;
		else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
		else if (depth === 0) {
			const m = s.slice(i).match(re);
			if (m && m.index === 0) {
				out.push(s.slice(start, i));
				i += m[0].length - 1;
				start = i + 1;
			}
		}
	}
	out.push(s.slice(start));
	return out.map((p) => p.trim()).filter(Boolean);
}

/* Split a line into the fragments a bar would recognise as separate bottles. */
const SEP = /^(?:\s*\+\s*|\s*,\s*|\s+&\s+|\s+and\s+)/i;
function fragments(line) {
	const s = String(line);
	const each = s.match(/^(.*?)\beach:\s*(.+)$/i);
	if (each) {
		const parts = splitTop(each[2], SEP);
		/* head-noun distribution: "celery, orange, and Peychaud's bitters" */
		const last = parts[parts.length - 1] || '';
		const head = last.split(/\s+/).slice(-1)[0] || '';
		return parts.map((p, i) => (i < parts.length - 1 && head && !p.includes(head) ? p + ' ' + head : p));
	}
	return splitTop(s, SEP);
}

/* ---- gather ------------------------------------------------------------- */
const SOURCES = [['Cocktails', W.COCKTAILS], ['Shots', W.SHOTS], ['Zero Proof', W.NA_DRINKS]];
const seen = new Map();   /* normalised fragment -> {n, raw:Set, drinks:Set} */

for (const [srcName, arr] of SOURCES) {
	for (const d of arr) {
		for (const line of (d.spec || [])) {
			for (const frag of fragments(line)) {
				const key = normalise(frag);
				if (!key) continue;
				if (!seen.has(key)) seen.set(key, { n: 0, raw: new Set(), drinks: new Set() });
				const e = seen.get(key);
				e.n++;
				e.raw.add(frag.trim());
				if (e.drinks.size < 4) e.drinks.add(srcName + ': ' + d.name);
			}
		}
	}
}

/* ---- which existing SHELF row, if any, already claims this fragment? ----- */
const shelfFor = (frag) => {
	const hits = W.SHELF.filter(([, , re]) => re.test(frag));
	return hits.map((h) => h[0]);
};

/* ---- cluster by head noun ----------------------------------------------- */
const headOf = (s) => {
	const w = s.split(/\s+/);
	return w[w.length - 1] || s;
};
const clusters = new Map();
for (const [key, e] of seen) {
	const h = headOf(key);
	if (!clusters.has(h)) clusters.set(h, []);
	clusters.get(h).push([key, e]);
}

/* ---- report -------------------------------------------------------------- */
const rows = [...seen.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
const unmatched = rows.filter(([k]) => shelfFor(k).length === 0);
const multi = rows.filter(([k]) => shelfFor(k).length > 1);

console.log('# Draft ingredient vocabulary');
console.log('#');
console.log('# distinct fragments after normalisation : ' + seen.size);
console.log('# fragments no SHELF row claims          : ' + unmatched.length);
console.log('# fragments MORE THAN ONE row claims     : ' + multi.length + '   (each one is a false positive today)');
console.log('# existing SHELF rows                    : ' + W.SHELF.length);
console.log('# head-noun clusters                     : ' + clusters.size);
console.log();

console.log('## Fragments that more than one shelf row claims');
console.log('## Each of these is the lemonade-is-a-lemon bug in miniature.');
for (const [k, e] of multi) {
	console.log('  ' + String(e.n).padStart(3) + '  ' + k.padEnd(34) + ' -> ' + shelfFor(k).join(', '));
}
console.log();

console.log('## Fragments nothing claims, by frequency');
for (const [k, e] of unmatched) {
	console.log('  ' + String(e.n).padStart(3) + '  ' + k.padEnd(34) + '  e.g. ' + [...e.drinks][0]);
}
console.log();

console.log('## Every fragment, clustered by head noun');
const order = [...clusters.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [head, list] of order) {
	if (list.length < 2) continue;
	console.log('\n### ' + head + '  (' + list.length + ')');
	for (const [k, e] of list.sort((a, b) => b[1].n - a[1].n)) {
		const ids = shelfFor(k);
		console.log('  ' + String(e.n).padStart(3) + '  ' + k.padEnd(34) +
			(ids.length ? '[' + ids.join(',') + ']' : '[--]'));
	}
}

console.log('\n## Singletons with no cluster');
for (const [head, list] of order) {
	if (list.length !== 1) continue;
	const [k, e] = list[0];
	const ids = shelfFor(k);
	console.log('  ' + k.padEnd(38) + (ids.length ? '[' + ids.join(',') + ']' : '[--]'));
}
