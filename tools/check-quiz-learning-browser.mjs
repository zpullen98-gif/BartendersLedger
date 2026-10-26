/* Answer -> full explanation -> reading -> same answer. Isolated profile only.
   LEDGER_URL can also exercise the published wing. */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.LEDGER_PLAYWRIGHT || '@playwright/test');
const base = (process.env.LEDGER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const shared = process.env.OOT_SHARED || 'C:/Users/zpull/WorldTable/static/shared';
const output = process.env.LEDGER_QA_OUTPUT;
const engine = await readFile(path.join(shared, 'oot-house.js'), 'utf8');
const pack = await readFile(path.join(shared, 'packs/brennans-new-orleans.v1.oothouse.json'), 'utf8');
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await context.addInitScript({content:engine});
const page=await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(15000);
let checks=0;
function ok(value,label){if(!value) throw Error(label);checks++;}
async function go(hash){
 await page.goto(base+'/?nosw&quizlearning'+hash);
 await page.waitForFunction(()=>typeof quizLearnQuestionHTML === 'function' && typeof render === 'function');
 await page.evaluate(async text=>{if(!OOT.house.current()) await OOT.house.importPack(text,{mode:'new'});await houseSyncIn();applyRoute();render();},pack);
}
async function snap(){return page.evaluate(()=>JSON.stringify({idx:state.quiz.idx,picked:state.quiz.picked,score:state.quiz.score,round:state.quiz.round,progress}));}
try{
 await go('#/menu/view/rehearsal');
 const audit=await page.evaluate(()=>{
  const issues=[], families={}, records=[];
  function add(kind,q){if(!q)return;families[kind]=(families[kind]||0)+1;records.push(q);const out=quizLearnQuestionHTML(q);if(!out.includes('Learn why')||!out.includes('quiz-learn-body'))issues.push(kind+': '+q.prompt);}
  (progress.bar||[]).filter(isHouseCard).forEach(b=>{
   if(hasSpec(b)){add('name',qMyBarTicket(b));add('specification',qMyBarSpecLine(b));if(barText(b.glass))add('glassware',qMyBarGlass(b));}
   add('tableside line',qMyBarLine(b));add('offer next',qMyBarUpsell(b));add('parts',qMyBarParts(b));
  });
  const h=hsCurrent(), lib=houseDrillLib();
  const fixed=()=>0.42;
  ['firstPickFor','zeroProofFor'].forEach(kind=>lib.dealRound(h,kind,fixed).forEach(q=>{const adapted=houseQuestionOf(q,lib);if(adapted.houseItemId!==q.itemId)issues.push('lost pairing id');add(kind,adapted);}));
  const producerHouse=hsDrinkProducerHouse(h),producerRows=hsDrinkProducers(h);
  HS_PRODUCER_KINDS.forEach(kind=>lib.dealRound(producerHouse,kind,fixed).forEach(q=>add(kind,hsProducerQuestion(q,producerRows))));
  brewEntries().forEach(e=>(e.quiz||[]).forEach(q=>add('coffee and tea',{answer:q.options[q.a],explain:q.explain,prompt:q.q,ckey:'Brew Guide · '+e.id+'/make',brewId:e.id})));
  const badOptions=records.filter(q=>!q.options ? false : q.options.filter(x=>x===q.answer).length!==1 || new Set(q.options).size!==q.options.length);
  const cards=[].concat(menuWordCards(),componentCards(),producerCards());
  cards.forEach(c=>{const info=quizLearnCardData(c);if(!info||!info.body||!info.title)issues.push('Empty card '+c.name);});
  const unsafe=quizLearnDisclosure('<img src=x onerror=alert(1)>',quizLearnSection('Example','<script>bad()</script>'),'');
  if(unsafe.includes('<img')||unsafe.includes('<script>'))issues.push('Unescaped reading');
  const unchecked={value:'UNKEPT_SENTINEL',by:'maitre',ts:1};
  if(quizLearnItemBody({name:'Test',why:unchecked,origin:unchecked,guest:unchecked}).includes('UNKEPT_SENTINEL'))issues.push('Unkept mark leaked');
  const mark=value=>({value,by:'person',ts:1});
  const dishBody=quizLearnItemBody({kind:'dish',description:'DISH_DESCRIPTION',ingredients:['DISH_INGREDIENT'],parts:mark({main:'DISH_MAIN',sides:'DISH_SIDE'})});
  if(!dishBody.includes('DISH_DESCRIPTION')||!dishBody.includes('DISH_INGREDIENT')||dishBody.includes('glass and garnish')||!dishBody.includes('accompaniments'))issues.push('Dish context or labels');
  const wineBody=quizLearnItemBody({kind:'wine',producer:'WINE_PRODUCER',grapes:['WINE_GRAPE'],parts:mark({main:'WINE_MAIN'}),profile:mark('WINE_PROFILE'),serve:mark('WINE_SERVICE'),goesWith:mark('WINE_PAIRING')});
  ['WINE_PRODUCER','WINE_GRAPE','WINE_PROFILE','WINE_SERVICE','WINE_PAIRING','grape and region'].forEach(text=>{if(!wineBody.includes(text))issues.push('Wine context missing '+text);});
  if(quizLearnItemBody({kind:'wine',profile:unchecked,serve:unchecked,goesWith:unchecked,parts:unchecked}).includes('UNKEPT_SENTINEL'))issues.push('Unkept wine mark leaked');
  const houseService=allDrinks().filter(c=>c.src==='My Bar').map(c=>({name:c.name,fields:['glass','garnish','method'].filter(f=>c[f]&&c[f]!=='\u2014')})).filter(c=>c.fields.length);
  return {families,questionsReviewed:records.length,invalidOptions:badOptions.map(q=>q.prompt),words:menuWordCards().length,components:componentCards().length,producers:producerCards().length,fall:fallCards().length,compass:barCompassCards().length,brew:brewCards().length,say:houseSayItems().length,guest:houseRoleDeck().length,houseService,issues};
 });
 ok(!audit.issues.length,JSON.stringify(audit.issues));ok(!audit.invalidOptions.length,JSON.stringify(audit.invalidOptions));
 for(const mode of ['mybar','housepair','brew','quick']){
  await go('#/quiz');
  await page.evaluate(mode=>{if(!startRound(mode))throw Error('No round '+mode);render();},mode);
  for(const wrong of [true,false]){
   await expect(page.locator('.quiz-learn')).toHaveCount(0);checks++;
   const index=await page.evaluate(wrong=>state.quiz.round[state.quiz.idx].options.findIndex(x=>wrong?x!==state.quiz.round[state.quiz.idx].answer:x===state.quiz.round[state.quiz.idx].answer),wrong);
   await page.locator('[data-act="quiz-pick"][data-i="'+index+'"]').click();
   await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
   const before=await snap();
   const summary=page.locator('.quiz-learn>summary');await summary.focus();await page.keyboard.press('Enter');
   await expect(page.locator('.quiz-learn')).toHaveAttribute('open','');checks++;
   ok(await snap()===before,mode+' disclosure changed the answer or progress');
   ok((await page.locator('.quiz-learn-body').innerText()).length>150,mode+' has no expanded learning');
   for(const service of ['day','night']){
    await page.setViewportSize({width:320,height:844});await page.evaluate(service=>document.documentElement.setAttribute('data-service',service),service);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),mode+' '+service+' overflow');
    ok(await summary.evaluate(el=>el.getBoundingClientRect().height>=44),'Learn why touch target');
   }
   const reading=page.locator('.quiz-learn-links a').first();
   if(await reading.count()){
    await reading.click();await page.locator('#view [data-act="back"]').click();
    await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
    ok(await snap()===before,mode+' reading/Back lost position, answer, score or progress');
   }
   await page.locator('[data-act="quiz-next"]').click();
  }
 }
 for(const mode of ['say','role']){
  await go('#/quiz');await page.evaluate(mode=>{houseDrillOpen(mode);render();},mode);
  await expect(page.locator('.quiz-learn')).toHaveCount(0);checks++;
  await page.locator(mode==='say'?'#hs-said':'#hr-said').fill('I would check the current house notes and ask what the guest enjoys.');
  await page.locator('[data-act="hd-'+mode+'-check"]').click();
  await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
  const before=await page.evaluate(()=>JSON.stringify({house:state.house,progress}));
  await page.locator('.quiz-learn>summary').click();
  const reading=page.locator('.quiz-learn-links a').first();
  if(await reading.count()){await reading.click();await page.locator('#view [data-act="back"]').click();}
  ok(await page.evaluate(()=>JSON.stringify({house:state.house,progress}))===before,mode+' changed rehearsal or record');
 }
 for(const deck of ['menu','menu-words','components','producers','fall:cocktail','compass:all','brew']){
  await go('#/practise');await page.evaluate(deck=>{if(!applyDeck(deck)||!startDeckRun())throw Error('No deck '+deck);render();},deck);
  await expect(page.locator('.quiz-learn,.fall-read-link,.bc-read-link,.brew-read-link')).toHaveCount(0);checks++;
  await page.locator('[data-act="fc-flip"]').click();
  const learn=page.locator('.quiz-learn>summary,.fall-read-link,.bc-read-link,.brew-read-link').first();
  await expect(learn).toContainText('Learn why');checks++;
  const before=await page.evaluate(()=>JSON.stringify({idx:state.fc.idx,flipped:state.fc.flipped,mode:state.fc.mode,deck:state.fc.deck,progress}));
  await learn.focus();await page.keyboard.press('Enter');
  if(await page.locator('.quiz-learn[open]').count()){
   const link=page.locator('.quiz-learn-links a').first();if(await link.count()){await link.click();await page.locator('#view [data-act="back"]').click();}
  }else await page.locator('#view [data-act="back"]').click();
  ok(await page.evaluate(()=>JSON.stringify({idx:state.fc.idx,flipped:state.fc.flipped,mode:state.fc.mode,deck:state.fc.deck,progress}))===before,deck+' changed answer/card record');
 }
 /* Every available house recall mode, including checked builds and blanks.
    Missing service fields must not be invented to manufacture a question. */
 const recallModes=['line10','line20','line45','study','parts','upsell','name2spec','spec2name','build','cloze'];
 for(const mode of recallModes){
  await go('#/practise');await page.evaluate(mode=>{applyDeck('menu');if(!startDeckRun(mode))throw Error('No mode '+mode);render();},mode);
  await expect(page.locator('.quiz-learn')).toHaveCount(0);checks++;
  if(mode==='build'){await page.locator('[data-act="fc-toggle-line"]').first().click();await page.locator('[data-act="fc-check"]').click();}
  else if(mode==='cloze')await page.locator('[data-act="fc-cloze-pick"]').first().click();
  else await page.locator('[data-act="fc-flip"]').click();
  await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
  const before=await page.evaluate(()=>JSON.stringify({fc:state.fc,progress}));
  await page.locator('.quiz-learn>summary').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');
  ok(await page.evaluate(()=>JSON.stringify({fc:state.fc,progress}))===before,mode+' disclosure/key changed grade or position');
  const link=page.locator('.quiz-learn-links a').first();await link.click();await page.locator('#view [data-act="back"]').click();
  ok(await page.evaluate(()=>JSON.stringify({fc:state.fc,progress}))===before,mode+' reading/Back changed grade or position');
 }
 await go('#/practise');
 await page.evaluate(()=>{applyDeck('menu');if(!startDeckRun('service'))throw Error('No recorded service');render();});
 ok(await page.evaluate(()=>state.fc.svc.fields.every(f=>state.fc.deck[state.fc.idx][f]&&state.fc.deck[state.fc.idx][f]!=='\u2014')&&!state.fc.svc.fields.includes('glass')),'Unrecorded glassware must not be asked');
 await expect(page.locator('.quiz-learn')).toHaveCount(0);checks++;
 for(const field of await page.evaluate(()=>state.fc.svc.fields))await page.locator('[data-act="fc-svc-pick"][data-f="'+field+'"]').first().click();
 await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
 const serviceBefore=await page.evaluate(()=>JSON.stringify({fc:state.fc,progress}));
 await page.locator('.quiz-learn>summary').click();await page.locator('.quiz-learn-links a').first().click();await page.locator('#view [data-act="back"]').click();
 ok(await page.evaluate(()=>JSON.stringify({fc:state.fc,progress}))===serviceBefore,'House service reading/Back changed answer or progress');
 /* The library service mode shares this renderer; confirm the after-answer
    disclosure there without claiming these are Brennan\'s service specs. */
 await page.evaluate(()=>{applyDeck('menu');state.fc.only=allDrinks().filter(c=>c.src==='Cocktails').slice(0,1);if(!startDeckRun('service'))throw Error('No library service');render();});
 await expect(page.locator('.quiz-learn')).toHaveCount(0);checks++;
 for(const field of await page.evaluate(()=>state.fc.svc.fields))await page.locator('[data-act="fc-svc-pick"][data-f="'+field+'"]').first().click();
 await expect(page.locator('.quiz-learn')).toHaveCount(1);checks++;
 await page.locator('.quiz-learn>summary').click();await expect(page.locator('.quiz-learn-body')).toContainText('library standard');checks++;
 ok(!errors.length,errors.join('\n'));
 if(output){
  await mkdir(output,{recursive:true});
  await go('#/quiz');await page.evaluate(()=>{startRound('mybar');render();});
  await page.locator('[data-act="quiz-pick"]').first().click();
  await page.locator('.quiz-learn>summary').click();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  for(const service of ['day','night']){
   await page.evaluate(service=>{document.documentElement.setAttribute('data-service',service);document.querySelector('.quiz-learn').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-70);},service);
   await page.screenshot({path:path.join(output,'ledger-quiz-mobile-'+service+'.png')});
  }
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.querySelector('.quiz-learn').scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:path.join(output,'ledger-quiz-desktop.png')});
  await writeFile(path.join(output,'ledger-quiz-audit.json'),JSON.stringify({checks,audit,errors},null,2));
 }
 console.log(JSON.stringify({checks,audit,errors},null,2));
}finally{await browser.close();}
