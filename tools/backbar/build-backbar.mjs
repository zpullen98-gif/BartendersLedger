/* Builds js/data-backbar.js, the liquor shelf's data, from the roster and the
   fragments (4 November 2026). The page's data file is GENERATED here and
   never hand-edited.

     node tools/backbar/build-backbar.mjs             every fragment in tools/backbar/fragments/ the schema accepts
     node tools/backbar/build-backbar.mjs --check     writes nothing; exits 1 unless js/data-backbar.js is what it would write
     node tools/backbar/build-backbar.mjs --complete  as the build, and exits 1 while a roster bottle has no fragment
     node tools/backbar/build-backbar.mjs --partial   writes the sound fragments and lists the refused ones (exit 1 all the same)
     node tools/backbar/build-backbar.mjs --help

   A fragment is refused when it fails tools/backbar/schema.mjs (the plan is
   checked first and a plan problem refuses the whole run). Without --partial a
   refusal writes nothing. The bottles follow the plan's order; the confirm rows
   come from the plan itself, never from a fragment. Every character beyond
   ASCII is written as a backslash-u escape, so the file is pure ASCII. The run
   also writes tools/backbar/build-log.json (bottles, words, cards, questions,
   sources, what is missing) unless --check is given. OOT_SHARED, when set,
   lets the build report what At the house and From the same house find in the
   pack for each bottle; the pack never changes what is written. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BB_DIR, LEDGER_ROOT, loadContext, validateFragment, planProblems, proseWords, houseUses, houseFamily, cardKey,
  FACT_FIELDS, LINE_FIELDS, SERVE_FIELDS } from './schema.mjs';

const args = new Set(process.argv.slice(2));
if(args.has('--help') || args.has('-h')){
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const CHECK = args.has('--check'), PARTIAL = args.has('--partial'), COMPLETE = args.has('--complete');
const OUT = join(LEDGER_ROOT, 'js', 'data-backbar.js');
const LOG = join(BB_DIR, 'build-log.json');
const SRC = join(BB_DIR, 'fragments');

function readJSON(p){ return JSON.parse(readFileSync(p, 'utf8')); }
function fail(lines){ for(const l of lines) console.error(l); process.exit(1); }

const packPath = process.env.OOT_SHARED ? join(process.env.OOT_SHARED, 'packs', 'brennans-new-orleans.v1.oothouse.json') : '';
const ctx = loadContext({ packPath });
const plan = ctx.plan;
const bad = planProblems(plan, ctx);
if(bad.length) fail(['plan.json:'].concat(bad.map((p) => '  ' + p)));

const entries = [], refused = [], missing = [];
for(const row of ctx.bottles){
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
/* a fragment the plan does not name, or names as a confirm row */
const known = new Set(ctx.bottles.map((b) => b.id));
let strays = [];
try { strays = readdirSync(SRC).filter((n) => /\.json$/.test(n)).map((n) => n.replace(/\.json$/, '')).filter((id) => !known.has(id)); } catch (e) {}
strays.forEach((id) => refused.push([id, [ctx.byId.has(id) ? 'id: a confirm row lives in plan.json and has no fragment' : 'id: not a plan id']]));

/* one fixed key order, so the same fragments always write the same bytes */
function pick(o, keys){ const r = {}; keys.forEach((k) => { r[k] = o[k]; }); return r; }
function shape(f, row){
  return {
    id: f.id, name: f.name, respell: f.respell, aka: f.aka.slice(), group: f.group, producer: f.producer, place: f.place,
    photo: f.photo, confidence: f.confidence, facts: pick(f.facts, FACT_FIELDS), made: f.made, taste: f.taste,
    lines: pick(f.lines, LINE_FIELDS), serve: pick(f.serve, SERVE_FIELDS), guest: f.guest, story: f.story,
    watch: f.watch.slice(), asks: f.asks.slice(),
    house: { match: row.house.match.slice(), family: row.house.family.slice() },
    library: { producer: row.library.producer, cask: row.library.cask, canon: row.library.canon.slice() },
    recall: f.recall.map((r) => ({ id: r.id, prompt: r.prompt, answer: r.answer })),
    quiz: f.quiz.map((q) => ({ id: q.id, q: q.q, options: q.options.slice(), a: q.a, explain: q.explain })),
    sources: f.sources.map((s) => ({ title: s.title, url: s.url }))
  };
}
const confirm = plan.entries.filter((e) => e.group === 'confirm')
  .map((e) => ({ id: e.id, name: e.name, group: e.group, photo: e.photo, where: e.where, read: e.read, ask: e.ask }));

