/* At the table: every style, in the Cask Atlas (Whisky & Brandy, 5 November
   2026): its gate, on check-backbar's model.

     node tools/check-caskstyles.mjs              every check below
     node tools/check-caskstyles.mjs --mutations  then breaks the shipped files twelve ways, one at a time, and expects red each time
     node tools/check-caskstyles.mjs --help

   The whole app is loaded from index.html's own script list (app.js and its
   boot included) into a sandbox with a small DOM harness: a document whose
   regions are strings, a history with real entries, back() and popstate, a
   location read from the entry, both storages in memory, and a tap that is
   the delegated click a real tap makes on the element found in the rendered
   markup (tools/check-backbar.mjs's harness). So what is held is the SHIPPED
   page, router, render() and acts.

   LEDGER_JS=<dir> points it at another copy's js/; the root is the folder
   above, and its index.html names the scripts. The roster, the fragments'
   rules and the build stay this checkout's (tools/caskstyles/).

   A build with fewer styles than the roster (the seeds, or the lanes still
   writing) skips only what needs the whole roster: the counts pinned in
   FROZEN, the none-lost part of the keys, and the length-clue and position
   shares below 30 questions. Everything else holds on three styles as it will
   on thirty-four. The integrator sets keys.v1.json's frozen to true from the
   whole build; from then on no key may leave it.

   D1 shape through schema.mjs, the roster sound   D2 the roster whole once written, the counts pinned
   D3 caps and the sale's two sentences   D4 voice, the shipped files and the stylesheet
   D5 nobody named, no price   D6 links resolve to chapters, shelf bottles, canon and the neighbour, and land
   D7 the quiz: quality and answer positions, the round dealt 2,000 times   D8 the data is the build's
   W1 keys, frozen   W2 the deck and the quiz kept apart (from the levels, Due today, each other)
   W3 addresses and Back   W4 rendering: the home, a style, a chapter's doors, a bottle's door
   W5 recall: the deck and Today's cask study   W6 the quiz through the click   W7 the Practise rows and search */
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { loadContext, validateFragment, planProblems, languageProblems, nameProblems, proseWords, words, strings, fold, sentences, namesStyle,
  cardKey as schemaKey, FIELDS, LIMITS, LINE_LIMITS, SERVE, GUEST, BENCH, ENTRY_MAX, RECALL, QUIZ, SUPERLATIVE_MORE } from './caskstyles/schema.mjs';
import { DASH, SUPERLATIVE, VERDICT, PRICE, HOUSE_NAME, AMERICAN_MORE } from './backbar/schema.mjs';
import { AMERICAN, peopleIn } from './brew/schema.mjs';

const SELF = fileURLToPath(import.meta.url);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(SELF, 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const LEDGER = join(dirname(SELF), '..');
const CS = join(LEDGER, 'tools', 'caskstyles');
const ROOT = process.env.LEDGER_JS ? dirname(resolve(process.env.LEDGER_JS)) : LEDGER;
const JS_DIR = process.env.LEDGER_JS ? resolve(process.env.LEDGER_JS) : join(LEDGER, 'js');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

/* The counts pinned for the whole build: thirty-four styles in the roster, one
   recall card and three questions each (style.txt). Held only when every
   roster style is written; the roster itself must keep thirty-four rows. */
const FROZEN = { styles: 34, recall: 34, questions: 102 };
const KEYS_FILE = join(CS, 'keys.v1.json');
const KEY = (id) => 'Cask Styles \u00b7 ' + id + '/recall';
const BUILD_ORDER = ['id', 'name', 'respell', 'family', 'terms', 'neighbour', 'law', 'made', 'taste', 'lines', 'serve', 'guest', 'compare', 'benchmarks',
  'shelf', 'chapters', 'canon', 'recall', 'quiz', 'sources'];

/* ---- the harness (tools/check-backbar.mjs's) ---------------------------------------- */
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
const pick = (o, keys) => { const r = {}; keys.forEach((k) => { if (k in o) r[k] = o[k]; }); return r; };

/* ---- the data, the plan and the Ledger, as the page and the schema see them ---- */
const A = boot();
await settle();
const g = A.g, run = A.run;
const esc = g('esc');
const data = plain(g('caskStyleData')());
const entries = data.entries || [];
const plan = readJSON(join(CS, 'plan.json'));
const people = [].concat(readJSON(join(CS, 'people.json')).names || [], readJSON(join(LEDGER, 'tools', 'backbar', 'people.json')).names || []);
const ctx = loadContext();
const roster = plan.entries;
const SEED = entries.length < roster.length;
const byPlan = new Map(roster.map((e, i) => [e.id, Object.assign({ index: i }, e)]));
const byId = new Map(entries.map((e) => [e.id, e]));
const fresh = () => run("progress.cards = {}; progress.quizzes = []; progress.qa = {}; progress.levels = progress.levels || {}; saveProgress();");
const CHAPTERS = plain(g('CASK_CHAPTERS')) || [];
const BOTTLES = (plain(g('backbarEntries')()) || []);
const COCKTAILS = plain(g('COCKTAILS')) || [];
const slug = g('slugify');
const href = (id) => '#/casks/style/' + id;

/* ---- D: the data ------------------------------------------------------------------ */
await test('D1 shape: the file has the build\u2019s three keys, the plan\u2019s families, the styles in roster order with the build\u2019s fields, and the roster is sound', () => {
  eq(Object.keys(data), ['edition', 'families', 'entries']);
  assert.equal(data.edition, plan.edition, 'the edition');
  eq(data.families, plan.families.map((f) => ({ id: f.id, title: f.title })));
  eq(planProblems(plan, ctx), [], 'tools/caskstyles/plan.json');
  assert.ok(entries.length > 0, 'no styles at all');
  const ids = entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'an id twice');
  ids.forEach((id) => assert.ok(byPlan.has(id), id + ' is not a roster style'));
  const order = ids.map((id) => byPlan.get(id).index);
  eq(order, order.slice().sort((a, b) => a - b), 'the styles are not in the roster\u2019s order');
  for (const e of entries) {
    eq(Object.keys(e), BUILD_ORDER, e.id + ': the fields are not the build\u2019s, in its order');
    eq(e.terms, byPlan.get(e.id).terms, e.id + ': the terms are not the roster\u2019s');
    assert.equal(e.neighbour, byPlan.get(e.id).neighbour, e.id + ': the neighbour is not the roster\u2019s');
  }
});
for (const e of entries) {
  await test('D1 shape: ' + e.id + ' passes tools/caskstyles/schema.mjs', () => {
    eq(validateFragment(pick(plain(e), FIELDS), ctx), []);
  });
}
await test('D2 the roster whole: thirty-four styles in five families, one recall card and three questions each, the counts held once every style is written', () => {
  assert.equal(roster.length, FROZEN.styles, 'the roster holds ' + roster.length + ' styles, not ' + FROZEN.styles);
  entries.forEach((e) => { assert.equal(e.recall.length, 1, e.id + ' recall'); assert.equal(e.quiz.length, 3, e.id + ' quiz'); });
  assert.ok(entries.length <= roster.length, 'more styles than the roster');
  if (SEED) {
    const missing = roster.filter((r) => !byId.has(r.id)).map((r) => r.id);
    notes.push('D2 the roster whole waits for every style: ' + entries.length + ' of ' + roster.length + ' written (' + missing.length + ' to write)');
    return;
  }
  eq(entries.map((e) => e.id), roster.map((r) => r.id), 'the whole roster, in order');
  for (const f of plan.families) assert.equal(entries.filter((e) => e.family === f.id).length, roster.filter((r) => r.family === f.id).length, f.id);
  assert.equal(entries.length, FROZEN.styles, 'styles');
  assert.equal(entries.reduce((n, e) => n + e.recall.length, 0), FROZEN.recall, 'recall cards');
  assert.equal(entries.reduce((n, e) => n + e.quiz.length, 0), FROZEN.questions, 'questions');
});
await test('D3 caps: every field in its range, every style at most ' + ENTRY_MAX + ' reading words, and the sale exactly two sentences', () => {
  const bad = [];
  const out = (path, s, lo, hi) => { const n = words(s); if (n < lo || n > hi) bad.push(path + ' ' + n + ' words, ' + lo + ' to ' + hi); };
  for (const e of entries) {
    const n = proseWords(e);
    if (n > ENTRY_MAX) bad.push(e.id + ' ' + n + ' reading words');
    for (const [k, [lo, hi]] of Object.entries(LIMITS)) out(e.id + '.' + k, e[k], lo, hi);
    for (const [k, [lo, hi]] of Object.entries(LINE_LIMITS)) out(e.id + '.lines.' + k, e.lines[k], lo, hi);
    if (sentences(e.lines.sale) !== 2) bad.push(e.id + '.lines.sale: ' + sentences(e.lines.sale) + ' sentences, not two');
    if (!namesStyle(e.lines.s45, byPlan.get(e.id)) || !namesStyle(e.lines.s10, byPlan.get(e.id))) bad.push(e.id + ': the ten or the forty-five does not name the style');
    Object.keys(e.serve).forEach((k) => out(e.id + '.serve.' + k, e.serve[k], 1, SERVE.words));
    if (Object.keys(e.serve).length < SERVE.min || !('glass' in e.serve)) bad.push(e.id + '.serve: at least ' + SERVE.min + ' and the glass');
    if (e.guest.length < GUEST.min || e.guest.length > GUEST.max) bad.push(e.id + '.guest ' + e.guest.length + ' questions');
    e.guest.forEach((x, i) => { out(e.id + '.guest[' + i + '].q', x.q, 1, GUEST.q); out(e.id + '.guest[' + i + '].a', x.a, 1, GUEST.a); });
    if (e.benchmarks.length < BENCH.min || e.benchmarks.length > BENCH.max) bad.push(e.id + '.benchmarks ' + e.benchmarks.length);
    e.recall.forEach((r) => { out(e.id + '.recall.prompt', r.prompt, 1, RECALL.prompt); out(e.id + '.recall.answer', r.answer, RECALL.answer[0], RECALL.answer[1]); });
    e.quiz.forEach((q, i) => { out(e.id + '.quiz[' + i + '].q', q.q, 1, QUIZ.stem); out(e.id + '.quiz[' + i + '].explain', q.explain, 1, QUIZ.explain); q.options.forEach((o, j) => out(e.id + '.quiz[' + i + '].options[' + j + ']', o, 1, QUIZ.option)); });
  }
  eq(bad, []);
});
/* the shipped bytes */
const SHIPPED = { 'js/data-caskstyles.js': readFileSync(join(JS_DIR, 'data-caskstyles.js'), 'utf8'), 'js/ui-caskstyles.js': readFileSync(join(JS_DIR, 'ui-caskstyles.js'), 'utf8'),
  'css/caskstyles.css': readFileSync(join(ROOT, 'css', 'caskstyles.css'), 'utf8') };
