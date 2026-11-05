/* The one validator of a cask style fragment and of the roster
   (tools/caskstyles/style.txt, 5 November 2026). build-caskstyles.mjs refuses
   a fragment that fails it and check-caskstyles.mjs reads it for its shape
   test, so the rule lives here once.

     import { loadContext, validateFragment, planProblems } from './schema.mjs';
     const ctx = loadContext();                          // the roster, the name lists, the Ledger's names
     const problems = validateFragment(fragment, ctx);   // [] when sound

   Every problem names its field first ("lines.s45: 84 words, 90 to 110").
   The voice is the liquor shelf's: the generic readers (words, fold, the
   sentences, the whole phrase test) and the refusals (the dash, the glyphs,
   American spelling, the superlative, allergen and health talk, price, the
   volatile fact, a named distiller, the house's name) are imported from
   tools/backbar/schema.mjs, and the capitalised run test is the Coffee and
   tea validator's, so the three pages judge a sentence and a name the same
   way. The shelf's people list and proper nouns are read beside this
   pipeline's own. Nothing here writes a file. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { words, fold, strings, sentences, hasPhrase, slugify, readProducers,
  DASH, GLYPH, AMERICAN_MORE, SUPERLATIVE, VERDICT, PRICE, VOLATILE, NAMED_ROLE, HOUSE_NAME } from '../backbar/schema.mjs';
import { nameProblems as brewNameProblems, AMERICAN as BREW_AMERICAN } from '../brew/schema.mjs';

export { words, fold, strings, sentences, hasPhrase, slugify };
export const CS_DIR = dirname(fileURLToPath(import.meta.url));
export const LEDGER_ROOT = join(CS_DIR, '..', '..');
const BB_DIR = join(CS_DIR, '..', 'backbar');

export const FIELDS = ['id', 'name', 'respell', 'family', 'law', 'made', 'taste', 'lines', 'serve', 'guest', 'compare',
  'benchmarks', 'shelf', 'chapters', 'canon', 'recall', 'quiz', 'sources'];
export const LIMITS = { law: [25, 90], made: [40, 90], taste: [20, 60], compare: [20, 60] };
export const LINE_FIELDS = ['s10', 's20', 's45', 'sale'];
export const LINE_LIMITS = { s10: [12, 25], s20: [25, 50], s45: [90, 110], sale: [15, 45] };
/* how we pour it: the ones that fit, in this order; glass always, classic whenever the roster gives canon drinks */
export const SERVE_FIELDS = ['neat', 'water', 'rocks', 'highball', 'glass', 'classic'];
export const SERVE = { min: 3, words: 20 };
export const GUEST = { min: 2, max: 4, q: 20, a: 40 };
export const BENCH = { min: 3, max: 6, chars: 60, words: 6 };
export const NAME_MAX = 60;
export const ENTRY_MAX = 800;
export const RECALL = { prompt: 25, answer: [15, 70] };
export const QUIZ = { stem: 30, option: 12, explain: 45 };
export const FAMILY_IDS = ['american', 'scotch', 'irish', 'japanese', 'canadian'];
export const CHUNKS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
/* the roster row: the plan's own fields */
export const ROW_FIELDS = ['id', 'name', 'family', 'chunk', 'terms', 'neighbour', 'chapters', 'shelf', 'canon', 'note'];
/* the fragment copies these from its row, exactly */
export const COPIED = ['family', 'shelf', 'chapters', 'canon'];
/* the reading words a page shows: the cap on the whole entry counts these */
export const PROSE_FIELDS = ['law', 'made', 'taste', 'lines', 'serve', 'guest', 'compare'];
/* a card's key is a person's saved record: frozen in keys.v1.json */
export const KEY_PREFIX = 'Cask Styles · ';
export function cardKey(id){ return KEY_PREFIX + id + '/recall'; }

