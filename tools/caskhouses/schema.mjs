#!/usr/bin/env node
/* The one validator of Producers and flagships, the Whisky & Brandy tab's
   five houses a style (tools/caskhouses/BRIEF.md, 21 November 2026): a
   group's fragment, its five records, and the roster. build-caskhouses.mjs
   refuses a record that fails here and a later gate reads the same rules, so
   each rule lives once. Nothing here writes a file.

     import { loadContext, validateFragment, validateRecord, adviseRecord, planProblems } from './schema.mjs';
     const ctx = loadContext();                          // the roster, the people, what the Ledger ships
     const problems = validateFragment(fragment, ctx);   // [] when sound: the group's five records
     const notes = adviseRecord(record, i, ctx);         // never a failure: what a second reader should look at
     const planned = planProblems(ctx.plan, ctx);        // the roster, proved against the shipped data

     node tools/caskhouses/schema.mjs --caps    prints every cap as the brief states it
     node tools/caskhouses/schema.mjs --test    proves the rules on seeded records (exit 1 when one does not hold)

   Every problem names its field first and then the rule
   ("records[2].story: 131 words, 140 to 220").

   THE VOICE is the Ledger's, the strictest reading, and its lists are
   imported, never copied: the dash, the glyphs, the further American forms,
   the superlative, allergen and health talk, price, the volatile fact, a
   named distiller and the workplace's name from tools/backbar/schema.mjs;
   the -est words, "the most" and the hyphen range from
   tools/caskstyles/schema.mjs; the American list from tools/brew/schema.mjs.
   This page adds, and never takes away: a score or a medal (SCORE), scarcity
   talk the shelf's list does not reach (SCARCITY), a pour size (MEASURE), a
   per cent sign outside "% ABV", a present owner (PRESENT_OWNER) and a
   present distiller or blender (PRESENT_MAKER).

   TWO DEPARTURES from the styles' and the shelf's rules, ruled on purpose
   because 160 house histories cannot be written under them:
   1. Names are refused by a list of living people (people.json), as the
      Sommelier's Codex does; there is no allow-list of proper nouns. A
      house's own name is the house (Pappy Van Winkle, Jack Daniel's, Jim
      Beam are labels): the roster's labels and the record's own bottlings
      are taken out of a sentence before the living are looked for, and so
      are the dead of people.json's historic list, whose names carry a living
      person's (Bill Samuels Sr.).
   2. Ownership is history. In the story and the traps the shelf's ownership
      words (owned by, acquired, acquisition, bought by, sold to) stand in a
      sentence that carries its year; anywhere else, or without a year, they
      are refused as before. A present state is refused everywhere (is owned
      by, now owned, today part of, its current owner, currently). */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { words, fold, strings, sentences, hasPhrase, slugify, readProducers,
  DASH, GLYPH, AMERICAN_MORE, SUPERLATIVE, VERDICT, PRICE, VOLATILE, NAMED_ROLE, HOUSE_NAME } from '../backbar/schema.mjs';
import { SUPERLATIVE_MORE, HYPHEN_RANGE } from '../caskstyles/schema.mjs';
import { AMERICAN as BREW_AMERICAN } from '../brew/schema.mjs';

export { words, fold, strings, sentences, hasPhrase, slugify };
export const CH_DIR = dirname(fileURLToPath(import.meta.url));
export const LEDGER_ROOT = join(CH_DIR, '..', '..');

/* ---- the names of the page -------------------------------------------------- */
export const GLOBAL = 'CASK_HOUSES';
export const DATA_FILE = 'js/data-caskhouses.js';
/* a card's key is a person's saved record: frozen in keys.v1.json. The dot is U+00B7. */
export const KEY_PREFIX = 'Cask Houses · ';
export function cardKey(pickKey, cardId){ return KEY_PREFIX + pickKey + '/' + cardId; }
export const CARD_KEY_RE = /^Cask Houses · [a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PICKS = 5;

/* ---- the roster's own shape -------------------------------------------------- */
export const PLAN_FIELDS = ['edition', 'date', 'families', 'chunks', 'groups', 'left'];
export const GROUP_FIELDS = ['key', 'title', 'family', 'style', 'chapter', 'chunk', 'swaps', 'picks'];
export const PICK_FIELDS = ['key', 'producer', 'madeBy', 'flagship', 'why', 'note', 'shelf', 'library', 'benchmark'];
export const SWAP_FIELDS = ['kind', 'key', 'from', 'to', 'why', 'agreed', 'date'];
export const SWAP_KINDS = ['bottling', 'pick'];

/* ---- a record ----------------------------------------------------------------- */
/* its fields, in the order the build ships them */
export const FIELDS = ['key', 'group', 'producer', 'madeBy', 'style', 'chapter', 'shelf', 'library', 'say', 'place', 'year', 'yearIs',
  'bottle', 'table', 'story', 'others', 'traps', 'cards', 'quiz', 'sources'];
/* provenance: read by the refuter and the integrator, never shipped */
export const PROVENANCE = ['report', 'checked'];
/* copied from the roster exactly: the pick's and its group's */
export const COPIED = ['group', 'producer', 'madeBy', 'style', 'chapter', 'shelf', 'library'];
export const BOTTLE_FIELDS = ['name', 'class', 'mash', 'still', 'wood', 'strength', 'taste', 'pour', 'label'];
export const YEAR_IS = ['founded', 'first released'];
export const CARD_FIELDS = ['id', 'prompt', 'answer'];
export const QUIZ_FIELDS = ['id', 'tag', 'card', 'q', 'options', 'a', 'explain'];
export const QUIZ_TAGS = ['bottle', 'story'];
export const SOURCE_FIELDS = ['title', 'url', 'kind', 'read'];
export const SOURCE_KINDS = ['primary', 'secondary'];
export const SOURCE_READS = ['page', 'search'];
export const CHECKED_FIELDS = ['date', 'by', 'verdict', 'changed', 'open'];
export const VERDICTS = ['sound', 'changed'];

/* Every limit, in words unless named otherwise. A pair is [least, most]. */
export const CAPS = {
  say: [0, 10],
  place: [2, 14],
  bottle: { name: [1, 14], class: [2, 20], mash: [6, 45], still: [8, 50], wood: [6, 45], strength: [2, 20], taste: [20, 60], pour: [12, 45] },
  label: { n: [2, 4], term: [1, 6], means: [4, 24] },
  table: [30, 50],
  tableSentences: [1, 2],
  story: [140, 220],
  storyYears: 2,          /* a story names at least two dated turning points */
  others: { n: [1, 3], name: [1, 12], note: [4, 30] },
  traps: { n: [1, 3], line: [8, 40] },
  cards: { n: 2, idChars: 24, prompt: [5, 25], answer: [6, 50] },
  quiz: { n: 2, stem: [8, 40], option: [1, 12], explain: [8, 45] },
  sources: { n: [4, 5], title: [2, 20] },
  report: 8,
  entry: 680              /* the reading words a record's page shows: place, the bottle and its label, table, story, others and traps */
};
/* the strength as the label states it; a yearly or batch release never carries one year's figure */
export const STRENGTH_FIXED = /^\d{2}(?:\.\d{1,2})?% ABV(?: \(\d{2,3}(?:\.\d{1,2})? proof\))?(?=$|[,;] )/;
export const STRENGTH_VARIES = /^Varies by (?:batch|release|barrel|cask|bottling)\b/;

/* ---- the voice: this page's own additions ---------------------------------------- */
const YEAR = /\b(?:1[5-9]\d{2}|20[0-2]\d)\b/;
const YEAR_G = /\b(?:1[5-9]\d{2}|20[0-2]\d)\b/g;
/* a score, a rating, a medal or a trophy: none anywhere */
export const SCORE = /\b\d{2,3}\s*(?:points?|pts)\b|\/\s?100\b|\b(?:100|hundred)[- ]point|\b(?:scor(?:e|es|ed|ing)|ratings?|rated|medals?|medall?ists?|double gold|trophy|trophies|whisk(?:e)?y of the year|spirit of the year|distiller(?:y)? of the year|hall of fame)\b/i;
/* scarcity talk beyond the shelf's list (which holds allocation, the lottery, the secondary market, hard to find, limited supply) */
export const SCARCITY = /\b(?:scarc\w*|rarit(?:y|ies)|waiting lists?|wait ?lists?|unobtainable|shortages?|queues?|queu(?:e|ed|ing)|limited (?:quantit\w+|numbers?|availability|stock)|once a year|collectors?|collectibles?|collectables?)\b/i;
/* a pour size stated as ours: the page gives none */
export const MEASURE = /\b\d+(?:\.\d+)?\s?(?:oz|ounces?|ml|cl|millilitres?|centilitres?)\b|\b(?:an?|one|two|half an?)\s+(?:ounces?|shots?|jiggers?|fingers?)\b/i;
/* a per cent sign stands only in a strength, "45% ABV" */
export const PER_CENT_SIGN = /%(?! ABV)/;
/* the shelf's ownership words that the story and the traps may carry as dated history */
export const OWNERSHIP_HISTORY = /^(?:owned by|acquir\w*|acquisition|bought by|sold to)$/i;
export const HISTORY_FIELD = /\.(?:story|traps\[\d+\])$/;
/* ownership as a present state: refused everywhere */
export const PRESENT_OWNER = new RegExp('\\b(?:' + [
  'currently', 'presently', 'nowadays',
  '(?:is|are|remains?|has been|have been)\\s+(?:now\\s+|today\\s+|still\\s+)?(?:wholly\\s+|majority\\s+|jointly\\s+|family\\s+)?owned',
  '(?:is|are|remains?|has been|have been)\\s+(?:now\\s+|today\\s+|still\\s+)?(?:an?\\s+)?(?:brand|label|subsidiary|unit|division|arm)\\s+of',
  '(?:now|today|still)\\s+(?:wholly\\s+|majority\\s+|family\\s+)?(?:owned|part\\s+of|belongs?|in\\s+the\\s+hands\\s+of|in\\s+family\\s+hands)',
  'owned\\s+(?:today|now)', 'now\\s+owns?', 'today\\s+owns?', 'still\\s+owns?', 'owns\\s+it\\s+(?:today|now|still)',
  '(?:its|the|their|a)\\s+(?:current|present|new)\\s+(?:owners?|parent|proprietors?)', '(?:current|present)\\s+owners?',
  'belongs\\s+to', 'parent\\s+(?:company|group|firm)', 'owner\\s+of\\s+the\\s+brand', 'subsidiary\\s+of'
].join('|') + ')\\b', 'i');
/* the same, where a capital tells the owner from an ordinary noun ("is part of the Sazerac Company", "its owner, Suntory") */
export const PRESENT_OWNER_NAMED = /\b(?:(?:is|are|remains?|has been|have been) (?:now |today |still )?part of (?:the )?[A-Z]|(?:its|the brand’s|the brand's|the label’s|the label's) owners?,? (?:is |are )?[A-Z])/;
/* a present distiller or blender described as a present fact (a name after the title is the shelf's NAMED_ROLE) */
export const PRESENT_MAKER = /\b(?:(?:its|the|their)\s+(?:current|present|new)\s+(?:master\s+|head\s+)?(?:distiller|blender)s?|(?:master|head)\s+(?:distiller|blender)s?\s+(?:is|are|has\s+been|since)\b|today(?:'|’)s\s+(?:master\s+|head\s+)?(?:distiller|blender)s?)\b/i;

/* ---- small readers ------------------------------------------------------------ */
function isStr(v){ return typeof v === 'string'; }
function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function isList(v){ return Array.isArray(v); }
function readJSON(p, fallback){ try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { if(fallback !== undefined) return fallback; throw e; } }
function runScript(jsDir, file, expose){
  const box = {};
  vm.createContext(box);
  vm.runInContext(readFileSync(join(jsDir, file), 'utf8') + '\n;this.__out = ' + expose + ';', box, { filename: file });
  return box.__out;
}
/* sentences as a list, with initials and dotted abbreviations (W. L. Weller, E. H. Taylor, Jr., Co., No. 7) not ending one */
export function sentenceList(s){
  const t = String(s == null ? '' : s).trim()
    .replace(/\b(?:[A-Z]\.){2,}/g, (m) => m.replace(/\./g, '\u0001'))
    .replace(/\b(?:St|Mt|No|Dr|Mr|Mrs|Ms|Jr|Sr|Co|Inc|Ltd|Bros|Col|vs|approx|ca)\./g, (m) => m.replace(/\./g, '\u0001'))
    .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, '$1\u0001');
  if(!t) return [];
  return t.split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/).map((x) => x.replace(/\u0001/g, '.'));
}
/* the words of a name a sentence must carry to name it: the class words, the stop words and anything under three letters left out */
const CLASS_WORDS = ('the and of for a an in de du la le les el los y e old aged year years kentucky tennessee american scotch irish japanese canadian '
  + 'straight bourbon rye corn wheat whiskey whisky single malt grain blended blend pot still brandy cognac armagnac calvados pisco '
  + 'distillery distilleries distillers distilling company co sons son').split(' ');
export function nameWords(name){ return fold(name).split(' ').filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && CLASS_WORDS.indexOf(w) < 0); }
export function names(text, name){
  const ws = nameWords(name);
  if(!ws.length) return hasPhrase(text, name);
  const t = ' ' + fold(text) + ' ';
  return ws.some((w) => t.indexOf(' ' + w + ' ') >= 0);
}
/* the words that tell the flagship from its house: the flagship's own words less the producer's and the class words */
export function flagshipWords(flagship, producer){
  const own = fold(producer).split(' ');
  return nameWords(flagship).filter((w) => own.indexOf(w) < 0);
}
function stem(w){ return w.replace(/s$/, ''); }

