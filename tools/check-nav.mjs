/**
 * The four tabs, Back and the history, gated. Run: `node tools/check-nav.mjs`
 * (exits non-zero on any problem). `--mutations` also proves the gate can
 * fail: it copies js/ to a scratch folder, breaks one rule at a time, and
 * expects this gate to go red on each.
 *
 * The consolidation of 4 October 2026 (WorldTable docs/consolidation-design.md,
 * the Ledger's part, 4.1 to 4.10 and 7.3). The whole app is loaded from
 * index.html's own script list, app.js and its boot included, into a sandbox
 * with a small DOM harness: a document whose regions are strings, a history
 * with real entries, back() and popstate, a location read from the entry,
 * sessionStorage and localStorage in memory. A tap is the delegated click a
 * real tap makes, on the element found in the rendered markup. So what is
 * checked is the SHIPPED router, render() and the acts.
 *
 *   - the nav is exactly Home, Flashcards, Quizzes, Library, then More; every
 *     TABS id sits in exactly one cluster; TABS still holds every id it held
 *     before the consolidation (a frozen list, so deleting one fails here)
 *   - every route round-trips: a screen's address, read back by applyRoute,
 *     is the same screen (its key), and every address the design adds parses
 *   - the parent map is total over TABS, every deck, every practice and tools
 *     view, and never returns the screen itself; only Home has none
 *   - the push model: Home, a level, Flashcards, a deck, Start makes four
 *     pushes carrying ootd 1 to 4; a flip and the next card replace; four
 *     Backs walk down to Home, where no Back is drawn; a cold deep link has
 *     depth 0 and Back replaces up to Home without growing the history
 *   - one action, one entry: a link inside the view (a search hit, a hash
 *     link) is one push one deeper, and an entry the browser made for a hash
 *     link is adopted, never doubled; one Back returns
 *   - a pop onto a finished round draws its results from memory, and with no
 *     round in memory falls to Quizzes with a replace
 *   - every old address lands: #/mybar/<slug>, #/service/beer, #/level,
 *     #/level/<slug>, #drink=<id>, #/mine, #/menu, #/flashcards, #/quiz,
 *     #/tools, #/practice, each with one Back whose first press goes to the
 *     screen's logical parent
 *   - the home is the four cards and nothing else; one Back on every screen
 *     but Home and no "Back to" anywhere; on the new screens no level by a
 *     numeral, no dash and no mark at or above U+2190
 *   - Due today's figure is one number in the pill, the level page's row and
 *     the Flashcards root, is due plus new under the caps, and is above zero
 *     on a fresh record; #/menu/section/<slug> never opens a drink; the level
 *     page's switch is after what the level holds; More has no Search row and
 *     the Library root has Search everything
 *   - an arrival is depth 0 unless its entry carries a depth or the browser
 *     says the load was a reload, so a fresh entry at the address the app
 *     last showed never inherits the old depth (Back would leave the app)
 *   - with the House engine beside this checkout: a #drink= link held until
 *     the house wakes opens its card in place of the arrival (depth 0, one
 *     entry, the line naming the room it came from), and a cold
 *     #/menu/section/<slug> keeps its section and its address through the wake
 *   - Print cards is a screen of its own, #/library/print, with the one Back
 *     and no second way back; Back closes it onto the Library
 *
 * This file also runs inside the Outside Of Time wing, from ledger/tools/;
 * keep the two copies identical.
 */
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS_DIR = process.env.LEDGER_JS || join(LEDGER, 'js');
const html = readFileSync(join(LEDGER, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
/* The House engine and the Brennan's pack, for the wake cases: the wing
   layout keeps them two folders up, the source repo reads WorldTable's copy
   beside it, OOT_SHARED=<dir> names another (and must hold them); neither
   default present is a note and a skip. */
const SHARED_DEFAULTS = ['../../shared/', '../../worldtable/static/shared/'];
const SHARED = process.env.OOT_SHARED
	? process.env.OOT_SHARED.replace(/[\\/]?$/, '/')
	: SHARED_DEFAULTS.map((d) => new URL(d, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).find((d) => existsSync(join(d, 'oot-house.js')));
const HOUSE_ENGINE = SHARED ? join(SHARED, 'oot-house.js') : null;
const HOUSE_PACK = SHARED ? join(SHARED, 'packs', 'brennans-new-orleans.v1.oothouse.json') : null;
if (process.env.OOT_SHARED && !(existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK))) {
	console.error('check-nav: OOT_SHARED names ' + SHARED + ' but it holds no oot-house.js and packs/brennans-new-orleans.v1.oothouse.json');
	process.exit(1);
}
const HOUSE_HERE = !!(HOUSE_ENGINE && existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK));

const problems = [];
const fail = (m) => problems.push(m);
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };

