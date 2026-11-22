/* Producers and flagships, in the Cask Atlas (Whisky & Brandy, 22 November
   2026): its gate, on tools/check-caskstyles.mjs's model.

     node tools/check-caskhouses.mjs              every check below; passes on a partial build and says so last
     node tools/check-caskhouses.mjs --release    the same, and refuses a data file whose meta says partial, whose
                                                  meta.unrefuted is above 0, or whose keys are not frozen
     node tools/check-caskhouses.mjs --mutations  then breaks the shipped files twenty-one ways, one at a time, and
                                                  expects red each time, from the check written for that rule (a
                                                  mutation that finds nothing to change, or that only another
                                                  check catches, is itself a failure)
     node tools/check-caskhouses.mjs --help

   The whole app is loaded from index.html's own script list (app.js and its
   boot included) into a sandbox with a small DOM harness: a document whose
   regions are strings, a history with real entries, back() and popstate, a
   location read from the entry, both storages in memory, and a tap that is
   the delegated click a real tap makes on the element found in the rendered
   markup (tools/check-caskstyles.mjs's harness). So what is held is the
   SHIPPED page, router, render() and acts.

   LEDGER_JS=<dir> points it at another copy's js/; the root is the folder
   above, and its index.html names the scripts. The roster, the fragments,
   the schema and the build stay this checkout's (tools/caskhouses/), and the
   copy's data file must be the source's byte for byte.

   A partial build (fewer groups than the roster, while the lanes write)
   skips only what needs the whole roster: the counts pinned in FROZEN and the
   none-lost half of the keys. Everything else holds on one group as it will
   on thirty-two.

   D1 the data is the build; every shipped group's fragment sound by schema.mjs
   D2 the roster's order; the counts pinned once whole   D3 the shipped files pure ASCII, the page's own voice, the stylesheet
   D4 nobody living on any page, no price, no house name, no dash   D5 every link resolves, is drawn as its door and lands; sources safe
   D6 the quiz: the round dealt 2,000 times
   W1 the cards and their keys; keys.v1.json   W2 kept apart from drinks, levels, Due today and the session
   W3 addresses, parents and Back through real taps   W4 rendering: the root, every group, every house
   W5 the doors in: the Atlas home, a chapter, a style, a shelf bottle, the Library
   W6 the deck through real taps and Today's cask study   W7 the quiz through the click and its one row
   W8 the Practise rows, search and key ownership */
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { loadContext, validateFragment, planProblems, livingIn, cardKey as schemaKey, KEY_PREFIX, CARD_KEY_RE, PICKS, CAPS,
  SUPERLATIVE_OURS, SELLING_OURS, AMERICAN_OURS, PRICE_OURS } from './caskhouses/schema.mjs';
import { DASH, SUPERLATIVE, VERDICT, PRICE, HOUSE_NAME, AMERICAN_MORE } from './backbar/schema.mjs';
import { SUPERLATIVE_MORE } from './caskstyles/schema.mjs';
import { AMERICAN } from './brew/schema.mjs';