/* ---- what the Ledger ships: the links a record may carry ------------------------ */
const FACTS = {};
export function facts(jsDir){
  const dir = resolve(jsDir || join(LEDGER_ROOT, 'js'));
  if(FACTS[dir]) return FACTS[dir];
  const f = { dir, styles: new Map(), chapters: new Map(), shelf: new Map(), library: new Map(), problems: [] };
  try { ((runScript(dir, 'data-caskstyles.js', 'CASK_STYLES') || {}).entries || []).forEach((e) => f.styles.set(e.id, e)); }
  catch (e) { f.problems.push('js/data-caskstyles.js: could not be read (' + e.message + ')'); }
  try { (runScript(dir, 'data-casks.js', 'CASK_CHAPTERS') || []).forEach((c) => f.chapters.set(c.id, c)); }
  catch (e) { f.problems.push('js/data-casks.js: could not be read (' + e.message + ')'); }
  try { ((runScript(dir, 'data-backbar.js', 'BACKBAR_GUIDE') || {}).entries || []).filter((b) => b.group !== 'confirm').forEach((b) => f.shelf.set(b.id, b)); }
  catch (e) { f.problems.push('js/data-backbar.js: could not be read (' + e.message + ')'); }
  try { (dir === resolve(join(LEDGER_ROOT, 'js')) ? readProducers() : []).forEach((p) => f.library.set(p.name, p)); }
  catch (e) { f.problems.push('js/ui-reference.js: PRODUCERS could not be read (' + e.message + ')'); }
  FACTS[dir] = f;
  return f;
}

/* ---- the people never named ------------------------------------------------------ */
/* people.json as read: the two lists, and what is wrong with them */
export function peopleOf(j){
  const out = { names: [], historic: [], problems: [] };
  if(!isObj(j) || !isList(j.names) || !isList(j.historic)){ out.problems.push('people.json: { about, names: [...], historic: [...] }'); return out; }
  [['names', out.names], ['historic', out.historic]].forEach(([k, into]) => {
    const seen = new Set();
    j[k].forEach((n, i) => {
      if(!isStr(n) || !fold(n)){ out.problems.push('people.json ' + k + '[' + i + ']: a name'); return; }
      if(seen.has(fold(n))){ out.problems.push('people.json ' + k + '[' + i + ']: ' + n + ' twice'); return; }
      seen.add(fold(n));
      into.push(n);
    });
  });
  /* a name on both lists would be let stand as historic wherever it is written, and the living person never refused */
  const living = new Set(out.names.map(fold));
  out.historic.forEach((n) => { if(living.has(fold(n))) out.problems.push('people.json historic: ' + n + ' is also on names (a name is the living person’s or the dead one’s, never both: write the dead as the sources do, with Sr. or Jr.)'); });
  return out;
}
export function readPeople(file){
  let j = null;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { names: [], historic: [], problems: ['people.json: ' + e.message] }; }
  return peopleOf(j);
}

export function loadContext(opts = {}){
  const dir = opts.dir || CH_DIR;
  const plan = opts.plan || readJSON(join(dir, 'plan.json'));
  const people = opts.people || readPeople(join(dir, 'people.json'));
  const f = opts.facts || facts(opts.jsDir);
  const pickByKey = new Map(), groupByKey = new Map(), labels = [];
  (isObj(plan) && isList(plan.groups) ? plan.groups : []).forEach((g) => {
    if(!isObj(g)) return;
    groupByKey.set(g.key, g);
    (isList(g.picks) ? g.picks : []).forEach((p, i) => {
      if(!isObj(p)) return;
      pickByKey.set(p.key, { group: g, pick: p, index: i });
      if(isStr(p.producer) && p.producer.trim()) labels.push(p.producer);
    });
  });
  return { dir, plan, people, facts: f, pickByKey, groupByKey, labels,
    foldedPeople: (people.names || []).map((n) => [n, fold(n)]).filter(([, x]) => x),
    foldedHistoric: (people.historic || []).map(fold).filter(Boolean).sort((a, b) => b.length - a.length),
    foldedLabels: labels.map(fold).filter(Boolean).sort((a, b) => b.length - a.length) };
}
/* the roster's picks in order, each with its group */
export function roster(plan){
  const out = [];
  (isObj(plan) && isList(plan.groups) ? plan.groups : []).forEach((g) => (isList(g.picks) ? g.picks : []).forEach((p, i) => out.push({ group: g, pick: p, index: i })));
  return out;
}
export function chunkGroups(plan, name){
  const c = (isList(plan.chunks) ? plan.chunks : []).find((x) => isObj(x) && x.name === name);
  return c && isList(c.groups) ? c.groups.slice() : null;
}

/* the names a record owns: its label, its maker, its flagship as planned and as written, its other bottlings */
function ownNames(rec, pick){
  const out = [];
  [rec && rec.producer, rec && rec.madeBy, pick && pick.producer, pick && pick.flagship, isObj(rec && rec.bottle) ? rec.bottle.name : '']
    .forEach((n) => { if(isStr(n) && n.trim()) out.push(n); });
  (isList(rec && rec.others) ? rec.others : []).forEach((o) => { if(isObj(o) && isStr(o.name) && o.name.trim()) out.push(o.name); });
  return out;
}
/* every place a folded phrase stands in padded, folded text: [start, end) of each */
function spansOf(padded, phrase){
  const out = [], needle = ' ' + phrase + ' ';
  for(let i = padded.indexOf(needle); i >= 0; i = padded.indexOf(needle, i + 1)) out.push([i + 1, i + 1 + phrase.length]);
  return out;
}
/* the living named in a string. A house keeps its name: a listed name is let stand only where the whole of it lies
   inside a label of the roster, one of the record's own names or a name of the historic list (Julian Van Winkle
   inside Julian Van Winkle Sr.). A label that is only a part of the person's name shields nothing: Teeling is a
   label and Jack Teeling is still a person, in the Teeling record as anywhere. */
