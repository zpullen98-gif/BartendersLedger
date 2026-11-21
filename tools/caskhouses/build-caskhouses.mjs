#!/usr/bin/env node
/* build-caskhouses: builds js/data-caskhouses.js, the data of Producers and
   flagships (Whisky & Brandy), from the roster (tools/caskhouses/plan.json)
   and one fragment a group (tools/caskhouses/fragments/<group>.json, the
   group's five records in the roster's order). BRIEF.md is the authors' and
   refuters' contract and schema.mjs the one validator; the data file is
   GENERATED here and never edited by hand.

     node tools/caskhouses/build-caskhouses.mjs --lint <group> [<group> ...]   holds the named fragments to the schema; WRITES NOTHING
     node tools/caskhouses/build-caskhouses.mjs --lint --chunk <c1 to c11>      the same, for a chunk of plan.chunks
     node tools/caskhouses/build-caskhouses.mjs --lint --all                    the same, for every fragment on disk
     node tools/caskhouses/build-caskhouses.mjs                                 the writing build, the roster whole: the data file, keys.v1.json, build-log.json
     node tools/caskhouses/build-caskhouses.mjs --partial                       the writing build for a roster not yet whole
     node tools/caskhouses/build-caskhouses.mjs --partial --unrefuted           the same, and ships records no refuter has read (a pilot; the whole build refuses the flag)
     node tools/caskhouses/build-caskhouses.mjs --check                         proves the shipped file and the keys are the build; writes nothing
     node tools/caskhouses/build-caskhouses.mjs --plan                          proves the roster against the shipped data; writes nothing
     node tools/caskhouses/build-caskhouses.mjs --freeze                        the whole build, then freezes keys.v1.json
     node tools/caskhouses/build-caskhouses.mjs --help
     options: --fragments <dir>  --out <file>  --keys <file>  --log <file>   (scratch copies and gates)

   WHO RUNS WHAT. Authors and refuters run --lint and nothing else. The
   pipeline engineer, the page engineer and the integrator run the writing
   build; everybody else leaves the data file as they find it.

   The lint. Each named fragment is read, held to schema.mjs and printed with
   every problem (the field, then the rule) and every note (what a second
   reader should look at: never a failure). Exit 1 while a problem stands.

   The roster is proved first in every mode (--plan prints the proof): five
   picks a group; every key, producer and flagship once; every style a
   CASK_STYLES id, every chapter a CASK_CHAPTERS id, every shelf bottle a
   BACKBAR_GUIDE entry id and every library name a name in the Library's
   PRODUCERS, read from the shipped js/ files. A roster problem refuses the
   run.

   The writing build. A group ships only whole: its fragment present, its
   five records sound, and every one carrying a refuter's checked block.
   Without --partial every group of the roster must ship, or nothing is
   written. With --partial the groups that can ship do, the rest are listed,
   and the file says in its head and in meta.partial that it is a partial
   build. --unrefuted (only with --partial) lets a sound record ship before a
   refuter has read it: the head says so and meta.unrefuted counts them. The
   whole build and --freeze refuse the flag, so nothing unrefuted can reach
   a whole roster.

   The keys. A recall card's key is 'Cask Houses · <pick key>/<card id>':
   the pick's key from the roster and the card's own short id from the
   fragment. Nothing is minted or hashed, so a reworded card keeps its key
   and a swapped bottling keeps its pick's key. A question carries the key
   of the card it is paired with (ckey) and no key of its own.
   tools/caskhouses/keys.v1.json lists every key in the roster's order. While
   it says frozen: false it follows the writing build, and a key that leaves
   is printed. Once --freeze has run, the build may add a key and never
   loses one: a lost key refuses the build, because a key is a person's
   saved record. A group whose keys are frozen always ships: if its fragment
   is missing, refused or unrefuted the build writes nothing, partial or
   whole, since the data file would lose the cards the keys still promise.

   The output. js/data-caskhouses.js declares CASK_HOUSES = { meta,
   families, groups, houses }: groups are the roster's built groups in
   order (key, title, family, style, chapter, houses: the five pick keys);
   houses are the records in the roster's order, one a line, each with its
   fields in schema.mjs's order, family beside group, key and ckey written
   out; report, checked and a source's read never ship. Every character
   beyond ASCII is written as a backslash-u escape, so the file is pure
   ASCII. --check builds in memory as the shipped file was built (partial
   and unrefuted when its meta says so) and compares with the file and with
   keys.v1.json. Exit 1 with every problem named. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, isAbsolute, sep } from 'node:path';
import vm from 'node:vm';
import { CH_DIR, LEDGER_ROOT, DATA_FILE, GLOBAL, KEY_PREFIX, PICKS, FIELDS, BOTTLE_FIELDS,
  loadContext, planProblems, validateFragment, adviseRecord, isRefuted, readingWords, cardKey, chunkGroups, roster, settleKeys, longestTally, LENGTH_SHARE } from './schema.mjs';

const PARTIAL_MARK = 'A PARTIAL BUILD';
const UNREFUTED_MARK = 'UNREFUTED';

function rel(p){ const r = relative(LEDGER_ROOT, p); return (!r.startsWith('..') && !isAbsolute(r) ? r : p).split(sep).join('/'); }
function readJSON(p){ return JSON.parse(readFileSync(p, 'utf8')); }
function parseArgs(argv){
  const o = { lint: false, all: false, chunk: null, groups: [], check: false, partial: false, unrefuted: false, plan: false, freeze: false, help: false,
    fragments: join(CH_DIR, 'fragments'), out: join(LEDGER_ROOT, DATA_FILE), keys: join(CH_DIR, 'keys.v1.json'), log: join(CH_DIR, 'build-log.json') };
  for(let i = 0; i < argv.length; i++){
    const a = argv[i];
    const val = () => { const v = argv[++i]; if(v === undefined || /^--/.test(v)) throw new Error(a + ' needs a value'); return v; };
    if(a === '--lint') o.lint = true;
    else if(a === '--all') o.all = true;
    else if(a === '--chunk') o.chunk = val();
    else if(a === '--check') o.check = true;
    else if(a === '--partial') o.partial = true;
    else if(a === '--unrefuted' || a === '--pilot') o.unrefuted = true;
    else if(a === '--plan') o.plan = true;
    else if(a === '--freeze') o.freeze = true;
    else if(a === '--fragments') o.fragments = resolve(val());
    else if(a === '--out') o.out = resolve(val());
    else if(a === '--keys') o.keys = resolve(val());
    else if(a === '--log') o.log = resolve(val());
    else if(a === '--help' || a === '-h') o.help = true;
    else if(/^--/.test(a)) throw new Error('unknown option ' + a + ' (see --help)');
    else o.groups.push(a);
  }
  const modes = [o.lint, o.check, o.plan, o.freeze].filter(Boolean).length;
  if(modes > 1) throw new Error('one of --lint, --check, --plan, --freeze at a time');
  if(!o.lint && (o.all || o.chunk || o.groups.length)) throw new Error('a group, --chunk and --all belong to --lint');
  if(o.lint && !o.all && !o.chunk && !o.groups.length) throw new Error('--lint needs a group, --chunk <name> or --all');
  if(o.unrefuted && !o.partial) throw new Error('--unrefuted stands only beside --partial: the whole build ships no record a refuter has not read');
  if(o.freeze && (o.partial || o.unrefuted)) throw new Error('--freeze is the whole build: no --partial, no --unrefuted');
  if((o.lint || o.plan || o.check) && (o.partial || o.unrefuted)) throw new Error('--partial and --unrefuted belong to the writing build (--check reads them from the shipped file)');
  return o;
}

/* ---- fragments -------------------------------------------------------------------- */
function readFragment(dir, key){
  const file = join(dir, key + '.json');
  if(!existsSync(file)) return { file, missing: true };
  try { return { file, frag: readJSON(file) }; } catch (e) { return { file, broken: 'not valid JSON (' + e.message + ')' }; }
}
function fragmentsOnDisk(dir){
  try { return readdirSync(dir).filter((n) => /\.json$/.test(n)).map((n) => n.replace(/\.json$/, '')).sort(); } catch (e) { return []; }
}