/* the owner's rule is no superlative at all: the shelf's list, and the -est words and "the most" a style page reaches for */
export const SUPERLATIVE_MORE = /\b(?:largest|biggest|smallest|youngest|longest|shortest|tallest|earliest|heaviest|lightest|sweetest|softest|smoothest|smokiest|peatiest|strongest|highest|lowest|boldest|purest|truest|definitive|quintessential|the (?:most|least) [a-z]+)\b/i;
/* a range is written with "to"; a statute number with two hyphens (57-2-106) is not a range */
export const HYPHEN_RANGE = /(?<![\d-])\d+\s?-\s?\d+(?![\d-])/;

/* ---- small readers ------------------------------------------------------------ */
function isStr(v){ return typeof v === 'string'; }
function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
function readJSON(p, fallback){ try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { if(fallback !== undefined) return fallback; throw e; } }
function runScript(file, expose){
  const box = {};
  vm.createContext(box);
  vm.runInContext(readFileSync(join(LEDGER_ROOT, 'js', file), 'utf8') + '\n;this.__out = ' + expose + ';', box);
  return box.__out;
}
/* the reading words of an entry: what its page shows above the drill */
export function proseWords(f){
  return PROSE_FIELDS.reduce((n, k) => n + strings(f && f[k], k).reduce((m, [, s]) => m + words(s), 0), 0);
}
/* the words that name a style: its name and the roster's terms */
export function styleTerms(row){ return [row.name].concat(Array.isArray(row.terms) ? row.terms : []); }
export function namesStyle(text, row){ return styleTerms(row).some((t) => hasPhrase(text, t)); }