const SELF = fileURLToPath(import.meta.url);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(SELF, 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const RELEASE = process.argv.includes('--release');
const LEDGER = join(dirname(SELF), '..');
const CH = join(LEDGER, 'tools', 'caskhouses');
const ROOT = process.env.LEDGER_JS ? dirname(resolve(process.env.LEDGER_JS)) : LEDGER;
const JS_DIR = process.env.LEDGER_JS ? resolve(process.env.LEDGER_JS) : join(LEDGER, 'js');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

/* The counts pinned for the whole build: thirty-two groups of five in the
   roster, two recall cards and two questions a house (BRIEF.md). Held only
   when every group is built; the roster itself must keep them always. */
const FROZEN = { groups: 32, houses: 160, cards: 320, questions: 320 };
const KEYS_FILE = join(CH, 'keys.v1.json');
const FIELDS_SHIPPED = ['key', 'group', 'family', 'producer', 'madeBy', 'style', 'chapter', 'shelf', 'library', 'say', 'place', 'year', 'yearIs',
  'bottle', 'table', 'story', 'others', 'traps', 'cards', 'quiz', 'sources'];
const KEY = (house, card) => KEY_PREFIX + house + '/' + card;

/* ---- the harness (tools/check-caskstyles.mjs's) ---------------------------------------- */
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };
function boot({ hash = '', local = {}, online = true } = {}) {
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
const foldName = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ---- the data, the plan and the Ledger, as the page and the schema see them ---- */
const A = boot();
await settle();
const g = A.g, run = A.run;
const esc = g('esc');
const slug = g('slugify');
const data = plain(g('caskHouseData')());
const meta = data.meta || {};
const groups = data.groups || [];
const houses = data.houses || [];
const plan = readJSON(join(CH, 'plan.json'));
const ctx = loadContext();
const PARTIAL = groups.length < plan.groups.length;
const byHouse = new Map(houses.map((h) => [h.key, h]));
const byGroup = new Map(groups.map((x) => [x.key, x]));
const planGroup = new Map(plan.groups.map((x, i) => [x.key, Object.assign({ index: i }, x)]));
const fresh = () => run("progress.cards = {}; progress.quizzes = []; progress.qa = {}; progress.levels = progress.levels || {}; saveProgress();");
const CHAPTERS = plain(g('CASK_CHAPTERS')) || [];
const STYLES = plain(g('caskStyleEntries') ? g('caskStyleEntries')() : []) || [];
const BOTTLES = plain(g('backbarEntries')()) || [];
const LIBRARY = plain(g('PRODUCERS')) || [];
const hrefRoot = '#/casks/houses';
const hrefGroup = (k) => '#/casks/houses/' + k;
const hrefHouse = (r) => '#/casks/houses/' + r.group + '/' + r.key;
const housesOf = (x) => x.houses.map((k) => byHouse.get(k)).filter(Boolean);
const own = (r) => [r.producer, r.madeBy, r.bottle && r.bottle.name].concat((r.others || []).map((o) => o.name)).concat((ctx.pickByKey.get(r.key) || { pick: {} }).pick.flagship || []).filter(Boolean);
const shelfIsFlagship = (r, b) => { const flag = ' ' + foldName(r.bottle.name) + ' '; return [b.name].concat(b.aka || []).some((n) => { const f = foldName(n); return f.length >= 3 && flag.indexOf(' ' + f + ' ') >= 0; }); };
const lands = (h) => { run("state.tab = 'home';"); if (!g('applyRoute')(h)) return false; run('navNormalise()'); return g('routeNow')().hash === h; };

/* ---- D: the data ------------------------------------------------------------------ */
await test('D1 the build: js/data-caskhouses.js and keys.v1.json are what tools/caskhouses/build-caskhouses.mjs writes from the fragments', () => {
  const r = spawnSync(process.execPath, [join(CH, 'build-caskhouses.mjs'), '--check'], { cwd: LEDGER, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout + r.stderr).trim().split('\n').slice(-6).join(' '));
  if (resolve(JS_DIR) !== resolve(join(LEDGER, 'js'))) assert.equal(readFileSync(join(JS_DIR, 'data-caskhouses.js'), 'utf8'), readFileSync(join(LEDGER, 'js', 'data-caskhouses.js'), 'utf8'), 'this copy\u2019s js/data-caskhouses.js is not the source\u2019s, byte for byte');
});
await test('D1 shape: the file holds meta, families, groups and houses; the roster is sound; every house carries the build\u2019s fields in order', () => {
  eq(Object.keys(data), ['meta', 'families', 'groups', 'houses']);
  eq(data.families, plan.families, 'the families are not the roster\u2019s');
  eq(planProblems(plan, ctx), [], 'tools/caskhouses/plan.json');
  assert.equal(meta.prefix, KEY_PREFIX, 'meta.prefix');
  eq(meta.roster, { groups: plan.groups.length, houses: plan.groups.reduce((n, x) => n + x.picks.length, 0) }, 'meta.roster');
  eq(meta.built, { groups: groups.length, houses: houses.length, cards: houses.reduce((n, h) => n + h.cards.length, 0), questions: houses.reduce((n, h) => n + h.quiz.length, 0), sources: houses.reduce((n, h) => n + h.sources.length, 0) }, 'meta.built');
  assert.equal(meta.partial, PARTIAL, 'meta.partial does not say what the file holds');
  assert.ok(groups.length > 0, 'no group at all');
  for (const h of houses) eq(Object.keys(h), FIELDS_SHIPPED, h.key + ': the fields are not the build\u2019s, in its order');
});
for (const x of groups) {
  await test('D1 schema: the fragment of ' + x.key + ' is sound by tools/caskhouses/schema.mjs', () => {
    const file = join(CH, 'fragments', x.key + '.json');
    assert.ok(existsSync(file), 'fragments/' + x.key + '.json is missing');
    eq(validateFragment(readJSON(file), ctx, x.key), []);
  });
}
await test('D2 the roster\u2019s order: the groups and their houses in plan.json\u2019s order, five a group, each house of its group, family and links copied from the roster', () => {
  const at = groups.map((x) => (planGroup.get(x.key) || { index: -1 }).index);
  assert.ok(at.every((i) => i >= 0), 'a group the roster does not hold');
  eq(at, at.slice().sort((a, b) => a - b), 'the groups are not in the roster\u2019s order');
  eq(houses.map((h) => h.key), groups.flatMap((x) => x.houses), 'the houses are not the groups\u2019 houses in order');
  for (const x of groups) {
    const p = planGroup.get(x.key);
    eq(x.houses, p.picks.map((k) => k.key), x.key + ': its five are not the roster\u2019s');
    assert.equal(x.houses.length, PICKS);
    eq([x.title, x.family, x.style, x.chapter], [p.title, p.family, p.style, p.chapter], x.key + ': title, family, style or chapter');
    for (const h of housesOf(x)) eq([h.group, h.family, h.style, h.chapter], [x.key, x.family, x.style, x.chapter], h.key + ': its group\u2019s fields');
  }
  houses.forEach((h) => { assert.equal(h.cards.length, CAPS.cards.n, h.key + ' cards'); assert.equal(h.quiz.length, CAPS.quiz.n, h.key + ' questions'); });
});
await test('D2 the counts: thirty-two groups of five in the roster always; the built counts pinned exact once the build is whole', () => {
  assert.equal(plan.groups.length, FROZEN.groups, 'the roster holds ' + plan.groups.length + ' groups');
  assert.equal(plan.groups.reduce((n, x) => n + x.picks.length, 0), FROZEN.houses, 'the roster\u2019s houses');
  if (PARTIAL) { notes.push('D2 the pinned counts wait for the whole roster: ' + groups.length + ' of ' + plan.groups.length + ' groups built'); return; }
  eq([groups.length, houses.length, houses.reduce((n, h) => n + h.cards.length, 0), houses.reduce((n, h) => n + h.quiz.length, 0)], [FROZEN.groups, FROZEN.houses, FROZEN.cards, FROZEN.questions]);
});
/* the shipped bytes */
const SHIPPED = { 'js/data-caskhouses.js': readFileSync(join(JS_DIR, 'data-caskhouses.js'), 'utf8'), 'js/ui-caskhouses.js': readFileSync(join(JS_DIR, 'ui-caskhouses.js'), 'utf8'),
  'css/caskhouses.css': readFileSync(join(ROOT, 'css', 'caskhouses.css'), 'utf8') };
const DASH_ESCAPES = /\\u201[2-5]|\\u2010|\\u2011|\\u2212/i;
/* in code a double hyphen is CSS's custom property; the dash it stands for is the spaced one */
const CODE_DASH = /[\u2010-\u2015\u2212]|&[mn]dash;|&#821[12];|&#x201[34];| \x2d\x2d /i;
await test('D3 the shipped files: pure ASCII, with no dash in any form and nothing escaped at or above U+2190', () => {
  for (const [f, src] of Object.entries(SHIPPED)) {
    const lit = [...src].find((c) => c.codePointAt(0) > 0x7e || (c.codePointAt(0) < 0x20 && c !== '\n' && c !== '\r' && c !== '\t'));
    assert.equal(lit, undefined, f + ' carries a literal U+' + (lit ? lit.codePointAt(0).toString(16).toUpperCase() : ''));
    assert.ok(!CODE_DASH.test(src), f + ' carries a dash (' + (src.match(CODE_DASH) || [])[0] + ')');
    assert.ok(!DASH_ESCAPES.test(src), f + ' escapes a dash (' + (src.match(DASH_ESCAPES) || [])[0] + ')');
    const high = [...src.matchAll(/\\u([0-9a-fA-F]{4})/g)].map((m) => parseInt(m[1], 16)).filter((cp) => cp >= 0x2190);
    eq(high, [], f + ' escapes a mark at or above U+2190');
  }
});
await test('D3 the voice: the page\u2019s own words are British and plain (no superlative, selling word, price or health talk), and no file of the page writes the house\u2019s name', () => {
  /* every literal the page writes, quoted or a template, for a page string need not be single quoted */
  const lits = [...SHIPPED['js/ui-caskhouses.js'].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] !== undefined ? m[1] : m[2]);
  const bad = [];
  for (const s of lits) {
    const am = s.match(AMERICAN) || s.match(AMERICAN_MORE) || s.match(AMERICAN_OURS);
    if (am) bad.push('American "' + am[0] + '"');
    const sup = s.match(SUPERLATIVE) || s.match(SUPERLATIVE_MORE) || s.match(SUPERLATIVE_OURS) || s.match(SELLING_OURS);
    if (sup) bad.push('selling "' + sup[0] + '"');
    if (PRICE.test(s)) bad.push('price "' + s.match(PRICE)[0] + '"');
    if (VERDICT.test(s)) bad.push('allergen or health talk "' + s.match(VERDICT)[0] + '"');
  }
  eq(bad, [], 'js/ui-caskhouses.js');
  for (const f of Object.keys(SHIPPED)) assert.ok(!HOUSE_NAME.test(SHIPPED[f]), f + ' names the house');
});
await test('D3 the stylesheet: css/caskhouses.css uses the Ledger\u2019s tokens, no new colour, font or picture, 44px controls, the reading face, the brass rule and its night service rules, inside its own namespace', () => {
  const css = SHIPPED['css/caskhouses.css'];
  const others = ['ledger.css', 'house.css', 'service-day.css', 'bar-compass.css', 'fall-menu.css', 'house-menu.css', 'method-studies.css', 'brew.css', 'backbar.css', 'casks.css', 'caskstyles.css']
    .map((f) => { try { return readFileSync(join(ROOT, 'css', f), 'utf8'); } catch (e) { return ''; } }).join('\n');
  for (const v of new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]))) assert.ok(new RegExp('--' + v + '\\s*:').test(others), 'the token --' + v + ' is defined nowhere in the Ledger');
  for (const c of new Set(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [])) assert.ok(others.includes(c), 'a new colour ' + c);
  assert.ok(!/url\(|@font-face|@import|<svg|data:image/i.test(css), 'a picture or a font');
  for (const m of css.matchAll(/font(?:-family)?\s*:\s*([^;}]*)/g)) {
    const fam = m[1].replace(/\s+/g, '');
    if (/^(?:inherit|[\d.]+(?:rem|em|px))$/.test(fam)) continue;
    assert.ok(/var\(--house-display,Georgia,serif\)$|^var\(--house-reading\)$/.test(fam), 'a font of its own: ' + m[1]);
  }
  for (const sel of ['.caskhouse-practice .btn', '.caskhouse-links .btn', '.caskhouse-pager .btn', '.caskhouse-read-link', '.caskhouse-run-door', '.caskhouse-recall summary', '.caskhouse-sources summary', '.caskhouse-sources a', '.cask-atlas a.caskhouse-grow', '.caskhouse-search input'])
    assert.ok(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{[^}]*min-height:4[4-9]px').test(css), sel + ' has no 44px floor');
  assert.ok(/html\[data-service="night"\] [^{]*\.caskhouse-/.test(css), 'no night service rule');
  assert.ok(/\.caskhouse-page \.caskhouse-panel p\.caskhouse-tline\{[^}]*font-family:var\(--house-reading\)/.test(css), 'the table line is not in the reading face');
  assert.ok(/\.caskhouse-table\{[^}]*border-top:2px solid var\(--brass\)/.test(css), 'At the table sits under no brass rule');
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)) for (const sel of m[2].split(',')) {
    if (/^\s*(?:html\[data-service="night"\]\s*)?\.(?:caskhouse-|cask-atlas)/.test(sel) || /^\s*p\.caskhouse-/.test(sel)) continue;
    assert.fail('a rule outside the .caskhouse namespace: ' + sel.trim());
  }
});
/* every page the layer draws, with its text */
const PAGES = [['the root', () => g('caskHouseRootHTML')(), null]]
  .concat(groups.map((x) => ['the group ' + x.key, () => g('caskHouseGroupHTML')(g('caskHouseGroup')(x.key)), null]))
  .concat(houses.map((h) => ['the house ' + h.key, () => g('caskHousePageHTML')(g('caskHouseRecord')(h.key)), h]))
  /* and what the page writes onto other pages: the Atlas home's section, a chapter's and a Library producer's doors, a card's face */
  .concat([['the Atlas home\u2019s section', () => g('caskHouseHomeHTML')(), null]])
  .concat(CHAPTERS.map((c) => ['the chapter ' + c.id + '\u2019s doors', () => g('caskHouseChapterDoorsHTML')(c.id), null]))
  .concat(LIBRARY.map((p) => ['the Library entry ' + p.name + '\u2019s doors', () => g('caskHouseLibraryDoorsHTML')(p.name), null]))
  .concat(houses.slice(0, 1).map((h) => ['a card face', () => { const c = g('caskHouseCards')()[0]; return g('caskHouseRecallHTML')(c, false, '', '', '', '') + g('caskHouseRecallHTML')(c, true, '', '', '', ''); }, h]));
