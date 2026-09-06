/**
 * The Ledger's first gate. Run: `node tools/check.mjs` — exits non-zero on any
 * problem, and every check here has been proven able to fail before shipping.
 *
 * The data files are classic scripts sharing one global scope, so they cannot
 * be imported; they are evaluated in a vm sandbox instead, the same trick the
 * World Table's extractor uses on its source html. What is checked:
 *
 *  - every family carries 3–5 observable marks and a fault with substance
 *  - every cocktail's `family` resolves (an orphan would throw in qFamily)
 *  - no mark or fault names a specific cocktail — a family standard is read
 *    beside up to 93 drinks, and a mark true of one is false copy on the rest
 *  - the mark-vs-membership forks stay honest: families whose members split
 *    on method may only speak about the fork behind a condition word
 *  - LORE and COCKTAILS close over each other: a renamed drink cannot strand
 *    its story, and a new drink cannot ship storyless by accident
 *  - slugify (read from ui-new.js itself, not copied) yields a unique route
 *    for every name in every routed collection — two drinks colliding on a
 *    slug would silently open the wrong page
 *  - every SHELF_PRESETS id names a real SHELF row (the ginger lesson)
 *  - the service worker's ASSETS and index.html agree: every script and
 *    stylesheet the page loads is cached, and every cached file exists
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const src = read('../js/data-core.js');
const { COCKTAILS, FAMILIES } = vm.runInNewContext(src + ';({COCKTAILS,FAMILIES})', {});

// The wider sandbox: everything the closure checks below need. Engine wants
// window/localStorage at load; stubs keep it honest and DOM-free.
const sandbox = { window: {}, localStorage: { getItem: () => null, setItem() {} }, navigator: {} };
/* data-ingredients.js and ingredients.js load BEFORE engine.js, because the
   SHELF table is derived from the vocabulary now rather than hand-written.
   The ingredient checks themselves live in tools/check-ingredients.mjs; run
   both. */
const wide = [src, read('../js/data-lore.js'), read('../js/data-service.js'), read('../js/data-ingredients.js'), read('../js/ingredients.js'), read('../js/engine.js'), read('../js/ui-reference.js'), read('../js/ui-prep.js')].join(';'+String.fromCharCode(10));
const W = vm.runInNewContext(
	wide + ';({LORE, SHOTS, NA_DRINKS, PREPS, PRODUCERS, SHELF, SHELF_PRESETS})',
	sandbox
);

// slugify is read out of ui-new.js itself so this gate cannot drift from the
// app: if the routing function changes shape, the extraction fails loudly.
const uiNew = read('../js/ui-new.js');
const slugLine = uiNew.match(/function slugify.*$/m);
if (!slugLine) throw new Error('slugify not found in ui-new.js — the extraction anchor moved');
const slugify = vm.runInNewContext(slugLine[0] + ';slugify', {});

const problems = [];

// ---- shape ---------------------------------------------------------------
for (const [name, f] of Object.entries(FAMILIES)) {
	if (!Array.isArray(f.marks) || f.marks.length < 3 || f.marks.length > 5) {
		problems.push(`family "${name}": ${f.marks?.length ?? 0} marks — the standard is 3–5`);
	}
	if (typeof f.fault !== 'string' || f.fault.length < 40) {
		problems.push(`family "${name}": fault missing or too thin to diagnose anything`);
	}
	if (!f.formula || !f.lesson || !f.parent) {
		problems.push(`family "${name}": lost formula/lesson/parent`);
	}
}

// ---- membership ------------------------------------------------------------
const orphans = COCKTAILS.filter((c) => !FAMILIES[c.family]);
if (orphans.length) {
	problems.push(`cocktails with no family: ${orphans.map((c) => c.name).join(', ')}`);
}

