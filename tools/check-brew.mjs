/* Coffee and tea, the house's page (18 October 2026): its gate.

     node tools/check-brew.mjs              every check below
     node tools/check-brew.mjs --mutations  then breaks the shipped files eight ways, one at a time, and expects red each time
     node tools/check-brew.mjs --help

   The whole app is loaded from index.html's own script list (app.js and its
   boot included) into a sandbox with a small DOM harness: a document whose
   regions are strings, a history with real entries, back() and popstate, a
   location read from the entry, both storages in memory, and a tap that is
   the delegated click a real tap makes on the element found in the rendered
   markup. So what is held is the SHIPPED page, router, render() and acts.

   LEDGER_JS=<dir> points it at another copy's js/; the root is the folder
   above, and its index.html names the scripts (the wing's copy, as
   check-bar-compass.mjs reads it). The roster, the fragments' rules and the
   build stay this checkout's (tools/brew/). OOT_SHARED=<dir> names the House
   engine and the pack (else ../../shared/ or ../../worldtable/static/shared/
   beside this checkout; absent is a note and skips H1 to H3; an override that
   holds neither fails). WORLDTABLE_SRC=<dir> names the World Table checkout
   for the recipe links (else beside this checkout or above OOT_SHARED; absent
   is a note; an override that holds no recipe index fails).

   BREW_SEED=1, or a data file built with fewer entries than the plan names,
   skips only the counts and the coverage: D2 (the counts pinned at freeze and
   REQUIRED_IDS), the every-Library-card-linked part of D7 and the none-removed
   part of W1. Everything else holds on the three seeds as it will on the 69.

   D1 shape   D2 counts   D3 word caps   D4 language   D5 nobody named
   D6 videos  D7 links    D8 the quiz    D9 the build's own output
   W1 keys    W2 kept apart   W3 addresses and Back   W4 rendering
   W5 recall  W6 the quiz through the click   W7 the doors
   H1 the house's six in menu order   H2 asks and components resolve
   H3 live rows, the door between the Compass and the producers, the house card */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, cpSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { loadContext, validateFragment, proseWords, words, strings, peopleIn, fold, nameDictionary, nameProblems, houseNeutral, LIMITS, ENTRY_MAX,
  DASH, AMERICAN, HOUSE_NAME, WATCH_URL, CHECKED_FROM, CHECKED_TO, VERIFIED_BY } from './brew/schema.mjs';

const SELF = fileURLToPath(import.meta.url);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(SELF, 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const LEDGER = join(dirname(SELF), '..');
const BREW = join(LEDGER, 'tools', 'brew');
const ROOT = process.env.LEDGER_JS ? dirname(resolve(process.env.LEDGER_JS)) : LEDGER;
const JS_DIR = process.env.LEDGER_JS ? resolve(process.env.LEDGER_JS) : join(LEDGER, 'js');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

/* The counts pinned at freeze (19 October 2026), from tools/brew/build-log.json of
   the full build: 69 entries, one recall card and three questions each, and 53
   entries carrying a video (11 Library films, 3 pack videos, 39 confirmed by two
   searches and a checker); the other 16 offer the search link. The card keys are
   frozen in tools/brew/keys.v1.json, which may gain keys and never lose one.
   A seed build never reads them. */
const FROZEN = { entries: 69, recall: 69, questions: 207, videos: 53 };
const KEYS_FILE = join(BREW, 'keys.v1.json');
/* every drink the owner named (18 October 2026), and the house's own six as the page teaches them */
const REQUIRED_IDS = ['cafe-au-lait', 'cappuccino', 'americano', 'espresso', 'latte', 'black-tea',
  'chicory-coffee', 'single-origin', 'cold-brew', 'irish-coffee', 'espresso-martini', 'coffee-with-liqueur'];

/* ---- where the House, the pack and the World Table are ------------------------- */
const SHARED_DEFAULTS = ['../../shared/', '../../worldtable/static/shared/'];
const SHARED = process.env.OOT_SHARED
  ? resolve(process.env.OOT_SHARED)
  : SHARED_DEFAULTS.map((d) => fileURLToPath(new URL(d, import.meta.url))).find((d) => existsSync(join(d, 'oot-house.js')));
const HOUSE_ENGINE = SHARED ? join(SHARED, 'oot-house.js') : null;
const HOUSE_PACK = SHARED ? join(SHARED, 'packs', 'brennans-new-orleans.v1.oothouse.json') : null;
if (process.env.OOT_SHARED && !(existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK))) {
  console.error('check-brew: OOT_SHARED names ' + SHARED + ' but it holds no oot-house.js and packs/brennans-new-orleans.v1.oothouse.json');
  process.exit(1);
}
const HOUSE_HERE = !!(HOUSE_ENGINE && existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK));
const RECIPES_REL = join('src', 'lib', 'data', 'recipes.index.json');
const WT = process.env.WORLDTABLE_SRC
  ? resolve(process.env.WORLDTABLE_SRC)
  : [join(LEDGER, '..', 'worldtable'), join(LEDGER, '..', 'WorldTable'), SHARED ? join(SHARED, '..', '..') : ''].filter(Boolean).find((d) => existsSync(join(d, RECIPES_REL)));
if (process.env.WORLDTABLE_SRC && !existsSync(join(WT, RECIPES_REL))) {
  console.error('check-brew: WORLDTABLE_SRC names ' + WT + ' but it holds no ' + RECIPES_REL);
  process.exit(1);
}

/* ---- the harness ---------------------------------------------------------------- */
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };
function boot({ hash = '', local = {}, house = false, online = true } = {}) {
  const ls = Object.assign({}, local), ss = {};
  const storage = (m) => ({ getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } });
  const base = 'http://localhost/ledger/';
  const H = { entries: [{ state: null, url: base + hash }], i: 0 };
  const listeners = { window: {}, document: {} };
  const on = (bag) => (type, fn) => { (bag[type] = bag[type] || []).push(fn); };
  const fire = (bag, type, ev) => { (bag[type] || []).slice().forEach((fn) => fn(ev)); };
  const els = {};
  const el = (id) => {
    if (els[id]) return els[id];
    const e = { id, innerHTML: '', textContent: '', value: '', dataset: {}, style: {}, listeners: {}, tagName: 'DIV',
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener(type, fn, cap) { (this.listeners[type] = this.listeners[type] || []).push({ fn, cap: !!cap }); },
      focus() { doc.activeElement = this; }, blur() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
      setAttribute() {}, getAttribute: () => null, hasAttribute: () => false, removeAttribute() {}, remove() {}, appendChild() {}, scrollIntoView() {}, click() {} };
    els[id] = e;
    return e;
  };
  ['view', 'tabs', 'bnav', 'sheet', 'search-ol', 'live'].forEach(el);
  const doc = {
    readyState: 'complete', referrer: '', activeElement: null, title: '',
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
      const nh = h.charAt(0) === '#' ? h : '#' + h;
      if (loc.hash === nh) return;
      H.entries = H.entries.slice(0, H.i + 1); H.entries.push({ state: null, url: base + nh }); H.i++;
      setTimeout(() => { fire(listeners.window, 'popstate', { state: null }); fire(listeners.window, 'hashchange', {}); }, 0);
    },
    pathname: '/ledger/', search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost', reload() {},
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
    console: { log() {}, warn() {}, error() {}, info() {} },
    document: doc, location: loc, history,
    localStorage: storage(ls), sessionStorage: storage(ss),
    navigator: { onLine: online, userAgent: 'node' },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    confirm: () => false, alert() {}, scrollTo() {}, scrollY: 0,
    addEventListener: on(listeners.window), removeEventListener() {},
    URL, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, encodeURIComponent, decodeURIComponent,
    CSS: { escape: (s) => String(s) },
    performance: { getEntriesByType: (t) => (t === 'navigation' ? [{ type: 'navigate' }] : []), now: () => Date.now() },
  };
  sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  if (house) {
    vm.runInContext(readFileSync(HOUSE_ENGINE, 'utf8'), sandbox, { filename: 'oot-house.js' });
    vm.runInContext("OOT.house = OOT.houseLib.createHouseApi(OOT.houseLib.mapStorage(), { from: 'ledger' });", sandbox);
  }
  for (const f of FILES) vm.runInContext(readFileSync(join(JS_DIR, f), 'utf8'), sandbox, { filename: f });
  const g = (name) => vm.runInContext('(typeof ' + name + ' === "undefined" ? undefined : ' + name + ')', sandbox);
  const run = (code) => vm.runInContext(code, sandbox);
  const view = () => els.view.innerHTML;
  const attrsOf = (tag) => {
    const a = {};
    for (const m of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) a[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    return a;
  };
  const target = (tagName, a) => {
    const dataset = {};
    Object.keys(a).filter((k) => k.indexOf('data-') === 0).forEach((k) => { dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = a[k]; });
    const t = { tagName: tagName.toUpperCase(), dataset, disabled: 'disabled' in a, getAttribute: (n) => (n in a ? a[n] : null), focus() {} };
    t.closest = (sel) => {
      if (sel === '[data-act]') return dataset.act !== undefined ? t : null;
      if (/^a\[href\^="#\/"\]$/.test(sel)) return t.tagName === 'A' && String(a.href || '').indexOf('#/') === 0 ? t : null;
      return null;
    };
    return t;
  };
  const find = (region, want) => {
    for (const m of region.matchAll(/<(button|a)\b([^>]*)>/g)) {
      const a = attrsOf(m[2]);
      if (Object.keys(want).every((k) => a[k] === want[k])) return { tag: m[1], a };
    }
    return null;
  };
  const dispatch = (found) => {
    const ev = { target: target(found.tag, found.a), defaultPrevented: false, button: 0, preventDefault() { this.defaultPrevented = true; } };
    const ls2 = els.view.listeners.click || [];
    ls2.filter((x) => x.cap).forEach((x) => x.fn(ev));
    if (ev.defaultPrevented) return true;
    ls2.filter((x) => !x.cap).forEach((x) => x.fn(ev));
    return true;
  };
  /* a tap on what the view drew; forge() taps an element the view never drew */
  const tap = (want) => { const f = find(view(), want); return f ? dispatch(f) : false; };
  const forge = (attrs) => dispatch({ tag: 'button', a: attrs });
  const state = () => ({ hash: loc.hash, d: (history.state || {}).ootd, len: history.length, at: H.i, key: g('screenKey')(), tab: run('state.tab') });
  return { sandbox, g, run, view, tap, forge, state, history, loc, H, ls, els };
}
async function wake(A, packText) {
  await A.run('OOT.house').importPack(packText, { mode: 'new' });
  await A.run('houseSyncIn()');
  A.run('houseRepaint()');
  await settle();
}

