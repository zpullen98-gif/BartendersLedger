/* Browser proof for optional seasonal artwork: no hints before recall,
   accessible enlarged reading, honest image failure, and saved offline art.
   LEDGER_PREVIEW_URL, LEDGER_PLAYWRIGHT and LEDGER_QA_OUTPUT are optional. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.LEDGER_PLAYWRIGHT || '../node_modules/@playwright/test');
const base = (process.env.LEDGER_PREVIEW_URL || 'http://127.0.0.1:8776').replace(/\/$/, '');
const out = process.env.LEDGER_QA_OUTPUT;
const browser = await chromium.launch({headless:true});
let checks = 0;
const errors = [], requests = [];
function ok(value, label) { if (!value) throw Error(label); checks++; }
try {
  if (out) await mkdir(out, {recursive:true});
  const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (/\/img\/fall-2026\//.test(req.url())) requests.push(req.url()); });
  const snapshot = () => page.evaluate(() => JSON.stringify({cards:progress.cards,bar:progress.bar,index:state.fc.idx,flipped:state.fc.flipped,hash:location.hash}));
  const noOverflow = async label => ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label);
  await page.goto(base + '/?nosw&artqa#/level/barback');
  await page.locator('[data-act="fall-practise"][data-deck="fall:today"]').click();
  await expect(page.locator('.fall-question')).toBeVisible(); checks++;
  ok(requests.length === 0, 'Cold Today practice requests no fall illustrations before recall');
  await expect(page.locator('.study-face [data-teaching-image],.study-face [data-teaching-reference]')).toHaveCount(0); checks++;
  await page.locator('[data-act="fc-flip"]').click();
  const details = page.locator('.fall-art-answer details');
  await expect(details).toHaveCount(1); checks++;
  ok(!await details.evaluate(el => el.open), 'Revealed answer keeps optional artwork collapsed');
  ok(requests.length === 0, 'A closed answer reference requests no image');
  const before = await snapshot();
  await details.locator('summary').focus();
  for (const key of ['ArrowRight','ArrowLeft','1','2','/']) await page.keyboard.press(key);
  ok(await snapshot() === before, 'Artwork disclosure owns study keyboard input');
  await details.locator('summary').click();
  await expect(details.locator('img')).toBeVisible(); checks++;
  await page.waitForFunction(() => { const img=document.querySelector('.fall-art-answer img'); return img && img.complete && img.naturalWidth > 0; });
  ok(requests.length > 0, 'Opening answer reference loads its registered picture');
  await details.locator('[data-teaching-open]').click();
  await expect(page.locator('dialog[open]')).toHaveCount(1); checks++;
  await expect(page.locator('dialog .teaching-key-title')).toHaveText('Study the ingredient cues'); checks++;
  ok(await page.locator('dialog .teaching-image-key li').count() >= 3, 'Viewer carries the written training cues');
  await page.locator('#teaching-viewer-title').focus();
  for (const key of ['ArrowRight','ArrowLeft','1','2','Space']) await page.keyboard.press(key);
  ok(await snapshot() === before, 'Viewer does not grade or advance the active card');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0); checks++;
  ok(await page.evaluate(() => document.activeElement.hasAttribute('data-teaching-open')), 'Closing viewer restores focus');
  await page.locator('.fall-read-link').click();
  await expect(page.locator('.fall-art img')).toBeVisible(); checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page.locator('.fall-answer')).toBeVisible(); checks++;
  ok(await snapshot() === before, 'Reading and Back preserve the revealed recall card');
  const items = await page.evaluate(() => FALL_MENU_ART.items.map(item => ({id:item.itemId,caption:item.caption,cues:item.cues.length})));
  for (const item of items) {
    await page.goto(base + '/?nosw&artqa#/menu/fall/' + item.id);
    await expect(page.locator('.fall-art figcaption')).toHaveText(item.caption); checks++;
    await expect(page.locator('.fall-art .teaching-image-key li')).toHaveCount(item.cues); checks++;
    await page.locator('.fall-art img').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const img=document.querySelector('.fall-art img'); return img && img.complete && img.naturalWidth > 0; });
    ok(true, item.id + ' renders a real WebP');
    await noOverflow(item.id + ' artwork fits at 390');
  }
  for (const width of [320,390,1120]) for (const mode of ['day','night']) {
    await page.setViewportSize({width,height:844});
    await page.goto(base + '/?nosw&artqa#/menu/fall');
    await page.evaluate(value => OOT.service.set(value), mode);
    await expect(page.locator('.fall-card-art img')).toHaveCount(9); checks++;
    await noOverflow(width + ' ' + mode + ' thumbnails fit');
    if (out && width === 390) await page.screenshot({path:join(out,'ledger-fall-art-index-' + mode + '.png'),fullPage:false});
    await page.locator('.fall-card').first().click();
    await page.locator('.fall-art img').scrollIntoViewIfNeeded();
    await noOverflow(width + ' ' + mode + ' plate fits');
    if (out && width === 390) await page.screenshot({path:join(out,'ledger-fall-art-reading-' + mode + '.png'),fullPage:true});
    await page.locator('[data-teaching-open]').click();
    ok(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), width + ' ' + mode + ' viewer fits');
    await page.keyboard.press('Escape');
  }
  // Failure remains usable: both the thumbnail and full-size alternatives fail.
  await page.route('**/img/fall-2026/**', route => route.abort());
  await page.goto(base + '/?nosw&failureqa#/menu/fall/' + items[0].id);
  await page.locator('.fall-art').scrollIntoViewIfNeeded();
  await expect(page.locator('.fall-art .teaching-image-missing')).toBeVisible(); checks++;
  await expect(page.locator('.fall-art img')).toBeHidden(); checks++;
  await expect(page.locator('.fall-art .teaching-image-key li')).toHaveCount(items[0].cues); checks++;
  await expect(page.locator('[data-act="fall-practise"]')).toBeEnabled(); checks++;
  await context.close();
  // A clean installation saves the complete illustration through the real worker.
  const offline = await browser.newContext({viewport:{width:390,height:844}});
  const off = await offline.newPage();
  off.setDefaultTimeout(15000);
  off.on('pageerror', error => errors.push(error.message));
  await off.goto(base + '/#/menu/fall/' + items[0].id);
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller);
  await off.locator('[data-teaching-open]').click();
  await off.locator('[data-teaching-save]').click();
  await expect(off.locator('[data-teaching-save-status]')).toContainText('saved for offline'); checks++;
  const saved = await off.evaluate(async id => (await LedgerTeaching.saved('fall-art-' + id)).full, items[0].id);
  ok(saved, 'Save reads the full image back from bounded optional storage');
  await off.keyboard.press('Escape');
  await offline.setOffline(true);
  await off.reload();
  await off.locator('.fall-art img').scrollIntoViewIfNeeded();
  await off.waitForFunction(() => { const img=document.querySelector('.fall-art img'); return img && img.complete && img.naturalWidth > 0 && !img.hidden; });
  ok(true, 'Saved artwork survives offline reload');
  await off.locator('[data-teaching-open]').click();
  await off.waitForFunction(() => { const img=document.querySelector('dialog img'); return img && img.complete && img.naturalWidth > 0; });
  await expect(off.locator('[data-teaching-save-status]')).toContainText('saved for offline'); checks++;
  await off.keyboard.press('Escape');
  await off.locator('[data-act="fall-practise"]').click();
  await expect(off.locator('.study-face [data-teaching-image]')).toHaveCount(0); checks++;
  await off.locator('[data-act="fc-flip"]').click();
  await off.locator('.fall-art-answer summary').click();
  await off.locator('.fall-art-answer img').scrollIntoViewIfNeeded();
  await off.waitForFunction(() => { const img=document.querySelector('.fall-art-answer img'); return img && img.complete && img.naturalWidth > 0 && !img.hidden; });
  ok(true, 'Offline answer can reopen its saved illustration');
  await offline.close();
  ok(errors.length === 0, 'No page errors: ' + errors.join('; '));
  const result = {status:'passed',checks,items:items.length,browserErrors:errors,offline:true,preview:base};
  if (out) await writeFile(join(out,'ledger-fall-art-browser-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