/* ---- the harness ---------------------------------------------------------- */
function boot({ hash = '', local = {}, session = {}, referrer = '', navType = 'navigate', house = false } = {}) {
	const ls = Object.assign({}, local), ss = Object.assign({}, session);
	const storage = (m) => ({ getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } });
	const base = 'http://localhost/ledger/';
	const H = { entries: [{ state: null, url: base + hash }], i: 0 };
	const listeners = { window: {}, document: {} };
	const on = (bag) => (type, fn) => { (bag[type] = bag[type] || []).push(fn); };
	const fire = (bag, type, ev) => { (bag[type] || []).slice().forEach((fn) => fn(ev)); };
	const els = {};
	const el = (id) => {
		if (els[id]) return els[id];
		const e = { id, innerHTML: '', textContent: '', dataset: {}, style: {}, listeners: {}, tagName: 'DIV',
			classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
			addEventListener(type, fn, cap) { (this.listeners[type] = this.listeners[type] || []).push({ fn, cap: !!cap }); },
			focus() { doc.activeElement = this; }, blur() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
			setAttribute() {}, getAttribute: () => null, removeAttribute() {}, remove() {}, appendChild() {}, scrollIntoView() {}, click() {} };
		els[id] = e;
		return e;
	};
	['view', 'tabs', 'bnav', 'sheet', 'search-ol', 'live'].forEach(el);
	const doc = {
		readyState: 'complete', referrer, activeElement: null, title: '',
		body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, style: {} },
		head: { appendChild() {} }, documentElement: { dataset: {}, style: {}, setAttribute() {}, classList: { add() {}, remove() {} } },
		getElementById: (id) => els[id] || null,
		querySelector: () => null, querySelectorAll: () => [],
		createElement: () => el('x' + Math.random()),
		addEventListener: on(listeners.document),
	};
	const cur = () => H.entries[H.i];
	const loc = {
		get href() { return cur().url; },
		get hash() { const u = cur().url; const k = u.indexOf('#'); return k < 0 ? '' : u.slice(k); },
		set hash(h) {
			/* the browser's own entry for a hash: null state, then popstate and hashchange */
			const nh = h.charAt(0) === '#' ? h : '#' + h;
			if (loc.hash === nh) return;
			H.entries = H.entries.slice(0, H.i + 1); H.entries.push({ state: null, url: base + nh }); H.i++;
			setTimeout(() => { fire(listeners.window, 'popstate', { state: null }); fire(listeners.window, 'hashchange', {}); }, 0);
		},
		pathname: '/ledger/', search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost',
		reload() {},
	};
	const url = (u) => (u === undefined || u === null ? cur().url : /^#/.test(u) ? base + u : u);
	const history = {
		get length() { return H.entries.length; },
		get state() { return cur().state; },
		pushState(s, t, u) { H.entries = H.entries.slice(0, H.i + 1); H.entries.push({ state: s === undefined ? null : JSON.parse(JSON.stringify(s)), url: url(u) }); H.i++; },
		replaceState(s, t, u) { H.entries[H.i] = { state: s === undefined ? null : JSON.parse(JSON.stringify(s)), url: url(u) }; },
		back() { if (H.i <= 0) return; H.i--; const s = cur().state; setTimeout(() => fire(listeners.window, 'popstate', { state: s }), 0); },
		scrollRestoration: 'auto',
	};
	const sandbox = {
		console: { log() {}, warn() {}, error: console.error, info() {} },
		document: doc, location: loc, history,
		localStorage: storage(ls), sessionStorage: storage(ss),
		navigator: { onLine: true, userAgent: 'node' },
		setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
		requestAnimationFrame: (fn) => setTimeout(fn, 0),
		matchMedia: () => ({ matches: false, addEventListener() {} }),
		confirm: () => false, alert() {}, scrollTo() { sandbox.scrollY = 0; }, scrollY: 0,
		addEventListener: on(listeners.window), removeEventListener() {},
		URL, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, encodeURIComponent, decodeURIComponent,
		CSS: { escape: (s) => String(s) },
		/* how the browser says this page was loaded: navigate, or reload */
		performance: { getEntriesByType: (t) => (t === 'navigation' ? [{ type: navType }] : []), now: () => Date.now() },
	};
	sandbox.window = sandbox; sandbox.self = sandbox;
	vm.createContext(sandbox);
	/* the engine over a Map with no house yet: a fresh device before the wake */
	if (house) {
		vm.runInContext(readFileSync(HOUSE_ENGINE, 'utf8'), sandbox, { filename: 'oot-house.js' });
		vm.runInContext("OOT.house = OOT.houseLib.createHouseApi(OOT.houseLib.mapStorage(), { from: 'ledger' });", sandbox);
	}
	for (const f of FILES) {
		const src = readFileSync(join(JS_DIR, f), 'utf8');
		vm.runInContext(src, sandbox, { filename: f });
	}
	const g = (name) => vm.runInContext('(typeof ' + name + ' === "undefined" ? undefined : ' + name + ')', sandbox);
	const run = (code) => vm.runInContext(code, sandbox);
	const view = () => els.view.innerHTML;
	const nav = () => els.bnav.innerHTML;
	const attrsOf = (tag) => {
		const a = {};
		for (const m of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) a[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
		return a;
	};
	const target = (tagName, a) => {
		const dataset = {};
		Object.keys(a).filter((k) => k.indexOf('data-') === 0).forEach((k) => { dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = a[k]; });
		const t = { tagName: tagName.toUpperCase(), dataset, disabled: 'disabled' in a, getAttribute: (n) => (n in a ? a[n] : null), focus() {} };
		t.closest = (sel) => {
			if (sel === '[data-act]') return dataset.act !== undefined ? t : null;
			if (sel === '[data-search]') return dataset.search !== undefined ? t : null;
			if (sel === '[data-cluster]') return dataset.cluster !== undefined ? t : null;
			if (sel === '[data-tab]') return dataset.tab !== undefined ? t : null;
			if (sel === '[data-hash]') return dataset.hash !== undefined ? t : null;
			if (sel === '[data-sheet-close]') return null;
			if (/^a\[href\^="#\/"\]$/.test(sel)) return t.tagName === 'A' && String(a.href || '').indexOf('#/') === 0 ? t : null;
			return null;
		};
		return t;
	};
	/* the first element in a region whose attributes include every one asked */
	const find = (region, want) => {
		for (const m of region.matchAll(/<(button|a)\b([^>]*)>/g)) {
			const a = attrsOf(m[2]);
			if (Object.keys(want).every((k) => a[k] === want[k])) return { tag: m[1], a };
		}
		return null;
	};
	const click = (elId, found) => {
		const ev = { target: target(found.tag, found.a), defaultPrevented: false, button: 0, preventDefault() { this.defaultPrevented = true; } };
		const ls2 = (els[elId].listeners.click || []);
		ls2.filter((x) => x.cap).forEach((x) => x.fn(ev));
		if (ev.defaultPrevented) return true;
		ls2.filter((x) => !x.cap).forEach((x) => x.fn(ev));
		return true;
	};
	const tap = (want, where = 'view') => {
		const region = where === 'view' ? view() : nav();
		const f = find(region, want);
		if (!f) return false;
		return click(where, f);
	};
	const tabTap = (ck) => tap({ 'data-cluster': ck }, 'bnav');
	/* at: the entry's place in the history, which a push after a Back moves on
	   by one while length stays (the browser drops the forward entries) */
	const state = () => ({ hash: loc.hash, d: (history.state || {}).ootd, len: history.length, at: H.i, key: g('screenKey')(), tab: run('state.tab') });
	return { sandbox, g, run, view, nav, tap, tabTap, state, history, loc, H, ls, ss, fire: (t, e) => fire(listeners.window, t, e), key: (e) => fire(listeners.document, 'keydown', e) };
}

/* the records a fresh device and a device with its own menu start from */
const KEY = 'bartenders-ledger-v1';
const ownMenu = () => ({ cards: {}, quizzes: [], practice: {}, qa: {}, levels: {}, tastings: [], vidPrefs: { channel: 'auto', longform: false },
	bar: ['Gin Rickey House', 'Rum Sour House', 'The House Martini', 'Bourbon Smash House', 'Section'].map((name, i) => ({
		id: 'b-own0000' + i, name, spec: ['2 oz gin', '3/4 oz lemon', '3/4 oz simple syrup'], method: 'Shake', glass: 'Coupe', garnish: 'Lemon peel', note: '', family: 'Sour', spirit: 'Gin', price: '', ts: 1 })) });

const EMDASH = /[\u2013\u2014]|&mdash;|&ndash;|&#821[12];| \x2d\x2d /;
const GLYPH = /[\u2190-\uffff]/;
const NUMERAL = /\bLevel\s+(?:I{1,3}|IV|[1-4])\b|lv-num/;
const strip = (s) => s.replace(/<[^>]+>/g, ' ');
const backs = (s) => (s.match(/data-act="back"/g) || []).length;

/* ---- 1. the nav ----------------------------------------------------------- */
{
	const A = boot();
	await settle();
	const clusters = A.g('NAV_CLUSTERS');
	const words = clusters.map((c) => c[1]).join(' · ');
	if (words !== 'Home · Flashcards · Quizzes · Library · More') fail(`the nav reads ${words}, not Home · Flashcards · Quizzes · Library · More`);
	const tabs = A.g('TABS').map((t) => t[0]);
	for (const t of tabs) {
		const n = clusters.filter((c) => c[2].includes(t)).length;
		if (n !== 1) fail(`TABS id "${t}" sits in ${n} clusters, not one`);
	}
	/* every id TABS held at 5f20590, frozen here */
	const WAS = ['home', 'level', 'mine', 'menu', 'families', 'library', 'shots', 'na', 'service', 'ontap', 'coffee', 'prep', 'producers', 'notes', 'flashcards', 'quiz', 'practice', 'riffs', 'tools'];
	for (const t of WAS) if (!tabs.includes(t)) fail(`TABS lost "${t}", which an old address names`);
	/* the bar drawn: four tab words, then More, one row of five */
	const bar = [...A.nav().matchAll(/<button class="bnav-btn([^"]*)"[^>]*data-cluster="(\w+)"><span>([^<]*)/g)];
	if (bar.map((b) => b[3].trim()).join('|') !== 'Home|Flashcards|Quizzes|Library|More') fail(`the bottom bar reads ${JSON.stringify(bar.map((b) => b[3].trim()))}`);
	if (!bar[4] || !/bnav-more/.test(bar[4][1])) fail('More is not drawn quiet (bnav-more) in the bottom bar');
	if (/data-search/.test(A.nav())) fail('the bottom bar still carries Search');
	if (!/aria-current="page"[^>]*data-cluster="home"/.test(A.nav())) fail('the lit word on Home carries no aria-current="page"');
	A.tabTap('more'); await settle();
	if (!/bnav-more active" aria-current="page"/.test(A.nav())) fail('More is not lit with aria-current="page" on a More screen');
}

/* ---- 2. the push model, the owner's flashcard chain ------------------------ */
{
	const A = boot({ local: { [KEY]: JSON.stringify(ownMenu()) } });
	await settle();
	const s0 = A.state();
	if (s0.hash !== '#/home' || s0.d !== 0) fail(`the first paint is ${s0.hash} at depth ${s0.d}, not #/home at 0`);
	if (backs(A.view()) !== 0) fail('Home draws a Back');
	const chain = [];
	A.tap({ 'data-act': 'level-open', 'data-n': '2' }); await settle(); chain.push(A.state());
	A.tabTap('flashcards'); await settle(); chain.push(A.state());
	A.tap({ 'data-act': 'deck', 'data-deck': 'menu' }); await settle(); chain.push(A.state());
	A.tap({ 'data-act': 'fc-start' }); await settle(); chain.push(A.state());
	const want = ['level/bartender', 'flashcards', 'flashcards/menu', 'flashcards/menu/card'];
	chain.forEach((s, i) => {
		if (s.key !== want[i]) fail(`the chain's step ${i + 1} is ${s.key}, not ${want[i]}`);
		if (s.d !== i + 1) fail(`the chain's step ${i + 1} carries ootd ${s.d}, not ${i + 1}`);
	});
	const len = A.history.length;
	A.tap({ 'data-act': 'fc-flip' }); await settle();
	A.tap({ 'data-act': 'fc-grade', 'data-ok': '1' }); await settle();
	if (A.history.length !== len) fail(`a flip and Got it grew the history from ${len} to ${A.history.length}`);
	if (!/Card 2 of /.test(A.view())) fail('Got it did not move to the second card');
	const down = [];
	for (let i = 0; i < 4; i++) {
		if (backs(A.view()) !== 1) fail(`${A.state().key}: ${backs(A.view())} Back controls, not one`);
		A.tap({ 'data-act': 'back' }); await settle(); down.push(A.state());
	}
	const wantDown = ['flashcards/menu', 'flashcards', 'level/bartender', 'home'];
	down.forEach((s, i) => {
		if (s.key !== wantDown[i]) fail(`Back ${i + 1} lands on ${s.key}, not ${wantDown[i]}`);
		if (s.d !== 3 - i) fail(`Back ${i + 1} lands at depth ${s.d}, not ${3 - i}`);
	});
	if (backs(A.view()) !== 0) fail('Back is drawn on Home after the walk down');
	/* in-screen changes write no history: the scope chip, show all and back, a level search */
	A.tabTap('flashcards'); await settle();
	const l2 = A.history.length;
	A.tap({ 'data-act': 'scope-all', 'data-for': 'flashcards' }); await settle();
	if (A.state().hash !== '#/flashcards/all') fail(`show all levels left the address at ${A.state().hash}, not #/flashcards/all`);
	A.tap({ 'data-act': 'scope-one', 'data-for': 'flashcards' }); await settle();
	A.tap({ 'data-act': 'scope-open', 'data-for': 'flashcards' }); await settle();
	if (!/data-act="scope-pick"/.test(A.view())) fail('the level name on the scope chip opens no list of levels');
	A.tap({ 'data-act': 'scope-pick', 'data-for': 'flashcards', 'data-n': '3' }); await settle();
	if (A.history.length !== l2) fail('the scope chip grew the history');
	if (A.ls['oot-level-ledger-v1'] !== '3') fail('choosing a level from the scope chip did not set the chosen level');
	A.tabTap('home'); await settle();
	if (!/<button class="level on" data-act="level-open" data-n="3"/.test(A.view())) fail('the level chosen from the chip is not Home\'s "Your level"');
	/* the depth survives a reload of the same address */
	A.tabTap('flashcards'); await settle();
	A.tap({ 'data-act': 'deck', 'data-deck': 'everything' }); await settle();
	const before = A.state();
	/* a browser keeps the entry's state across a reload */
	const B0 = boot({ hash: before.hash, local: A.ls, session: Object.assign({}, A.ss), navType: 'reload' });
	B0.H.entries[0] = { state: JSON.parse(JSON.stringify(A.history.state)), url: A.loc.href };
	await settle();
	if (B0.state().d !== before.d) fail(`a reload of ${before.hash} with its entry's state reads depth ${B0.state().d}, not ${before.d}`);
	/* the mirror, when the entry kept nothing, is read on a reload */
	const B = boot({ hash: before.hash, local: A.ls, session: Object.assign({}, A.ss), navType: 'reload' });
	B.H.entries[0].url = A.loc.href;
	await settle();
	if (B.state().d !== before.d) fail(`a reload of ${before.hash} reads depth ${B.state().d}, not ${before.d}`);
	/* and never on a fresh arrival at the same address: a link from another
	   room makes a new entry at depth 0, and its Back stays in the app */
	const F = boot({ hash: before.hash, local: A.ls, session: Object.assign({}, A.ss), referrer: 'http://localhost/table/menu' });
	F.H.entries[0].url = A.loc.href;
	await settle();
	if (F.state().d !== 0) fail(`a fresh arrival at ${before.hash}, the address the mirror holds, reads depth ${F.state().d}, not 0`);
	const fi = F.H.i, fl = F.history.length;
	F.tap({ 'data-act': 'back' }); await settle();
	if (F.H.i !== fi || F.history.length !== fl) fail('Back on a fresh arrival at the mirrored address left its entry (history.back), not a replace onto the parent');
	if (F.state().key !== 'flashcards') fail(`Back on a fresh arrival at ${before.hash} lands on ${F.state().key}, not its parent flashcards`);
}

/* ---- 3. a cold deep link walks up with replaces --------------------------- */
{
	const A = boot({ hash: '#/library/sazerac' });
	await settle();
	const s = A.state();
	if (s.key !== 'library/sazerac' || s.d !== 0) fail(`a cold #/library/sazerac is ${s.key} at depth ${s.d}`);
	const len = A.history.length;
	const keys = [];
	for (let i = 0; i < 3 && backs(A.view()); i++) { A.tap({ 'data-act': 'back' }); await settle(); keys.push(A.state().key); }
	if (keys.join('|') !== 'library|home') fail(`a cold #/library/sazerac walks up ${keys.join(' > ')}, not library > home`);
	if (A.history.length !== len) fail('walking up a cold link grew the history');
}

/* ---- 4. one action, one entry ---------------------------------------------- */
{
	const A = boot();
	await settle();
	A.tap({ 'data-act': 'level-open', 'data-n': '1' }); await settle();
	const s0 = A.state();
	A.run("state.level.q = 'negroni';");
	A.run('render()'); await settle();
	if (!/data-act="hash" data-h="#\/library\/negroni"/.test(A.view())) fail('the level page\'s search finds no Negroni');
	A.tap({ 'data-act': 'hash', 'data-h': '#/library/negroni' }); await settle();
	const s1 = A.state();
	if (s1.at !== s0.at + 1 || s1.d !== s0.d + 1 || s1.key !== 'library/negroni') fail(`a search hit moved ${s1.at - s0.at} entries at depth ${s1.d} on ${s1.key}`);
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== s0.key) fail(`one Back after a search hit lands on ${A.state().key}, not ${s0.key}`);
	/* gotoHash, the overlay's door, is a push */
	const s2 = A.state();
	A.run("gotoHash('#/producers')");
	/* the router's own push, there at once: not an entry the browser makes
	   later for an assigned location.hash */
	if (A.loc.hash !== '#/producers' || (A.history.state || {}).ootd !== s2.d + 1 || A.state().key !== 'producers') fail('gotoHash left the push to the browser (location.hash), not the router');
	await settle();
	if (A.state().at !== s2.at + 1 || A.state().d !== s2.d + 1) fail(`gotoHash did not make exactly one entry one deeper (${JSON.stringify(s2)} to ${JSON.stringify(A.state())})`);
	/* an entry the browser made for a hash link: adopted, one deeper, not doubled */
	const s3 = A.state();
	A.loc.hash = '#/shots';
	await settle();
	const s4 = A.state();
	if (s4.at !== s3.at + 1) fail(`a browser hash entry moved the history by ${s4.at - s3.at}, not one`);
	if (s4.d !== s3.d + 1) fail(`a browser hash entry was adopted at depth ${s4.d}, not ${s3.d + 1}`);
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== s3.key) fail(`one Back after a hash link lands on ${A.state().key}, not ${s3.key}`);
	/* a link drawn inside the view goes through the router */
	A.run("state.tab = 'level'; state.level.n = 1;"); A.run('render()'); await settle();
}

