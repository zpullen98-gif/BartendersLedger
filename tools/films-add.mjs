/* Pin a Coffee & Tea film, and make a wrong one impossible to land.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a title and a channel are never typed.
 * They are assigned only from the oEmbed response, in the same run that proved
 * the id resolves. tools/films.candidates.json has no title or channel field
 * at all, and this script refuses a file that carries one, so the guarantee is
 * a missing field rather than a discipline somebody has to remember.
 *
 * What that buys, exactly:
 *   a fabricated id       404s and is never written
 *   an id one char off    IS written, carrying THE STRANGER'S title and
 *                         channel, and check-films.mjs fails on the first run
 *                         because the recorded channel is not the real one
 *
 *   node tools/films-add.mjs            verify the candidates and rewrite the file
 *   node tools/films-add.mjs --dry      report only, write nothing
 *
 * It regenerates js/data-coffee-films.js whole rather than patching it, writes
 * the same bytes to both trees, and then runs check.mjs and check-films.mjs and
 * refuses to leave a tree that does not pass. The pipeline's postcondition is
 * the gate's precondition.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DRY = process.argv.includes('--dry');
const HERE = new URL('.', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, HERE), 'utf8');

/* Both trees, so one run leaves them byte-identical. The second is optional:
   the standalone is the only tree that must exist for this to be useful. */
const TREES = ['../', '../../OutsideOfTime/ledger/']
  .map((rel) => new URL(rel, HERE))
  .filter((u) => existsSync(new URL('js/data-coffee.js', u)));

/* slugify is READ OUT OF THE APP rather than copied, the same anti-drift rule
   tools/check.mjs uses: a pipeline that re-implements the router drifts from it. */
const slugify = vm.runInNewContext(
  (read('../js/ui-new.js').match(/function slugify.*$/m) || [])[0] + ';slugify', {});
if (typeof slugify !== 'function') { console.error('films-add: could not read slugify out of ui-new.js'); process.exit(2); }

const STUDY = vm.runInNewContext(read('../js/data-coffee.js') + ';COFFEE_STUDY', {});
const SECTIONS = new Map(STUDY.map((s, i) => [s.key, { i, rows: s.rows.map((r) => slugify(r[0])) }]));

const CAND = new URL('films.candidates.json', HERE);
if (!existsSync(CAND)) { console.error('films-add: no tools/films.candidates.json'); process.exit(2); }
const candidates = JSON.parse(readFileSync(CAND, 'utf8'));

/* ---- 1. structural, before a single network call ------------------------ */
const problems = [];
const seenKey = new Set();
for (const [n, c] of candidates.entries()) {
  const at = 'candidate ' + (n + 1) + ' (' + (c.sec || '?') + '/' + (c.row || '?') + '): ';
  if ('title' in c || 'channel' in c) problems.push(at + 'titles come from YouTube, not from you. Remove the field.');
  if (!c.sec || !SECTIONS.has(c.sec)) { problems.push(at + 'sec names no section in COFFEE_STUDY'); continue; }
  const sec = SECTIONS.get(c.sec);
  if (!c.row) problems.push(at + 'no row');
  else if (!sec.rows.includes(c.row)) {
    problems.push(at + 'row matches no lesson in that section. Live rows are:\n      ' + sec.rows.join('\n      '));
  }
  if (!c.watchFor || String(c.watchFor).trim().length < 40) {
    problems.push(at + 'watchFor is the whole value over a search link. Say what to look at, in a sentence.');
  }
  if (c.start !== undefined && (!Number.isInteger(c.start) || c.start <= 0)) problems.push(at + 'start must be a positive whole number of seconds');
  const key = c.sec + '/' + c.row;
  if (seenKey.has(key)) problems.push(at + 'two films on one lesson'); else seenKey.add(key);
}
if (problems.length) { console.error('films-add:\n  ' + problems.join('\n  ')); process.exit(1); }