/* ---- the shipped shape: one fixed key order, so the same fragments always write the same bytes ---- */
function pick(o, keys){ const r = {}; keys.forEach((k) => { if(k in o) r[k] = o[k]; }); return r; }
function shape(rec, g){
  const out = {};
  FIELDS.forEach((k) => {
    if(k === 'group'){ out.group = rec.group; out.family = g.family; return; }
    if(k === 'bottle'){ const b = pick(rec.bottle, BOTTLE_FIELDS); b.label = rec.bottle.label.map((x) => ({ term: x.term, means: x.means })); out.bottle = b; return; }
    if(k === 'others'){ out.others = rec.others.map((x) => ({ name: x.name, note: x.note })); return; }
    if(k === 'traps'){ out.traps = rec.traps.slice(); return; }
    if(k === 'cards'){ out.cards = rec.cards.map((c) => ({ id: c.id, key: cardKey(rec.key, c.id), prompt: c.prompt, answer: c.answer })); return; }
    if(k === 'quiz'){ out.quiz = rec.quiz.map((q) => ({ id: q.id, tag: q.tag, ckey: cardKey(rec.key, q.card), q: q.q, options: q.options.slice(), a: q.a, explain: q.explain })); return; }
    if(k === 'sources'){ out.sources = rec.sources.map((s) => ({ title: s.title, url: s.url, kind: s.kind })); return; }
    out[k] = rec[k];
  });
  return out;
}
function ascii(s){ return s.replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); }
function line(v){ return ascii(JSON.stringify(v)); }

