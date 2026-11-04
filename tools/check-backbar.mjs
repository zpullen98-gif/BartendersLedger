/* The liquor shelf, under the house's tab (4 November 2026): its gate.

     node tools/check-backbar.mjs              every check below
     node tools/check-backbar.mjs --mutations  then breaks the shipped files ten ways, one at a time, and expects red each time
     node tools/check-backbar.mjs --help

   The whole app is loaded from index.html's own script list (app.js and its
   boot included) into a sandbox with a small DOM harness: a document whose
   regions are strings, a history with real entries, back() and popstate, a
   location read from the entry, both storages in memory, and a tap that is
   the delegated click a real tap makes on the element found in the rendered
   markup (the harness of tools/check-brew.mjs). So what is held is the
   SHIPPED page, router, render() and acts.

   LEDGER_JS=<dir> points it at another copy's js/; the root is the folder
   above, and its index.html names the scripts. The roster, the fragments'
   rules and the build stay this checkout's (tools/backbar/). OOT_SHARED=<dir>
   names the House engine and the pack (else ../../shared/ or
   ../../worldtable/static/shared/ beside this checkout; absent is a note and
   skips H1 to H3; an override that holds neither fails).

   A build with fewer bottles than the roster (the seeds, or the lanes still
   writing) skips only what needs the whole shelf: the counts pinned at
   freeze, the none-lost part of the keys, and the length-clue share below 30
   questions. Everything else holds on three bottles as it will on the whole
   shelf. At freeze the integrator pins FROZEN below from
   tools/backbar/build-log.json and sets keys.v1.json's frozen to true; from
   then on no key may leave it.

   D1 shape through schema.mjs   D2 the roster's counts   D3 word caps
   D4 language and the stylesheet   D5 nobody named   D6 links resolve and land
   D7 the quiz: quality and answer positions   D8 the build's own output
   W1 keys   W2 kept apart   W3 addresses and Back   W4 rendering
   W5 recall   W6 the quiz through the click   W7 the doors
   H1 the house rows claim only exact matches   H2 from the same house
   H3 the rows drawn, the house card, the house's name */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { loadContext, validateFragment, planProblems, confirmProblems, languageProblems, nameProblems, proseWords, words, strings, fold, hasPhrase,
  houseUses, houseFamily, cardKey as schemaKey, LIMITS, LINE_LIMITS, FACT_MAX, FACT_FIELDS, SERVE_MAX, WATCH, ASK_MAX, ENTRY_MAX, RECALL, QUIZ,
  DASH, SUPERLATIVE, VERDICT, PRICE, HOUSE_NAME, AMERICAN_MORE } from './backbar/schema.mjs';
import { AMERICAN, peopleIn } from './brew/schema.mjs';

const SELF = fileURLToPath(import.meta.url);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(SELF, 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const LEDGER = join(dirname(SELF), '..');
const BB = join(LEDGER, 'tools', 'backbar');
const ROOT = process.env.LEDGER_JS ? dirname(resolve(process.env.LEDGER_JS)) : LEDGER;
const JS_DIR = process.env.LEDGER_JS ? resolve(process.env.LEDGER_JS) : join(LEDGER, 'js');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

/* The counts pinned at freeze, from tools/backbar/build-log.json of the whole
   build: the bottles written, the bottles to confirm, one recall card each and
   three questions each. Pinned on 4 November 2026 from the whole shelf (29 of
   29 bottles, 12 to confirm); a frozen keys file with a count unpinned fails. */
const FROZEN = { bottles: 29, confirm: 12, recall: 29, questions: 87 };
const KEYS_FILE = join(BB, 'keys.v1.json');
const KEY = (id) => 'Back Bar \u00b7 ' + id + '/recall';

/* ---- where the House and the pack are ------------------------------------------ */
const SHARED_DEFAULTS = ['../../shared/', '../../worldtable/static/shared/'];
const SHARED = process.env.OOT_SHARED
  ? resolve(process.env.OOT_SHARED)
  : SHARED_DEFAULTS.map((d) => fileURLToPath(new URL(d, import.meta.url))).find((d) => existsSync(join(d, 'oot-house.js')));
const HOUSE_ENGINE = SHARED ? join(SHARED, 'oot-house.js') : null;
const HOUSE_PACK = SHARED ? join(SHARED, 'packs', 'brennans-new-orleans.v1.oothouse.json') : null;
if (process.env.OOT_SHARED && !(existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK))) {
  console.error('check-backbar: OOT_SHARED names ' + SHARED + ' but it holds no oot-house.js and packs/brennans-new-orleans.v1.oothouse.json');
  process.exit(1);
}
const HOUSE_HERE = !!(HOUSE_ENGINE && existsSync(HOUSE_ENGINE) && existsSync(HOUSE_PACK));

/* ---- the harness (tools/check-brew.mjs's) ------------------------------------------ */
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

/* ---- the data, the plan and the Ledger, as the page and the schema see them ---- */
const A = boot();
await settle();
const g = A.g, run = A.run;
const esc = g('esc');
const data = plain(g('backbarData')());
const entries = data.entries || [];
const confirm = data.confirm || [];
const plan = readJSON(join(BB, 'plan.json'));
const people = readJSON(join(BB, 'people.json'));
const ctx = loadContext({ packPath: HOUSE_PACK || '' });
const roster = ctx.bottles;
const planConfirm = plan.entries.filter((e) => e.group === 'confirm');
const SEED = entries.length < roster.length;
const byPlan = new Map(plan.entries.map((e, i) => [e.id, Object.assign({ index: i }, e)]));
const fresh = () => run("progress.cards = {}; progress.quizzes = []; progress.qa = {}; progress.levels = progress.levels || {}; saveProgress();");