/* ---- 2. the url, and the id shape -------------------------------------- */
function idOf(url) {
  const s = String(url || '');
  if (/youtube\.com\/shorts\//.test(s)) {
    return { err: 'a Short is a highlight of a pour, not an explanation of one, and 9:16 pillarboxes into a 16:9 card. Find the long-form upload.' };
  }
  const m = s.match(/[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/) || s.match(/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#]|$)/);
  if (!m) return { err: 'no eleven character video id in that URL' };
  return { id: m[1] };
}
const parsed = [];
for (const [n, c] of candidates.entries()) {
  const { id, err } = idOf(c.url);
  if (err) problems.push('candidate ' + (n + 1) + ' (' + c.sec + '/' + c.row + '): ' + err);
  else parsed.push({ ...c, id });
}
const byId = new Map();
for (const p of parsed) {
  if (byId.has(p.id)) problems.push('the same id is pinned twice: ' + p.id + ' on ' + byId.get(p.id) + ' and ' + p.sec + '/' + p.row);
  else byId.set(p.id, p.sec + '/' + p.row);
}
if (problems.length) { console.error('films-add:\n  ' + problems.join('\n  ')); process.exit(1); }

/* ---- 3. ask YouTube. This is the only thing that may write a title. ----- */
async function lookup(id) {
  const url = 'https://www.youtube.com/oembed?url='
    + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (res.status === 200) return { ok: true, ...(await res.json()) };
      let why = '';
      if (res.status === 403) {
        try {
          const page = await fetch('https://www.youtube.com/watch?v=' + id, { headers: { 'user-agent': 'Mozilla/5.0' } });
          why = ((await page.text()).match(/"playabilityStatus":\{"status":"([A-Z_]+)"/) || [])[1] || '';
        } catch { /* the reason is a nicety */ }
      }
      return { ok: false, status: res.status, why };
    } catch (e) {
      if (attempt === 2) return { unreachable: String(e?.message || e) };
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return { unreachable: 'rate limited after three tries' };
}

const films = [];
const rejected = [];
let unreachable = 0;
for (const p of parsed) {
  const r = await lookup(p.id);
  const at = p.sec + '/' + p.row + '  ' + p.id;
  if (r.unreachable) {
    /* Not written and not rejected. A film must never land on a maybe, and a
       blip must never be recorded as a dead video. */
    console.error('  UNREACHABLE  ' + at + '  ' + r.unreachable);
    unreachable++;
    continue;
  }
  if (!r.ok) {
    const why = r.status === 403 && r.why === 'OK'
      ? 'plays on YouTube but embedding is off, and this tab embeds'
      : r.status === 403 ? '403 ' + (r.why || 'forbidden')
      : r.status === 404 ? 'no such video'
      : r.status === 401 ? 'sign-in walled'
      : 'HTTP ' + r.status;
    rejected.push(at + '  ' + why);
    continue;
  }
  /* THE ONLY ASSIGNMENT OF title AND channel IN THIS FILE. */
  films.push({ sec: p.sec, row: p.row, id: p.id, title: r.title, channel: r.author_name,
    start: p.start, watchFor: String(p.watchFor).trim() });
}

for (const r of rejected) console.error('  REJECTED  ' + r);
console.log('\n  ' + films.length + ' verified, ' + rejected.length + ' rejected, ' + unreachable + ' unreachable');
if (unreachable) { console.error('films-add: something was unreachable, so nothing was written. Run it again.'); process.exit(1); }
if (!films.length) { console.error('films-add: nothing verified.'); process.exit(1); }

/* ---- 4. emit, pure ASCII ------------------------------------------------
   A real YouTube title carries em dashes, curly quotes, emoji and sometimes
   Japanese. The published tree counts em dashes against a baseline with five
   characters of headroom, so ONE title could break the suite's gate. Escaping
   every codepoint outside printable ASCII solves that and two other problems
   at once: the file is byte-identical in both trees whatever an editor does
   with encoding, and the STRING VALUE still equals YouTube's title exactly, so
   check-films.mjs compares like with like.

   The three ASCII dash spellings cannot be escaped away, so they are refused. */
const ASCII_DASH = /(^| )--( |$)|&mdash;|&#8212;|&#x2014;/;
for (const f of films) {
  for (const k of ['title', 'channel']) {
    if (ASCII_DASH.test(f[k])) {
      console.error('films-add: ' + f.id + ' has an ASCII em dash spelling in its ' + k
        + ', which cannot be escaped away. Pick a different upload.');
      process.exit(1);
    }
  }
}
const u = (n) => '\\u' + n.toString(16).padStart(4, '0');
const esc = (s) => '"' + [...String(s)].map((ch) => {
  if (ch === '"') return '\\"';
  if (ch === '\\') return '\\\\';
  const c = ch.codePointAt(0);
  if (c >= 0x20 && c <= 0x7e) return ch;
  /* An astral character (emoji, and plenty of titles have them) is two UTF-16
     units and both halves have to be escaped, or the pair is torn in half. */
  return ch.length === 2 ? u(ch.charCodeAt(0)) + u(ch.charCodeAt(1)) : u(c);
}).join('') + '"';

films.sort((a, b) => (SECTIONS.get(a.sec).i - SECTIONS.get(b.sec).i)
  || (SECTIONS.get(a.sec).rows.indexOf(a.row) - SECTIONS.get(b.sec).rows.indexOf(b.row)));

const header = `/* ============ THE PINNED FILMS ============
   MACHINE WRITTEN. Do not hand-edit: tools/films-add.mjs regenerates this file
   whole from tools/films.candidates.json, and a hand edit is lost on the next
   run and unprovable in the meantime.

   Every title and channel below came back from YouTube's oEmbed endpoint in
   the run that wrote this file. Nobody typed them. They are recorded so that
   tools/check-films.mjs can ask YouTube again later and notice when an id
   still resolves but now points at something else, which is the failure a bare
   is-it-alive check cannot see.

   Titles are escaped to pure ASCII. That is not decoration: the published tree
   counts em dashes against a baseline with very little headroom, and one
   borrowed title could break it. The escaped form is byte-identical in both
   trees and its string VALUE still equals YouTube's title exactly.

   Keyed sec + row, where row is slugify() of a lesson title in that section of
   COFFEE_STUDY. tools/check.mjs closes that loop, so a lesson renamed in a
   later pass fails the build rather than silently dropping its film.
   ============ */

const COFFEE_FILMS = [
`;
const body = films.map((f) => '  {sec:' + esc(f.sec) + ',row:' + esc(f.row) + ',id:' + esc(f.id)
  + ',title:' + esc(f.title) + ',channel:' + esc(f.channel)
  + (f.start ? ',start:' + f.start : '') + ',watchFor:' + esc(f.watchFor) + '},').join('\n');
const text = header + body + '\n];\n';

if (DRY) {
  console.log('\n--- dry run, nothing written ---\n');
  for (const f of films) console.log('  ' + f.sec + '/' + f.row + '  ' + f.channel + '  ::  ' + f.title);
  process.exit(0);
}

for (const t of TREES) {
  const target = new URL('js/data-coffee-films.js', t);
  writeFileSync(target, text);
  console.log('  wrote ' + fileURLToPath(target));
}

/* ---- 5. the postcondition ----------------------------------------------
   Both trees get the same bytes, so checking one proves the shape of both;
   check-films is run here rather than left to a human because the whole point
   of this script is that nothing lands unverified. */
for (const g of ['check.mjs', 'check-films.mjs']) {
  try {
    execFileSync(process.execPath, [fileURLToPath(new URL(g, HERE))],
      { cwd: fileURLToPath(new URL('..', HERE)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('  ' + g + ': OK');
  } catch (e) {
    console.error('  ' + g + ' FAILED after the write:\n' + ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-8).join('\n'));
    process.exit(1);
  }
}
console.log('\nfilms-add: ' + films.length + ' films pinned and both gates green.');