/* ---- 5. the quiz chain: results from memory, Study this card, cold falls to Quizzes ---- */
{
	const A = boot({ local: { [KEY]: JSON.stringify(ownMenu()) } });
	await settle();
	A.tabTap('quizzes'); await settle();
	if (A.state().key !== 'quiz') fail(`the Quizzes tab lands on ${A.state().key}`);
	A.tap({ 'data-act': 'quiz-go', 'data-m': 'quick' }); await settle();
	if (A.state().key !== 'quiz/quick') fail(`Start the quick quiz lands on ${A.state().key}`);
	const n = A.run('state.quiz.round.length');
	if (n !== 10) fail(`the quick quiz deals ${n} questions, not ten`);
	const len = A.history.length;
	for (let i = 0; i < n; i++) {
		const right = A.run('(function(){ const q = state.quiz.round[state.quiz.idx]; return q.options.indexOf(q.answer); })()');
		const pick = i % 2 === 0 ? (right + 1) % 4 : right;
		A.tap({ 'data-act': 'quiz-pick', 'data-i': String(pick) }); await settle();
		A.tap({ 'data-act': 'quiz-next' }); await settle();
	}
	if (A.history.length !== len) fail(`ten questions and their results grew the history by ${A.history.length - len}`);
	if (A.state().hash !== '#/quiz/quick/done') fail(`the results' address is ${A.state().hash}`);
	const done = A.view();
	if (!/>What you missed</.test(done)) fail('the results carry no "What you missed"');
	const misses = A.run('state.quiz.missedQ.length');
	const study = [...done.matchAll(/data-act="hash" data-h="([^"]+)">Study this card</g)];
	if (!study.length) fail('no miss of the quick quiz offers Study this card');
	if (!/data-act="fc-misses"/.test(done)) fail('the results offer no Study the misses');
	if (study.length) {
		A.tap({ 'data-act': 'hash', 'data-h': study[0][1] }); await settle();
		A.tap({ 'data-act': 'back' }); await settle();
		if (A.state().hash !== '#/quiz/quick/done' || A.run('state.quiz.missedQ.length') !== misses) fail(`Back from Study this card lands on ${A.state().hash} with ${A.run('state.quiz.missedQ.length')} misses, not the same results`);
	}
	/* Study the misses: exactly the missed items that have a card */
	const keys = A.run('missKeysOf(state.quiz.missedQ)');
	A.tap({ 'data-act': 'fc-misses', 'data-from': 'quiz' }); await settle();
	const dealt = A.run('state.fc.deck.map(cardKey)');
	if (A.state().key.indexOf('flashcards/misses/') !== 0 || dealt.slice().sort().join('|') !== keys.filter((k) => dealt.includes(k) || true).slice().sort().join('|')) fail(`Study the misses dealt ${JSON.stringify(dealt)} for the misses ${JSON.stringify(keys)}`);
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().hash !== '#/quiz/quick/done') fail(`Back from the misses' run lands on ${A.state().hash}`);
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== 'quiz') fail(`Back from the results lands on ${A.state().key}, not Quizzes`);
	/* a cold address of a finished round: Quizzes, with a replace */
	const C = boot({ hash: '#/quiz/mixed/done' });
	await settle();
	if (C.state().hash !== '#/quiz' || C.history.length !== 1) fail(`a cold #/quiz/mixed/done lands on ${C.state().hash} with ${C.history.length} entries`);
}

