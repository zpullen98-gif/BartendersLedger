/* Builds js/data-brew.js, the Coffee and tea page's data, from the roster and
   the fragments (18 October 2026). The page's data file is GENERATED here and
   never hand-edited.

     node tools/brew/build-brew.mjs            the fragments in tools/brew/fragments/, each with a passing review
     node tools/brew/build-brew.mjs --seed     the three seeds in tools/brew/seed/ instead (no review needed)
     node tools/brew/build-brew.mjs --check    writes nothing; exits 1 unless js/data-brew.js is what it would write
     node tools/brew/build-brew.mjs --partial  builds the sound fragments and lists the refused ones (exit 1 all the same)
     node tools/brew/build-brew.mjs --help

   A fragment is refused when it fails tools/brew/schema.mjs or, outside --seed,
   has no reviews/<id>.r1.json whose verdict is pass or fixed. The plan's askId
   is filled in, the house's own name in a copied ask becomes the {house} token
   the page fills from the pack, the entries follow the plan's order, and every
   character beyond ASCII is written as a backslash-u escape, so the file is pure ASCII.
   The run also writes tools/brew/build-log.json (entries, words, questions,
   videos by how they were verified) unless --check is given. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BREW_DIR, LEDGER_ROOT, loadContext, validateFragment, planProblems, houseNeutral, proseWords, MAKE_FIELDS } from './schema.mjs';

const args = new Set(process.argv.slice(2));
if(args.has('--help') || args.has('-h')){
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const SEED = args.has('--seed'), CHECK = args.has('--check'), PARTIAL = args.has('--partial');
const OUT = join(LEDGER_ROOT, 'js', 'data-brew.js');
const LOG = join(BREW_DIR, 'build-log.json');
const SRC = join(BREW_DIR, SEED ? 'seed' : 'fragments');
/* the edition the page states; a seed build says so */
const EDITION = '2026-10-18' + (SEED ? '-seed' : '');

function readJSON(p){ return JSON.parse(readFileSync(p, 'utf8')); }
function fail(lines){ for(const l of lines) console.error(l); process.exit(1); }

const packPath = process.env.OOT_SHARED ? join(process.env.OOT_SHARED, 'packs', 'brennans-new-orleans.v1.oothouse.json') : '';
const ctx = loadContext({ packPath });
const plan = ctx.plan;
const bad = planProblems(plan);
if(bad.length) fail(['plan.json:'].concat(bad.map((p) => '  ' + p)));
if(!SEED) ctx.videoEvidence = (id) => { const p = join(BREW_DIR, 'videos', id + '.json'); try { return existsSync(p) ? readJSON(p) : null; } catch (e) { return null; } };

const entries = [], refused = [], missing = [];
for(const row of plan.entries){
  const file = join(SRC, row.id + '.json');
  if(!existsSync(file)){ missing.push(row.id); continue; }
  let f;
  try { f = readJSON(file); } catch (e) { refused.push([row.id, ['fragment: not valid JSON (' + e.message + ')']]); continue; }
  const problems = [];
  if(f && f.id !== row.id) problems.push('id: the file is ' + row.id + '.json but the id is "' + (f && f.id) + '"');
  problems.push(...validateFragment(f, ctx));
  if(!SEED){
    const rp = join(BREW_DIR, 'reviews', row.id + '.r1.json');
    let review = null;
    try { review = existsSync(rp) ? readJSON(rp) : null; } catch (e) { review = null; }
    if(!review) problems.push('review: no reviews/' + row.id + '.r1.json');
    else if(['pass', 'fixed'].indexOf(review.verdict) < 0) problems.push('review: the verdict is "' + review.verdict + '", not pass or fixed');
    else if(review.id !== row.id) problems.push('review: the review names "' + review.id + '"');
  }
  if(problems.length){ refused.push([row.id, problems]); continue; }
  entries.push(shape(f, row));
}

