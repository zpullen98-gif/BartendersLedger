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
 *  - the four lists that name tabs agree with each other. TABS and the views
 *    table live in app.js, NAV_CLUSTERS and ROUTE_SOURCES in ui-new.js, and
 *    every disagreement between them fails in SILENCE. The worst is a tab in
 *    no cluster: clusterOf falls back to 'ledger', that cluster holds one
 *    leaf, subRow only draws above one, so no button anywhere reaches the tab
 *    while its hash still works perfectly
 *  - section keys slug uniquely, and every reference card's `dom` names a
 *    real section. A card filed under a dom that no longer exists renders
 *    nowhere and searches to a dead route, which is the shape a half-finished
 *    move leaves behind
 *
 * This file also runs inside the Outside Of Time wing, from ledger/tools/,
 * and the publish preflight calls it there as the "ledger wiring" gate. Until
 * that copy existed, NOTHING anywhere compared the wing's sw.js against its
 * index.html. Keep the two copies identical.
 */
import { readFileSync, existsSync } from 'node:fs';
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
/* data-ontap.js is optional here on purpose: this gate predates the tab and
   must keep passing on a tree that has not grown it yet. */
const onTapSrc = existsSync(new URL('../js/data-ontap.js', import.meta.url)) ? read('../js/data-ontap.js') : '';
const coffeeSrc = existsSync(new URL('../js/data-coffee.js', import.meta.url)) ? read('../js/data-coffee.js') : '';
const filmSrc = existsSync(new URL('../js/data-coffee-films.js', import.meta.url)) ? read('../js/data-coffee-films.js') : '';
const wide = [src, read('../js/data-lore.js'), read('../js/data-service.js'), onTapSrc, coffeeSrc, filmSrc, read('../js/data-ingredients.js'), read('../js/ingredients.js'), read('../js/engine.js'), read('../js/ui-reference.js'), read('../js/ui-prep.js')].join(';'+String.fromCharCode(10));
const W = vm.runInNewContext(
	wide + ';({LORE, SHOTS, NA_DRINKS, PREPS, PRODUCERS, SHELF, SHELF_PRESETS, SERVICE_STUDY, SERVICE_REF,'
	     + ' ONTAP_STUDY: typeof ONTAP_STUDY === "undefined" ? null : ONTAP_STUDY,'
	     + ' ONTAP_REF: typeof ONTAP_REF === "undefined" ? null : ONTAP_REF,'
	     + ' COFFEE_STUDY: typeof COFFEE_STUDY === "undefined" ? null : COFFEE_STUDY,'
	     + ' COFFEE_REF: typeof COFFEE_REF === "undefined" ? null : COFFEE_REF,'
	     + ' COFFEE_FILMS: typeof COFFEE_FILMS === "undefined" ? null : COFFEE_FILMS})',
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
	/* ON_TAP earns its place here the moment it became a flashcard deck:
	   cardKey is src + name, so two styles sharing a name share ONE spaced
	   repetition record, and the mastery board shows two rows with the same
	   bold name and one tally between them. */
	['ONTAP_REF', W.ONTAP_REF || [], 'name'],
	['COFFEE_REF', W.COFFEE_REF || [], 'name'],
]) {
	const seen = new Map();
	for (const x of arr) {
		const slug = slugify(x[key]);
		if (seen.has(slug)) problems.push(`${label}: "${x[key]}" and "${seen.get(slug)}" collide on slug "${slug}"`);
		else seen.set(slug, x[key]);
	}
}

// ---- the tab wiring closes: four lists, two files, one vocabulary ----------
// TABS and the views table live in app.js; NAV_CLUSTERS and ROUTE_SOURCES live
// in ui-new.js. All four name tabs and every disagreement between them fails in
// SILENCE. The worst is a tab in no cluster: clusterOf falls back to 'ledger',
// that cluster holds a single leaf, subRow only draws above one, so no button
// anywhere reaches the tab while its hash still works perfectly. TABS and
// NAV_CLUSTERS are evaluated rather than pattern-matched, for the same reason
// slugify is read out of the app: a gate that re-implements the app drifts.
{
	const app = read('../js/app.js');
	/* Sliced rather than matched, because TABS is one long line and NAV_CLUSTERS
	   is many, and a pattern that handles both is harder to read than the two
	   indexOf calls it replaces. Neither literal contains '];' before its own
	   end: their inner arrays close with ']],'. */
	const lit = (src, name) => {
		const head = 'const ' + name + ' = [';
		const start = src.indexOf(head);
		if (start < 0) throw new Error(name + ' not found — an extraction anchor moved');
		const end = src.indexOf('];', start);
		if (end < 0) throw new Error(name + ' has no close — an extraction anchor moved');
		return vm.runInNewContext(src.slice(start, end + 2) + ';' + name, {});
	};
	const tabs = lit(app, 'TABS').map((t) => t[0]);
	const clustered = lit(uiNew, 'NAV_CLUSTERS').flatMap((g) => g[2]);
	/* the one nav the World Table, the Codex and the Ledger share: the same four
	   tab words in the same order, then the quiet More (the owner's answers of
	   4 October 2026, the consolidation) */
	const navWords = lit(uiNew, 'NAV_CLUSTERS').map((g) => g[1]).join(' · ');
	if (navWords !== 'Home · Flashcards · Quizzes · Library · More') problems.push(`the nav reads ${navWords}; the three apps share Home · Flashcards · Quizzes · Library, then More, in that order`);
	const grab = (src, re, pick) => [...((src.match(re) || [''])[0]).matchAll(pick)].map((m) => m[1]);
	const views = grab(app, /const views = \{[\s\S]*?\};/, /(\w+):render/g);
	const routed = grab(uiNew, /const ROUTE_SOURCES = \{[\s\S]*?\n\};/, /^\s*(\w+):\s*\{/gm);
	const applied = (uiNew.match(/function applyRoute\([^)]*\)[\s\S]*?\n\}/) || [''])[0];
	if (!views.length || !routed.length) problems.push('views or ROUTE_SOURCES not found — an extraction anchor moved');

	for (const t of tabs) {
		if (!views.includes(t)) problems.push(`TABS names "${t}" but render()'s views table has no renderer — every visit silently lands on Home`);
		if (!clustered.includes(t)) problems.push(`TABS names "${t}" but no NAV_CLUSTERS cluster holds it — it falls into 'ledger', draws no sub-row, and no button can reach it`);
	}
	for (const v of views) {
		if (!tabs.includes(v)) problems.push(`views renders "${v}" but TABS does not list it — applyRoute rejects #/${v}`);
	}
	for (const r of routed) {
		if (!tabs.includes(r)) problems.push(`ROUTE_SOURCES routes "${r}" but TABS does not list it`);
		if (!applied.includes(`tab==='${r}'`)) problems.push(`ROUTE_SOURCES resolves a slug for "${r}" but applyRoute never applies it — syncRoute erases the slug on the first paint`);
	}
}