/* ---- 6. routes round-trip, and the parent map is total --------------------- */
{
	const A = boot({ local: { [KEY]: JSON.stringify(ownMenu()) } });
	await settle();
	const setups = [
		"state.tab='home'",
		"openLevel(1)", "openLevel(4)",
		"state.tab='flashcards'; state.fc.stage='pick'",
		"openDeck('cocktails')", "openDeck('cocktails:1')", "openDeck('shots')", "openDeck('zero-proof')", "openDeck('on-tap')", "openDeck('coffee')",
		"openDeck('everything')", "openDeck('trouble')", "openDeck('unmastered')", "openDeck('menu')", "openDeck('menu-weak')",
		"openDeck('cocktails'); startDeckRun()",
		"state.tab='flashcards'; state.fc.stage='board'",
		"state.tab='quiz'; state.quiz.stage='setup'",
		"startRound('mixed')", "startRound('quick')", "startRound('level-1-cocktails')",
		"ltStart(2); state.tab='level'",
		"state.tab='library'; state.lib={q:'',fam:'All',tier:'All',open:null,level:1}",
		"state.tab='library'; state.lib={q:'',fam:'All',tier:'All',open:3,level:null}",
		"state.tab='families'", "state.tab='notes'", "state.tab='service'", "state.tab='ontap'", "state.tab='coffee'", "state.tab='videos'",
		"state.tab='shots'; state.shots.open=null", "state.tab='na'; state.na.open=2", "state.tab='prep'; state.prep.open=1", "state.tab='producers'; state.prod.open=null",
		"state.tab='mine'", "state.tab='record'",
		...['batch', 'dates', 'strength', 'cost', 'spills', 'convert', 'maitre', 'data', 'video'].map((v) => `state.tab='tools'; state.tools.view='${v}'`),
		...['drills', 'rail', 'hold', 'pour', 'tasting', 'flights', 'method'].map((v) => `state.tab='practice'; state.practice.view='${v}'`),
		"state.tab='riffs'",
		"state.tab='menu'; state.menu.view='menu'", "state.tab='menu'; state.menu.view='stock'", "state.tab='menu'; state.menu.view='add'",
	];
	const seenTabs = new Set();
	for (const code of setups) {
		A.run('state.lt = null;');
		A.run(code);
		A.run('navNormalise()');
		const r1 = A.g('routeNow')();
		seenTabs.add(A.run('state.tab'));
		/* the address read back is the same screen */
		A.run("state.tab = 'home';");
		if (!A.g('applyRoute')(r1.hash)) { fail(`${r1.hash} (from ${code}) is not an address applyRoute reads`); continue; }
		A.run('navNormalise()');
		const r2 = A.g('routeNow')();
		if (r2.key !== r1.key) fail(`${r1.hash} reads back as ${r2.key}, not ${r1.key}`);
		/* the parent: there, never itself, and none only for Home */
		A.run(code); A.run('navNormalise()');
		const p = A.g('parentTab')();
		if (r1.key === 'home') { if (p) fail('Home has a parent'); continue; }
		if (!p) { fail(`${r1.key} has no parent`); continue; }
		A.g('applyParent')();
		A.run('navNormalise()');
		const r3 = A.g('routeNow')();
		if (r3.key === r1.key) fail(`${r1.key}'s parent is itself`);
	}
	for (const t of A.g('TABS').map((x) => x[0])) if (!seenTabs.has(t)) fail(`the round trip never visits TABS id "${t}"`);
	/* every deck id the picker draws has a definition and a parent */
	A.run("state.tab='flashcards'; state.fc.stage='pick'; render();"); await settle();
	for (const m of A.view().matchAll(/data-act="deck" data-deck="([^"]+)"/g)) {
		if (!A.g('deckDef')(m[1])) fail(`the picker draws deck "${m[1]}", which nothing defines`);
	}
	/* the section address never opens a drink, even one called Section */
	A.run("state.menu.open = null;");
	A.g('applyRoute')('#/menu/section/section');
	if (A.run('state.menu.open') !== null || A.run('state.tab') !== 'menu') fail('#/menu/section/section opened a drink called Section');
	A.g('applyRoute')('#/menu/section');
	if (A.run('state.menu.open') === 'b-own00004') fail('#/menu/section resolved as the drink called Section through the section branch');
}