// ---- no smuggled drinks ------------------------------------------------------
// Distinctive names only (len > 6) so "Punch" cannot collide with the family.
const names = COCKTAILS.map((c) => c.name).filter((n) => n.length > 6);
for (const [fam, f] of Object.entries(FAMILIES)) {
	const text = [...(f.marks ?? []), f.fault ?? ''].join(' ').toLowerCase();
	for (const n of names) {
		if (text.includes(n.toLowerCase())) {
			problems.push(`family "${fam}" names a specific drink in its standard: "${n}"`);
		}
	}
}

// ---- the forks stay behind condition words ------------------------------------
// A family whose members split on a method may only assert that method behind
// "where/served/members/whenever". Measured from the data, not assumed.
const CONDITION = /\b(where|served|members|whenever|to what the serve asks)\b/i;
const forks = [
	['Sour', /shak/i, 'shak'],
	['Highball', /sparkle|carbonat/i, 'sparkle'],
	['Spirit & Vermouth', /stirred/i, 'stirred'],
	['Egg & Cream', /dry shake|foam|head/i, 'dry shake'],
	['Old Fashioned', /dissolved|stirred/i, 'dissolved'],
	['Hot', /cream|float/i, 'float'],
	['Duo & Trio', /float/i, 'float'],
];
for (const [fam, re] of forks) {
	const f = FAMILIES[fam];
	if (!f?.marks) continue;
	for (const m of f.marks) {
		if (re.test(m) && !CONDITION.test(m)) {
			// Only a problem when the family genuinely forks on it.
			const members = COCKTAILS.filter((c) => c.family === fam);
			const methodBlob = (c) => (c.method + ' ' + c.spec.join(' ')).toLowerCase();
			const hits = members.filter((c) => re.test(methodBlob(c))).length;
			if (hits > 0 && hits < members.length) {
				problems.push(
					`family "${fam}": mark asserts a forked property without a condition word — "${m.slice(0, 60)}…" (${hits}/${members.length} members)`
				);
			}
		}
	}
}

// ---- lore closes over the canon, both directions ---------------------------
{
	const names = new Set(COCKTAILS.map((c) => c.name));
	for (const k of Object.keys(W.LORE)) {
		if (!names.has(k)) problems.push(`LORE key "${k}" names no cocktail — renamed drink stranded its story`);
	}
	for (const c of COCKTAILS) {
		if (!(c.name in W.LORE)) problems.push(`"${c.name}" has no LORE entry — a drink shipped storyless`);
	}
}

// ---- every routed collection slugs uniquely --------------------------------
for (const [label, arr, key] of [
	['COCKTAILS', COCKTAILS, 'name'],
	['SHOTS', W.SHOTS, 'name'],
	['NA_DRINKS', W.NA_DRINKS, 'name'],
	['PREPS', W.PREPS, 'name'],
	['PRODUCERS', W.PRODUCERS, 'name'],
]) {
	const seen = new Map();
	for (const x of arr) {
		const slug = slugify(x[key]);
		if (seen.has(slug)) problems.push(`${label}: "${x[key]}" and "${seen.get(slug)}" collide on slug "${slug}"`);
		else seen.set(slug, x[key]);
	}
}

// ---- shelf presets reference only rows that exist ---------------------------
{
	const ids = new Set(W.SHELF.map((r) => r[0]));
	for (const [pname, list] of W.SHELF_PRESETS) {
		for (const id of list) {
			if (!ids.has(id)) problems.push(`SHELF preset "${pname}" references unknown shelf id "${id}"`);
		}
	}
}

// ---- the worker caches what the page loads, and nothing imaginary -----------
{
	const { existsSync } = await import('node:fs');
	const index = read('../index.html');
	const sw = read('../sw.js');
	const assetsSrc = sw.match(/const ASSETS = \[[\s\S]*?\];/);
	if (!assetsSrc) problems.push('sw.js: ASSETS array not found');
	else {
		const assets = new Set(
			[...assetsSrc[0].matchAll(/'\.\/([^']+)'/g)].map((m) => m[1])
		);
		const wanted = [...index.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)/g)].map((m) => m[1]);
		for (const f of wanted) {
			if (!assets.has(f)) problems.push(`index.html loads ${f} but sw.js ASSETS does not cache it — offline breaks`);
		}
		for (const f of assets) {
			if (!existsSync(new URL('../' + f, import.meta.url))) {
				problems.push(`sw.js caches ${f} but the file does not exist — install() rejects and NOTHING caches`);
			}
		}
	}
}

