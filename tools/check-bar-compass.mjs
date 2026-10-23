/* Focused integration gate. LEDGER_JS points at a public copy; OOT_SHARED
   supplies the actual house engine and pack without touching a user profile. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadWing,LEDGER} from './load-wing.mjs';
const root=process.env.LEDGER_JS ? path.dirname(process.env.LEDGER_JS) : LEDGER;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="js\/([^"?]+)(?:\?[^\\"]*)?"[^>]*>/g)].map(m=>m[1]);
const box=loadWing(files), get=box.get, run=s=>vm.runInContext(s,box);
let checks=0;
function test(name,fn){ try { fn(); checks++; } catch(e){ e.message=name+': '+e.message; throw e; } }
const drinks=get('barCompassDrinks')(), cards=get('barCompassCards')(), data=get('barCompassData')();
test('all profiles have unique stable practice identities',()=>{
  assert.equal(drinks.length,32); assert.equal(cards.length,128);
  assert.equal(new Set(cards.map(get('cardKey'))).size,cards.length);
  for(const c of cards){ assert.equal(get('cardKey')(c),'Bar Compass · '+c.itemId+'/'+c.drillId); assert.equal(get('cardByKey')(get('cardKey')(c)).bcKey,c.bcKey); }
});
test('recall cannot be dealt as a measured drink or academic level',()=>{
  assert.ok(!get('allDrinks')().some(c=>c.src==='Bar Compass'));
  for(const mode of get('FC_MODES').filter(m=>['name2spec','spec2name','build','cloze','service'].includes(m[0]))) assert.ok(cards.every(c=>!mode[3](c)),mode[0]);
  assert.ok(get('dueToday')().deck.every(c=>c.src!=='Bar Compass'));
  assert.equal(get('deckDef')('compass:all').preset.level,undefined);
});
test('every detail, family and workshop has a valid cold route and parent',()=>{
  for(const d of drinks){
    get('applyRoute')(get('barCompassHref')(d.id)); assert.equal(get('routeNow')().hash,get('barCompassHref')(d.id));
    assert.equal(get('deckDef')('compass:item:'+d.id).preset.only.length,4);
    get('applyParent')(); assert.equal(get('routeNow')().hash,'#/menu/compass');
  }
  for(const w of data.workshops){ get('applyRoute')(get('barCompassWorkshopHref')(w.id)); assert.equal(get('routeNow')().hash,get('barCompassWorkshopHref')(w.id)); get('applyParent')(); assert.equal(get('routeNow')().hash,'#/menu/compass'); }
  get('applyParent')(); assert.equal(get('routeNow')().hash,'#/menu/view/studies');
  get('applyParent')(); assert.equal(get('routeNow')().hash,'#/menu');
  for(const f of data.families) assert.equal(get('deckDef')('compass:family:'+f.id).preset.only.length,drinks.filter(d=>d.familyId===f.id).length*4);
  get('applyRoute')('#/menu/compass/unknown'); assert.equal(get('routeNow')().hash,'#/menu/compass');
  get('applyRoute')('#/menu/compass/workshop/%broken'); assert.equal(get('routeNow')().hash,'#/menu/compass');
});
test('every profile renders reviewed facts without changing the house or grades',()=>{
  const before=JSON.stringify(get('progress'));
  for(const d of drinks){
    get('barCompassOpen')(d.id); const out=get('renderBarCompass')();
    assert.ok(out.includes(get('esc')(d.name))); assert.ok(out.includes(get('esc')(d.basis)));
    assert.ok(out.includes(get('esc')(d.tableside))); assert.ok(out.includes('Reviewed teaching, not a measured house build'));
    for(const r of d.recall) assert.ok(out.includes(get('esc')(r.prompt)));
    assert.equal((out.match(/class="bc-recall"/g)||[]).length,4);
  }
  assert.equal(JSON.stringify(get('progress')),before);
});
test('first daily hand is ten different drinks and every unlearned prompt stays reachable',()=>{
  run('progress.cards={}'); const now=Date.now();
  const first=get('barCompassDaily')(now);
  assert.equal(first.length,10); assert.equal(new Set(first.map(c=>c.itemId)).size,10);
  for(const c of first) get('progress').cards[get('cardKey')(c)]={r:0,w:1,reps:0,last:now,due:now};
  const next=get('barCompassDaily')(now);
  assert.ok(next.every(c=>!first.some(x=>x.bcKey===c.bcKey)));
  assert.ok(next.every(c=>!first.some(x=>x.itemId===c.itemId)));
  const seen=new Set(first.map(c=>c.bcKey));
  for(let n=0;n<20 && seen.size<cards.length;n++) for(const c of get('barCompassDaily')(now)){ seen.add(c.bcKey); get('progress').cards[get('cardKey')(c)]={r:1,w:0,reps:1,last:now,due:now+86400000}; }
  assert.equal(seen.size,cards.length);
});
test('priority uses real review records and a local calendar day',()=>{
  run('progress.cards={}');
  const now=new Date(2026,9,15,23,58).getTime(), yesterday=now-86400000;
  const last=cards.at(-1), first=cards[0];
  get('progress').cards[get('cardKey')(last)]={r:0,w:1,reps:0,last:yesterday,due:yesterday};
  assert.equal(get('barCompassDaily')(now)[0].bcKey,last.bcKey);
  get('progress').cards[get('cardKey')(first)]={r:1,w:0,reps:1,last:now,due:now+86400000};
  assert.equal(get('barCompassRecord')(first,now).today,true);
  assert.equal(get('barCompassRecord')(first,new Date(2026,9,16,0,1).getTime()).today,false);
  get('progress').cards[get('cardKey')(first)].last=now+1; assert.equal(get('barCompassRecord')(first,now).today,false);
  get('progress').cards[get('cardKey')(first)].last=NaN; assert.equal(get('barCompassRecord')(first,now).last,0);
});
test('one recall mode, blind front, answer-only references and normal persisted grades',()=>{
  run('progress.cards={}'); const before=JSON.stringify(get('progress').bar);
  get('progress').cards['My Bar · Existing']={r:17,w:2,last:1};
  get('openDeck')('compass:item:'+drinks[0].id); assert.ok(get('startDeckRun')('compass'));
  const fc=get('state').fc,c=fc.deck[0], key=get('cardKey')(c);
  let out=get('renderFlashcards')(); assert.ok(!out.includes(get('esc')(c.back))); assert.ok(!out.includes('data-act="fc-grade"')); assert.ok(!out.includes('<img'));
  fc.flipped=true; out=get('renderFlashcards')(); assert.ok(out.includes(get('esc')(c.back))); assert.ok(out.includes('Read the full Bar Compass study'));
  get('recordCard')(false); assert.equal(get('progress').cards[key].w,1); assert.ok(get('progress').cards[key].last>0);
  assert.equal(get('progress').cards['My Bar · Existing'].r,17); assert.equal(JSON.stringify(get('progress').bar),before);
  assert.ok(get('startMisses')([key])); assert.equal(fc.mode,'compass'); assert.equal(fc.deck[0].bcKey,c.bcKey);
  fc.idx=fc.deck.length; out=get('renderFlashcards')(); assert.ok(!out.includes(key));
});
test('empty due or missed practice has a reachable setup and no empty card run',()=>{
  run('progress.cards={}'); assert.equal(get('deckDef')('compass:again').preset.only.length,0);
  assert.equal(get('barCompassAct')('bc-practise',{deck:'compass:again'}),'render');
  assert.equal(get('state').fc.stage,'setup'); assert.ok(get('renderFlashcards')().includes('No cards in this deck yet'));
});
test('search and family filters cover all drinks, and exact classic links never guess',()=>{
  assert.equal(get('barCompassSearchEntries')().length,32);
  const s=get('barCompassState')();
  for(const f of data.families){ s.family=f.id; s.q=''; assert.equal((get('barCompassResultsHTML')().match(/class="bc-card"/g)||[]).length,drinks.filter(d=>d.familyId===f.id).length); }
  s.family='all'; s.q=drinks[0].name; assert.ok(get('barCompassResultsHTML')().includes(get('esc')(drinks[0].name)));
  assert.equal(get('barCompassClassicHref')('almost a Martini'), '');
  assert.equal(get('barCompassSafeUrl')('javascript:alert(1)'), '');
  assert.equal(get('barCompassSources')(['missing']), '');
  assert.ok(get('barCompassParas')('<script>').includes('&lt;script'));
});
test('Today, My restaurant, Menu, Library and Flashcards expose the collection',()=>{
  assert.ok(get('todayStudyHTML')(1).includes('data-deck="compass:today"'));
  assert.ok(get('myRestaurantHTML')().includes('The Bar Compass'));
  assert.ok(get('fcPickHTML')().includes('compass:all'));
  get('barCompassOpen')(''); assert.ok(get('renderMenu')().includes('data-v="compass"'));
});
const shared=process.env.OOT_SHARED || path.resolve(LEDGER,'../WorldTable/static/shared');
if(!fs.existsSync(path.join(shared,'oot-house.js'))) throw Error('Set OOT_SHARED to the actual shared engine and house pack');
vm.runInContext(fs.readFileSync(path.join(shared,'oot-house.js'),'utf8'),box);
const pack=JSON.parse(fs.readFileSync(path.join(shared,'packs/brennans-new-orleans.v1.oothouse.json'),'utf8'));
await box.OOT.house.importPack(JSON.stringify(pack),{mode:'new'});
await get('houseSyncIn')();
test('real shared engine supplies Words with unchanged keys',()=>{
  const words=get('menuWordCards')(), expected=box.OOT.houseLib.buildFlashcards(get('hsCurrent')()).filter(c=>c.kind==='term');
  assert.ok(words.length>0); assert.equal(words.length,expected.length);
  for(const c of words) assert.equal(get('cardKey')(c),'Words · '+c.name);
  const h=get('hsCurrent')(), lib=box.OOT.houseLib;
  box.OOT.houseLib={drills:{buildFlashcards:lib.buildFlashcards}};
  assert.equal(get('menuWordCards')().length,words.length); box.OOT.houseLib=lib;
  assert.ok(h.cocktails.length);
});
test('reviewed/current house links require an exact identity and name',()=>{
  const d=drinks.find(x=>get('barCompassHouseMatch')(x)); assert.ok(d);
  assert.ok(get('barCompassHouseContextHTML')(d.id).includes(get('barCompassHref')(d.id)));
  const h=get('hsCurrent')(), row=h.cocktails.find(c=>c.id===d.id), name=row.name;
  row.name='An edited different drink'; assert.equal(get('barCompassHouseMatch')(d),null); row.name=name;
});
console.log('Bar Compass integration: '+checks+' checks passed; '+drinks.length+' profiles, '+cards.length+' stable recall cards, '+get('menuWordCards')().length+' real house word cards.');