/* ---- the build, in memory ------------------------------------------------------------ */
function build(ctx, o, mode){
  const plan = ctx.plan;
  const B = { groups: [], houses: [], keys: [], missing: [], refused: [], unrefutedGroups: [], strays: [], words: {}, unrefuted: 0 };
  plan.groups.forEach((g) => {
    const r = readFragment(o.fragments, g.key);
    if(r.missing){ B.missing.push(g.key); return; }
    if(r.broken){ B.refused.push([g.key, ['fragment: ' + r.broken]]); return; }
    const problems = validateFragment(r.frag, ctx, g.key);
    if(problems.length){ B.refused.push([g.key, problems]); return; }
    const unread = r.frag.records.filter((x) => !isRefuted(x)).map((x) => x.key);
    if(unread.length && !mode.unrefuted){ B.unrefutedGroups.push([g.key, unread]); return; }
    B.unrefuted += unread.length;
    B.groups.push({ key: g.key, title: g.title, family: g.family, style: g.style, chapter: g.chapter, houses: g.picks.map((p) => p.key) });
    r.frag.records.forEach((rec) => {
      const s = shape(rec, g);
      B.houses.push(s);
      B.words[rec.key] = readingWords(rec);
      s.cards.forEach((c) => B.keys.push(c.key));
    });
  });
  const known = new Set(plan.groups.map((g) => g.key));
  B.strays = fragmentsOnDisk(o.fragments).filter((k) => !known.has(k));
  const all = roster(plan);
  const meta = {
    edition: plan.date, wave: plan.edition, prefix: KEY_PREFIX,
    roster: { groups: plan.groups.length, houses: all.length },
    built: { groups: B.groups.length, houses: B.houses.length, cards: B.keys.length, questions: B.houses.reduce((n, h) => n + h.quiz.length, 0), sources: B.houses.reduce((n, h) => n + h.sources.length, 0) },
    partial: !!mode.partial, unrefuted: B.unrefuted
  };
  const head = ['/* ' + GLOBAL + ': Producers and flagships (Whisky & Brandy), five houses a style, each with its flagship bottling.',
    '   GENERATED by tools/caskhouses/build-caskhouses.mjs from tools/caskhouses/plan.json and tools/caskhouses/fragments/.',
    '   Never edit this file by hand: change a fragment and run the build.'];
  if(mode.partial) head.push('   ' + PARTIAL_MARK + ': ' + B.groups.length + ' of ' + plan.groups.length + ' groups, ' + B.houses.length + ' of ' + all.length + ' houses.');
  if(B.unrefuted) head.push('   ' + UNREFUTED_MARK + ': ' + B.unrefuted + ' of these records no refuter has read. A pilot only; the whole build refuses them.');
  head[head.length - 1] += ' */';
  B.meta = meta;
  B.text = head.join('\n') + '\nvar ' + GLOBAL + ' = {\n  meta: ' + line(meta) + ',\n  families: ' + line(plan.families) + ',\n  groups: [\n'
    + B.groups.map((g) => '    ' + line(g)).join(',\n') + (B.groups.length ? '\n' : '') + '  ],\n  houses: [\n'
    + B.houses.map((h) => '    ' + line(h)).join(',\n') + (B.houses.length ? '\n' : '') + '  ]\n};\n';
  return B;
}

