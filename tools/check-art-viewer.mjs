/* Actual module/cache failure contracts and native-dialog browser checks.
   Browser dependency: installed Playwright, or PLAYWRIGHT_MODULE=<module path>.
   The fixture uses temporary in-memory progress and its own localhost origin. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import http from 'node:http';
import vm from 'node:vm';
const root=process.env.LEDGER_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const code=read('js/teaching-images.js');
const data={}; vm.runInNewContext(read('js/data-teaching-images.js'),data);
const bytes=fs.readFileSync(path.join(root,'img/plates/bar-tools-v1.webp'));
function storage(mode='normal'){
 const rows=new Map();
 return {rows,async open(){return {
  async put(url,r){if(mode==='quota')throw Error('QuotaExceededError'); rows.set(url,r.clone());},
  async match(url){if(mode==='missing')return; if(mode==='corrupt'&&rows.has(url))return new Response('not webp',{headers:{'Content-Type':'image/webp','Content-Length':'16'}});return rows.get(url)?.clone();},
  async delete(url){return rows.delete(url);},async keys(){return [...rows.keys()].map(x=>new Request(x));}
 };},async delete(){rows.clear();return true;}};
}
function harness(caches=storage(),manifest=data.LEDGER_TEACHING_IMAGES){
 const calls=[];const ctx={URL,Request,Response,Uint8Array,DataView,AbortController,Map,Set,Promise,setTimeout,clearTimeout,
 caches,LEDGER_TEACHING_IMAGES:manifest,location:new URL('https://example.test/ledger/sw.js'),
 fetch:async url=>{calls.push(url);return new Response(bytes,{headers:{'Content-Type':'image/webp'}});}};
 ctx.self=ctx;vm.runInNewContext(code,ctx);return {api:ctx.LedgerTeaching,calls,caches};
}
test('reviewed study metadata preserves precise scope, keys and sources',()=>{
 const {api}=harness();assert.equal(Object.keys(api.entries).length,4);
 for(const entry of Object.values(api.entries)){
  assert.ok(entry.title&&entry.purpose&&entry.context&&entry.reviewedOn);
  assert.equal(entry.labels.length,entry.notes.length);
  assert.ok(entry.sources.length);assert.ok(Object.isFrozen(entry.sources));
 }
 assert.match(api.figure('bar-tools'),/data-teaching-open="bar-tools"/);
 assert.match(api.figure('bar-tools'),/Open full illustration \(new tab\)/);
 assert.ok(!api.disclosure('bar-tools','Tools').includes('<img'));
});
test('unsafe sources and impossible review dates do not enter the reviewed registry',()=>{
 const entry=data.LEDGER_TEACHING_IMAGES['ice'];
 const manifest={good:entry,badSource:{...entry,sources:[{title:'No',url:'javascript:alert(1)'}]},credentials:{...entry,sources:[{title:'No',url:'https://user:password@example.test/'}]},badDate:{...entry,reviewedOn:'2026-02-30'}};
 assert.deepEqual(Object.keys(harness(storage(),manifest).api.entries),['good']);
});
test('saving reports true only after stored bytes survive readback',async()=>{
 const {api,caches}=harness();assert.equal((await api.saved('bar-tools')).full,false);
 assert.equal(await api.saveOffline('bar-tools'),true);
 assert.equal((await api.saved('bar-tools')).full,true);
 assert.equal(caches.rows.size,1);assert.equal((await api.saved('bar-tools')).small,false);
});
for(const mode of ['quota','missing','corrupt'])test('storage '+mode+' never reports a successful save, while online art remains usable',async()=>{
 const {api}=harness(storage(mode));assert.equal(await api.saveOffline('bar-tools'),false);
 assert.equal((await api.saved('bar-tools')).full,false);
 const response=await api.serve(new Request('https://example.test/ledger/img/plates/bar-tools-v1.webp'));
 assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,bytes.length);
});
test('unsupported storage and unknown IDs stay honest and request no unknown picture',async()=>{
 const {api,calls}=harness(null);assert.equal(await api.saveOffline('bar-tools'),false);assert.equal(await api.saveOffline('not-an-image'),false);assert.equal(calls.length,0);
 assert.equal(api.open('bar-tools'),false);assert.equal(api.isViewerOpen(),false);
});
test('native viewer traps focus, keeps keys and context, survives save failure, and preserves study state',async()=>{
 const require=createRequire(import.meta.url);let pw;
 try{pw=require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');}
 catch{pw=require(path.resolve(root,'../WorldTable/node_modules/@playwright/test'));}
 const fixture='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/house.css"><link rel="stylesheet" href="/css/service-day.css"><link rel="stylesheet" href="/css/teaching-viewer.css"></head><body><main id="view" tabindex="-1"></main><script src="/js/data-teaching-images.js"></script><script src="/js/teaching-images.js"></script><script>window.progress={cards:{fixture:{wins:2}},practice:{}};window.grades=0;document.getElementById("view").innerHTML=LedgerTeaching.lesson("bar-tools");document.addEventListener("keydown",e=>{if(["r","w"," ","Enter"].includes(e.key))grades++;});</script></body></html>';
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(fixture);return;}
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':name.endsWith('.webp')?'image/webp':name.endsWith('.css')?'text/css':'text/javascript'});res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await pw.chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(6000);await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const before=await page.evaluate(()=>JSON.stringify({progress,hash:location.hash,history:history.length}));
  await page.locator('[data-teaching-open]').click();
  assert.equal(await page.evaluate(()=>LedgerTeaching.isViewerOpen()),true);
  assert.equal(await page.locator('dialog .teaching-image-key li').count(),10);
  assert.match(await page.locator('dialog').innerText(),/stylised jigger markings/);
  assert.match(await page.locator('dialog').innerText(),/Campari Academy/);
  assert.equal(await page.evaluate(()=>document.activeElement.className),'teaching-viewer-close');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Open full illustration (new tab)');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'teaching-viewer-close');
  await page.locator('#teaching-viewer-title').focus();
  for(const key of ['r','w','Space','Enter'])await page.keyboard.press(key);
  assert.equal(await page.evaluate(()=>grades),0);
  await page.evaluate(()=>{Object.defineProperty(window,'caches',{configurable:true,value:{open:async()=>{throw Error('Quota');}}});});
  await page.locator('[data-teaching-save]').click();
  await pw.expect(page.locator('[data-teaching-save-status]')).toContainText('could not be saved');
  assert.ok(!/Full illustration saved/.test(await page.locator('[data-teaching-save-status]').innerText()));
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-teaching-open')),'bar-tools');
  assert.equal(await page.evaluate(()=>JSON.stringify({progress,hash:location.hash,history:history.length})),before);
  await page.reload();await page.locator('[data-teaching-open]').click();await page.locator('[data-teaching-save]').click();
  await pw.expect(page.locator('[data-teaching-save-status]')).toContainText('saved on this device');
  assert.ok(!/saved for offline/.test(await page.locator('[data-teaching-save-status]').innerText()),'no offline claim before the owning worker controls the page');
  for(const width of [320,390])for(const theme of ['day','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(t=>document.documentElement.dataset.service=t,theme);
   assert.equal(await page.evaluate(()=>{const d=document.querySelector('dialog');return d.scrollWidth<=d.clientWidth+1;}),true,theme+' '+width+' no horizontal overflow');
  }
  await page.keyboard.press('Escape');await page.locator('[data-teaching-open]').click();
  await page.evaluate(()=>document.querySelector('[data-teaching-open]').remove());await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'view');
  assert.equal(await page.evaluate(()=>JSON.stringify(progress)),JSON.parse(before).progress?JSON.stringify(JSON.parse(before).progress):'');
  await context.close();
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
