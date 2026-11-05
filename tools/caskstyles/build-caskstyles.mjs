/* Builds js/data-caskstyles.js, the data of At the table: every style in the
   Cask Atlas (Whisky & Brandy), from the roster and the fragments
   (5 November 2026). The page's data file is GENERATED here and never
   hand-edited.

     node tools/caskstyles/build-caskstyles.mjs             every fragment in tools/caskstyles/fragments/ the schema accepts
     node tools/caskstyles/build-caskstyles.mjs --check     writes nothing; exits 1 unless js/data-caskstyles.js is what it would write
     node tools/caskstyles/build-caskstyles.mjs --complete  as the build, and exits 1 while a roster style has no fragment
     node tools/caskstyles/build-caskstyles.mjs --seed      as the build, and exits 1 unless the roster's three seeds are written and sound
     node tools/caskstyles/build-caskstyles.mjs --partial   writes the sound fragments and lists the refused ones (exit 1 all the same)
     node tools/caskstyles/build-caskstyles.mjs --help

   A fragment is refused when it fails tools/caskstyles/schema.mjs (the roster
   is checked first and a roster problem refuses the whole run). Without
   --partial a refusal writes nothing. The styles follow the roster's order,
   family by family; each carries its roster terms and neighbour beside the
   fragment's fields. Every character beyond ASCII is written as a
   backslash-u escape, so the file is pure ASCII. The run also writes
   tools/caskstyles/build-log.json (styles, words, cards, questions, sources,
   what is missing) unless --check is given. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CS_DIR, LEDGER_ROOT, loadContext, validateFragment, planProblems, proseWords, cardKey,
  LINE_FIELDS, SERVE_FIELDS } from './schema.mjs';

const args = new Set(process.argv.slice(2));
if(args.has('--help') || args.has('-h')){
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const known = ['--check', '--partial', '--complete', '--seed', '--help', '-h'];
const unknown = [...args].filter((a) => known.indexOf(a) < 0);
if(unknown.length){ console.error('build-caskstyles: unknown option ' + unknown.join(' ') + ' (see --help)'); process.exit(1); }
const CHECK = args.has('--check'), PARTIAL = args.has('--partial'), COMPLETE = args.has('--complete'), SEED = args.has('--seed');
const OUT = join(LEDGER_ROOT, 'js', 'data-caskstyles.js');
const LOG = join(CS_DIR, 'build-log.json');
const SRC = join(CS_DIR, 'fragments');

function readJSON(p){ return JSON.parse(readFileSync(p, 'utf8')); }
function fail(lines){ for(const l of lines) console.error(l); process.exit(1); }

const ctx = loadContext();
const plan = ctx.plan;
const bad = planProblems(plan, ctx);
if(bad.length) fail(['tools/caskstyles/plan.json:'].concat(bad.map((p) => '  ' + p)));

const entries = [], refused = [], missing = [];
for(const row of plan.entries){
  const file = join(SRC, row.id + '.json');
  if(!existsSync(file)){ missing.push(row.id); continue; }
  let f;
  try { f = readJSON(file); } catch (e) { refused.push([row.id, ['fragment: not valid JSON (' + e.message + ')']]); continue; }
  const problems = [];
  if(f && f.id !== row.id) problems.push('id: the file is ' + row.id + '.json but the id is "' + (f && f.id) + '"');
  problems.push(...validateFragment(f, ctx));
  if(problems.length){ refused.push([row.id, problems]); continue; }
  entries.push(shape(f, row));
}
/* a fragment the roster does not name */
const ids = new Set(plan.entries.map((e) => e.id));
let strays = [];
try { strays = readdirSync(SRC).filter((n) => /\.json$/.test(n)).map((n) => n.replace(/\.json$/, '')).filter((id) => !ids.has(id)); } catch (e) {}
strays.forEach((id) => refused.push([id, ['id: not a roster id']]));

/* one fixed key order, so the same fragments always write the same bytes */
function pick(o, keys){ const r = {}; keys.forEach((k) => { if(k in o) r[k] = o[k]; }); return r; }
function shape(f, row){
  return {
    id: f.id, name: f.name, respell: f.respell, family: row.family, terms: row.terms.slice(), neighbour: row.neighbour,
    law: f.law, made: f.made, taste: f.taste,
    lines: pick(f.lines, LINE_FIELDS), serve: pick(f.serve, SERVE_FIELDS),
    guest: f.guest.map((g) => ({ q: g.q, a: g.a })), compare: f.compare, benchmarks: f.benchmarks.slice(),
    shelf: row.shelf.slice(), chapters: row.chapters.slice(), canon: row.canon.slice(),
    recall: f.recall.map((r) => ({ id: r.id, prompt: r.prompt, answer: r.answer })),
    quiz: f.quiz.map((q) => ({ id: q.id, q: q.q, options: q.options.slice(), a: q.a, explain: q.explain })),
    sources: f.sources.map((s) => ({ title: s.title, url: s.url }))
  };
}