/* ---- 7. old addresses land, each with one Back to its parent ---------------- */
{
	const cases = [
		['#/mybar/rum-sour-house', 'menu', 'level'],
		['#/service/beer', 'ontap', 'library'],
		['#/level', 'level', 'home'],
		['#/level/head-bartender', 'level', 'home'],
		['#drink=b-zzzzzzzz', 'home', null],
		['#/mine', 'mine', 'home'],
		['#/menu', 'menu', 'level'],
		['#/flashcards', 'flashcards', 'home'],
		['#/quiz', 'quiz', 'home'],
		['#/tools', 'tools', 'mine'],
		['#/practice', 'practice', 'quiz'],
	];
	for (const [hash, tab, parent] of cases) {
		const A = boot({ hash, local: { [KEY]: JSON.stringify(ownMenu()) } });
		await settle();
		const s = A.state();
		if (s.tab !== tab) { fail(`${hash} lands on ${s.tab}, not ${tab}`); continue; }
		if (tab === 'home') { if (backs(A.view())) fail(`${hash}: Home draws a Back`); continue; }
		if (backs(A.view()) !== 1) fail(`${hash}: ${backs(A.view())} Back controls, not one`);
		const len = A.history.length;
		A.tap({ 'data-act': 'back' }); await settle();
		if (A.state().tab !== parent) fail(`${hash}: the first Back goes to ${A.state().tab}, not ${parent}`);
		if (A.history.length !== len) fail(`${hash}: the first Back at depth 0 pushed an entry`);
	}
	/* #/level lands on the chosen level */
	const L = boot({ hash: '#/level', local: { 'oot-level-ledger-v1': '3' } });
	await settle();
	if (L.state().key !== 'level/head-bartender') fail(`#/level with Head Bartender chosen lands on ${L.state().key}`);
}

