/* Run against a local preview in an isolated browser profile.
   LEDGER_PLAYWRIGHT may name the installed @playwright/test package.
   LEDGER_PREVIEW_URL defaults to http://127.0.0.1:8765. */
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium,expect}=require(process.env.LEDGER_PLAYWRIGHT||'@playwright/test');
const base=(process.env.LEDGER_PREVIEW_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const out=process.env.LEDGER_QA_OUTPUT;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1120,height:850},serviceWorkers:'block'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const methodIds=['stir-rinse','shake-texture','coffee-cream','build-bubbles'];
const familyIds=['spirit-forward','sour-structure','long-sparkling','zero-proof'];
const studyIds=[...methodIds,...familyIds];
let checks=0;
function ok(value,label){if(!value)throw new Error(label);checks++;}
async function go(hash){await page.goto(base+'/?nosw&methods='+Date.now()+hash);await page.locator('#view').waitFor();await page.waitForFunction(()=>typeof state!=='undefined'&&typeof methodStudy==='function');}
async function fingerprint(){return page.evaluate(()=>JSON.stringify({key:cardKey(state.fc.deck[state.fc.idx]),idx:state.fc.idx,mode:state.fc.mode,flipped:state.fc.flipped,checked:state.fc.checked,right:state.fc.right,wrong:state.fc.wrong,records:progress.cards,route:location.hash}));}
try{
  await go('#/library');
  await page.locator('.method-door').click();
  await expect(page).toHaveURL(/#\/notes\/studies$/);checks++;
  for(const collection of ['methods','families']){
    await expect(page.locator('[data-study-collection="'+collection+'"] .method-card')).toHaveCount(4);checks++;
  }
  await page.locator('.method-card').first().click();
  await expect(page).toHaveURL(/#\/notes\/studies\/stir-rinse$/);checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page).toHaveURL(/#\/notes\/studies$/);checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page).toHaveURL(/#\/library/);checks++;
  for(const id of studyIds){
    await go('#/notes/studies/'+id);
    await expect(page.locator('.method-study .method-steps>li')).toHaveCount(3);checks++;
    ok(await page.locator('.method-figure img').evaluate(img=>img.complete&&img.naturalWidth>0),id+' artwork loads');
    await page.reload();await expect(page).toHaveURL(new RegExp('#/notes/studies/'+id+'$'));checks++;
  }
  for(const ids of [methodIds,familyIds]){
    await go('#/notes/studies/'+ids[0]);
    for(const id of ids.slice(1)){
      await page.locator('.method-next a[href="#/notes/studies/'+id+'"]').click();
      await expect(page).toHaveURL(new RegExp('#/notes/studies/'+id+'$'));checks++;
    }
    await page.locator('.method-next a[href="#/notes/studies"]').click();
    await expect(page).toHaveURL(/#\/notes\/studies$/);checks++;
  }
  for(const [family,id] of [['Old Fashioned','spirit-forward'],['Spirit & Vermouth','spirit-forward'],['Sour','sour-structure'],['Highball','long-sparkling']]){
    await go('#/families');
    const opener=page.locator('[data-act="fam-open"][data-fam="'+family+'"]');
    if(await opener.getAttribute('aria-expanded')!=='true')await opener.click();
    const inline=page.locator('.method-inline').filter({has:page.locator('a[href="#/notes/studies/'+id+'"]')});
    await inline.locator(':scope>summary').click();
    await inline.locator('a[href="#/notes/studies/'+id+'"]').click();
    await expect(page).toHaveURL(new RegExp('#/notes/studies/'+id+'$'));checks++;
    await page.locator('[data-act="back"]').click();
    await expect(page).toHaveURL(/#\/families/);checks++;
    await expect(page.locator('[data-act="fam-open"][data-fam="'+family+'"]')).toHaveAttribute('aria-expanded','true');checks++;
  }
  await go('#/na');
  await expect(page.locator('.method-inline')).toHaveCount(0);checks++;
  const zeroRoutes=await page.evaluate(()=>methodStudy('zero-proof').zeroProofNames.map(name=>({name,hash:'#/na/'+slugify(name)})));
  for(const item of zeroRoutes){
    await go(item.hash);
    const inline=page.locator('.method-inline').filter({has:page.locator('a[href="#/notes/studies/zero-proof"]')});
    await expect(inline).toHaveCount(1);checks++;
    await inline.locator(':scope>summary').click();
    await inline.locator('a[href="#/notes/studies/zero-proof"]').click();
    await expect(page).toHaveURL(/#\/notes\/studies\/zero-proof$/);checks++;
    await page.locator('[data-act="back"]').click();
    ok((await page.url()).endsWith(item.hash),item.name+' returns to exact reference entry');
  }
  await go('#/flashcards/cocktails:2');
  await page.locator('.fc-narrow>summary').click();
  await page.locator('#fc-family').selectOption('Old Fashioned');
  await page.locator('[data-act="fc-start"][data-mode="name2spec"]').click();
  await expect(page.locator('.study-face')).toContainText('Sazerac');checks++;
  await expect(page.locator('.method-feedback')).toHaveCount(0);checks++;
  await page.locator('[data-act="fc-flip"]').click();
  await expect(page.locator('.method-feedback .method-inline')).toHaveCount(2);checks++;
  const before=await fingerprint();
  const summary=page.locator('.method-inline>summary').first();
  await summary.focus();await page.keyboard.press('Space');
  await expect(page.locator('.method-inline').first()).toHaveAttribute('open','');checks++;
  for(const key of ['ArrowRight','ArrowLeft','1','2','/']){await page.keyboard.press(key);ok(await fingerprint()===before,'inline '+key+' preserves grade/card/route');}
  const answer=page.locator('.method-inline .method-recall summary').first();
  await answer.focus();await page.keyboard.press('Space');
  await expect(answer.locator('..')).toHaveAttribute('open','');checks++;
  ok(await fingerprint()===before,'retrieval disclosure preserves record');
  await page.locator('.method-inline a').filter({hasText:'Open this study on its own'}).first().click();
  await expect(page).toHaveURL(/#\/notes\/studies\/stir-rinse$/);checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page).toHaveURL(/#\/flashcards\/cocktails:2\/card$/);checks++;
  ok(await fingerprint()===before,'study and Back preserve exact revealed card');
  for(const mode of ['build','cloze','service']){
    await go('#/flashcards/cocktails:2');
    await page.locator('.fc-narrow>summary').click();
    await page.locator('#fc-family').selectOption('Old Fashioned');
    await page.locator('[data-act="fc-start"][data-mode="'+mode+'"]').click();
    await expect(page.locator('.method-feedback')).toHaveCount(0);checks++;
    if(mode==='build'){
      await page.locator('[data-act="fc-toggle-line"]').first().click();
      await page.locator('[data-act="fc-check"]').click();
    }else if(mode==='cloze')await page.locator('[data-act="fc-cloze-pick"]').first().click();
    else for(const field of ['glass','garnish','method'])await page.locator('[data-act="fc-svc-pick"][data-f="'+field+'"]').first().click();
    await expect(page.locator('.method-feedback .method-inline')).toHaveCount(2);checks++;
    const held=await fingerprint();
    await page.locator('.method-inline>summary').first().focus();await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
    ok(await fingerprint()===held,mode+' completed feedback remains unchanged');
  }
  for(const id of familyIds){
    // Deal one real record through the app's existing misses-deck entry point.
    // This browser profile is disposable; no user record is written or graded.
    await go('#/flashcards');
    const fixture=await page.evaluate(studyId=>{
      const s=methodStudy(studyId),src=studyId==='zero-proof'?'Zero Proof':'Cocktails';
      const name=(studyId==='zero-proof'?s.zeroProofNames:s.canonNames)[0];
      const card=allDrinks().find(c=>c.src===src&&c.name===name);
      return {key:cardKey(card),title:s.title,image:s.image};
    },id);
    ok(!!fixture.key,id+' has a real card');
    await page.evaluate(key=>{if(!startMisses([key]))throw Error('Cannot deal fixture');render();},fixture.key);
    await expect(page.locator('.method-feedback')).toHaveCount(0);checks++;
    await expect(page.locator('img[src="'+fixture.image+'"]')).toHaveCount(0);checks++;
    await page.locator('[data-act="fc-flip"]').click();
    const inline=page.locator('.method-inline').filter({has:page.locator('a[href="#/notes/studies/'+id+'"]')});
    await expect(inline).toHaveCount(1);checks++;
    const held=await fingerprint();
    await inline.locator(':scope>summary').focus();await page.keyboard.press('Space');
    await expect(inline).toHaveAttribute('open','');checks++;
    for(const key of ['ArrowRight','ArrowLeft','1','2','/'])await page.keyboard.press(key);
    ok(await fingerprint()===held,id+' reveal keeps same card, grade and route');
    await inline.locator('a[href="#/notes/studies/'+id+'"]').click();
    await expect(page).toHaveURL(new RegExp('#/notes/studies/'+id+'$'));checks++;
    await page.locator('[data-act="back"]').click();
    const returned=await fingerprint();
    ok(returned===held,id+' study and Back keep revealed card\nBefore '+held+'\nAfter '+returned);
  }
  if(out)await mkdir(out,{recursive:true});
  for(const width of [320,390])for(const service of ['day','night']){
    await page.setViewportSize({width,height:844});
    await go('#/notes/studies');
    await page.evaluate(mode=>OOT.service.set(mode),service);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'both collections '+width+' '+service+' no overflow');
    for(const id of studyIds){
      await go('#/notes/studies/'+id);
      await page.evaluate(mode=>OOT.service.set(mode),service);
      await expect(page.locator('html')).toHaveAttribute('data-service',service);checks++;
      ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+width+' '+service+' no horizontal overflow');
      await page.locator('.method-recall summary').click();
      await page.locator('.method-house summary').click();
      ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' expanded '+width+' '+service+' no overflow');
      if(out&&width===390&&id==='stir-rinse')await page.screenshot({path:join(out,'method-study-phone-'+service+'.png'),fullPage:false});
      if(out&&width===390&&id==='spirit-forward'){
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:join(out,'family-study-phone-'+service+'.png'),fullPage:true});
      }
    }
  }
  ok(!errors.length,'No page errors: '+errors.join('; '));
  const result={checks,status:'passed',browserErrors:errors,preview:base};
  if(out)await writeFile(join(out,'method-browser-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