// ---- section keys slug uniquely, and every card names a real section --------
// A reference card filed under a dom that names no section renders NOWHERE and
// searches to a dead route, which is the exact shape of a half-finished move.
for (const [label, secs, refs] of [
	['SERVICE', W.SERVICE_STUDY, W.SERVICE_REF],
	['ONTAP', W.ONTAP_STUDY, W.ONTAP_REF],
	['COFFEE', W.COFFEE_STUDY, W.COFFEE_REF],
]) {
	if (!secs) continue;
	const seen = new Map();
	for (const x of secs) {
		const slug = slugify(x.key);
		if (seen.has(slug)) problems.push(`${label}_STUDY: "${x.key}" and "${seen.get(slug)}" collide on slug "${slug}"`);
		else seen.set(slug, x.key);
	}
	const keys = new Set(secs.map((x) => x.key));
	for (const x of (refs || [])) {
		if (!keys.has(x.dom)) problems.push(`${label}_REF: "${x.name}" is filed under dom "${x.dom}", which names no section — the card renders nowhere and searches to a dead route`);
	}
}

// ---- every pinned film points at a lesson that still exists -----------------
// A film is keyed sec + slugify(row title). A lesson renamed in a later pass
// leaves its film pointing at nothing: the page keeps working and quietly goes
// back to having no video, and nobody finds out. The World Table hit this and
// answered it by failing the build; this is that answer, ported.
//
// The rest of these are shape checks on a MACHINE WRITTEN file. They exist
// because the machine is the only thing that should ever write it: a
// hand-edited title is the one way a wrong film can reach a reader with nothing
// to catch it, and a non-ASCII byte in there is the fingerprint of one.
if (W.COFFEE_FILMS) {
	const secs = new Map((W.COFFEE_STUDY || []).map((s) => [s.key, new Set(s.rows.map((r) => slugify(r[0])))]));
	const seenKey = new Set(), seenId = new Set();
	for (const f of W.COFFEE_FILMS) {
		const at = `COFFEE_FILMS "${f.sec}/${f.row}"`;
		if (!secs.has(f.sec)) { problems.push(`${at}: sec names no COFFEE_STUDY section`); continue; }
		if (!secs.get(f.sec).has(f.row)) {
			problems.push(`${at}: row matches no lesson in that section, so the film points at nothing and the lesson silently loses its video`);
		}
		const key = f.sec + '/' + f.row;
		if (seenKey.has(key)) problems.push(`${at}: two films on one lesson`); else seenKey.add(key);
		if (seenId.has(f.id)) problems.push(`COFFEE_FILMS: id ${f.id} is pinned twice`); else seenId.add(f.id);
		if (!/^[A-Za-z0-9_-]{11}$/.test(f.id || '')) problems.push(`${at}: "${f.id}" is not an eleven character video id`);
		for (const k of ['title', 'channel']) {
			if (!String(f[k] || '').trim()) problems.push(`${at}: no ${k}, which only films-add.mjs should ever write`);
		}
		if (f.start !== undefined && (!Number.isInteger(f.start) || f.start <= 0)) problems.push(`${at}: start must be a positive whole number of seconds`);
		if (String(f.watchFor || '').trim().length < 40) problems.push(`${at}: watchFor is the whole value over a search link`);
	}
	/* The FILE, not the values. films-add.mjs escapes every codepoint outside
	   printable ASCII, so the source is pure ASCII while the parsed title is
	   whatever YouTube actually called it. A literal non-ASCII byte in here is
	   therefore the fingerprint of a hand edit, and a hand edit is the one way
	   a wrong film reaches a reader with nothing to catch it. */
	if (filmSrc && !/^[\x00-\x7f]*$/.test(filmSrc)) {
		problems.push('js/data-coffee-films.js carries a literal non-ASCII byte. films-add.mjs escapes every one of them, so this file has been hand-edited. Re-run the pipeline.');
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
		} catch (e) {
				/* Guarded on existence rather than assumed, because this same file now
				   runs inside the Outside Of Time wing, which deliberately carries NO
				   manifest of its own: the suite installs as one app from one manifest
				   at the site root. Absence is correct there. A file that exists and
				   does not parse is still a problem everywhere. */
				if (existsSync(new URL('../manifest.webmanifest', import.meta.url))) {
					problems.push('manifest.webmanifest does not parse: ' + e.message);
				}
			}
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