export function livingIn(s, ctx, own){
  const t = ' ' + fold(s) + ' ';
  const shields = [];
  (ctx.foldedHistoric || []).concat((own || []).map(fold).filter(Boolean), ctx.foldedLabels || []).forEach((n) => spansOf(t, n).forEach((x) => shields.push(x)));
  return (ctx.foldedPeople || []).filter(([, n]) => spansOf(t, n).some(([a, b]) => !shields.some(([x, y]) => x <= a && b <= y))).map(([name]) => name);
}
/* an address read as words: its escapes undone and its separators made spaces, so jimmy-russell and Jimmy_Russell are a name */
export function addressWords(url){
  let u = String(url == null ? '' : url);
  try { u = decodeURIComponent(u); } catch (e) { /* a broken escape: read it as written */ }
  return u.replace(/^https?:\/\//i, '').replace(/[-_/.+=?&#%~:,;()]+/g, ' ');
}

/* ---- the voice over every string ---------------------------------------------- */
/* what kind of string a path holds */
export function pathKind(where){
  if(/\.sources\[\d+\]\.url$/.test(where)) return 'url';
  if(/\.sources\[\d+\]\.title$/.test(where)) return 'title';
  if(/\.(?:report\[\d+\]|checked(?:\.|$))/.test(where)) return 'provenance';
  if(/\.(?:key|group|style|chapter|shelf|library|year|yearIs|cards\[\d+\]\.id|quiz\[\d+\]\.(?:id|tag|card)|sources\[\d+\]\.(?:kind|read))$/.test(where)) return 'key';
  if(/\.(?:producer|madeBy)$/.test(where)) return 'name';
  if(/\.(?:bottle\.name|bottle\.label\[\d+\]\.term|others\[\d+\]\.name)$/.test(where)) return 'label';
  return 'prose';
}
const VOLATILE_G = new RegExp(VOLATILE.source, 'gi');
function volatileProblems(s, where){
  const out = new Set();
  const history = HISTORY_FIELD.test(where);
  const po = s.match(PRESENT_OWNER) || s.match(PRESENT_OWNER_NAMED);
  if(po) out.add(where + ': "' + po[0] + '" states ownership as a present state (ownership is history: a year and what happened, in the story or the traps)');
  const pm = s.match(PRESENT_MAKER);
  if(pm) out.add(where + ': "' + pm[0] + '" describes a present distiller or blender as a present fact (say what the house does, or tell it as dated history)');
  sentenceList(s).forEach((sen) => {
    for(const m of sen.matchAll(VOLATILE_G)){
      const w = m[0];
      if(!OWNERSHIP_HISTORY.test(w)){ out.add(where + ': "' + w + '" is volatile (allocation, scarcity, the market, a present owner or maker)'); continue; }
      if(!history) out.add(where + ': "' + w + '" speaks of ownership (dated history belongs in the story and the traps, with its year; nowhere else)');
      else if(!YEAR.test(sen)) out.add(where + ': "' + w + '" with no year in the sentence (ownership is history only with its year: a year and what happened)');
    }
  });
  return [...out];
}
function tidyProblems(s, where){
  const out = [];
  if(s !== s.trim()) out.push(where + ': a space at an end');
  if(/\s{2,}|[\t\n\r]/.test(s)) out.push(where + ': two spaces together, a tab or a line break');
  return out;
}
export function voiceProblems(rec, at, ctx, pick){
  const out = [];
  const own = ownNames(rec, pick);
  /* the flagship's own printed words may carry a word the voice refuses (Ballantine's Finest): the name is taken out, the sentence is still held */
  const ownFlag = [pick && pick.flagship, pick && pick.producer].filter((n) => isStr(n) && n.trim());
  const bare = (s) => ownFlag.reduce((t, n) => t.split(n).join(' '), s);
  for(const [where, s] of strings(rec, at)){
    const kind = pathKind(where);
    if(kind === 'url'){
      for(const ch of s){ const cp = ch.codePointAt(0); if(cp >= 0x2190){ out.push(where + ': carries U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ', at or above U+2190'); break; } }
      if(GLYPH.test(s)) out.push(where + ': carries a degree sign or a fraction glyph');
      if(HOUSE_NAME.test(s)) out.push(where + ': the address names the owner’s workplace (a record never does)');
      const la = livingIn(addressWords(s), ctx, own);
      if(la.length) out.push(where + ': the address names a living person (' + la.join(', ') + '): cite a page that is not filed under a person’s name');
      continue;
    }
    if(kind === 'key') continue;
    if(DASH.test(s)) out.push(where + ': carries a dash or a hyphen standing in for one (use a comma, a colon or a full stop)');
    for(const ch of s){ const cp = ch.codePointAt(0); if(cp >= 0x2190){ out.push(where + ': carries U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ', at or above U+2190'); break; } }
    if(GLYPH.test(s)) out.push(where + ': carries a degree sign or a fraction glyph (write degrees, a half, a quarter)');
    tidyProblems(s, where).forEach((p) => out.push(p));
    if(kind === 'provenance' || kind === 'name') continue;
    if(HOUSE_NAME.test(s)) out.push(where + ': names the owner’s workplace (a record never does)');
    const lv = livingIn(s, ctx, own);
    if(lv.length) out.push(where + ': names a living person (' + lv.join(', ') + '): say the role, the family, the founder’s grandson');
    if(kind === 'title') continue;
    const b = bare(s);
    const sup = b.match(SUPERLATIVE) || b.match(SUPERLATIVE_MORE);
    if(sup) out.push(where + ': "' + sup[0] + '" is a superlative or sells rather than teaches');
    if(kind === 'label') continue;      /* the label's own words: its spelling and its figures are the label's */
    const am = s.match(BREW_AMERICAN) || s.match(AMERICAN_MORE);
    if(am) out.push(where + ': American spelling "' + am[0] + '" (British: flavour, colour, ageing, centre, litre, -ise)');
    const ver = s.match(VERDICT);
    if(ver) out.push(where + ': "' + ver[0] + '" is allergen, dietary or health talk (none on this page)');
    const pr = s.match(PRICE);
    if(pr) out.push(where + ': "' + pr[0] + '" talks price (no price anywhere)');
    const sc = s.match(SCORE);
    if(sc) out.push(where + ': "' + sc[0] + '" is a score, a rating or a medal (none anywhere)');
    const sy = s.match(SCARCITY);
    if(sy) out.push(where + ': "' + sy[0] + '" is scarcity talk (none anywhere)');
    volatileProblems(s, where).forEach((p) => out.push(p));
    const nr = s.match(NAMED_ROLE);
    if(nr) out.push(where + ': "' + nr[0] + '..." puts a name after a distiller’s or blender’s title (the living are never named; the dead are named first, with their dates, and the title after)');
    const me = s.match(MEASURE);
    if(me) out.push(where + ': "' + me[0] + '" is a pour size (the page states none as ours)');
    if(PER_CENT_SIGN.test(s)) out.push(where + ': a per cent sign outside a strength (write per cent; "45% ABV" alone keeps the sign)');
    if(HYPHEN_RANGE.test(s)) out.push(where + ': a range with a hyphen (write "12 to 15", "1935 to 1972")');
  }
  return out;
}

/* ---- the pieces of a record ---------------------------------------------------- */
function capped(out, where, v, lo, hi, empty){
  if(!isStr(v)){ out.push(where + ': a string'); return false; }
  if(!v.trim()){ if(!empty) out.push(where + ': a string' + (lo ? ' of ' + lo + ' words or more' : '')); return false; }
  const n = words(v);
  if(n < lo || n > hi) out.push(where + ': ' + n + ' words, ' + (lo > 1 ? lo + ' to ' + hi : 'at most ' + hi));
  return true;
}
function unknown(out, o, allowed, where, what){
  Object.keys(o).filter((k) => allowed.indexOf(k) < 0).forEach((k) => out.push(where + '.' + k + ': no field of ' + what + ' (' + allowed.join(', ') + ')'));
}
function counted(out, where, list, lo, hi, what){
  if(!isList(list)){ out.push(where + ': a list of ' + what); return false; }
  if(list.length < lo || list.length > hi) out.push(where + ': ' + (lo === hi ? 'exactly ' + lo : lo + ' to ' + hi) + ' ' + what + ' (' + list.length + ')');
  return true;
}
function endsStop(out, where, s){ if(isStr(s) && s.trim() && !/[.!?]["'’”)]?$/.test(s.trim())) out.push(where + ': ends on a full stop'); }

function sayProblems(rec, at){
  const s = rec.say;
  if(!isStr(s)) return [at + '.say: a respelling, or "" where a guest would not stumble'];
  const out = [];
  if(!s) return out;
  if(words(s) > CAPS.say[1]) out.push(at + '.say: ' + words(s) + ' words, at most ' + CAPS.say[1]);
  if(!/^[A-Za-z][A-Za-z ,'-]*$/.test(s)) out.push(at + '.say: letters, hyphens, commas and spaces only (no marks, no brackets, no stop)');
  const one = /^[A-Z]{2,}$/.test(s);
  if(!one && (!/[A-Z]{2,}/.test(s) || s.indexOf('-') < 0)) out.push(at + '.say: syllables joined by hyphens, the stressed one in capitals (lah-FROYG, glen-FID-ick), or one syllable in capitals (BOHR)');
  return out;
}

function bottleProblems(rec, at, pick){
  const B = rec.bottle, w = at + '.bottle', out = [];
  if(!isObj(B)) return [w + ': { ' + BOTTLE_FIELDS.join(', ') + ' }'];
  BOTTLE_FIELDS.filter((k) => !(k in B)).forEach((k) => out.push(w + '.' + k + ': missing'));
  unknown(out, B, BOTTLE_FIELDS, w, 'the bottle');
  ['name', 'class', 'mash', 'still', 'wood', 'strength', 'taste', 'pour'].forEach((k) => { if(k in B) capped(out, w + '.' + k, B[k], CAPS.bottle[k][0], CAPS.bottle[k][1]); });
  if(pick && isStr(B.name) && B.name.trim()){
    const have = fold(B.name).split(' ').map(stem);
    const lack = fold(pick.flagship).split(' ').filter((x) => have.indexOf(stem(x)) < 0);
    if(lack.length) out.push(w + '.name: carries every word of the roster’s flagship, "' + pick.flagship + '" (lacks ' + lack.join(', ') + '); the label may add its class and its age, and a different bottling is a swap recorded in plan.json');
  }
  ['mash', 'still', 'wood', 'taste', 'pour'].forEach((k) => endsStop(out, w + '.' + k, B[k]));
  if(isStr(B.strength) && B.strength.trim()){
    const s = B.strength;
    if(STRENGTH_VARIES.test(s)){
      if(YEAR.test(s)) out.push(w + '.strength: a release that varies never carries one year’s figure (give no year; a range with "about" may stand)');
    } else if(!STRENGTH_FIXED.test(s)) out.push(w + '.strength: as the label states it, "45% ABV (90 proof)" or "40% ABV", then a market note after a comma if one is needed; a yearly or batch release begins "Varies by batch" or "Varies by release"');
  }
  if(isStr(B.taste) && /\d/.test(B.taste)) out.push(w + '.taste: in words, no figure');
  if('label' in B && counted(out, w + '.label', B.label, CAPS.label.n[0], CAPS.label.n[1], 'label terms')){
    const seen = new Set();
    B.label.forEach((x, i) => {
      const l = w + '.label[' + i + ']';
      if(!isObj(x)){ out.push(l + ': { term, means }'); return; }
      unknown(out, x, ['term', 'means'], l, 'a label term');
      capped(out, l + '.term', x.term, CAPS.label.term[0], CAPS.label.term[1]);
      capped(out, l + '.means', x.means, CAPS.label.means[0], CAPS.label.means[1]);
      endsStop(out, l + '.means', x.means);
      if(isStr(x.term)){ if(seen.has(fold(x.term))) out.push(l + '.term: given twice'); seen.add(fold(x.term)); }
    });
  }
  return out;
}

function othersProblems(rec, at){
  const out = [];
  if(!counted(out, at + '.others', rec.others, CAPS.others.n[0], CAPS.others.n[1], 'other bottlings')) return out;
  const seen = new Set();
  rec.others.forEach((x, i) => {
    const w = at + '.others[' + i + ']';
    if(!isObj(x)){ out.push(w + ': { name, note }'); return; }
    unknown(out, x, ['name', 'note'], w, 'another bottling');
    capped(out, w + '.name', x.name, CAPS.others.name[0], CAPS.others.name[1]);
    capped(out, w + '.note', x.note, CAPS.others.note[0], CAPS.others.note[1]);
    endsStop(out, w + '.note', x.note);
    if(isStr(x.name)){
      if(seen.has(fold(x.name))) out.push(w + '.name: given twice');
      seen.add(fold(x.name));
      if(isObj(rec.bottle) && isStr(rec.bottle.name) && fold(x.name) === fold(rec.bottle.name)) out.push(w + '.name: the flagship itself');
    }
  });
  return out;
}

function trapsProblems(rec, at){
  const out = [];
  if(!counted(out, at + '.traps', rec.traps, CAPS.traps.n[0], CAPS.traps.n[1], 'traps')) return out;
  rec.traps.forEach((t, i) => { capped(out, at + '.traps[' + i + ']', t, CAPS.traps.line[0], CAPS.traps.line[1]); endsStop(out, at + '.traps[' + i + ']', t); });
  return out;
}

function cardsProblems(rec, at, pick){
  const out = [];
  if(!counted(out, at + '.cards', rec.cards, CAPS.cards.n, CAPS.cards.n, 'recall cards')) return out;
  const ids = new Set(), prompts = new Set();
  rec.cards.forEach((c, i) => {
    const w = at + '.cards[' + i + ']';
    if(!isObj(c)){ out.push(w + ': { id, prompt, answer }'); return; }
    unknown(out, c, CARD_FIELDS, w, 'a card');
    CARD_FIELDS.filter((k) => !(k in c)).forEach((k) => out.push(w + '.' + k + ': missing'));
    if('id' in c){
      if(!isStr(c.id) || !KEY_RE.test(c.id) || c.id.length > CAPS.cards.idChars) out.push(w + '.id: the card’s own short id, lower case words and hyphens, at most ' + CAPS.cards.idChars + ' characters (mash, wax-seal); it is half of a saved key and never changes once built');
      else { if(ids.has(c.id)) out.push(w + '.id: ' + c.id + ' twice'); ids.add(c.id); }
    }
    capped(out, w + '.prompt', c.prompt, CAPS.cards.prompt[0], CAPS.cards.prompt[1]);
    capped(out, w + '.answer', c.answer, CAPS.cards.answer[0], CAPS.cards.answer[1]);
    if(isStr(c.prompt)){ const k = fold(c.prompt); if(prompts.has(k)) out.push(w + '.prompt: the same cue twice'); prompts.add(k); }
    if(isStr(c.prompt) && isStr(c.answer) && fold(c.answer) && (' ' + fold(c.prompt) + ' ').indexOf(' ' + fold(c.answer) + ' ') >= 0) out.push(w + ': the prompt gives the answer away');
    if(isStr(c.prompt) && isStr(c.answer) && pick && !names(c.prompt + ' ' + c.answer, pick.producer) && !names(c.prompt + ' ' + c.answer, pick.flagship)) out.push(w + ': names the house or its flagship on one face (a card is dealt in a mixed deck)');
  });
  return out;
}

/* the question quality rules the styles and the shelf hold (one key, four different options, no "all of the above", the key
   not in the stem, no length clue), with the same numbers */
function quizProblems(rec, at){
  const out = [];
  if(!counted(out, at + '.quiz', rec.quiz, CAPS.quiz.n, CAPS.quiz.n, 'questions')) return out;
  const cardIds = (isList(rec.cards) ? rec.cards : []).map((c) => (isObj(c) ? c.id : null));
  const prompts = (isList(rec.cards) ? rec.cards : []).map((c) => (isObj(c) && isStr(c.prompt) ? fold(c.prompt) : ''));
  const stems = new Set(), tags = {}, paired = [], keys = [];
  rec.quiz.forEach((q, i) => {
    const w = at + '.quiz[' + i + ']';
    if(!isObj(q)){ out.push(w + ': { id, tag, card, q, options, a, explain }'); return; }
    unknown(out, q, QUIZ_FIELDS, w, 'a question');
    QUIZ_FIELDS.filter((k) => !(k in q)).forEach((k) => out.push(w + '.' + k + ': missing'));
    if(q.id !== 'q' + (i + 1)) out.push(w + '.id: q' + (i + 1));
    if(QUIZ_TAGS.indexOf(q.tag) < 0) out.push(w + '.tag: bottle (what is in it, how it is made, its label) or story (the house’s history)');
    else tags[q.tag] = (tags[q.tag] || 0) + 1;
    if(cardIds.indexOf(q.card) < 0) out.push(w + '.card: the id of the card it is paired with, one of this record’s (' + cardIds.filter(Boolean).join(', ') + '); a question has no key of its own');
    else paired.push(q.card);
    if(capped(out, w + '.q', q.q, CAPS.quiz.stem[0], CAPS.quiz.stem[1])){
      if(!/\?$/.test(q.q.trim())) out.push(w + '.q: a question, ending on a question mark');
      const k = fold(q.q);
      if(stems.has(k)) out.push(w + '.q: the same stem twice');
      stems.add(k);
      if(prompts.indexOf(k) >= 0) out.push(w + '.q: the same words as a card’s prompt');
      if(/\b(?:NOT|EXCEPT)\b/.test(q.q)) out.push(w + '.q: never NOT or EXCEPT');
    }
    if(!isList(q.options) || q.options.length !== 4 || q.options.some((o) => !isStr(o) || !o.trim())){ out.push(w + '.options: four options'); return; }
    q.options.forEach((o, j) => { if(words(o) > CAPS.quiz.option[1]) out.push(w + '.options[' + j + ']: ' + words(o) + ' words, at most ' + CAPS.quiz.option[1]); });
    if(new Set(q.options.map(fold)).size !== 4) out.push(w + '.options: four different options');
    if(q.options.some((o) => /\b(?:all|none|both) of the (?:above|options)\b/i.test(o))) out.push(w + '.options: no "all of the above"');
    if(!Number.isInteger(q.a) || q.a < 0 || q.a > 3){ out.push(w + '.a: 0 to 3, the one key'); return; }
    keys.push(q.a);
    const key = q.options[q.a], fk = fold(key);
    if(isStr(q.q) && fk.length >= 4 && (' ' + fold(q.q) + ' ').indexOf(' ' + fk + ' ') >= 0) out.push(w + '.q: the stem carries the answer');
    const longest = Math.max(...q.options.filter((o, j) => j !== q.a).map((o) => o.length));
    if(key.length > longest * 1.6 && key.length - longest >= 15) out.push(w + '.options: the answer is much the longest (a length clue)');
    capped(out, w + '.explain', q.explain, CAPS.quiz.explain[0], CAPS.quiz.explain[1]);
  });
  if(rec.quiz.length === CAPS.quiz.n && rec.quiz.every(isObj)){
    if(tags.bottle !== 1 || tags.story !== 1) out.push(at + '.quiz: one tagged bottle and one tagged story');
    if(paired.length === 2 && paired[0] === paired[1]) out.push(at + '.quiz: the two questions are paired with the two different cards');
    if(keys.length === 2 && keys[0] === keys[1]) out.push(at + '.quiz: both answers sit in one position (spread them)');
  }
  return out;
}

function sourcesProblems(rec, at){
  const out = [];
  if(!counted(out, at + '.sources', rec.sources, CAPS.sources.n[0], CAPS.sources.n[1], 'sources')) return out;
  const urls = new Set(), titles = new Set();
  rec.sources.forEach((s, i) => {
    const w = at + '.sources[' + i + ']';
    if(!isObj(s)){ out.push(w + ': { title, url, kind, read }'); return; }
    unknown(out, s, SOURCE_FIELDS, w, 'a source');
    SOURCE_FIELDS.filter((k) => !(k in s)).forEach((k) => out.push(w + '.' + k + ': missing'));
    capped(out, w + '.title', s.title, CAPS.sources.title[0], CAPS.sources.title[1]);
    if(isStr(s.title)){
      if(/\bby\s+[A-Z][a-z]+\s+[A-Z]/.test(s.title) || /\b(?:edited by|author)\b/i.test(s.title)) out.push(w + '.title: the publisher and the page, never an author');
      const t = fold(s.title); if(titles.has(t)) out.push(w + '.title: the same source twice'); titles.add(t);
    }
    if(!isStr(s.url) || !/^https:\/\/[^\s]+$/.test(s.url)) out.push(w + '.url: an https address');
    else { if(urls.has(s.url)) out.push(w + '.url: the same address twice'); urls.add(s.url); }
    if('kind' in s && SOURCE_KINDS.indexOf(s.kind) < 0) out.push(w + '.kind: primary (the producer’s own page for its own dates and methods, the regulation for a legal class) or secondary');
    if('read' in s && SOURCE_READS.indexOf(s.read) < 0) out.push(w + '.read: page (the page itself was read) or search (a search summary drawn from that site)');
  });
  return out;
}

export function checkedProblems(rec, at){
  const out = [], c = rec.checked;
  if(c === undefined) return [at + '.checked: missing (null until the refuter writes it)'];
  if(c === null) return out;
  const w = at + '.checked';
  if(!isObj(c)) return [w + ': null, or the refuter’s { ' + CHECKED_FIELDS.join(', ') + ' }'];
  unknown(out, c, CHECKED_FIELDS, w, 'the check');
  CHECKED_FIELDS.filter((k) => !(k in c)).forEach((k) => out.push(w + '.' + k + ': missing'));
  if('date' in c && (!isStr(c.date) || !/^\d{4}-\d{2}-\d{2}$/.test(c.date))) out.push(w + '.date: YYYY-MM-DD');
  if('by' in c && c.by !== 'refuter') out.push(w + '.by: refuter');
  if('verdict' in c && VERDICTS.indexOf(c.verdict) < 0) out.push(w + '.verdict: sound (nothing changed) or changed (what changed is listed)');
  ['changed', 'open'].forEach((k) => { if(k in c && (!isList(c[k]) || c[k].some((x) => !isStr(x) || !x.trim()))) out.push(w + '.' + k + ': a list of sentences ([] for none)'); });
  if(c.verdict === 'changed' && isList(c.changed) && !c.changed.length) out.push(w + '.changed: a changed verdict lists what changed and why');
  if(c.verdict === 'sound' && isList(c.changed) && c.changed.length) out.push(w + '.verdict: changed, since changes are listed');
  return out;
}
/* a record a refuter has read: the whole build ships no other */
export function isRefuted(rec){ return isObj(rec) && isObj(rec.checked) && checkedProblems(rec, 'x').length === 0; }

/* the reading words of a record: what its page shows above the cards and the questions */
export function readingWords(rec){
  let n = 0;
  if(!isObj(rec)) return 0;
  if(isObj(rec.bottle)){
    ['name', 'class', 'mash', 'still', 'wood', 'strength', 'taste', 'pour'].forEach((k) => { if(isStr(rec.bottle[k])) n += words(rec.bottle[k]); });
    (isList(rec.bottle.label) ? rec.bottle.label : []).forEach((x) => { if(isObj(x)) n += words(x.term) + words(x.means); });
  }
  ['place', 'table', 'story'].forEach((k) => { if(isStr(rec[k])) n += words(rec[k]); });
  (isList(rec.others) ? rec.others : []).forEach((x) => { if(isObj(x)) n += words(x.name) + words(x.note); });
  (isList(rec.traps) ? rec.traps : []).forEach((x) => { if(isStr(x)) n += words(x); });
  return n;
}

/* ---- one record ---------------------------------------------------------------- */
export function validateRecord(rec, ctx, group, i){
  const at = 'records[' + (i == null ? 0 : i) + ']';
  const out = [];
  if(!isObj(rec)) return [at + ': one object'];
  const hit = isStr(rec.key) ? ctx.pickByKey.get(rec.key) : null;
  if(!hit) return [at + '.key: ' + JSON.stringify(rec.key) + ' is no pick of plan.json'];
  const g = hit.group, pick = hit.pick, f = ctx.facts;
  if(group && g.key !== group) out.push(at + '.key: ' + rec.key + ' is a pick of ' + g.key + ', not of ' + group);
  FIELDS.filter((k) => !(k in rec)).forEach((k) => out.push(at + '.' + k + ': missing'));
  unknown(out, rec, FIELDS.concat(PROVENANCE), at, 'a record');
  const want = { group: g.key, producer: pick.producer, madeBy: pick.madeBy, style: g.style, chapter: g.chapter, shelf: pick.shelf, library: pick.library };
  COPIED.forEach((k) => { if(k in rec && rec[k] !== want[k]) out.push(at + '.' + k + ': copied from plan.json exactly, ' + JSON.stringify(want[k])); });
  /* the links: each resolved against what the Ledger ships, and refused when it does not resolve */
  if(isStr(rec.style) && rec.style && !f.styles.has(rec.style)) out.push(at + '.style: "' + rec.style + '" is no CASK_STYLES id');
  if(isStr(rec.chapter) && rec.chapter && !f.chapters.has(rec.chapter)) out.push(at + '.chapter: "' + rec.chapter + '" is no CASK_CHAPTERS id');
  if(isStr(rec.shelf) && rec.shelf && !f.shelf.has(rec.shelf)) out.push(at + '.shelf: "' + rec.shelf + '" is no liquor shelf bottle (a BACKBAR_GUIDE entry id)');
  if(isStr(rec.library) && rec.library && !f.library.has(rec.library)) out.push(at + '.library: "' + rec.library + '" is no name in the Library’s PRODUCERS');
  if('say' in rec) out.push(...sayProblems(rec, at));
  if('place' in rec) capped(out, at + '.place', rec.place, CAPS.place[0], CAPS.place[1]);
  if('year' in rec || 'yearIs' in rec){
    if(!isStr(rec.year) || (rec.year && (!/^\d{4}$/.test(rec.year) || +rec.year > new Date().getFullYear()))) out.push(at + '.year: a year in figures ("1953") where two sources agree, else "" (an empty field is a true answer)');
    if(rec.year ? YEAR_IS.indexOf(rec.yearIs) < 0 : rec.yearIs !== '') out.push(at + '.yearIs: ' + YEAR_IS.map((x) => '"' + x + '"').join(' or ') + ' beside a year, "" beside none');
  }
  if('bottle' in rec) out.push(...bottleProblems(rec, at, pick));
  if('table' in rec && capped(out, at + '.table', rec.table, CAPS.table[0], CAPS.table[1])){
    const n = sentences(rec.table);
    if(n < CAPS.tableSentences[0] || n > CAPS.tableSentences[1]) out.push(at + '.table: one or two sentences, found ' + n);
    endsStop(out, at + '.table', rec.table);
    if(!names(rec.table, pick.producer)) out.push(at + '.table: names the house (' + (nameWords(pick.producer).join(' or ') || pick.producer) + ')');
    const fw = flagshipWords(pick.flagship, pick.producer);
    if(fw.length && !fw.some((x) => (' ' + fold(rec.table) + ' ').indexOf(' ' + x + ' ') >= 0)) out.push(at + '.table: names the flagship (one of: ' + fw.join(', ') + ')');
  }
  if('story' in rec && capped(out, at + '.story', rec.story, CAPS.story[0], CAPS.story[1])){
    endsStop(out, at + '.story', rec.story);
    if(new Set(rec.story.match(YEAR_G) || []).size < CAPS.storyYears) out.push(at + '.story: at least ' + CAPS.storyYears + ' dated turning points (a founding, a first release, a law, a sale, a closure, a revival)');
  }
  if('others' in rec) out.push(...othersProblems(rec, at));
  if('traps' in rec) out.push(...trapsProblems(rec, at));
  if('cards' in rec) out.push(...cardsProblems(rec, at, pick));
  if('quiz' in rec) out.push(...quizProblems(rec, at));
  if('sources' in rec) out.push(...sourcesProblems(rec, at));
  if(rec.report !== undefined && (!isList(rec.report) || rec.report.length > CAPS.report || rec.report.some((x) => !isStr(x) || !x.trim()))) out.push(at + '.report: a list of at most ' + CAPS.report + ' sentences ([] for none): what the refuter, the integrator and the owner should know');
  if(rec.report === undefined) out.push(at + '.report: missing ([] for none)');
  out.push(...checkedProblems(rec, at));
  const total = readingWords(rec);
  if(total > CAPS.entry) out.push(at + ': ' + total + ' reading words (place, the bottle and its label, table, story, others and traps), at most ' + CAPS.entry);
  out.push(...voiceProblems(rec, at, ctx, pick));
  return out;
}

/* ---- a group's fragment: { group, records: [five, in the roster's order] } ------- */
export function validateFragment(frag, ctx){
  const out = (ctx.people.problems || []).slice();
  if(!isObj(frag)) return out.concat(['fragment: { group, records }']);
  unknown(out, frag, ['group', 'records'], 'fragment', 'a fragment');
  const g = ctx.groupByKey.get(frag.group);
  if(!g) return out.concat(['group: ' + JSON.stringify(frag.group) + ' is no group of plan.json']);
  if(!isList(frag.records)) return out.concat(['records: a list of the group’s five records, in the roster’s order']);
  const order = g.picks.map((p) => p.key);
  const keys = frag.records.map((r) => (isObj(r) ? r.key : null));
  if(frag.records.length !== PICKS) out.push('records: exactly ' + PICKS + ' (' + frag.records.length + ')');
  if(keys.join('|') !== order.join('|')) out.push('records: the roster’s order, ' + order.join(', ') + ' (found ' + keys.join(', ') + ')');
  frag.records.forEach((r, i) => out.push(...validateRecord(r, ctx, g.key, i)));
  /* the group's ten answers: no position holds more than half */
  const pos = [0, 0, 0, 0];
  frag.records.forEach((r) => (isObj(r) && isList(r.quiz) ? r.quiz : []).forEach((q) => { if(isObj(q) && Number.isInteger(q.a) && q.a >= 0 && q.a <= 3) pos[q.a]++; }));
  const top = Math.max(...pos);
  if(top > PICKS) out.push('records: ' + top + ' of the group’s ' + pos.reduce((a, b) => a + b, 0) + ' answers sit in position ' + pos.indexOf(top) + ' (no position holds more than half: spread them)');
  return out;
}
export function recordProblems(frag, ctx, i){ return validateRecord(frag.records[i], ctx, frag.group, i); }

/* ---- what a second reader should look at: never a failure ------------------------- */
const NOW = /\b(?:today|now|still|these days|modern day|at present|recently|latest|newest)\b/i;
const FIRST = /\bthe\s+first\b|\bthe\s+only\b|\bthe\s+last\b/i;
const EVERY = /\b(?:always|every bottle|never fails|guaranteed)\b/i;
const SHOPS = /(?:^|\.)(?:totalwine|masterofmalt|thewhiskyexchange|drizly|caskers|reservebar|wine-searcher|flaviar|binnys|klwines|specsonline|caskcartel|woodencork|finedrams)\./i;
const ROLE = /\b(?:master|head)\s+(?:distiller|blender)s?\b/i;
export function adviseRecord(rec, i, ctx){
  const out = [];
  const at = 'records[' + (i == null ? 0 : i) + ']';
  if(!isObj(rec)) return out;
  for(const [where, s] of strings(rec, at)){
    if(pathKind(where) !== 'prose') continue;
    const nw = s.match(NOW);
    if(nw) out.push(where + ': "' + nw[0] + '" speaks of the present: keep only what will not age');
    const fi = s.match(FIRST);
    if(fi) out.push(where + ': "' + fi[0] + '" is a claim of a first, an only or a last: two sources, or cut it');
    if(/\.bottle\.taste$/.test(where) && EVERY.test(s)) out.push(where + ': a taste promised for every bottle: say often or usually');
    if(ROLE.test(s) && !YEAR.test(s)) out.push(where + ': a distiller or blender with no year in the string: a role may be said, a present holder is never described');
  }
  const hit = ctx && isStr(rec.key) ? ctx.pickByKey.get(rec.key) : null;
  if(hit && ctx.foldedPeople.some(([, n]) => (' ' + fold(hit.pick.producer) + ' ').indexOf(' ' + n + ' ') >= 0)) out.push(at + '.producer: the label carries a living person’s name: the name stands only for the house, never for the person');
  if(hit && rec.year && isStr(rec.library) && rec.library && ctx.facts.library.has(rec.library)){
    const est = String(ctx.facts.library.get(rec.library).est || '').match(/\b\d{4}\b/);
    if(est && est[0] !== rec.year) out.push(at + '.year: the Library’s ' + rec.library + ' says ' + ctx.facts.library.get(rec.library).est + ': agree with it, or keep yours and say why in report');
  }
  if(isList(rec.sources)){
    if(!rec.sources.some((s) => isObj(s) && s.kind === 'primary')) out.push(at + '.sources: no primary source: every fact then needs two independent secondary ones');
    rec.sources.forEach((s, j) => { if(isObj(s) && isStr(s.url) && SHOPS.test(s.url.replace(/^https:\/\/(?:www\.)?/, '').split('/')[0])) out.push(at + '.sources[' + j + ']: a shop’s page is a lead, not a source for a fact (its label photograph may confirm a label term)'); });
  }
  if(rec.checked === null || rec.checked === undefined) out.push(at + '.checked: not yet read by a refuter (the whole build refuses an unrefuted record)');
  else if(isObj(rec.checked) && isList(rec.checked.open) && rec.checked.open.length) out.push(at + '.checked.open: ' + rec.checked.open.length + ' question(s) left open for the integrator');
  out.push(at + ': ' + readingWords(rec) + ' reading words of ' + CAPS.entry);
  return out;
}

/* ---- the roster itself, proved against the shipped data ---------------------------- */
const MADE_BY = /^[\p{L}\p{N}][\p{L}\p{N}&.' ’-]*$/u;
export function planProblems(plan, ctx){
  const out = ((ctx && ctx.people && ctx.people.problems) || []).slice();
  const f = ctx && ctx.facts;
  if(f) out.push(...f.problems);
  if(!isObj(plan) || !isList(plan.groups)) return out.concat(['plan.json: { ' + PLAN_FIELDS.join(', ') + ' }']);
  unknown(out, plan, PLAN_FIELDS, 'plan', 'the roster');
  PLAN_FIELDS.filter((k) => !(k in plan)).forEach((k) => out.push('plan.' + k + ': missing'));
  if(!isStr(plan.edition) || !plan.edition.trim()) out.push('plan.edition: the wave, in words');
  if(!isStr(plan.date) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.date)) out.push('plan.date: YYYY-MM-DD');
  const fams = isList(plan.families) ? plan.families : [];
  if(!fams.length || fams.some((x) => !isStr(x) || !x.trim()) || new Set(fams).size !== fams.length) out.push('plan.families: the families in drawn order, each once');
  /* the chunks: each a name and its groups, every group in one chunk */
  const chunkOf = new Map();
  const chunks = isList(plan.chunks) ? plan.chunks : [];
  const cnames = new Set();
  chunks.forEach((c, i) => {
    const at = 'plan.chunks[' + i + ']';
    if(!isObj(c) || !isStr(c.name) || !/^c\d+$/.test(c.name) || !isList(c.groups)){ out.push(at + ': { name: "c1", groups: [...] }'); return; }
    if(cnames.has(c.name)) out.push(at + '.name: ' + c.name + ' twice');
    cnames.add(c.name);
    c.groups.forEach((k) => { if(chunkOf.has(k)) out.push(at + ': ' + k + ' is in two chunks'); chunkOf.set(k, c.name); });
  });
  const gkeys = new Set(), titles = new Set(), styles = new Map(), pkeys = new Map(), producers = new Map(), flagships = new Map(), shelves = new Map();
  let lastFam = -1;
  plan.groups.forEach((g, gi) => {
    const at = 'plan.groups[' + gi + '] ' + JSON.stringify(g && g.key);
    if(!isObj(g)){ out.push(at + ': an object'); return; }
    unknown(out, g, GROUP_FIELDS, at, 'a group');
    GROUP_FIELDS.filter((k) => !(k in g)).forEach((k) => out.push(at + '.' + k + ': missing'));
    if(!isStr(g.key) || !KEY_RE.test(g.key)) out.push(at + '.key: lower case words and hyphens');
    if(gkeys.has(g.key)) out.push(at + '.key: twice');
    gkeys.add(g.key);
    if(!isStr(g.title) || !g.title.trim() || g.title.length > 60) out.push(at + '.title: the heading, at most 60 characters');
    else { if(titles.has(fold(g.title))) out.push(at + '.title: twice'); titles.add(fold(g.title)); }
    const fi = fams.indexOf(g.family);
    if(fi < 0) out.push(at + '.family: one of ' + fams.join(', '));
    else { if(fi < lastFam) out.push(at + '.family: the roster runs family by family, in the families’ order'); lastFam = Math.max(lastFam, fi); }
    if(!isStr(g.style)) out.push(at + '.style: a CASK_STYLES id, or "" where the tab holds no style');
    else if(g.style){
      if(f && !f.styles.has(g.style)) out.push(at + '.style: "' + g.style + '" is no CASK_STYLES id');
      if(styles.has(g.style)) out.push(at + '.style: ' + g.style + ' is also the style of ' + styles.get(g.style) + ' (one group a style)');
      styles.set(g.style, g.key);
    }
    if(!isStr(g.chapter)) out.push(at + '.chapter: a CASK_CHAPTERS id, or "" where the Cask Atlas holds no chapter');
    else if(g.chapter){
      if(f && !f.chapters.has(g.chapter)) out.push(at + '.chapter: "' + g.chapter + '" is no CASK_CHAPTERS id');
      const st = f && g.style ? f.styles.get(g.style) : null;
      if(st && isList(st.chapters) && st.chapters.indexOf(g.chapter) < 0) out.push(at + '.chapter: ' + g.chapter + ' is not a chapter of the style ' + g.style + ' (' + st.chapters.join(', ') + ')');
    }
    if(!cnames.has(g.chunk)) out.push(at + '.chunk: one of plan.chunks');
    else if(chunkOf.get(g.key) !== g.chunk) out.push(at + '.chunk: plan.chunks puts it in ' + (chunkOf.get(g.key) || 'no chunk') + ', the group says ' + g.chunk);
    if(!isList(g.picks) || g.picks.length !== PICKS){ out.push(at + '.picks: exactly ' + PICKS + ' (' + (isList(g.picks) ? g.picks.length : 'none') + ')'); }
    (isList(g.picks) ? g.picks : []).forEach((p, pi) => {
      const pa = at + '.picks[' + pi + '] ' + JSON.stringify(p && p.key);
      if(!isObj(p)){ out.push(pa + ': an object'); return; }
      unknown(out, p, PICK_FIELDS, pa, 'a pick');
      PICK_FIELDS.filter((k) => !(k in p)).forEach((k) => out.push(pa + '.' + k + ': missing'));
      if(!isStr(p.key) || !KEY_RE.test(p.key)) out.push(pa + '.key: lower case words and hyphens');
      else { if(pkeys.has(p.key)) out.push(pa + '.key: also a pick of ' + pkeys.get(p.key) + ' (a key stands once in the roster)'); pkeys.set(p.key, g.key); }
      if(!isStr(p.producer) || !p.producer.trim() || words(p.producer) > 6) out.push(pa + '.producer: the label a guest asks for, at most 6 words');
      else { const k = fold(p.producer); if(producers.has(k)) out.push(pa + '.producer: ' + p.producer + ' is also a pick of ' + producers.get(k) + ' (a producer stands once in the roster)'); producers.set(k, g.key); }
      if(!isStr(p.madeBy)) out.push(pa + '.madeBy: the distillery or company that makes it, or "" where the label makes its own');
      else if(p.madeBy){
        if(!MADE_BY.test(p.madeBy) || words(p.madeBy) > 7) out.push(pa + '.madeBy: a business name alone, at most 7 words (no place, no bracket, no comma: the rest belongs in the note)');
        if(isStr(p.producer) && fold(p.madeBy) === fold(p.producer)) out.push(pa + '.madeBy: "" where the label makes its own');
      }
      if(!isStr(p.flagship) || !p.flagship.trim() || words(p.flagship) > CAPS.bottle.name[1]) out.push(pa + '.flagship: the one bottling, at most ' + CAPS.bottle.name[1] + ' words');
      else { const k = fold(p.flagship); if(flagships.has(k)) out.push(pa + '.flagship: ' + p.flagship + ' is also the flagship of ' + flagships.get(k)); flagships.set(k, p.key); }
      if(!isStr(p.why) || words(p.why) < 12) out.push(pa + '.why: why this house and this bottling, 12 words or more');
      if(!isStr(p.note)) out.push(pa + '.note: what the author must confirm, or ""');
      if(!isStr(p.shelf)) out.push(pa + '.shelf: a liquor shelf bottle id, or ""');
      else if(p.shelf){
        if(f && !f.shelf.has(p.shelf)) out.push(pa + '.shelf: "' + p.shelf + '" is no liquor shelf bottle (a BACKBAR_GUIDE entry id)');
        if(shelves.has(p.shelf)) out.push(pa + '.shelf: ' + p.shelf + ' is also the bottle of ' + shelves.get(p.shelf));
        shelves.set(p.shelf, p.key);
      }
      if(!isStr(p.library)) out.push(pa + '.library: the Library’s producer name, or ""');
      else if(p.library && f && !f.library.has(p.library)) out.push(pa + '.library: "' + p.library + '" is no name in the Library’s PRODUCERS (copy it exactly, its apostrophe included)');
      if(typeof p.benchmark !== 'boolean') out.push(pa + '.benchmark: true or false');
      ['why', 'note', 'producer', 'madeBy', 'flagship'].forEach((k) => { if(isStr(p[k]) && DASH.test(p[k])) out.push(pa + '.' + k + ': carries a dash'); });
    });
    if(!isList(g.swaps)) out.push(at + '.swaps: a list ([] for none)');
    else g.swaps.forEach((s, si) => {
      const sa = at + '.swaps[' + si + ']';
      if(!isObj(s)){ out.push(sa + ': { ' + SWAP_FIELDS.join(', ') + ' }'); return; }
      unknown(out, s, SWAP_FIELDS, sa, 'a swap');
      SWAP_FIELDS.filter((k) => !(k in s)).forEach((k) => out.push(sa + '.' + k + ': missing'));
      if(SWAP_KINDS.indexOf(s.kind) < 0) out.push(sa + '.kind: bottling (the pick keeps its key and takes another flagship) or pick (another house, under a new key)');
      const p = (isList(g.picks) ? g.picks : []).find((x) => isObj(x) && x.key === s.key);
      if(!p) out.push(sa + '.key: the key of the pick as it stands in this group');
      if(!isStr(s.from) || !s.from.trim() || !isStr(s.to) || !s.to.trim() || s.from === s.to) out.push(sa + ': from and to, two different things');
      if(p && s.kind === 'bottling' && s.to !== p.flagship) out.push(sa + '.to: the flagship as the pick now states it');
      if(p && s.kind === 'pick' && (s.to !== p.key || !KEY_RE.test(String(s.from)))) out.push(sa + ': from the old pick’s key to the new pick’s key');
      if(!isStr(s.why) || words(s.why) < 8) out.push(sa + '.why: the reason in eight words or more');
      if(s.agreed !== true) out.push(sa + '.agreed: true (a swap stands only with the refuter’s agreement)');
      if(!isStr(s.date) || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) out.push(sa + '.date: YYYY-MM-DD');
    });
  });
  chunkOf.forEach((c, k) => { if(!gkeys.has(k)) out.push('plan.chunks ' + c + ': ' + k + ' is no group'); });
  if(!isList(plan.left)) out.push('plan.left: a list of what the planners left, each { style, lane, why }');
  return out;
}

/* ---- the caps, as the brief states them ---------------------------------------- */
export function capsText(){
  const r = (p) => (p[0] > 1 ? p[0] + ' to ' + p[1] : (p[0] === 0 ? 'at most ' + p[1] + ' ("" allowed)' : 'at most ' + p[1]));
  const L = [];
  L.push('Producers and flagships: the caps of a record, in words unless named otherwise');
  L.push('  say                 ' + r(CAPS.say));
  L.push('  place               ' + r(CAPS.place));
  L.push('  year, yearIs        a year in figures or ""; yearIs is ' + YEAR_IS.join(' or ') + ' beside a year, "" beside none');
  Object.keys(CAPS.bottle).forEach((k) => L.push('  bottle.' + (k + '            ').slice(0, 13) + r(CAPS.bottle[k])));
  L.push('  bottle.label        ' + CAPS.label.n[0] + ' to ' + CAPS.label.n[1] + ' terms; term ' + r(CAPS.label.term) + ', means ' + r(CAPS.label.means));
  L.push('  table               ' + r(CAPS.table) + ', in ' + CAPS.tableSentences[0] + ' or ' + CAPS.tableSentences[1] + ' sentences, naming the house and the flagship');
  L.push('  story               ' + r(CAPS.story) + ', with at least ' + CAPS.storyYears + ' different years');
  L.push('  others              ' + CAPS.others.n[0] + ' to ' + CAPS.others.n[1] + '; name ' + r(CAPS.others.name) + ', note ' + r(CAPS.others.note));
  L.push('  traps               ' + CAPS.traps.n[0] + ' to ' + CAPS.traps.n[1] + ', each ' + r(CAPS.traps.line));
  L.push('  cards               exactly ' + CAPS.cards.n + '; id at most ' + CAPS.cards.idChars + ' characters, prompt ' + r(CAPS.cards.prompt) + ', answer ' + r(CAPS.cards.answer));
  L.push('  quiz                exactly ' + CAPS.quiz.n + ' (one tagged bottle, one tagged story); stem ' + r(CAPS.quiz.stem) + ', option ' + r(CAPS.quiz.option) + ', explain ' + r(CAPS.quiz.explain));
  L.push('  sources             ' + CAPS.sources.n[0] + ' or ' + CAPS.sources.n[1] + ', every one https; title ' + r(CAPS.sources.title));
  L.push('  report              at most ' + CAPS.report + ' sentences (never shipped)');
  L.push('  the whole record    at most ' + CAPS.entry + ' reading words: place, the bottle and its label, table, story, others and traps');
  L.push('  a card key          ' + KEY_PREFIX + '<pick key>/<card id>');
  return L.join('\n');
}

/* ---- the rules proved on seeded records ------------------------------------------ */
function fixture(){
  const mk = (key, producer, flagship, madeBy) => ({ key, producer, madeBy: madeBy || '', flagship, why: 'A fixture pick that stands in the seeded test of the schema and in nothing else at all.', note: '', shelf: '', library: '', benchmark: false });
  const plan = { edition: 'fixture', date: '2026-11-21', families: ['American'], chunks: [{ name: 'c1', groups: ['fixture-style'] }], left: [],
    groups: [{ key: 'fixture-style', title: 'Fixture style', family: 'American', style: '', chapter: '', chunk: 'c1', swaps: [], picks: [
      mk('old-lantern', 'Old Lantern', 'Old Lantern Bonded'), mk('avery-lark', 'Avery Lark', 'Avery Lark Small Batch', 'Lantern Hill Distillery'),
      mk('copper-wren', 'Copper Wren', 'Copper Wren 100'), mk('saint-osric', 'Saint Osric', 'Saint Osric Twelve'), mk('mill-quay', 'Mill Quay', 'Mill Quay Finest')] }] };
  const people = { names: ['Jordan Vance', 'Avery Lark', 'Morgan Vance', 'Ada Copper Wren'], historic: ['Morgan Vance Sr.'], problems: [] };
  const fx = { dir: 'fixture', styles: new Map(), chapters: new Map(), shelf: new Map(), library: new Map(), problems: [] };
  const ctx = loadContext({ plan, people, facts: fx });
  const rec = (p, n) => ({
    key: p.key, group: 'fixture-style', producer: p.producer, madeBy: p.madeBy, style: '', chapter: '', shelf: '', library: '',
    say: '', place: 'Lantern Hill, Nelson County, Kentucky', year: '1936', yearIs: 'founded',
    bottle: {
      name: p.flagship + ' Kentucky Straight Bourbon Whiskey', class: 'Kentucky straight bourbon whiskey',
      mash: 'Corn, with wheat as the second grain and malted barley; the house does not publish its mash bill.',
      still: 'Cooked, fermented and run through a column still and a doubler at Lantern Hill, the house says.',
      wood: 'New charred American oak barrels; the label carries no age statement.',
      strength: '45% ABV (90 proof)',
      taste: 'Caramel and baked apple on the nose, then vanilla, toasted bread and a little cinnamon, with a soft, round, fairly sweet finish that stays on the tongue.',
      pour: 'Poured neat or over one large cube of ice; it belongs in an Old Fashioned and a Whiskey Sour.',
      label: [{ term: 'Kentucky Straight Bourbon', means: 'Bourbon made in Kentucky and kept at least two years in new charred oak.' },
        { term: 'Small Batch', means: 'A term with no legal meaning: a marriage of a chosen number of barrels.' }]
    },
    table: p.producer + ' is a wheated bourbon from Lantern Hill in Kentucky, and ' + p.flagship + ' is the bottling to begin with: soft caramel, vanilla and baked apple at ninety proof. It suits an Old Fashioned as well as a glass on its own.',
    story: 'The house dates its start to 1936, when a family of millers at Lantern Hill fitted a column still into a grain store beside the railway. It sold bulk whiskey to rectifiers until 1952, the year the first bottles carried its own name, and wheat took the place of rye in the mash at about the same time, by the house’s own account. A fire in 1961 took two warehouses and most of the ageing stock, and for a decade the label was filled with whiskey bought from neighbours. The family sold the business to a Louisville merchant in 1974, and the stills fell silent in 1983 as bourbon lost ground to vodka and white wine. The brand passed through two more hands before the distillery was rebuilt on the old site and fired again in 2009. The bottling a guest meets came back in 2014, at ninety proof and with no age statement, and it is the one a bartender is asked for by name. What matters at the table is the wheat: it gives a softer, rounder bourbon than a rye recipe does, and that is the whole lesson of the house.',
    others: [{ name: p.producer + ' Cask Strength', note: 'The same whiskey bottled uncut, its strength changing from batch to batch.' }],
    traps: ['The label names the house, not a person: nobody of that name ran the distillery.', 'Small batch has no legal meaning in the United States, so it promises no particular number of barrels.'],
    cards: [{ id: 'grain', prompt: 'What is the second grain in ' + p.flagship + '?', answer: 'Wheat, in place of rye, beside corn and malted barley.' },
      { id: 'silent', prompt: 'When did the ' + p.producer + ' stills fall silent, and when were they fired again?', answer: 'They fell silent in 1983 and were fired again in 2009.' }],
    quiz: [{ id: 'q1', tag: 'bottle', card: 'grain', q: 'A guest asks what sets this house’s bourbon apart in the mash. Which grain stands in for rye?', options: ['Wheat', 'Oats', 'Rice', 'Millet'], a: n % 4, explain: 'Wheat takes the place of rye as the second grain, which is why the bourbon reads softer and rounder.' },
      { id: 'q2', tag: 'story', card: 'silent', q: 'In which year did the family sell the business to a Louisville merchant?', options: ['1974', '1936', '1961', '2009'], a: (n + 1) % 4, explain: 'The sale came in 1974; 1961 was the year of the warehouse fire and 2009 the year the stills were fired again.' }],
    sources: [{ title: 'Old Lantern: Our history', url: 'https://example.org/' + p.key + '/history', kind: 'primary', read: 'page' },
      { title: 'eCFR: 27 CFR 5.143, Whisky', url: 'https://example.org/' + p.key + '/ecfr', kind: 'primary', read: 'page' },
      { title: 'A whiskey magazine: the house profile', url: 'https://example.org/' + p.key + '/profile', kind: 'secondary', read: 'search' },
      { title: 'An encyclopaedia: the house', url: 'https://example.org/' + p.key + '/wiki', kind: 'secondary', read: 'search' }],
    report: [], checked: null
  });
  /* the options are keyed in place: rotate them so the key sits where a says */
  const frag = { group: 'fixture-style', records: plan.groups[0].picks.map((p, n) => {
    const r = rec(p, n);
    r.quiz.forEach((q) => { const key = q.options[0]; const rest = q.options.slice(1); const o = rest.slice(); o.splice(q.a, 0, key); q.options = o; });
    return r;
  }) };
  return { plan, ctx, frag };
}
export function selfTest(){
  const { ctx, frag, plan } = fixture();
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const rows = [];
  const base = validateFragment(frag, ctx);
  rows.push(['the sound fixture group passes', base.length === 0, base.slice(0, 4).join(' | ')]);
  const planBase = planProblems(plan, ctx);
  rows.push(['the fixture roster passes', planBase.length === 0, planBase.slice(0, 4).join(' | ')]);
  /* each case edits a copy of the fragment and says what the validator must then say (a pattern), or that it must say nothing */
  const refuse = (name, edit, pattern) => { const f = clone(frag); edit(f.records, f); const ps = validateFragment(f, ctx); rows.push([name, ps.some((p) => pattern.test(p)), ps.length ? ps.slice(0, 2).join(' | ') : 'no problem was raised']); };
  const keep = (name, edit) => { const f = clone(frag); edit(f.records, f); const ps = validateFragment(f, ctx); rows.push([name, ps.length === 0, ps.slice(0, 3).join(' | ')]); };
  const addStory = (r, text) => { r.story = r.story.replace('What matters at the table is the wheat: it gives a softer, rounder bourbon than a rye recipe does, and that is the whole lesson of the house.', text); };

  refuse('a living person named as a person is refused', (r) => addStory(r[0], 'Jordan Vance took charge of the stills that year and has kept the wheat recipe, which is the lesson of the house.'), /story: names a living person \(Jordan Vance\)/);
  keep('the same name as the house’s label is kept', (r) => addStory(r[1], 'What matters at the table is the wheat, and Avery Lark has stood for it ever since: a softer, rounder bourbon than a rye recipe gives.'));
  refuse('a living person named in another house’s source title is refused', (r) => { r[2].sources[2].title = 'A whiskey magazine: Jordan Vance on the house'; }, /sources\[2\]\.title: names a living person/);
  keep('the dead of the historic list are named though a living name sits inside theirs', (r) => addStory(r[0], 'What matters at the table is the wheat that Morgan Vance Sr. chose in 1952: it gives a softer, rounder bourbon than rye does.'));
  refuse('the living namesake of a historic name is still refused', (r) => addStory(r[0], 'What matters at the table is the wheat that Morgan Vance keeps in the mash: a softer, rounder bourbon than rye gives.'), /names a living person \(Morgan Vance\)/);
  refuse('a living person whose name holds a label is still refused (the label shields only itself)', (r) => addStory(r[2], 'Ada Copper Wren keeps the wheat in the mash, and that wheat is the whole lesson of the house at the table.'), /story: names a living person \(Ada Copper Wren\)/);
  refuse('a living person in a source’s address is refused', (r) => { r[0].sources[2].url = 'https://example.org/people/jordan-vance'; }, /sources\[2\]\.url: the address names a living person \(Jordan Vance\)/);
  refuse('a living person in an escaped address is refused', (r) => { r[0].sources[2].url = 'https://example.org/wiki/Jordan%20Vance'; }, /sources\[2\]\.url: the address names a living person/);
  keep('a label’s own name in an address is the house', (r) => { r[1].sources[2].url = 'https://example.org/houses/avery-lark-small-batch'; });
  {
    const both = peopleOf({ names: ['Morgan Vance'], historic: ['Morgan Vance'] }).problems;
    rows.push(['a name on both lists of people.json is refused', both.some((p) => /historic: Morgan Vance is also on names/.test(p)), both.join(' | ') || 'no problem was raised']);
    const twice = peopleOf({ names: ['Jordan Vance', 'jordan vance'], historic: [] });
    rows.push(['a name twice in people.json is refused', twice.problems.some((p) => /twice/.test(p)) && twice.names.length === 1, twice.problems.join(' | ') || 'no problem was raised']);
  }
  refuse('a present owner is refused', (r) => addStory(r[0], 'The house is owned by a Louisville merchant, and what matters at the table is the wheat, which gives a softer bourbon.'), /story: "is owned" states ownership as a present state/);
  refuse('"now owned" and "today part of" are refused', (r) => { r[0].traps[0] = 'The distillery is now part of the Lantern Group and no longer a family business at all.'; }, /traps\[0\]: .* states ownership as a present state/);
  refuse('"currently" is refused anywhere', (r) => { r[0].bottle.wood = 'New charred American oak barrels; the label currently carries no age statement.'; }, /bottle\.wood: "currently" states ownership as a present state/);
  keep('a dated sale is kept in the story', (r) => addStory(r[0], 'The label was sold to a Chicago bottler in 1991 and bought by the founding family again in 2007; the wheat is the lesson of the house.'));
  keep('a dated acquisition is kept in the traps', (r) => { r[0].traps[1] = 'The label was acquired by a Chicago bottler in 1991, so bottles of that decade were not made at Lantern Hill.'; });
  refuse('ownership with no year is refused even in the story', (r) => addStory(r[0], 'The label was later sold to a Chicago bottler. What matters at the table is the wheat, which gives a softer, rounder bourbon.'), /story: "sold to" with no year in the sentence/);
  refuse('dated ownership outside the story and the traps is refused', (r) => { r[0].others[0].note = 'Bottled uncut since the label was bought by a Chicago bottler in 1991.'; }, /others\[0\]\.note: "bought by" speaks of ownership/);
  refuse('a present distiller described as a present fact is refused', (r) => addStory(r[0], 'Its current master distiller keeps the wheat in the mash, and that wheat is the whole lesson of the house at the table.'), /story: .*(?:volatile|present distiller)/);
  refuse('a name after a distiller’s title is refused', (r) => addStory(r[0], 'The wheat was the choice of master distiller Amos Reed in 1952, and it is the whole lesson of the house at the table.'), /story: "master distiller Am\.\.\." puts a name after/);
  refuse('a spaced hyphen is refused', (r) => { r[0].traps[0] = 'The label names the house - not a person: nobody of that name ran the distillery.'; }, /traps\[0\]: carries a dash or a hyphen standing in for one/);
  refuse('an em dash is refused', (r) => { r[0].traps[0] = 'The label names the house\u2014not a person: nobody of that name ran the distillery.'; }, /traps\[0\]: carries a dash/);
  refuse('a double hyphen is refused', (r) => { r[0].traps[0] = 'The label names the house--not a person: nobody of that name ran the distillery.'; }, /traps\[0\]: carries a dash/);
  refuse('a price is refused', (r) => { r[0].table = r[0].table.replace('It suits an Old Fashioned as well as a glass on its own.', 'It is affordable and suits an Old Fashioned well.'); }, /table: "affordable" talks price/);
  refuse('a currency sign is refused', (r) => { r[0].others[0].note = 'The same whiskey bottled uncut, for about $60 a bottle.'; }, /others\[0\]\.note: "\$" talks price/);
  refuse('a superlative is refused', (r) => { r[0].table = r[0].table.replace('is the bottling to begin with', 'is the most famous bottling of all'); }, /table: "most famous" is a superlative/);
  refuse('a selling word is refused', (r) => { r[0].bottle.taste = r[0].bottle.taste.replace('Caramel', 'Legendary caramel'); }, /bottle\.taste: "Legendary" is a superlative/);
  refuse('an -est word is refused', (r) => { r[0].traps[1] = 'It is not the oldest distillery in the county, whatever the back label may be taken to say.'; }, /traps\[1\]: "oldest" is a superlative/);
  keep('a refused word inside the roster’s own flagship name is the label’s', (r) => { r[4].table = r[4].table.replace('is the bottling to begin with', 'is the one a guest calls Mill Quay Finest'); });
  refuse('the same word outside the flagship’s name is refused', (r) => { r[4].table = r[4].table.replace('soft caramel', 'the finest caramel'); }, /table: "finest" is a superlative/);
  refuse('a degree sign is refused', (r) => { r[0].bottle.still = 'Cooked, fermented and run through a column still at 80° and a doubler at Lantern Hill, the house says.'; }, /bottle\.still: carries a degree sign/);
  refuse('a fraction glyph is refused', (r) => { r[0].bottle.mash = 'Corn, with ¼ wheat and some malted barley; the house does not publish its mash bill.'; }, /bottle\.mash: carries a degree sign or a fraction glyph/);
  refuse('a mark at or above U+2190 is refused', (r) => { r[0].traps[0] = 'The label names the house \u2192 not a person: nobody of that name ran the distillery.'; }, /traps\[0\]: carries U\+2192/);
  refuse('American spelling is refused', (r) => { r[0].bottle.taste = r[0].bottle.taste.replace('a soft, round', 'a soft, flavorful, round'); }, /bottle\.taste: American spelling "flavorful"/);
  refuse('a score or a medal is refused', (r) => addStory(r[0], 'It took a double gold in 2016, and what matters at the table is the wheat, which gives a softer, rounder bourbon.'), /story: "double gold" is a score/);
  refuse('allocation talk is refused', (r) => addStory(r[0], 'The bottling is allocated in most states, and what matters at the table is the wheat, which gives a softer bourbon.'), /story: "allocated" is volatile/);
  refuse('scarcity talk is refused', (r) => addStory(r[0], 'Shortages follow every release, and what matters at the table is the wheat, which gives a softer, rounder bourbon.'), /story: "Shortages" is scarcity talk/);
  refuse('allergen talk is refused', (r) => { r[0].traps[0] = 'A wheated bourbon is not gluten free by the label, whatever a guest has been told elsewhere.'; }, /traps\[0\]: "gluten" is allergen, dietary or health talk/);
  refuse('a pour size is refused', (r) => { r[0].bottle.pour = 'Poured as 2 oz neat or over one large cube of ice; it belongs in an Old Fashioned.'; }, /bottle\.pour: "2 oz" is a pour size/);
  refuse('the owner’s workplace is refused', (r) => { r[0].bottle.pour = 'Poured neat at Brennan’s or over one large cube of ice; it belongs in an Old Fashioned.'; }, /bottle\.pour: names the owner’s workplace/);
  refuse('a per cent sign outside a strength is refused', (r) => { r[0].bottle.mash = 'Corn at 70%, with wheat and malted barley; the house does not publish the rest of its mash bill.'; }, /bottle\.mash: a per cent sign outside a strength/);
  refuse('a hyphen range is refused', (r) => { r[0].bottle.wood = 'New charred American oak barrels for 6-8 years; the label carries no age statement.'; }, /bottle\.wood: a range with a hyphen/);
  refuse('a batch release with one year’s figure is refused', (r) => { r[0].bottle.strength = 'Varies by batch: 64.2% ABV in 2023'; }, /bottle\.strength: a release that varies never carries one year/);
  keep('a batch release with no figure is kept', (r) => { r[0].bottle.strength = 'Varies by batch, uncut and unfiltered'; });
  refuse('a strength not as a label states it is refused', (r) => { r[0].bottle.strength = 'About ninety proof'; }, /bottle\.strength: as the label states it/);
  refuse('a field copied wrongly from the roster is refused', (r) => { r[1].madeBy = 'Another Distillery'; }, /records\[1\]\.madeBy: copied from plan\.json exactly/);
  refuse('a link that does not resolve is refused', (r, f) => { ctx.pickByKey.get('old-lantern').group.style = 'no-such-style'; r.forEach((x) => { x.style = 'no-such-style'; }); }, /style: "no-such-style" is no CASK_STYLES id/);
  ctx.pickByKey.get('old-lantern').group.style = '';
  refuse('a bottle name that drops the roster’s flagship is refused', (r) => { r[0].bottle.name = 'Old Lantern Kentucky Straight Bourbon Whiskey'; }, /bottle\.name: carries every word of the roster’s flagship/);
  refuse('a table line that does not name the flagship is refused', (r) => { r[0].table = r[0].table.replace('Old Lantern Bonded', 'this'); }, /table: names the flagship/);
  refuse('a story with one year is refused', (r) => { r[0].story = r[0].story.replace(/\b(?:1952|1961|1974|1983|2009|2014)\b/g, 'that year'); }, /story: at least 2 dated turning points/);
  refuse('a story under its floor is refused', (r) => { r[0].story = 'The house dates its start to 1936 and came back in 2014.'; }, /story: \d+ words, 140 to 220/);
  refuse('a card id that is not a short id is refused', (r) => { r[0].cards[0].id = 'The Grain'; r[0].quiz[0].card = 'The Grain'; }, /cards\[0\]\.id: the card’s own short id/);
  refuse('two cards with one id are refused', (r) => { r[0].cards[1].id = 'grain'; r[0].quiz[1].card = 'grain'; }, /cards\[1\]\.id: grain twice/);
  refuse('a question paired with no card is refused', (r) => { r[0].quiz[0].card = 'nothing'; }, /quiz\[0\]\.card: the id of the card it is paired with/);
  refuse('a question with a key of its own is refused', (r) => { r[0].quiz[0].key = 'Cask Houses · old-lantern/q1'; }, /quiz\[0\]\.key: no field of a question/);
  refuse('two options the same are refused', (r) => { r[0].quiz[0].options = ['Wheat', 'Oats', 'oats', 'Millet']; r[0].quiz[0].a = 0; r[0].quiz[1].a = 1; r[0].quiz[1].options = ['1936', '1974', '1961', '2009']; }, /quiz\[0\]\.options: four different options/);
  refuse('a key in the stem is refused', (r) => { r[0].quiz[0].q = 'A guest asks whether wheat or rye is the second grain here. Which grain stands in for rye?'; }, /quiz\[0\]\.q: the stem carries the answer/);
  refuse('a length clue is refused', (r) => { const q = r[0].quiz[0]; q.options[q.a] = 'Soft red winter wheat, in place of the rye of most recipes'; }, /quiz\[0\]\.options: the answer is much the longest/);
  refuse('"all of the above" is refused', (r) => { const q = r[0].quiz[0]; q.options[(q.a + 1) % 4] = 'All of the above'; }, /quiz\[0\]\.options: no "all of the above"/);
  refuse('both answers in one position are refused', (r) => { const q = r[0].quiz[1]; const key = q.options[q.a]; const rest = q.options.filter((o, j) => j !== q.a); rest.splice(r[0].quiz[0].a, 0, key); q.options = rest; q.a = r[0].quiz[0].a; }, /quiz: both answers sit in one position/);
  refuse('three sources are refused', (r) => { r[0].sources.pop(); }, /sources: 4 to 5 sources \(3\)/);
  refuse('a source that is not https is refused', (r) => { r[0].sources[0].url = 'http://example.org/history'; }, /sources\[0\]\.url: an https address/);
  refuse('a source with no kind is refused', (r) => { delete r[0].sources[0].kind; }, /sources\[0\]\.kind: missing/);
  refuse('a year with no word for what it is is refused', (r) => { r[0].yearIs = ''; }, /yearIs: "founded" or "first released" beside a year/);
  refuse('a malformed checked block is refused', (r) => { r[0].checked = { date: 'yesterday', by: 'me', verdict: 'fine', changed: [], open: [] }; }, /checked\.date: YYYY-MM-DD/);
  keep('a refuter’s checked block is kept', (r) => { r[0].checked = { date: '2026-11-22', by: 'refuter', verdict: 'changed', changed: ['story: the fire was 1961 in both sources, not 1962; now 1961.'], open: [] }; });
  const pad = (n, lead) => { const have = lead.split(/\s+/).length; return lead + ' ' + new Array(Math.max(0, n - have - 1)).fill('grain').join(' ') + ' grain.'; };
  refuse('a record at every field\u2019s cap is over the whole cap and refused', (r) => {
    const x = r[0];
    x.story = pad(CAPS.story[1], 'The house dates its start to 1936 and came back in 2014, with');
    x.bottle.mash = pad(CAPS.bottle.mash[1], 'Corn, with'); x.bottle.still = pad(CAPS.bottle.still[1], 'Run through'); x.bottle.wood = pad(CAPS.bottle.wood[1], 'New oak and');
    x.bottle.taste = pad(CAPS.bottle.taste[1], 'Caramel and'); x.bottle.pour = pad(CAPS.bottle.pour[1], 'Poured neat with');
    x.others = ['Old Lantern Ten', 'Old Lantern Rye', 'Old Lantern Cask'].map((name) => ({ name, note: pad(CAPS.others.note[1], 'Another bottling of') }));
    x.traps = [0, 1, 2].map((n) => pad(CAPS.traps.line[1], 'Trap ' + ['one', 'two', 'three'][n] + ' is'));
  }, /reading words .* at most 680/);
  refuse('six of ten answers in one position are refused', (r) => { r.forEach((x, n) => { if(n < 3){ x.quiz.forEach((q, qi) => { const key = q.options[q.a]; const rest = q.options.filter((o, j) => j !== q.a); const to = qi === 0 ? 0 : 1; rest.splice(to, 0, key); q.options = rest; q.a = to; }); } else { const q = x.quiz[0]; const key = q.options[q.a]; const rest = q.options.filter((o, j) => j !== q.a); rest.splice(0, 0, key); q.options = rest; q.a = 0; const q2 = x.quiz[1]; const k2 = q2.options[q2.a]; const r2 = q2.options.filter((o, j) => j !== q2.a); r2.splice(n === 3 ? 0 : 2, 0, k2); q2.options = r2; q2.a = n === 3 ? 0 : 2; } }); }, /answers sit in position 0|both answers sit in one position/);
  refuse('records out of the roster’s order are refused', (r, f) => { f.records = [r[1], r[0], r[2], r[3], r[4]]; }, /records: the roster’s order/);
  /* the roster */
  const planRefuse = (name, edit, pattern) => { const p = clone(plan); edit(p); const ps = planProblems(p, loadContext({ plan: p, people: ctx.people, facts: ctx.facts })); rows.push([name, ps.some((x) => pattern.test(x)), ps.slice(0, 2).join(' | ') || 'no problem was raised']); };
  planRefuse('a group of four picks is refused', (p) => { p.groups[0].picks.pop(); }, /picks: exactly 5 \(4\)/);
  planRefuse('a producer twice in the roster is refused', (p) => { p.groups[0].picks[1].producer = 'Old Lantern'; }, /producer: Old Lantern is also a pick/);
  planRefuse('a pick key twice in the roster is refused', (p) => { p.groups[0].picks[1].key = 'old-lantern'; }, /key: also a pick of/);
  planRefuse('a madeBy that carries a place is refused', (p) => { p.groups[0].picks[1].madeBy = 'Lantern Hill Distillery, Nelson County'; }, /madeBy: a business name alone/);
  planRefuse('a shelf link that does not resolve is refused', (p) => { p.groups[0].picks[0].shelf = 'no-such-bottle'; }, /shelf: "no-such-bottle" is no liquor shelf bottle/);
  planRefuse('a library link that does not resolve is refused', (p) => { p.groups[0].picks[0].library = 'No Such House'; }, /library: "No Such House" is no name/);
  planRefuse('a chapter that does not resolve is refused', (p) => { p.groups[0].chapter = 'no-such-chapter'; }, /chapter: "no-such-chapter" is no CASK_CHAPTERS id/);
  return rows;
}

/* ---- the command line -------------------------------------------------------------- */
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const args = process.argv.slice(2);
  if(args.indexOf('--caps') >= 0){ console.log(capsText()); process.exit(0); }
  if(args.indexOf('--test') >= 0){
    const rows = selfTest();
    const bad = rows.filter((r) => !r[1]);
    rows.forEach((r) => console.log((r[1] ? 'ok    ' : 'FAIL  ') + r[0] + (r[1] ? '' : '\n        found: ' + r[2])));
    console.log((bad.length ? 'FAILED ' : 'ok ') + (rows.length - bad.length) + ' of ' + rows.length + ' rules hold on the seeded records');
    process.exit(bad.length ? 1 : 0);
  }
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\s?/, ''));
  process.exit(args.indexOf('--help') >= 0 || args.indexOf('-h') >= 0 ? 0 : 1);
}