/* ---- the keys file ----------------------------------------------------------------- */
const KEYS_ABOUT = 'Every recall card key of Producers and flagships, in the roster’s order: ‘Cask Houses · <pick key>/<card id>’, two a house. The pick’s key comes from plan.json and the card’s short id from its fragment; nothing is minted, so a reworded card and a swapped bottling keep their keys. A question has no key of its own: it carries the key of the card it is paired with. While frozen is false this file follows the writing build (build-caskhouses.mjs) and a key that leaves is printed. Once the integrator has run build-caskhouses.mjs --freeze, with the roster whole, a build may add a key and never loses one: a lost key refuses the build, because a key is a person’s saved record.';
function readKeys(file){
  if(!existsSync(file)) return { about: KEYS_ABOUT, frozen: false, keys: [] };
  const j = readJSON(file);
  if(!j || typeof j.frozen !== 'boolean' || !Array.isArray(j.keys) || j.keys.some((k) => typeof k !== 'string')) throw new Error(rel(file) + ': { about, frozen: true or false, keys: [...] }');
  return j;
}
/* what the keys file must hold after a build, and what stands in the way, is schema.mjs's settleKeys: the rule lives once */
function settle(ctx, B, K){ return settleKeys(ctx, { keys: B.keys, picks: B.houses.map((h) => h.key) }, K); }

