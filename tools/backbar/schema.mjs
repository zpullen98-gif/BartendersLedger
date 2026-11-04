/* The one validator of a liquor shelf fragment and of the roster
   (tools/backbar/style.txt, 4 November 2026). build-backbar.mjs refuses a
   fragment that fails it and check-backbar.mjs reads it for its shape test,
   so the rule lives here once.

     import { loadContext, validateFragment, planProblems } from './schema.mjs';
     const ctx = loadContext();                          // the plan, the name lists, the Ledger's names
     const problems = validateFragment(fragment, ctx);   // [] when sound

   Every problem names its field first ("lines.s45: 84 words, 90 to 110").
   houseUses and houseFamily are the reference statement of the house rule
   (style.txt, THE HOUSE): the page and the gate match the pack the same way.
   The generic readers (words, fold, the capitalised runs and the people
   test) are the Coffee and tea validator's, imported, so the two pages judge
   a name the same way. Nothing here writes a file. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { words, fold, strings, nameProblems as brewNameProblems, AMERICAN as BREW_AMERICAN } from '../brew/schema.mjs';

export { words, fold, strings };
export const BB_DIR = dirname(fileURLToPath(import.meta.url));
export const LEDGER_ROOT = join(BB_DIR, '..', '..');

export const FIELDS = ['id', 'name', 'respell', 'aka', 'group', 'producer', 'place', 'photo', 'confidence', 'facts', 'made', 'taste',
  'lines', 'serve', 'guest', 'story', 'watch', 'asks', 'house', 'library', 'recall', 'quiz', 'sources'];
export const CONFIRM_FIELDS = ['id', 'name', 'group', 'photo', 'where', 'read', 'ask'];
export const FACT_FIELDS = ['base', 'age', 'cask', 'abv', 'law'];
export const FACT_MAX = { base: 20, age: 16, cask: 20, abv: 14, law: 25 };
export const LINE_FIELDS = ['s10', 's20', 's45', 'sale'];
export const LINE_LIMITS = { s10: [12, 25], s20: [25, 50], s45: [90, 110], sale: [15, 45] };
export const SERVE_FIELDS = ['neat', 'rocks', 'glass', 'classic'];
export const SERVE_MAX = 20;
export const LIMITS = { made: [40, 90], taste: [20, 60], guest: [12, 40], story: [30, 110] };
export const WATCH = { min: 2, max: 4, words: 25 };
export const ASK_MAX = 30;
export const NAME_MAX = 60;
export const PLACE_MAX = 12;
export const ENTRY_MAX = 750;
export const RECALL = { prompt: 25, answer: [15, 70] };
export const QUIZ = { stem: 30, option: 12, explain: 45 };
export const GROUP_IDS = ['liqueurs-amari', 'cognac', 'tequila-mezcal-pisco', 'american-whiskey', 'confirm'];
export const CONFIDENCE = ['clear', 'probable'];
export const CHUNKS = ['k1', 'k2', 'k3', 'k4', 'k5'];
export const PHOTOS = [1, 2, 3, 4, 5];
/* the reading words a page shows: the cap on the whole entry counts these */
export const PROSE_FIELDS = ['made', 'taste', 'lines', 'serve', 'guest', 'story', 'watch', 'asks'];
/* a card's key is a person's saved record: frozen in keys.v1.json */
export const KEY_PREFIX = 'Back Bar \u00b7 ';
export function cardKey(id){ return KEY_PREFIX + id + '/recall'; }