/* ---- the runner ----------------------------------------------------------------- */
const problems = [];
let checks = 0;
const notes = [];
async function test(name, fn) {
  try { await fn(); checks++; } catch (e) { problems.push(name + ': ' + String(e && e.message || e).split('\n').slice(0, 6).join(' ')); }
}
const strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const count = (s, re) => (String(s).match(re) || []).length;
/* the sandbox's arrays and objects are another realm's, so they are compared as plain data */
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (actual, expected, msg) => assert.deepEqual(plain(actual), plain(expected), msg);

/* ---- the data, the plan and the Library, as the page and the schema see them ---- */
const A = boot();
await settle();
const g = A.g, run = A.run;
const esc = g('esc');
const data = g('brewData')();
const entries = g('brewEntries')();
const plan = readJSON(join(BREW, 'plan.json'));
const people = readJSON(join(BREW, 'people.json'));
const companies = readJSON(join(BREW, 'companies.json'));
const ctx = loadContext({ packPath: HOUSE_PACK || '' });
ctx.videoEvidence = (id) => { const p = join(BREW, 'videos', id + '.json'); try { return existsSync(p) ? readJSON(p) : null; } catch (e) { return null; } };
/* a title shaped like a person's: "with", "by" or "featuring" before a capitalised word the
   app's vocabulary and the name lists do not hold, or two such words before a possessive */
