/* Real controls in an isolated profile. LEDGER_URL can target the shipped copy. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.LEDGER_PLAYWRIGHT||'C:/Users/zpull/WorldTable/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=(process.env.LEDGER_URL||'http://ledger.test/ledger/').replace(/\/?$/,'/');
const out=process.env.LEDGER_QA_OUTPUT;
const checks=[],errors=[];function ok(name,value){checks.push({name,pass:!!value});assert.ok(value,name);console.log('PASS '+name);}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 if(!process.env.LEDGER_URL)await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!=='http://ledger.test'||!u.pathname.startsWith('/ledger/'))return route.fulfill({status:404,body:''});
  const name=decodeURIComponent(u.pathname.slice(8))||'index.html',file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
  return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'?nosw&qa=casks#/home');await page.waitForFunction(()=>typeof caskChapters==='function'&&caskChapters().length===18);
 const academic=await page.evaluate(()=>JSON.stringify({levels:progress.levels,qa:progress.qa,bank:LEVEL_ITEMS}));
 await page.locator('#tabs [data-cluster="casks"]').click();
 ok('sixth primary destination is reachable directly from Home',page.url().endsWith('#/casks')&&await page.locator('#tabs [data-cluster]').count()===6);
 ok('atlas gives a substantial full curriculum and practice counts',await page.evaluate(()=>caskChapters().length===18&&caskEntries('all','cards').length>=72&&caskEntries('all','quiz').length>=54));
 await page.locator('#cask-q').fill('Cognac');
 ok('search retains focus and full typed text through successive characters',await page.locator('#cask-q').inputValue()==='Cognac'&&await page.evaluate(()=>document.activeElement.id==='cask-q'));
 await page.locator('#cask-category').selectOption('Brandy');
 ok('category and text filters combine',await page.locator('#cask-results .cask-tile').count()>0&&await page.locator('#cask-results .cask-tile .eyebrow').evaluateAll(n=>n.every(x=>x.textContent==='Brandy')));
 await page.locator('#cask-q').fill('not-a-real-cask-topic');
 await page.locator('[data-act="cask-clear"]').click();
 ok('no-result recovery restores all chapters',await page.locator('#cask-results .cask-tile').count()===18);
 const ids=await page.evaluate(()=>caskChapters().map(c=>c.id));
 for(const id of ids){
  await page.locator('#cask-results [data-act="cask-open"][data-id="'+id+'"]').click();
  ok(id+' opens a full sourced chapter',page.url().endsWith('#/casks/'+id)&&await page.locator('.cask-section').count()>=5&&await page.locator('.cask-sources a').count()>=2);
  ok(id+' fits the phone screen',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#view [data-act="back"]').click();await page.waitForURL(/#\/casks$/);
 }
 await page.locator('[data-act="cask-start"][data-s="today"]').click();
 ok('daily study deals ten with chapter variety',await page.evaluate(()=>caskState().run.rows.length===10&&new Set(caskState().run.rows.map(r=>r.chapter)).size>=6));
 ok('recall front has no hidden answer or chapter door',await page.locator('.cask-answer').count()===0&&await page.locator('.cask-run [data-act="cask-open"]').count()===0);
 const beforeCards=await page.evaluate(()=>JSON.stringify(progress.cards));
 await page.evaluate(()=>caskGrade(true));
 ok('recall cannot be graded before revealing',await page.evaluate(()=>JSON.stringify(progress.cards))===beforeCards);
 await page.locator('[data-act="cask-flip"]').press('Enter');
 const runState=()=>page.evaluate(()=>JSON.stringify({run:caskState().run,cards:progress.cards,quizzes:progress.quizzes}));
 const ungraded=await runState();
 await page.locator('.cask-answer [data-act="cask-open"]').press('Enter');
 await page.locator('#view [data-act="back"]').click();await page.waitForSelector('.cask-run');
 ok('reading a full chapter and Back retains an ungraded revealed card',await runState()===ungraded&&await page.locator('.cask-answer').isVisible());
 await page.locator('[data-act="cask-grade"][data-k="no"]').click();const graded=await runState();await page.evaluate(()=>caskGrade(false));
 ok('one recall attempt writes exactly one spaced-repetition mark',await runState()===graded&&await page.evaluate(()=>{const r=caskState().run;return progress.cards[r.rows[r.idx].key].w===1;}));
 await page.evaluate(()=>{caskOpen('bourbon');render();});
 await page.locator('[data-act="cask-practice"]').first().click();await page.locator('[data-act="cask-start"][data-mode="quiz"]:not([data-s])').click();
 ok('chapter quiz is scoped with four distinct options and no answer reading',await page.evaluate(()=>caskState().run.rows.every(r=>r.chapter==='bourbon'&&r.choices.length===4&&new Set(r.choices.map(o=>o.value)).size===4))&&await page.locator('.cask-answer').count()===0);
 const wrong=await page.evaluate(()=>caskState().run.rows[0].choices.findIndex(o=>!o.correct));
 await page.locator('[data-act="cask-pick"]').nth(wrong).click();
 ok('wrong answer teaches the correct answer and a full reason',await page.locator('.cask-answer').innerText().then(t=>t.length>100)&&await page.locator('.cask-option.cask-right').count()===1);
 const marked=await runState();
 await page.evaluate(()=>{window.__caskRun=caskState().run;window.__caskRows=caskState().run.rows;});
 await page.locator('.cask-answer [data-act="cask-open"]').press('Enter');await page.locator('#view [data-act="back"]').click();await page.waitForSelector('.cask-run');
 ok('quiz chapter detour keeps exact run, choices, score and records',await runState()===marked&&await page.evaluate(()=>caskState().run===__caskRun&&caskState().run.rows===__caskRows));
 ok('Back restores the quiz reading control focus',await page.evaluate(()=>document.activeElement.dataset.act==='cask-open'));
 await page.evaluate(()=>caskGrade(true));ok('answered quiz cannot be graded a second time',await runState()===marked);
 await page.locator('[data-act="cask-next"]').click();
 while(!await page.evaluate(()=>caskState().run.done)){
  const right=await page.evaluate(()=>{const r=caskState().run;return r.rows[r.idx].choices.findIndex(o=>o.correct);});
  await page.locator('[data-act="cask-pick"]').nth(right).click();await page.locator('[data-act="cask-next"]').click();
 }
 ok('completed quiz stores one correctly labelled result',await page.evaluate(()=>progress.quizzes.filter(q=>q.mode==='casks').length===1));
 await page.locator('[data-act="cask-retry"]').click();
 ok('retry deals only the missed prompt',await page.evaluate(()=>caskState().run.rows.length===1&&caskState().run.rows[0].chapter==='bourbon'));
 await page.locator('[data-act="cask-pick"]').nth(await page.evaluate(()=>caskState().run.rows[0].choices.findIndex(o=>o.correct))).click();
 await page.locator('[data-act="cask-next"]').click();
 ok('retry records separately without manufacturing another first sitting',await page.evaluate(()=>progress.quizzes.filter(q=>q.mode==='casks'&&q.replay).length===1));
 ok('new practice leaves existing academic requirements and marks untouched',academic===await page.evaluate(()=>JSON.stringify({levels:progress.levels,qa:progress.qa,bank:LEVEL_ITEMS})));
 const weakRecall=await page.evaluate(()=>{const row=caskEntries('all','cards').find(r=>progress.cards[r.key]?.w>0);state.tab='record';render();return row.key;});
 await page.locator('[data-act="fc-drill-weak"]').filter({hasText:weakRecall}).click();
 ok('Record weakest recall opens its exact Cask Atlas prompt',await page.evaluate(key=>{const r=caskState().run;return state.tab==='casks'&&r.mode==='cards'&&r.rows.length===1&&r.rows[0].key===key;},weakRecall));
 const weakQuiz=await page.evaluate(()=>{const row=caskEntries('cognac','quiz')[0];gradeCardKey(row.key,false);state.tab='record';render();return row.key;});
 await page.locator('[data-act="fc-drill-weak"]').filter({hasText:weakQuiz}).click();
 ok('Record weakest quiz opens its exact Cask Atlas question',await page.evaluate(key=>{const r=caskState().run;return state.tab==='casks'&&r.mode==='quiz'&&r.rows.length===1&&r.rows[0].key===key;},weakQuiz));
 const earlyQuiz=await runState();await page.evaluate(()=>caskGrade(true));
 ok('quiz cannot be graded before an option is selected',await runState()===earlyQuiz);
 await page.evaluate(()=>{caskAct('cask-practice',{id:'cognac'});render();});
 await page.locator('[data-act="cask-start"][data-mode="quiz"][data-s="due"]').click();
 ok('scheduled quiz review includes only due or currently missed questions',await page.evaluate(key=>{const r=caskState().run;return r.mode==='quiz'&&r.rows.some(x=>x.key===key)&&r.rows.every(x=>caskRecord(x).due||caskRecord(x).missed);},weakQuiz));
 const stored=await page.evaluate(()=>Object.keys(progress.cards).filter(k=>k.startsWith('Cask Atlas · ')));
 const restored=await page.evaluate(()=>{const backup={app:'bartenders-ledger',progress:JSON.parse(JSON.stringify(progress))};const key=Object.keys(backup.progress.cards).find(k=>k.startsWith('Cask Atlas · '));delete progress.cards[key];saveProgress();dataImport(new File([JSON.stringify(backup)],'atlas-backup.json',{type:'application/json'}));return key;});
 await page.waitForFunction(key=>!!progress.cards[key],restored);
 await page.reload();await page.waitForFunction(()=>typeof caskState==='function');
 ok('backup merge and reload preserve every stable Cask Atlas key',await page.evaluate(keys=>keys.every(k=>!!progress.cards[k]),stored));
 await page.goto(base+'?nosw&qa=cold#/casks/practice/scotch/quiz');
 ok('cold drill address safely opens chapter practice without inventing an active run',await page.locator('[data-act="cask-start"][data-mode="quiz"]:not([data-s])').isVisible());
 await page.locator('#view [data-act="back"]').click();ok('cold Back opens the chapter parent',page.url().endsWith('#/casks/scotch'));
 const axe='C:/Users/zpull/WorldTable/node_modules/axe-core/axe.min.js';await page.addScriptTag({path:axe});
 for(const width of [320,390,1280])for(const theme of ['day','night']){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>OOT.service.set(t),theme);await page.waitForTimeout(400);
  for(const id of ['', 'cognac']){
   await page.evaluate(id=>{caskOpen(id);render();},id);
   ok((id||'index')+' '+theme+' '+width+'px fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   ok((id||'index')+' '+theme+' '+width+'px controls remain usable',await page.locator('.cask-atlas button:visible').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().height>=44)));
   const violations=await page.evaluate(async()=>{const r=await axe.run({include:[['.cask-atlas']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
   if(violations.length)console.log(JSON.stringify(violations));ok((id||'index')+' '+theme+' '+width+'px scoped accessibility',!violations.length);
   if(out&&width===390){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'casks-'+(id||'index')+'-'+theme+'-390.png'),fullPage:false});}
  }
 }
 ok('full journey has no JavaScript errors',!errors.length);
 await context.close();
}finally{if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'casks-browser.json'),JSON.stringify({checks,errors},null,2));}await browser.close();}
console.log('Cask Atlas: '+checks.length+' browser checks passed.');
