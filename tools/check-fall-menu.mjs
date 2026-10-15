/* The curated fall collection uses the existing flashcard record, never the
   editable House or measured drink engine. Run node tools/check-fall-menu.mjs.
   LEDGER_JS can target the published copy through load-wing. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadWing, LEDGER } from './load-wing.mjs';

const html = fs.readFileSync(path.join(LEDGER, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="js\/([^"?]+)(?:\?[^"]*)?"[^>]*>/g)].map((m) => m[1]);
const box = loadWing(files);
const run = (s) => vm.runInContext(s, box);
const get = box.get;
const data = get('FALL_MENU_2026'), items = get('fallItems')();
let checks = 0;
function test(label, fn){ try { fn(); checks++; } catch(e){ e.message = label + ': ' + e.message; throw e; } }
const stable = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sources = new Set(data.sources.map((s) => s.id));
test('the uploaded sheets form eight dishes and nine cocktails', () => {
  assert.equal(items.filter((item) => item.kind === 'dish').length, 8);
  assert.equal(items.filter((item) => item.kind === 'cocktail').length, 9);
  assert.equal(new Set(items.map((item) => item.id)).size, 17);
});
for(const item of items){
  test(item.id + ' is complete, stable and source-linked', () => {
    assert.match(item.id, stable);
    assert.ok(item.name && item.shortDescription && item.tableside);
    assert.ok(item.listedIngredients.length && item.ingredientNotes.length && item.originNotes.length && item.serviceChecks.length);
    assert.ok(item.drills.length >= 4);
    assert.equal(new Set(item.drills.map((d) => d.id)).size, item.drills.length);
    for(const d of item.drills){ assert.match(d.id, stable); assert.ok(d.prompt && d.answer && d.topic); }
    for(const row of [item, ...item.ingredientNotes, ...item.originNotes, ...item.drills]){
      for(const id of row.sourceIds || []) assert.ok(sources.has(id), 'unresolved source ' + id);
    }
  });
}
for(const s of data.sources) test('source ' + s.id + ' has a safe reader URL', () => { assert.ok(s.title); if(s.url) assert.ok(get('fallLink')(s.url)); });
const cards = get('fallCards')();
test('every drill maps to one stable fact card', () => {
  assert.equal(cards.length, items.reduce((n,item) => n + item.drills.length, 0));
  assert.equal(new Set(cards.map(get('cardKey'))).size, cards.length);
  for(const card of cards){ assert.equal(card.spec.length, 0); assert.equal(get('cardByKey')(get('cardKey')(card)).fallKey, card.fallKey); }
});
test('fall cards never become buildable drinks', () => {
  assert.ok(!get('allDrinks')().some((d) => d.src === 'Fall 2026'));
  for(const mode of get('FC_MODES').filter((m) => ['name2spec','spec2name','build','cloze','service'].includes(m[0]))){
    assert.ok(cards.every((c) => !mode[3](c)), mode[0]);
  }
});
test('reading every panel preserves the complete user record', () => {
  const before = JSON.stringify(get('progress'));
  for(const item of items){
    get('fallOpen')(item.id);
    for(const part of ['read','ingredients','origins','service']){
      get('fallState')().part = part;
      const out = get('renderMenu')();
      assert.ok(out.includes(get('esc')(item.name)));
      assert.ok(out.includes('Practise this item'));
    }
  }
  assert.equal(JSON.stringify(get('progress')), before);
});
test('routes, cold parents and invalid IDs are stable', () => {
  for(const item of items){
    const href = get('fallHref')(item.id);
    assert.ok(get('applyRoute')(href));
    assert.equal(get('routeNow')().hash, href);
    get('applyParent')();
    assert.equal(get('routeNow')().hash, '#/menu/fall');
  }
  get('applyParent')();
  assert.equal(get('routeNow')().hash, '#/menu');
  get('applyRoute')('#/menu/fall/not-a-real-item');
  assert.equal(get('routeNow')().hash, '#/menu/fall');
  get('applyRoute')('#/menu');
  assert.equal(get('routeNow')().hash, '#/menu');
});
test('every item has exactly its own deck and tableside is isolated', () => {
  for(const item of items) assert.equal(get('deckDef')('fall:item:' + item.id).preset.only.length, item.drills.length);
  assert.equal(get('deckDef')('fall').preset.only.length, cards.length);
  assert.equal(get('deckDef')('fall:tableside').preset.only.length, items.length);
  assert.ok(get('deckDef')('fall:tableside').preset.only.every((c) => /table|guest|describe|sell/i.test(c.topic)));
});
test('first daily hand spreads ten prompts across dishes and drinks', () => {
  run('progress.cards = {}');
  const today = get('fallTodayCards')();
  assert.equal(today.length, 10);
  assert.equal(new Set(today.map((c) => c.itemId)).size, 10);
  assert.ok(today.some((c) => get('fallItem')(c.itemId).kind === 'dish'));
  assert.ok(today.some((c) => get('fallItem')(c.itemId).kind === 'cocktail'));
});
test('daily hand prioritises a missed card, then unseen, then oldest learned', () => {
  const missed = cards[cards.length - 1];
  get('progress').cards[get('cardKey')(missed)] = { r:0,w:1,reps:0,last:99,due:99 };
  const today = get('fallTodayCards')();
  assert.equal(today[0].fallKey, missed.fallKey);
  assert.ok(today.slice(1).every((c) => !get('progress').cards[get('cardKey')(c)]));
  for(let i=0; i<cards.length; i++) get('progress').cards[get('cardKey')(cards[i])] = {r:1,w:0,reps:1,last:100+i,due:1e15};
  assert.deepEqual(Array.from(get('fallTodayCards')(), (c) => c.fallKey), Array.from(cards.slice(0,10), (c) => c.fallKey));
});
test('front is blind; sources and full learning appear only after Flip', () => {
  get('openDeck')('fall:cocktail');
  assert.ok(get('startDeckRun')('fall'));
  const card = get('state').fc.deck[0];
  let rendered = get('renderFlashcards')();
  assert.ok(rendered.includes('data-act="fc-flip"'));
  assert.ok(!rendered.includes(get('esc')(card.back)));
  assert.ok(!rendered.includes('data-act="fc-grade"'));
  get('state').fc.flipped = true;
  rendered = get('renderFlashcards')();
  assert.ok(rendered.includes(get('esc')(card.back)));
  assert.ok(rendered.includes('Read the full study card'));
  assert.ok(rendered.includes('data-act="fc-grade"'));
});
test('grading keeps the house and existing records intact, and misses can replay', () => {
  const before = JSON.stringify(get('progress').bar);
  const old = 'Existing unrelated card'; get('progress').cards[old] = {r:17,w:2,last:1};
  const card = get('state').fc.deck[0], key = get('cardKey')(card);
  get('recordCard')(false);
  assert.ok(get('progress').cards[key].w > 0);
  assert.equal(get('progress').cards[old].r, 17);
  assert.equal(JSON.stringify(get('progress').bar), before);
  assert.ok(get('startMisses')([key]));
  assert.equal(get('state').fc.deck.length,1);
  assert.equal(get('state').fc.mode,'fall');
  assert.equal(get('state').fc.deck[0].fallKey,card.fallKey);
});
test('safe escaping and unknown sources cannot inject links or markup', () => {
  assert.equal(get('fallLink')('javascript:alert(1)'), '');
  assert.equal(get('fallCites')(['no-source']), '');
  assert.ok(get('fallParagraph')('<img src=x onerror=alert(1)>').includes('&lt;img'));
});
test('all seasonal reading surfaces are searchable', () => {
  const search = get('fallSearchEntries')();
  assert.equal(search.length,17);
  for(const row of search) assert.ok(get('applyRoute')(row.h));
});
test('Today and My restaurant expose the requested doors', () => {
  assert.ok(get('todayStudyHTML')(1).includes('data-deck="fall:today"'));
  assert.ok(get('myRestaurantHTML')().includes('Fall 2026'));
  assert.ok(get('fcPickHTML')().includes('fall:tableside'));
});
console.log('Fall menu: ' + checks + ' checks passed; ' + items.length + ' items, ' + cards.length + ' stable practice cards, no personal menu writes.');