const NAMES = nameDictionary(ctx);
/* the guide's own words in lower case and the words of the roster's names are ordinary words too */
const GUIDE_WORDS = new Set(strings(entries, '').map(([, t]) => t).concat(plan.entries.map((e) => e.name.toLowerCase())).join(' ').match(/\b[a-z][a-z']+\b/g) || []);
const ordinary = (w) => { const f = fold(w); return ctx.vocab.has(f) || GUIDE_WORDS.has(f) || NAMES.has(f) || STOP.has(f); };
const STOP = new Set(['the', 'a', 'an', 'our', 'how', 'what', 'why', 'when', 'where', 'this', 'that', 'my', 'your', 'its']);
function personShaped(t){
  const s = String(t || '');
  for (const m of s.matchAll(/\b(?:with|by|feat\.?|ft\.?|featuring)\s+(\p{Lu}\p{Ll}+)/gu)) if (!ordinary(m[1])) return true;
  for (const m of s.matchAll(/(\p{Lu}\p{Ll}+)\s+(\p{Lu}\p{Ll}+)[\u2019']s\b/gu)) if (!ordinary(m[1]) && !ordinary(m[2])) return true;
  return false;
}
const SEED = process.env.BREW_SEED === '1' || entries.length < plan.entries.length;
const SEED_BUILD = /-seed$/.test(String(data.edition || ''));
const byPlan = new Map(plan.entries.map((e, i) => [e.id, Object.assign({ index: i }, e)]));
const KEY = (id) => 'Brew Guide \u00b7 ' + id + '/make';
const fresh = () => run("progress.cards = {}; progress.quizzes = []; progress.qa = {}; progress.levels = progress.levels || {}; saveProgress();");

/* ---- D: the data ------------------------------------------------------------------ */
await test('D1 shape: the file has the build\u2019s six keys and the plan\u2019s groups, house and asks', () => {
  eq(Object.keys(data), ['edition', 'groups', 'house', 'asks', 'companies', 'entries']);
  eq(JSON.parse(JSON.stringify(data.groups)), plan.groups);
  eq(JSON.parse(JSON.stringify(data.house)), plan.house);
  eq(JSON.parse(JSON.stringify(data.asks)), plan.asks);
  eq(JSON.parse(JSON.stringify(data.companies)), companies);
  assert.equal(plan.groups[0].id, 'house', 'At the house is the first group');
  assert.ok(entries.length > 0, 'no entries at all');
  const ids = entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'an id twice');
  ids.forEach((id) => assert.ok(byPlan.has(id), id + ' is not a plan id'));
  const order = ids.map((id) => byPlan.get(id).index);
  eq(order, order.slice().sort((a, b) => a - b), 'the entries are not in the plan\u2019s order');
});
for (const e of entries) {
  await test('D1 shape: ' + e.id + ' passes tools/brew/schema.mjs', () => {
    const p = validateFragment(JSON.parse(JSON.stringify(e)), ctx);
    eq(p, []);
  });
}
await test('D2 counts: pinned at freeze, and every drink the owner named is here', () => {
  if (SEED) { notes.push('D2 skipped on a seed build (' + entries.length + ' of ' + plan.entries.length + ' entries): the counts and REQUIRED_IDS hold on the full build'); return; }
  const missing = Object.keys(FROZEN).filter((k) => FROZEN[k] === null);
  eq(missing, [], 'TODO(freeze): pin FROZEN.' + missing.join(', FROZEN.') + ' from tools/brew/build-log.json');
  assert.equal(entries.length, FROZEN.entries, 'entries');
  assert.equal(entries.length, plan.entries.length, 'entries against the plan');
  assert.equal(entries.reduce((n, e) => n + e.recall.length, 0), FROZEN.recall, 'recall cards');
  assert.equal(entries.reduce((n, e) => n + e.quiz.length, 0), FROZEN.questions, 'quiz questions');
  assert.equal(entries.filter((e) => e.video).length, FROZEN.videos, 'videos');
  const ids = new Set(entries.map((e) => e.id));
  eq(REQUIRED_IDS.filter((id) => !ids.has(id)), [], 'REQUIRED_IDS');
});
await test('D2 counts: REQUIRED_IDS are plan ids', () => {
  eq(REQUIRED_IDS.filter((id) => !byPlan.has(id)), []);
});
await test('D3 word caps: every field in its range and every entry at most 600 reading words', () => {
  const bad = [];
  for (const e of entries) {
    const n = proseWords(e);
    if (n > ENTRY_MAX) bad.push(e.id + ' ' + n + ' words');
    for (const [k, [lo, hi]] of Object.entries(LIMITS)) { const w = words(e[k]); if (w < lo || w > hi) bad.push(e.id + '.' + k + ' ' + w); }
    e.make.steps.forEach((s, i) => { if (words(s) > 30) bad.push(e.id + '.make.steps[' + i + ']'); });
    ['ratio', 'dose', 'temp', 'time', 'cup'].forEach((k) => { if (words(e.make[k]) > 14) bad.push(e.id + '.make.' + k); });
    e.watch.forEach((s, i) => { if (words(s) > 30) bad.push(e.id + '.watch[' + i + ']'); });
    e.recall.forEach((r) => { const w = words(r.answer); if (w < 15 || w > 70 || words(r.prompt) > 25) bad.push(e.id + '.recall'); });
    e.quiz.forEach((q, i) => { if (words(q.q) > 30 || words(q.explain) > 45 || q.options.some((o) => words(o) > 12)) bad.push(e.id + '.quiz[' + i + ']'); });
  }
  eq(bad, []);
});
/* the shipped bytes and the decoded strings */
const SHIPPED = { 'js/data-brew.js': readFileSync(join(JS_DIR, 'data-brew.js'), 'utf8'), 'js/ui-brew.js': readFileSync(join(JS_DIR, 'ui-brew.js'), 'utf8'),
  'css/brew.css': readFileSync(join(ROOT, 'css', 'brew.css'), 'utf8') };
const DASH_ESCAPES = /\\u201[2-5]/i;
/* in code a double hyphen is CSS's custom property; the dash it stands for is the spaced one */
const CODE_DASH = /[\u2012-\u2015]|&[mn]dash;|&#821[12];|&#x201[34];| \x2d\x2d /i;
await test('D4 language: the three shipped files are pure ASCII, with no dash in any form and nothing escaped at or above U+2190', () => {
  for (const [f, src] of Object.entries(SHIPPED)) {
    const lit = [...src].find((c) => c.codePointAt(0) > 0x7e || (c.codePointAt(0) < 0x20 && c !== '\n' && c !== '\r' && c !== '\t'));
    assert.equal(lit, undefined, f + ' carries a literal U+' + (lit ? lit.codePointAt(0).toString(16).toUpperCase() : ''));
    assert.ok(!CODE_DASH.test(src), f + ' carries a dash (' + (src.match(CODE_DASH) || [])[0] + ')');
    assert.ok(!DASH_ESCAPES.test(src), f + ' escapes a dash (' + (src.match(DASH_ESCAPES) || [])[0] + ')');
    const high = [...src.matchAll(/\\u([0-9a-fA-F]{4})/g)].map((m) => parseInt(m[1], 16)).filter((cp) => cp >= 0x2190);
    eq(high, [], f + ' escapes a mark at or above U+2190');
  }
});
await test('D4 language: no string the page shows carries a dash, a glyph, an American spelling or the house\u2019s name', () => {
  const bad = [];
  const all = strings({ groups: data.groups, entries }, '');
  for (const [path, s] of all) {
    if (/\.url$/.test(path)) continue;
    if (/\.video\.title$/.test(path)) continue;
    if (DASH.test(s)) bad.push(path + ': a dash');
    if ([...s].some((c) => c.codePointAt(0) >= 0x2190)) bad.push(path + ': a mark at or above U+2190');
    if (/[\u00b0\u00bc-\u00be]/.test(s)) bad.push(path + ': a degree sign or a fraction');
    if (HOUSE_NAME.test(s)) bad.push(path + ': names the house');
    if (!/\.sources\[\d+\]\.title$|\.video\.channel$/.test(path)) { const am = s.match(AMERICAN); if (am) bad.push(path + ': American "' + am[0] + '"'); }
  }
  eq(bad, []);
});
await test('D4 language: the page\u2019s own words are British, and no file of the page or the house\u2019s page writes the house\u2019s name', () => {
  const lits = [...SHIPPED['js/ui-brew.js'].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  const am = lits.map((s) => (s.match(AMERICAN) || [])[0]).filter(Boolean);
  eq(am, [], 'ui-brew.js');
  for (const f of ['js/ui-brew.js', 'js/data-brew.js', 'css/brew.css']) assert.ok(!HOUSE_NAME.test(SHIPPED[f]), f + ' names the house');
  /* house-study.js keeps one folded channel name in lower case (brennans) to recognise a video; the house's name as a word is Brennan */
  assert.ok(!/Brennan/.test(readFileSync(join(JS_DIR, 'house-study.js'), 'utf8')), 'house-study.js names the house');
});
await test('D4 language: css/brew.css uses the Ledger\u2019s tokens, no new colour, font or picture, and 44px controls', () => {
  const css = SHIPPED['css/brew.css'];
  const others = ['ledger.css', 'house.css', 'service-day.css', 'bar-compass.css', 'fall-menu.css', 'house-menu.css', 'method-studies.css']
    .map((f) => { try { return readFileSync(join(ROOT, 'css', f), 'utf8'); } catch (e) { return ''; } }).join('\n');
  for (const v of new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]))) assert.ok(new RegExp('--' + v + '\\s*:').test(others), 'the token --' + v + ' is defined nowhere in the Ledger');
  for (const c of new Set(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [])) assert.ok(others.includes(c), 'a new colour ' + c);
  assert.ok(!/url\(|@font-face|@import|<svg|data:image/i.test(css), 'a picture or a font');
  for (const m of css.matchAll(/font(?:-family)?\s*:\s*([^;}]*)/g)) {
    const fam = m[1].trim();
    if (/^(?:inherit|\d{3}|[\d.]+(?:rem|em|px))/.test(fam) && !/,/.test(fam) && !/var\(/.test(fam)) continue;
    assert.ok(/var\(--house-display,Georgia,serif\)$|^inherit$/.test(fam.replace(/\s+/g, '')) || /^\d{3}\s/.test(fam) && /var\(--house-display,Georgia,serif\)/.test(fam.replace(/\s+/g, '')), 'a font of its own: ' + fam);
  }
  for (const sel of ['.brew-practice .btn', '.brew-chips .chip', '.brew-menu-tabs .tab-btn', '.brew-recall summary', '.brew-row']) assert.ok(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{[^}]*min-height:4[4-9]px').test(css), sel + ' has no 44px floor');
});
await test('D5 nobody named: no person from people.json, no person-shaped title, no capitalised run the lists do not allow', () => {
  const bad = [];

  for (const [path, s] of strings({ groups: data.groups, entries }, '')) {
    if (/\.url$/.test(path)) continue;
    peopleIn(s, people).forEach((n) => bad.push(path + ': ' + n));
  }
  for (const e of entries) {
    for (const [i, s] of e.sources.entries()) if (personShaped(s.title)) bad.push(e.id + '.sources[' + i + '].title is person-shaped: ' + s.title);
    const v = e.video;
    if (v && v.channelKind === 'company' && (personShaped(v.title) || personShaped(v.channel))) bad.push(e.id + '.video is person-shaped: ' + v.title + ' / ' + v.channel);
    if (v && v.channelKind === 'person' && (v.title || v.channel)) bad.push(e.id + '.video: a person\u2019s channel ships a title or a channel');
    /* the capitalised runs, against proper-nouns.json and the app's own names (the house's name in a copied ask is the page's token) */
    const named = JSON.parse(JSON.stringify(e));
    if (named.house && typeof named.house.ask === 'string') named.house.ask = houseNeutral(named.house.ask);
    nameProblems(named, ctx).forEach((p) => bad.push(e.id + '.' + p));
  }
  eq(bad, []);
});
await test('D6 videos: each a watch link with its own 11 character id, from a listed company or shipped without a person\u2019s name, verified, dated, used at most twice', () => {
  const films = g('COFFEE_FILMS') || [];
  const packVideos = HOUSE_HERE ? (readJSON(HOUSE_PACK).house.videos || []) : null;
  const seen = {};
  const bad = [];
  for (const e of entries) {
    const v = e.video;
    if (!String(e.search || '').trim() || e.search !== byPlan.get(e.id).search) bad.push(e.id + ': no search phrase, or not the plan\u2019s');
    if (!v) continue;
    const m = String(v.url).match(WATCH_URL);
    if (!m || m[1] !== v.id) bad.push(e.id + ': the url is not https://www.youtube.com/watch?v= with the entry\u2019s id');
    if (!/^[A-Za-z0-9_-]{11}$/.test(v.id)) bad.push(e.id + ': the id is not 11 characters');
    if (VERIFIED_BY.indexOf(v.verifiedBy) < 0) bad.push(e.id + ': verifiedBy ' + v.verifiedBy);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.checkedOn) || v.checkedOn < CHECKED_FROM || v.checkedOn > CHECKED_TO) bad.push(e.id + ': checkedOn ' + v.checkedOn);
    if (v.channelKind === 'company' && companies.indexOf(v.channel) < 0) bad.push(e.id + ': the company ' + v.channel + ' is not on companies.json');
    if (v.channelKind !== 'company' && v.channelKind !== 'person') bad.push(e.id + ': channelKind ' + v.channelKind);
    if (v.verifiedBy === 'coffee-films') {
      const film = films.find((f) => f.sec + '/' + f.row === byPlan.get(e.id).film);
      if (!film || film.id !== v.id) bad.push(e.id + ': not the Library film the plan names');
      else if (v.channelKind === 'company' && (v.title !== '' || film.channel !== v.channel)) bad.push(e.id + ': the shipped video carries no title, and the Library film\u2019s channel exactly');
    }
    if (v.verifiedBy === 'pack' && packVideos && !packVideos.some((x) => String(x.url || '').indexOf(v.id) >= 0)) bad.push(e.id + ': the pack carries no video ' + v.id);
    if (v.verifiedBy === 'websearch') {
      const ev = ctx.videoEvidence(e.id);
      if (!ev) bad.push(e.id + ': no tools/brew/videos/' + e.id + '.json');
      else {
        if (!Array.isArray(ev.queries) || new Set(ev.queries.map((q) => q && q.q)).size < 2) bad.push(e.id + ': the evidence has not two different queries');
        if (ev.videoId !== v.id) bad.push(e.id + ': the evidence names ' + ev.videoId);
        if (ev.checkedBy !== 'checker') bad.push(e.id + ': no checker\u2019s sign-off');
      }
    }
    (seen[v.id] = seen[v.id] || []).push(e.id);
  }
  for (const [id, on] of Object.entries(seen)) if (on.length > 2) bad.push('the video ' + id + ' is on ' + on.length + ' entries: ' + on.join(', '));
  if (!packVideos) notes.push('D6 the pack videos not checked: no pack beside this checkout');
  eq(bad, []);
});
await test('D7 links: every Library card, lesson, cocktail, zero-proof drink and method study an entry names resolves, and draws as a link', () => {
  const refs = g('COFFEE_REF'), study = g('COFFEE_STUDY'), cocktails = g('COCKTAILS'), na = g('NA_DRINKS');
  const bad = [];
  for (const e of entries) {
    const lib = e.library;
    const ref = lib.ref ? refs.find((r) => r.name === lib.ref) : null;
    if (lib.ref && !ref) bad.push(e.id + ': no Library card ' + lib.ref);
    let lessons = 0;
    for (const [sec, row] of lib.study) {
      const s = study.find((x) => x.key === sec);
      if (!s || !s.rows.some((r) => r[0] === row)) bad.push(e.id + ': no lesson ' + sec + '/' + row); else lessons++;
    }
    if (lib.cocktail && !cocktails.some((c) => c.name === lib.cocktail)) bad.push(e.id + ': no cocktail ' + lib.cocktail);
    if (lib.na && !na.some((c) => c.name === lib.na)) bad.push(e.id + ': no zero-proof drink ' + lib.na);
    if (lib.method && !g('methodStudy')(lib.method)) bad.push(e.id + ': no method study ' + lib.method);
    const out = g('brewLibraryHTML')(e);
    if (count(out, /data-act="brew-lib"/g) !== (ref ? 1 : 0) + lessons) bad.push(e.id + ': ' + count(out, /data-act="brew-lib"/g) + ' Library buttons drawn');
    if (lib.cocktail && !out.includes('href="#/library/' + g('slugify')(lib.cocktail) + '"')) bad.push(e.id + ': the cocktail link is not drawn');
    if (lib.na && !out.includes('href="#/na/' + g('slugify')(lib.na) + '"')) bad.push(e.id + ': the zero-proof link is not drawn');
  }
  eq(bad, []);
});
await test('D7 links: every Library card but the faults is linked from an entry', () => {
  const refs = g('COFFEE_REF').filter((r) => r.dom !== 'faults').map((r) => r.name);
  const planRefs = new Set(plan.entries.map((e) => e.library.ref));
  eq(refs.filter((r) => !planRefs.has(r)), [], 'the plan leaves a card unlinked');
  if (SEED) { notes.push('D7 every-card coverage held on the plan only (a seed build carries ' + entries.length + ' entries)'); return; }
  const linked = new Set(entries.map((e) => e.library.ref));
  eq(refs.filter((r) => !linked.has(r)), []);
});
await test('D7 links: the cocktail and zero-proof links land on their screens; a lesson link opens its lesson', () => {
  for (const e of entries) {
    const lib = e.library;
    if (lib.cocktail) { assert.ok(g('applyRoute')('#/library/' + g('slugify')(lib.cocktail))); assert.equal(g('routeNow')().hash, '#/library/' + g('slugify')(lib.cocktail)); }
    if (lib.na) { assert.ok(g('applyRoute')('#/na/' + g('slugify')(lib.na))); assert.equal(g('routeNow')().hash, '#/na/' + g('slugify')(lib.na)); }
    for (const [sec, row] of lib.study) {
      const s = g('COFFEE_STUDY').find((x) => x.key === sec);
      const i = s.rows.findIndex((r) => r[0] === row);
      assert.equal(g('brewAct')('brew-lib', { sec, row: String(i) }), 'render');
      assert.equal(run('state.tab'), 'coffee');
      const out = g('renderCoffee')();
      assert.ok(out.includes('aria-expanded="true" data-act="cof-row" data-i="' + i + '"'), e.id + ': the lesson ' + row + ' is not drawn open');
    }
    if (lib.ref) {
      const ref = g('COFFEE_REF').find((r) => r.name === lib.ref);
      assert.equal(g('brewAct')('brew-lib', { sec: ref.dom, ref: ref.name }), 'render');
      assert.ok(g('renderCoffee')().includes('aria-expanded="true" data-act="cof-ref" data-n="' + esc(ref.name) + '"'), e.id + ': the card ' + ref.name + ' is not drawn open');
    }
  }
  assert.equal(g('brewAct')('brew-lib', { sec: 'no-such-shelf', row: '0' }), 'done', 'an unknown shelf is refused');
});
await test('D7 links: the house ids are house ids, and the World Table recipes exist', () => {
  for (const id of data.house.ids) assert.match(id, /^b-[a-z0-9]{8}$/);
  if (!WT) { notes.push('D7 the World Table recipes not checked: no checkout beside this one (WORLDTABLE_SRC=<dir> names one)'); return; }
  const slugs = new Set(readJSON(join(WT, RECIPES_REL)).map((r) => r.slug));
  const planSlugs = plan.entries.map((e) => e.table.recipe).filter(Boolean);
  eq(planSlugs.filter((s) => !slugs.has(s)), [], 'the plan names a recipe the World Table lacks');
  for (const e of entries) if (e.table.recipe) assert.ok(slugs.has(e.table.recipe), e.id + ': no recipe ' + e.table.recipe);
});
await test('D8 the quiz: one key, four different options, the key never in the stem, no length clue', () => {
  const bad = [];
  let n = 0, longest = 0, shortest = 0;
  for (const e of entries) e.quiz.forEach((q, i) => {
    const at = e.id + '.quiz[' + i + ']';
    n++;
    if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { bad.push(at + ': the key'); return; }
    if (q.options.length !== 4 || new Set(q.options.map(fold)).size !== 4) bad.push(at + ': four different options');
    const key = q.options[q.a], fk = fold(key);
    if (fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) bad.push(at + ': the stem carries the key');
    const others = q.options.filter((o, j) => j !== q.a).map((o) => o.length);
    if (key.length > Math.max(...others) * 1.6 && key.length - Math.max(...others) >= 15) bad.push(at + ': the key is much the longest');
    if (key.length > Math.max(...others)) longest++;
    if (key.length < Math.min(...others)) shortest++;
  });
  if (n && longest / n > 0.4) bad.push('the key is the longest option in ' + longest + ' of ' + n + ' questions');
  if (n && shortest / n > 0.4) bad.push('the key is the shortest option in ' + shortest + ' of ' + n + ' questions');
  eq(bad, []);
});
await test('D8 the quiz: brewQuizRound dealt 2,000 times deals ten entries (or every one), round robin, answers spread, every ckey a card, no qkey', () => {
  const want = Math.min(10, entries.filter((e) => e.quiz.length).length);
  const groups = new Set(entries.map((e) => e.group));
  const pos = [0, 0, 0, 0];
  let total = 0;
  for (let r = 0; r < 2000; r++) {
    const round = g('brewQuizRound')();
    assert.equal(round.length, want, 'round ' + r + ' dealt ' + round.length);
    assert.equal(new Set(round.map((q) => q.brewId)).size, round.length, 'an entry twice in one round');
    const per = {};
    round.forEach((q) => { const grp = g('brewEntry')(q.brewId).group; per[grp] = (per[grp] || 0) + 1; });
    assert.ok(Math.max(...Object.values(per)) <= Math.ceil(round.length / Math.min(groups.size, round.length)) + (groups.size < round.length ? 1 : 0), 'not round robin: ' + JSON.stringify(per));
    for (const q of round) {
      assert.ok(!('qkey' in q) || q.qkey === undefined, 'a qkey');
      assert.equal(q.ckey, KEY(q.brewId));
      assert.ok(g('cardByKey')(q.ckey), 'the ckey ' + q.ckey + ' is no card');
      assert.equal(q.options.length, 4);
      const i = q.options.indexOf(q.answer);
      assert.ok(i >= 0, 'the answer is not an option');
      pos[i]++; total++;
    }
  }
  const share = pos.map((p) => p / total);
  assert.ok(share.every((s) => s >= 0.17 && s <= 0.33), 'answer positions ' + share.map((s) => (s * 100).toFixed(1) + '%').join(' '));
});
await test('D9 the build: js/data-brew.js is what tools/brew/build-brew.mjs writes', () => {
  const args = [join(BREW, 'build-brew.mjs'), '--check'].concat(SEED_BUILD ? ['--seed'] : []);
  const env = Object.assign({}, process.env);
  if (HOUSE_HERE) env.OOT_SHARED = SHARED;
  const r = spawnSync(process.execPath, args, { cwd: LEDGER, env, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout + r.stderr).trim().split('\n').slice(-6).join(' '));
  if (resolve(JS_DIR) !== resolve(join(LEDGER, 'js'))) assert.equal(SHIPPED['js/data-brew.js'], readFileSync(join(LEDGER, 'js', 'data-brew.js'), 'utf8'), 'this copy\u2019s js/data-brew.js is not the source\u2019s, byte for byte');
});

/* ---- W: the wiring ------------------------------------------------------------------ */
const cards = g('brewCards')();
await test('W1 keys: one card per entry, keyed "Brew Guide \u00b7 <id>/make", unique, read back by cardByKey, studied at the entry', () => {
  assert.equal(cards.length, entries.reduce((n, e) => n + e.recall.length, 0));
  const keys = cards.map(g('cardKey'));
  assert.equal(new Set(keys).size, keys.length);
  for (const c of cards) {
    assert.equal(c.src, 'Brew Guide');
    assert.equal(g('cardKey')(c), KEY(c.itemId));
    assert.equal(g('cardByKey')(KEY(c.itemId)).brewKey, c.brewKey);
    assert.equal(g('studyHashOf')(KEY(c.itemId)), '#/menu/brew/' + c.itemId);
    eq(c.spec, []);
  }
  assert.equal(g('cardByKey')(KEY('no-such-entry')), null);
});
await test('W1 keys: tools/brew/keys.v1.json, frozen, loses none', () => {
  /* tools/brew/keys.v1.json, written at freeze from the full build; see FROZEN above */
  const keys = new Set(cards.map(g('cardKey')));
  if (!existsSync(KEYS_FILE)) {
    if (SEED) { notes.push('W1 tools/brew/keys.v1.json is not written yet (TODO(freeze)); a seed build does not need it'); return; }
    assert.fail('TODO(freeze): write tools/brew/keys.v1.json with every key of the full build');
  }
  const frozen = readJSON(KEYS_FILE);
  const list = Array.isArray(frozen) ? frozen : frozen.keys;
  assert.ok(Array.isArray(list) && list.length, 'keys.v1.json holds no keys');
  list.forEach((k) => assert.match(k, /^Brew Guide \u00b7 [a-z0-9-]+\/make$/));
  if (SEED) { notes.push('W1 none-removed not held on a seed build'); return; }
  eq(list.filter((k) => !keys.has(k)), [], 'a frozen key is gone');
});
await test('W2 kept apart: out of allDrinks, the academic modes, Due today and the levels', () => {
  assert.ok(!g('allDrinks')().some((d) => d.src === 'Brew Guide'));
  const modes = g('FC_MODES');
  const at = modes.findIndex((m) => m[0] === 'brew');
  assert.ok(at > 0 && modes[at - 1][0] === 'fall', 'the brew mode is not right after fall');
  for (const m of modes) if (m[0] !== 'brew') assert.ok(cards.every((c) => !m[3](c)), 'the mode ' + m[0] + ' fits a Brew Guide card');
  assert.ok(cards.every((c) => modes[at][3](c)));
  fresh();
  const now = Date.now();
  cards.forEach((c) => { g('progress').cards[g('cardKey')(c)] = { r: 0, w: 1, reps: 0, last: now - 2 * 86400000, due: now - 86400000 }; });
  assert.ok(g('dueToday')().deck.every((d) => d.src !== 'Brew Guide'), 'Due today deals a Brew Guide card');
  const parts = g('sessionDeckParts')();
  assert.ok(parts.dueDeck.concat(parts.newDeck).every((d) => d.src !== 'Brew Guide'), 'the session deals a Brew Guide card');
  const items = JSON.stringify(g('LEVEL_ITEMS'));
  assert.ok(!/Brew Guide/.test(items), 'a level holds a Brew Guide item');
  const def = g('deckDef')('brew');
  assert.equal(def.preset.level, undefined);
  eq(Array.from(def.preset.deckModes), ['brew']);
  assert.equal(def.preset.only.length, cards.length);
  fresh();
});
await test('W2 kept apart: the decks deal their own scope and nothing else', () => {
  const dd = g('deckDef');
  assert.equal(dd('brew:coffee').preset.only.length, cards.filter((c) => g('brewEntry')(c.itemId).kind === 'coffee').length);
  assert.equal(dd('brew:tea').preset.only.length, cards.filter((c) => g('brewEntry')(c.itemId).kind === 'tea').length);
  for (const grp of data.groups.filter((x) => x.id !== 'house')) assert.equal(dd('brew:group:' + grp.id).preset.only.length, cards.filter((c) => g('brewEntry')(c.itemId).group === grp.id).length, grp.id);
  assert.equal(dd('brew:group:house'), null);
  assert.equal(dd('brew:group:nope'), null);
  assert.equal(dd('brew:nope'), null);
});
await test('W2 kept apart: grading a card writes its key and leaves level progress, qa, levels and the menu unchanged', () => {
  fresh();
  run("progress.qa = { 'fixture-q': { r: 2, w: 1 } }; progress.levels = { '1': { fixture: true } };");
  const lp = () => JSON.stringify([1, 2, 3, 4].map((n) => g('levelProgress')(n)));
  const before = { lp: lp(), qa: JSON.stringify(g('progress').qa), levels: JSON.stringify(g('progress').levels), bar: JSON.stringify(g('progress').bar), first: g('firstUnmetLevel')() };
  assert.ok(g('openDeck')('brew'));
  assert.ok(g('startDeckRun')('brew'));
  const c = run('state.fc.deck[0]');
  run('state.fc.flipped = true');
  g('recordCard')(true);
  eq(Object.keys(g('progress').cards), [g('cardKey')(c)]);
  assert.equal(lp(), before.lp, 'level progress moved');
  assert.equal(JSON.stringify(g('progress').qa), before.qa, 'qa moved');
  assert.equal(JSON.stringify(g('progress').levels), before.levels, 'levels moved');
  assert.equal(JSON.stringify(g('progress').bar), before.bar, 'the menu moved');
  assert.equal(g('firstUnmetLevel')(), before.first);
  fresh();
});
await test('W3 addresses: every entry round-trips, its parent is the index, the index\u2019s is the menu; bad ids land on the index', () => {
  for (const e of entries) {
    assert.ok(g('applyRoute')('#/menu/brew/' + e.id));
    assert.equal(g('routeNow')().hash, '#/menu/brew/' + e.id);
    assert.equal(g('brewHref')(e.id), '#/menu/brew/' + e.id);
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu/brew');
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu/view/studies');
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu');
  }
  for (const bad of ['#/menu/brew/no-such-entry', '#/menu/brew/%E0%A4%A', '#/menu/brew/', '#/menu/view/brew']) {
    assert.ok(g('applyRoute')(bad), bad + ' is not read');
    assert.equal(g('routeNow')().hash, '#/menu/brew', bad);
  }
  assert.ok(g('applyRoute')('#/menu'));
  assert.equal(g('routeNow')().hash, '#/menu');
  assert.equal(run('state.menu.view'), 'menu', 'leaving by #/menu leaves the brew view');
});
await test('W3 Back: the menu, the page, an entry by its row, then Back three times to the menu and Home; a cold entry walks up by replaces', async () => {
  const B = boot({ hash: '#/menu' });
  await settle();
  assert.equal(B.state().key, 'menu');
  assert.ok(B.tap({ 'data-act': 'menu-view', 'data-v': 'studies' }), 'the menu has no Bar studies');
  await settle();
  const s0 = B.state();
  assert.equal(s0.key, 'menu/view/studies');
  assert.ok(B.tap({ 'data-act': 'menu-view', 'data-v': 'brew' }), 'the sub-nav has no Coffee and tea');
  await settle();
  const s1 = B.state();
  eq([s1.key, s1.hash, s1.at], ['menu/brew', '#/menu/brew', s0.at + 1]);
  const id = entries[0].id;
  assert.ok(B.tap({ class: 'brew-row', href: '#/menu/brew/' + id }), 'the index draws no row for ' + id);
  await settle();
  const s2 = B.state();
  eq([s2.key, s2.at], ['menu/brew/' + id, s1.at + 1]);
  assert.equal(count(B.view(), /data-act="back"/g), 1, 'one Back on the entry');
  const walk = [];
  for (let i = 0; i < 4; i++) { B.tap({ 'data-act': 'back' }); await settle(); walk.push(B.state().key); }
  eq(walk, ['menu/brew', 'menu/view/studies', 'menu', 'home']);
  const C = boot({ hash: '#/menu/brew/' + id });
  await settle();
  eq([C.state().key, C.state().d], ['menu/brew/' + id, 0]);
  const up = [];
  for (let i = 0; i < 4; i++) { C.tap({ 'data-act': 'back' }); await settle(); up.push(C.state().key); }
  eq(up, ['menu/brew', 'menu/view/studies', 'menu', 'home']);
  assert.equal(C.history.length, 1, 'walking up a cold entry grew the history');
  const N = boot({ hash: '#/menu/brew/no-such-entry' });
  await settle();
  eq([N.state().key, N.state().hash, N.history.length], ['menu/brew', '#/menu/brew', 1]);
  const V = boot({ hash: '#/menu/view/brew' });
  await settle();
  assert.equal(V.state().key, 'menu/brew');
});
const HEADINGS = ['brew-d-house', 'brew-d-what', 'brew-d-taste', 'brew-d-make', 'brew-d-serve', 'brew-d-guest', 'brew-d-watchfor', 'brew-d-story', 'brew-d-watch', 'brew-d-lib', 'brew-d-table', 'brew-d-recall'];
const PICTURE = /<(?:img|iframe|video|picture|source|svg|object|embed)\b|url\(|ytimg|youtube\.com\/embed|youtube-nocookie/i;
await test('W4 rendering: every entry draws in the plan\u2019s order, one boundary line, one video link at most, the search link, no frame or picture, nobody named, nothing written', () => {
  fresh();
  const before = JSON.stringify(g('progress'));
  const pages = [];
  run("state.tab = 'menu'; state.menu.view = 'brew';");
  g('brewOpen')('');
  pages.push(['the index', g('renderMenu')()]);
  for (const e of entries) {
    g('brewOpen')(e.id);
    const out = g('renderMenu')();
    pages.push([e.id, out]);
    assert.ok(out.includes('<h2 tabindex="-1">' + esc(e.name) + '</h2>'), e.id + ': its name is not the heading');
    const at = HEADINGS.map((h) => out.indexOf('id="' + h + '"')).filter((i) => i >= 0);
    eq(at, at.slice().sort((a, b) => a - b), e.id + ': the sections are out of order');
    ['brew-d-house', 'brew-d-what', 'brew-d-taste', 'brew-d-make', 'brew-d-serve', 'brew-d-guest', 'brew-d-watchfor', 'brew-d-story', 'brew-d-watch', 'brew-d-recall'].forEach((h) => assert.ok(out.includes('id="' + h + '"'), e.id + ': no ' + h));
    assert.equal(count(out, /A general method, not the house build\./g), 1, e.id + ': the boundary line, once in How to make it');
    assert.equal(count(out, /<ol class="brew-steps">/g), 1);
    assert.equal(count(out, /<li>/g) >= e.make.steps.length, true);
    assert.equal(count(out, /class="btn btn-ghost brew-video"/g), e.video ? 1 : 0, e.id + ': the video links');
    const search = g('ytSearch')(e.search + g('scopeSuffix')());
    assert.ok(out.includes('href="' + esc(search) + '"') && count(out, /Search for another video/g) === 1, e.id + ': the search link');
    assert.ok(/<details class="brew-recall"><summary>/.test(out) && !/<details class="brew-recall" open/.test(out), e.id + ': Recall before you reveal is not drawn closed');
    if (e.sources.length) assert.ok(/<details class="brew-sources"><summary>Sources<\/summary>/.test(out), e.id + ': Sources not drawn closed');
    for (const m of out.matchAll(/<a\b[^>]*href="https:[^"]*"[^>]*>/g)) assert.ok(/target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0]), e.id + ': an external link without a new tab and noopener');
  }
  for (const [name, out] of pages) {
    assert.ok(!PICTURE.test(out), name + ': a frame or a picture (' + (out.match(PICTURE) || [])[0] + ')');
    eq(peopleIn(strip(out), people), [], name + ': names a person');
    assert.ok(!HOUSE_NAME.test(strip(out)), name + ': names the house with no house loaded');
  }
  assert.equal(JSON.stringify(g('progress')), before, 'rendering wrote progress');
});
await test('W4 rendering: a pinned video is one external link under our label, a person\u2019s channel unnamed, a listed company named, no frame or thumbnail', () => {
  const base = JSON.parse(JSON.stringify(entries[0]));
  const v = { url: 'https://www.youtube.com/watch?v=abcdefghijk', id: 'abcdefghijk', title: '', channel: '', channelKind: 'person',
    label: 'A fixture label', watchFor: 'A fixture line.', verifiedBy: 'websearch', checkedOn: '2026-10-18' };
  const person = g('brewVideoHTML')(Object.assign({}, base, { video: v }));
  assert.equal(count(person, /<a\b/g), 2, 'the video and the search link');
  assert.ok(person.includes('href="https://www.youtube.com/watch?v=abcdefghijk" target="_blank" rel="noopener noreferrer">A fixture label'));
  assert.ok(!/From /.test(person) && !PICTURE.test(person));
  run("BREW_GUIDE.companies.push('Fixture Roasters')");
  const company = g('brewVideoHTML')(Object.assign({}, base, { video: Object.assign({}, v, { channelKind: 'company', channel: 'Fixture Roasters', title: 'A fixture title' }) }));
  const unlisted = g('brewVideoHTML')(Object.assign({}, base, { video: Object.assign({}, v, { channelKind: 'company', channel: 'Unlisted Roasters', title: 'A fixture title' }) }));
  run('BREW_GUIDE.companies.pop()');
  assert.ok(company.includes('From Fixture Roasters'), 'a listed company is not named');
  assert.ok(!unlisted.includes('Unlisted Roasters'), 'an unlisted channel is named');
  assert.ok(!company.includes('A fixture title') && !PICTURE.test(company), 'the title or a picture is drawn');
  const js = g('brewVideoHTML')(Object.assign({}, base, { video: Object.assign({}, v, { url: 'javascript:alert(1)' }) }));
  assert.ok(!/javascript:/.test(js) && count(js, /brew-video"/g) === 0, 'an unsafe url is drawn');
});
await test('W5 recall: a blind front, a forged early grade refused, the answer after Flip, our key only, misses in mode brew, a readable deck done', async () => {
  const B = boot({ hash: '#/menu/brew' });
  await settle();
  B.run('progress.cards = {}; saveProgress();');
  B.run("progress.cards['My Bar \u00b7 Existing'] = { r: 17, w: 2, last: 1 };");
  assert.ok(B.tap({ 'data-act': 'brew-practise', 'data-deck': 'brew' }), 'Practise the cards is not drawn');
  await settle();
  assert.equal(B.run('state.fc.stage + " " + state.fc.mode'), 'run brew');
  const n = B.run('state.fc.deck.length');
  assert.equal(n, cards.length);
  const c = B.run('state.fc.deck[0]'), key = B.g('cardKey')(c);
  let v = B.view();
  assert.ok(v.includes('<div class="brew-question">' + esc(c.name) + '</div>'), 'the prompt is not the front');
  assert.ok(!v.includes(esc(c.back)) && !strip(v).includes(c.back), 'the front shows the answer');
  assert.ok(!/data-act="fc-grade"/.test(v) && !PICTURE.test(v), 'the front offers a grade or a picture');
  B.forge({ 'data-act': 'fc-grade', 'data-ok': '1' });
  await settle();
  assert.ok(!B.g('progress').cards[key] && B.run('state.fc.idx') === 0, 'a forged grade before Flip was recorded');
  assert.ok(B.tap({ 'data-act': 'fc-flip' }));
  await settle();
  v = B.view();
  assert.ok(v.includes(esc(c.back).split('\n')[0].slice(0, 40)), 'the answer is not drawn after Flip');
  assert.ok(v.includes('A general method, not the house build.') && v.includes('href="#/menu/brew/' + c.itemId + '"'), 'the boundary or the entry link');
  const before = JSON.stringify(Object.assign({}, B.g('progress'), { cards: null }));
  assert.ok(B.tap({ 'data-act': 'fc-grade', 'data-ok': '0' }));
  await settle();
  eq(Object.keys(B.g('progress').cards).sort(), ['My Bar \u00b7 Existing', key].sort(), 'grading wrote another key');
  assert.equal(B.g('progress').cards[key].w, 1);
  assert.equal(B.g('progress').cards['My Bar \u00b7 Existing'].r, 17);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { cards: null })), before, 'grading wrote outside progress.cards');
  for (let i = 1; i < n; i++) { B.tap({ 'data-act': 'fc-flip' }); await settle(); B.tap({ 'data-act': 'fc-grade', 'data-ok': '1' }); await settle(); }
  v = B.view();
  assert.ok(/Deck done/.test(v), 'no Deck done');
  assert.ok(!v.includes(esc(key)) && !v.includes('Brew Guide \u00b7'), 'Deck done shows a raw key');
  assert.ok(v.includes(esc(c.group + ': ' + c.name)), 'Deck done does not name the missed card readably');
  assert.ok(B.tap({ 'data-act': 'fc-rerun-miss' }));
  await settle();
  assert.equal(B.run('state.fc.mode'), 'brew');
  eq(B.run('state.fc.deck.map(cardKey)'), [key]);
  assert.ok(B.g('startMisses')([key]));
  assert.equal(B.run('state.fc.mode'), 'brew');
});
await test('W5 recall: an empty Due or missed stops at the deck screen and never starts an empty run', async () => {
  const B = boot({ hash: '#/menu/brew' });
  await settle();
  B.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.equal(B.g('deckDef')('brew:again').preset.only.length, 0);
  assert.ok(B.tap({ 'data-act': 'deck', 'data-deck': 'brew:again' }), 'Due or missed is not drawn');
  await settle();
  assert.equal(B.run('state.fc.stage'), 'setup');
  assert.ok(/No cards in this deck yet/.test(B.view()) && !/data-act="fc-start"/.test(B.view()));
  assert.equal(B.g('brewAct')('brew-practise', { deck: 'brew:again' }), 'render');
  assert.equal(B.run('state.fc.stage'), 'setup');
});
await test('W6 the quiz: through the real click, one Recent rounds row in mode brew, nothing else written, Study this card and Back keep the results', async () => {
  const B = boot({ hash: '#/menu/brew' });
  await settle();
  B.run("progress.cards = {}; progress.quizzes = []; progress.qa = { 'fixture-q': { r: 1, w: 0 } }; progress.levels = {}; saveProgress();");
  const before = JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null }));
  const lp = JSON.stringify([1, 2, 3, 4].map((n) => B.g('levelProgress')(n)));
  assert.ok(B.tap({ 'data-act': 'quiz-go', 'data-m': 'brew' }), 'Take the quiz is not drawn');
  await settle();
  const n = B.run('state.quiz.round.length');
  assert.equal(n, Math.min(10, entries.length));
  assert.equal(B.state().key, 'quiz/brew');
  assert.ok(B.view().includes('Question 1 of ' + n + ' \u00b7 Coffee and tea'), 'the round is not labelled Coffee and tea');
  for (let i = 0; i < n; i++) {
    const right = B.run('(function(){ const q = state.quiz.round[state.quiz.idx]; return q.options.indexOf(q.answer); })()');
    B.tap({ 'data-act': 'quiz-pick', 'data-i': String(i === 0 ? (right + 1) % 4 : right) }); await settle();
    B.tap({ 'data-act': 'quiz-next' }); await settle();
  }
  const q = B.g('progress').quizzes;
  assert.equal(q.length, 1, 'rows written: ' + q.length);
  eq([q[0].mode, q[0].total, q[0].score, q[0].replay], ['brew', n, n - 1, false]);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null })), before, 'the round wrote outside progress.quizzes');
  assert.equal(JSON.stringify([1, 2, 3, 4].map((m) => B.g('levelProgress')(m))), lp, 'level progress moved');
  assert.equal(B.state().hash, '#/quiz/brew/done');
  const done = B.view();
  const study = [...done.matchAll(/data-act="hash" data-h="([^"]+)">Study this card</g)].map((m) => m[1]);
  assert.equal(study.length, 1, 'Study this card for the one miss');
  assert.match(study[0], /^#\/menu\/brew\/[a-z0-9-]+$/);
  const at = B.state().at;
  B.tap({ 'data-act': 'hash', 'data-h': study[0] }); await settle();
  eq([B.state().key, B.state().at], [study[0].slice(2), at + 1]);
  B.tap({ 'data-act': 'back' }); await settle();
  assert.equal(B.state().hash, '#/quiz/brew/done');
  assert.equal(B.run('state.quiz.missedQ.length'), 1, 'Back lost the results');
  assert.equal(B.g('modeLabel')('brew'), 'Coffee and tea');
  B.run("state.tab = 'quiz'; state.quiz.stage = 'setup'; render();"); await settle();
  assert.ok(/Recent rounds/.test(B.view()) && B.view().includes(' \u00b7 Coffee and tea</span><span class="font-tix brass2">' + (n - 1) + '/' + n), 'the Quizzes page shows no Coffee and tea row');
  B.run("progress.quizzes = [{ date: 'd', ts: 1, score: 9, total: 10, mode: 'brew' }, { date: 'd', ts: 2, score: 3, total: 10, mode: 'brew' }];");
  assert.ok(!/last 2 rounds/.test(B.g('dashboardHTML')()), 'the dashboard\u2019s trend counts a Coffee and tea round');
});
await test('W7 doors: the sub-nav after Fall 2026, the Practise rows after The Bar Compass, the search index, every door landing', () => {
  run("state.tab = 'menu'; state.menu.view = 'menu';");
  const menu = g('renderMenu')();
  const tabs = (menu.match(/<nav class="house-sections"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
  const subs = [...tabs.matchAll(/data-act="menu-view" data-v="(\w+)"[^>]*>([^<]*)</g)].map((m) => m[1] + ':' + m[2]);
  eq(subs, ['menu:Menu', 'studies:Bar studies', 'rehearsal:Service rehearsal', 'reference:House reference']);
  run("state.menu.view = 'studies'");
  assert.ok(g('renderMenu')().includes('data-act="menu-view" data-v="brew"'), 'Bar studies does not offer Coffee and tea');
  const pick = g('fcPickHTML')();
  const navs = [...pick.matchAll(/<nav class="quiet rows" aria-label="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(navs[navs.indexOf('The Bar Compass') + 1], 'Coffee and tea', 'the Coffee and tea rows are not right after The Bar Compass: ' + navs.join(' | '));
  const rows = pick.slice(pick.indexOf('aria-label="Coffee and tea"'));
  const block = rows.slice(0, rows.indexOf('</nav>'));
  assert.ok(block.includes('data-act="deck" data-deck="brew"') && block.includes('data-act="deck" data-deck="brew:again"') && block.includes('data-act="quiz-go" data-m="brew"'), 'the rows are not the deck, its misses and the quiz');
  const ix = g('buildSearchIndex')();
  const mine = ix.filter((r) => /^#\/menu\/brew/.test(r.h));
  assert.equal(mine.length, entries.length + 1);
  for (const r of mine) {
    assert.ok(g('applyRoute')(r.h));
    assert.equal(g('routeNow')().hash, r.h);
  }
  assert.equal(g('brewDoorHTML')().indexOf('href="#/menu/brew"') >= 0, true);
  assert.ok(/grab\('brew-q', state\.brew, 'q'\)/.test(String(g('captureLiveInputs'))), 'captureLiveInputs does not keep the search box');
  run("state.tab = 'menu'; state.menu.view = 'menu';");
});

/* ---- H: the house, from the shipped engine and pack ------------------------------- */
if (!HOUSE_HERE) notes.push('H1 to H3 skipped: no House engine and pack beside this checkout (OOT_SHARED=<dir> names one)');
else {
  const packText = readFileSync(HOUSE_PACK, 'utf8');
  const pack = JSON.parse(packText).house;
  const B = boot({ house: true, hash: '#/menu/brew' });
  await settle();
  await wake(B, packText);
  const h = B.g('hsCurrent')();
  const items = [].concat(h.cocktails || [], h.dishes || []);
  const menuOrder = data.house.ids.slice().sort((a, b) => items.findIndex((x) => x.id === a) - items.findIndex((x) => x.id === b));
  await test('H1 the house\u2019s six: read live by id, in the menus\u2019 order, each with its section, price and printed list', () => {
    const rows = B.g('brewHouseRows')();
    assert.equal(rows.length, 6);
    eq(rows.map((r) => r.id), menuOrder, 'not the menus\u2019 order');
    B.run("state.tab = 'menu'; state.menu.view = 'brew'; brewState().item = ''; brewState().q = ''; brewState().group = 'all'; render();");
    const v = B.view();
    const drawn = [...v.matchAll(/class="brew-house-row" data-house-id="([^"]+)"/g)].map((m) => m[1]);
    eq(drawn, menuOrder, 'At the house draws ' + drawn.join(', '));
    assert.ok(v.indexOf('id="brew-g-house"') < v.indexOf('class="brew-group-h" id="brew-g-' + (entries[0] || {}).group + '"'), 'At the house is not first');
    for (const id of menuOrder) {
      const it = items.find((x) => x.id === id);
      const row = v.slice(v.indexOf('data-house-id="' + id + '"'));
      const one = row.slice(0, row.indexOf('</article>'));
      assert.ok(one.includes('<div class="eyebrow">' + esc(it.section) + '</div>'), id + ': the section');
      assert.ok(one.includes(esc(it.name)) && one.includes('<span class="brew-price">' + esc(it.price) + '</span>'), id + ': the name and the price');
      assert.ok(one.includes(esc(B.g('brewPrinted')(it).join(', '))), id + ': the printed list');
      assert.ok(one.includes('data-act="brew-house" data-id="' + id + '">Open the house card'), id + ': Open the house card');
    }
    const tea = pack.askAtLineup.find((a) => a.id === data.house.teaAsk);
    assert.ok(v.includes('No tea is printed on the menus; ask at lineup.') && v.includes(esc(tea.question)), 'the tea note does not read the live question');
  });
  await test('H2 asks and components resolve: every ask the page names is in the pack, every house id a record, every component of the six there', () => {
    const asks = new Set(pack.askAtLineup.map((a) => a.id));
    const ids = new Set(items.map((x) => x.id));
    const comps = new Set((pack.components || []).map((c) => c.id));
    const bad = [];
    for (const id of Object.values(data.asks).concat([data.house.teaAsk])) if (!asks.has(id)) bad.push('the ask ' + id);
    for (const id of data.house.ids) if (!ids.has(id)) bad.push('the house id ' + id);
    for (const e of plan.entries) {
      if (e.house.askId && !asks.has(e.house.askId)) bad.push(e.id + ': the ask ' + e.house.askId);
      for (const id of (e.house.packIds || []).concat(e.house.uses || [])) if (!ids.has(id)) bad.push(e.id + ': the record ' + id);
    }
    for (const id of data.house.ids) {
      const named = JSON.stringify(items.find((x) => x.id === id) || {}).match(/\bc-[a-z0-9]{8}\b/g) || [];
      named.filter((c) => !comps.has(c)).forEach((c) => bad.push(id + ': the component ' + c));
    }
    eq(bad, []);
    for (const e of entries) {
      if (e.house.printed) continue;
      const a = B.g('brewAskText')(e);
      assert.equal(a.live, !!e.house.askId, e.id + ': the lineup question is not read live from the pack');
      if (a.live) assert.equal(a.text, pack.askAtLineup.find((x) => x.id === e.house.askId).question.trim());
    }
  });
  await test('H3 live rows: a not printed entry reads its question live, a printed one draws the record, and both say which', () => {
    const notPrinted = entries.find((e) => !e.house.printed && e.house.askId);
    if (notPrinted) {
      const out = B.g('brewDetailHouseHTML')(notPrinted);
      assert.ok(out.includes('Not printed on the menus.') && out.includes('The lineup question') && out.includes(esc(pack.askAtLineup.find((x) => x.id === notPrinted.house.askId).question.trim())));
    }
    const printed = entries.filter((e) => e.house.printed);
    const fixture = Object.assign(JSON.parse(JSON.stringify(entries[0])), { id: 'fixture', house: { printed: true, packIds: [menuOrder[0]] } });
    for (const e of printed.concat([fixture])) {
      const out = B.g('brewDetailHouseHTML')(e);
      assert.ok(out.includes('Printed on the menus.'), e.id + ': does not say printed');
      for (const id of e.house.packIds) {
        const it = items.find((x) => x.id === id);
        assert.ok(out.includes('data-house-id="' + id + '"') && out.includes(esc(it.name)) && out.includes(esc(it.price)), e.id + ': the live record ' + id);
      }
    }
    for (const e of entries.filter((x) => (x.house.uses || []).length)) {
      const out = B.g('brewDetailHouseHTML')(e);
      for (const id of e.house.uses) assert.ok(out.includes(esc(items.find((x) => x.id === id).name)), e.id + ': the record it appears in, ' + id);
    }
  });
  await test('H3 the door: Bar studies keeps Coffee and tea beside The Bar Compass, with producers in House reference', () => {
    B.run("state.tab = 'menu'; state.menu.view = 'studies'; render();");
    const v = B.view();
    assert.ok(v.includes('class="brew-door" href="#/menu/brew"'), 'Bar studies has no Coffee and tea door');
    assert.ok(v.indexOf('class="bc-door"') < v.indexOf('class="brew-door"'), 'Coffee and tea is not after The Bar Compass');
    assert.ok(!v.includes('class="hs-jumps"'), 'Bar studies still carries the scattered jump row');
    B.run("state.menu.view = 'reference'; render();");
    assert.ok(B.view().includes('data-act="lv-producers"'), 'House reference has no producer door');
  });
  await test('H3 the house card: Open the house card opens it by one push, and Back returns to the page', async () => {
    const C = boot({ house: true, hash: '#/menu' });
    await settle();
    await wake(C, packText);
    C.tap({ 'data-act': 'menu-view', 'data-v': 'studies' }); await settle();
    C.tap({ 'data-act': 'menu-view', 'data-v': 'brew' }); await settle();
    const s0 = C.state();
    assert.equal(s0.key, 'menu/brew');
    assert.ok(C.tap({ 'data-act': 'brew-house', 'data-id': menuOrder[0] }), 'no Open the house card');
    await settle();
    const s1 = C.state();
    eq([s1.key, s1.at, C.run('state.menu.study.open')], ['menu/card', s0.at + 1, menuOrder[0]]);
    C.tap({ 'data-act': 'back' }); await settle();
    assert.equal(C.state().key, 'menu/brew');
    assert.equal(C.g('brewAct')('brew-house', { id: 'b-zzzzzzzz' }), 'done', 'a record the house lacks opens');
  });
  await test('H3 the house\u2019s name: read from the house at every draw, never written by the page', async () => {
    const renamed = JSON.parse(packText);
    renamed.house.name = 'The Fixture Room & Bar';
    const R = boot({ house: true, hash: '#/menu/brew' });
    await settle();
    await wake(R, JSON.stringify(renamed));
    R.run("state.tab = 'menu'; state.menu.view = 'brew'; brewState().item = ''; render();"); await settle();
    assert.ok(R.view().includes('<div class="eyebrow">The Fixture Room &amp; Bar \u00b7 Coffee and tea</div>'), 'the eyebrow does not read the renamed house');
    assert.equal(R.g('brewFill')('at {house} today'), 'at The Fixture Room & Bar today');
    const B0 = boot({ hash: '#/menu/brew' });
    await settle();
    assert.ok(B0.view().includes('<div class="eyebrow">Coffee and tea</div>'), 'with no house the eyebrow is not plain');
  });
}

if (process.argv.includes('--mutations')) await mutations();

for (const n of notes) console.log('  note: ' + n);
if (problems.length) {
  console.error('\n  FAIL ' + problems.length + ' problem(s)');
  for (const p of problems.slice(0, 60)) console.error('    ' + p);
  process.exit(1);
}
console.log('Coffee and tea: ' + checks + ' checks passed; ' + entries.length + ' of ' + plan.entries.length + ' entries' + (SEED ? ' (a seed build: counts and coverage held at freeze)' : '')
  + ', ' + cards.length + ' recall cards, ' + entries.reduce((n, e) => n + e.quiz.length, 0) + ' questions, ' + entries.filter((e) => e.video).length + ' videos'
  + (HOUSE_HERE ? ', the house\u2019s six read live in menu order' : ', no house here') + '.');

/* ---- the gate proves it can fail -------------------------------------------------
   Each mutation breaks one rule in a scratch copy of the shipped tree (index.html,
   js/, css/); this gate, run on it with LEDGER_JS, must go red. */
async function mutations() {
  const MUT = [
    ['js/data-brew.js edited by hand', 'js/data-brew.js', 'edition: "', 'edition: "hand-'],
    ['the card keyed under another name', 'js/ui-brew.js', "cards.push({ src: 'Brew Guide',", "cards.push({ src: 'Brew',"],
    ['an entry\u2019s parent skipping the index', 'js/ui-nav.js', "    if(state.menu.view === 'brew' && typeof brewState === 'function' && brewState().item){ brewState().item = ''; return true; }\n", ''],
    ['a thumbnail drawn beside the video link', 'js/ui-brew.js', "+ esc(v.label) + '<span class=\"sr-only\">", "+ '<img src=\"https://i.ytimg.com/vi/' + esc(v.id) + '/default.jpg\" alt=\"\">' + esc(v.label) + '<span class=\"sr-only\">"],
    ['the answer on the blind front', 'js/ui-brew.js', "+ front + heading + question\n", "+ front + heading + question + brewParas(card.back)\n"],
    ['the grade before Flip let through', 'js/app.js', "['Fall 2026','Bar Compass','Brew Guide']", "['Fall 2026','Bar Compass']"],
    ['a quiz question banked by a qkey', 'js/ui-brew.js', "ckey: 'Brew Guide \\u00b7 ' + e.id + '/make', brewId: e.id };", "ckey: 'Brew Guide \\u00b7 ' + e.id + '/make', qkey: 'brew-' + e.id, brewId: e.id };"],
    ['the house\u2019s name written into the page', 'js/ui-brew.js', "function brewHouseName(){ const h = brewHouse(); return h && typeof h.name === 'string' ? h.name.trim() : ''; }", "function brewHouseName(){ return 'Brennan\\u2019s'; }"],
  ];
  let held = 0;
  for (const [name, file, from, to] of MUT) {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-brew-'));
    for (const d of ['js', 'css']) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    const src = readFileSync(join(dir, file), 'utf8');
    if (!src.includes(from)) { problems.push('the mutation "' + name + '" found nothing to change in ' + file); rmSync(dir, { recursive: true, force: true }); continue; }
    writeFileSync(join(dir, file), src.replace(from, to));
    const r = spawnSync(process.execPath, [SELF], { env: Object.assign({}, process.env, { LEDGER_JS: join(dir, 'js') }), encoding: 'utf8' });
    rmSync(dir, { recursive: true, force: true });
    if (r.status === 0) problems.push('the mutation "' + name + '" left this gate green');
    else { held++; const why = (r.stderr.split('\n').find((l) => /^\s{4}\S/.test(l)) || '').trim(); console.log('  mutation held: ' + name + ' :: ' + why.slice(0, 150)); }
  }
  console.log('  ' + held + ' of ' + MUT.length + ' mutations turned the gate red');
}