/* ---- the modes ------------------------------------------------------------------------ */
function printRefused(B){
  B.refused.forEach(([k, ps]) => ps.forEach((p) => console.error('fragments/' + k + '.json: ' + p)));
  B.strays.forEach((k) => console.error('fragments/' + k + '.json: no group of plan.json'));
}
function main(){
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error('build-caskhouses: ' + e.message); process.exit(1); }
  if(o.help){ console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\s?/, '')); process.exit(0); }
  const ctx = loadContext();
  const plan = ctx.plan;
  const bad = planProblems(plan, ctx);
  if(bad.length){ console.error('tools/caskhouses/plan.json:'); bad.forEach((p) => console.error('  ' + p)); process.exit(1); }
  const all = roster(plan);

  if(o.plan){
    const n = (k) => all.filter((x) => x.pick[k]).length;
    console.log('ok tools/caskhouses/plan.json: ' + plan.groups.length + ' groups of ' + PICKS + ' in ' + plan.chunks.length + ' chunks, ' + all.length + ' picks; every key, producer and flagship once; '
      + plan.groups.filter((g) => g.style).length + ' style links, ' + plan.groups.filter((g) => g.chapter).length + ' chapter links, ' + n('shelf') + ' shelf links and ' + n('library') + ' library links resolve against js/ ('
      + ctx.facts.styles.size + ' styles, ' + ctx.facts.chapters.size + ' chapters, ' + ctx.facts.shelf.size + ' shelf bottles, ' + ctx.facts.library.size + ' Library producers); '
      + ctx.people.names.length + ' living people listed, ' + ctx.people.historic.length + ' historic');
    process.exit(0);
  }

  if(o.lint){
    let keys = o.groups.slice();
    if(o.chunk){ const c = chunkGroups(plan, o.chunk); if(!c){ console.error('build-caskhouses: no chunk "' + o.chunk + '" in plan.chunks'); process.exit(1); } keys = keys.concat(c); }
    if(o.all) keys = keys.concat(fragmentsOnDisk(o.fragments));
    keys = [...new Set(keys)];
    let K = null;
    try { K = readKeys(o.keys); } catch (e) { console.error(e.message); process.exit(1); }
    let failed = 0, sound = 0, absent = 0;
    keys.forEach((k) => {
      const g = ctx.groupByKey.get(k);
      const r = readFragment(o.fragments, k);
      const at = 'fragments/' + k + '.json';
      if(!g){ console.log(at + ': no group of plan.json'); failed++; return; }
      if(r.missing){ console.log(at + ': not written yet'); absent++; return; }
      if(r.broken){ console.log(at + ': ' + r.broken); failed++; return; }
      const problems = validateFragment(r.frag, ctx, k);
      problems.forEach((p) => console.log(at + ': ' + p));
      const notes = [];
      (Array.isArray(r.frag.records) ? r.frag.records : []).forEach((rec, i) => notes.push(...adviseRecord(rec, i, ctx)));
      /* a key the file holds for one of these picks that the fragment no longer carries */
      const mine = new Set();
      (Array.isArray(r.frag.records) ? r.frag.records : []).forEach((rec) => (rec && Array.isArray(rec.cards) ? rec.cards : []).forEach((c) => { if(rec && c) mine.add(cardKey(rec.key, c.id)); }));
      const picks = new Set(g.picks.map((p) => p.key));
      K.keys.filter((x) => picks.has(x.slice(KEY_PREFIX.length).split('/')[0]) && !mine.has(x)).forEach((x) => {
        if(K.frozen){ console.log(at + ': the frozen key "' + x + '" is gone (keep the card’s id, whatever its words)'); problems.push(x); }
        else notes.push('the key "' + x + '" is in keys.v1.json and no longer in the fragment (not frozen yet)');
      });
      const tally = longestTally(r.frag);
      if(tally.longest === LENGTH_SHARE || tally.shortest === LENGTH_SHARE) notes.push('records: the answer is the ' + (tally.longest === LENGTH_SHARE ? 'longest' : 'shortest') + ' option in ' + LENGTH_SHARE + ' of ' + tally.asked + ' questions, the most a group may hold: one more is refused');
      notes.forEach((n) => console.log('note: ' + k + ' ' + n));
      if(problems.length){ failed++; console.log(at + ': ' + problems.length + ' problem' + (problems.length === 1 ? '' : 's')); }
      else { sound++; console.log(at + ': sound'); }
    });
    console.log((failed ? 'FAILED' : 'ok') + ' lint: ' + sound + ' sound, ' + failed + ' with problems' + (absent ? ', ' + absent + ' not written yet' : '') + ' (nothing written)');
    process.exit(failed ? 1 : 0);
  }

  if(o.check){
    if(!existsSync(o.out)){ console.error(rel(o.out) + ': missing (run the build)'); process.exit(1); }
    const shipped = readFileSync(o.out, 'utf8');
    let meta = null;
    try { const box = {}; vm.createContext(box); vm.runInContext(shipped + '\n;this.__out = ' + GLOBAL + ';', box); meta = box.__out.meta; } catch (e) { console.error(rel(o.out) + ': does not run (' + e.message + ')'); process.exit(1); }
    const mode = { partial: !!(meta && meta.partial), unrefuted: !!(meta && meta.unrefuted) };
    const B = build(ctx, o, mode);
    const problems = [];
    if(!mode.partial && (B.missing.length || B.refused.length || B.unrefutedGroups.length)) problems.push(rel(o.out) + ': says it is the whole roster, and ' + (B.missing.length + B.refused.length + B.unrefutedGroups.length) + ' group(s) cannot ship');
    if(B.text !== shipped) problems.push(rel(o.out) + ': is not what the build writes from the fragments (edited by hand, or a fragment changed since the build: run the build)');
    if(/[^\x00-\x7f]/.test(shipped)) problems.push(rel(o.out) + ': carries a character beyond ASCII');
    let K = null;
    try { K = readKeys(o.keys); } catch (e) { problems.push(e.message); }
    if(K){
      const S = settle(ctx, B, K);
      S.problems.forEach((p) => problems.push(p));
      if(JSON.stringify(S.keys) !== JSON.stringify(K.keys)) problems.push(rel(o.keys) + ': is not the keys of the build (' + S.added.length + ' key(s) the file lacks, ' + K.keys.filter((k) => S.keys.indexOf(k) < 0).length + ' it should not hold: run the build)');
    }
    if(problems.length){ printRefused(B); problems.forEach((p) => console.error(p)); process.exit(1); }
    /* a fragment that is not shipped cannot make the shipped file wrong, so it is a note here: the whole build refuses it */
    B.strays.forEach((k) => console.log('note: fragments/' + k + '.json is named for no group of plan.json (the whole build refuses a stray file)'));
    B.refused.forEach(([k, ps]) => console.log('note: fragments/' + k + '.json is on disk and not shipped: ' + ps.length + ' problem(s) by the schema'));
    console.log('ok ' + rel(o.out) + ' and ' + rel(o.keys) + ' equal the build: ' + B.groups.length + ' of ' + plan.groups.length + ' groups, ' + B.houses.length + ' of ' + all.length + ' houses, '
      + B.keys.length + ' cards, ' + B.meta.built.questions + ' questions' + (mode.partial ? '; ' + PARTIAL_MARK.toLowerCase() : '') + (B.unrefuted ? '; ' + B.unrefuted + ' records ' + UNREFUTED_MARK.toLowerCase() + ', a pilot' : '')
      + '; keys ' + (K.frozen ? 'frozen' : 'not frozen'));
    process.exit(0);
  }

  /* the writing build */
  const mode = { partial: o.partial, unrefuted: o.unrefuted };
  const B = build(ctx, o, mode);
  printRefused(B);
  B.unrefutedGroups.forEach(([k, unread]) => console.error('fragments/' + k + '.json: sound, and ' + unread.length + ' of its records no refuter has read (' + unread.join(', ') + '): a group ships only when every record carries a checked block'));
  if(!mode.partial && B.missing.length) console.error('not written yet: ' + B.missing.join(', '));
  const blocked = B.refused.length || B.strays.length || (!mode.partial && (B.missing.length || B.unrefutedGroups.length));
  if(!mode.partial && blocked){ console.error('build-caskhouses: the whole build ships every group of the roster, each sound and refuted. Nothing written.'); process.exit(1); }
  let K;
  try { K = readKeys(o.keys); } catch (e) { console.error(e.message); process.exit(1); }
  const S = settle(ctx, B, K);
  if(S.problems.length){ S.problems.forEach((p) => console.error(p)); console.error('build-caskhouses: nothing written.'); process.exit(1); }
  S.notes.forEach((n) => console.log(n));
  writeFileSync(o.out, B.text);
  writeFileSync(o.keys, JSON.stringify({ about: K.about || KEYS_ABOUT, frozen: K.frozen || !!o.freeze, keys: S.keys }, null, 1) + '\n');
  const log = { edition: plan.date, wave: plan.edition, partial: mode.partial, unrefuted: B.unrefuted, roster: B.meta.roster, built: B.meta.built,
    words: { total: Object.values(B.words).reduce((a, b) => a + b, 0), perHouse: B.words },
    keys: { frozen: K.frozen || !!o.freeze, held: S.keys.length, added: S.added.length },
    missing: B.missing, unrefutedGroups: B.unrefutedGroups.map(([k, u]) => ({ group: k, records: u })), refused: B.refused.map(([k, ps]) => ({ group: k, problems: ps })) };
  writeFileSync(o.log, JSON.stringify(log, null, 1) + '\n');
  console.log('wrote ' + rel(o.out) + ': ' + B.groups.length + ' of ' + plan.groups.length + ' groups, ' + B.houses.length + ' of ' + all.length + ' houses, ' + B.keys.length + ' cards, ' + B.meta.built.questions + ' questions, ' + B.meta.built.sources + ' sources'
    + (mode.partial ? '; ' + PARTIAL_MARK.toLowerCase() + (B.missing.length ? ', ' + B.missing.length + ' groups not written yet' : '') + (B.unrefutedGroups.length ? ', ' + B.unrefutedGroups.length + ' waiting for a refuter' : '') + (B.refused.length ? ', ' + B.refused.length + ' refused' : '') : '')
    + (B.unrefuted ? '; ' + B.unrefuted + ' records ' + UNREFUTED_MARK.toLowerCase() + ', a pilot' : '')
    + '; ' + rel(o.keys) + ' holds ' + S.keys.length + ' keys' + (o.freeze ? ', now frozen' : (K.frozen ? ', frozen' : ', not frozen')) + '; ' + rel(o.log));
  process.exit(blocked ? 1 : 0);
}
main();