/* ---- D: the data ------------------------------------------------------------------ */
await test('D1 shape: the file has the build\u2019s four keys, the plan\u2019s groups, the bottles in plan order and the confirm rows as the plan writes them', () => {
  eq(Object.keys(data), ['edition', 'groups', 'entries', 'confirm']);
  assert.equal(data.edition, plan.edition, 'the edition');
  eq(data.groups, plan.groups);
  eq(planProblems(plan, ctx), [], 'tools/backbar/plan.json');
  assert.ok(entries.length > 0, 'no bottles at all');
  const ids = entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'an id twice');
  ids.forEach((id) => assert.ok(byPlan.has(id) && byPlan.get(id).group !== 'confirm', id + ' is not a roster bottle'));
  const order = ids.map((id) => byPlan.get(id).index);
  eq(order, order.slice().sort((a, b) => a - b), 'the bottles are not in the plan\u2019s order');
  eq(confirm, planConfirm.map((e) => ({ id: e.id, name: e.name, group: e.group, photo: e.photo, where: e.where, read: e.read, ask: e.ask })), 'the confirm rows are not the plan\u2019s');
  const bad = [].concat(...planConfirm.map(confirmProblems));
  eq(bad, [], 'a confirm row');
});
for (const e of entries) {
  await test('D1 shape: ' + e.id + ' passes tools/backbar/schema.mjs', () => {
    eq(validateFragment(plain(e), ctx), []);
  });
}
await test('D2 the roster\u2019s counts: every bottle a roster row or a confirm row, one recall card and three questions each, pinned at freeze', () => {
  const stray = plan.entries.filter((e) => e.group !== 'confirm' && !['liqueurs-amari', 'cognac', 'tequila-mezcal-pisco', 'american-whiskey'].includes(e.group));
  eq(stray.map((e) => e.id), [], 'a bottle outside the bar\u2019s four groups');
  assert.equal(confirm.length, planConfirm.length, 'the confirm rows');
  assert.ok(entries.length <= roster.length, 'more bottles than the roster');
  entries.forEach((e) => { assert.equal(e.recall.length, 1, e.id + ' recall'); assert.equal(e.quiz.length, 3, e.id + ' quiz'); });
  const keysFile = readJSON(KEYS_FILE);
  const unpinned = Object.keys(FROZEN).filter((k) => FROZEN[k] === null);
  if (keysFile.frozen) {
    eq(unpinned, [], 'keys.v1.json is frozen but FROZEN.' + unpinned.join(', FROZEN.') + ' is not pinned (TODO(freeze))');
  } else if (unpinned.length) {
    notes.push('D2 counts not pinned yet (TODO(freeze)): ' + entries.length + ' of ' + roster.length + ' bottles written, ' + confirm.length + ' to confirm');
    return;
  }
  if (SEED) { notes.push('D2 pinned counts not held on a partial build (' + entries.length + ' of ' + roster.length + ')'); return; }
  assert.equal(entries.length, FROZEN.bottles, 'bottles');
  assert.equal(confirm.length, FROZEN.confirm, 'confirm');
  assert.equal(entries.reduce((n, e) => n + e.recall.length, 0), FROZEN.recall, 'recall cards');
  assert.equal(entries.reduce((n, e) => n + e.quiz.length, 0), FROZEN.questions, 'questions');
});
await test('D3 word caps: every field in its range and every bottle at most ' + ENTRY_MAX + ' reading words', () => {
  const bad = [];
  const out = (path, s, lo, hi) => { const n = words(s); if (n < lo || n > hi) bad.push(path + ' ' + n + ' words, ' + lo + ' to ' + hi); };
  for (const e of entries) {
    const n = proseWords(e);
    if (n > ENTRY_MAX) bad.push(e.id + ' ' + n + ' reading words');
    for (const [k, [lo, hi]] of Object.entries(LIMITS)) out(e.id + '.' + k, e[k], lo, hi);
    for (const [k, [lo, hi]] of Object.entries(LINE_LIMITS)) out(e.id + '.lines.' + k, e.lines[k], lo, hi);
    FACT_FIELDS.forEach((k) => out(e.id + '.facts.' + k, e.facts[k], 1, FACT_MAX[k]));
    Object.keys(e.serve).forEach((k) => out(e.id + '.serve.' + k, e.serve[k], 1, SERVE_MAX));
    if (e.watch.length < WATCH.min || e.watch.length > WATCH.max) bad.push(e.id + '.watch ' + e.watch.length + ' lines');
    e.watch.forEach((s, i) => out(e.id + '.watch[' + i + ']', s, 1, WATCH.words));
    e.asks.forEach((s, i) => out(e.id + '.asks[' + i + ']', s, 1, ASK_MAX));
    e.recall.forEach((r) => { out(e.id + '.recall.prompt', r.prompt, 1, RECALL.prompt); out(e.id + '.recall.answer', r.answer, RECALL.answer[0], RECALL.answer[1]); });
    e.quiz.forEach((q, i) => { out(e.id + '.quiz[' + i + '].q', q.q, 1, QUIZ.stem); out(e.id + '.quiz[' + i + '].explain', q.explain, 1, QUIZ.explain); q.options.forEach((o, j) => out(e.id + '.quiz[' + i + '].options[' + j + ']', o, 1, QUIZ.option)); });
  }
  for (const c of confirm) { out(c.id + '.ask', c.ask, 1, ASK_MAX); out(c.id + '.where', c.where, 1, 40); out(c.id + '.read', c.read, 1, 40); }
  eq(bad, []);
});
/* the shipped bytes */
const SHIPPED = { 'js/data-backbar.js': readFileSync(join(JS_DIR, 'data-backbar.js'), 'utf8'), 'js/ui-backbar.js': readFileSync(join(JS_DIR, 'ui-backbar.js'), 'utf8'),
  'css/backbar.css': readFileSync(join(ROOT, 'css', 'backbar.css'), 'utf8') };
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
await test('D4 language: every string the page shows keeps the voice (no dash, glyph, American spelling, superlative, price, volatile fact, verdict or the house\u2019s name)', () => {
  const bad = [];
  for (const e of entries) languageProblems(plain(e)).forEach((p) => bad.push(e.id + '.' + p));
  for (const c of confirm) languageProblems({ name: c.name, where: c.where, read: c.read, ask: c.ask }).forEach((p) => bad.push(c.id + '.' + p));
  for (const [path, s] of strings({ groups: data.groups }, '')) if (DASH.test(s) || HOUSE_NAME.test(s)) bad.push(path);
  eq(bad, []);
});
await test('D4 language: the page\u2019s own words are British and plain, and no file of the page writes the house\u2019s name', () => {
  const lits = [...SHIPPED['js/ui-backbar.js'].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  const bad = [];
  for (const s of lits) {
    const am = s.match(AMERICAN) || s.match(AMERICAN_MORE);
    if (am) bad.push('American "' + am[0] + '"');
    const sup = s.match(SUPERLATIVE);
    if (sup) bad.push('selling "' + sup[0] + '"');
    if (PRICE.test(s)) bad.push('price "' + s.match(PRICE)[0] + '"');
  }
  eq(bad, [], 'js/ui-backbar.js');
  for (const f of Object.keys(SHIPPED)) assert.ok(!HOUSE_NAME.test(SHIPPED[f]), f + ' names the house');
});
await test('D4 language: css/backbar.css uses the Ledger\u2019s tokens, no new colour, font or picture, 44px controls and its night service rules', () => {
  const css = SHIPPED['css/backbar.css'];
  const others = ['ledger.css', 'house.css', 'service-day.css', 'bar-compass.css', 'fall-menu.css', 'house-menu.css', 'method-studies.css', 'brew.css']
    .map((f) => { try { return readFileSync(join(ROOT, 'css', f), 'utf8'); } catch (e) { return ''; } }).join('\n');
  for (const v of new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]))) assert.ok(new RegExp('--' + v + '\\s*:').test(others), 'the token --' + v + ' is defined nowhere in the Ledger');
  for (const c of new Set(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [])) assert.ok(others.includes(c), 'a new colour ' + c);
  assert.ok(!/url\(|@font-face|@import|<svg|data:image/i.test(css), 'a picture or a font');
  for (const m of css.matchAll(/font(?:-family)?\s*:\s*([^;}]*)/g)) {
    const fam = m[1].replace(/\s+/g, '');
    if (/^(?:inherit|[\d.]+(?:rem|em|px))$/.test(fam)) continue;
    assert.ok(/var\(--house-display,Georgia,serif\)$|^var\(--house-reading\)$/.test(fam), 'a font of its own: ' + m[1]);
  }
  for (const sel of ['.backbar-practice .btn', '.backbar-links .btn', '.backbar-recall summary', '.backbar-sources summary', '.backbar-row', '.backbar-search input'])
    assert.ok(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{[^}]*min-height:4[4-9]px').test(css), sel + ' has no 44px floor');
  assert.ok(/html\[data-service="night"\] \.backbar-/.test(css), 'no night service rule');
  assert.ok(/\.backbar-panel p\.backbar-s45\{[^}]*font-family:var\(--house-reading\)/.test(css), 'the forty-five is not in the reading face');
  assert.ok(/\.backbar-sale\{[^}]*border-top:2px solid var\(--brass\)/.test(css), 'the sale sits under no brass rule');
});
await test('D5 nobody named: no person from people.json in any string, and no capitalised run the lists do not allow', () => {
  const bad = [];
  for (const [path, s] of strings({ entries, confirm }, '')) {
    if (/\.url$/.test(path)) continue;
    peopleIn(s, people.names || people).forEach((n) => bad.push(path + ': ' + n));
  }
  for (const e of entries) nameProblems(plain(e), ctx).forEach((p) => bad.push(e.id + '.' + p));
  eq(bad, []);
});
const PRODUCERS = plain(g('PRODUCERS')) || [];
const CHAPTERS = plain(g('CASK_CHAPTERS')) || [];
const slug = g('slugify');
await test('D6 links: every producer, Cask Atlas chapter and canon drink a bottle names resolves in PRODUCERS, CASK_CHAPTERS and COCKTAILS, and draws as a link', () => {
  const cocktails = plain(g('COCKTAILS'));
  const bad = [];
  for (const e of entries) {
    const lib = e.library;
    const out = g('backbarLinksHTML')(e);
    if (lib.producer) {
      if (!PRODUCERS.some((p) => slug(p.name) === lib.producer)) bad.push(e.id + ': no producer ' + lib.producer);
      else if (!out.includes('href="#/producers/' + lib.producer + '"')) bad.push(e.id + ': the producer link is not drawn');
    }
    if (lib.cask) {
      if (!CHAPTERS.some((c) => c.id === lib.cask)) bad.push(e.id + ': no Cask Atlas chapter ' + lib.cask);
      else if (!out.includes('href="#/casks/' + lib.cask + '"')) bad.push(e.id + ': the chapter link is not drawn');
    }
    for (const c of lib.canon) {
      if (!cocktails.some((x) => slug(x.name) === c)) bad.push(e.id + ': no canon drink ' + c);
      else if (!out.includes('href="#/library/' + c + '"')) bad.push(e.id + ': the canon link ' + c + ' is not drawn');
    }
    for (const m of out.matchAll(/href="([^"]+)"/g)) if (!/^#\/(?:producers|casks|library)\//.test(m[1])) bad.push(e.id + ': a link out of the Ledger ' + m[1]);
  }
  eq(bad, []);
});
await test('D6 links: each producer, chapter and canon link lands on its screen', () => {
  for (const e of entries) {
    const lib = e.library;
    const hashes = [].concat(lib.producer ? ['#/producers/' + lib.producer] : [], lib.cask ? ['#/casks/' + lib.cask] : [], lib.canon.map((c) => '#/library/' + c));
    for (const h of hashes) {
      run("state.tab = 'home';");
      assert.ok(g('applyRoute')(h), h + ' is not read');
      run('navNormalise()');
      assert.equal(g('routeNow')().hash, h, e.id + ': ' + h + ' does not land');
    }
  }
});
await test('D6 links: the sources are https or in-app, and each external one opens a new tab with noopener', () => {
  for (const e of entries) {
    const out = g('backbarSourcesHTML')(e);
    for (const s of e.sources) if (s.url) assert.match(s.url, /^https:\/\//, e.id);
    for (const m of out.matchAll(/<a\b[^>]*>/g)) assert.ok(/href="https:/.test(m[0]) && /target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0]), e.id + ': ' + m[0]);
    assert.equal(count(out, /<a\b/g), e.sources.filter((s) => s.url).length, e.id + ': the source links');
  }
  const bad = g('backbarSourcesHTML')({ sources: [{ title: 'A fixture', url: 'javascript:alert(1)' }] });
  assert.ok(!/javascript:/.test(bad), 'an unsafe url is drawn');
});
await test('D7 the quiz: one key, four different options of one kind, the key never in the stem, the keys spread on every bottle, no length clue', () => {
  const bad = [];
  let n = 0, longest = 0, shortest = 0;
  const pos = [0, 0, 0, 0];
  for (const e of entries) {
    e.quiz.forEach((q, i) => {
      const at = e.id + '.quiz[' + i + ']';
      n++;
      if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { bad.push(at + ': the key'); return; }
      pos[q.a]++;
      if (q.options.length !== 4 || new Set(q.options.map(fold)).size !== 4) bad.push(at + ': four different options');
      const key = q.options[q.a], fk = fold(key);
      if (fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) bad.push(at + ': the stem carries the key');
      const others = q.options.filter((o, j) => j !== q.a).map((o) => o.length);
      if (key.length > Math.max(...others) * 1.6 && key.length - Math.max(...others) >= 15) bad.push(at + ': the key is much the longest');
      if (key.length > Math.max(...others)) longest++;
      if (key.length < Math.min(...others)) shortest++;
    });
    if (new Set(e.quiz.map((q) => q.a)).size === 1) bad.push(e.id + ': all three keys in one position');
  }
  if (n >= 30) {
    if (longest / n > 0.4) bad.push('the key is the longest option in ' + longest + ' of ' + n + ' questions');
    if (shortest / n > 0.4) bad.push('the key is the shortest option in ' + shortest + ' of ' + n + ' questions');
    if (Math.max(...pos) / n > 0.5) bad.push('the authored keys sit ' + pos.join('/') + ' across the positions');
  } else notes.push('D7 the length-clue and position shares wait for 30 questions (' + n + ' here)');
  eq(bad, []);
});
await test('D7 the quiz: backbarQuizRound dealt 2,000 times deals ten bottles (or every one), round robin, answers spread, every ckey a card, no qkey', () => {
  const want = Math.min(10, entries.filter((e) => e.quiz.length).length);
  const groups = new Set(entries.map((e) => e.group));
  const pos = [0, 0, 0, 0];
  let total = 0;
  for (let r = 0; r < 2000; r++) {
    const round = g('backbarQuizRound')();
    assert.equal(round.length, want, 'round ' + r + ' dealt ' + round.length);
    assert.equal(new Set(round.map((q) => q.backbarId)).size, round.length, 'a bottle twice in one round');
    const per = {};
    round.forEach((q) => { const grp = g('backbarEntry')(q.backbarId).group; per[grp] = (per[grp] || 0) + 1; });
    const counts = [...groups].map((gr) => entries.filter((e) => e.group === gr).length);
    /* round robin: no group more than one ahead of another that still had bottles to give */
    for (const ga of groups) for (const gb of groups) {
      const left = entries.filter((e) => e.group === gb).length - (per[gb] || 0);
      if (left > 0) assert.ok((per[ga] || 0) <= (per[gb] || 0) + 1, 'not round robin: ' + JSON.stringify(per) + ' of ' + JSON.stringify(counts));
    }
    for (const q of round) {
      assert.ok(!('qkey' in q) || q.qkey === undefined, 'a qkey');
      assert.equal(q.ckey, KEY(q.backbarId));
      assert.ok(g('cardByKey')(q.ckey), 'the ckey ' + q.ckey + ' is no card');
      assert.equal(q.options.length, 4);
      const i = q.options.indexOf(q.answer);
      assert.ok(i >= 0, 'the answer is not an option');
      const src = g('backbarEntry')(q.backbarId).quiz.find((x) => x.q === q.prompt);
      assert.ok(src && src.options[src.a] === q.answer, 'the answer is not the authored key');
      pos[i]++; total++;
    }
  }
  const share = pos.map((p) => p / total);
  assert.ok(share.every((s) => s >= 0.2 && s <= 0.3), 'answer positions ' + share.map((s) => (s * 100).toFixed(1) + '%').join(' '));
});
await test('D8 the build: js/data-backbar.js is what tools/backbar/build-backbar.mjs writes', () => {
  const env = Object.assign({}, process.env);
  if (HOUSE_HERE) env.OOT_SHARED = SHARED;
  const r = spawnSync(process.execPath, [join(BB, 'build-backbar.mjs'), '--check'], { cwd: LEDGER, env, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout + r.stderr).trim().split('\n').slice(-6).join(' '));
  if (resolve(JS_DIR) !== resolve(join(LEDGER, 'js'))) assert.equal(SHIPPED['js/data-backbar.js'], readFileSync(join(LEDGER, 'js', 'data-backbar.js'), 'utf8'), 'this copy\u2019s js/data-backbar.js is not the source\u2019s, byte for byte');
});

/* ---- W: the wiring ------------------------------------------------------------------ */
const cards = plain(g('backbarCards')());
await test('W1 keys: one card per bottle, keyed "Back Bar \u00b7 <id>/recall", unique, read back by cardByKey, studied at the bottle', () => {
  assert.equal(cards.length, entries.length);
  const keys = cards.map((c) => g('cardKey')(c));
  assert.equal(new Set(keys).size, keys.length);
  for (const c of cards) {
    assert.equal(c.src, 'Back Bar');
    assert.equal(g('cardKey')(c), KEY(c.itemId));
    assert.equal(KEY(c.itemId), schemaKey(c.itemId), 'the page and schema.mjs disagree on the key');
    assert.equal(g('cardByKey')(KEY(c.itemId)).backbarKey, c.backbarKey);
    assert.equal(g('studyHashOf')(KEY(c.itemId)), '#/menu/backbar/' + c.itemId);
    eq(c.spec, []);
  }
  assert.equal(g('cardByKey')(KEY('no-such-bottle')), null);
});
await test('W1 keys: every shipped key is in tools/backbar/keys.v1.json; once frozen, none leaves it', () => {
  const file = readJSON(KEYS_FILE);
  const list = Array.isArray(file) ? file : file.keys;
  assert.ok(Array.isArray(list) && list.length, 'keys.v1.json holds no keys');
  list.forEach((k) => assert.match(k, /^Back Bar \u00b7 [a-z0-9-]+\/recall$/));
  assert.equal(new Set(list).size, list.length, 'a key twice');
  const keys = cards.map((c) => g('cardKey')(c));
  eq(keys.filter((k) => !list.includes(k)), [], 'a shipped key keys.v1.json does not hold');
  const loose = list.filter((k) => !roster.some((b) => KEY(b.id) === k));
  if (!file.frozen) {
    notes.push('W1 keys.v1.json is not frozen yet (TODO(freeze))' + (loose.length ? '; keys no roster bottle holds: ' + loose.join(', ') : ''));
    return;
  }
  if (SEED) { notes.push('W1 none-lost not held on a partial build'); return; }
  eq(list.filter((k) => !keys.includes(k)), [], 'a frozen key is gone');
});
await test('W2 kept apart: out of allDrinks, the academic modes, Due today, the session and the levels', () => {
  assert.ok(!g('allDrinks')().some((d) => d.src === 'Back Bar'));
  const modes = g('FC_MODES');
  const at = modes.findIndex((m) => m[0] === 'backbar');
  assert.ok(at > 0 && modes[at - 1][0] === 'brew', 'the backbar mode is not right after brew');
  const live = g('backbarCards')();
  for (const m of modes) if (m[0] !== 'backbar') assert.ok(live.every((c) => !m[3](c)), 'the mode ' + m[0] + ' fits a Back Bar card');
  assert.ok(live.every((c) => modes[at][3](c)));
  fresh();
  const now = Date.now();
  cards.forEach((c) => { g('progress').cards[KEY(c.itemId)] = { r: 0, w: 1, reps: 0, last: now - 2 * 86400000, due: now - 86400000 }; });
  assert.ok(g('dueToday')().deck.every((d) => d.src !== 'Back Bar'), 'Due today deals a Back Bar card');
  const parts = g('sessionDeckParts')();
  assert.ok(parts.dueDeck.concat(parts.newDeck).every((d) => d.src !== 'Back Bar'), 'the session deals a Back Bar card');
  assert.ok(!/Back Bar/.test(JSON.stringify(g('LEVEL_ITEMS'))), 'a level holds a Back Bar item');
  const def = g('deckDef')('backbar');
  assert.equal(def.preset.level, undefined);
  eq(Array.from(def.preset.deckModes), ['backbar']);
  assert.equal(def.preset.only.length, cards.length);
  assert.equal(g('deckDef')('backbar:again').preset.only.length, cards.length, 'every card due is in Due or missed');
  fresh();
  assert.equal(g('deckDef')('backbar:again').preset.only.length, 0, 'Due or missed deals an unseen card');
  assert.equal(g('deckDef')('backbar:nope'), null);
});
await test('W2 kept apart: grading a card writes its key and leaves level progress, qa, levels and the menu unchanged', () => {
  fresh();
  run("progress.qa = { 'fixture-q': { r: 2, w: 1 } }; progress.levels = { '1': { fixture: true } };");
  const lp = () => JSON.stringify([1, 2, 3, 4].map((n) => g('levelProgress')(n)));
  const before = { lp: lp(), qa: JSON.stringify(g('progress').qa), levels: JSON.stringify(g('progress').levels), bar: JSON.stringify(g('progress').bar), first: g('firstUnmetLevel')() };
  assert.ok(g('openDeck')('backbar'));
  assert.ok(g('startDeckRun')('backbar'));
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
await test('W3 addresses: every bottle round-trips, its parent is the shelf, the shelf\u2019s Bar studies, then the menu; bad ids land on the shelf', () => {
  for (const e of entries) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')('#/menu/backbar/' + e.id));
    assert.equal(g('routeNow')().hash, '#/menu/backbar/' + e.id);
    assert.equal(g('backbarHref')(e.id), '#/menu/backbar/' + e.id);
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu/backbar');
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu/view/studies');
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/menu');
  }
  const bads = ['#/menu/backbar/no-such-bottle', '#/menu/backbar/%E0%A4%A', '#/menu/backbar/', '#/menu/view/backbar'].concat(confirm.slice(0, 1).map((c) => '#/menu/backbar/' + c.id));
  for (const bad of bads) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(bad), bad + ' is not read');
    assert.equal(g('routeNow')().hash, '#/menu/backbar', bad);
  }
  assert.ok(g('applyRoute')('#/menu'));
  assert.equal(g('routeNow')().hash, '#/menu');
  assert.equal(run('state.menu.view'), 'menu', 'leaving by #/menu leaves the shelf');
});
await test('W3 Back: the menu, Bar studies, the shelf, a bottle by its row, then Back four times to the shelf, Bar studies, the menu and Home; a cold bottle walks up by replaces', async () => {
  const B = boot({ hash: '#/menu' });
  await settle();
  assert.equal(B.state().key, 'menu');
  assert.ok(B.tap({ 'data-act': 'menu-view', 'data-v': 'studies' }), 'the menu has no Bar studies');
  await settle();
  const s0 = B.state();
  assert.equal(s0.key, 'menu/view/studies');
  assert.ok(B.tap({ 'data-act': 'menu-view', 'data-v': 'backbar' }), 'Bar studies has no The liquor shelf');
  await settle();
  const s1 = B.state();
  eq([s1.key, s1.hash, s1.at], ['menu/backbar', '#/menu/backbar', s0.at + 1]);
  const id = entries[0].id;
  assert.ok(B.tap({ class: 'backbar-row', href: '#/menu/backbar/' + id }), 'the shelf draws no row for ' + id);
  await settle();
  const s2 = B.state();
  eq([s2.key, s2.at], ['menu/backbar/' + id, s1.at + 1]);
  assert.equal(count(B.view(), /data-act="back"/g), 1, 'one Back on the bottle');
  const walk = [];
  for (let i = 0; i < 4; i++) { B.tap({ 'data-act': 'back' }); await settle(); walk.push(B.state().key); }
  eq(walk, ['menu/backbar', 'menu/view/studies', 'menu', 'home']);
  const C = boot({ hash: '#/menu/backbar/' + id });
  await settle();
  eq([C.state().key, C.state().d], ['menu/backbar/' + id, 0]);
  const up = [];
  for (let i = 0; i < 4; i++) { C.tap({ 'data-act': 'back' }); await settle(); up.push(C.state().key); }
  eq(up, ['menu/backbar', 'menu/view/studies', 'menu', 'home']);
  assert.equal(C.history.length, 1, 'walking up a cold bottle grew the history');
  const N = boot({ hash: '#/menu/backbar/no-such-bottle' });
  await settle();
  eq([N.state().key, N.state().hash, N.history.length], ['menu/backbar', '#/menu/backbar', 1]);
  const V = boot({ hash: '#/menu/view/backbar' });
  await settle();
  assert.equal(V.state().key, 'menu/backbar');
});
const HEADINGS = ['backbar-d-table', 'backbar-d-pour', 'backbar-d-house', 'backbar-d-facts', 'backbar-d-guest', 'backbar-d-story', 'backbar-d-watchfor', 'backbar-d-links', 'backbar-d-recall'];
const PICTURE = /<(?:img|iframe|video|picture|source|svg|object|embed)\b|url\(/i;
const POINTER = 'Allergens: confirm at lineup.';
await test('W4 rendering: the shelf, its groups in the bar\u2019s order, every bottle a row, then To confirm at the bar with each photograph, place and question', () => {
  run("state.tab = 'menu'; state.menu.view = 'backbar';");
  g('backbarOpen')('');
  run("backbarState().q = ''");
  const out = g('renderMenu')();
  assert.ok(out.includes('<h2 tabindex="-1">The liquor shelf</h2>'), 'the heading');
  assert.ok(out.includes('data-act="backbar-practise" data-deck="backbar">Practise the cards<') && out.includes('data-act="quiz-go" data-m="backbar">Take the quiz<'), 'Practise the cards and Take the quiz');
  assert.ok(/<label for="backbar-q">[^<]+<\/label><input[^>]*id="backbar-q"/.test(out), 'the search is not labelled');
  const heads = [...out.matchAll(/class="backbar-group-h" id="backbar-g-([a-z-]+)"/g)].map((m) => m[1]);
  const want = data.groups.map((x) => x.id).filter((id) => id === 'confirm' ? confirm.length : entries.some((e) => e.group === id));
  eq(heads, want, 'the groups are not the bar\u2019s order with To confirm at the bar last');
  const rows = [...out.matchAll(/class="backbar-row" id="backbar-r-([a-z0-9-]+)"/g)].map((m) => m[1]);
  eq(rows, data.groups.flatMap((x) => entries.filter((e) => e.group === x.id).map((e) => e.id)), 'every bottle a row, shelf by shelf');
  for (const c of confirm) {
    const at = out.indexOf('id="backbar-c-' + c.id + '"');
    assert.ok(at > out.indexOf('id="backbar-g-confirm"'), c.id + ' is not under To confirm at the bar');
    const one = out.slice(at, out.indexOf('</article>', at));
    assert.ok(one.includes('Photograph ' + c.photo) && one.includes(esc(c.where)) && one.includes(esc(c.ask)), c.id + ': the photograph, where it stands or the question');
  }
  assert.ok(!PICTURE.test(out), 'a picture on the shelf');
});
await test('W4 rendering: the shelf\u2019s search repaints the results alone and finds a bottle and a confirm row', () => {
  const e = entries[0];
  run('backbarState().q = ' + JSON.stringify(e.name.toLowerCase()));
  const out = g('backbarResultsHTML')();
  assert.ok(out.includes('id="backbar-r-' + e.id + '"'), 'the search misses ' + e.id);
  assert.ok(/role="status"/.test(out), 'no live count');
  if (confirm.length) {
    run('backbarState().q = ' + JSON.stringify(confirm[0].ask.slice(0, 18)));
    assert.ok(g('backbarResultsHTML')().includes('id="backbar-c-' + confirm[0].id + '"'), 'the search misses a confirm row');
  }
  run("backbarState().q = 'zzzz no such bottle'");
  assert.ok(/class="backbar-empty"/.test(g('backbarResultsHTML')()), 'no empty line');
  run("backbarState().q = ''");
});
await test('W4 rendering: every bottle in the plan\u2019s order of sections, the lines placed, the pointer once, recall and sources closed, no picture, nobody named, nothing written', () => {
  fresh();
  const before = JSON.stringify(g('progress'));
  run("state.tab = 'menu'; state.menu.view = 'backbar';");
  for (const e of entries) {
    g('backbarOpen')(e.id);
    const out = g('renderMenu')();
    assert.ok(out.includes('<h2 tabindex="-1">' + esc(e.name) + '</h2>'), e.id + ': its name is not the heading');
    const head = out.slice(out.indexOf('<header class="backbar-heading">'), out.indexOf('</header>'));
    assert.ok(head.includes(esc(g('backbarGroupTitle')(e.group))) && head.includes(esc(e.producer)) && head.includes(esc(e.place)), e.id + ': the group, producer and place');
    if (e.respell) assert.ok(head.includes('Say it</span> ' + esc(e.respell)), e.id + ': Say it');
    const at = HEADINGS.map((h) => out.indexOf('id="' + h + '"'));
    assert.ok(at.every((i) => i >= 0), e.id + ': a section is missing ' + HEADINGS.filter((h, i) => at[i] < 0).join(', '));
    eq(at, at.slice().sort((a, b) => a - b), e.id + ': the sections are out of order');
    assert.ok(out.indexOf('<details class="backbar-sources">') > at[at.length - 1], e.id + ': Sources are not last');
    assert.ok(out.includes('<p class="backbar-s45">' + esc(e.lines.s45) + '</p>'), e.id + ': the forty-five is not the large line');
    assert.ok(/<div class="backbar-sale"><p class="backbar-label">The sale<\/p><p>/.test(out) && out.includes(esc(e.lines.sale)), e.id + ': the sale');
    const quiet = out.slice(out.indexOf('<div class="backbar-quiet">'));
    assert.ok(quiet.indexOf(esc(e.lines.s10)) >= 0 && quiet.indexOf(esc(e.lines.s20)) > quiet.indexOf(esc(e.lines.s10)), e.id + ': the ten and the twenty are not quiet beneath');
    assert.ok(out.indexOf('class="backbar-s45"') < out.indexOf('class="backbar-sale"') && out.indexOf('class="backbar-sale"') < out.indexOf('class="backbar-quiet"'), e.id + ': the forty-five, the sale, then the quiet lines');
    ['neat', 'rocks', 'glass', 'classic'].forEach((k) => assert.ok(out.includes(esc(e.serve[k])), e.id + ': serve.' + k));
    FACT_FIELDS.forEach((k) => assert.ok(out.includes(esc(e.facts[k])), e.id + ': facts.' + k));
    assert.ok(out.includes(esc(e.guest)) && e.watch.every((w) => out.includes(esc(w))) && e.asks.every((a) => out.includes(esc(a))), e.id + ': the guest line, the watch lines or the asks');
    assert.equal(count(out, /Allergens: confirm at lineup\./g), 1, e.id + ': the fixed pointer, once');
    const said = strip(out).split(POINTER).join(' ');
    assert.ok(!VERDICT.test(said), e.id + ': allergen or health talk beyond the pointer (' + (said.match(VERDICT) || [])[0] + ')');
    assert.ok(/<details class="backbar-recall"><summary>/.test(out) && !/<details class="backbar-recall" open/.test(out), e.id + ': Recall before you reveal is not drawn closed');
    assert.ok(/<details class="backbar-sources"><summary>Sources<\/summary>/.test(out), e.id + ': Sources not drawn closed');
    assert.ok(!PICTURE.test(out), e.id + ': a picture');
    eq(peopleIn(strip(out), people.names || people), [], e.id + ': names a person');
    assert.ok(!HOUSE_NAME.test(strip(out)), e.id + ': names the house with no house loaded');
    assert.ok(!/[$\u00a3\u20ac]/.test(strip(out)) && !PRICE.test(strip(out)), e.id + ': a price');
    assert.ok(!SUPERLATIVE.test(strip(out)), e.id + ': sells (' + (strip(out).match(SUPERLATIVE) || [])[0] + ')');
  }
  assert.equal(JSON.stringify(g('progress')), before, 'rendering wrote progress');
});
await test('W5 recall: a blind front, a forged early grade refused, the answer after Flip, our key only, misses in mode backbar, a readable deck done', async () => {
  const B = boot({ hash: '#/menu/backbar' });
  await settle();
  B.run('progress.cards = {}; saveProgress();');
  B.run("progress.cards['My Bar \u00b7 Existing'] = { r: 17, w: 2, last: 1 };");
  assert.ok(B.tap({ 'data-act': 'backbar-practise', 'data-deck': 'backbar' }), 'Practise the cards is not drawn');
  await settle();
  assert.equal(B.run('state.fc.stage + " " + state.fc.mode'), 'run backbar');
  const n = B.run('state.fc.deck.length');
  assert.equal(n, cards.length);
  const c = plain(B.run('state.fc.deck[0]')), key = B.g('cardKey')(c);
  let v = B.view();
  assert.ok(v.includes('<div class="backbar-question">' + esc(c.name) + '</div>'), 'the prompt is not the front');
  assert.ok(!v.includes(esc(c.back)) && !strip(v).includes(c.back), 'the front shows the answer');
  assert.ok(!/data-act="fc-grade"/.test(v) && !PICTURE.test(v), 'the front offers a grade or a picture');
  B.forge({ 'data-act': 'fc-grade', 'data-ok': '1' });
  await settle();
  assert.ok(!B.g('progress').cards[key] && B.run('state.fc.idx') === 0, 'a forged grade before Flip was recorded');
  assert.ok(B.tap({ 'data-act': 'fc-flip' }));
  await settle();
  v = B.view();
  assert.ok(v.includes(esc(c.back).slice(0, 40)), 'the answer is not drawn after Flip');
  assert.ok(v.includes('href="#/menu/backbar/' + c.itemId + '"') && /backbar-read-link/.test(v), 'the bottle link after Flip');
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
  assert.ok(!v.includes('Back Bar \u00b7'), 'Deck done shows a raw key');
  assert.ok(v.includes(esc(c.group + ': ' + c.name)), 'Deck done does not name the missed card readably');
  assert.ok(B.tap({ 'data-act': 'fc-rerun-miss' }));
  await settle();
  assert.equal(B.run('state.fc.mode'), 'backbar');
  eq(B.run('state.fc.deck.map(cardKey)'), [key]);
});
await test('W5 recall: an empty Due or missed stops at the deck screen and never starts an empty run', async () => {
  const B = boot({ hash: '#/menu/backbar' });
  await settle();
  B.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.ok(B.tap({ 'data-act': 'deck', 'data-deck': 'backbar:again' }), 'Due or missed is not drawn');
  await settle();
  assert.equal(B.run('state.fc.stage'), 'setup');
  assert.ok(/No cards in this deck yet/.test(B.view()) && !/data-act="fc-start"/.test(B.view()));
});
await test('W6 the quiz: through the real click, one Recent rounds row in mode backbar, nothing else written, Study this card and Back keep the results', async () => {
  const B = boot({ hash: '#/menu/backbar' });
  await settle();
  B.run("progress.cards = {}; progress.quizzes = []; progress.qa = { 'fixture-q': { r: 1, w: 0 } }; progress.levels = {}; saveProgress();");
  const before = JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null }));
  const lp = JSON.stringify([1, 2, 3, 4].map((n) => B.g('levelProgress')(n)));
  assert.ok(B.tap({ 'data-act': 'quiz-go', 'data-m': 'backbar' }), 'Take the quiz is not drawn');
  await settle();
  const n = B.run('state.quiz.round.length');
  assert.equal(n, Math.min(10, entries.length));
  assert.equal(B.state().key, 'quiz/backbar');
  assert.ok(B.view().includes('Question 1 of ' + n + ' \u00b7 The liquor shelf'), 'the round is not labelled The liquor shelf');
  for (let i = 0; i < n; i++) {
    const right = B.run('(function(){ const q = state.quiz.round[state.quiz.idx]; return q.options.indexOf(q.answer); })()');
    B.tap({ 'data-act': 'quiz-pick', 'data-i': String(i === 0 ? (right + 1) % 4 : right) }); await settle();
    B.tap({ 'data-act': 'quiz-next' }); await settle();
  }
  const q = plain(B.g('progress').quizzes);
  assert.equal(q.length, 1, 'rows written: ' + q.length);
  eq([q[0].mode, q[0].total, q[0].score, q[0].replay], ['backbar', n, n - 1, false]);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null })), before, 'the round wrote outside progress.quizzes');
  assert.equal(JSON.stringify([1, 2, 3, 4].map((m) => B.g('levelProgress')(m))), lp, 'level progress moved');
  assert.equal(B.state().hash, '#/quiz/backbar/done');
  const done = B.view();
  const study = [...done.matchAll(/data-act="hash" data-h="([^"]+)">Study this card</g)].map((m) => m[1]);
  assert.equal(study.length, 1, 'Study this card for the one miss');
  assert.match(study[0], /^#\/menu\/backbar\/[a-z0-9-]+$/);
  const at = B.state().at;
  B.tap({ 'data-act': 'hash', 'data-h': study[0] }); await settle();
  eq([B.state().key, B.state().at], [study[0].slice(2), at + 1]);
  B.tap({ 'data-act': 'back' }); await settle();
  assert.equal(B.state().hash, '#/quiz/backbar/done');
  assert.equal(B.run('state.quiz.missedQ.length'), 1, 'Back lost the results');
  assert.equal(B.g('modeLabel')('backbar'), 'The liquor shelf');
  B.run("progress.quizzes = [{ date: 'd', ts: 1, score: 9, total: 10, mode: 'backbar' }, { date: 'd', ts: 2, score: 3, total: 10, mode: 'backbar' }];");
  assert.ok(!/last 2 rounds/.test(B.g('dashboardHTML')()), 'the dashboard\u2019s trend counts a liquor shelf round');
});
await test('W7 doors: the sub-nav after Coffee and tea, the door after Coffee and tea\u2019s, the Practise rows after Coffee and tea, the search index, every door landing', () => {
  run("state.tab = 'menu'; state.menu.view = 'studies';");
  const studies = g('renderMenu')();
  const subs = ((studies.match(/<nav class="house-subsections"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '');
  const items = [...subs.matchAll(/data-act="menu-view" data-v="(\w+)"[^>]*>([^<]*)</g)].map((m) => m[1] + ':' + m[2]);
  assert.equal(items[items.indexOf('brew:Coffee and tea') + 1], 'backbar:The liquor shelf', 'the sub-nav reads ' + items.join(' | '));
  assert.ok(studies.indexOf('class="brew-door"') >= 0 && studies.indexOf('class="backbar-door" href="#/menu/backbar"') > studies.indexOf('class="brew-door"'), 'the door is not after Coffee and tea\u2019s');
  run("state.menu.view = 'backbar'; backbarOpen('');");
  assert.ok(/data-v="studies" aria-current="page"/.test(g('renderMenu')()), 'Bar studies is not lit on the shelf');
  const pick = g('fcPickHTML')();
  const navs = [...pick.matchAll(/<nav class="quiet rows" aria-label="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(navs[navs.indexOf('Coffee and tea') + 1], 'The liquor shelf', 'the rows are not right after Coffee and tea: ' + navs.join(' | '));
  const rows = pick.slice(pick.indexOf('aria-label="The liquor shelf"'));
  const block = rows.slice(0, rows.indexOf('</nav>'));
  assert.ok(block.includes('data-act="deck" data-deck="backbar"') && block.includes('data-act="quiz-go" data-m="backbar"'), 'the rows are not the deck and the quiz');
  const ix = g('buildSearchIndex')();
  const mine = ix.filter((r) => /^#\/menu\/backbar/.test(r.h));
  assert.equal(mine.length, entries.length + 1);
  for (const r of mine) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(r.h));
    assert.equal(g('routeNow')().hash, r.h);
  }
  assert.ok(/grab\('backbar-q', state\.backbar, 'q'\)/.test(String(g('captureLiveInputs'))), 'captureLiveInputs does not keep the search box');
  run("state.tab = 'menu'; state.menu.view = 'menu';");
});

/* ---- H: the house, from the shipped engine and pack ------------------------------- */
if (!HOUSE_HERE) notes.push('H1 to H3 skipped: no House engine and pack beside this checkout (OOT_SHARED=<dir> names one)');
else {
  const packText = readFileSync(HOUSE_PACK, 'utf8');
  const pack = JSON.parse(packText).house;
  const B = boot({ house: true, hash: '#/menu/backbar' });
  await settle();
  await wake(B, packText);
  const h = B.g('hsCurrent')();
  const items = [].concat(pack.cocktails || [], pack.dishes || []);
  const ids = (list) => plain(list).map((x) => x.id);
  await test('H1 the house rows claim only exact matches: the page reads the pack as schema.mjs houseUses does, each claim a whole match term', () => {
    const bad = [];
    for (const e of entries) {
      const page = ids(B.g('backbarUses')(h, B.g('backbarEntry')(e.id)));
      const rule = houseUses(pack, e, entries);
      if (JSON.stringify(page) !== JSON.stringify(rule)) bad.push(e.id + ': the page claims ' + page.join(',') + ', the rule ' + rule.join(','));
      if (!SEED) { const full = houseUses(pack, e, roster); if (JSON.stringify(full) !== JSON.stringify(rule)) bad.push(e.id + ': the whole roster claims ' + full.join(',')); }
      for (const id of page) {
        const it = items.find((x) => x.id === id);
        const texts = [].concat(it.spec || [], it.ingredients || [], (it.ingredientsNamed && it.ingredientsNamed.by === 'person' && it.ingredientsNamed.value) || [],
          (pack.components || []).filter((c) => c.kind === 'ingredient' && (c.itemIds || []).includes(id)).map((c) => c.name));
        if (!texts.some((t) => e.house.match.some((m) => hasPhrase(t, m)))) bad.push(e.id + ': ' + id + ' names no match term');
      }
    }
    eq(bad, []);
  });
  await test('H1 the house rows claim only exact matches: a comparison, a bare family name and a term inside a longer one are never a use', () => {
    const fx = plain(B.g('backbarData')());
    B.run('BACKBAR_GUIDE.entries.push(' + JSON.stringify({ id: 'fixture-long', name: 'Fixture Long', group: 'american-whiskey', house: { match: ['George T. Stagg'], family: [] }, recall: [], quiz: [] }) + ', '
      + JSON.stringify({ id: 'fixture-short', name: 'Fixture Short', group: 'american-whiskey', house: { match: ['Stagg', 'Green Chartreuse'], family: [] }, recall: [], quiz: [] }) + ')');
    const house = { components: [], dishes: [], cocktails: [
      { id: 'b-fixture1', name: 'One', spec: ['2 oz George T. Stagg bourbon'] },
      { id: 'b-fixture2', name: 'Two', spec: ['2 oz Stagg bourbon'] },
      { id: 'b-fixture3', name: 'Three', spec: ['1 oz Chartreuse', '1 oz Staggering Gin'] },
      { id: 'b-fixture4', name: 'Four', spec: ['1/2 oz green chartreuse'] } ] };
    const short = B.g('backbarEntry')('fixture-short'), long = B.g('backbarEntry')('fixture-long');
    const s = ids(B.g('backbarUses')(house, short)), l = ids(B.g('backbarUses')(house, long));
    B.run('BACKBAR_GUIDE.entries = BACKBAR_GUIDE.entries.filter(function(e){ return !/^fixture-/.test(e.id); })');
    eq(plain(B.g('backbarData')()), fx, 'the fixture was not taken off');
    eq(l, ['b-fixture1'], 'the longer term');
    eq(s, ['b-fixture2', 'b-fixture4'], 'the shorter term claims inside the longer, a bare family name or part of a word');
  });
  await test('H2 from the same house: the page reads the producer profiles as schema.mjs houseFamily does, and draws each with the drinks it belongs to', () => {
    const bad = [];
    run("state.tab = 'menu';");
    for (const e of entries) {
      const page = ids(B.g('backbarFamily')(h, B.g('backbarEntry')(e.id)));
      const rule = houseFamily(pack, e).map((x) => x.id);
      if (JSON.stringify(page) !== JSON.stringify(rule)) bad.push(e.id + ': the page reads ' + page.join(',') + ', the rule ' + rule.join(','));
      const out = B.g('backbarHouseHTML')(B.g('backbarEntry')(e.id));
      for (const id of rule) {
        if (!out.includes('data-component-id="' + id + '"')) { bad.push(e.id + ': ' + id + ' not drawn'); continue; }
        const comp = pack.components.find((c) => c.id === id);
        for (const it of (comp.itemIds || []).map((x) => items.find((y) => y.id === x)).filter(Boolean)) if (!out.includes(esc(it.name))) bad.push(e.id + ': ' + id + ' leaves out ' + it.name);
      }
      if (!rule.length && out.includes('From the same house')) bad.push(e.id + ': From the same house drawn empty');
      const links = B.g('backbarLinksHTML')(B.g('backbarEntry')(e.id));
      for (const id of rule) {
        const reach = B.g('hsDrinkProducerById')(h, id);
        const href = '#/producers/house/' + B.g('navProducerId')(id);
        if (!!reach !== links.includes('href="' + href + '"')) bad.push(e.id + ': the house producer profile ' + id + (reach ? ' is not linked' : ' is linked with no profile'));
        if (reach) { B.run("state.tab = 'home';"); B.g('applyRoute')(href); B.run('navNormalise()'); if (B.g('routeNow')().hash !== href) bad.push(e.id + ': ' + href + ' does not land'); }
      }
    }
    eq(bad, []);
  });
  await test('H3 the rows drawn: each use with its section, name, printed list and its card door, no price, and the house\u2019s name read live', () => {
    const name = String(h.name);
    for (const e of entries) {
      B.run("state.tab = 'menu'; backbarOpen(" + JSON.stringify(e.id) + '); render();');
      const v = B.view();
      const house = v.slice(v.indexOf('id="backbar-d-house"'), v.indexOf('id="backbar-d-facts"'));
      assert.ok(house.includes(esc(name)), e.id + ': At the house does not read the house\u2019s name');
      for (const id of houseUses(pack, e, entries)) {
        const it = items.find((x) => x.id === id);
        const at = house.indexOf('data-house-id="' + id + '"');
        assert.ok(at >= 0, e.id + ': ' + id + ' not drawn');
        const one = house.slice(at, house.indexOf('</article>', at));
        assert.ok(one.includes(esc(it.section)) && one.includes(esc(it.name)), e.id + ': ' + id + ' section and name');
        assert.ok(one.includes(esc(B.g('backbarPrinted')(it).join(', '))), e.id + ': ' + id + ' printed list');
        if (/^b-/.test(id)) assert.ok(one.includes('data-act="backbar-house" data-id="' + id + '">Open the house card'), e.id + ': ' + id + ' Open the house card');
      }
      if (!houseUses(pack, e, entries).length) assert.ok(house.includes('None of the house\u2019s printed drinks names this bottle.'), e.id + ': says nothing of no use');
      const text = strip(v);
      assert.ok(!/[$\u00a3\u20ac]/.test(text) && !/\bprices?\b/i.test(text), e.id + ': a price drawn with the house loaded');
    }
    B.run("backbarOpen(''); render();");
    assert.ok(B.view().includes('<div class="eyebrow">' + esc(name) + ' \u00b7 The liquor shelf</div>'), 'the shelf\u2019s eyebrow does not read the house');
  });
  await test('H3 the house card: Open the house card opens it by one push, and Back returns to the bottle', async () => {
    const e = entries.find((x) => houseUses(pack, x, entries).some((id) => /^b-/.test(id)));
    if (!e) { notes.push('H3 the house card: no bottle written yet that a drink of the house pours'); return; }
    const id = houseUses(pack, e, entries).find((x) => /^b-/.test(x));
    const C = boot({ house: true, hash: '#/menu' });
    await settle();
    await wake(C, packText);
    C.tap({ 'data-act': 'menu-view', 'data-v': 'studies' }); await settle();
    C.tap({ 'data-act': 'menu-view', 'data-v': 'backbar' }); await settle();
    C.tap({ class: 'backbar-row', href: '#/menu/backbar/' + e.id }); await settle();
    const s0 = C.state();
    assert.equal(s0.key, 'menu/backbar/' + e.id);
    assert.ok(C.tap({ 'data-act': 'backbar-house', 'data-id': id }), 'no Open the house card');
    await settle();
    const s1 = C.state();
    eq([s1.key, s1.at, C.run('state.menu.study.open')], ['menu/card', s0.at + 1, id]);
    C.tap({ 'data-act': 'back' }); await settle();
    assert.equal(C.state().key, 'menu/backbar/' + e.id);
    assert.equal(C.g('backbarAct')('backbar-house', { id: 'b-zzzzzzzz' }), 'done', 'a record the house lacks opens');
  });
  await test('H3 the house\u2019s name: read from a renamed house at every draw, never written by the page', async () => {
    const renamed = JSON.parse(packText);
    renamed.house.name = 'The Fixture Room & Bar';
    const R = boot({ house: true, hash: '#/menu/backbar' });
    await settle();
    await wake(R, JSON.stringify(renamed));
    R.run("state.tab = 'menu'; backbarOpen(''); render();"); await settle();
    assert.ok(R.view().includes('<div class="eyebrow">The Fixture Room &amp; Bar \u00b7 The liquor shelf</div>'), 'the eyebrow does not read the renamed house');
    R.run("backbarOpen(" + JSON.stringify(entries[0].id) + "); render();"); await settle();
    assert.ok(R.view().includes('Read live from the menus of The Fixture Room &amp; Bar:'), 'At the house does not read the renamed house');
    const B0 = boot({ hash: '#/menu/backbar' });
    await settle();
    assert.ok(B0.view().includes('<div class="eyebrow">The liquor shelf</div>'), 'with no house the eyebrow is not plain');
  });
}

if (process.argv.includes('--mutations')) await mutations();

for (const n of notes) console.log('  note: ' + n);
if (problems.length) {
  console.error('\n  FAIL ' + problems.length + ' problem(s)');
  for (const p of problems.slice(0, 60)) console.error('    ' + p);
  process.exit(1);
}
console.log('The liquor shelf: ' + checks + ' checks passed; ' + entries.length + ' of ' + roster.length + ' bottles' + (SEED ? ' (a partial build: the pinned counts wait for the whole shelf)' : '')
  + ', ' + confirm.length + ' to confirm, ' + cards.length + ' recall cards, ' + entries.reduce((n, e) => n + e.quiz.length, 0) + ' questions'
  + (HOUSE_HERE ? ', the house read live by the match and family terms' : ', no house here') + '.');

/* ---- the gate proves it can fail -------------------------------------------------
   Each mutation breaks one rule in a scratch copy of the shipped tree (index.html,
   js/, css/); this gate, run on it with LEDGER_JS, must go red. */
async function mutations() {
  const MUT = [
    ['js/data-backbar.js edited by hand', 'js/data-backbar.js', 'edition: "', 'edition: "hand-'],
    ['the card keyed under another name', 'js/ui-backbar.js', "cards.push({ src: 'Back Bar',", "cards.push({ src: 'Backbar',"],
    ['a bottle\u2019s parent skipping the shelf', 'js/ui-nav.js', "    if(state.menu.view === 'backbar' && typeof backbarState === 'function' && backbarState().item){ backbarState().item = ''; return true; }\n", ''],
    ['the answer on the blind front', 'js/ui-backbar.js', "+ front + heading + question\n", "+ front + heading + question + backbarParas(card.back)\n"],
    ['the grade before Flip let through', 'js/app.js', "['Fall 2026','Bar Compass','Brew Guide','Back Bar']", "['Fall 2026','Bar Compass','Brew Guide']"],
    ['a quiz question banked by a qkey', 'js/ui-backbar.js', "ckey: 'Back Bar \\u00b7 ' + e.id + '/recall', backbarId: e.id };", "ckey: 'Back Bar \\u00b7 ' + e.id + '/recall', qkey: 'backbar-' + e.id, backbarId: e.id };"],
    ['the house\u2019s name written into the page', 'js/ui-backbar.js', "function backbarHouseName(){ const h = backbarHouse(); return h && typeof h.name === 'string' ? h.name.trim() : ''; }", "function backbarHouseName(){ return 'Brennan\\u2019s'; }"],
    ['a match term inside a longer one counted', 'js/ui-backbar.js', " && !occ.some(function(p){ return p[2] !== o[2] && p[0] <= o[0] && p[1] >= o[1] && (p[1] - p[0]) > (o[1] - o[0]); })", ''],
    ['a house price drawn on a use row', 'js/ui-backbar.js', "+ '<h4 class=\"backbar-use-name\">' + esc(item.name) + '</h4>'", "+ '<h4 class=\"backbar-use-name\">' + esc(item.name) + (item.price ? ' ' + esc(item.price) : '') + '</h4>'"],
    ['Recall before you reveal drawn open', 'js/ui-backbar.js', "'<details class=\"backbar-recall\"><summary>'", "'<details class=\"backbar-recall\" open><summary>'"],
  ];
  let held = 0;
  for (const [name, file, from, to] of MUT) {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-backbar-'));
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
  if (problems.length) {
    for (const p of problems) console.error('    ' + p);
    process.exit(1);
  }
}
