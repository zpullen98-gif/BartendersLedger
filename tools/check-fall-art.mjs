/* The seasonal plates are optional reading aids, never answer-front hints.
   Run after generating data-fall-menu-art.js and exporting its WebP assets. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWing, LEDGER } from './load-wing.mjs';
const read = file => fs.readFileSync(path.join(LEDGER, file), 'utf8');
const html = read('index.html'), sw = read('sw.js');
const files = [...html.matchAll(/<script src="js\/([^"?]+)(?:\?[^"]*)?"[^>]*>/g)].map(match => match[1]);
const box = loadWing(files), get = box.get;
const art = get('FALL_MENU_ART'), api = get('LedgerTeaching'), items = get('fallItems')();
const artEsc = value => get('esc')(value).replace(/'/g, '&#39;');
let checks = 0;
function check(label, work) { try { work(); checks++; } catch (error) { error.message = label + ': ' + error.message; throw error; } }
check('one reviewed illustration per food or cocktail item', () => {
  assert.equal(art.version, 1);
  assert.equal(art.items.length, 17);
  assert.deepEqual([...art.items.map(item => item.itemId)].sort(), [...items.map(item => item.id)].sort());
  assert.equal(new Set(art.items.map(item => item.src)).size, 17);
});
const recordBefore = JSON.stringify(get('progress'));
for (const entry of art.items) {
  const id = 'fall-art-' + entry.itemId, registered = api.entries[id];
  check(entry.itemId + ' is described and registered', () => {
    assert.ok(registered, 'metadata passed exact-path and dimension validation');
    assert.equal(registered.title, entry.title);
    assert.ok(entry.alt && entry.caption && entry.context);
    assert.ok(entry.cues.length >= 3 && entry.cues.length <= 5);
    assert.equal(registered.labels.length, entry.cues.length);
    assert.equal(registered.keyTitle, 'Study the ingredient cues');
    assert.ok(registered.thumb);
    assert.ok(entry.width > entry.thumbnailWidth && entry.height > entry.thumbnailHeight);
    assert.equal(entry.width * entry.thumbnailHeight, entry.height * entry.thumbnailWidth);
  });
  check(entry.itemId + ' files are small optional WebP images', () => {
    for (const file of [entry.src, entry.thumbnailSrc]) {
      assert.match(file, /^img\/fall-2026\/[a-z0-9-]+-v\d+(?:\.thumb)?\.webp$/);
      const bytes = fs.readFileSync(path.join(LEDGER, file));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length < api.maxImageBytes);
      assert.ok(!sw.includes("'./" + file + "'"), 'large illustrations never enter shell precache');
      assert.ok(api.handles(new Request('http://localhost/ledger/' + file)));
      assert.ok(!api.handles(new Request('http://localhost/ledger/' + file + '?unregistered=1')));
    }
  });
  check(entry.itemId + ' is confined to reading and revealed answers', () => {
    get('fallOpen')(entry.itemId);
    const reading = get('renderMenu')();
    assert.ok(reading.includes('data-teaching-image="' + id + '"'));
    assert.ok(reading.includes('loading="lazy"'));
    assert.ok(reading.includes(artEsc(entry.caption)));
    for (const cue of entry.cues) assert.ok(reading.includes(artEsc(cue.text)));
    const card = get('fallCards')('item:' + entry.itemId)[0];
    const front = get('fallRecallHTML')(card, false, '', '', '', '');
    assert.ok(!front.includes('data-teaching') && !front.includes('<img'));
    assert.ok(!front.includes(entry.src) && !front.includes(entry.thumbnailSrc));
    for (const cue of entry.cues) assert.ok(!front.includes(artEsc(cue.text)));
    const answer = get('fallRecallHTML')(card, true, '', '', '', '');
    assert.ok(answer.includes('data-teaching-reference="' + id + '"'));
    assert.ok(!answer.includes('<img') && !/<details[^>]*\sopen(?:[\s=>])/.test(answer), 'answer disclosure stays closed and does not request an image');
    assert.equal(get('cardKey')(card), 'Fall 2026 · ' + card.fallKey);
  });
}
check('reading artwork leaves the saved user record unchanged', () => assert.equal(JSON.stringify(get('progress')), recordBefore));
check('catalogue arrives before the shared artwork module in page and worker', () => {
  assert.ok(html.indexOf('js/data-fall-menu-art.js') < html.indexOf('js/teaching-images.js'));
  assert.ok(sw.indexOf("'./js/data-fall-menu-art.js'") < sw.indexOf("'./js/teaching-images.js'"));
  assert.ok(sw.includes("'./js/data-fall-menu-art.js',"));
});
check('unregistered seasonal paths stay outside every cache', () => {
  assert.ok(api.owns(new Request('http://localhost/ledger/img/fall-2026/unknown-v1.webp')));
  assert.ok(!api.handles(new Request('http://localhost/ledger/img/fall-2026/unknown-v1.webp')));
  assert.ok(!api.owns(new Request('http://localhost/codex/img/fall-2026/unknown-v1.webp')));
  assert.ok(Object.values(api.entries).reduce((n, row) => n + 1 + (row.thumb ? 1 : 0), 0) <= api.maxEntries);
});
check('art controls own keyboard events without grading the underlying card', () => {
  const selectors = [];
  assert.ok(get('fallOwnsKey')({target:{closest(selector){selectors.push(selector); return selector.includes('.fall-art-answer');}}}));
  assert.ok(selectors[0].includes('.fall-art-answer'));
});
console.log(JSON.stringify({status:'passed',checks,items:art.items.length,optionalImages:art.items.length * 2}, null, 2));
