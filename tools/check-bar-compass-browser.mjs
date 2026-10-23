/* Real-browser integration in disposable profiles. LEDGER_URL targets source
   or public preview, LEDGER_PLAYWRIGHT supplies @playwright/test if needed. */
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium,expect}=require(process.env.LEDGER_PLAYWRIGHT || '@playwright/test');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=(process.env.LEDGER_URL || 'http://127.0.0.1:8782').replace(/\/$/,'');
const shared=process.env.OOT_SHARED || path.resolve(root,'../WorldTable/static/shared');
const out=process.env.LEDGER_QA_OUTPUT;
const browser=await chromium.launch({headless:true});
const errors=[]; let checks=0;
function ok(value,label){ if(!value) throw Error(label); checks++; }
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'America/New_York'});
const page=await context.newPage(); page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));
let visit=0;
async function go(hash){ await page.goto(base+'/?nosw&bcqa='+(++visit)+hash); await page.waitForFunction(()=>typeof barCompassDrinks==='function' && barCompassDrinks().length===32 && !!document.querySelector('#view h2')); }
async function fits(label){ ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' fits viewport'); }
async function screen(name,fullPage=false){
  if(!out) return;
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect && a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
  await page.screenshot({path:path.join(out,name+'.png'),fullPage});
}
try {
  if(out) await mkdir(out,{recursive:true});
  await go('#/level/barback');
  await expect(page.locator('[data-act="bc-practise"][data-deck="compass:today"]')).toHaveCount(1); checks++;
  await page.locator('.bc-door').click(); await expect(page).toHaveURL(/#\/menu\/compass$/); checks++;
  await expect(page.locator('#bar-compass-results .bc-card')).toHaveCount(32); checks++;
  const dataset=await page.evaluate(()=>barCompassData());
  await expect(page.locator('#view [data-act="back"]')).toHaveCount(1); checks++;
  await page.locator('#bar-compass-q').fill('Manhattan');
  ok((await page.locator('#bar-compass-results').innerText()).includes('Rumors'),'Familiar classic search finds a reviewed comparison');
  await page.locator('#bar-compass-q').fill('');
  for(const f of dataset.families){
    await page.locator('#bar-compass-family').selectOption(f.id);
    await expect(page.locator('#bar-compass-results .bc-card')).toHaveCount(dataset.drinks.filter(d=>d.familyId===f.id).length); checks++;
    await expect(page.locator('#bar-compass-family-note')).toContainText(f.structure); checks++;
  }
  await page.locator('#bar-compass-family').selectOption('all');
  const first=dataset.drinks[0];
  await page.locator('#bar-compass-q').fill(first.name);
  const savedQuery=first.name;
  await page.locator('#bar-compass-results .bc-card').first().click();
  await expect(page.locator('.bc-study h2')).toHaveText(first.name); checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page.locator('#bar-compass-q')).toHaveValue(savedQuery); checks++;
  await page.locator('#bar-compass-results .bc-card').first().click();
  const beforeReading=await page.evaluate(()=>JSON.stringify(progress));
  const recall=page.locator('.bc-recall summary').first(); await recall.click();
  await expect(recall.locator('..')).toHaveAttribute('open',''); checks++;
  await recall.focus();
  const beforeKeys=await page.evaluate(()=>JSON.stringify({hash:location.hash,cards:progress.cards}));
  for(const key of ['ArrowLeft','ArrowRight','1','2','/']) await page.keyboard.press(key);
  ok(await page.evaluate(()=>JSON.stringify({hash:location.hash,cards:progress.cards}))===beforeKeys,'Native reading disclosure owns global keys');
  ok(await page.evaluate(()=>JSON.stringify(progress))===beforeReading,'Reading and disclosures leave all saved progress intact');
  await page.locator('[data-act="bc-practise"]').click();
  await expect(page.locator('.bc-question')).toHaveCount(1); checks++;
  await expect(page.locator('[data-act="fc-grade"]')).toHaveCount(0); checks++;
  const current=await page.evaluate(()=>({key:cardKey(state.fc.deck[0]),answer:state.fc.deck[0].back,item:state.fc.deck[0].itemId,bar:JSON.stringify(progress.bar)}));
  ok(!(await page.locator('#view').innerText()).includes(current.answer),'Blind front hides answer');
  ok(await page.locator('.study-face img').count()===0,'Blind front requests no teaching image');
  await page.evaluate(()=>document.querySelector('#view').insertAdjacentHTML('beforeend','<button id="forged-grade" data-act="fc-grade" data-ok="1">Invalid premature grade</button>'));
  await page.locator('#forged-grade').click();
  ok(await page.evaluate(key=>!progress.cards[key],current.key),'Grade handler rejects blind Compass grading');
  await page.evaluate(()=>document.getElementById('forged-grade').remove());
  await page.locator('[data-act="fc-flip"]').click();
  await expect(page.locator('.bc-answer')).toHaveText(current.answer); checks++;
  await page.locator('.bc-read-link').focus();
  const beforeLinkKeys=await page.evaluate(()=>JSON.stringify({hash:location.hash,idx:state.fc.idx,flipped:state.fc.flipped,cards:progress.cards}));
  for(const key of ['ArrowRight','ArrowLeft','1','2','/']) await page.keyboard.press(key);
  ok(await page.evaluate(()=>JSON.stringify({hash:location.hash,idx:state.fc.idx,flipped:state.fc.flipped,cards:progress.cards}))===beforeLinkKeys,'Answer reference owns keyboard without grading');
  await page.locator('.bc-read-link').click();
  await expect(page.locator('.bc-study h2')).toHaveText(first.name); checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page.locator('.bc-answer')).toHaveText(current.answer); checks++;
  ok(await page.evaluate(key=>cardKey(state.fc.deck[state.fc.idx])===key,current.key),'Reading and Back preserve the actual revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate(key=>progress.cards[key].w===1,current.key),'Again stores the stable Compass key');
  ok(await page.evaluate(()=>JSON.stringify(progress.bar))===current.bar,'Recall does not alter House recipes');
  for(let i=0;i<3;i++){ await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="1"]').click(); }
  await expect(page.locator('h2')).toHaveText('Deck done'); checks++;
  ok(!(await page.locator('#view').innerText()).includes(current.key),'Summary shows readable prompt instead of a raw stable key');
  await page.locator('[data-act="fc-rerun-miss"]').click();
  ok(await page.evaluate(key=>state.fc.mode==='compass' && state.fc.deck.length===1 && cardKey(state.fc.deck[0])===key,current.key),'Misses replay the same factual recall mode and key');
  await go('#/menu/compass');
  ok(await page.evaluate(key=>progress.cards[key].w===1,current.key),'Recall survives reload');
  await page.evaluate(()=>{ progress.cards={}; saveProgress(); });
  await page.locator('[data-act="bc-practise"][data-deck="compass:today"]').click();
  const firstTen=await page.evaluate(()=>state.fc.deck.map(c=>({key:cardKey(c),item:c.itemId})));
  ok(firstTen.length===10 && new Set(firstTen.map(c=>c.item)).size===10,'Today offers ten different drinks without House setup');
  for(let i=0;i<10;i++){ await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="0"]').click(); }
  await page.locator('[data-act="bc-practise"][data-deck="compass:today"]').click();
  const nextTen=await page.evaluate(()=>state.fc.deck.map(c=>({key:cardKey(c),item:c.itemId})));
  ok(nextTen.every(c=>!firstTen.some(x=>x.key===c.key)),'Next daily run moves beyond today’s missed prompts');
  ok(nextTen.every(c=>!firstTen.some(x=>x.item===c.item)),'Next daily run reaches other drinks');
  await page.evaluate(()=>{progress.cards={};saveProgress()});
  await go('#/flashcards/compass:again');
  await expect(page.locator('.deck-count')).toContainText('No cards in this deck yet'); checks++;
  ok(await page.locator('[data-act="fc-start"]').count()===0,'Empty practice never starts an empty run');
  const readProgress=await page.evaluate(()=>JSON.stringify(progress));
  for(const d of dataset.drinks){
    await go('#/menu/compass/'+d.id);
    await expect(page.locator('.bc-study h2')).toHaveText(d.name); checks++;
    await expect(page.locator('.bc-roles dt')).toHaveCount(d.structure.length); checks++;
    await expect(page.locator('.bc-comparisons .bc-panel')).toHaveCount(d.comparisons.length); checks++;
    ok((await page.locator('.bc-study').innerText()).includes(d.tableside),d.name+' includes reviewed tableside line');
    await fits(d.name+' at390');
  }
  for(const w of dataset.workshops){
    await go('#/menu/compass/workshop/'+w.id);
    await expect(page.locator('.bc-study h2')).toHaveText(w.title); checks++;
    await page.locator('.bc-recall summary').click();
    await expect(page.locator('.bc-recall')).toContainText(w.answer); checks++;
    await fits(w.title);
  }
  ok(await page.evaluate(()=>JSON.stringify(progress))===readProgress,'All32 profiles and workshops preserve the user record');
  await go('#/menu/compass/'+first.id);
  await page.locator('[data-act="back"]').click(); await expect(page).toHaveURL(/#\/menu\/compass$/); checks++;
  await page.locator('[data-act="back"]').click(); await expect(page).toHaveURL(/#\/menu\/view\/studies$/); checks++;
  await page.locator('[data-act="back"]').click(); await expect(page).toHaveURL(/#\/menu$/); checks++;
  for(const width of [320,390,1120]) for(const service of ['day','night']){
    await page.setViewportSize({width,height:844}); await go('#/menu/compass');
    await page.evaluate(mode=>OOT.service.set(mode),service);
    await expect(page.locator('html')).toHaveAttribute('data-service',service); checks++;
    await fits(width+' '+service+' directory');
    if(width!==1120) await screen('bar-compass-'+width+'-'+service+'-directory');
    const d=dataset.drinks.find(x=>x.fallItemId) || first;
    await go('#/menu/compass/'+d.id);
    await page.locator('.bc-recall summary').first().click();
    await fits(width+' '+service+' profile');
    if(width!==1120) await screen('bar-compass-'+width+'-'+service+'-profile',true);
    const sizes=await page.locator('.bc-study .btn,.bc-study summary').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width,text:el.textContent}))); 
    ok(sizes.every(s=>s.h>=43 && s.w>=43),width+' '+service+' new controls have44px targets: '+JSON.stringify(sizes.filter(s=>s.h<43||s.w<43)));
    await page.locator('[data-act="bc-practise"]').click(); await page.locator('[data-act="fc-flip"]').click();
    await fits(width+' '+service+' answer');
    if(width===390) await screen('bar-compass-'+service+'-answer');
  }
  // Load the actual shared engine only in this isolated profile, then attach
  // the canonical restaurant pack and verify contextual links in both directions.
  await go('#/menu/compass');
  if(!await page.evaluate(()=>!!(window.OOT && OOT.house))) await page.addScriptTag({content:await readFile(path.join(shared,'oot-house.js'),'utf8')});
  const pack=await readFile(path.join(shared,'packs/brennans-new-orleans.v1.oothouse.json'),'utf8');
  await page.evaluate(async payload=>{await OOT.house.importPack(payload,{mode:'new'});await houseSyncIn();render()},pack);
  const match=await page.evaluate(()=>barCompassDrinks().find(d=>barCompassHouseMatch(d)));
  ok(!!match,'Actual shared house exposes an exact matching reviewed identity');
  await page.locator('#bar-compass-results a[href="#/menu/compass/'+match.id+'"]').click();
  await page.locator('[data-act="bc-house"]').click();
  await expect(page.locator('.hs-card h2')).toHaveText(match.name); checks++;
  await expect(page.locator('.bc-context')).toContainText('reviewed menu snapshot'); checks++;
  await page.locator('.bc-context a').click(); await expect(page.locator('.bc-study h2')).toHaveText(match.name); checks++;
  ok(await page.evaluate(()=>menuWordCards().length)>0,'Actual shared engine restores restaurant word cards');
  await page.evaluate(()=>{openDeck('menu-words');startDeckRun('word');render()});
  ok(await page.evaluate(()=>state.fc.deck.length>0 && state.fc.mode==='word'),'Restored Words deck starts through existing grading');
  ok(!errors.length,'No browser errors: '+errors.join('; '));
  const result={status:'passed',checks,preview:base,profiles:dataset.drinks.length,recall:128,workshops:dataset.workshops.length,browserErrors:errors};
  if(out) await writeFile(path.join(out,'bar-compass-browser-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await context.close(); await browser.close(); }