/* ---- the Ledger: the names a fragment may carry and the links it may make ---- */
export function loadContext(opts = {}){
  const dir = opts.dir || CS_DIR;
  const plan = opts.plan || readJSON(join(dir, 'plan.json'));
  const listOf = (v, key) => Array.isArray(v) ? v : ((v && v[key]) || []);
  const people = [].concat(listOf(readJSON(join(BB_DIR, 'people.json'), { names: [] }), 'names'),
    listOf(opts.people || readJSON(join(dir, 'people.json'), { names: [] }), 'names'));
  const bbProper = readJSON(join(BB_DIR, 'proper-nouns.json'), { words: [], pairs: [] });
  const ownProper = opts.properNouns || readJSON(join(dir, 'proper-nouns.json'), { words: [], pairs: [] });
  const pairs = [].concat(bbProper.pairs || [], ownProper.pairs || []);
  const proper = { words: [].concat(bbProper.words || [], ownProper.words || []),
    pairs: pairs.concat(pairs.filter((n) => /['\u2019]s\b/.test(n)).map((n) => n.replace(/['\u2019]s\b/g, ''))) };
  const houses = listOf(opts.houses || readJSON(join(dir, 'houses.json'), { houses: [] }), 'houses');
  const bbCompanies = listOf(readJSON(join(BB_DIR, 'companies.json'), { companies: [] }), 'companies');
  let cocktails = [], producers = [], casks = [], na = [], backbar = [];
  try { cocktails = (runScript('data-core.js', 'COCKTAILS') || []).map((c) => c.name); } catch (e) {}
  try { producers = readProducers().map((p) => p.name); } catch (e) {}
  try { casks = (runScript('data-casks.js', 'CASK_CHAPTERS') || []).map((c) => ({ id: c.id, title: c.title })); } catch (e) {}
  try { backbar = ((runScript('data-backbar.js', 'BACKBAR_GUIDE') || {}).entries || []).map((e) => ({ id: e.id, name: e.name, group: e.group, aka: e.aka || [] })); } catch (e) {}
  try {
    const src = readFileSync(join(LEDGER_ROOT, 'js', 'ui-reference.js'), 'utf8');
    na = [...src.matchAll(/\{\s*name:"([^"]+)",\s*cat:"/g)].map((m) => m[1]);
  } catch (e) {}
  const entries = Array.isArray(plan.entries) ? plan.entries : [];
  const named = [].concat(cocktails, producers, na, houses, bbCompanies, entries.map((e) => e.name), casks.map((c) => c.title),
    backbar.map((b) => b.name), [].concat(...backbar.map((b) => b.aka)));
  /* the run reader drops a possessive (Maker's Mark reads as Maker Mark), so each name is allowed in that form too */
  const appNames = named.concat(named.filter((n) => /['\u2019]s\b/.test(n)).map((n) => n.replace(/['\u2019]s\b/g, '')));
  /* the app's own lower-case vocabulary: a sentence's first word found here is an ordinary word, not a name */
  const vocab = new Set();
  ['data-core.js', 'data-lore.js', 'data-casks.js', 'data-service.js', 'data-questions.js', 'data-brew.js', 'data-backbar.js'].forEach((f) => {
    try { (readFileSync(join(LEDGER_ROOT, 'js', f), 'utf8').match(/\b[a-z][a-z']+\b/g) || []).forEach((w) => vocab.add(w)); } catch (e) {}
  });
  return {
    dir, plan, vocab, appNames, houses, people, proper,
    cocktailBySlug: new Map(cocktails.map((n) => [slugify(n), n])),
    caskIds: new Set(casks.map((c) => c.id)),
    shelfIds: new Set(backbar.filter((b) => b.group !== 'confirm').map((b) => b.id)),
    backbar,
    byId: new Map(entries.map((e) => [e.id, e]))
  };
}

/* ---- names: the people list and the capitalised runs (the Coffee and tea rule) ---- */
export function nameProblems(f, ctx){
  /* the links are ids, not prose; a source's url is an address */
  const prose = {};
  ['name', 'respell', 'law', 'made', 'taste', 'lines', 'serve', 'guest', 'compare', 'benchmarks', 'recall', 'quiz'].forEach((k) => { if(k in f) prose[k] = f[k]; });
  if(Array.isArray(f.sources)) prose.sources = f.sources.map((s) => ({ title: isObj(s) ? s.title : s }));
  const bctx = ctx.__brew || (ctx.__brew = { proper: ctx.proper, appNames: ctx.appNames, people: ctx.people, vocab: ctx.vocab });
  return brewNameProblems(prose, bctx);
}

/* ---- language: the same rules over every string -------------------------------- */
export function languageProblems(f){
  const out = [];
  for(const [path, s] of strings(f, '')){
    /* the roster's links are ids, matched not read */
    if(/^(?:shelf|chapters|canon)\[\d+\]$/.test(path)) continue;
    const url = /^sources\[\d+\]\.url$/.test(path);
    if(!url && DASH.test(s)) out.push(path + ': carries a dash (use a comma, a colon or a full stop)');
    for(const ch of s){
      const cp = ch.codePointAt(0);
      if(cp >= 0x2190){ out.push(path + ': carries U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ', at or above U+2190'); break; }
    }
    if(GLYPH.test(s)) out.push(path + ': carries a degree sign or a fraction glyph');
    if(url) continue;
    /* a source's title is the site's own words: the dash, glyph and house rules hold it, the voice rules do not */
    if(/^sources\[\d+\]\.title$/.test(path)){ if(HOUSE_NAME.test(s)) out.push(path + ': names the house'); continue; }
    const am = s.match(BREW_AMERICAN) || s.match(AMERICAN_MORE);
    if(am) out.push(path + ': American spelling "' + am[0] + '" (British: flavour, colour, ageing, centre, litre, -ise)');
    const sup = s.match(SUPERLATIVE) || s.match(SUPERLATIVE_MORE);
    if(sup) out.push(path + ': "' + sup[0] + '" is a superlative or sells rather than teaches');
    const ver = s.match(VERDICT);
    if(ver) out.push(path + ': "' + ver[0] + '" is allergen, dietary or health talk (none on this page)');
    const pr = s.match(PRICE);
    if(pr) out.push(path + ': "' + pr[0] + '" talks price (no price anywhere)');
    const vo = s.match(VOLATILE);
    if(vo) out.push(path + ': "' + vo[0] + '" is volatile (allocation, the market, the current owner or maker)');
    const nr = s.match(NAMED_ROLE);
    if(nr) out.push(path + ': "' + nr[0] + '..." names a distiller or blender (nobody living)');
    if(HOUSE_NAME.test(s)) out.push(path + ': names the house (a style page never does)');
    if(HYPHEN_RANGE.test(s)) out.push(path + ': a range with a hyphen (write "12 to 15")');
  }
  return out;
}

/* ---- a quiz question (the liquor shelf's rule) ---------------------------------- */
export function quizProblems(f){
  const out = [];
  if(!Array.isArray(f.quiz) || f.quiz.length !== 3) return ['quiz: exactly 3 questions'];
  f.quiz.forEach((q, i) => {
    const at = 'quiz[' + i + ']';
    if(!isObj(q)){ out.push(at + ': a question'); return; }
    Object.keys(q).filter((k) => ['id', 'q', 'options', 'a', 'explain'].indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a quiz field'));
    if(q.id !== 'q' + (i + 1)) out.push(at + '.id: q' + (i + 1));
    if(!isStr(q.q) || !q.q.trim() || words(q.q) > QUIZ.stem) out.push(at + '.q: the stem, at most ' + QUIZ.stem + ' words');
    else if(!/\?$/.test(q.q.trim())) out.push(at + '.q: a question, ending with a question mark');
    if(!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !isStr(o) || !o.trim())) { out.push(at + '.options: four options'); return; }
    q.options.forEach((o, j) => { if(words(o) > QUIZ.option) out.push(at + '.options[' + j + ']: ' + words(o) + ' words, at most ' + QUIZ.option); });
    if(new Set(q.options.map(fold)).size !== 4) out.push(at + '.options: four different options');
    if(q.options.some((o) => /\b(?:all|none|both) of the (?:above|options)\b/i.test(o))) out.push(at + '.options: no "all of the above"');
    if(!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { out.push(at + '.a: 0 to 3'); return; }
    const key = q.options[q.a], fk = fold(key);
    if(isStr(q.q) && fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) out.push(at + '.q: the stem carries the answer');
    const longest = Math.max(...q.options.filter((o, j) => j !== q.a).map((o) => o.length));
    if(key.length > longest * 1.6 && key.length - longest >= 15) out.push(at + '.options: the answer is much the longest (a length clue)');
    if(!isStr(q.explain) || !q.explain.trim() || words(q.explain) > QUIZ.explain) out.push(at + '.explain: at most ' + QUIZ.explain + ' words');
  });
  const keys = f.quiz.map((q) => q && q.a);
  if(keys.every((a) => Number.isInteger(a)) && new Set(keys).size === 1) out.push('quiz: all three answers sit in one position (spread them)');
  return out;
}

/* ---- a style's fragment --------------------------------------------------------- */
function capped(out, path, v, lo, hi){
  if(!isStr(v) || !v.trim()) { out.push(path + ': a string'); return; }
  const n = words(v);
  if(n < lo || n > hi) out.push(path + ': ' + n + ' words, ' + (lo > 1 ? lo + ' to ' + hi : 'at most ' + hi));
}
export function validateFragment(f, ctx){
  const out = [];
  if(!isObj(f)) return ['fragment: one JSON object'];
  const row = ctx.byId.get(f.id);
  if(!isStr(f.id) || !row){ out.push('id: "' + f.id + '" is not a roster id'); return out; }
  FIELDS.filter((k) => !(k in f)).forEach((k) => out.push(k + ': missing'));
  Object.keys(f).filter((k) => FIELDS.indexOf(k) < 0).forEach((k) => out.push(k + ': not a fragment field'));
  if(out.length) return out;

  if(f.name !== row.name) out.push('name: must be the roster’s "' + row.name + '"');
  if(!isStr(f.respell) || f.respell.length > NAME_MAX) out.push('respell: a string of at most ' + NAME_MAX + ' characters');
  else if(f.respell && (!/^[A-Za-z' ,-]+$/.test(f.respell) || !/[A-Z]/.test(f.respell))) out.push('respell: syllables joined by hyphens, the stressed one in capitals (EYE-luh)');
  COPIED.forEach((k) => { if(!same(f[k], row[k])) out.push(k + ': must be the roster’s, copied ' + JSON.stringify(row[k])); });

  Object.keys(LIMITS).forEach((k) => capped(out, k, f[k], LIMITS[k][0], LIMITS[k][1]));
  const nb = ctx.byId.get(row.neighbour);
  if(nb && isStr(f.compare) && !namesStyle(f.compare, nb)) out.push('compare: names its neighbour, ' + nb.name + ' (its name or a roster term)');

  if(!isObj(f.lines)) out.push('lines: an object');
  else {
    LINE_FIELDS.filter((k) => !(k in f.lines)).forEach((k) => out.push('lines.' + k + ': missing'));
    Object.keys(f.lines).filter((k) => LINE_FIELDS.indexOf(k) < 0).forEach((k) => out.push('lines.' + k + ': not a line'));
    LINE_FIELDS.forEach((k) => { if(k in f.lines) capped(out, 'lines.' + k, f.lines[k], LINE_LIMITS[k][0], LINE_LIMITS[k][1]); });
    if(isStr(f.lines.sale) && sentences(f.lines.sale) !== 2) out.push('lines.sale: exactly two sentences (the hook, then the pour or the drink), found ' + sentences(f.lines.sale));
    ['s10', 's45'].forEach((k) => { if(isStr(f.lines[k]) && !namesStyle(f.lines[k], row)) out.push('lines.' + k + ': names the style (its name or a roster term)'); });
  }

  if(!isObj(f.serve)) out.push('serve: an object');
  else {
    const keys = Object.keys(f.serve);
    keys.filter((k) => SERVE_FIELDS.indexOf(k) < 0).forEach((k) => out.push('serve.' + k + ': not a serve field (' + SERVE_FIELDS.join(', ') + ')'));
    const given = SERVE_FIELDS.filter((k) => k in f.serve);
    if(given.length < SERVE.min) out.push('serve: at least ' + SERVE.min + ' of ' + SERVE_FIELDS.join(', '));
    if(!same(keys.filter((k) => SERVE_FIELDS.indexOf(k) >= 0), given)) out.push('serve: in the order ' + SERVE_FIELDS.join(', '));
    if(!('glass' in f.serve)) out.push('serve.glass: missing (the glass is always given)');
    given.forEach((k) => capped(out, 'serve.' + k, f.serve[k], 1, SERVE.words));
    const canon = Array.isArray(row.canon) ? row.canon : [];
    if(canon.length && !('classic' in f.serve)) out.push('serve.classic: missing (the roster gives canon drinks)');
    if(!canon.length && ('classic' in f.serve)) out.push('serve.classic: the roster gives no canon drink to name');
    if(isStr(f.serve.classic) && canon.length){
      const names = canon.map((s) => ctx.cocktailBySlug.get(s)).filter(Boolean);
      if(names.length && !names.some((n) => hasPhrase(f.serve.classic, n))) out.push('serve.classic: names one of the roster’s canon drinks by its name (' + names.join(', ') + ')');
    }
  }

  if(!Array.isArray(f.guest) || f.guest.length < GUEST.min || f.guest.length > GUEST.max) out.push('guest: ' + GUEST.min + ' to ' + GUEST.max + ' questions with answers');
  else f.guest.forEach((g, i) => {
    const at = 'guest[' + i + ']';
    if(!isObj(g)){ out.push(at + ': { q, a }'); return; }
    Object.keys(g).filter((k) => ['q', 'a'].indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a guest field'));
    capped(out, at + '.q', g.q, 1, GUEST.q);
    if(isStr(g.q) && !/\?$/.test(g.q.trim())) out.push(at + '.q: the guest’s question, ending with a question mark');
    capped(out, at + '.a', g.a, 1, GUEST.a);
  });

  if(!Array.isArray(f.benchmarks) || f.benchmarks.length < BENCH.min || f.benchmarks.length > BENCH.max) out.push('benchmarks: ' + BENCH.min + ' to ' + BENCH.max + ' houses or brands');
  else {
    f.benchmarks.forEach((b, i) => {
      const at = 'benchmarks[' + i + ']';
      if(!isStr(b) || !b.trim() || b.length > BENCH.chars || words(b) > BENCH.words) { out.push(at + ': a house or brand, at most ' + BENCH.chars + ' characters'); return; }
      if((ctx.houses || []).indexOf(b) < 0) out.push(at + ': "' + b + '" is not on houses.json (a house or brand, never a person)');
    });
    if(new Set(f.benchmarks.map(fold)).size !== f.benchmarks.length) out.push('benchmarks: a house twice');
  }
  (Array.isArray(f.shelf) ? f.shelf : []).forEach((id, i) => { if(!ctx.shelfIds.has(id)) out.push('shelf[' + i + ']: "' + id + '" is no liquor shelf bottle'); });
  (Array.isArray(f.chapters) ? f.chapters : []).forEach((id, i) => { if(!ctx.caskIds.has(id)) out.push('chapters[' + i + ']: "' + id + '" is no Cask Atlas chapter'); });
  (Array.isArray(f.canon) ? f.canon : []).forEach((id, i) => { if(!ctx.cocktailBySlug.has(id)) out.push('canon[' + i + ']: "' + id + '" is no COCKTAILS slug'); });

  if(!Array.isArray(f.recall) || f.recall.length !== 1) out.push('recall: exactly one card');
  else {
    const r = f.recall[0];
    if(!isObj(r) || r.id !== 'recall') out.push('recall[0].id: recall');
    else {
      Object.keys(r).filter((k) => ['id', 'prompt', 'answer'].indexOf(k) < 0).forEach((k) => out.push('recall[0].' + k + ': not a recall field'));
      capped(out, 'recall[0].prompt', r.prompt, 1, RECALL.prompt);
      if(isStr(r.prompt) && !namesStyle(r.prompt, row)) out.push('recall[0].prompt: names the style (its name or a roster term)');
      if(isStr(r.prompt) && !/\?$/.test(r.prompt.trim())) out.push('recall[0].prompt: a question, ending with a question mark');
      capped(out, 'recall[0].answer', r.answer, RECALL.answer[0], RECALL.answer[1]);
    }
  }
  out.push(...quizProblems(f));
  if(!Array.isArray(f.sources) || f.sources.length < 2) out.push('sources: at least two');
  else {
    f.sources.forEach((s, i) => {
      if(!isObj(s) || !isStr(s.title) || !s.title.trim() || !isStr(s.url)) { out.push('sources[' + i + ']: { title, url }'); return; }
      Object.keys(s).filter((k) => ['title', 'url'].indexOf(k) < 0).forEach((k) => out.push('sources[' + i + '].' + k + ': not a source field'));
      if(s.url && !/^https:\/\/[^\s]+$/.test(s.url)) out.push('sources[' + i + '].url: https, or "" for an in-app source');
    });
    const web = f.sources.filter((s) => isObj(s) && isStr(s.url) && /^https:\/\//.test(s.url));
    if(web.length < 2) out.push('sources: at least two with https urls the author read');
    if(new Set(web.map((s) => s.url)).size !== web.length) out.push('sources: a url twice');
  }
  const total = proseWords(f);
  if(total > ENTRY_MAX) out.push('entry: ' + total + ' reading words, at most ' + ENTRY_MAX);
  out.push(...languageProblems(f));
  out.push(...nameProblems(f, ctx));
  return out;
}

/* ---- the roster itself, before any fragment is read ------------------------------ */
export function planProblems(plan, ctx){
  const out = [];
  if(!plan || !Array.isArray(plan.entries)) return ['plan.json: entries missing'];
  const fams = (plan.families || []).map((g) => g.id);
  if(!same(fams, FAMILY_IDS)) out.push('plan.families: must be ' + FAMILY_IDS.join(', ') + ', in that order');
  (plan.families || []).forEach((g, i) => { if(!isObj(g) || !isStr(g.title) || !g.title.trim()) out.push('plan.families[' + i + ']: { id, title }'); });
  if(!isObj(plan.chunks) || !same(Object.keys(plan.chunks), CHUNKS)) out.push('plan.chunks: ' + CHUNKS.join(', '));
  if(!isStr(plan.edition) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.edition)) out.push('plan.edition: a date, YYYY-MM-DD');
  const ids = new Set(), names = new Set();
  let lastFam = -1;
  plan.entries.forEach((e, i) => {
    const at = 'plan.entries[' + i + '] "' + (e && e.id) + '"';
    if(!isObj(e)){ out.push(at + ': an object'); return; }
    Object.keys(e).filter((k) => ROW_FIELDS.indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a roster field'));
    ROW_FIELDS.filter((k) => k !== 'note' && !(k in e)).forEach((k) => out.push(at + '.' + k + ': missing'));
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id || '')) out.push(at + '.id: lower case words and hyphens');
    if(ids.has(e.id)) out.push(at + '.id: twice');
    ids.add(e.id);
    if(!isStr(e.name) || !e.name.trim() || e.name.length > NAME_MAX) out.push(at + '.name: at most ' + NAME_MAX + ' characters');
    else { if(names.has(fold(e.name))) out.push(at + '.name: twice'); names.add(fold(e.name)); }
    const fi = FAMILY_IDS.indexOf(e.family);
    if(fi < 0) out.push(at + '.family: one of ' + FAMILY_IDS.join(', '));
    else { if(fi < lastFam) out.push(at + '.family: the roster runs family by family, in the families’ order'); lastFam = Math.max(lastFam, fi); }
    if(CHUNKS.indexOf(e.chunk) < 0) out.push(at + '.chunk: s1 to s7');
    if(!Array.isArray(e.terms) || !e.terms.length || e.terms.some((t) => !isStr(t) || fold(t).length < 3)) out.push(at + '.terms: at least one term that names the style');
    else if(new Set(e.terms.map(fold)).size !== e.terms.length) out.push(at + '.terms: a term twice');
    ['chapters', 'shelf', 'canon'].forEach((k) => {
      if(!Array.isArray(e[k]) || e[k].some((x) => !isStr(x) || !x)) { out.push(at + '.' + k + ': a list of ids'); return; }
      if(new Set(e[k]).size !== e[k].length) out.push(at + '.' + k + ': an id twice');
    });
    if(Array.isArray(e.chapters) && !e.chapters.length) out.push(at + '.chapters: at least one Cask Atlas chapter');
    if(ctx){
      (e.chapters || []).forEach((c) => { if(ctx.caskIds && ctx.caskIds.size && !ctx.caskIds.has(c)) out.push(at + '.chapters: "' + c + '" is no CASK_CHAPTERS id'); });
      (e.shelf || []).forEach((c) => { if(ctx.shelfIds && ctx.shelfIds.size && !ctx.shelfIds.has(c)) out.push(at + '.shelf: "' + c + '" is no liquor shelf bottle'); });
      (e.canon || []).forEach((c) => { if(ctx.cocktailBySlug && ctx.cocktailBySlug.size && !ctx.cocktailBySlug.has(c)) out.push(at + '.canon: "' + c + '" is no COCKTAILS slug'); });
    }
    if('note' in e && (!isStr(e.note) || !e.note.trim())) out.push(at + '.note: a string when present');
    if('note' in e && isStr(e.note) && DASH.test(e.note)) out.push(at + '.note: carries a dash');
  });
  plan.entries.forEach((e, i) => {
    if(isObj(e) && (!ids.has(e.neighbour) || e.neighbour === e.id)) out.push('plan.entries[' + i + '] "' + e.id + '".neighbour: another roster id');
  });
  /* one term means one style */
  const owner = new Map();
  plan.entries.filter(isObj).forEach((e) => styleTerms(e).forEach((t) => {
    const k = fold(t);
    if(owner.has(k) && owner.get(k) !== e.id) out.push('plan: the term "' + t + '" names both ' + owner.get(k) + ' and ' + e.id);
    owner.set(k, e.id);
  }));
  /* every American whiskey on the liquor shelf stands under at least one style */
  if(ctx && Array.isArray(ctx.backbar)){
    const placed = new Set([].concat(...plan.entries.filter(isObj).map((e) => e.shelf || [])));
    ctx.backbar.filter((b) => b.group === 'american-whiskey').forEach((b) => { if(!placed.has(b.id)) out.push('plan: the liquor shelf’s ' + b.id + ' stands under no style'); });
  }
  (Array.isArray(plan.seeds) ? plan.seeds : []).forEach((s) => { if(!ids.has(s)) out.push('plan.seeds: "' + s + '" is not a roster id'); });
  return out;
}