/* ---- 8. the screens: one Back, Home four cards, words and no glyphs --------- */
{
	const A = boot({ local: { [KEY]: JSON.stringify(ownMenu()) } });
	await settle();
	const home = A.view();
	const inner = home.replace(/^<div class="home4">/, '').replace(/<\/div>$/, '');
	if (!/^<section class="levels" aria-label="Levels">[\s\S]*<\/section>$/.test(inner) || /<nav\b/.test(inner)) fail('the home is not the four level cards and nothing else');
	if ((home.match(/<button\b/g) || []).length !== 4) fail(`the home holds ${(home.match(/<button\b/g) || []).length} controls, not the four cards`);
	const screens = [
		['the Barback page', "openLevel(1)", true],
		['the Bar Manager page', "openLevel(4)", true],
		['Flashcards', "state.tab='flashcards'; state.fc.stage='pick'", true],
		['Flashcards, every level', "state.tab='flashcards'; state.fc.stage='pick'; state.scopeAll.flashcards=true", true],
		['a deck', "openDeck('cocktails')", true],
		['the menu deck', "openDeck('menu')", true],
		['a card', "openDeck('cocktails'); startDeckRun('name2spec')", false],
		['Quizzes', "state.tab='quiz'; state.quiz.stage='setup'; state.scopeAll.quiz=false", true],
		['Quizzes, every level', "state.tab='quiz'; state.quiz.stage='setup'; state.scopeAll.quiz=true", true],
		['More', "state.tab='mine'", true],
		['Videos', "state.tab='videos'", true],
		['the Library', "state.tab='library'; state.lib={q:'',fam:'All',tier:'All',open:null,level:1}", false],
		['the record', "state.tab='record'", false],
		['Batching', "state.tab='tools'; state.tools.view='batch'", false],
		['the drills', "state.tab='practice'; state.practice.view='drills'", false],
		['the menu', "state.tab='menu'; state.menu.view='menu'", false],
		['a level test', "ltStart(1); state.tab='level'", false],
	];
	for (const [name, code, own] of screens) {
		A.run('state.lt = null; state.scopeAll.flashcards=false;');
		A.run(code);
		A.run('render()'); await settle();
		const v = A.view();
		if (backs(v) !== 1) fail(`${name}: ${backs(v)} Back controls, not one`);
		if (!/data-act="back">Back<\/button>/.test(v)) fail(`${name}: the Back control does not say Back`);
		if (/>\s*Back to /.test(v)) fail(`${name}: carries a "Back to"`);
		if (NUMERAL.test(v)) fail(`${name}: names a level by a numeral`);
		if (own) {
			/* the screen's own words: the house line and the books' prose are not the screen talking */
			const words = strip(v);
			if (EMDASH.test(words)) fail(`${name}: carries a dash (${(words.match(EMDASH) || [])[0]})`);
			if (GLYPH.test(words.replace(/[\u2018\u2019\u201c\u201d\u00b7\u00ee\u00e9\u00e8]/g, ''))) fail(`${name}: carries a mark at or above U+2190 (${(words.match(GLYPH) || [])[0]})`);
		}
	}
	/* the level page: the switch after what it holds; More: no Search; the Library root: Search everything */
	A.run('openLevel(2); render()'); await settle();
	const lp = A.view();
	if (!(lp.indexOf('<details class="lv-holds">') >= 0 && lp.indexOf('<nav class="lv-switch"') > lp.indexOf('<details class="lv-holds">'))) fail('the level page\'s switch is not after what the level holds');
	A.run("state.tab='mine'; render()"); await settle();
	if (/Search/.test(strip(A.view()))) fail('More carries a Search row');
	A.run("state.tab='library'; state.lib={q:'',fam:'All',tier:'All',open:null,level:2}; render()"); await settle();
	if (!/data-act="search-all"><span class="door-name">Search everything<\/span>/.test(A.view())) fail('the Library root has no Search everything');
	if (!/<h2 class="lv-title" tabindex="-1">Library<\/h2>/.test(A.view())) fail('the Library root has no heading');
	if (!/role="group" aria-label="Level"/.test(A.view())) fail('the Library root has no scope chip');
	/* a filter never hides what was searched for: the Sazerac at Bar Manager */
	A.run("state.tab='library'; state.lib={q:'Sazerac',fam:'All',tier:'All',open:null,level:4}; render()"); await settle();
	if (!/Nothing at Bar Manager for "Sazerac"\./.test(A.view()) || !/>At other levels</.test(A.view())) fail('a Library search with nothing at the level does not show the other levels\' matches');
}

