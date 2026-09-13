/* Do the pinned Coffee & Tea films still play, and are they still the right films?
 *
 * js/data-coffee-films.js pins a YouTube id to a lesson. A pinned id rots in
 * two ways and only one of them is visible:
 *
 *   THE LINK DIES   The channel deletes or privatizes it. A reader taps
 *                   "Watch for: the wrist drops as the pitcher rises" and gets
 *                   an error. Bad, but obvious.
 *
 *   THE LINK LIES   The id still resolves and now points somewhere else, or was
 *                   one character off from the day it was written. A reader taps
 *                   a lesson on the rosetta and gets a stranger's holiday video.
 *                   Worse, because nothing looks broken.
 *
 * That second failure is the entire reason the file records the real title and
 * channel rather than only the id. This asks YouTube what is actually at each
 * id and compares. No API key: oEmbed answers 200 with the title and channel
 * for a public video, and 401 or 404 for one that is gone.
 *
 *   node tools/check-films.mjs
 *   node tools/check-films.mjs --json    machine-readable, for the pipeline
 *
 * NOT a build gate. It needs the network, and a build that fails because a
 * stranger flipped a video to private is a build people learn to ignore. The
 * suite has said this twice already, in .scripts/check-videos.mjs and in the
 * World Table's own checker. Run it before a release.
 *
 * THE ONE PLACE THIS IS STRICTER THAN ITS ANCESTORS: a 403 that means
 * "embedding disabled, video fine" is a PASS for a wing that links out and a
 * FAILURE here, because this tab embeds. check-videos.mjs records that split
 * in its own summary line; on this tab there is only one side of it.
 *
 * Exits non-zero if any film is dead, undisplayable or drifted.
 */
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const JSON_OUT = process.argv.includes('--json');
const say = (m) => { if (!JSON_OUT) console.log('  ' + m); };

const path = new URL('../js/data-coffee-films.js', import.meta.url);
if (!existsSync(path)) {
  say('no js/data-coffee-films.js, so nothing is pinned yet.');
  process.exit(0);
}
const FILMS = vm.runInNewContext(readFileSync(path, 'utf8') + ';COFFEE_FILMS', {});
if (!FILMS.length) { say('no films pinned.'); process.exit(0); }

/* Words carrying no identity. Two coffee videos share most of these, so
   counting them as agreement would let almost any title match any other.
   'coffee' and 'espresso' are added to the inherited list for exactly that
   reason: on this tab they are in half the titles and mean nothing. */
const STOP = new Set(
  `the a an of to in on at for and or with how make making made your you video
   tutorial guide recipe cooking cook chef kitchen best easy perfect ultimate
   technique techniques step by part full hd 4k official coffee espresso`.split(/\s+/)
);

const words = (s) =>
  new Set(
    (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []
  );

async function lookup(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    'https://www.youtube.com/watch?v=' + id)}&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (res.status === 200) return { ok: true, ...(await res.json()) };
      /* 403 is ambiguous and the difference decides whether this tab can use it.
         Embedding disabled with the video otherwise fine is still a failure
         here, but it is a DIFFERENT failure from a sign-in wall and the
         message should say which, or somebody wastes an hour on the wrong fix. */
      let why = '';
      if (res.status === 403) {
        try {
          const page = await fetch('https://www.youtube.com/watch?v=' + id, { headers: { 'user-agent': 'Mozilla/5.0' } });
          why = ((await page.text()).match(/"playabilityStatus":\{"status":"([A-Z_]+)"/) || [])[1] || '';
        } catch { /* the reason is a nicety; the 403 is the finding */ }
      }
      return { ok: false, status: res.status, why };
    } catch (err) {
      if (attempt === 2) return { unreachable: String(err?.message || err) };
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return { unreachable: 'rate limited after three tries' };
}

/* six at a time, the cadence the suite's other two checkers settled on */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

const results = await pool(FILMS, 6, async (f) => ({ f, r: await lookup(f.id) }));

const dead = [], drifted = [], unjudgeable = [], unreachable = [], fine = [];
for (const { f, r } of results) {
  if (r.unreachable) { unreachable.push({ f, why: r.unreachable }); continue; }
  if (!r.ok) { dead.push({ f, status: r.status, why: r.why }); continue; }

  const realChannel = words(r.author_name);
  const channelOk = [...words(f.channel)].some((w) => realChannel.has(w));
  const claimed = words(f.title);
  const real = words(r.title);
  const shared = [...claimed].filter((w) => real.has(w)).length;

  /* A title the stopword list has eaten entirely is UNJUDGEABLE, not wrong.
     The inherited version scored it 0 and filed it as drift, which is a false
     alarm on any film called something like "How to make coffee". Lean on the
     channel, which is the strong signal anyway: a channel name is distinctive
     and does not get rewritten for search. */
  if (!claimed.size) {
    (channelOk ? fine : unjudgeable).push({ f, real: r.title, realChannel: r.author_name });
    continue;
  }
  const overlap = shared / claimed.size;
  if (!channelOk && overlap < 0.4) drifted.push({ f, real: r.title, realChannel: r.author_name, overlap });
  else fine.push({ f });
}

if (JSON_OUT) {
  console.log(JSON.stringify({ total: FILMS.length, fine: fine.length,
    dead: dead.map((d) => ({ id: d.f.id, status: d.status, why: d.why })),
    drifted: drifted.map((d) => ({ id: d.f.id, claimed: d.f.title, real: d.real })),
    unjudgeable: unjudgeable.map((d) => ({ id: d.f.id })),
    unreachable: unreachable.map((d) => ({ id: d.f.id })) }, null, 1));
} else {
  const bySec = FILMS.reduce((m, f) => (m[f.sec] = (m[f.sec] || 0) + 1, m), {});
  say(FILMS.length + ' films pinned: ' + Object.entries(bySec).map(([k, n]) => k + ' ' + n).join(', '));
  say(fine.length + ' still play and still look like themselves');
  for (const d of dead) {
    say('DEAD  ' + d.f.id + '  ' + d.f.sec + '/' + d.f.row + '  HTTP ' + d.status
      + (d.why === 'OK' ? '  (plays on YouTube, embedding is off, and this tab embeds)'
        : d.why ? '  (' + d.why + ')' : ''));
  }
  for (const d of drifted) {
    say('DRIFTED  ' + d.f.id + '  ' + d.f.sec + '/' + d.f.row);
    say('    we recorded: ' + d.f.title + '  by ' + d.f.channel);
    say('    youtube says: ' + d.real + '  by ' + d.realChannel);
  }
  for (const d of unjudgeable) {
    say('UNJUDGEABLE  ' + d.f.id + '  title is all common words and the channel disagrees:');
    say('    we recorded: ' + d.f.title + '  by ' + d.f.channel);
    say('    youtube says: ' + d.real + '  by ' + d.realChannel);
  }
  for (const d of unreachable) say('unreachable (the network, not the film): ' + d.f.id + '  ' + d.why);
  if (dead.length || drifted.length || unjudgeable.length) {
    console.error('check-films: ' + (dead.length + drifted.length + unjudgeable.length) + ' film(s) need re-pointing');
  } else {
    console.log('check-films: OK');
  }
}
process.exit(dead.length || drifted.length || unjudgeable.length ? 1 : 0);
