/**
 * The gate that keeps the stock matcher honest. Run: `node tools/check-ingredients.mjs`
 *
 * It exists because the thing it checks failed silently for years. 104 regexes
 * stood where js/data-ingredients.js is now, and a spec line no pattern matched
 * became a need the matcher could not see. A need it could not see was a need
 * that did not exist, so a drink whose spirit was unreadable read as MAKEABLE.
 * Measured the day this was written: 169 of 817 spec lines matched nothing, 112
 * of them carrying a real volume across 109 drinks, and the Zero-proof station
 * preset, a shelf with no alcohol on it, offered a Hot Toddy and a Whiskey
 * Highball.
 *
 * Nothing on screen said so. That is the point of a gate rather than a test:
 * the failure was invisible, so it needed something that looks every time.
 *
 * Runs in both trees. The wing has no check.mjs, so it runs this directly
 * beside its own check-abv.mjs. Honour LEDGER_JS=<dir> to point it at another
 * build, which is how you prove it can fail: aim it at a checkout from before
 * the vocabulary landed and watch it report the 169.
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
	'ingredients.js', 'engine.js', 'ui-reference.js', 'ui-prep.js'];
const W = vm.runInNewContext(FILES.map(read).join(';\n') +
	';({COCKTAILS,SHOTS,NA_DRINKS,INGREDIENTS,NOTE_LINES,SHELF,SHELF_PRESETS,ING,' +
	'specRefs,reqsOf,missingFor,stockSatisfies,isaChain,migrateShelf,state})', sandbox);

const problems = [];
const say = [];
const SOURCES = [['Cocktails', W.COCKTAILS], ['Shots', W.SHOTS], ['Zero Proof', W.NA_DRINKS]];
const ALL = SOURCES.flatMap(([n, arr]) => arr.map((d) => [n, d]));

/* ---- 1. every spec line resolves ---------------------------------------
   The check the whole file exists for. A fragment with no id and no
   alternation is the ledger admitting it cannot read a line, and it must not
   be possible to ship one. Two legal fixes: give the ingredient an alias in
   data-ingredients.js, or, if the line is an instruction rather than an
   ingredient, name it in NOTE_LINES. */
const unresolved = new Map();
for (const [src, d] of ALL) {
	for (const line of (d.spec || [])) {
		for (const r of W.specRefs(line)) {
			if (r.role !== 'ingredient' || r.id || r.anyOf) continue;
			const k = r.text || line;
			if (!unresolved.has(k)) unresolved.set(k, { n: 0, where: src + ': ' + d.name, line });
			unresolved.get(k).n++;
		}
	}
}
if (unresolved.size) {
	problems.push(`${unresolved.size} ingredient fragment(s) resolve to nothing. ` +
		'Add an alias in js/data-ingredients.js, or name the line in NOTE_LINES if it is an instruction:');
	for (const [k, e] of [...unresolved.entries()].sort((a, b) => b[1].n - a[1].n)) {
		problems.push(`    ${String(e.n).padStart(3)}x  "${k}"   ${e.where}\n         line: ${JSON.stringify(e.line)}`);
	}
} else {
	say.push(`every ingredient reads: ${ALL.length} drinks, no fragment unresolved`);
}

/* ---- 2. the vocabulary is well formed ----------------------------------- */
const ids = new Set();
const aliasOwner = new Map();
for (const row of W.INGREDIENTS) {
	if (ids.has(row.id)) problems.push(`two vocabulary rows share the id "${row.id}"`);
	ids.add(row.id);
	for (const a of (row.alias || [])) {
		const k = String(a).toLowerCase();
		/* Two rows claiming one alias is a silent precedence bug: which one wins
		   depends on which is longer, then on table order, and nobody reading
		   either row would know the other existed. */
		if (aliasOwner.has(k)) problems.push(`alias "${k}" is claimed by both "${aliasOwner.get(k)}" and "${row.id}"`);
		aliasOwner.set(k, row.id);
	}
}
for (const row of W.INGREDIENTS) {
	if (row.parent && !ids.has(row.parent)) problems.push(`"${row.id}" names a parent "${row.parent}" that does not exist`);
	if (row.up && !row.parent) problems.push(`"${row.id}" is marked up:true with no parent to stand in for it`);
	let cur = row.parent, hops = 0;
	while (cur && hops++ < 50) {
		if (cur === row.id) { problems.push(`"${row.id}" is its own ancestor`); break; }
		cur = (W.ING[cur] || {}).parent;
	}
}
if (!problems.length || ids.size) say.push(`vocabulary: ${W.INGREDIENTS.length} rows, ${aliasOwner.size} aliases, ${W.SHELF.length} stock chips`);

/* ---- 3. reachability ----------------------------------------------------
   The check that makes strict substitution safe. Upward substitution is off
   unless a row opts in with up:true, which is deliberate, but it means a
   requirement that no chip can satisfy is a drink nobody can ever make and
   nothing would otherwise say so. */
const chips = W.SHELF.map((s) => s[0]);
const required = new Set();
for (const [, d] of ALL) for (const r of W.reqsOf(d)) (Array.isArray(r) ? r : [r]).forEach((x) => required.add(x));
const stranded = [...required].filter((id) => !W.stockSatisfies(chips, id));
if (stranded.length) {
	problems.push('requirement(s) no stock chip can ever satisfy, so the drinks needing them are unmakeable forever:');
	for (const id of stranded) {
		const who = ALL.filter(([, d]) => W.reqsOf(d).some((r) => (Array.isArray(r) ? r.indexOf(id) >= 0 : r === id)))
			.slice(0, 4).map(([s, d]) => s + ': ' + d.name);
		problems.push(`    "${id}"  needed by ${who.join(', ')}`);
	}
} else {
	say.push(`reachable: all ${required.size} distinct requirements can be satisfied from the chip list`);
}