await test('D4 every page: nobody living named, no price or currency, no house name, no dash, no mark at or above U+2190, no picture', () => {
  const bad = [];
  for (const [name, draw, h] of PAGES) {
    const text = strip(draw());
    const mine = h ? own(h) : [];
    livingIn(text, ctx, mine).forEach((n) => bad.push(name + ': names ' + n));
    if (/[$\u00a3\u20ac\u00a5]/.test(text)) bad.push(name + ': a currency sign');
    /* and no price word, in the page's own words or a record's: whatever writes it, it is on the page */
    const pr = text.match(PRICE) || text.match(PRICE_OURS);
    if (pr) bad.push(name + ': a price word (' + pr[0] + ')');
    if (HOUSE_NAME.test(text)) bad.push(name + ': names the house');
    if (DASH.test(text)) bad.push(name + ': a dash (' + text.match(DASH)[0] + ')');
    if ([...text].some((c) => c.codePointAt(0) >= 0x2190)) bad.push(name + ': a mark at or above U+2190');
    if (/<(?:img|iframe|video|picture|source|svg|object|embed)\b|url\(/i.test(draw())) bad.push(name + ': a picture');
  }
  eq(bad, []);
});
await test('D5 links: every style, chapter, shelf bottle and Library producer a house carries resolves, is drawn as its door and lands; no other link kind; the group\u2019s doors too', () => {
  const bad = [];
  for (const h of houses) {
    const out = g('caskHousePageHTML')(g('caskHouseRecord')(h.key));
    const want = [];
    if (h.style) { if (!STYLES.some((s) => s.id === h.style)) bad.push(h.key + ': no style ' + h.style); else want.push(['caskhouse-style-door', '#/casks/style/' + h.style]); }
    if (h.chapter) { if (!CHAPTERS.some((c) => c.id === h.chapter)) bad.push(h.key + ': no chapter ' + h.chapter); else want.push(['caskhouse-chapter-door', '#/casks/' + h.chapter]); }
    if (h.library) { const p = LIBRARY.find((x) => x.name === h.library); if (!p) bad.push(h.key + ': no Library producer ' + h.library); else want.push(['caskhouse-library-door', '#/producers/' + slug(p.name)]); }
    if (h.shelf) { if (!BOTTLES.some((b) => b.id === h.shelf && b.group !== 'confirm')) bad.push(h.key + ': no shelf bottle ' + h.shelf); else want.push(['caskhouse-bottle', '#/menu/backbar/' + h.shelf]); }
    for (const [cls, href] of want) {
      if (!out.includes('class="btn btn-ghost ' + cls + '" href="' + href + '"')) bad.push(h.key + ': the door ' + href + ' is not drawn');
      else if (!lands(href)) bad.push(h.key + ': ' + href + ' does not land');
    }
    if (!h.shelf && /id="caskhouse-p-shelf"/.test(out)) bad.push(h.key + ': On the shelf drawn empty');
    if (!want.some((w) => w[0] !== 'caskhouse-bottle') && /id="caskhouse-p-ledger"/.test(out)) bad.push(h.key + ': In the Ledger drawn empty');
    for (const m of out.matchAll(/<a\b[^>]*href="([^"]+)"/g)) if (!/^#\/(?:casks|menu\/backbar|producers)\//.test(m[1]) && !/^https:\/\//.test(m[1])) bad.push(h.key + ': a link to ' + m[1]);
  }
  for (const x of groups) {
    const out = g('caskHouseGroupHTML')(g('caskHouseGroup')(x.key));
    if (x.style && !out.includes('class="btn btn-ghost caskhouse-style-door" href="#/casks/style/' + x.style + '"')) bad.push(x.key + ': the group draws no door to its style');
    if (x.chapter && !out.includes('class="btn btn-ghost caskhouse-chapter-door" href="#/casks/' + x.chapter + '"')) bad.push(x.key + ': the group draws no door to its chapter');
    if (!x.style && /caskhouse-style-door/.test(out)) bad.push(x.key + ': a style door with no style');
    for (const m of out.matchAll(/<a\b[^>]*href="([^"]+)"/g)) if (!/^#\/casks\//.test(m[1])) bad.push(x.key + ': a link to ' + m[1]);
  }
  eq(bad, []);
});
await test('D5 sources: https only, each opening a new tab with noopener, drawn closed, and an unsafe address never drawn', () => {
  for (const h of houses) {
    const out = g('caskHouseSourcesHTML')(g('caskHouseRecord')(h.key));
    for (const s of h.sources) assert.match(s.url, /^https:\/\//, h.key);
    for (const m of out.matchAll(/<a\b[^>]*>/g)) assert.ok(/href="https:/.test(m[0]) && /target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0]), h.key + ': ' + m[0]);
    assert.equal(count(out, /<a\b/g), h.sources.length, h.key + ': the source links');
    assert.ok(/^<details class="caskhouse-sources"><summary>Sources<\/summary>/.test(out), h.key + ': Sources are not drawn closed');
  }
  const bad = g('caskHouseSourcesHTML')({ sources: [{ title: 'A fixture', url: 'javascript:alert(1)' }, { title: 'Plain', url: 'http://example.com/' }] });
  assert.ok(!/javascript:|http:\/\//.test(bad), 'an unsafe url is drawn');
});
await test('D6 the quiz: caskHouseQuizRound dealt 2,000 times deals ten (or every question), round robin across the groups, no house twice while houses remain, every ckey a card, no qkey, the authored answer, positions spread', () => {
  run("caskState().houseQuiz = ''");
  const asked = houses.filter((h) => h.quiz.length);
  const want = Math.min(10, asked.reduce((n, h) => n + h.quiz.length, 0));
  const pos = [0, 0, 0, 0];
  let total = 0;
  for (let r = 0; r < 2000; r++) {
    const round = plain(g('caskHouseQuizRound')());
    assert.equal(round.length, want, 'round ' + r + ' dealt ' + round.length);
    assert.equal(new Set(round.map((q) => q.prompt)).size, round.length, 'a question twice in one round');
    if (asked.length >= want) assert.equal(new Set(round.map((q) => q.caskHouseKey)).size, round.length, 'a house twice while houses remain');
    const per = {};
    round.forEach((q) => { const k = byHouse.get(q.caskHouseKey).group; per[k] = (per[k] || 0) + 1; });
    for (const a of groups) for (const b of groups) {
      const left = housesOf(b).length - (per[b.key] || 0);
      if (left > 0) assert.ok((per[a.key] || 0) <= (per[b.key] || 0) + 1, 'not round robin: ' + JSON.stringify(per));
    }
    for (const q of round) {
      assert.ok(!('qkey' in q), 'a qkey');
      const h = byHouse.get(q.caskHouseKey);
      assert.ok(h.cards.some((c) => c.key === q.ckey), 'the ckey ' + q.ckey + ' is not the house\u2019s card');
      assert.ok(g('cardByKey')(q.ckey), 'the ckey ' + q.ckey + ' is no card');
      const src = h.quiz.find((x) => x.q === q.prompt);
      assert.ok(src && src.options[src.a] === q.answer && src.ckey === q.ckey, 'the answer or the key is not the authored one');
      assert.equal(q.options.length, 4);
      const i = q.options.indexOf(q.answer);
      assert.ok(i >= 0, 'the answer is not an option');
      pos[i]++; total++;
    }
  }
  const share = pos.map((p) => p / total);
  assert.ok(share.every((s) => s >= 0.2 && s <= 0.3), 'answer positions ' + share.map((s) => (s * 100).toFixed(1) + '%').join(' '));
});

/* ---- W: the wiring ------------------------------------------------------------------ */
const cards = plain(g('caskHouseCards')());
await test('W1 cards: two a house, src Cask Houses, keyed as schema.mjs keys them, read back by cardByKey, studied at the house, an unknown key none', () => {
  assert.equal(cards.length, houses.length * CAPS.cards.n);
  const keys = cards.map((c) => g('cardKey')(c));
  assert.equal(new Set(keys).size, keys.length, 'a key twice');
  for (const c of cards) {
    const h = byHouse.get(c.itemId), shipped = h.cards.find((x) => x.id === c.drillId);
    assert.equal(c.src, 'Cask Houses');
    assert.equal(g('cardKey')(c), shipped.key, c.itemId + ': the page\u2019s key is not the shipped one');
    assert.equal(shipped.key, schemaKey(c.itemId, c.drillId), 'the shipped key and schema.mjs disagree');
    assert.match(shipped.key, CARD_KEY_RE);
    eq([c.name, c.back, c.houseGroup], [shipped.prompt, shipped.answer, h.group]);
    assert.equal(plain(g('cardByKey')(shipped.key)).caskHouseKey, c.caskHouseKey);
    assert.equal(g('studyHashOf')(shipped.key), hrefHouse(h));
    eq(c.spec, []);
  }
  assert.equal(g('cardByKey')(KEY('no-such-house', 'card')), null);
});
await test('W1 keys: keys.v1.json holds every shipped key, none twice; once frozen, a built group keeps every frozen key, and the whole build loses none', () => {
  const file = readJSON(KEYS_FILE);
  assert.ok(Array.isArray(file.keys) && typeof file.frozen === 'boolean', 'keys.v1.json is { about, frozen, keys }');
  file.keys.forEach((k) => assert.match(k, CARD_KEY_RE));
  assert.equal(new Set(file.keys).size, file.keys.length, 'a key twice');
  const keys = houses.flatMap((h) => h.cards.map((c) => c.key));
  eq(keys.filter((k) => !file.keys.includes(k)), [], 'a shipped key keys.v1.json does not hold');
  houses.forEach((h) => h.quiz.forEach((q) => assert.ok(h.cards.some((c) => c.key === q.ckey), h.key + '.' + q.id + ': its ckey is no card of the house')));
  if (!file.frozen) { notes.push('W1 keys.v1.json is not frozen yet (the integrator freezes it from the whole build)'); return; }
  const builtPicks = new Set(houses.map((h) => h.key));
  eq(file.keys.filter((k) => builtPicks.has(k.slice(KEY_PREFIX.length).split('/')[0]) && !keys.includes(k)), [], 'a frozen key of a built house is gone');
  if (PARTIAL) { notes.push('W1 none-lost of the unbuilt groups waits for the whole build'); return; }
  eq(file.keys.filter((k) => !keys.includes(k)), [], 'a frozen key is gone');
});
await test('W2 kept apart: out of allDrinks, the academic modes, Due today, the session and the levels; the decks deal only their own cards', () => {
  assert.ok(!g('allDrinks')().some((d) => d.src === 'Cask Houses'));
  const modes = g('FC_MODES');
  const at = modes.findIndex((m) => m[0] === 'caskhouses');
  assert.ok(at > 0 && modes[at - 1][0] === 'caskstyles', 'the caskhouses mode is not right after caskstyles');
  const live = g('caskHouseCards')();
  for (const m of modes) if (m[0] !== 'caskhouses') assert.ok(live.every((c) => !m[3](c)), 'the mode ' + m[0] + ' fits a house card');
  assert.ok(live.every((c) => modes[at][3](c)));
  fresh();
  const now = Date.now();
  cards.forEach((c) => { g('progress').cards[KEY(c.itemId, c.drillId)] = { r: 0, w: 1, reps: 0, last: now - 2 * 86400000, due: now - 86400000 }; });
  assert.ok(g('dueToday')().deck.every((d) => d.src !== 'Cask Houses'), 'Due today deals a house card');
  const parts = g('sessionDeckParts')();
  assert.ok(parts.dueDeck.concat(parts.newDeck).every((d) => d.src !== 'Cask Houses'), 'the session deals a house card');
  assert.ok(!/Cask Houses/.test(JSON.stringify(g('LEVEL_ITEMS'))), 'a level holds a house item');
  const def = g('deckDef')('caskhouses');
  assert.equal(def.preset.level, undefined);
  eq(Array.from(def.preset.deckModes), ['caskhouses']);
  assert.equal(def.preset.only.length, cards.length);
  assert.ok(def.preset.only.every((c) => c.src === 'Cask Houses'), 'the deck deals another card');
  assert.equal(g('deckDef')('caskhouses:again').preset.only.length, cards.length, 'every card due is in Due or missed');
  for (const x of groups) {
    const gd = g('deckDef')('caskhouses:' + x.key);
    eq(gd.preset.only.map((c) => c.caskHouseKey).sort(), housesOf(x).flatMap((h) => h.cards.map((c) => h.key + '/' + c.id)).sort(), x.key + ': the group\u2019s deck');
  }
  fresh();
  assert.equal(g('deckDef')('caskhouses:again').preset.only.length, 0, 'Due or missed deals an unseen card');
  assert.equal(g('deckDef')('caskhouses:nope'), null);
});
await test('W2 kept apart: grading a house card writes its key alone (no quiz row, no level, qa or menu), and dealing a round writes no card and banks nothing', () => {
  fresh();
  run("progress.qa = { 'fixture-q': { r: 2, w: 1 } }; progress.levels = { '1': { fixture: true } };");
  const lp = () => JSON.stringify([1, 2, 3, 4].map((n) => g('levelProgress')(n)));
  const before = { lp: lp(), qa: JSON.stringify(g('progress').qa), levels: JSON.stringify(g('progress').levels), bar: JSON.stringify(g('progress').bar), first: g('firstUnmetLevel')() };
  assert.ok(g('openDeck')('caskhouses'));
  assert.ok(g('startDeckRun')('caskhouses'));
  const c = run('state.fc.deck[0]');
  run('state.fc.flipped = true');
  g('recordCard')(true);
  eq(Object.keys(g('progress').cards), [g('cardKey')(c)]);
  eq(plain(g('progress').quizzes), [], 'a card wrote a quiz row');
  assert.equal(lp(), before.lp, 'level progress moved');
  assert.equal(JSON.stringify(g('progress').qa), before.qa, 'qa moved');
  assert.equal(JSON.stringify(g('progress').levels), before.levels, 'levels moved');
  assert.equal(JSON.stringify(g('progress').bar), before.bar, 'the menu moved');
  assert.equal(g('firstUnmetLevel')(), before.first);
  fresh();
  run("caskState().houseQuiz = ''");
  const round = g('buildRound')('caskhouses');
  assert.ok(round.length > 0, 'the round deals nothing');
  assert.ok(round.every((q) => !q.qkey && q.ckey.indexOf(KEY_PREFIX) === 0), 'a question banked or keyed elsewhere');
  eq(Object.keys(g('progress').cards), [], 'dealing a round wrote a card');
});
await test('W3 addresses: the root, every group and every house round-trip; each climbs house, group, root, the Atlas home, Home; bad addresses land on the parent; the Atlas\u2019s own words still read as theirs', () => {
  const climb = (start) => {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(start), start + ' is not read');
    run('navNormalise()');
    const walk = [g('routeNow')().hash];
    for (let i = 0; i < 6 && g('parentTab')(); i++) { g('applyParent')(); run('navNormalise()'); walk.push(g('routeNow')().hash); }
    return walk;
  };
  eq(climb(hrefRoot), [hrefRoot, '#/casks', '#/home'], 'the root');
  for (const x of groups) eq(climb(hrefGroup(x.key)), [hrefGroup(x.key), hrefRoot, '#/casks', '#/home'], x.key);
  for (const h of houses) eq(climb(hrefHouse(h)), [hrefHouse(h), hrefGroup(h.group), hrefRoot, '#/casks', '#/home'], h.key);
  const x0 = groups[0], h0 = housesOf(x0)[0];
  const other = groups.find((x) => x.key !== x0.key);
  const bads = [[hrefGroup(x0.key) + '/no-such-house', hrefGroup(x0.key)], ['#/casks/houses/no-such-group', hrefRoot], ['#/casks/houses/no-such-group/' + h0.key, hrefRoot],
    ['#/casks/houses/%E0%A4%A', hrefRoot], [hrefGroup(x0.key) + '/%E0%A4%A', hrefGroup(x0.key)], ['#/casks/houses/', hrefRoot]];
  if (other) bads.push([hrefGroup(other.key) + '/' + h0.key, hrefGroup(other.key)]);
  for (const [from, to] of bads) eq(climb(from)[0], to, from + ' does not land on its parent');
  for (const h of ['#/casks/style/' + (STYLES[0] || {}).id, '#/casks/' + CHAPTERS[0].id, '#/casks', '#/casks/practice/all']) assert.ok(lands(h), h + ' no longer reads as itself');
});
await test('W3 Back through real taps: the Atlas home\u2019s door, a group\u2019s row, a house\u2019s card, then one Back a screen to Home; a cold house walks up by replaces; a revealed card keeps its place', async () => {
  const x0 = groups[0], h0 = housesOf(x0)[0];
  const B = boot({ hash: '#/casks' });
  await settle();
  let at = B.state().at;
  for (const [want, key] of [[{ id: 'caskhouse-root-door' }, 'casks/houses'], [{ id: 'caskhouse-g-' + x0.key }, 'casks/houses/' + x0.key], [{ id: 'caskhouse-h-' + h0.key }, 'casks/houses/' + x0.key + '/' + h0.key]]) {
    assert.ok(B.tap(want), 'no ' + JSON.stringify(want) + ' drawn');
    await settle();
    eq([B.state().key, B.state().at], [key, at + 1], JSON.stringify(want) + ' is not one push');
    assert.equal(count(B.view(), /data-act="back"/g), 1, 'one Back on ' + key);
    at = B.state().at;
  }
  const walk = [];
  for (let i = 0; i < 4; i++) { B.tap({ 'data-act': 'back' }); await settle(); walk.push(B.state().key); }
  eq(walk, ['casks/houses/' + x0.key, 'casks/houses', 'casks', 'home']);
  const C = boot({ hash: hrefHouse(h0) });
  await settle();
  eq([C.state().key, C.state().d], ['casks/houses/' + x0.key + '/' + h0.key, 0]);
  const up = [];
  for (let i = 0; i < 4; i++) { C.tap({ 'data-act': 'back' }); await settle(); up.push(C.state().key); }
  eq(up, ['casks/houses/' + x0.key, 'casks/houses', 'casks', 'home']);
  assert.equal(C.history.length, 1, 'walking up a cold house grew the history');
  const N = boot({ hash: hrefGroup(x0.key) + '/no-such-house' });
  await settle();
  eq([N.state().key, N.history.length], ['casks/houses/' + x0.key, 1], 'a bad house');
  /* Previous and Next stay in the group, and Back returns along them */
  const P = boot({ hash: hrefHouse(h0) });
  await settle();
  const h1 = housesOf(x0)[1];
  if (h1) {
    assert.ok(P.tap({ class: 'btn btn-ghost caskhouse-next', href: hrefHouse(h1) }), 'Next is not the group\u2019s second house');
    await settle();
    P.tap({ 'data-act': 'back' }); await settle();
    assert.equal(P.state().key, 'casks/houses/' + x0.key + '/' + h0.key, 'Back from Next');
  }
});
const SECTIONS = ['table', 'flagship', 'story', 'others', 'traps', 'shelf', 'ledger', 'recall'];
await test('W4 the root: its heading and counts, Study (every card, the cards due, the quiz, the misses), the search, the six families in order, every built group a row with its style and its five labels, no picture', () => {
  run("caskHouseOpen('', '')");
  const out = g('renderCasks')();
  assert.ok(/^<article class="cask-atlas caskhouse-page caskhouse-root">/.test(out), 'not drawn as the root');
  assert.ok(out.includes('<h2 tabindex="-1">Producers and flagships</h2>'), 'the heading');
  assert.ok(strip(out).includes(groups.length + (PARTIAL ? ' of ' + plan.groups.length + ' groups' : groups.length === 1 ? ' group' : ' groups') + ' \u00b7 ' + houses.length + ' houses'), 'the count of what is built');
  const study = out.slice(out.indexOf('id="caskhouse-p-study"'), out.indexOf('id="caskhouse-p-search"'));
  assert.ok(study.includes('data-act="caskhouse-practise" data-deck="caskhouses"') && study.includes('data-act="deck" data-deck="caskhouses:again"') && study.includes('data-act="quiz-go" data-m="caskhouses">'), 'Study: every card, due or missed, the quiz');
  assert.ok(/<label for="caskhouse-q">[^<]+<\/label><input[^>]*id="caskhouse-q"/.test(out), 'the search is not labelled');
  const heads = [...out.matchAll(/class="caskhouse-family-h" id="caskhouse-f-\d+">([^<]+) </g)].map((m) => m[1]);
  eq(heads, plan.families, 'the six families in order');
  const rows = [...out.matchAll(/class="caskhouse-grow" id="caskhouse-g-([a-z0-9-]+)" href="([^"]+)"/g)];
  eq(rows.map((m) => m[1]), plan.families.flatMap((f) => groups.filter((x) => x.family === f).map((x) => x.key)), 'every built group a row, family by family');
  rows.forEach((m) => assert.equal(m[2], hrefGroup(m[1])));
  for (const x of groups) {
    const one = out.slice(out.indexOf('id="caskhouse-g-' + x.key + '"'), out.indexOf('</a>', out.indexOf('id="caskhouse-g-' + x.key + '"')));
    const st = STYLES.find((s) => s.id === x.style);
    if (st) assert.ok(one.includes('The style: ' + esc(st.name)), x.key + ': the row does not name its style');
    housesOf(x).forEach((h) => assert.ok(one.includes(esc(h.producer)), x.key + ': the row does not name ' + h.producer));
  }
  /* the search finds a label, a flagship and a distillery, and says when it finds nothing */
  const h0 = houses[0];
  for (const q of [h0.producer, h0.bottle.name, h0.madeBy].filter(Boolean)) {
    run('caskState().houseQ = ' + JSON.stringify(q.toLowerCase()));
    assert.ok(g('caskHouseResultsHTML')().includes('id="caskhouse-s-' + h0.key + '" href="' + hrefHouse(h0) + '"'), 'the search misses ' + q);
  }
  run("caskState().houseQ = 'zzzz no such label'");
  assert.ok(/role="status">0 labels found/.test(g('caskHouseResultsHTML')()), 'no empty count');
  run("caskState().houseQ = ''");
});
await test('W4 every group: its heading, the line on its style, the five houses as cards in the roster\u2019s order (label, flagship, table line), each a door, then its deck and its quiz', () => {
  for (const x of groups) {
    run('caskHouseOpen(' + JSON.stringify(x.key) + ", '')");
    const out = g('renderCasks')();
    assert.ok(out.includes('<h2 tabindex="-1">' + esc(x.title) + '</h2>'), x.key + ': the heading');
    const st = STYLES.find((s) => s.id === x.style);
    if (st) assert.ok(out.includes('<p class="caskhouse-styleline">' + esc(st.lines.s10) + '</p>'), x.key + ': the line on its style');
    const doors = [...out.matchAll(/class="caskhouse-card" id="caskhouse-h-([a-z0-9-]+)" href="([^"]+)"/g)];
    eq(doors.map((m) => m[1]), x.houses, x.key + ': the cards are not the five in order');
    for (const h of housesOf(x)) {
      const one = out.slice(out.indexOf('id="caskhouse-h-' + h.key + '"'), out.indexOf('</a>', out.indexOf('id="caskhouse-h-' + h.key + '"')));
      assert.ok(one.includes(esc(h.producer)) && one.includes(esc(h.bottle.name)) && one.includes(esc(h.table)), h.key + ': the card\u2019s label, flagship or table line');
      assert.ok(out.includes('href="' + hrefHouse(h) + '"'));
    }
    assert.ok(out.includes('data-act="caskhouse-practise" data-deck="caskhouses:' + x.key + '"') && out.includes('data-act="quiz-go" data-m="caskhouses" data-group="' + x.key + '"'), x.key + ': the group\u2019s deck and quiz');
    assert.ok(out.indexOf('id="caskhouse-p-gstudy"') > out.indexOf('id="caskhouse-p-houses"'), x.key + ': the study after the houses');
  }
});
await test('W4 every house in the shelf\u2019s order of sections: the label, Say it, the place, who makes it, the year; At the table; The flagship as a labelled list; the story, other bottlings, traps, the shelf, In the Ledger, Recall and Sources closed, Previous and Next in its group last; nothing written', () => {
  fresh();
  const before = JSON.stringify(g('progress'));
  for (const h of houses) {
    const out = g('caskHousePageHTML')(g('caskHouseRecord')(h.key));
    assert.ok(/^<article class="cask-atlas caskhouse-page caskhouse-house">/.test(out), h.key + ': not drawn as a house');
    const head = out.slice(0, out.indexOf('</header>'));
    assert.ok(head.includes('<h2 tabindex="-1">' + esc(h.producer) + '</h2>'), h.key + ': the label is not the heading');
    assert.equal(head.includes('Say it</span> '), !!h.say, h.key + ': Say it');
    if (h.say) assert.ok(head.includes('Say it</span> ' + esc(h.say)));
    assert.ok(head.includes('The place</span> ' + esc(h.place)), h.key + ': the place');
    assert.equal(head.includes('Made by</span> ' + esc(h.madeBy)), !!h.madeBy, h.key + ': who makes it');
    assert.equal(head.includes('The year</span> ' + esc(h.year) + ', the year it was ' + (h.yearIs === 'first released' ? 'first released' : 'founded')), !!h.year, h.key + ': the year');
    const want = SECTIONS.filter((s) => (s !== 'shelf' || h.shelf) && (s !== 'others' || h.others.length) && (s !== 'traps' || h.traps.length) && (s !== 'ledger' || h.style || h.chapter || LIBRARY.some((p) => p.name === h.library)));
    const at = want.map((s) => out.indexOf('id="caskhouse-p-' + s + '"'));
    assert.ok(at.every((i) => i >= 0), h.key + ': a section is missing ' + want.filter((s, i) => at[i] < 0).join(', '));
    eq(at, at.slice().sort((a, b) => a - b), h.key + ': the sections are out of order');
    eq([...out.matchAll(/id="caskhouse-p-([a-z]+)"/g)].map((m) => m[1]), want, h.key + ': a section drawn that should not be');
    assert.ok(out.includes('<p class="caskhouse-tline">' + esc(h.table) + '</p>'), h.key + ': the table line is not set as the tableside line');
    const fl = out.slice(at[want.indexOf('flagship')], at[want.indexOf('story')]);
    assert.ok(fl.includes('<p class="caskhouse-bottle-name">' + esc(h.bottle.name) + '</p>'), h.key + ': the flagship\u2019s name');
    const rows = [...fl.matchAll(/<dt>([^<]+)<\/dt><dd>/g)].map((m) => m[1]);
    eq(rows.slice(0, 7), ['Class', 'Made from', 'Distilled', 'Wood', 'Strength', 'How it tastes', 'How it is poured'], h.key + ': the flagship\u2019s list');
    for (const k of ['class', 'mash', 'still', 'wood', 'strength', 'taste', 'pour']) assert.ok(fl.includes('<dd>' + esc(h.bottle[k]) + '</dd>'), h.key + ': bottle.' + k);
    assert.ok(fl.includes('The label\u2019s terms') && h.bottle.label.every((x) => fl.includes('<dt>' + esc(x.term) + '</dt><dd>' + esc(x.means) + '</dd>')), h.key + ': the label\u2019s terms');
    assert.ok(out.includes(esc(h.story)), h.key + ': the story');
    h.others.forEach((o) => assert.ok(out.includes(esc(o.name)) && out.includes(esc(o.note)), h.key + ': ' + o.name));
    h.traps.forEach((t) => assert.ok(out.includes('<li>' + esc(t) + '</li>'), h.key + ': a trap'));
    if (h.shelf) {
      const b = BOTTLES.find((x) => x.id === h.shelf);
      const shelf = out.slice(out.indexOf('id="caskhouse-p-shelf"'));
      assert.equal(shelf.includes('It is not the flagship above.'), !shelfIsFlagship(h, b), h.key + ': the shelf does not say plainly whether its bottle is the flagship');
    }
    h.cards.forEach((c) => assert.ok(out.includes('<details class="caskhouse-recall"><summary>' + esc(c.prompt) + '</summary>'), h.key + ': a recall card'));
    assert.ok(!/<details class="caskhouse-recall" open/.test(out) && !/<details class="caskhouse-sources" open/.test(out), h.key + ': Recall or Sources drawn open');
    assert.ok(out.indexOf('<details class="caskhouse-sources">') > at[at.length - 1], h.key + ': Sources are not after Recall');
    const list = housesOf(byGroup.get(h.group)), i = list.indexOf(h), prev = list[i - 1], next = list[i + 1];
    const pager = out.indexOf('<nav class="caskhouse-pager"') >= 0 ? out.slice(out.indexOf('<nav class="caskhouse-pager"')) : '';
    assert.equal(!!prev, pager.includes('class="btn btn-ghost caskhouse-prev" href="' + (prev ? hrefHouse(prev) : '') + '"'), h.key + ': Previous');
    assert.equal(!!next, pager.includes('class="btn btn-ghost caskhouse-next" href="' + (next ? hrefHouse(next) : '') + '"'), h.key + ': Next');
    eq([...pager.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((x) => !list.some((y) => hrefHouse(y) === x)), [], h.key + ': Previous or Next leaves the group');
    if (prev || next) assert.ok(out.indexOf('<nav class="caskhouse-pager"') > out.indexOf('<details class="caskhouse-sources">'), h.key + ': Previous and Next are not last');
  }
  assert.equal(JSON.stringify(g('progress')), before, 'rendering wrote progress');
});
await test('W5 the doors in: the Atlas home\u2019s section after the styles\u2019 and before the comparison, a door to the root and to every built group', () => {
  run("caskOpen('');");
  const out = g('renderCasks')();
  const at = out.indexOf('id="caskhouse-home"');
  assert.ok(at > out.indexOf('id="caskstyle-home"') && at < out.indexOf('class="cask-comparison"'), 'the section is not after the styles\u2019 and before the comparison');
  assert.ok(out.includes('id="caskhouse-root-door" href="' + hrefRoot + '"'), 'the door to the root');
  eq([...out.matchAll(/id="caskhouse-hd-([a-z0-9-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]), groups.map((x) => [x.key, hrefGroup(x.key)]), 'a door to every built group');
});
await test('W5 the doors in: a chapter draws Five producers for each group that hangs on it and on no style, none where none does (and a fixture group on a chapter proves the door)', () => {
  const bad = [];
  for (const c of CHAPTERS) {
    const out = g('caskChapterHTML')(g('caskChapter')(c.id));
    const want = groups.filter((x) => x.chapter === c.id && !x.style).map((x) => x.key);
    const doors = [...out.matchAll(/class="btn btn-ghost caskhouse-door" id="caskhouse-cd-([a-z0-9-]+)" href="([^"]+)"/g)];
    if (JSON.stringify(doors.map((m) => m[1])) !== JSON.stringify(want)) bad.push(c.id + ': doors ' + doors.map((m) => m[1]).join(',') + ', not ' + want.join(','));
    if (!want.length && /caskhouse-doors-h/.test(out)) bad.push(c.id + ': Five producers drawn with no group');
  }
  const chapter = CHAPTERS.find((c) => !groups.some((x) => x.chapter === c.id && !x.style)) || CHAPTERS[0];
  run('CASK_HOUSES.groups.push({ key: "fixture-chapter-group", title: "A fixture group", family: "Brandy", style: "", chapter: ' + JSON.stringify(chapter.id) + ', houses: [] })');
  try {
    const out = g('caskChapterHTML')(g('caskChapter')(chapter.id));
    if (!out.includes('class="btn btn-ghost caskhouse-door" id="caskhouse-cd-fixture-chapter-group" href="#/casks/houses/fixture-chapter-group">Five producers: A fixture group</a>')) bad.push(chapter.id + ': a group on the chapter with no style draws no door');
    if (!(out.indexOf('id="caskhouse-doors-h"') > out.indexOf('class="cask-section cask-service"'))) bad.push(chapter.id + ': Five producers is not after At the table');
  } finally { run('CASK_HOUSES.groups = CASK_HOUSES.groups.filter(function(x){ return x.key !== "fixture-chapter-group"; })'); }
  eq(bad, []);
});
await test('W5 the doors in: a style page draws Five producers to its group once built, and a shelf bottle a door to each house whose record carries it, worded by whether it is the flagship', () => {
  const bad = [];
  for (const s of STYLES) {
    const out = g('caskStylePageHTML')(g('caskStyleEntry')(s.id));
    const x = groups.find((y) => y.style === s.id);
    const doors = [...out.matchAll(/class="btn btn-ghost caskstyle-producers" id="caskstyle-producers-([a-z0-9-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    eq(doors, x ? [[x.key, hrefGroup(x.key)]] : [], s.id + ': the style\u2019s door to its producers');
  }
  for (const b of BOTTLES) {
    const out = g('backbarDetailHTML')(g('backbarEntry')(b.id));
    const want = houses.filter((h) => h.shelf === b.id);
    const doors = [...out.matchAll(/class="btn btn-ghost backbar-producer" id="backbar-producer-([a-z0-9-]+)" href="([^"]+)">([^<]+)</g)];
    if (JSON.stringify(doors.map((m) => [m[1], m[2]])) !== JSON.stringify(want.map((h) => [h.key, hrefHouse(h)]))) bad.push(b.id + ': doors ' + doors.map((m) => m[1]).join(','));
    want.forEach((h, i) => { const t = esc(h.producer) + (shelfIsFlagship(h, b) ? ': this bottle is its flagship' : ': its flagship is ' + esc(h.bottle.name)); if (doors[i] && doors[i][3] !== t) bad.push(b.id + ': the door reads ' + doors[i][3]); });
  }
  eq(bad, []);
});
await test('W5 the doors in: a Library producer\u2019s open entry draws a door to each house whose record names it, and none where none does; the door opens the house by one push and Back returns', async () => {
  const bad = [];
  run("state.tab = 'producers'; state.prod.cat = 'All';");
  LIBRARY.forEach((p, i) => {
    run('state.prod.open = ' + i);
    const out = g('renderProducers')();
    const want = houses.filter((h) => h.library === p.name).map((h) => [h.key, hrefHouse(h)]);
    const doors = [...out.matchAll(/class="btn btn-ghost caskhouse-lib-door" id="caskhouse-ld-([a-z0-9-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    if (JSON.stringify(doors) !== JSON.stringify(want)) bad.push(p.name + ': doors ' + JSON.stringify(doors) + ', not ' + JSON.stringify(want));
  });
  run('state.prod.open = null');
  eq(bad, []);
  const h = houses.find((x) => LIBRARY.some((p) => p.name === x.library));
  if (!h) { notes.push('W5 no built house names a Library producer yet'); return; }
  const L = boot({ hash: '#/producers/' + slug(h.library) });
  await settle();
  const at = L.state().at;
  assert.ok(L.tap({ id: 'caskhouse-ld-' + h.key }), 'the Library entry draws no door to ' + h.key);
  await settle();
  eq([L.state().key, L.state().at], [hrefHouse(h).slice(2), at + 1]);
  L.tap({ 'data-act': 'back' }); await settle();
  assert.equal(L.state().key, 'producers/' + slug(h.library), 'Back from the house');
});
await test('W6 the deck through real taps: a blind front, a forged early grade refused, the answer after Flip, Learn why opens the house and Back returns to the same card, our key only, a readable Deck done, the misses rerun', async () => {
  const x0 = groups[0];
  const B = boot({ hash: hrefGroup(x0.key) });
  await settle();
  B.run('progress.cards = {}; saveProgress();');
  B.run("progress.cards['My Bar \u00b7 Existing'] = { r: 17, w: 2, last: 1 };");
  assert.ok(B.tap({ 'data-act': 'caskhouse-practise', 'data-deck': 'caskhouses:' + x0.key }), 'the group draws no deck');
  await settle();
  assert.equal(B.run('state.fc.stage + " " + state.fc.mode'), 'run caskhouses');
  const n = B.run('state.fc.deck.length');
  assert.equal(n, housesOf(x0).length * CAPS.cards.n);
  const c = plain(B.run('state.fc.deck[0]')), key = B.g('cardKey')(c);
  let v = B.view();
  assert.ok(v.includes('<div class="caskhouse-question">' + esc(c.name) + '</div>'), 'the prompt is not the front');
  assert.ok(!strip(v).includes(c.back.slice(0, 40)), 'the front shows the answer');
  assert.ok(!/data-act="fc-grade"/.test(v) && !/caskhouse-read-link/.test(v), 'the front offers a grade or the house');
  B.forge({ 'data-act': 'fc-grade', 'data-ok': '1' });
  await settle();
  assert.ok(!B.g('progress').cards[key] && B.run('state.fc.idx') === 0, 'a forged grade before Flip was recorded');
  assert.ok(B.tap({ 'data-act': 'fc-flip' }));
  await settle();
  v = B.view();
  assert.ok(v.includes(esc(c.back).slice(0, 40)), 'the answer is not drawn after Flip');
  const s0 = B.state();
  const h = byHouse.get(c.itemId);
  assert.ok(B.tap({ class: 'btn btn-ghost caskhouse-read-link', href: hrefHouse(h) }), 'Learn why is not drawn after Flip');
  await settle();
  eq([B.state().key, B.state().at], [hrefHouse(h).slice(2), s0.at + 1], 'Learn why opens the house by one push');
  B.tap({ 'data-act': 'back' }); await settle();
  eq([B.state().key, B.run('state.fc.flipped'), B.g('cardKey')(B.run('state.fc.deck[state.fc.idx]'))], [s0.key, true, key], 'Back from the house is not the same revealed card');
  const rest = JSON.stringify(Object.assign({}, B.g('progress'), { cards: null }));
  assert.ok(B.tap({ 'data-act': 'fc-grade', 'data-ok': '0' }));
  await settle();
  eq(Object.keys(B.g('progress').cards).sort(), ['My Bar \u00b7 Existing', key].sort(), 'grading wrote another key');
  assert.equal(B.g('progress').cards[key].w, 1);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { cards: null })), rest, 'grading wrote outside progress.cards');
  for (let i = 1; i < n; i++) { B.tap({ 'data-act': 'fc-flip' }); await settle(); B.tap({ 'data-act': 'fc-grade', 'data-ok': '1' }); await settle(); }
  v = B.view();
  assert.ok(/Deck done/.test(v), 'no Deck done');
  assert.ok(!v.includes(KEY_PREFIX), 'Deck done shows a raw key');
  assert.ok(v.includes(esc(c.group + ': ' + c.name)), 'Deck done does not name the missed card readably');
  assert.ok(B.tap({ 'data-act': 'fc-rerun-miss' }));
  await settle();
  assert.equal(B.run('state.fc.mode'), 'caskhouses');
  eq(B.run('state.fc.deck.map(cardKey)'), [key]);
  const E = boot({ hash: hrefRoot });
  await settle();
  E.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.ok(E.tap({ 'data-act': 'deck', 'data-deck': 'caskhouses:again' }), 'Due or missed is not drawn on the root');
  await settle();
  assert.ok(/No cards in this deck yet/.test(E.view()) && !/data-act="fc-start"/.test(E.view()), 'an empty Due or missed starts a run');
});
await test('W6 Today\u2019s cask study: no unseen house card; a due one dealt, revealed with its house door, read and Back to the same card, graded on its key alone', async () => {
  const B = boot({ hash: '#/casks' });
  await settle();
  B.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.ok(!plain(B.g('caskDaily')()).some((r) => r.house), 'Today\u2019s cask study deals an unseen house card');
  const h = houses[houses.length - 1], c = h.cards[0], now = Date.now();
  B.run('progress.cards[' + JSON.stringify(c.key) + '] = { r: 1, w: 0, reps: 1, ef: 2.5, ivl: 1, last: ' + (now - 3 * 86400000) + ', due: ' + (now - 86400000) + ' }; saveProgress(); render();');
  await settle();
  assert.ok(plain(B.g('caskDaily')()).some((r) => r.house === h.key && r.key === c.key), 'Today\u2019s cask study does not deal the due house card');
  assert.ok(B.tap({ 'data-act': 'cask-start', 'data-mode': 'cards', 'data-s': 'today', 'data-id': 'all' }), 'Start today\u2019s study');
  await settle();
  const idx = B.run('caskState().run.rows.findIndex(function(r){ return r.house === ' + JSON.stringify(h.key) + '; })');
  assert.ok(idx >= 0, 'the run holds no house row');
  B.run('caskState().run.idx = ' + idx + '; render();'); await settle();
  let v = B.view();
  assert.ok(v.includes('<h2 tabindex="-1">' + esc(c.prompt) + '</h2>'), 'the house prompt is not the front');
  assert.ok(!/caskhouse-run-door/.test(v), 'the front shows the house door');
  B.tap({ 'data-act': 'cask-flip' }); await settle();
  v = B.view();
  assert.ok(v.includes(esc(c.answer).slice(0, 40)), 'the answer after Reveal');
  const s0 = B.state();
  assert.ok(B.tap({ id: 'caskhouse-run-' + h.key }), 'no door to the house after Reveal');
  await settle();
  eq([B.state().key, B.state().at], [hrefHouse(h).slice(2), s0.at + 1], 'the door opens the house by one push');
  B.tap({ 'data-act': 'back' }); await settle();
  eq([B.state().key, B.run('caskState().run.idx'), B.run('caskState().run.flipped')], [s0.key, idx, true], 'Back from the house is not the same revealed card');
  const before = plain(B.g('progress').cards[c.key]);
  const rest = JSON.stringify(Object.assign({}, B.g('progress'), { cards: null }));
  const others = JSON.stringify(Object.keys(B.g('progress').cards).filter((k) => k !== c.key).sort());
  B.tap({ 'data-act': 'cask-grade', 'data-k': 'yes' }); await settle();
  const after = plain(B.g('progress').cards[c.key]);
  assert.ok(after.r === before.r + 1 && after.reps > before.reps, 'grading did not write the house card');
  assert.equal(JSON.stringify(Object.keys(B.g('progress').cards).filter((k) => k !== c.key).sort()), others, 'grading wrote another card');
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { cards: null })), rest, 'grading wrote outside progress.cards');
});
await test('W7 the quiz through the click: a group\u2019s round deals only its questions, one Recent rounds row in mode caskhouses and nothing else written, Study this card and Back keep the results, the trend ignores it, Learn why reads the house', async () => {
  const x0 = groups[groups.length - 1];
  const B = boot({ hash: hrefGroup(x0.key) });
  await settle();
  B.run("progress.cards = {}; progress.quizzes = []; progress.qa = { 'fixture-q': { r: 1, w: 0 } }; progress.levels = {}; saveProgress();");
  const before = JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null }));
  const lp = JSON.stringify([1, 2, 3, 4].map((n) => B.g('levelProgress')(n)));
  assert.ok(B.tap({ 'data-act': 'quiz-go', 'data-m': 'caskhouses', 'data-group': x0.key }), 'the group draws no quiz');
  await settle();
  const n = B.run('state.quiz.round.length');
  const mine = housesOf(x0).reduce((k, h) => k + h.quiz.length, 0);
  assert.equal(n, Math.min(10, mine));
  assert.ok(plain(B.run('state.quiz.round')).every((q) => byHouse.get(q.caskHouseKey).group === x0.key), 'the group\u2019s round dealt another group\u2019s question');
  assert.equal(B.state().key, 'quiz/caskhouses');
  assert.ok(B.view().includes('Question 1 of ' + n + ' \u00b7 Producers and flagships'), 'the round is not labelled Producers and flagships');
  for (let i = 0; i < n; i++) {
    const right = B.run('(function(){ const q = state.quiz.round[state.quiz.idx]; return q.options.indexOf(q.answer); })()');
    B.tap({ 'data-act': 'quiz-pick', 'data-i': String(i === 0 ? (right + 1) % 4 : right) }); await settle();
    B.tap({ 'data-act': 'quiz-next' }); await settle();
  }
  const q = plain(B.g('progress').quizzes);
  assert.equal(q.length, 1, 'rows written: ' + q.length);
  eq([q[0].mode, q[0].total, q[0].score, q[0].replay], ['caskhouses', n, n - 1, false]);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null })), before, 'the round wrote outside progress.quizzes');
  assert.equal(JSON.stringify([1, 2, 3, 4].map((m) => B.g('levelProgress')(m))), lp, 'level progress moved');
  assert.equal(B.state().hash, '#/quiz/caskhouses/done');
  const study = [...B.view().matchAll(/data-act="hash" data-h="([^"]+)">Study this card</g)].map((m) => m[1]);
  assert.equal(study.length, 1, 'Study this card for the one miss');
  assert.match(study[0], /^#\/casks\/houses\/[a-z0-9-]+\/[a-z0-9-]+$/);
  const at = B.state().at;
  B.tap({ 'data-act': 'hash', 'data-h': study[0] }); await settle();
  eq([B.state().key, B.state().at], [study[0].slice(2), at + 1]);
  B.tap({ 'data-act': 'back' }); await settle();
  assert.equal(B.state().hash, '#/quiz/caskhouses/done');
  assert.equal(B.run('state.quiz.missedQ.length'), 1, 'Back lost the results');
  /* Deal another round keeps the group; the root's quiz deals every group */
  B.tap({ 'data-act': 'quiz-start' }); await settle();
  assert.ok(plain(B.run('state.quiz.round')).every((x) => byHouse.get(x.caskHouseKey).group === x0.key), 'Deal another round left the group');
  B.run("caskHouseOpen('', ''); render();"); await settle();
  B.tap({ 'data-act': 'quiz-go', 'data-m': 'caskhouses' }); await settle();
  if (groups.length > 1) assert.ok(new Set(plain(B.run('state.quiz.round')).map((x) => byHouse.get(x.caskHouseKey).group)).size > 1, 'the root\u2019s quiz kept one group');
  assert.equal(B.g('modeLabel')('caskhouses'), 'Producers and flagships');
  B.run("progress.quizzes = [{ date: 'd', ts: 1, score: 9, total: 10, mode: 'caskhouses' }, { date: 'd', ts: 2, score: 3, total: 10, mode: 'caskhouses' }];");
  assert.ok(!/last 2 rounds/.test(B.g('dashboardHTML')()), 'the dashboard\u2019s trend counts a producers round');
  const h = housesOf(x0)[0];
  const learn = B.g('quizLearnCardData')(B.g('cardByKey')(h.cards[0].key));
  assert.ok(learn && learn.title === h.producer && learn.links.includes('"' + hrefHouse(h) + '"') && learn.body.includes(esc(h.table).slice(0, 30)), 'Learn why does not read the house');
});
await test('W8 the Practise rows after the styles\u2019 rows, the search index (one entry a house, each landing), and the key ownership', () => {
  const pick = g('fcPickHTML')();
  const mine = pick.indexOf('aria-label="Producers and flagships"');
  assert.ok(mine > pick.indexOf('aria-label="Every style at the table"') && pick.indexOf('aria-label="Every style at the table"') >= 0, 'the rows are not after the styles\u2019 rows');
  const rows = pick.slice(mine, pick.indexOf('</nav>', mine));
  assert.ok(rows.includes('data-act="deck" data-deck="caskhouses"') && rows.includes('data-act="deck" data-deck="caskhouses:again"') && rows.includes('data-act="quiz-go" data-m="caskhouses"'), 'the rows are not the deck, its misses and the quiz');
  const ix = g('buildSearchIndex')().filter((r) => /^#\/casks\/houses\//.test(r.h));
  eq(ix.map((r) => r.h), houses.map(hrefHouse), 'one search entry a house');
  for (const r of ix) { assert.ok(lands(r.h), r.h + ' does not land'); assert.ok(!DASH.test(r.t + ' ' + r.s), 'a dash in the search entry'); }
  assert.ok(/caskHouseOwnsKey/.test(readFileSync(join(JS_DIR, 'app.js'), 'utf8')), 'app.js leaves the house card\u2019s link to the deck\u2019s keys');
  assert.ok(g('caskHouseOwnsKey')({ target: { closest: (s) => (/caskhouse-read-link/.test(s) ? {} : null) } }), 'the read link is not the page\u2019s own');
});

/* ---- the release: a whole, refuted roster under frozen keys ---------------------------- */
if (RELEASE) {
  const K = readJSON(KEYS_FILE);
  if (meta.partial) problems.push('--release: js/data-caskhouses.js is a partial build (' + groups.length + ' of ' + plan.groups.length + ' groups); the release ships the whole roster');
  if (Number(meta.unrefuted) > 0) problems.push('--release: js/data-caskhouses.js holds ' + meta.unrefuted + ' records no refuter has read');
  if (!K.frozen) problems.push('--release: tools/caskhouses/keys.v1.json is not frozen (build-caskhouses.mjs --freeze, with the roster whole)');
}

if (process.argv.includes('--mutations')) await mutations();

for (const n of notes) console.log('  note: ' + n);
if (problems.length) {
  console.error('\n  FAIL ' + problems.length + ' problem(s)');
  for (const p of problems.slice(0, 60)) console.error('    ' + p);
  process.exit(1);
}
const K = readJSON(KEYS_FILE);
console.log('Producers and flagships: ' + checks + ' checks passed; ' + groups.length + ' of ' + plan.groups.length + ' groups, ' + houses.length + ' of ' + meta.roster.houses + ' houses, '
  + cards.length + ' recall cards, ' + houses.reduce((n, h) => n + h.quiz.length, 0) + ' questions'
  + (RELEASE ? '; the release: whole, refuted, keys frozen.'
    : PARTIAL || Number(meta.unrefuted) > 0 || !K.frozen ? '; NOT A RELEASE: ' + [PARTIAL ? 'a partial build (the pinned counts wait for the whole roster)' : '', Number(meta.unrefuted) > 0 ? meta.unrefuted + ' records unrefuted' : '', K.frozen ? '' : 'keys not frozen'].filter(Boolean).join(', ') + ' (--release refuses it).'
      : '; whole, refuted and frozen.'));

/* ---- the gate proves it can fail -------------------------------------------------
   Each mutation breaks one rule in a scratch copy of the shipped tree (index.html,
   js/, css/); this gate, run on it with LEDGER_JS, must go red, and red by the check
   the mutation names (its fifth field, the start of that check's name). */
async function mutations() {
  const MUT = [
    ['js/data-caskhouses.js edited by hand', 'js/data-caskhouses.js', '"edition":"', '"edition":"hand-', 'D1 the build'],
    ['the card keyed under another source', 'js/ui-caskhouses.js', "cards.push({ src: 'Cask Houses',", "cards.push({ src: 'Cask House',", 'W1 cards'],
    ['a house opened under a group that is not its own', 'js/ui-caskhouses.js', "const r = g && house && (g.houses || []).indexOf(house) >= 0 ? caskHouseRecord(house) : null;", "const r = g && house ? caskHouseRecord(house) : null;", 'W3 addresses'],
    ['a house climbing straight to the Atlas home', 'js/ui-casks.js', "  if(typeof caskHouseParent==='function' && caskHouseParent()) return;\n", '', 'W3 addresses'],
    ['the answer on the blind front', 'js/ui-caskhouses.js', "+ front + heading + question\n", "+ front + heading + question + caskHouseParas(card.back)\n", 'W6 the deck'],
    ['the grade before Flip let through', 'js/app.js', "    if(fc.deck[fc.idx] && fc.deck[fc.idx].src === 'Cask Houses' && !fc.flipped) return;\n", '', 'W6 the deck'],
    ['a quiz question banked by a qkey', 'js/ui-caskhouses.js', "ckey: p.q.ckey, caskHouseKey: p.r.key };", "ckey: p.q.ckey, qkey: 'caskhouse-' + p.r.key, caskHouseKey: p.r.key };", 'D6 the quiz'],
    ['Recall before you reveal drawn open', 'js/ui-caskhouses.js', "'<details class=\"caskhouse-recall\"><summary>'", "'<details class=\"caskhouse-recall\" open><summary>'", 'W4 every house'],
    ['a source opened without noopener', 'js/ui-caskhouses.js', "target=\"_blank\" rel=\"noopener noreferrer\">' + esc(s.title)", "target=\"_blank\">' + esc(s.title)", 'D5 sources'],
    ['the table line out of the reading face', 'css/caskhouses.css', 'p.caskhouse-tline{font-family:var(--house-reading);', 'p.caskhouse-tline{', 'D3 the stylesheet'],
    ['Previous and Next leaving the group', 'js/ui-caskhouses.js', "const list = caskHouseHousesOf(caskHouseGroup(r.group)), at = list.indexOf(r)", "const list = caskHouseRecords(), at = list.indexOf(r)", 'W4 every house'],
    ['a chapter\u2019s Five producers left out', 'js/ui-casks.js', "    +(typeof caskHouseChapterDoorsHTML==='function'?caskHouseChapterDoorsHTML(c.id):'')\n", '', 'W5 the doors in: a chapter'],
    ['the Atlas home\u2019s section left out', 'js/ui-casks.js', "    +(typeof caskHouseHomeHTML==='function'?caskHouseHomeHTML():'')\n", '', 'W5 the doors in: the Atlas home'],
    ['a shelf bottle\u2019s house door left out', 'js/ui-backbar.js', "    + backbarProducerHTML(e)\n", '', 'W5 the doors in: a style page'],
    ['a Library producer\u2019s houses left out', 'js/ui-reference.js', "      + (typeof caskHouseLibraryDoorsHTML === 'function' ? caskHouseLibraryDoorsHTML(x.name) : '')\n", '', 'W5 the doors in: a Library'],
    ['Today\u2019s cask study dealing an unseen house card', 'js/ui-caskhouses.js', "return caskHouseCards().filter(function(c){ return caskHouseCardState(c, now).due; })", "return caskHouseCards().filter(function(c){ return true; })", 'W6 Today'],
    ['a group\u2019s quiz dealing every group', 'js/ui-caskhouses.js', "caskState().houseQuiz = caskHouseGroup(data.group) ? data.group : '';", "caskState().houseQuiz = '';", 'W7 the quiz'],
    ['the dashboard trend counting a producers round', 'js/ui-new.js', " && q.mode !== 'caskhouses');", ');', 'W7 the quiz'],
    ['a price word in a page string written as a template', 'js/ui-caskhouses.js', "'</ul><p class=\"cask-muted\">Reading the sources needs a connection.</p></details>'", "`</ul><p class=\"cask-muted\">Reading the sources needs a connection, at no cost.</p></details>`", 'D3 the voice'],
    ['a price word the literals cannot see, on the Atlas home', 'js/ui-caskhouses.js', "'<p>Five houses for each style, each with", "'<p>Five houses for each style, at every pri' + 'ce, each with", 'D4 every page'],
    ['the search index losing the houses', 'js/ui-new.js', "  if(typeof caskHouseSearchEntries === 'function') ix.push(...caskHouseSearchEntries());\n", '', 'W8 the Practise rows'],
  ];
  let held = 0;
  for (const [name, file, from, to, mine] of MUT) {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-caskhouses-'));
    for (const d of ['js', 'css']) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    const src = readFileSync(join(dir, file), 'utf8');
    if (!src.includes(from)) { problems.push('the mutation "' + name + '" found nothing to change in ' + file); rmSync(dir, { recursive: true, force: true }); continue; }
    writeFileSync(join(dir, file), src.replace(from, to));
    const r = spawnSync(process.execPath, [SELF], { env: Object.assign({}, process.env, { LEDGER_JS: join(dir, 'js') }), encoding: 'utf8' });
    rmSync(dir, { recursive: true, force: true });
    /* held only when the check written for it is among the failures: a red from
       another check (a fragment a lane is editing makes D1 red in every copy) proves
       nothing about the rule this mutation breaks */
    const fails = r.stderr.split('\n').filter((l) => /^\s{4}\S/.test(l)).map((l) => l.trim());
    const why = fails.find((l) => l.indexOf(mine) === 0);
    if (r.status === 0) problems.push('the mutation "' + name + '" left this gate green');
    else if (!why) problems.push('the mutation "' + name + '" turned the gate red, but not by its own check (' + mine + '): ' + (fails[0] || r.stderr.trim().split('\n').pop() || '').slice(0, 150));
    else { held++; console.log('  mutation held: ' + name + ' :: ' + why.slice(0, 150)); }
  }
  console.log('  ' + held + ' of ' + MUT.length + ' mutations turned the gate red');
  if (problems.length) {
    for (const p of problems) console.error('    ' + p);
    process.exit(1);
  }
}
