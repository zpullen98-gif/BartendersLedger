#!/usr/bin/env node
/* show: prints what the Ledger already holds on a group of Producers and
   flagships, or on one of its labels, so an author starts from the app's own
   words and never contradicts a reviewed page. Writes nothing.

     node tools/caskhouses/show.mjs <group key>      the group, its style, and its five houses (wheated-bourbon)
     node tools/caskhouses/show.mjs <pick key>       one house (pappy-van-winkle)
     node tools/caskhouses/show.mjs --groups         the roster in brief: every group, its chunk and its five labels
     node tools/caskhouses/show.mjs --help

   For a group it prints the roster's row and, where the group has a style,
   the style's page in brief: its law, its three lines, the houses it names
   and its shelf bottles. For each house it prints the pick (the flagship,
   who makes it, the planner's why and what the planner asks the author to
   confirm), then everything the app says about the label today:
     the liquor shelf bottle the roster links, in full (BACKBAR_GUIDE);
     the Library's record the roster links (PRODUCERS in js/ui-reference.js);
     every sentence of the Cask Atlas (CASK_CHAPTERS), of At the table: every
     style (CASK_STYLES) and of the liquor shelf that names the label.
   The Library's older records were written before the house voice (they
   carry superlatives, prices and present owners): take their facts, check
   them, and never their wording. Where a page of this repo disagrees with
   your sources, keep your record right and say so in report. */
import { readFileSync } from 'node:fs';
import { loadContext, planProblems, nameWords, fold, sentenceList, strings, chunkGroups } from './schema.mjs';

const args = process.argv.slice(2);
if(!args.length || args.indexOf('--help') >= 0 || args.indexOf('-h') >= 0){
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\s?/, ''));
  process.exit(args.length ? 0 : 1);
}
const ctx = loadContext();
const plan = ctx.plan, F = ctx.facts;
const bad = planProblems(plan, ctx);
if(bad.length){ console.error('tools/caskhouses/plan.json:'); bad.forEach((p) => console.error('  ' + p)); process.exit(1); }

const out = [];
const say = (s) => out.push(s == null ? '' : String(s));
const wrap = (s, indent) => {
  const pad = ' '.repeat(indent), words = String(s).split(/\s+/), lines = [];
  let cur = '';
  words.forEach((w) => { if((cur + ' ' + w).trim().length > 110 - indent){ lines.push(pad + cur.trim()); cur = w; } else cur += ' ' + w; });
  if(cur.trim()) lines.push(pad + cur.trim());
  return lines.join('\n');
};
const field = (label, value) => { if(value !== undefined && value !== null && String(value).trim()) say(wrap(label + ': ' + value, 4)); };

/* the phrases that name a label in running text: the label, its bare words, and a long name's last two words (Van Winkle) */
function termsOf(producer){
  const t = new Set([fold(producer)]);
  const ws = nameWords(producer);
  if(ws.length) t.add(ws.join(' '));
  if(ws.length >= 3) t.add(ws.slice(-2).join(' '));
  return [...t].filter((x) => x.length >= 4);
}
function mentions(value, terms, skip){
  const hits = [];
  for(const [path, s] of strings(value, '')){
    if(/sources\[\d+\]\.url$/.test(path) || /^\.?(?:id|shelf\[\d+\]|chapters\[\d+\]|canon\[\d+\]|neighbour|related\[\d+\])$/.test(path) || (skip && skip.test(path))) continue;
    sentenceList(s).forEach((sen) => {
      const t = ' ' + fold(sen) + ' ';
      if(terms.some((x) => t.indexOf(' ' + x + ' ') >= 0)) hits.push([path.replace(/^\./, ''), sen]);
    });
  }
  return hits;
}