/* ---- 4. no drink requires nothing ---------------------------------------
   A drink with nothing stockable in it does not exist, and one that reports
   zero requirements is makeable on an empty bar. This is the shape of the
   original bug and there is no allowlist. */
const free = ALL.filter(([, d]) => W.reqsOf(d).length === 0);
if (free.length) {
	problems.push(`${free.length} drink(s) require nothing at all, so an empty shelf makes them:`);
	for (const [s, d] of free) problems.push(`    ${s}: ${d.name}   spec: ${(d.spec || []).join(' / ')}`);
} else {
	say.push('no drink requires nothing at all');
}

/* ---- 5. every preset id is real ----------------------------------------
   Inherited from check.mjs, where it was written after the Zero-proof preset
   referenced a 'ginger' id no row defined and silently stocked one item fewer
   than it claimed. */
for (const [label, list] of W.SHELF_PRESETS) {
	for (const id of list) if (!W.ING[id]) problems.push(`preset "${label}" stocks "${id}", which is not in the vocabulary`);
}
say.push(`presets: ${W.SHELF_PRESETS.length} checked`);

/* ---- 6. the shelf migration is total -----------------------------------
   THE OLD IDS ARE FROZEN HERE ON PURPOSE, not read from SHELF. Reading them
   from the live table would mean that deleting a row makes this check pass on
   a smaller set, and every bar that had stocked it would silently lose it on
   the next deploy. Hard-coding is what gives the check teeth. */
const OLD_SHELF_IDS = [
	'gin', 'vodka', 'wrum', 'arum', 'crum', 'bourbon', 'rye', 'scotch', 'irish', 'teq',
	'cognac', 'pisco', 'cachaca', 'sherry', 'champ', 'sv', 'dv', 'lillet', 'campari',
	'aperol', 'nonino', 'fernet', 'ol', 'mara', 'chart', 'bene', 'viol', 'cacao', 'mure',
	'coffee', 'abs', 'ango', 'pey', 'ob', 'lemon', 'lime', 'gfj', 'oj', 'pine', 'cran',
	'tomato', 'simple', 'honey', 'orgeat', 'rasp', 'gren', 'mint', 'egg', 'cream', 'coco',
	'soda', 'tonic', 'gb', 'ginger', 'espresso', 'hotcoffee', 'mezcal', 'cynar', 'averna',
	'suze', 'drambuie', 'amaretto', 'icream', 'menthe', 'galliano', 'apricot', 'peach',
	'l43', 'pimms', 'passion', 'banana', 'elder', 'calvados', 'allspice', 'falernum',
	'heering', 'advocaat', 'cassis', 'frangelico', 'grappa', 'limoncello', 'port', 'beer',
	'redwine', 'whitewine', 'cider', 'soju', 'shochu', 'oprum', 'cola', 'maple', 'agave',
	'condmilk', 'dubonnet', 'picon', 'vanilla', 'cinn', 'grapes', 'basil', 'cuke', 'straw',
	'milk', 'icecream', 'ga',
];
const lost = OLD_SHELF_IDS.filter((id) => !W.migrateShelf([id]).some((x) => W.ING[x]));
if (lost.length) {
	problems.push('shelf ids that existed before the vocabulary and now land nowhere. ' +
		'Every bar that stocked one of these would silently lose it:');
	problems.push('    ' + lost.join(', '));
} else {
	say.push(`migration: all ${OLD_SHELF_IDS.length} pre-vocabulary shelf ids still land somewhere real`);
}
/* And it must be idempotent, because it runs at every boot. */
const twice = W.migrateShelf(W.migrateShelf(OLD_SHELF_IDS));
const once = W.migrateShelf(OLD_SHELF_IDS);
if (twice.join('|') !== once.join('|')) problems.push('migrateShelf is not idempotent: running it twice changes the shelf');

/* ---- 7. the alcohol-free shelf makes no alcoholic drink -----------------
   The single most legible regression trap in the suite, and the exact bug
   this whole stage was built to kill. Nojito is a genuine mocktail that lives
   in COCKTAILS, so the honest number is one rather than zero, and naming it
   here means a future change that quietly adds an eighth has to explain
   itself. */
const zero = W.SHELF_PRESETS.find((p) => /zero-proof/i.test(p[0]));
if (!zero) {
	problems.push('the Zero-proof station preset is gone, and with it the check that the matcher stays honest');
} else {
	W.state.tools.shelf = zero[1].slice();
	const claimed = W.COCKTAILS.filter((d) => W.missingFor(d).length === 0).map((d) => d.name);
	const expected = ['Nojito'];
	if (claimed.join('|') !== expected.join('|')) {
		problems.push(`a shelf with no alcohol on it claims these cocktails: ${claimed.join(', ') || '(none)'}\n` +
			`    expected exactly: ${expected.join(', ')}\n` +
			'    Anything else means a spirit line is being read as nothing again.');
	} else {
		say.push('the alcohol-free shelf claims exactly one cocktail, and it is the Nojito');
	}
}

/* ---- report -------------------------------------------------------------- */
console.log('\n  Checking the ingredient vocabulary\n');
for (const s of say) console.log('  ' + s);
if (problems.length) {
	console.log('');
	for (const p of problems) console.log('  ✗ ' + p);
	console.log(`\n  ${problems.length} problem(s).\n`);
	process.exit(1);
}
console.log('\n  every check passed\n');
