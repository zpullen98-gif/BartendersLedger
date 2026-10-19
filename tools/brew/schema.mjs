/* The one validator of a Coffee and tea fragment (tools/brew/style.txt and the
   plan's section B, 18 October 2026). build-brew.mjs refuses a fragment that
   fails it and check-brew.mjs reads it for its shape test, so the rule lives
   here once.

     import { loadContext, validateFragment } from './schema.mjs';
     const ctx = loadContext();               // plan, names, the Library's films and names
     const problems = validateFragment(fragment, ctx);   // [] when sound

   Every problem names its field first ("make.steps[2]: 34 words, at most 30").
   Nothing here writes a file. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const BREW_DIR = dirname(fileURLToPath(import.meta.url));
export const LEDGER_ROOT = join(BREW_DIR, '..', '..');

export const FIELDS = ['id', 'name', 'respell', 'aka', 'group', 'kind', 'caffeine', 'house', 'what', 'taste', 'make', 'serve',
  'story', 'guest', 'watch', 'library', 'table', 'search', 'recall', 'quiz', 'sources', 'video'];
export const MAKE_FIELDS = ['steps', 'ratio', 'dose', 'temp', 'time', 'cup'];
export const VIDEO_FIELDS = ['url', 'id', 'title', 'channel', 'channelKind', 'label', 'watchFor', 'verifiedBy', 'checkedOn'];
export const KINDS = ['coffee', 'tea', 'cocoa'];
export const VERIFIED_BY = ['websearch', 'coffee-films', 'pack'];
/* the reading words a page shows: the cap on the whole entry counts these */
export const PROSE_FIELDS = ['caffeine', 'what', 'taste', 'make', 'serve', 'story', 'guest', 'watch'];
export const LIMITS = { what: [35, 90], taste: [15, 60], serve: [25, 80], story: [30, 110], guest: [12, 40] };
export const ENTRY_MAX = 600;
export const CHECKED_FROM = '2026-10-04';
export const CHECKED_TO = '2026-10-31';

/* the dash in every form the suite refuses, and a spaced hyphen standing in for one */
export const DASH = /[\u2012\u2013\u2014\u2015]|&[mn]dash;|&#821[12];|&#x201[34];|\x2d\x2d| \x2d /i;
/* glyphs below U+2190 the style still refuses: the degree sign and the fractions */
export const GLYPH = /[\u00b0\u00bc-\u00be\u2150-\u215f]/;
/* American spellings the Ledger's prose never uses */
export const AMERICAN = /\b(?:colou?rless|colors?|colored|coloring|flavors?|flavored|flavoring|flavorful|flavorless|favorites?|favorite|savory|centers?|centered|liters?|milliliters?|honors?|humors?|labors?|neighbors?|odors?|vapors?|harbors?|rumors?|grays?|molds?|fibers?|theaters?|aluminum|cozy|traveled|traveling|canceled|labeled|labeling|fulfill|skeptical|jewelry|catalogs?|defense|offense|caramelize[ds]?|caramelizing|oxidize[ds]?|oxidizing|aromatize[ds]?|emphasize[ds]?|realize[ds]?|recognize[ds]?|organize[ds]?|pasteurized?|homogenized?|sterilized?|standardized?|minimize[ds]?|maximize[ds]?|crystallize[ds]?|caramelization|oxidization|optimize[ds]?|apologize[ds]?|analyze[ds]?|paralyze[ds]?|practicing|practiced|mustache|pajamas|plow)\b/i;
/* words that sell rather than teach */
export const SUPERLATIVE = /\b(?:the best|perfect|perfectly|amazing|delicious|unique|incredible|world[- ]class)\b/i;
/* verdicts the house leaves to the kitchen, the bar and the doctor */
export const VERDICT = /\b(?:dairy[- ]free|gluten[- ]free|nut[- ]free|allergen[- ]free|safe for|healthy|healthier|detox|antioxidants?|good for you|aids? digestion|boosts? (?:your )?(?:immune|immunity|metabolism|energy))\b/i;
/* the one place the house's own name may stand, as the token the page fills */
export const HOUSE_TOKEN = '{house}';
export const HOUSE_NAME = /Brennan/i;
export const WATCH_URL = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/;