const DASH_ESCAPES = /\\u201[2-5]/i;
/* in code a double hyphen is CSS's custom property; the dash it stands for is the spaced one */
const CODE_DASH = /[\u2012-\u2015]|&[mn]dash;|&#821[12];|&#x201[34];| \x2d\x2d /i;
await test('D4 voice: the three shipped files are pure ASCII, with no dash in any form and nothing escaped at or above U+2190', () => {
  for (const [f, src] of Object.entries(SHIPPED)) {
    const lit = [...src].find((c) => c.codePointAt(0) > 0x7e || (c.codePointAt(0) < 0x20 && c !== '\n' && c !== '\r' && c !== '\t'));
    assert.equal(lit, undefined, f + ' carries a literal U+' + (lit ? lit.codePointAt(0).toString(16).toUpperCase() : ''));
    assert.ok(!CODE_DASH.test(src), f + ' carries a dash (' + (src.match(CODE_DASH) || [])[0] + ')');
    assert.ok(!DASH_ESCAPES.test(src), f + ' escapes a dash (' + (src.match(DASH_ESCAPES) || [])[0] + ')');
    const high = [...src.matchAll(/\\u([0-9a-fA-F]{4})/g)].map((m) => parseInt(m[1], 16)).filter((cp) => cp >= 0x2190);
    eq(high, [], f + ' escapes a mark at or above U+2190');
  }
});
await test('D4 voice: every string a style carries keeps the voice (no dash, glyph, American spelling, superlative, price, volatile fact, named distiller, verdict or the house\u2019s name)', () => {
  const bad = [];
  for (const e of entries) languageProblems(pick(plain(e), FIELDS)).forEach((p) => bad.push(e.id + '.' + p));
  for (const [path, s] of strings({ families: data.families }, '')) if (DASH.test(s) || HOUSE_NAME.test(s)) bad.push(path);
  eq(bad, []);
});
await test('D4 voice: the page\u2019s own words are British and plain, and no file of the page writes the house\u2019s name', () => {
  const lits = [...SHIPPED['js/ui-caskstyles.js'].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  const bad = [];
  for (const s of lits) {
    const am = s.match(AMERICAN) || s.match(AMERICAN_MORE);
    if (am) bad.push('American "' + am[0] + '"');
    const sup = s.match(SUPERLATIVE) || s.match(SUPERLATIVE_MORE);
    if (sup) bad.push('selling "' + sup[0] + '"');
    if (PRICE.test(s)) bad.push('price "' + s.match(PRICE)[0] + '"');
    if (VERDICT.test(s)) bad.push('allergen or health talk "' + s.match(VERDICT)[0] + '"');
  }
  eq(bad, [], 'js/ui-caskstyles.js');
  for (const f of Object.keys(SHIPPED)) assert.ok(!HOUSE_NAME.test(SHIPPED[f]), f + ' names the house');
});
await test('D4 voice: css/caskstyles.css uses the Ledger\u2019s tokens, no new colour, font or picture, 44px controls, the reading face, the brass rule and its night service rules', () => {
  const css = SHIPPED['css/caskstyles.css'];
  const others = ['ledger.css', 'house.css', 'service-day.css', 'bar-compass.css', 'fall-menu.css', 'house-menu.css', 'method-studies.css', 'brew.css', 'backbar.css', 'casks.css']
    .map((f) => { try { return readFileSync(join(ROOT, 'css', f), 'utf8'); } catch (e) { return ''; } }).join('\n');
  for (const v of new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]))) assert.ok(new RegExp('--' + v + '\\s*:').test(others), 'the token --' + v + ' is defined nowhere in the Ledger');
  for (const c of new Set(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [])) assert.ok(others.includes(c), 'a new colour ' + c);
  assert.ok(!/url\(|@font-face|@import|<svg|data:image/i.test(css), 'a picture or a font');
  for (const m of css.matchAll(/font(?:-family)?\s*:\s*([^;}]*)/g)) {
    const fam = m[1].replace(/\s+/g, '');
    if (/^(?:inherit|[\d.]+(?:rem|em|px))$/.test(fam)) continue;
    assert.ok(/var\(--house-display,Georgia,serif\)$|^var\(--house-reading\)$/.test(fam), 'a font of its own: ' + m[1]);
  }
  for (const sel of ['.caskstyle-practice .btn', '.caskstyle-links .btn', '.caskstyle-door-row .btn', '.caskstyle-pager .btn', '.caskstyle-read-link', '.caskstyle-recall summary', '.caskstyle-sources summary', '.caskstyle-sources a', '.cask-atlas a.caskstyle-row'])
    assert.ok(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{[^}]*min-height:4[4-9]px').test(css), sel + ' has no 44px floor');
  assert.ok(/html\[data-service="night"\] [^{]*\.caskstyle-/.test(css), 'no night service rule');
  assert.ok(/\.caskstyle-page \.caskstyle-panel p\.caskstyle-s45\{[^}]*font-family:var\(--house-reading\)/.test(css), 'the forty-five is not in the reading face');
  assert.ok(/\.caskstyle-sale\{[^}]*border-top:2px solid var\(--brass\)/.test(css), 'the sale sits under no brass rule');
  assert.ok(/\.caskstyle-quiet p\{[^}]*color:var\(--cream-dim\)/.test(css), 'the ten and the twenty are not quiet');
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)) for (const sel of m[2].split(',')) {
    if (/^\s*(?:html\[data-service="night"\]\s*)?\.(?:caskstyle-|cask-atlas)/.test(sel) || /^\s*p\.caskstyle-/.test(sel)) continue;
    assert.fail('a rule outside the .caskstyle namespace: ' + sel.trim());
  }
});
await test('D5 nobody named and no price: no person from either people list in any string, no capitalised run the lists do not allow, no price or currency', () => {
  const bad = [];
  for (const [path, s] of strings({ entries }, '')) {
    if (/\.url$/.test(path)) continue;
    peopleIn(s, people).forEach((n) => bad.push(path + ': ' + n));
    if (!/\.sources\[\d+\]\.title$/.test(path) && PRICE.test(s)) bad.push(path + ': a price (' + s.match(PRICE)[0] + ')');
  }
  for (const e of entries) nameProblems(pick(plain(e), FIELDS), ctx).forEach((p) => bad.push(e.id + '.' + p));
  eq(bad, []);
});
await test('D6 links: every chapter, shelf bottle and canon drink resolves in CASK_CHAPTERS, the liquor shelf and COCKTAILS, the neighbour is a roster style, and each is drawn', () => {
  const bad = [];
  for (const e of entries) {
    run("caskStyleOpen(" + JSON.stringify(e.id) + ")");
    const out = g('renderCasks')();
    for (const c of e.chapters) {
      if (!CHAPTERS.some((x) => x.id === c)) bad.push(e.id + ': no Cask Atlas chapter ' + c);
      else if (!out.includes('class="btn btn-ghost caskstyle-chapter" href="#/casks/' + c + '"')) bad.push(e.id + ': the chapter ' + c + ' is not drawn');
    }
    for (const b of e.shelf) {
      if (!BOTTLES.some((x) => x.id === b && x.group !== 'confirm')) bad.push(e.id + ': no liquor shelf bottle ' + b);
      else if (!out.includes('class="btn btn-ghost caskstyle-bottle" href="#/menu/backbar/' + b + '"')) bad.push(e.id + ': the bottle ' + b + ' is not drawn');
    }
    if (!e.shelf.length && /id="caskstyle-p-shelf"/.test(out)) bad.push(e.id + ': On our shelf drawn empty');
    for (const c of e.canon) {
      if (!COCKTAILS.some((x) => slug(x.name) === c)) bad.push(e.id + ': no canon drink ' + c);
      else if (!out.includes('class="btn btn-ghost caskstyle-canon" href="#/library/' + c + '"')) bad.push(e.id + ': the canon link ' + c + ' is not drawn');
    }
    if (!e.canon.length && /id="caskstyle-p-canon"/.test(out)) bad.push(e.id + ': the classics drawn empty');
    if (!byPlan.has(e.neighbour) || e.neighbour === e.id) bad.push(e.id + ': the neighbour ' + e.neighbour + ' is no other roster style');
    const nbDrawn = out.includes('href="' + href(e.neighbour) + '">Its neighbour: ');
    if (byId.has(e.neighbour) !== nbDrawn) bad.push(e.id + ': the neighbour door ' + (nbDrawn ? 'drawn to an unwritten style' : 'not drawn'));
    for (const m of out.matchAll(/<a\b[^>]*href="([^"]+)"/g)) if (!/^#\/(?:casks|menu\/backbar|library)\//.test(m[1]) && !/^https:\/\//.test(m[1])) bad.push(e.id + ': a link to ' + m[1]);
  }
  eq(bad, []);
});
await test('D6 links: each chapter, bottle, canon and neighbour link lands on its screen', () => {
  for (const e of entries) {
    const hashes = [].concat(e.chapters.map((c) => '#/casks/' + c), e.shelf.map((b) => '#/menu/backbar/' + b), e.canon.map((c) => '#/library/' + c), byId.has(e.neighbour) ? [href(e.neighbour)] : []);
    for (const h of hashes) {
      run("state.tab = 'home';");
      assert.ok(g('applyRoute')(h), h + ' is not read');
      run('navNormalise()');
      assert.equal(g('routeNow')().hash, h, e.id + ': ' + h + ' does not land');
    }
  }
});
await test('D6 links: the sources are https or in-app, each external one opens a new tab with noopener, and an unsafe address is never drawn', () => {
  for (const e of entries) {
    const out = g('caskStyleSourcesHTML')(e);
    for (const s of e.sources) if (s.url) assert.match(s.url, /^https:\/\//, e.id);
    for (const m of out.matchAll(/<a\b[^>]*>/g)) assert.ok(/href="https:/.test(m[0]) && /target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0]), e.id + ': ' + m[0]);
    assert.equal(count(out, /<a\b/g), e.sources.filter((s) => s.url).length, e.id + ': the source links');
    assert.ok(/<details class="caskstyle-sources"><summary>Sources<\/summary>/.test(out), e.id + ': Sources are not drawn closed');
  }
  const bad = g('caskStyleSourcesHTML')({ sources: [{ title: 'A fixture', url: 'javascript:alert(1)' }] });
  assert.ok(!/javascript:/.test(bad), 'an unsafe url is drawn');
});
await test('D7 the quiz: one key, four different options, the key never in the stem, the keys spread on every style, no length clue', () => {
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
await test('D7 the quiz: caskStyleQuizRound dealt 2,000 times deals ten styles (or every one), round robin across the families, answers spread, every ckey a card, no qkey', () => {
  const want = Math.min(10, entries.filter((e) => e.quiz.length).length);
  const fams = new Set(entries.map((e) => e.family));
  const pos = [0, 0, 0, 0];
  let total = 0;
  for (let r = 0; r < 2000; r++) {
    const round = g('caskStyleQuizRound')();
    assert.equal(round.length, want, 'round ' + r + ' dealt ' + round.length);
    assert.equal(new Set(round.map((q) => q.caskStyleId)).size, round.length, 'a style twice in one round');
    const per = {};
    round.forEach((q) => { const f = byId.get(q.caskStyleId).family; per[f] = (per[f] || 0) + 1; });
    for (const fa of fams) for (const fb of fams) {
      const left = entries.filter((e) => e.family === fb).length - (per[fb] || 0);
      if (left > 0) assert.ok((per[fa] || 0) <= (per[fb] || 0) + 1, 'not round robin: ' + JSON.stringify(per));
    }
    for (const q of round) {
      assert.ok(!('qkey' in q) || q.qkey === undefined, 'a qkey');
      assert.equal(q.ckey, KEY(q.caskStyleId));
      assert.ok(g('cardByKey')(q.ckey), 'the ckey ' + q.ckey + ' is no card');
      assert.equal(q.options.length, 4);
      const i = q.options.indexOf(q.answer);
      assert.ok(i >= 0, 'the answer is not an option');
      const src = byId.get(q.caskStyleId).quiz.find((x) => x.q === q.prompt);
      assert.ok(src && src.options[src.a] === q.answer, 'the answer is not the authored key');
      pos[i]++; total++;
    }
  }
  const share = pos.map((p) => p / total);
  assert.ok(share.every((s) => s >= 0.2 && s <= 0.3), 'answer positions ' + share.map((s) => (s * 100).toFixed(1) + '%').join(' '));
});
await test('D8 the build: js/data-caskstyles.js is what tools/caskstyles/build-caskstyles.mjs writes', () => {
  const r = spawnSync(process.execPath, [join(CS, 'build-caskstyles.mjs'), '--check'], { cwd: LEDGER, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout + r.stderr).trim().split('\n').slice(-6).join(' '));
  if (resolve(JS_DIR) !== resolve(join(LEDGER, 'js'))) assert.equal(SHIPPED['js/data-caskstyles.js'], readFileSync(join(LEDGER, 'js', 'data-caskstyles.js'), 'utf8'), 'this copy\u2019s js/data-caskstyles.js is not the source\u2019s, byte for byte');
});

/* ---- W: the wiring ------------------------------------------------------------------ */
const cards = plain(g('caskStyleCards')());
await test('W1 keys: one card per style, keyed "Cask Styles \u00b7 <id>/recall", unique, read back by cardByKey, studied at the style', () => {
  assert.equal(cards.length, entries.length);
  const keys = cards.map((c) => g('cardKey')(c));
  assert.equal(new Set(keys).size, keys.length);
  for (const c of cards) {
    assert.equal(c.src, 'Cask Styles');
    assert.equal(g('cardKey')(c), KEY(c.itemId));
    assert.equal(KEY(c.itemId), schemaKey(c.itemId), 'the page and schema.mjs disagree on the key');
    assert.equal(g('cardByKey')(KEY(c.itemId)).caskStyleKey, c.caskStyleKey);
    assert.equal(g('studyHashOf')(KEY(c.itemId)), href(c.itemId));
    eq(c.spec, []);
  }
  assert.equal(g('cardByKey')(KEY('no-such-style')), null);
});
await test('W1 keys: keys.v1.json holds the roster\u2019s keys in roster order and every shipped key; once frozen, none leaves it', () => {
  const file = readJSON(KEYS_FILE);
  const list = Array.isArray(file) ? file : file.keys;
  assert.ok(Array.isArray(list) && list.length, 'keys.v1.json holds no keys');
  list.forEach((k) => assert.match(k, /^Cask Styles \u00b7 [a-z0-9-]+\/recall$/));
  assert.equal(new Set(list).size, list.length, 'a key twice');
  const keys = cards.map((c) => g('cardKey')(c));
  eq(keys.filter((k) => !list.includes(k)), [], 'a shipped key keys.v1.json does not hold');
  const loose = list.filter((k) => !roster.some((r) => KEY(r.id) === k));
  if (!file.frozen) {
    eq(list, roster.map((r) => KEY(r.id)), 'keys.v1.json is not the roster\u2019s keys in roster order');
    notes.push('W1 keys.v1.json is not frozen yet (the integrator freezes it from the whole build)');
    return;
  }
  eq(loose, [], 'a frozen key no roster style holds');
  if (SEED) { notes.push('W1 none-lost not held on a partial build'); return; }
  eq(list.filter((k) => !keys.includes(k)), [], 'a frozen key is gone');
});
await test('W2 kept apart: out of allDrinks, the academic modes, Due today, the session and the levels; the decks deal only style cards', () => {
  assert.ok(!g('allDrinks')().some((d) => d.src === 'Cask Styles'));
  const modes = g('FC_MODES');
  const at = modes.findIndex((m) => m[0] === 'caskstyles');
  assert.ok(at > 0 && modes[at - 1][0] === 'backbar', 'the caskstyles mode is not right after backbar');
  const live = g('caskStyleCards')();
  for (const m of modes) if (m[0] !== 'caskstyles') assert.ok(live.every((c) => !m[3](c)), 'the mode ' + m[0] + ' fits a style card');
  assert.ok(live.every((c) => modes[at][3](c)));
  fresh();
  const now = Date.now();
  cards.forEach((c) => { g('progress').cards[KEY(c.itemId)] = { r: 0, w: 1, reps: 0, last: now - 2 * 86400000, due: now - 86400000 }; });
  assert.ok(g('dueToday')().deck.every((d) => d.src !== 'Cask Styles'), 'Due today deals a style card');
  const parts = g('sessionDeckParts')();
  assert.ok(parts.dueDeck.concat(parts.newDeck).every((d) => d.src !== 'Cask Styles'), 'the session deals a style card');
  assert.ok(!/Cask Styles/.test(JSON.stringify(g('LEVEL_ITEMS'))), 'a level holds a style item');
  const def = g('deckDef')('caskstyles');
  assert.equal(def.preset.level, undefined);
  eq(Array.from(def.preset.deckModes), ['caskstyles']);
  assert.equal(def.preset.only.length, cards.length);
  assert.ok(def.preset.only.every((c) => c.src === 'Cask Styles'), 'the deck deals another card');
  assert.equal(g('deckDef')('caskstyles:again').preset.only.length, cards.length, 'every card due is in Due or missed');
  fresh();
  assert.equal(g('deckDef')('caskstyles:again').preset.only.length, 0, 'Due or missed deals an unseen card');
  assert.equal(g('deckDef')('caskstyles:nope'), null);
});
await test('W2 kept apart: grading a style card writes its key alone (no quiz row, no level, qa or menu), and the quiz writes no card', () => {
  fresh();
  run("progress.qa = { 'fixture-q': { r: 2, w: 1 } }; progress.levels = { '1': { fixture: true } };");
  const lp = () => JSON.stringify([1, 2, 3, 4].map((n) => g('levelProgress')(n)));
  const before = { lp: lp(), qa: JSON.stringify(g('progress').qa), levels: JSON.stringify(g('progress').levels), bar: JSON.stringify(g('progress').bar), first: g('firstUnmetLevel')() };
  assert.ok(g('openDeck')('caskstyles'));
  assert.ok(g('startDeckRun')('caskstyles'));
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
  const round = g('buildRound')('caskstyles');
  assert.ok(round.length > 0, 'the round deals nothing');
  assert.ok(round.every((q) => !q.qkey && q.ckey.indexOf('Cask Styles \u00b7 ') === 0), 'a question banked or keyed elsewhere');
  eq(Object.keys(g('progress').cards), [], 'dealing a round wrote a card');
});
await test('W3 addresses: every style round-trips, its parent is the Cask Atlas home, then Home; bad ids land on the home', () => {
  for (const e of entries) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(href(e.id)));
    run('navNormalise()');
    assert.equal(g('routeNow')().hash, href(e.id));
    assert.equal(g('caskStyleHref')(e.id), href(e.id));
    assert.equal(g('parentTab')(), 'casks');
    g('applyParent')();
    assert.equal(g('routeNow')().hash, '#/casks');
    assert.equal(g('parentTab')(), 'home');
  }
  const chapterNotStyle = CHAPTERS.map((c) => c.id).find((id) => !byPlan.has(id)) || 'production';
  for (const bad of ['#/casks/style/no-such-style', '#/casks/style/%E0%A4%A', '#/casks/style', '#/casks/style/', '#/casks/style/' + chapterNotStyle]) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(bad), bad + ' is not read');
    run('navNormalise()');
    assert.equal(g('routeNow')().hash, '#/casks', bad);
    eq([run('caskState().page'), run('caskState().item'), g('parentTab')()], ['index', '', 'home'], bad + ' is not the home itself');
  }
  const ch = CHAPTERS[0].id;
  assert.ok(g('applyRoute')('#/casks/' + ch));
  assert.equal(g('routeNow')().hash, '#/casks/' + ch, 'a chapter no longer reads as a chapter');
});
await test('W3 Back: the home, a style by its row, Back to the home and Home; a cold style walks up by replaces; a chapter\u2019s door and a bottle\u2019s door each Back to where they were', async () => {
  const e = entries[0];
  const B = boot({ hash: '#/casks' });
  await settle();
  const s0 = B.state();
  assert.equal(s0.key, 'casks');
  assert.ok(B.tap({ class: 'caskstyle-row', href: href(e.id) }), 'the home draws no row for ' + e.id);
  await settle();
  const s1 = B.state();
  eq([s1.key, s1.hash, s1.at], ['casks/style/' + e.id, href(e.id), s0.at + 1]);
  assert.equal(count(B.view(), /data-act="back"/g), 1, 'one Back on the style');
  const walk = [];
  for (let i = 0; i < 2; i++) { B.tap({ 'data-act': 'back' }); await settle(); walk.push(B.state().key); }
  eq(walk, ['casks', 'home']);
  const C = boot({ hash: href(e.id) });
  await settle();
  eq([C.state().key, C.state().d], ['casks/style/' + e.id, 0]);
  const up = [];
  for (let i = 0; i < 2; i++) { C.tap({ 'data-act': 'back' }); await settle(); up.push(C.state().key); }
  eq(up, ['casks', 'home']);
  assert.equal(C.history.length, 1, 'walking up a cold style grew the history');
  const N = boot({ hash: '#/casks/style/no-such-style' });
  await settle();
  eq([N.state().key, N.state().hash, N.history.length], ['casks', '#/casks', 1]);
  const ch = e.chapters[0];
  const D = boot({ hash: '#/casks/' + ch });
  await settle();
  const d0 = D.state();
  assert.ok(D.tap({ id: 'caskstyle-d-' + e.id }), 'the chapter ' + ch + ' draws no door to ' + e.id);
  await settle();
  eq([D.state().key, D.state().at], ['casks/style/' + e.id, d0.at + 1]);
  D.tap({ 'data-act': 'back' }); await settle();
  assert.equal(D.state().key, 'casks/' + ch, 'Back from a chapter\u2019s door');
  const withShelf = entries.find((x) => x.shelf.length);
  if (!withShelf) { notes.push('W3 a bottle\u2019s door: no style written yet holds a shelf bottle'); return; }
  const b = withShelf.shelf[0];
  const S = boot({ hash: '#/menu/backbar/' + b });
  await settle();
  const t0 = S.state();
  assert.ok(S.tap({ class: 'btn btn-ghost backbar-style', href: href(withShelf.id) }), 'the bottle ' + b + ' draws no door to ' + withShelf.id);
  await settle();
  eq([S.state().key, S.state().at], ['casks/style/' + withShelf.id, t0.at + 1]);
  S.tap({ 'data-act': 'back' }); await settle();
  assert.equal(S.state().key, 'menu/backbar/' + b, 'Back from a bottle\u2019s door');
});
const SECTIONS = ['table', 'pour', 'guest', 'law', 'made', 'taste', 'differs', 'houses', 'shelf', 'chapter', 'canon', 'recall'];
const PICTURE = /<(?:img|iframe|video|picture|source|svg|object|embed)\b|url\(/i;
await test('W4 rendering: the home gains At the table: every style after Today\u2019s cask study, the families in order, every style a row in roster order', () => {
  run("caskOpen('');");
  const out = g('renderCasks')();
  const at = out.indexOf('id="caskstyle-home"');
  assert.ok(at > out.indexOf('class="cask-section cask-daily"') && at < out.indexOf('class="cask-comparison"'), 'the section is not after Today\u2019s cask study');
  assert.ok(out.includes('<h3 id="caskstyle-home-h">At the table: every style</h3>'), 'the heading');
  const sec = out.slice(at, out.indexOf('</section>', out.lastIndexOf('class="caskstyle-row"')));
  assert.ok(sec.includes('data-act="caskstyle-practise" data-deck="caskstyles">Practise the cards<') && sec.includes('data-act="quiz-go" data-m="caskstyles">Take the quiz<') && sec.includes('data-act="deck" data-deck="caskstyles:again">Due or missed<'), 'Practise the cards, Take the quiz and Due or missed');
  const heads = [...sec.matchAll(/class="caskstyle-family-h" id="caskstyle-f-([a-z]+)"/g)].map((m) => m[1]);
  eq(heads, plan.families.map((f) => f.id).filter((f) => entries.some((e) => e.family === f)), 'the families are not in order');
  const rows = [...sec.matchAll(/class="caskstyle-row" id="caskstyle-r-([a-z0-9-]+)"/g)].map((m) => m[1]);
  eq(rows, plan.families.flatMap((f) => entries.filter((e) => e.family === f.id).map((e) => e.id)), 'every style a row, family by family');
  for (const e of entries) {
    const one = sec.slice(sec.indexOf('id="caskstyle-r-' + e.id + '"'), sec.indexOf('</a>', sec.indexOf('id="caskstyle-r-' + e.id + '"')));
    assert.ok(one.includes(esc(e.name)) && one.includes(esc(e.lines.s10)), e.id + ': the row\u2019s name and ten second line');
  }
  assert.ok(!PICTURE.test(sec), 'a picture in the section');
});
await test('W4 rendering: every style in the shelf\u2019s order of sections, the lines placed, recall and sources closed, Previous and Next in its family, nothing written', () => {
  fresh();
  const before = JSON.stringify(g('progress'));
  for (const e of entries) {
    run("caskStyleOpen(" + JSON.stringify(e.id) + ")");
    const out = g('renderCasks')();
    assert.ok(/^<article class="cask-atlas caskstyle-page">/.test(out), e.id + ': not drawn as a style page');
    assert.ok(out.includes('<h2 tabindex="-1">' + esc(e.name) + '</h2>'), e.id + ': its name is not the heading');
    const head = out.slice(0, out.indexOf('</header>'));
    const fam = g('caskStyleFamilyTitle')(e.family);
    assert.ok(head.includes('The family</span> ' + esc(fam)), e.id + ': the family');
    if (e.respell) assert.ok(head.includes('Say it</span> ' + esc(e.respell)), e.id + ': Say it');
    else assert.ok(!head.includes('Say it'), e.id + ': Say it drawn empty');
    const want = SECTIONS.filter((s) => (s !== 'shelf' || e.shelf.length) && (s !== 'canon' || e.canon.length) && (s !== 'chapter' || e.chapters.length));
    const at = want.map((s) => out.indexOf('id="caskstyle-p-' + s + '"'));
    assert.ok(at.every((i) => i >= 0), e.id + ': a section is missing ' + want.filter((s, i) => at[i] < 0).join(', '));
    eq(at, at.slice().sort((a, b) => a - b), e.id + ': the sections are out of order');
    assert.ok(out.indexOf('<details class="caskstyle-sources">') > at[at.length - 1], e.id + ': Sources are not after Recall');
    assert.ok(out.includes('<p class="caskstyle-s45">' + esc(e.lines.s45) + '</p>'), e.id + ': the forty-five is not the large line');
    assert.ok(/<div class="caskstyle-sale"><p class="caskstyle-label">The sale<\/p><p>/.test(out) && out.includes(esc(e.lines.sale)), e.id + ': the sale');
    const quiet = out.slice(out.indexOf('<div class="caskstyle-quiet">'));
    assert.ok(quiet.indexOf(esc(e.lines.s10)) >= 0 && quiet.indexOf(esc(e.lines.s20)) > quiet.indexOf(esc(e.lines.s10)), e.id + ': the ten and the twenty are not quiet beneath');
    assert.ok(out.indexOf('class="caskstyle-s45"') < out.indexOf('class="caskstyle-sale"') && out.indexOf('class="caskstyle-sale"') < out.indexOf('class="caskstyle-quiet"'), e.id + ': the forty-five, the sale, then the quiet lines');
    Object.keys(e.serve).forEach((k) => assert.ok(out.includes(esc(e.serve[k])), e.id + ': serve.' + k));
    e.guest.forEach((x) => assert.ok(out.includes(esc(x.q)) && out.includes(esc(x.a)), e.id + ': a guest question'));
    ['law', 'made', 'taste', 'compare'].forEach((k) => assert.ok(out.includes(esc(e[k])), e.id + ': ' + k));
    e.benchmarks.forEach((b) => assert.ok(out.includes('<li>' + esc(b) + '</li>'), e.id + ': the house ' + b));
    assert.ok(/<details class="caskstyle-recall"><summary>/.test(out) && !/<details class="caskstyle-recall" open/.test(out), e.id + ': Recall before you reveal is not drawn closed');
    assert.ok(!/<details class="caskstyle-sources" open/.test(out), e.id + ': Sources drawn open');
    const famList = entries.filter((x) => x.family === e.family), i = famList.indexOf(e);
    const prev = famList[i - 1], next = famList[i + 1];
    const pager = out.slice(out.indexOf('<nav class="caskstyle-pager"') >= 0 ? out.indexOf('<nav class="caskstyle-pager"') : out.length);
    assert.equal(!!prev, pager.includes('class="btn btn-ghost caskstyle-prev" href="' + (prev ? href(prev.id) : '') + '"'), e.id + ': Previous');
    assert.equal(!!next, pager.includes('class="btn btn-ghost caskstyle-next" href="' + (next ? href(next.id) : '') + '"'), e.id + ': Next');
    if (prev || next) assert.ok(out.indexOf('<nav class="caskstyle-pager"') > out.indexOf('<details class="caskstyle-sources">'), e.id + ': Previous and Next are not last');
    assert.ok(!PICTURE.test(out), e.id + ': a picture');
    const text = strip(out);
    eq(peopleIn(text, people), [], e.id + ': names a person');
    assert.ok(!HOUSE_NAME.test(text), e.id + ': names the house');
    assert.ok(!/[$\u00a3\u20ac]/.test(text), e.id + ': a price');
    assert.ok(!SUPERLATIVE.test(text) && !SUPERLATIVE_MORE.test(text), e.id + ': sells (' + ((text.match(SUPERLATIVE) || text.match(SUPERLATIVE_MORE)) || [])[0] + ')');
    assert.ok(!VERDICT.test(text), e.id + ': allergen or health talk');
    assert.ok(!DASH.test(text), e.id + ': a dash on the page');
  }
  assert.equal(JSON.stringify(g('progress')), before, 'rendering wrote progress');
});
await test('W4 rendering: every Cask Atlas chapter draws Styles to present with a door to each style that names it, in roster order, and none where no style does', () => {
  const bad = [];
  for (const c of CHAPTERS) {
    const out = g('caskChapterHTML')(g('caskChapter')(c.id));
    const want = entries.filter((e) => e.chapters.includes(c.id)).map((e) => e.id);
    const doors = [...out.matchAll(/class="btn btn-ghost caskstyle-door" id="caskstyle-d-([a-z0-9-]+)" href="([^"]+)"/g)];
    if (JSON.stringify(doors.map((m) => m[1])) !== JSON.stringify(want)) bad.push(c.id + ': doors ' + doors.map((m) => m[1]).join(',') + ', not ' + want.join(','));
    doors.forEach((m) => { if (m[2] !== href(m[1])) bad.push(c.id + ': the door to ' + m[1] + ' goes to ' + m[2]); });
    if (!want.length && /Styles to present/.test(out)) bad.push(c.id + ': Styles to present drawn empty');
    if (want.length && !out.includes('<h3 id="caskstyle-doors-h">Styles to present</h3>')) bad.push(c.id + ': no Styles to present heading');
  }
  eq(bad, []);
});
await test('W4 rendering: every liquor shelf bottle of a style draws Its style at the table with a door to each of its styles, and no other bottle does', () => {
  const bad = [];
  for (const b of BOTTLES) {
    const out = g('backbarDetailHTML')(g('backbarEntry')(b.id));
    const want = entries.filter((e) => e.shelf.includes(b.id)).map((e) => href(e.id));
    const doors = [...out.matchAll(/class="btn btn-ghost backbar-style" href="([^"]+)"/g)].map((m) => m[1]);
    if (JSON.stringify(doors) !== JSON.stringify(want)) bad.push(b.id + ': doors ' + doors.join(',') + ', not ' + want.join(','));
    if (want.length && !out.includes('<h3 id="backbar-d-style">Its style at the table</h3>')) bad.push(b.id + ': no Its style at the table');
    if (!want.length && /backbar-d-style/.test(out)) bad.push(b.id + ': Its style at the table drawn with no style');
    if (want.length && !(out.indexOf('id="backbar-d-style"') > out.indexOf('id="backbar-d-links"') && out.indexOf('id="backbar-d-style"') < out.indexOf('id="backbar-d-recall"'))) bad.push(b.id + ': the door is not between In the Ledger and Recall');
  }
  eq(bad, []);
});
await test('W5 recall, the deck: a blind front, a forged early grade refused, the answer after Flip, the style read and Back to the same card, our key only, a readable Deck done', async () => {
  const e = entries[0];
  const B = boot({ hash: href(e.id) });
  await settle();
  B.run('progress.cards = {}; saveProgress();');
  B.run("progress.cards['My Bar \u00b7 Existing'] = { r: 17, w: 2, last: 1 };");
  assert.ok(B.tap({ 'data-act': 'caskstyle-practise', 'data-deck': 'caskstyles' }), 'Practise the cards is not drawn on the style');
  await settle();
  assert.equal(B.run('state.fc.stage + " " + state.fc.mode'), 'run caskstyles');
  const n = B.run('state.fc.deck.length');
  assert.equal(n, cards.length);
  const c = plain(B.run('state.fc.deck[0]')), key = B.g('cardKey')(c);
  let v = B.view();
  assert.ok(v.includes('<div class="caskstyle-question">' + esc(c.name) + '</div>'), 'the prompt is not the front');
  assert.ok(!strip(v).includes(c.back.slice(0, 40)), 'the front shows the answer');
  assert.ok(!/data-act="fc-grade"/.test(v) && !/caskstyle-read-link/.test(v) && !PICTURE.test(v), 'the front offers a grade, the style or a picture');
  B.forge({ 'data-act': 'fc-grade', 'data-ok': '1' });
  await settle();
  assert.ok(!B.g('progress').cards[key] && B.run('state.fc.idx') === 0, 'a forged grade before Flip was recorded');
  assert.ok(B.tap({ 'data-act': 'fc-flip' }));
  await settle();
  v = B.view();
  assert.ok(v.includes(esc(c.back).slice(0, 40)), 'the answer is not drawn after Flip');
  const s0 = B.state();
  assert.ok(B.tap({ class: 'btn btn-ghost caskstyle-read-link', href: href(c.itemId) }), 'Learn why is not drawn after Flip');
  await settle();
  eq([B.state().key, B.state().at], ['casks/style/' + c.itemId, s0.at + 1], 'Learn why opens the style by one push');
  B.tap({ 'data-act': 'back' }); await settle();
  eq([B.state().key, B.run('state.fc.flipped'), B.g('cardKey')(B.run('state.fc.deck[state.fc.idx]'))], [s0.key, true, key], 'Back from the style is not the same revealed card');
  const rest = JSON.stringify(Object.assign({}, B.g('progress'), { cards: null }));
  assert.ok(B.tap({ 'data-act': 'fc-grade', 'data-ok': '0' }));
  await settle();
  eq(Object.keys(B.g('progress').cards).sort(), ['My Bar \u00b7 Existing', key].sort(), 'grading wrote another key');
  assert.equal(B.g('progress').cards[key].w, 1);
  assert.equal(B.g('progress').cards['My Bar \u00b7 Existing'].r, 17);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { cards: null })), rest, 'grading wrote outside progress.cards');
  for (let i = 1; i < n; i++) { B.tap({ 'data-act': 'fc-flip' }); await settle(); B.tap({ 'data-act': 'fc-grade', 'data-ok': '1' }); await settle(); }
  v = B.view();
  assert.ok(/Deck done/.test(v), 'no Deck done');
  assert.ok(!v.includes('Cask Styles \u00b7'), 'Deck done shows a raw key');
  assert.ok(v.includes(esc(c.group + ': ' + c.name)), 'Deck done does not name the missed card readably');
  assert.ok(B.tap({ 'data-act': 'fc-rerun-miss' }));
  await settle();
  assert.equal(B.run('state.fc.mode'), 'caskstyles');
  eq(B.run('state.fc.deck.map(cardKey)'), [key]);
  const E = boot({ hash: '#/casks' });
  await settle();
  E.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.ok(E.tap({ 'data-act': 'deck', 'data-deck': 'caskstyles:again' }), 'Due or missed is not drawn on the home');
  await settle();
  assert.equal(E.run('state.fc.stage'), 'setup');
  assert.ok(/No cards in this deck yet/.test(E.view()) && !/data-act="fc-start"/.test(E.view()), 'an empty Due or missed starts a run');
});
await test('W5 recall, Today\u2019s cask study: a due style card is dealt, revealed with its style door, read and Back to the same card, graded on its key alone; an unseen one never', async () => {
  const B = boot({ hash: '#/casks' });
  await settle();
  B.run('progress.cards = {}; saveProgress(); render();');
  await settle();
  assert.ok(!plain(B.g('caskDaily')()).some((r) => r.style), 'Today\u2019s cask study deals an unseen style card');
  const e = entries[entries.length - 1], key = KEY(e.id), now = Date.now();
  B.run('progress.cards[' + JSON.stringify(key) + '] = { r: 1, w: 0, reps: 1, ef: 2.5, ivl: 1, last: ' + (now - 3 * 86400000) + ', due: ' + (now - 86400000) + ' }; saveProgress(); render();');
  await settle();
  const daily = plain(B.g('caskDaily')());
  assert.ok(daily.some((r) => r.style === e.id && r.key === key), 'Today\u2019s cask study does not deal the due style card');
  assert.ok(B.tap({ 'data-act': 'cask-start', 'data-mode': 'cards', 'data-s': 'today', 'data-id': 'all' }), 'Start today\u2019s study');
  await settle();
  const idx = B.run('caskState().run.rows.findIndex(function(r){ return r.style === ' + JSON.stringify(e.id) + '; })');
  assert.ok(idx >= 0, 'the run holds no style row');
  B.run('caskState().run.idx = ' + idx + '; render();'); await settle();
  let v = B.view();
  assert.ok(v.includes('<h2 tabindex="-1">' + esc(e.recall[0].prompt) + '</h2>'), 'the style prompt is not the front');
  assert.ok(!/caskstyle-run-door/.test(v) && !/class="cask-answer"/.test(v), 'the front shows the answer or the style door');
  B.tap({ 'data-act': 'cask-flip' }); await settle();
  v = B.view();
  assert.ok(v.includes(esc(e.recall[0].answer).slice(0, 40)), 'the answer after Reveal');
  const s0 = B.state();
  assert.ok(B.tap({ id: 'caskstyle-run-' + e.id }), 'no door to the style after Reveal');
  await settle();
  eq([B.state().key, B.state().at], ['casks/style/' + e.id, s0.at + 1], 'the door opens the style by one push');
  B.tap({ 'data-act': 'back' }); await settle();
  eq([B.state().key, B.run('caskState().run.idx'), B.run('caskState().run.flipped')], [s0.key, idx, true], 'Back from the style is not the same revealed card');
  const before = plain(B.g('progress').cards[key]);
  const rest = JSON.stringify(Object.assign({}, B.g('progress'), { cards: null }));
  const others = JSON.stringify(Object.keys(B.g('progress').cards).filter((k) => k !== key).sort());
  B.tap({ 'data-act': 'cask-grade', 'data-k': 'yes' }); await settle();
  const after = plain(B.g('progress').cards[key]);
  assert.ok(after.r === before.r + 1 && after.reps > before.reps, 'grading did not write the style card');
  assert.equal(JSON.stringify(Object.keys(B.g('progress').cards).filter((k) => k !== key).sort()), others, 'grading wrote another card');
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { cards: null })), rest, 'grading wrote outside progress.cards');
});
await test('W6 the quiz: through the real click, one Recent rounds row in mode caskstyles, nothing else written, Study this card and Back keep the results', async () => {
  const e = entries[0];
  const B = boot({ hash: href(e.id) });
  await settle();
  B.run("progress.cards = {}; progress.quizzes = []; progress.qa = { 'fixture-q': { r: 1, w: 0 } }; progress.levels = {}; saveProgress();");
  const before = JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null }));
  const lp = JSON.stringify([1, 2, 3, 4].map((n) => B.g('levelProgress')(n)));
  assert.ok(B.tap({ 'data-act': 'quiz-go', 'data-m': 'caskstyles' }), 'Take the quiz is not drawn on the style');
  await settle();
  const n = B.run('state.quiz.round.length');
  assert.equal(n, Math.min(10, entries.length));
  assert.equal(B.state().key, 'quiz/caskstyles');
  assert.ok(B.view().includes('Question 1 of ' + n + ' \u00b7 Every style at the table'), 'the round is not labelled Every style at the table');
  for (let i = 0; i < n; i++) {
    const right = B.run('(function(){ const q = state.quiz.round[state.quiz.idx]; return q.options.indexOf(q.answer); })()');
    B.tap({ 'data-act': 'quiz-pick', 'data-i': String(i === 0 ? (right + 1) % 4 : right) }); await settle();
    B.tap({ 'data-act': 'quiz-next' }); await settle();
  }
  const q = plain(B.g('progress').quizzes);
  assert.equal(q.length, 1, 'rows written: ' + q.length);
  eq([q[0].mode, q[0].total, q[0].score, q[0].replay], ['caskstyles', n, n - 1, false]);
  assert.equal(JSON.stringify(Object.assign({}, B.g('progress'), { quizzes: null })), before, 'the round wrote outside progress.quizzes');
  assert.equal(JSON.stringify([1, 2, 3, 4].map((m) => B.g('levelProgress')(m))), lp, 'level progress moved');
  assert.equal(B.state().hash, '#/quiz/caskstyles/done');
  const done = B.view();
  const study = [...done.matchAll(/data-act="hash" data-h="([^"]+)">Study this card</g)].map((m) => m[1]);
  assert.equal(study.length, 1, 'Study this card for the one miss');
  assert.match(study[0], /^#\/casks\/style\/[a-z0-9-]+$/);
  const at = B.state().at;
  B.tap({ 'data-act': 'hash', 'data-h': study[0] }); await settle();
  eq([B.state().key, B.state().at], [study[0].slice(2), at + 1]);
  B.tap({ 'data-act': 'back' }); await settle();
  assert.equal(B.state().hash, '#/quiz/caskstyles/done');
  assert.equal(B.run('state.quiz.missedQ.length'), 1, 'Back lost the results');
  assert.equal(B.g('modeLabel')('caskstyles'), 'Every style at the table');
  B.run("progress.quizzes = [{ date: 'd', ts: 1, score: 9, total: 10, mode: 'caskstyles' }, { date: 'd', ts: 2, score: 3, total: 10, mode: 'caskstyles' }];");
  assert.ok(!/last 2 rounds/.test(B.g('dashboardHTML')()), 'the dashboard\u2019s trend counts a style round');
  const learn = B.g('quizLearnCardData')(B.g('cardByKey')(KEY(e.id)));
  assert.ok(learn && learn.title === e.name && learn.body.includes(esc(e.law).slice(0, 30)), 'Learn why does not read the style');
});
await test('W7 the Practise rows after the Cask Atlas door, the search index (one entry per style, each landing) and the key ownership', () => {
  const pick2 = g('fcPickHTML')();
  const block = pick2.slice(pick2.indexOf('aria-label="Every style at the table"'));
  assert.ok(pick2.indexOf('aria-label="Every style at the table"') > pick2.indexOf('class="cask-door"'), 'the rows are not after the Cask Atlas door');
  const rows = block.slice(0, block.indexOf('</nav>'));
  assert.ok(rows.includes('data-act="deck" data-deck="caskstyles"') && rows.includes('data-act="deck" data-deck="caskstyles:again"') && rows.includes('data-act="quiz-go" data-m="caskstyles"'), 'the rows are not the deck, its misses and the quiz');
  const ix = g('buildSearchIndex')();
  const mine = ix.filter((r) => /^#\/casks\/style\//.test(r.h));
  assert.equal(mine.length, entries.length, 'search entries');
  for (const r of mine) {
    run("state.tab = 'home';");
    assert.ok(g('applyRoute')(r.h));
    run('navNormalise()');
    assert.equal(g('routeNow')().hash, r.h);
    assert.ok(!DASH.test(r.t + ' ' + r.s), 'a dash in the search entry');
  }
  assert.ok(/caskStyleOwnsKey/.test(readFileSync(join(JS_DIR, 'app.js'), 'utf8')), 'app.js leaves the style card\u2019s link to the deck\u2019s keys');
  assert.ok(g('caskStyleOwnsKey')({ target: { closest: (s) => (/caskstyle-read-link/.test(s) ? {} : null) } }), 'the read link is not the page\u2019s own');
});

if (process.argv.includes('--mutations')) await mutations();

for (const n of notes) console.log('  note: ' + n);
if (problems.length) {
  console.error('\n  FAIL ' + problems.length + ' problem(s)');
  for (const p of problems.slice(0, 60)) console.error('    ' + p);
  process.exit(1);
}
console.log('At the table, every style: ' + checks + ' checks passed; ' + entries.length + ' of ' + roster.length + ' styles' + (SEED ? ' (a partial build: the whole roster and its counts wait for every style)' : '')
  + ', ' + cards.length + ' recall cards, ' + entries.reduce((n, e) => n + e.quiz.length, 0) + ' questions, ' + entries.reduce((n, e) => n + e.shelf.length, 0) + ' shelf doors.');

/* ---- the gate proves it can fail -------------------------------------------------
   Each mutation breaks one rule in a scratch copy of the shipped tree (index.html,
   js/, css/); this gate, run on it with LEDGER_JS, must go red. */
async function mutations() {
  const MUT = [
    ['js/data-caskstyles.js edited by hand', 'js/data-caskstyles.js', 'edition: "', 'edition: "hand-'],
    ['the card keyed under another name', 'js/ui-caskstyles.js', "cards.push({ src: 'Cask Styles',", "cards.push({ src: 'Cask Style',"],
    ['a bad style id opening a page', 'js/ui-caskstyles.js', "  s.item = caskStyleEntry(id) ? id : '';\n", "  s.item = id;\n"],
    ['the style\u2019s address not printed', 'js/ui-casks.js', "  if(s.page==='style' && typeof caskStyleRouteNow==='function'){ const r=caskStyleRouteNow(); if(r) return r; }\n", ''],
    ['the answer on the blind front', 'js/ui-caskstyles.js', "+ front + heading + question\n", "+ front + heading + question + caskStyleParas(card.back)\n"],
    ['the grade before Flip let through', 'js/app.js', "['Fall 2026','Bar Compass','Brew Guide','Back Bar','Cask Styles']", "['Fall 2026','Bar Compass','Brew Guide','Back Bar']"],
    ['a quiz question banked by a qkey', 'js/ui-caskstyles.js', "ckey: caskStyleKey(e.id), caskStyleId: e.id };", "ckey: caskStyleKey(e.id), qkey: 'caskstyle-' + e.id, caskStyleId: e.id };"],
    ['Recall before you reveal drawn open', 'js/ui-caskstyles.js', "'<details class=\"caskstyle-recall\"><summary>'", "'<details class=\"caskstyle-recall\" open><summary>'"],
    ['the sale under no brass rule', 'css/caskstyles.css', '.caskstyle-sale{border-top:2px solid var(--brass);', '.caskstyle-sale{'],
    ['a chapter\u2019s Styles to present left out', 'js/ui-casks.js', "    +(typeof caskStyleChapterDoorsHTML==='function'?caskStyleChapterDoorsHTML(c.id):'')\n", ''],
    ['a bottle\u2019s style door left out', 'js/ui-backbar.js', "    + backbarStylesHTML(e)\n", ''],
    ['Today\u2019s cask study dealing an unseen style card', 'js/ui-caskstyles.js', "return caskStyleCards().filter(function(c){ return caskStyleRecord(c, now).due; })", "return caskStyleCards().filter(function(c){ return true; })"],
  ];
  let held = 0;
  for (const [name, file, from, to] of MUT) {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-caskstyles-'));
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