const seeds = Array.isArray(plan.seeds) ? plan.seeds : [];
const written = new Set(entries.map((e) => e.id));
const seedsMissing = seeds.filter((id) => !written.has(id));
const problems = refused.length || (COMPLETE && missing.length) || (SEED && seedsMissing.length);
if(refused.length){
  const lines = refused.map(([id, ps]) => id + ':\n' + ps.map((p) => '  ' + p).join('\n'));
  console.error('Refused ' + refused.length + ' fragment' + (refused.length === 1 ? '' : 's') + ':\n' + lines.join('\n'));
  if(!PARTIAL && !CHECK) process.exit(1);
}
if(COMPLETE && missing.length) console.error('Not yet written (' + missing.length + '): ' + missing.join(', '));
if(SEED && seedsMissing.length) console.error('Seeds not written or not sound: ' + seedsMissing.join(', '));

function ascii(s){ return s.replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); }
const head = [
  '/* GENERATED by tools/caskstyles/build-caskstyles.mjs from tools/caskstyles/plan.json',
  '   and the fragments in tools/caskstyles/fragments/. Never hand-edit this file:',
  '   change a fragment or the roster and run the build (--check proves this file is',
  '   what it writes). At the table: every style, in the Cask Atlas (Whisky & Brandy,',
  '   js/ui-caskstyles.js): each whisky style with its rule, how it is made and tastes,',
  '   the tableside lines, how we pour it, what guests ask, its neighbour, the houses',
  '   to name and its links to the Cask Atlas chapters, the liquor shelf and the canon.',
  '   The data names no house and nobody living. Pure ASCII: every other character is a',
  '   \\u escape. */',
  ''
].join('\n');
const data = { edition: plan.edition, families: plan.families.map((g) => ({ id: g.id, title: g.title })) };
const body = 'var CASK_STYLES = {\n'
  + Object.keys(data).map((k) => '  ' + k + ': ' + JSON.stringify(data[k]) + ',').join('\n') + '\n'
  + '  entries: [\n' + entries.map((e) => '    ' + JSON.stringify(e)).join(',\n') + (entries.length ? '\n' : '') + '  ]\n};\n';
const text = ascii(head + body);

if(CHECK){
  const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if(now !== text) fail(['js/data-caskstyles.js is not what tools/caskstyles/build-caskstyles.mjs writes: run the build.']);
  console.log('ok js/data-caskstyles.js equals the build (' + entries.length + ' of ' + plan.entries.length + ' styles)');
  process.exit(problems ? 1 : 0);
}

writeFileSync(OUT, text);
const perEntry = {};
entries.forEach((e) => { perEntry[e.id] = proseWords(e); });
const byFamily = {};
plan.families.forEach((g) => { byFamily[g.id] = { planned: plan.entries.filter((e) => e.family === g.id).length, written: entries.filter((e) => e.family === g.id).length }; });
const log = {
  edition: plan.edition, styles: entries.length, planned: plan.entries.length, byFamily,
  words: { total: Object.values(perEntry).reduce((a, b) => a + b, 0), perEntry },
  cards: entries.map((e) => cardKey(e.id)), questions: entries.reduce((n, e) => n + e.quiz.length, 0),
  sources: entries.reduce((n, e) => n + e.sources.filter((s) => s.url).length, 0),
  shelf: entries.reduce((n, e) => n + e.shelf.length, 0),
  missing, refused: refused.map(([id, ps]) => ({ id, problems: ps }))
};
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
console.log('wrote js/data-caskstyles.js: ' + entries.length + ' of ' + plan.entries.length + ' styles'
  + (missing.length ? ', ' + missing.length + ' not yet written' : '') + (refused.length ? ', ' + refused.length + ' refused' : '')
  + '; ' + log.questions + ' questions, ' + entries.length + ' cards, ' + log.sources + ' sources, ' + log.shelf + ' shelf links'
  + '; tools/caskstyles/build-log.json');
process.exit(problems ? 1 : 0);