/* the dash in every form the suite refuses, and a spaced hyphen standing in for one */
export const DASH = /[\u2012\u2013\u2014\u2015]|&[mn]dash;|&#821[12];|&#x201[34];|\x2d\x2d| \x2d /i;
/* glyphs below U+2190 the style still refuses: the degree sign and the fractions */
export const GLYPH = /[\u00b0\u00bc-\u00be\u2150-\u215f]/;
/* American spellings: the Coffee and tea list and the cellar's own words */
export const AMERICAN_MORE = /\b(?:aging|barreled|barreling|fiber|savor(?:y|s|ed|ing)?|odors?|ardor|vigor|armor|caliber|meager|somber|aluminum|liters?|theaters?|center(?:ed|s)?|harbors?|neighbor(?:s|ing)?|honored|colored|flavored)\b/i;
/* words that sell rather than teach: the owner's rule is no superlative at all */
export const SUPERLATIVE = /\b(?:best|finest|greatest|rarest|smoothest|purest|richest|oldest|most (?:famous|celebrated|prized|coveted|sought|popular|iconic|beloved|revered|respected|awarded|decorated)|world[\u2019']?s|legendary|iconic|ultimate|unparalleled|unrivall?ed|exquisite|award[- ]winning|best[- ]selling|sought[- ]after|coveted|cult|holy grail|unicorn|perfect|perfectly|amazing|delicious|unique|incredible|world[- ]class|luxurious|premium|crown jewel|masterpiece)\b/i;
/* verdicts the house leaves to the kitchen, the bar and the doctor; no allergen talk at all */
export const VERDICT = /\b(?:allerg\w*|gluten\w*|coeliac|celiac|dairy[- ]free|nut[- ]free|vegan|vegetarian|kosher|halal|sulphites?|sulfites?|safe for|healthy|healthier|detox|antioxidants?|good for you|medicinal benefits?|cures?|remed(?:y|ies)|aids? digestion|settles? the stomach|boosts? (?:your )?(?:immune|immunity|metabolism|energy))\b/i;
/* no price anywhere */
export const PRICE = /[$\u00a3\u20ac\u00a5\u00a2]|\b(?:price[ds]?|pricing|pricey|costs?|costly|dollars?|cents|cheap(?:er|est)?|expensive|bargain|value for money|affordable|msrp|retail(?:s|ing)?|resale)\b/i;
/* nothing volatile: allocation, scarcity, the market, the current owner or maker */
export const VOLATILE = /\b(?:allocat\w*|lotter(?:y|ies)|secondary market|flipp\w*|sold out|hard to find|limited supply|in stock|out of stock|owned by|now owns?|now owned|owner of the brand|parent (?:company|group)|acquir\w*|acquisition|bought by|sold to|portfolio|current(?:ly)? (?:master )?(?:distiller|blender)s?)\b/i;
/* a master distiller or blender with a name after the title is a person, and very likely living */
export const NAMED_ROLE = /\b(?:master|head) (?:distiller|blender)s?,? [A-Z][a-z]/;
export const HOUSE_NAME = /Brennan/i;

/* ---- small readers ------------------------------------------------------------ */
function isStr(v){ return typeof v === 'string'; }
function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
export function slugify(s){ return String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
/* sentences, with initials and dotted abbreviations (D.O.M., O.F.C., Thomas H. Handy, St.) not ending one */
export function sentences(s){
  const t = String(s == null ? '' : s).trim()
    .replace(/\b(?:[A-Z]\.){2,}/g, (m) => m.replace(/\./g, '\u0001'))
    .replace(/\b(?:St|Mt|No|Dr|Mr|Mrs|Ms|Jr|Sr|vs|approx|ca)\./g, (m) => m.replace(/\./g, '\u0001'))
    .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, '$1\u0001');
  if(!t) return 0;
  const ends = t.match(/[.!?]["\u201d\u2019)]?(?=\s|$)/g) || [];
  const tail = /[.!?]["\u201d\u2019)]?$/.test(t) ? 0 : 1;
  return ends.length + tail;
}
/* the reading words of an entry: what its page shows above the drill */
export function proseWords(f){
  return PROSE_FIELDS.reduce((n, k) => n + strings(f && f[k], k).reduce((m, [, s]) => m + words(s), 0), 0);
}
/* a whole folded phrase inside folded text */
export function hasPhrase(text, term){
  const t = fold(term);
  return !!t && (' ' + fold(text) + ' ').indexOf(' ' + t + ' ') >= 0;
}

/* ---- the Ledger: the names a fragment may carry and the links it may make ---- */
function readJSON(p, fallback){ try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { if(fallback !== undefined) return fallback; throw e; } }
function runScript(file, expose){
  const box = {};
  vm.createContext(box);
  vm.runInContext(readFileSync(join(LEDGER_ROOT, 'js', file), 'utf8') + '\n;this.__out = ' + expose + ';', box);
  return box.__out;
}
/* PRODUCERS lives in ui-reference.js beside renderers that want a page, so the literal is read alone */
export function readProducers(){
  const src = readFileSync(join(LEDGER_ROOT, 'js', 'ui-reference.js'), 'utf8');
  const head = 'const PRODUCERS = ';
  const i = src.indexOf(head + '[');
  if(i < 0) return [];
  let depth = 0, j = i + head.length, quote = null;
  for(; j < src.length; j++){
    const c = src[j];
    if(quote){ if(c === '\\') j++; else if(c === quote) quote = null; continue; }
    if(c === '"' || c === "'" || c === '`'){ quote = c; continue; }
    if(c === '[') depth++;
    else if(c === ']'){ depth--; if(!depth) break; }
  }
  return vm.runInNewContext('(' + src.slice(i + head.length, j + 1) + ')');
}
export function loadContext(opts = {}){
  const dir = opts.dir || BB_DIR;
  const plan = opts.plan || readJSON(join(dir, 'plan.json'));
  const people = opts.people || readJSON(join(dir, 'people.json'), { names: [] });
  const proper = opts.properNouns || readJSON(join(dir, 'proper-nouns.json'), { words: [], pairs: [] });
  const companiesFile = opts.companies || readJSON(join(dir, 'companies.json'), { companies: [] });
  const companies = Array.isArray(companiesFile) ? companiesFile : (companiesFile.companies || []);
  let cocktails = [], producers = [], casks = [], na = [];
  try { cocktails = (runScript('data-core.js', 'COCKTAILS') || []).map((c) => c.name); } catch (e) {}
  try { producers = readProducers().map((p) => p.name); } catch (e) {}
  try { casks = (runScript('data-casks.js', 'CASK_CHAPTERS') || []).map((c) => ({ id: c.id, title: c.title })); } catch (e) {}
  try {
    const src = readFileSync(join(LEDGER_ROOT, 'js', 'ui-reference.js'), 'utf8');
    na = [...src.matchAll(/\{\s*name:"([^"]+)",\s*cat:"/g)].map((m) => m[1]);
  } catch (e) {}
  let pack = opts.pack || null;
  if(!pack && opts.packPath && existsSync(opts.packPath)) pack = readJSON(opts.packPath).house || null;
  const bottles = plan.entries.filter((e) => e.group !== 'confirm');
  const appNames = [].concat(cocktails, producers, na, companies, plan.entries.map((e) => e.name), casks.map((c) => c.title));
  /* the app's own lower-case vocabulary: a sentence's first word found here is an ordinary word, not a name */
  const vocab = new Set();
  ['data-core.js', 'data-lore.js', 'data-casks.js', 'data-service.js', 'data-questions.js', 'data-brew.js'].forEach((f) => {
    try { (readFileSync(join(LEDGER_ROOT, 'js', f), 'utf8').match(/\b[a-z][a-z']+\b/g) || []).forEach((w) => vocab.add(w)); } catch (e) {}
  });
  return {
    dir, plan, pack, vocab, appNames, companies,
    people: Array.isArray(people) ? people : (people.names || []),
    proper,
    canonSlugs: new Set(cocktails.map(slugify)),
    producerSlugs: new Set(producers.map(slugify)),
    caskIds: new Set(casks.map((c) => c.id)),
    byId: new Map(plan.entries.map((e) => [e.id, e])),
    bottles,
    groups: new Set((plan.groups || []).map((g) => g.id))
  };
}

/* ---- the house: the reference statement of the rule the page and the gate keep ---- */
function kept(mark){ return isObj(mark) && mark.by === 'person' ? mark.value : null; }
/* every printed or kept name an item carries, each a separate text */
export function itemTexts(item, components){
  const out = [];
  (Array.isArray(item.spec) ? item.spec : []).forEach((s) => { if(isStr(s)) out.push(s); });
  (Array.isArray(item.ingredients) ? item.ingredients : []).forEach((s) => { if(isStr(s)) out.push(s); });
  const named = kept(item.ingredientsNamed);
  (Array.isArray(named) ? named : []).forEach((s) => { if(isStr(s)) out.push(s); });
  (components || []).forEach((c) => {
    if(c && c.kind === 'ingredient' && Array.isArray(c.itemIds) && c.itemIds.indexOf(item.id) >= 0 && isStr(c.name)) out.push(c.name);
  });
  return out;
}
/* the occurrences of every bottle's match terms in one text, as [start, end, bottleId] over the folded text */
function occurrences(text, roster){
  const hay = ' ' + fold(text) + ' ';
  const out = [];
  roster.forEach((b) => ((b.house && b.house.match) || []).forEach((term) => {
    const t = ' ' + fold(term) + ' ';
    if(t.trim() === '') return;
    for(let at = hay.indexOf(t); at >= 0; at = hay.indexOf(t, at + 1)) out.push([at, at + t.length, b.id]);
  }));
  return out;
}
/* the house items that pour this bottle: an occurrence inside a longer one of another bottle does not count */
export function houseUses(pack, entry, roster){
  if(!pack) return [];
  const comps = Array.isArray(pack.components) ? pack.components : [];
  const items = [].concat(pack.cocktails || [], pack.dishes || []);
  const ids = [];
  items.forEach((item) => {
    const hit = itemTexts(item, comps).some((text) => {
      const occ = occurrences(text, roster);
      return occ.some(([s, e, id]) => id === entry.id && !occ.some(([s2, e2, id2]) => id2 !== id && s2 <= s && e2 >= e && (e2-s2) > (e-s)));
    });
    if(hit) ids.push(item.id);
  });
  return ids;
}
/* the pack's producer profiles from the same house: a family term in the profile's maker */
export function houseFamily(pack, entry){
  if(!pack) return [];
  const out = [];
  (pack.components || []).forEach((c) => {
    const p = kept(c.producer);
    if(!p || !isStr(p.who)) return;
    if(((entry.house && entry.house.family) || []).some((term) => hasPhrase(p.who, term))) out.push({ id: c.id, name: c.name, who: p.who, itemIds: (c.itemIds || []).slice() });
  });
  return out;
}

/* ---- names: the people list and the capitalised runs (the Coffee and tea rule) ---- */
export function nameProblems(f, ctx){
  /* the terms and links are data, not prose; a source's url is an address */
  const prose = {};
  ['name', 'respell', 'aka', 'producer', 'place', 'facts', 'made', 'taste', 'lines', 'serve', 'guest', 'story', 'watch', 'asks', 'recall', 'quiz'].forEach((k) => { if(k in f) prose[k] = f[k]; });
  if(Array.isArray(f.sources)) prose.sources = f.sources.map((s) => ({ title: isObj(s) ? s.title : s }));
  const bctx = ctx.__brew || (ctx.__brew = { proper: ctx.proper, appNames: ctx.appNames, people: ctx.people, vocab: ctx.vocab });
  return brewNameProblems(prose, bctx);
}

/* ---- language: the same rules over every string -------------------------------- */
export function languageProblems(f){
  const out = [];
  for(const [path, s] of strings(f, '')){
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
    /* the match and family terms are product and producer names, matched not read */
    const term = /^house\.(?:match|family)\[\d+\]$/.test(path) || /^library\./.test(path);
    if(term) continue;
    const am = s.match(BREW_AMERICAN) || s.match(AMERICAN_MORE);
    if(am) out.push(path + ': American spelling "' + am[0] + '" (British: flavour, colour, ageing, centre, litre, -ise)');
    const sup = s.match(SUPERLATIVE);
    if(sup) out.push(path + ': "' + sup[0] + '" is a superlative or sells rather than teaches');
    const ver = s.match(VERDICT);
    if(ver) out.push(path + ': "' + ver[0] + '" is allergen, dietary or health talk (the page carries the one pointer)');
    const pr = s.match(PRICE);
    if(pr) out.push(path + ': "' + pr[0] + '" talks price (no price anywhere)');
    const vo = s.match(VOLATILE);
    if(vo) out.push(path + ': "' + vo[0] + '" is volatile (allocation, the market, the current owner or maker)');
    const nr = s.match(NAMED_ROLE);
    if(nr) out.push(path + ': "' + nr[0] + '..." names a distiller or blender (nobody living)');
    if(HOUSE_NAME.test(s)) out.push(path + ': names the house (the page names it from the pack)');
    if(/\b\d+\s?-\s?\d+\b/.test(s)) out.push(path + ': a range with a hyphen (write "12 to 15")');
  }
  return out;
}

/* ---- a quiz question --------------------------------------------------------- */
function quizProblems(f){
  const out = [];
  if(!Array.isArray(f.quiz) || f.quiz.length !== 3) return ['quiz: exactly 3 questions'];
  f.quiz.forEach((q, i) => {
    const at = 'quiz[' + i + ']';
    if(!isObj(q)){ out.push(at + ': a question'); return; }
    Object.keys(q).filter((k) => ['id', 'q', 'options', 'a', 'explain'].indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a quiz field'));
    if(q.id !== 'q' + (i + 1)) out.push(at + '.id: q' + (i + 1));
    if(!isStr(q.q) || !q.q.trim() || words(q.q) > QUIZ.stem) out.push(at + '.q: the stem, at most ' + QUIZ.stem + ' words');
    if(!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !isStr(o) || !o.trim())) { out.push(at + '.options: four options'); return; }
    q.options.forEach((o, j) => { if(words(o) > QUIZ.option) out.push(at + '.options[' + j + ']: ' + words(o) + ' words, at most ' + QUIZ.option); });
    if(new Set(q.options.map(fold)).size !== 4) out.push(at + '.options: four different options');
    if(q.options.some((o) => /\b(?:all|none|both) of the (?:above|options)\b/i.test(o))) out.push(at + '.options: no "all of the above"');
    if(!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { out.push(at + '.a: 0 to 3'); return; }
    const key = q.options[q.a], fk = fold(key);
    if(isStr(q.q) && fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) out.push(at + '.q: the stem carries the answer');
    const longest = Math.max(...q.options.filter((o, j) => j !== q.a).map((o) => o.length));
    if(key.length > longest * 1.6 && key.length-longest >= 15) out.push(at + '.options: the answer is much the longest (a length clue)');
    if(!isStr(q.explain) || !q.explain.trim() || words(q.explain) > QUIZ.explain) out.push(at + '.explain: at most ' + QUIZ.explain + ' words');
  });
  const keys = f.quiz.map((q) => q && q.a);
  if(keys.every((a) => Number.isInteger(a)) && new Set(keys).size === 1) out.push('quiz: all three answers sit in one position (spread them)');
  return out;
}

/* ---- a bottle's fragment ------------------------------------------------------- */
function capped(out, path, v, lo, hi){
  if(!isStr(v) || !v.trim()) { out.push(path + ': a string'); return; }
  const n = words(v);
  if(n < lo || n > hi) out.push(path + ': ' + n + ' words, ' + (lo ? lo + ' to ' + hi : 'at most ' + hi));
}
export function validateFragment(f, ctx){
  const out = [];
  if(!isObj(f)) return ['fragment: one JSON object'];
  const row = ctx.byId.get(f.id);
  if(!isStr(f.id) || !row){ out.push('id: "' + f.id + '" is not a plan id'); return out; }
  if(row.group === 'confirm') return ['id: "' + f.id + '" is a confirm row: it lives in plan.json and has no fragment'];
  FIELDS.filter((k) => !(k in f)).forEach((k) => out.push(k + ': missing'));
  Object.keys(f).filter((k) => FIELDS.indexOf(k) < 0).forEach((k) => out.push(k + ': not a fragment field'));
  if(out.length) return out;

  if(f.name !== row.name) out.push('name: must be the plan\u2019s "' + row.name + '"');
  if(!isStr(f.name) || f.name.length > NAME_MAX) out.push('name: at most ' + NAME_MAX + ' characters');
  if(!isStr(f.respell) || f.respell.length > NAME_MAX) out.push('respell: a string of at most ' + NAME_MAX + ' characters');
  else if(f.respell && (!/^[A-Za-z' ,-]+$/.test(f.respell) || !/[A-Z]/.test(f.respell))) out.push('respell: syllables joined by hyphens, the stressed one in capitals (BEN-eh-dik-TEEN)');
  if(!Array.isArray(f.aka) || f.aka.some((a) => !isStr(a) || !a.trim() || a.length > NAME_MAX)) out.push('aka: a list of names, each at most ' + NAME_MAX + ' characters');
  else if(new Set(f.aka.map(fold).concat(fold(f.name))).size !== f.aka.length + 1) out.push('aka: a name twice, or the name itself');
  if(f.group !== row.group) out.push('group: must be the plan\u2019s "' + row.group + '"');
  if(f.photo !== row.photo) out.push('photo: must be the plan\u2019s ' + row.photo);
  if(f.confidence !== row.confidence) out.push('confidence: must be the plan\u2019s "' + row.confidence + '"');
  if(!isStr(f.producer) || !f.producer.trim() || f.producer.length > NAME_MAX) out.push('producer: the company that makes it, at most ' + NAME_MAX + ' characters');
  else if((ctx.companies || []).indexOf(f.producer) < 0) out.push('producer: "' + f.producer + '" is not on companies.json');
  capped(out, 'place', f.place, 1, PLACE_MAX);

  if(!isObj(f.facts)) out.push('facts: an object');
  else {
    FACT_FIELDS.filter((k) => !(k in f.facts)).forEach((k) => out.push('facts.' + k + ': missing'));
    Object.keys(f.facts).filter((k) => FACT_FIELDS.indexOf(k) < 0).forEach((k) => out.push('facts.' + k + ': not a fact field'));
    FACT_FIELDS.forEach((k) => { if(k in f.facts) capped(out, 'facts.' + k, f.facts[k], 1, FACT_MAX[k]); });
    const abv = f.facts.abv;
    if(isStr(abv)){
      if(row.yearly){ if(!/^varies by release\b/.test(abv)) out.push('facts.abv: a yearly or batch release begins "varies by release"'); }
      else if(!/^\d{2}(?:\.\d{1,2})?% ABV(?: \(\d{2,3}(?:\.\d{1,2})? proof\))?$/.test(abv)) out.push('facts.abv: as the label states it, "40% ABV (80 proof)"');
    }
  }
  Object.keys(LIMITS).forEach((k) => capped(out, k, f[k], LIMITS[k][0], LIMITS[k][1]));

  if(!isObj(f.lines)) out.push('lines: an object');
  else {
    LINE_FIELDS.filter((k) => !(k in f.lines)).forEach((k) => out.push('lines.' + k + ': missing'));
    Object.keys(f.lines).filter((k) => LINE_FIELDS.indexOf(k) < 0).forEach((k) => out.push('lines.' + k + ': not a line'));
    LINE_FIELDS.forEach((k) => { if(k in f.lines) capped(out, 'lines.' + k, f.lines[k], LINE_LIMITS[k][0], LINE_LIMITS[k][1]); });
    if(isStr(f.lines.sale) && sentences(f.lines.sale) !== 2) out.push('lines.sale: exactly two sentences (the hook, then the pour or the drink), found ' + sentences(f.lines.sale));
    const names = [f.name].concat(Array.isArray(f.aka) ? f.aka : []);
    ['s10', 's45'].forEach((k) => { if(isStr(f.lines[k]) && !names.some((n) => hasPhrase(f.lines[k], n))) out.push('lines.' + k + ': names the bottle (its name or an aka)'); });
  }
  if(!isObj(f.serve)) out.push('serve: an object');
  else {
    SERVE_FIELDS.filter((k) => !(k in f.serve)).forEach((k) => out.push('serve.' + k + ': missing'));
    Object.keys(f.serve).filter((k) => SERVE_FIELDS.indexOf(k) < 0).forEach((k) => out.push('serve.' + k + ': not a serve field'));
    SERVE_FIELDS.forEach((k) => { if(k in f.serve) capped(out, 'serve.' + k, f.serve[k], 1, SERVE_MAX); });
  }
  if(!Array.isArray(f.watch) || f.watch.length < WATCH.min || f.watch.length > WATCH.max) out.push('watch: ' + WATCH.min + ' to ' + WATCH.max + ' lines');
  else f.watch.forEach((s, i) => capped(out, 'watch[' + i + ']', s, 1, WATCH.words));
  if(!Array.isArray(f.asks)) out.push('asks: a list (may be empty for a clear bottle)');
  else {
    f.asks.forEach((s, i) => capped(out, 'asks[' + i + ']', s, 1, ASK_MAX));
    if(row.confidence === 'probable' && !f.asks.length) out.push('asks: a probable bottle keeps at least one lineup question');
  }
  if(!same(f.house, row.house)) out.push('house: must be the plan\u2019s, copied ' + JSON.stringify(row.house));
  if(!same(f.library, row.library)) out.push('library: must be the plan\u2019s, copied ' + JSON.stringify(row.library));

  if(!Array.isArray(f.recall) || f.recall.length !== 1) out.push('recall: exactly one card');
  else {
    const r = f.recall[0];
    if(!isObj(r) || r.id !== 'recall') out.push('recall[0].id: recall');
    else {
      Object.keys(r).filter((k) => ['id', 'prompt', 'answer'].indexOf(k) < 0).forEach((k) => out.push('recall[0].' + k + ': not a recall field'));
      capped(out, 'recall[0].prompt', r.prompt, 1, RECALL.prompt);
      const names = [f.name].concat(Array.isArray(f.aka) ? f.aka : []);
      if(isStr(r.prompt) && !names.some((n) => hasPhrase(r.prompt, n))) out.push('recall[0].prompt: names the bottle (its name or an aka)');
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

/* ---- a confirm row (plan.json) ---------------------------------------------- */
export function confirmProblems(e){
  const out = [];
  const at = 'plan "' + e.id + '"';
  Object.keys(e).filter((k) => CONFIRM_FIELDS.indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a confirm field'));
  CONFIRM_FIELDS.filter((k) => !(k in e)).forEach((k) => out.push(at + '.' + k + ': missing'));
  if(PHOTOS.indexOf(e.photo) < 0) out.push(at + '.photo: 1 to 5');
  if(!isStr(e.name) || !e.name.trim() || e.name.length > NAME_MAX) out.push(at + '.name: what can be read or a description, at most ' + NAME_MAX + ' characters');
  ['where', 'read'].forEach((k) => { if(!isStr(e[k]) || !e[k].trim() || words(e[k]) > 40) out.push(at + '.' + k + ': at most 40 words'); });
  if(!isStr(e.ask) || !e.ask.trim() || words(e.ask) > ASK_MAX) out.push(at + '.ask: the lineup question, at most ' + ASK_MAX + ' words');
  else if(!/\?$/.test(e.ask.trim())) out.push(at + '.ask: a question');
  const lang = languageProblems({ name: e.name, where: e.where, read: e.read, ask: e.ask }).map((p) => at + '.' + p);
  out.push(...lang);
  return out;
}

/* ---- the plan itself, before any fragment is read ------------------------------ */
const BOTTLE_FIELDS = ['id', 'name', 'group', 'photo', 'confidence', 'chunk', 'where', 'read', 'ask', 'house', 'library', 'yearly', 'note'];
export function planProblems(plan, ctx){
  const out = [];
  if(!plan || !Array.isArray(plan.entries)) return ['plan.json: entries missing'];
  const groups = (plan.groups || []).map((g) => g.id);
  if(!same(groups, GROUP_IDS)) out.push('plan.groups: must be ' + GROUP_IDS.join(', ') + ', in that order');
  const ids = new Set();
  plan.entries.forEach((e, i) => {
    const at = 'plan.entries[' + i + '] "' + (e && e.id) + '"';
    if(!isObj(e)){ out.push(at + ': an object'); return; }
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id || '')) out.push(at + '.id: lower case words and hyphens');
    if(ids.has(e.id)) out.push(at + '.id: twice');
    ids.add(e.id);
    if(GROUP_IDS.indexOf(e.group) < 0) out.push(at + '.group: "' + e.group + '"');
    if(e.group === 'confirm'){ out.push(...confirmProblems(e)); return; }
    Object.keys(e).filter((k) => BOTTLE_FIELDS.indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a roster field'));
    if(!isStr(e.name) || !e.name.trim() || e.name.length > NAME_MAX) out.push(at + '.name: at most ' + NAME_MAX + ' characters');
    if(PHOTOS.indexOf(e.photo) < 0) out.push(at + '.photo: 1 to 5');
    if(CONFIDENCE.indexOf(e.confidence) < 0) out.push(at + '.confidence: clear or probable');
    if(CHUNKS.indexOf(e.chunk) < 0) out.push(at + '.chunk: k1 to k5');
    if(typeof e.yearly !== 'boolean') out.push(at + '.yearly: true or false');
    if(e.confidence === 'probable' && (!isStr(e.ask) || !e.ask.trim())) out.push(at + '.ask: a probable bottle carries its lineup question');
    const h = e.house;
    if(!isObj(h) || !Array.isArray(h.match) || !Array.isArray(h.family) || Object.keys(h).length !== 2) out.push(at + '.house: { match: [], family: [] }');
    else {
      if(e.confidence === 'clear' && !h.match.length) out.push(at + '.house.match: a clear bottle has at least one exact product name');
      if(!h.family.length) out.push(at + '.house.family: at least one producer name');
      h.match.concat(h.family).forEach((t) => { if(!isStr(t) || fold(t).length < 3) out.push(at + '.house: "' + t + '" is not a term'); });
    }
    const l = e.library;
    if(!isObj(l) || !isStr(l.producer) || !isStr(l.cask) || !Array.isArray(l.canon) || Object.keys(l).length !== 3) out.push(at + '.library: { producer, cask, canon: [] }');
    else if(ctx){
      if(l.producer && ctx.producerSlugs && !ctx.producerSlugs.has(l.producer)) out.push(at + '.library.producer: "' + l.producer + '" is no PRODUCERS slug');
      if(l.cask && ctx.caskIds && !ctx.caskIds.has(l.cask)) out.push(at + '.library.cask: "' + l.cask + '" is no CASK_CHAPTERS id');
      l.canon.forEach((c) => { if(ctx.canonSlugs && !ctx.canonSlugs.has(c)) out.push(at + '.library.canon: "' + c + '" is no COCKTAILS slug'); });
      if(new Set(l.canon).size !== l.canon.length) out.push(at + '.library.canon: a slug twice');
    }
  });
  /* one match term means one bottle */
  const owner = new Map();
  plan.entries.filter((e) => e.group !== 'confirm' && isObj(e.house)).forEach((e) => (e.house.match || []).forEach((t) => {
    const k = fold(t);
    if(owner.has(k) && owner.get(k) !== e.id) out.push('plan: the match term "' + t + '" belongs to both ' + owner.get(k) + ' and ' + e.id);
    owner.set(k, e.id);
  }));
  return out;
}