/* ---- 9. one count for Due today --------------------------------------------- */
{
	const A = boot({ local: { [KEY]: JSON.stringify(ownMenu()) } });
	await settle();
	const t = A.run('dueToday()');
	const parts = A.run('sessionDeckParts()');
	const want = Math.min(20, parts.dueDeck.length) + Math.min(parts.newDeck.length, 10, 20 - Math.min(20, parts.dueDeck.length));
	if (t.deck.length !== want) fail(`Due today deals ${t.deck.length}, not due plus new under the caps (${want})`);
	if (!(t.deck.length > 0)) fail('Due today is empty on a fresh record');
	if (t.house < 1) fail('Due today deals no card from the menu first on a fresh record with a menu');
	const pill = (A.nav().match(/data-cluster="flashcards"><span>Flashcards <span class="font-tix nav-pill">(\d+)/) || [])[1];
	A.run('openLevel(1); render()'); await settle();
	const row = A.view().match(/data-d="due"><span class="door-name">Due today<\/span><span class="door-line">([^<]*)/);
	A.run("state.tab='flashcards'; state.fc.stage='pick'; render()"); await settle();
	const root = A.view().match(/id="fc-due-h">Due today<\/h3><p class="door-line">([^<]*)/);
	const line = A.run('dueTodayLine()');
	if (String(pill) !== String(t.deck.length)) fail(`the Flashcards pill says ${pill}, not ${t.deck.length}`);
	if (!row || row[1].replace(/&#39;|&rsquo;/g, "'") !== line.replace(/\u2019/g, "'") && row[1] !== line) fail(`the level page's Due today says ${row && row[1]}, not ${line}`);
	if (!root || root[1] !== row[1]) fail(`the Flashcards root's Due today says ${root && root[1]}, not the level page's ${row && row[1]}`);
	/* the run starts at once, on the card screen, from the level page */
	A.run('openLevel(1); render()'); await settle();
	const before = A.state().at;
	A.tap({ 'data-act': 'today', 'data-d': 'due' }); await settle();
	if (A.state().key !== 'flashcards/due/card' || A.state().at !== before + 1) fail(`Due today opens ${A.state().key} (entry ${before} to ${A.state().at}), not the card screen at once`);
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== 'level/barback') fail(`Back from Due today's run lands on ${A.state().key}, not the level page`);
}

/* ---- 10. Print cards is a screen ------------------------------------------- */
{
	const A = boot();
	await settle();
	A.tabTap('library'); await settle();
	const s0 = A.state();
	A.tap({ 'data-act': 'lib-print' }); await settle();
	const s1 = A.state();
	if (s1.key !== 'library/print' || s1.hash !== '#/library/print' || s1.at !== s0.at + 1 || s1.d !== s0.d + 1) fail(`Print cards is ${s1.key} at ${s1.hash}, entry ${s0.at} to ${s1.at}, not one push to #/library/print`);
	const v = A.view();
	if (backs(v) !== 1) fail(`Print cards: ${backs(v)} Back controls, not one`);
	if (/lib-print-close|>\s*[^<]*Back to /.test(v)) fail('Print cards draws a second way back');
	if (!/id="print-sheet"/.test(v)) fail('Print cards draws no print sheet');
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== s0.key || A.run('state.lib.print')) fail(`Back from Print cards lands on ${A.state().key} with print ${A.run('state.lib.print')}, not the Library`);
	const C = boot({ hash: '#/library/print' });
	await settle();
	if (C.state().key !== 'library/print') fail(`a cold #/library/print lands on ${C.state().key}`);
	C.tap({ 'data-act': 'back' }); await settle();
	if (C.state().key !== 'library' || C.history.length !== 1) fail(`Back from a cold #/library/print lands on ${C.state().key} with ${C.history.length} entries, not the Library by a replace`);
}

/* ---- 11. held until the house wakes ------------------------------------------ */
if (!HOUSE_HERE) console.log('  SKIPPED the wake cases: no House engine and pack beside this checkout (OOT_SHARED=<dir> names one)');
else {
	const pack = readFileSync(HOUSE_PACK, 'utf8');
	const wake = async (A) => {
		await A.run('OOT.house').importPack(pack, { mode: 'new' });
		await A.run('houseSyncIn()');
		A.run('houseRepaint()');
		await settle();
	};
	/* a #drink= link from the Table on a device with no house yet */
	const A = boot({ hash: '#drink=b-olsmh04y', referrer: 'http://localhost/table/menu', house: true });
	await settle();
	await wake(A);
	const s = A.state();
	if (s.key !== 'menu/card' || s.d !== 0 || A.history.length !== 1) fail(`a #drink= link held until the wake opens ${s.key} at depth ${s.d} with ${A.history.length} entries, not the card in place of the arrival`);
	if (!/Opened from The World Table/.test(A.view())) fail('a #drink= link held until the wake does not say it was opened from The World Table');
	A.tap({ 'data-act': 'back' }); await settle();
	if (A.state().key !== 'menu' || A.history.length !== 1 || A.H.i !== 0) fail(`Back from a card held until the wake lands on ${A.state().key} with ${A.history.length} entries, not the menu list by a replace`);
	/* a cold section before the wake keeps its section and its address */
	const S = boot({ hash: '#/menu/section/eye-openers', house: true });
	await settle();
	if (S.state().hash !== '#/menu/section/eye-openers') fail(`a cold #/menu/section/eye-openers before the wake rewrote its address to ${S.state().hash}`);
	await wake(S);
	if (S.run('state.menu.study && state.menu.study.sec') !== 'Eye openers' || S.state().hash !== '#/menu/section/eye-openers' || S.history.length !== 1) fail(`a cold #/menu/section/eye-openers after the wake shows section "${S.run('state.menu.study && state.menu.study.sec')}" at ${S.state().hash} with ${S.history.length} entries`);
	/* a section the house does not hold is dropped once it has answered */
	const N = boot({ hash: '#/menu/section/no-such-section', house: true });
	await settle();
	await wake(N);
	if (N.state().hash !== '#/menu') fail(`a section the woken house lacks leaves the address at ${N.state().hash}, not #/menu`);
}