/* one fixed key order, so the same fragments always write the same bytes */
function shape(f, row){
  const house = row.house.printed
    ? { printed: true, packIds: row.house.packIds.slice() }
    : Object.assign({ printed: false, askId: row.house.askId, ask: houseNeutral(row.house.ask || f.house.ask) }, row.house.uses ? { uses: row.house.uses.slice() } : {});
  const make = {};
  MAKE_FIELDS.forEach((k) => { make[k] = f.make[k]; });
  const library = { ref: row.library.ref, study: row.library.study, cocktail: row.library.cocktail, na: row.library.na };
  if(row.library.method) library.method = row.library.method;
  /* The shipped video carries no title: the page draws our own label and, for a company, the channel,
     never the published title, so the title (with whatever dash, name or claim it carries) stays in the
     fragment and in videos/<id>.json for the record. */
  const video = f.video ? { url: f.video.url, id: f.video.id, title: '', channel: f.video.channel, channelKind: f.video.channelKind,
    label: f.video.label, watchFor: f.video.watchFor, verifiedBy: f.video.verifiedBy, checkedOn: f.video.checkedOn } : null;
  return { id: f.id, name: f.name, respell: f.respell, aka: f.aka, group: f.group, kind: f.kind, caffeine: f.caffeine, house,
    what: f.what, taste: f.taste, make, serve: f.serve, story: f.story, guest: f.guest, watch: f.watch, library, table: { recipe: row.table.recipe },
    video, search: row.search, recall: f.recall.map((r) => ({ id: r.id, prompt: r.prompt, answer: r.answer })),
    quiz: f.quiz.map((q) => ({ id: q.id, q: q.q, options: q.options.slice(), a: q.a, explain: q.explain })),
    sources: f.sources.map((s) => ({ title: s.title, url: s.url })) };
}

if(refused.length){
  const lines = refused.map(([id, ps]) => id + ':\n' + ps.map((p) => '  ' + p).join('\n'));
  console.error('Refused ' + refused.length + ' fragment' + (refused.length === 1 ? '' : 's') + ':\n' + lines.join('\n'));
  if(!PARTIAL) process.exit(1);
}

function ascii(s){ return s.replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); }
const head = [
  '/* GENERATED by tools/brew/build-brew.mjs from tools/brew/plan.json and the',
  '   reviewed fragments in tools/brew/' + (SEED ? 'seed' : 'fragments') + '/. Never hand-edit this file: change a',
  '   fragment and run the build (--check proves this file is what it writes).',
  '   The Coffee and tea page under the house tab (js/ui-brew.js). Every method',
  '   here is a general method, not the house build; the house\'s own drinks are',
  '   read live from the pack by id, and the data names no house and no person.',
  '   Pure ASCII: every other character is a \\u escape. */',
  ''
].join('\n');
const data = { edition: EDITION, groups: plan.groups, house: plan.house, asks: plan.asks, companies: ctx.companies };
const body = 'const BREW_GUIDE = {\n'
  + Object.keys(data).map((k) => '  ' + k + ': ' + JSON.stringify(data[k]) + ',').join('\n') + '\n'
  + '  entries: [\n' + entries.map((e) => '    ' + JSON.stringify(e)).join(',\n') + (entries.length ? '\n' : '') + '  ]\n};\n';
const text = ascii(head + body);

if(CHECK){
  const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if(now !== text) fail(['js/data-brew.js is not what tools/brew/build-brew.mjs' + (SEED ? ' --seed' : '') + ' writes: run the build.']);
  console.log('ok js/data-brew.js equals the build (' + entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies') + (SEED ? ', seed' : '') + ')');
  process.exit(refused.length ? 1 : 0);
}

writeFileSync(OUT, text);
const byVerified = { 'coffee-films': 0, pack: 0, websearch: 0, none: 0 };
entries.forEach((e) => { byVerified[e.video ? e.video.verifiedBy : 'none']++; });
const perEntry = {};
entries.forEach((e) => { perEntry[e.id] = proseWords(e); });
const log = {
  edition: EDITION, source: SEED ? 'seed' : 'fragments', entries: entries.length, planned: plan.entries.length,
  words: { total: Object.values(perEntry).reduce((a, b) => a + b, 0), perEntry },
  questions: entries.reduce((n, e) => n + e.quiz.length, 0), recall: entries.reduce((n, e) => n + e.recall.length, 0),
  videos: byVerified, missing, refused: refused.map(([id, ps]) => ({ id, problems: ps }))
};
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
console.log('wrote js/data-brew.js: ' + entries.length + ' of ' + plan.entries.length + ' entries' + (SEED ? ' (seed)' : '')
  + (missing.length ? ', ' + missing.length + ' not yet written' : '') + (refused.length ? ', ' + refused.length + ' refused' : '')
  + '; videos ' + JSON.stringify(byVerified) + '; tools/brew/build-log.json');
process.exit(refused.length ? 1 : 0);
