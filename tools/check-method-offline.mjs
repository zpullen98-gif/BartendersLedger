/* Real offline check: stop a disposable HTTP server after install and saving.
   No user browser/profile is used. Optional LEDGER_ROOT supports the public wing. */
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium,expect}=require(process.env.LEDGER_PLAYWRIGHT||'@playwright/test');
const root=process.env.LEDGER_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=process.env.LEDGER_SITE_ROOT||root;
const prefix=process.env.LEDGER_SITE_ROOT?'/ledger/':'/';
const studyIds=['stir-rinse','shake-texture','coffee-cream','build-bubbles','spirit-forward','sour-structure','long-sparkling','zero-proof'];
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');let name=decodeURIComponent(url.pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(site,'.'+name);
 if(!file.startsWith(path.resolve(site)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+prefix;
let browser,stopped=false;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(base+'#/notes/studies/stir-rinse');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 await expect(page.locator('.method-study')).toBeVisible();
 const shell=await page.evaluate(async()=>{
  const keys=await caches.keys();const key=keys.find(k=>/^(oot-)?ledger-v/.test(k));
  const c=await caches.open(key);return {key,files:(await c.keys()).map(r=>new URL(r.url).pathname)};
 });
 for(const id of studyIds)assert.ok(shell.files.includes(prefix+'img/studies/'+id+'-v1.svg'),id+' is available before going offline');
 await page.locator('[data-teaching-reference="bar-tools"]>summary').click();
 await page.locator('[data-teaching-open="bar-tools"]').click();
 await page.locator('[data-teaching-save]').click();
 await expect(page.locator('[data-teaching-save-status]')).toContainText('Full illustration saved for offline');
 assert.equal(await page.evaluate(async()=> (await LedgerTeaching.saved('bar-tools')).full),true);
 // Confirm an unopened reference is not downloaded as a side effect.
 assert.equal(await page.evaluate(async()=> (await LedgerTeaching.saved('garnish-citrus')).full),false);
 await page.keyboard.press('Escape');
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));stopped=true;
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator('.method-study')).toBeVisible();
 await expect(page.locator('.method-figure img')).toBeVisible();
 assert.equal(await page.locator('.method-figure img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 await page.locator('[data-teaching-reference="bar-tools"]>summary').click();
 await page.locator('[data-teaching-open="bar-tools"]').click();
 await expect(page.locator('dialog img')).toBeVisible();
 await expect.poll(()=>page.locator('dialog img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await expect(page.locator('dialog .teaching-image-key li')).toHaveCount(10);
 await expect(page.locator('[data-teaching-save-status]')).toContainText('Full illustration saved for offline');
 await page.keyboard.press('Escape');
 for(const id of studyIds.slice(1)){
  await page.goto(base+'#/notes/studies/'+id);
  await expect(page.locator('.method-study')).toBeVisible();
  await expect(page.locator('.method-figure img')).toHaveAttribute('src','img/studies/'+id+'-v1.svg');
  await expect.poll(()=>page.locator('.method-figure img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  await page.locator('.method-recall summary').click();
  await expect(page.locator('.method-recall details')).toHaveAttribute('open','');
 }
 await page.goto(base+'#/notes/studies');
 for(const id of ['methods','families'])await expect(page.locator('[data-study-collection="'+id+'"] .method-card')).toHaveCount(4);
 console.log(JSON.stringify({offline:'passed with HTTP server stopped',shell:shell.key,diagrams:studyIds.length,collections:2,retainedKey:10,unopenedArt:'not downloaded'}));
}finally{if(browser)await browser.close();if(!stopped){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