const problems = refused.length || (COMPLETE && missing.length);
if(refused.length){
  const lines = refused.map(([id, ps]) => id + ':\n' + ps.map((p) => '  ' + p).join('\n'));
  console.error('Refused ' + refused.length + ' fragment' + (refused.length === 1 ? '' : 's') + ':\n' + lines.join('\n'));
  if(!PARTIAL && !CHECK) process.exit(1);
}
if(COMPLETE && missing.length) console.error('Not yet written (' + missing.length + '): ' + missing.join(', '));

function ascii(s){ return s.replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); }
const head = [
  '/* GENERATED by tools/backbar/build-backbar.mjs from tools/backbar/plan.json and',
  '   the fragments in tools/backbar/fragments/. Never hand-edit this file: change a',
  '   fragment or the plan and run the build (--check proves this file is what it',
  '   writes). The liquor shelf under the house tab (js/ui-backbar.js): every bottle',
  '   on the owner\'s photographs of the back bar, 4 November 2026. The house\'s',
  '   drinks are read live from the pack by each bottle\'s house terms; the data',
  '   names no house and nobody living. Pure ASCII: every other character is a \\u escape. */',
  ''
].join('\n');
const data = { edition: plan.edition, groups: plan.groups };
const body = 'var BACKBAR_GUIDE = {\n'
  + Object.keys(data).map((k) => '  ' + k + ': ' + JSON.stringify(data[k]) + ',').join('\n') + '\n'
  + '  entries: [\n' + entries.map((e) => '    ' + JSON.stringify(e)).join(',\n') + (entries.length ? '\n' : '') + '  ],\n'
  + '  confirm: [\n' + confirm.map((e) => '    ' + JSON.stringify(e)).join(',\n') + (confirm.length ? '\n' : '') + '  ]\n};\n';
const text = ascii(head + body);

if(CHECK){
  const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if(now !== text) fail(['js/data-backbar.js is not what tools/backbar/build-backbar.mjs writes: run the build.']);
  console.log('ok js/data-backbar.js equals the build (' + entries.length + ' of ' + ctx.bottles.length + ' bottles, ' + confirm.length + ' to confirm)');
  process.exit(problems ? 1 : 0);
}

writeFileSync(OUT, text);
const perEntry = {};
entries.forEach((e) => { perEntry[e.id] = proseWords(e); });
const house = {};
if(ctx.pack) entries.forEach((e) => {
  const uses = houseUses(ctx.pack, e, ctx.bottles), fam = houseFamily(ctx.pack, e);
  if(uses.length || fam.length) house[e.id] = { uses, family: fam.map((x) => x.id) };
});
const log = {
  edition: plan.edition, bottles: entries.length, planned: ctx.bottles.length, confirm: confirm.length,
  words: { total: Object.values(perEntry).reduce((a, b) => a + b, 0), perEntry },
  cards: entries.map((e) => cardKey(e.id)), questions: entries.reduce((n, e) => n + e.quiz.length, 0),
  sources: entries.reduce((n, e) => n + e.sources.filter((s) => s.url).length, 0),
  house: ctx.pack ? house : 'OOT_SHARED not set',
  missing, refused: refused.map(([id, ps]) => ({ id, problems: ps }))
};
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
console.log('wrote js/data-backbar.js: ' + entries.length + ' of ' + ctx.bottles.length + ' bottles, ' + confirm.length + ' to confirm'
  + (missing.length ? ', ' + missing.length + ' not yet written' : '') + (refused.length ? ', ' + refused.length + ' refused' : '')
  + '; ' + log.questions + ' questions, ' + entries.length + ' cards, ' + log.sources + ' sources'
  + (ctx.pack ? '; at the house (uses+family): ' + (Object.keys(house).map((id) => id + ' ' + house[id].uses.length + '+' + house[id].family.length).join(', ') || 'none yet') : '')
  + '; tools/backbar/build-log.json');
process.exit(problems ? 1 : 0);