/* Scope replaces the chosen button, but must not drop keyboard readers at
   the beginning of the page. Exercise the real render and Escape listener. */
{
	for (const root of ['flashcards', 'quiz', 'library']) {
		const A = boot({ hash: '#/' + root });
		await settle();
		const doc = A.sandbox.document;
		let focused = '';
		doc.querySelector = (selector) => {
			const attrs = [...String(selector).matchAll(/\[data-([a-z]+)="([^"]+)"\]/g)];
			if (!attrs.length || !String(selector).includes('scope-')) return null;
			const present = [...A.view().matchAll(/<button\b([^>]*)>/g)].some((m) => attrs.every((a) => m[1].includes('data-' + a[1] + '="' + a[2] + '"')));
			return present ? { focus() { focused = selector; } } : null;
		};
		const opener = '[data-act="scope-open"][data-for="' + root + '"]';
		A.tap({ 'data-act': 'scope-open', 'data-for': root });
		if (!A.view().includes('aria-controls="scope-options-' + root + '"') || !A.view().includes('id="scope-options-' + root + '"')) fail(root + ': scope disclosure has no associated options group');
		doc.activeElement = { dataset: { act: 'scope-pick', for: root, n: '2' } };
		A.tap({ 'data-act': 'scope-pick', 'data-for': root, 'data-n': '2' });
		if (focused !== opener) fail(root + ': selecting a level does not restore focus to the surviving scope button');
		A.tap({ 'data-act': 'scope-open', 'data-for': root });
		focused = ''; doc.activeElement = { dataset: { act: 'scope-pick', for: root, n: '3' } };
		const before = A.history.length;
		let prevented = false;
		A.key({ key: 'Escape', target: { tagName: 'BUTTON' }, preventDefault() { prevented = true; } });
		if (!prevented || A.run('state.scopeOpen') || focused !== opener || A.history.length !== before) fail(root + ': Escape must close the scope picker, restore focus and leave history alone');
		doc.activeElement = { dataset: { act: 'scope-all', for: root } }; focused = '';
		A.tap({ 'data-act': 'scope-all', 'data-for': root });
		if (focused !== '[data-act="scope-one"][data-for="' + root + '"]') fail(root + ': show all loses focus instead of handing it to show one level');
		doc.activeElement = { dataset: { act: 'scope-one', for: root } }; focused = '';
		A.tap({ 'data-act': 'scope-one', 'data-for': root });
		if (focused !== opener) fail(root + ': returning to one level loses scope focus');
	}
}

if (process.argv.includes('--mutations')) await mutations();

if (problems.length) {
	console.error(`\n  ✗ ${problems.length} problem(s)`);
	for (const p of problems.slice(0, 60)) console.error(`    ${p}`);
	process.exit(1);
}
console.log('  ✓ the four tabs and More, every route round-trips, the parents are total, every screen change is one entry and every Back one step, the old addresses land, one Back on every screen but Home');

/* ---- the gate proves it can fail ---------------------------------------------
   Each mutation breaks one rule in a scratch copy of js/; this gate run on it
   must go red. */
async function mutations(){
	const MUT = [
		['a replaceState put back in the push path', 'ui-nav.js', "try { h.pushState({ ootd: NAV.d, ootk: r.key, ootp: NAV.key }, '', r.hash); } catch (e) {}", "try { h.replaceState({ ootd: NAV.d, ootk: r.key, ootp: NAV.key }, '', r.hash); } catch (e) {}"],
		['a missing parent', 'ui-nav.js', "if(t === 'record' || t === 'tools') return 'mine';", "if(t === 'record') return 'mine';"],
		['a sixth word', 'ui-new.js', "['more', 'More', ['mine','record','tools']],", "['more', 'More', ['mine','record']],\n  ['tools', 'Tools', ['tools']],"],
		['a Back drawn twice', 'ui-levels.js', "  return back;\n}", "  return back + back;\n}"],
		['location.hash put back in gotoHash', 'ui-new.js', "  if(applyRoute(h)) render();", "  if(location.hash === h){ applyRoute(); render(); } else location.hash = h;"],
		['the new-card top-up taken out', 'ui-nav.js', "const fresh = p.newDeck.slice(0, Math.min(10, 20 - due.length));", "const fresh = [];"],
		['the mirror read on a fresh arrival', 'ui-nav.js', "  if(!navWasReload()) return 0;\n", ""],
		['a held drink opened by a push', 'house-study.js', "  state.navForce = 'replace';\n  hsReplace(", "  hsReplace("],
		['a held section rewritten before the wake', 'ui-nav.js', "    else if(NAV_WANT_SEC){ hash += '/section/' + NAV_WANT_SEC; }\n", ""],
		['Print cards not a screen', 'ui-nav.js', "    if(t === 'library' && state.lib.print){ hash = '#/library/print'; key = 'library/print'; }\n", ""],
		['a Back to crumb restored', 'ui-levels.js', "  return back;\n}", "  return back + '<div class=\"crumb\"><button class=\"chip\" data-act=\"go\" data-tab=\"home\">Back to Home</button></div>';\n}"],
	];
	let held = 0;
	for (const [name, file, from, to] of MUT) {
		const dir = mkdtempSync(join(tmpdir(), 'ledger-nav-'));
		cpSync(JS_DIR, dir, { recursive: true });
		const src = readFileSync(join(dir, file), 'utf8');
		if (!src.includes(from)) { fail(`the mutation "${name}" found nothing to change in ${file}`); rmSync(dir, { recursive: true, force: true }); continue; }
		writeFileSync(join(dir, file), src.replace(from, to));
		const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: Object.assign({}, process.env, { LEDGER_JS: dir }), encoding: 'utf8' });
		rmSync(dir, { recursive: true, force: true });
		if (r.status === 0) fail(`the mutation "${name}" left this gate green`);
		else { held++; console.log(`  mutation held: ${name}`); }
	}
	console.log(`  ${held} of ${MUT.length} mutations turned the gate red`);
}