/* ---- small readers ------------------------------------------------------------ */
export function words(s){ const t = String(s == null ? '' : s).trim(); return t ? t.split(/\s+/).length : 0; }
export function fold(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'")
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function isStr(v){ return typeof v === 'string'; }
function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
/* every string in a value with its path, so a language problem names its field */
export function strings(v, path, out = []){
  if(isStr(v)) out.push([path, v]);
  else if(Array.isArray(v)) v.forEach((x, i) => strings(x, path + '[' + i + ']', out));
  else if(isObj(v)) Object.keys(v).forEach((k) => strings(v[k], path ? path + '.' + k : k, out));
  return out;
}
/* the reading words of an entry: what its page shows above the drill */
export function proseWords(f){
  return PROSE_FIELDS.reduce((n, k) => n + strings(f && f[k], k).reduce((m, [, s]) => m + words(s), 0), 0);
}
/* the house's own name, said the way the plan says it, as the token */
export function houseNeutral(s){ return String(s == null ? '' : s).replace(/Brennan[\u2019']s/g, HOUSE_TOKEN); }

/* ---- the context: the plan, the name lists, the Library ---------------------- */
function readJSON(p, fallback){ try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { if(fallback !== undefined) return fallback; throw e; } }
function runScripts(files, expose){
  const box = {};
  vm.createContext(box);
  const src = files.map((f) => readFileSync(join(LEDGER_ROOT, 'js', f), 'utf8')).join('\n;\n');
  vm.runInContext(src + '\n;this.__out = {' + expose.map((n) => n + ': typeof ' + n + ' === "undefined" ? undefined : ' + n).join(', ') + '};', box);
  return box.__out;
}
export function loadContext(opts = {}){
  const dir = opts.dir || BREW_DIR;
  const plan = opts.plan || readJSON(join(dir, 'plan.json'));
  const people = opts.people || readJSON(join(dir, 'people.json'), []);
  const proper = opts.properNouns || readJSON(join(dir, 'proper-nouns.json'), { words: [], pairs: [] });
  const companies = opts.companies || readJSON(join(dir, 'companies.json'), []);
  let films = [], refs = [], study = [], cocktails = [], na = [];
  try {
    const lib = runScripts(['data-coffee.js', 'data-coffee-films.js'], ['COFFEE_STUDY', 'COFFEE_REF', 'COFFEE_FILMS']);
    films = lib.COFFEE_FILMS || []; refs = lib.COFFEE_REF || []; study = lib.COFFEE_STUDY || [];
  } catch (e) {}
  try { cocktails = (runScripts(['data-core.js'], ['COCKTAILS']).COCKTAILS || []).map((c) => c.name); } catch (e) {}
  try {
    const src = readFileSync(join(LEDGER_ROOT, 'js', 'ui-reference.js'), 'utf8');
    na = [...src.matchAll(/\{\s*name:"([^"]+)",\s*cat:"/g)].map((m) => m[1]);
  } catch (e) {}
  let pack = opts.pack || null;
  if(!pack && opts.packPath && existsSync(opts.packPath)) pack = readJSON(opts.packPath).house || null;
  const appNames = [].concat(refs.map((r) => r.name), cocktails, na, plan.entries.map((e) => e.name));
  /* the app's own lower-case vocabulary: a sentence's first word found here is an ordinary word, not a name */
  const vocab = new Set();
  ['data-coffee.js', 'data-core.js', 'data-lore.js', 'data-service.js', 'data-ontap.js', 'data-questions.js'].forEach((f) => {
    try { (readFileSync(join(LEDGER_ROOT, 'js', f), 'utf8').match(/\b[a-z][a-z']+\b/g) || []).forEach((w) => vocab.add(w)); } catch (e) {}
  });
  return { dir, plan, people, proper, companies, films, refs, study, cocktails, na, pack, appNames, vocab,
    byId: new Map(plan.entries.map((e) => [e.id, e])), groups: new Set(plan.groups.map((g) => g.id)) };
}

/* ---- names: the people list and the capitalised runs ------------------------ */
const STARTERS = new Set(('the a an in on at our its it this that these those ask pour add serve use keep steep warm heat grind tamp lock start stop '
  + 'stir top bring set offer say most many some each every with without for from to of by as if when while after before then both either neither '
  + 'not no yes here there where what which who how why hot cold iced black green white sweet fresh whole brew rinse fill drop place let leave remove '
  + 'discard taste tell name call more less like unlike over under into once twice one two three four five six seven eight ten half usually often '
  + 'always never sometimes today traditionally historically originally because although though so yet but and or only just also even still a '
  + 'expect check weigh purge pull run lift press plunge boil whisk sift froth steam float spoon chill shake strain build cut tip lay make give '
  + 'guests guest servers server bars bar cafes coffee tea milk sugar cream water espresso').split(/\s+/));
/* runs of two or more capitalised words, each with whether it opens a sentence */
export function capitalisedRuns(text){
  const s = String(text || '');
  const re = /[\p{Lu}][\p{L}\p{M}\p{N}'\u2019.]*(?:-[\p{L}\p{M}\p{N}]+)*/gu;
  const out = [];
  let run = [], lastEnd = -1;
  const flush = () => { if(run.length >= 2) out.push(run.slice()); run = []; };
  let m;
  while((m = re.exec(s))){
    if(/^I(?:[\u2019'](?:ll|m|d|ve))?$/.test(m[0])){ flush(); lastEnd = -1; continue; }
    const word = m[0].replace(/[\u2019']s$/, '').replace(/\.$/, '').replace(/-(?:style|born|based|made|roasted|grown|inspired)$/i, '');
    const gap = lastEnd >= 0 ? s.slice(lastEnd, m.index) : null;
    if(run.length && !(gap === ' ')) flush();
    if(!run.length){
      const before = s.slice(0, m.index);
      const opens = !before.trim() || /[.!?:;]["\u201d\u2019)]?\s+$/.test(before) || /\(\s*$/.test(before);
      run.push({ word, opens });
    } else run.push({ word, opens: false });
    lastEnd = m.index + m[0].length;
    if(/[,;:.!?]$/.test(m[0])) { flush(); lastEnd = -1; }
  }
  flush();
  return out;
}
function covered(ws, dict){
  /* the run splits into phrases each of which the dictionary allows */
  const n = ws.length, ok = new Array(n + 1).fill(false);
  ok[0] = true;
  for(let i = 0; i < n; i++){
    if(!ok[i]) continue;
    for(let j = i + 1; j <= n; j++) if(dict.has(fold(ws.slice(i, j).join(' ')))) ok[j] = true;
  }
  return ok[n];
}
export function nameDictionary(ctx){
  const d = new Set();
  (ctx.proper.words || []).concat(ctx.proper.pairs || [], ctx.appNames || []).forEach((w) => { const f = fold(w); if(f) d.add(f); });
  return d;
}
export function peopleIn(text, people){
  const hay = ' ' + fold(text) + ' ';
  return (people || []).filter((n) => { const f = fold(n); return f && hay.indexOf(' ' + f + ' ') >= 0; });
}
export function nameProblems(f, ctx){
  const out = [];
  const dict = ctx.__dict || (ctx.__dict = nameDictionary(ctx));
  const lower = new Set((strings(f, '').map(([, s]) => s).join(' ').match(/\b[a-z][a-z']*/g) || []));
  for(const [path, s] of strings(f, '')){
    if(/^sources\[\d+\]\.url$|^video\.url$/.test(path)) continue;
    for(const n of peopleIn(s, ctx.people)) out.push(path + ': names a person (' + n + ')');
    /* a source's title is in title case by nature: the people list holds it, the runs do not */
    if(/^sources\[\d+\]\.title$|^video\.(?:title|channel)$/.test(path) || path === 'respell') continue;
    for(const run of capitalisedRuns(s)){
      let ws = run.map((r) => r.word);
      if(covered(ws, dict)) continue;
      const first = run[0];
      const lw = first.word.toLowerCase();
      if(first.opens && (STARTERS.has(lw) || lower.has(lw) || (ctx.vocab && ctx.vocab.has(lw)))){
        ws = ws.slice(1);
        if(ws.length < 2 || covered(ws, dict)) continue;
      }
      out.push(path + ': "' + ws.join(' ') + '" is a capitalised run proper-nouns.json does not allow (a person or a business?)');
    }
  }
  return out;
}

/* ---- language: the same rules over every string ---------------------------- */
export function languageProblems(f){
  const out = [];
  /* a video's title is the source's own, copied exactly and never drawn (the page shows our label) */
  const copied = isObj(f.video);
  for(const [path, s] of strings(f, '')){
    if(copied && path === 'video.title') continue;
    const url = /\.url$/.test(path);
    if(!url && DASH.test(s)) out.push(path + ': carries a dash (use a comma, a colon or a full stop)');
    for(const ch of s){
      const cp = ch.codePointAt(0);
      if(cp >= 0x2190){ out.push(path + ': carries U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ', at or above U+2190'); break; }
    }
    if(GLYPH.test(s)) out.push(path + ': carries a degree sign or a fraction glyph (write F and C, "a half")');
    if(url) continue;
    /* a source's title is the site's own words: the dash and glyph rules hold it, the voice rules do not */
    const title = /^sources\[\d+\]\.title$|^video\.(?:title|channel)$/.test(path);
    if(title){ if(HOUSE_NAME.test(s)) out.push(path + ': names the house'); continue; }
    const am = s.match(AMERICAN);
    if(am) out.push(path + ': American spelling "' + am[0] + '" (British: flavour, colour, centre, litre, -ise)');
    const sup = s.match(SUPERLATIVE);
    if(sup) out.push(path + ': "' + sup[0] + '" sells rather than teaches');
    const ver = s.match(VERDICT);
    if(ver) out.push(path + ': "' + ver[0] + '" is a health claim or an allergen verdict');
    if(HOUSE_NAME.test(s) && path !== 'house.ask') out.push(path + ': names the house (the page names it from the pack)');
    if(s.indexOf(HOUSE_TOKEN) >= 0 && path !== 'house.ask') out.push(path + ': the ' + HOUSE_TOKEN + ' token belongs in house.ask only');
    if(/\b\d+(?:\.\d+)?\s?(?:F|C)\b/.test(s)){
      const rest = s.replace(/\d+(?:\.\d+)?(?: to \d+(?:\.\d+)?)?F \(\d+(?:\.\d+)?(?: to \d+(?:\.\d+)?)?C\)/g, '');
      if(/\b\d+(?:\.\d+)?\s?(?:F|C)\b/.test(rest)) out.push(path + ': a temperature not in the "195 to 205F (90 to 96C)" form');
    }
    if(/\b\d+\s?-\s?\d+\b/.test(s) && !/^(?:sources|video)/.test(path)) out.push(path + ': a range with a hyphen (write "25 to 30")');
  }
  return out;
}

/* ---- the house block against the plan's row --------------------------------- */
function houseProblems(f, row){
  const out = [];
  const h = f.house, p = row.house;
  if(!isObj(h)){ out.push('house: must be an object copied from the plan'); return out; }
  if(h.printed !== p.printed){ out.push('house.printed: must be ' + p.printed + ', as the plan has it'); return out; }
  const keys = Object.keys(h);
  if(p.printed){
    const allowed = ['printed', 'packIds'];
    keys.filter((k) => allowed.indexOf(k) < 0).forEach((k) => out.push('house.' + k + ': not in the plan\u2019s printed block'));
    if(!same(h.packIds, p.packIds)) out.push('house.packIds: must equal the plan\u2019s ' + JSON.stringify(p.packIds));
    return out;
  }
  const allowed = ['printed', 'askId', 'ask', 'uses'];
  keys.filter((k) => allowed.indexOf(k) < 0).forEach((k) => out.push('house.' + k + ': not in the plan\u2019s block'));
  if(h.askId !== undefined && h.askId !== p.askId) out.push('house.askId: must equal the plan\u2019s "' + p.askId + '" (the build fills it)');
  if(!same(h.uses, p.uses)) out.push('house.uses: must equal the plan\u2019s ' + JSON.stringify(p.uses));
  if(!isStr(h.ask)) out.push('house.ask: a string');
  else if(p.ask){
    if(houseNeutral(h.ask) !== houseNeutral(p.ask)) out.push('house.ask: must be the plan\u2019s ask, word for word');
  } else {
    if(!h.ask.trim()) out.push('house.ask: the plan\u2019s ask is empty, so write one sentence (at most 30 words) on what to ask at lineup');
    else if(words(h.ask) > 30) out.push('house.ask: ' + words(h.ask) + ' words, at most 30');
  }
  return out;
}

/* ---- the video ---------------------------------------------------------------- */
function videoProblems(f, row, ctx){
  const out = [];
  const v = f.video;
  if(v === null) return out;
  if(!isObj(v)){ out.push('video: null, or the style\u2019s object'); return out; }
  Object.keys(v).filter((k) => VIDEO_FIELDS.indexOf(k) < 0).forEach((k) => out.push('video.' + k + ': not a video field'));
  VIDEO_FIELDS.filter((k) => !isStr(v[k])).forEach((k) => out.push('video.' + k + ': a string'));
  if(out.length) return out;
  const m = v.url.match(WATCH_URL);
  if(!m) out.push('video.url: must be https://www.youtube.com/watch?v= and an 11 character id');
  else if(m[1] !== v.id) out.push('video.id: must be the id in the url');
  if(!/^[A-Za-z0-9_-]{11}$/.test(v.id)) out.push('video.id: 11 characters');
  if(['company', 'person'].indexOf(v.channelKind) < 0) out.push('video.channelKind: company or person');
  if(VERIFIED_BY.indexOf(v.verifiedBy) < 0) out.push('video.verifiedBy: one of ' + VERIFIED_BY.join(', '));
  if(!v.label.trim() || words(v.label) > 8) out.push('video.label: our own few words, at most 8');
  if(!v.watchFor.trim() || words(v.watchFor) > 40) out.push('video.watchFor: what to watch for, at most 40 words');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v.checkedOn) || v.checkedOn < CHECKED_FROM || v.checkedOn > CHECKED_TO) out.push('video.checkedOn: a date from ' + CHECKED_FROM + ' to ' + CHECKED_TO);
  if(v.channelKind === 'person' && (v.title || v.channel)) out.push('video: a person\u2019s channel ships with title and channel empty (the real ones stay in videos/' + f.id + '.json)');
  if(v.channelKind === 'company'){
    if(!v.channel.trim()) out.push('video.channel: a company channel is named');
    else if((ctx.companies || []).indexOf(v.channel) < 0) out.push('video.channel: "' + v.channel + '" is not on companies.json');
  }
  if(v.verifiedBy === 'coffee-films'){
    const key = String(row.film || '');
    const film = (ctx.films || []).find((x) => x.sec + '/' + x.row === key);
    if(!film) out.push('video.verifiedBy: coffee-films, but the plan names no Library film for this entry');
    else {
      if(film.id !== v.id) out.push('video.id: must be the Library film\u2019s ' + film.id);
      /* the title where it is given (a fragment keeps it for the record; the shipped data carries none) */
      if(v.channelKind === 'company' && ((v.title !== '' && film.title !== v.title) || film.channel !== v.channel)) out.push('video: title and channel must be the Library film\u2019s, exactly');
    }
  }
  if(v.verifiedBy === 'pack' && ctx.pack){
    const pv = (ctx.pack.videos || []).find((x) => String(x.url || '').indexOf(v.id) >= 0);
    if(!pv) out.push('video.id: verifiedBy pack, but the pack carries no video with this id');
  }
  if(v.verifiedBy === 'websearch' && ctx.videoEvidence){
    const ev = ctx.videoEvidence(f.id);
    if(!ev) out.push('video: verifiedBy websearch needs tools/brew/videos/' + f.id + '.json');
    else {
      if(!Array.isArray(ev.queries) || ev.queries.length < 2 || new Set(ev.queries.map((q) => q && q.q)).size < 2) out.push('video: the evidence file needs two different queries');
      if(ev.videoId !== v.id) out.push('video.id: the evidence file names ' + ev.videoId);
      if(ev.checkedBy !== 'checker') out.push('video: the evidence file has no checker\u2019s sign-off');
    }
  }
  return out;
}

/* ---- the fragment ------------------------------------------------------------- */
export function validateFragment(f, ctx){
  const out = [];
  if(!isObj(f)) return ['fragment: one JSON object'];
  const row = ctx.byId.get(f.id);
  if(!isStr(f.id) || !row){ out.push('id: "' + f.id + '" is not a plan id'); return out; }
  FIELDS.filter((k) => !(k in f)).forEach((k) => out.push(k + ': missing'));
  Object.keys(f).filter((k) => FIELDS.indexOf(k) < 0).forEach((k) => out.push(k + ': not a fragment field'));
  if(out.length) return out;

  if(f.name !== row.name) out.push('name: must be the plan\u2019s "' + row.name + '"');
  if(!isStr(f.name) || f.name.length > 40) out.push('name: at most 40 characters');
  if(!isStr(f.respell) || f.respell.length > 40) out.push('respell: a string of at most 40 characters');
  else if(f.respell && (!/^[A-Za-z' ,-]+$/.test(f.respell) || !/[A-Z]/.test(f.respell))) out.push('respell: syllables joined by hyphens, the stressed one in capitals (kor-TAH-doh)');
  if(!Array.isArray(f.aka) || f.aka.some((a) => !isStr(a) || !a.trim() || a.length > 40)) out.push('aka: a list of names, each at most 40 characters');
  else if(new Set(f.aka.map(fold)).size !== f.aka.length) out.push('aka: a name twice');
  if(f.group !== row.group) out.push('group: must be the plan\u2019s "' + row.group + '"');
  if(!ctx.groups.has(f.group) || f.group === 'house') out.push('group: not a plan group');
  if(f.kind !== row.kind || KINDS.indexOf(f.kind) < 0) out.push('kind: must be the plan\u2019s "' + row.kind + '"');
  if(!isStr(f.caffeine) || !f.caffeine.trim() || words(f.caffeine) > 25) out.push('caffeine: one plain sentence, at most 25 words');
  out.push(...houseProblems(f, row));
  for(const k of Object.keys(LIMITS)){
    const [lo, hi] = LIMITS[k], n = words(f[k]);
    if(!isStr(f[k])) out.push(k + ': a string');
    else if(n < lo || n > hi) out.push(k + ': ' + n + ' words, ' + lo + ' to ' + hi);
  }
  const mk = f.make;
  if(!isObj(mk)) out.push('make: an object');
  else {
    MAKE_FIELDS.filter((k) => !(k in mk)).forEach((k) => out.push('make.' + k + ': missing'));
    Object.keys(mk).filter((k) => MAKE_FIELDS.indexOf(k) < 0).forEach((k) => out.push('make.' + k + ': not a make field'));
    if(!Array.isArray(mk.steps) || mk.steps.length < 3 || mk.steps.length > 8) out.push('make.steps: 3 to 8 steps');
    else mk.steps.forEach((s, i) => {
      if(!isStr(s) || !s.trim()) out.push('make.steps[' + i + ']: a step');
      else if(words(s) > 30) out.push('make.steps[' + i + ']: ' + words(s) + ' words, at most 30');
      else if(/^\s*\d+[.)]/.test(s)) out.push('make.steps[' + i + ']: the page numbers the steps; write none');
    });
    ['ratio', 'dose', 'temp', 'time', 'cup'].forEach((k) => {
      if(!isStr(mk[k])) { if(k in mk) out.push('make.' + k + ': a string'); return; }
      if(words(mk[k]) > 14) out.push('make.' + k + ': ' + words(mk[k]) + ' words, at most 14');
      if((k === 'dose' || k === 'cup') && !mk[k].trim()) out.push('make.' + k + ': required');
    });
  }
  if(!Array.isArray(f.watch) || f.watch.length < 2 || f.watch.length > 4) out.push('watch: 2 to 4 things');
  else f.watch.forEach((s, i) => { if(!isStr(s) || !s.trim()) out.push('watch[' + i + ']: a line'); else if(words(s) > 30) out.push('watch[' + i + ']: ' + words(s) + ' words, at most 30'); });
  const lib = isObj(f.library) ? Object.assign({}, f.library) : f.library;
  if(isObj(lib) && lib.method === '' && !('method' in row.library)) delete lib.method;
  if(!same(lib, row.library)) out.push('library: must be the plan\u2019s, copied');
  if(!same(f.table, row.table)) out.push('table: must be the plan\u2019s, copied');
  if(f.search !== row.search) out.push('search: must be the plan\u2019s "' + row.search + '"');
  if(!Array.isArray(f.recall) || f.recall.length !== 1) out.push('recall: exactly one card');
  else {
    const r = f.recall[0];
    if(!isObj(r) || r.id !== 'make') out.push('recall[0].id: make');
    else {
      Object.keys(r).filter((k) => ['id', 'prompt', 'answer'].indexOf(k) < 0).forEach((k) => out.push('recall[0].' + k + ': not a recall field'));
      if(!isStr(r.prompt) || !r.prompt.trim() || words(r.prompt) > 25) out.push('recall[0].prompt: at most 25 words');
      else {
        const names = [f.name].concat(Array.isArray(f.aka) ? f.aka : []).map(fold).filter(Boolean);
        const p = ' ' + fold(r.prompt) + ' ';
        if(!names.some((n) => p.indexOf(' ' + n + ' ') >= 0)) out.push('recall[0].prompt: names the drink');
      }
      const n = words(r.answer);
      if(!isStr(r.answer) || n < 15 || n > 70) out.push('recall[0].answer: ' + n + ' words, 15 to 70');
    }
  }
  if(!Array.isArray(f.quiz) || f.quiz.length !== 3) out.push('quiz: exactly 3 questions');
  else f.quiz.forEach((q, i) => {
    const at = 'quiz[' + i + ']';
    if(!isObj(q)){ out.push(at + ': a question'); return; }
    Object.keys(q).filter((k) => ['id', 'q', 'options', 'a', 'explain'].indexOf(k) < 0).forEach((k) => out.push(at + '.' + k + ': not a quiz field'));
    if(q.id !== 'q' + (i + 1)) out.push(at + '.id: q' + (i + 1));
    if(!isStr(q.q) || !q.q.trim() || words(q.q) > 30) out.push(at + '.q: the stem, at most 30 words');
    if(!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !isStr(o) || !o.trim())) { out.push(at + '.options: four options'); return; }
    q.options.forEach((o, j) => { if(words(o) > 12) out.push(at + '.options[' + j + ']: ' + words(o) + ' words, at most 12'); });
    if(new Set(q.options.map(fold)).size !== 4) out.push(at + '.options: four different options');
    if(q.options.some((o) => /\b(?:all|none|both) of the (?:above|options)\b/i.test(o))) out.push(at + '.options: no "all of the above"');
    if(!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { out.push(at + '.a: 0 to 3'); return; }
    const key = q.options[q.a], fk = fold(key);
    if(isStr(q.q) && fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) out.push(at + '.q: the stem carries the answer');
    const others = q.options.filter((o, j) => j !== q.a).map((o) => o.length);
    const longest = Math.max(...others);
    if(key.length > longest * 1.6 && key.length - longest >= 15) out.push(at + '.options: the answer is much the longest (a length clue)');
    if(!isStr(q.explain) || !q.explain.trim() || words(q.explain) > 45) out.push(at + '.explain: at most 45 words');
  });
  if(!Array.isArray(f.sources) || !f.sources.length) out.push('sources: at least one');
  else f.sources.forEach((s, i) => {
    if(!isObj(s) || !isStr(s.title) || !s.title.trim() || !isStr(s.url)) { out.push('sources[' + i + ']: { title, url }'); return; }
    Object.keys(s).filter((k) => ['title', 'url'].indexOf(k) < 0).forEach((k) => out.push('sources[' + i + '].' + k + ': not a source field'));
    if(s.url && !/^https:\/\/[^\s]+$/.test(s.url)) out.push('sources[' + i + '].url: https, or "" for an in-app source');
  });
  out.push(...videoProblems(f, row, ctx));
  const total = proseWords(f);
  if(total > ENTRY_MAX) out.push('entry: ' + total + ' reading words, at most ' + ENTRY_MAX);
  out.push(...languageProblems(f));
  /* the plan's own ask may say the house's name; the page fills it from the pack */
  const named = JSON.parse(JSON.stringify(f));
  if(isObj(named.house) && isStr(named.house.ask)) named.house.ask = houseNeutral(named.house.ask);
  out.push(...nameProblems(named, ctx));
  return out;
}

/* the plan itself, before any fragment is read: ids, groups, kinds */
export function planProblems(plan){
  const out = [];
  const groups = new Set((plan.groups || []).map((g) => g.id));
  const ids = new Set();
  (plan.entries || []).forEach((e, i) => {
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id || '')) out.push('plan.entries[' + i + '].id: lower case words and hyphens');
    if(ids.has(e.id)) out.push('plan.entries[' + i + '].id: "' + e.id + '" twice');
    ids.add(e.id);
    if(!groups.has(e.group) || e.group === 'house') out.push('plan.entries[' + i + '].group: "' + e.group + '"');
    if(KINDS.indexOf(e.kind) < 0) out.push('plan.entries[' + i + '].kind: "' + e.kind + '"');
  });
  return out;
}