// ---- fonts and icons are cached too, not just js/css --------------------------
{
	const { existsSync } = await import('node:fs');
	const index = read('../index.html');
	const sw = read('../sw.js');
	const assetsSrc = sw.match(/const ASSETS = \u005b[\s\S]*?\u005d;/);
	if (assetsSrc) {
		const assets = new Set([...assetsSrc[0].matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));
		// icons and fonts referenced from index.html
		for (const m of index.matchAll(/(?:src|href)="((?:icons|fonts)\/[^"?]+)/g)) {
			if (!assets.has(m[1])) problems.push(`index.html references ${m[1]} but sw.js ASSETS does not cache it`);
		}
		// fonts referenced from inside cached css (quote-agnostic url())
		for (const f of assets) {
			if (!f.endsWith('.css')) continue;
			const css = read('../' + f);
			for (const m of css.matchAll(/url\(\s*["']?\.\.\/((?:fonts|icons|img)\/[^"')?]+)/g)) {
				if (!assets.has(m[1])) problems.push(`${f} references ${m[1]} but sw.js ASSETS does not cache it`);
			}
		}
		// manifest icons
		try {
			const man = JSON.parse(read('../manifest.webmanifest'));
			for (const ic of man.icons || []) {
				const src = String(ic.src).replace(/^\.\//, '').split('?')[0];
				if (!assets.has(src)) problems.push(`manifest icon ${src} is not in sw.js ASSETS`);
			}
		} catch (e) { problems.push('manifest.webmanifest does not parse: ' + e.message); }
	}
}

// ---- a committed content change demands a CACHE bump ---------------------------
// The anchor is the last commit that touched sw.js (bumps live there). Any
// cached asset committed since, with the CACHE line unchanged, is a deploy
// that installed clients will never receive. Working-tree edits are exempt —
// the bump belongs in the same commit as the change, and this fires the run
// after you forget. Skipped cleanly where git is unavailable.
try {
	const { execSync } = await import('node:child_process');
	const repo = new URL('..', import.meta.url);
	const run = (cmd) => execSync(cmd, { cwd: repo, encoding: 'utf8' }).trim();
	const bumpCommit = run('git log -n 1 --format=%H -- sw.js');
	if (bumpCommit) {
		const cacheNow = read('../sw.js').match(/const CACHE = '([^']+)'/)?.[1];
		const cacheThen = run(`git show ${bumpCommit}:sw.js`).match(/const CACHE = '([^']+)'/)?.[1];
		if (cacheNow && cacheNow === cacheThen) {
			const sw = read('../sw.js');
			const assetsSrc = sw.match(/const ASSETS = \u005b[\s\S]*?\u005d;/);
			const assets = assetsSrc ? [...assetsSrc[0].matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((f) => f !== 'index.html') : [];
			const changed = run(`git diff --name-only ${bumpCommit} HEAD`).split('\n').filter(Boolean);
			const stale = changed.filter((f) => assets.includes(f) || f === 'index.html');
			if (stale.length) {
				problems.push(`committed since the last sw.js change but CACHE is still "${cacheNow}": ${stale.join(', ')} — installed clients will never receive this`);
			}
		}
	}
} catch (e) { /* no git here — the closure checks above still hold the line */ }

if (problems.length) {
	for (const p of problems) console.error('  ✗ ' + p);
	console.error(`\n${problems.length} problem(s).`);
	process.exit(1);
}
console.log(`  ✓ ${Object.keys(FAMILIES).length} families, ${COCKTAILS.length} cocktails — marks sound, membership + lore + slugs + shelf + worker cache all closed`);