function showStyle(id){
  const st = F.styles.get(id);
  if(!st){ say('  (no CASK_STYLES entry ' + id + ')'); return; }
  say('  THE STYLE AT THE TABLE: ' + st.name + '  (#/casks/style/' + st.id + ')');
  field('The law', st.law);
  field('In ten seconds', st.lines && st.lines.s10);
  field('In twenty seconds', st.lines && st.lines.s20);
  field('In forty-five seconds', st.lines && st.lines.s45);
  field('How it differs', st.compare);
  field('The houses it names', (st.benchmarks || []).join('; '));
  field('Its shelf bottles', (st.shelf || []).map((b) => b + (F.shelf.has(b) ? ' (' + F.shelf.get(b).name + ')' : '')).join('; '));
  field('Its chapters', (st.chapters || []).join(', '));
}
function showShelf(id){
  const b = F.shelf.get(id);
  if(!b){ say('    (no liquor shelf bottle ' + id + ')'); return; }
  say('    ON THE LIQUOR SHELF: ' + b.name + '  (#/menu/backbar/' + b.id + ')');
  field('  Made by', b.producer + ', ' + b.place);
  if(b.facts) ['base', 'age', 'cask', 'abv', 'law'].forEach((k) => field('  ' + k, b.facts[k]));
  field('  How it is made', b.made);
  field('  How it tastes', b.taste);
  field('  In forty-five seconds', b.lines && b.lines.s45);
  field('  The story', b.story);
  (b.watch || []).forEach((w) => field('  Watch for', w));
  field('  Its sources', (b.sources || []).map((s) => s.title).join('; '));
}
function showLibrary(name){
  const p = F.library.get(name);
  if(!p){ say('    (no Library record ' + name + ')'); return; }
  say('    IN THE LIBRARY: ' + p.name + '  (' + p.cat + '; ' + p.where + '; est. ' + p.est + ')   facts to check, never wording to copy');
  field('  Why', p.why);
  field('  The process', p.process);
  field('  Behind the bar', p.bar);
}
function showPick(g, p){
  say('');
  say('  ' + p.producer.toUpperCase() + '   key ' + p.key + (p.benchmark ? '   (a house the style already names)' : ''));
  field('Flagship', p.flagship);
  field('Made by', p.madeBy || 'the label itself');
  field('Why', p.why);
  field('To confirm', p.note);
  field('Links', 'shelf ' + (p.shelf || 'none') + '; library ' + (p.library || 'none'));
  if(p.shelf) showShelf(p.shelf);
  if(p.library) showLibrary(p.library);
  const terms = termsOf(p.producer);
  const groups = [
    ['IN THE CASK ATLAS', [...F.chapters.values()].map((c) => [c.id, mentions(c, terms)])],
    ['IN AT THE TABLE: EVERY STYLE', [...F.styles.values()].map((s) => [s.id, mentions(s, terms)])],
    ['ELSEWHERE ON THE LIQUOR SHELF', [...F.shelf.values()].filter((b) => b.id !== p.shelf).map((b) => [b.id, mentions(b, terms)])]
  ];
  groups.forEach(([title, rows]) => {
    const hit = rows.filter(([, h]) => h.length);
    if(!hit.length) return;
    say('    ' + title + ' (' + hit.reduce((n, [, h]) => n + h.length, 0) + ' sentence' + (hit.reduce((n, [, h]) => n + h.length, 0) === 1 ? '' : 's') + ' naming ' + terms.join(' / ') + ')');
    hit.forEach(([id, hs]) => hs.slice(0, 8).forEach(([path, sen]) => say(wrap('[' + id + ' ' + path + '] ' + sen, 6))));
  });
}
function showGroup(g){
  say(g.title.toUpperCase() + '   group ' + g.key + '   family ' + g.family + '   chunk ' + g.chunk);
  say('  style ' + (g.style || 'none') + '; chapter ' + (g.chapter || 'none') + '; fragment tools/caskhouses/fragments/' + g.key + '.json');
  if(g.swaps.length) g.swaps.forEach((s) => say(wrap('swap: ' + JSON.stringify(s), 2)));
  if(g.style){ say(''); showStyle(g.style); }
  else if(g.chapter && F.chapters.has(g.chapter)){ say(''); say('  THE CHAPTER: ' + F.chapters.get(g.chapter).title + '  (#/casks/' + g.chapter + ')'); field('Summary', F.chapters.get(g.chapter).summary); }
  g.picks.forEach((p) => showPick(g, p));
}

if(args[0] === '--groups'){
  plan.chunks.forEach((c) => {
    say(c.name);
    (chunkGroups(plan, c.name) || []).forEach((k) => { const g = ctx.groupByKey.get(k); say('  ' + (k + '                              ').slice(0, 28) + g.picks.map((p) => p.producer).join('; ')); });
  });
} else {
  args.forEach((a, i) => {
    if(i) say('\n' + '='.repeat(100) + '\n');
    const g = ctx.groupByKey.get(a), hit = ctx.pickByKey.get(a);
    if(g) showGroup(g);
    else if(hit){ say(hit.group.title.toUpperCase() + '   group ' + hit.group.key + '   (one house of five)'); showPick(hit.group, hit.pick); }
    else { console.error('show: "' + a + '" is no group and no pick of plan.json (try --groups)'); process.exit(1); }
  });
}
console.log(out.join('\n'));
