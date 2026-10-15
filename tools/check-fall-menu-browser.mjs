/* Isolated browser checks for the fall study collection. No personal profile.
   LEDGER_PLAYWRIGHT, LEDGER_PREVIEW_URL and LEDGER_QA_OUTPUT are optional. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.LEDGER_PLAYWRIGHT || '@playwright/test');
const base = (process.env.LEDGER_PREVIEW_URL || 'http://127.0.0.1:8776').replace(/\/$/, '');
const out = process.env.LEDGER_QA_OUTPUT;
const browser = await chromium.launch({ headless: true });
const errors = [];
let checks = 0;
function ok(value, label) { if (!value) throw Error(label); checks++; }
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  let visit = 0;
  async function go(hash) {
    await page.goto(base + '/?nosw&fallqa=' + (++visit) + hash);
    await page.waitForFunction(() => typeof fallItems === 'function' && fallItems().length === 17);
  }
  async function noOverflow(label) {
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label);
  }
  if (out) await mkdir(out, { recursive: true });
  await go('#/level/barback');
  await expect(page.locator('.fall-door')).toHaveCount(1); checks++;
  await page.locator('.fall-door').click();
  await expect(page).toHaveURL(/#\/menu\/fall$/); checks++;
  await expect(page.locator('.fall-card')).toHaveCount(9); checks++;
  await page.locator('[data-act="fall-kind"][data-k="food"]').click();
  await expect(page.locator('.fall-card')).toHaveCount(8); checks++;
  await page.locator('#fall-menu-q').fill('lamb');
  await expect(page.locator('.fall-card')).toHaveCount(1); checks++;
  await page.locator('.fall-card').click();
  await expect(page.locator('.fall-study h2')).toContainText('Lamb'); checks++;
  const itemHash = await page.evaluate(() => location.hash);
  const initial = await page.evaluate(() => JSON.stringify({ cards: progress.cards, bar: progress.bar }));
  for (const part of ['ingredients', 'origins', 'service', 'read']) {
    await page.locator('[data-act="fall-part"][data-k="' + part + '"]').click();
    await expect(page.locator('[data-act="fall-part"][data-k="' + part + '"]')).toHaveAttribute('aria-pressed', 'true'); checks++;
    await noOverflow('Mobile ' + part + ' fits');
  }
  ok(await page.evaluate(() => JSON.stringify({ cards: progress.cards, bar: progress.bar })) === initial, 'Reading preserves progress and restaurant records');
  await page.locator('[data-act="fall-practise"]').click();
  await expect(page.locator('.study-face .fall-question')).toHaveCount(1); checks++;
  await expect(page.locator('[data-act="fc-grade"]')).toHaveCount(0); checks++;
  ok(await page.evaluate(() => state.fc.deck.length === 7 && state.fc.mode === 'fall'), 'Item practice deals seven factual recall cards');
  const card = await page.evaluate(() => ({ key: cardKey(state.fc.deck[state.fc.idx]), before: JSON.stringify(progress.bar) }));
  await page.locator('[data-act="fc-flip"]').click();
  await expect(page.locator('.fall-answer')).toHaveCount(1); checks++;
  const beforeReferenceKeys = await page.evaluate(() => JSON.stringify({ idx: state.fc.idx, flipped: state.fc.flipped, cards: progress.cards, hash: location.hash }));
  await page.locator('.fall-read-link').focus();
  for (const key of ['ArrowRight', 'ArrowLeft', '1', '2', '/']) await page.keyboard.press(key);
  ok(await page.evaluate(() => JSON.stringify({ idx: state.fc.idx, flipped: state.fc.flipped, cards: progress.cards, hash: location.hash })) === beforeReferenceKeys, 'Reference link owns keyboard input without grading or changing screens');
  await page.locator('a[href="' + itemHash + '"]').click();
  await expect(page).toHaveURL(new RegExp(itemHash + '$')); checks++;
  await page.locator('[data-act="back"]').click();
  await expect(page.locator('.fall-answer')).toHaveCount(1); checks++;
  ok(await page.evaluate(() => cardKey(state.fc.deck[state.fc.idx])) === card.key, 'Reading and Back preserve revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate(key => progress.cards[key].w === 1, card.key), 'Again updates the stable fall record');
  ok(await page.evaluate(() => JSON.stringify(progress.bar)) === card.before, 'Practice leaves saved restaurant untouched');
  await go('#/level/barback');
  const due = await page.evaluate(() => { const t = dueToday(); return [t.nDue, t.nNew, t.lv]; });
  await page.locator('[data-act="fall-practise"][data-deck="fall:today"]').click();
  ok(await page.evaluate(key => state.fc.deck.length === 10 && cardKey(state.fc.deck[0]) === key, card.key), 'Today deals ten, missed first');
  ok(await page.evaluate(() => new Set(state.fc.deck.map(c => fallKind(fallItem(c.itemId)))).size === 2), 'Today includes dishes and drinks');
  ok(JSON.stringify(await page.evaluate(() => { const t = dueToday(); return [t.nDue, t.nNew, t.lv]; })) === JSON.stringify(due), 'Fall practice leaves Due today counts unchanged');
  ok(await page.evaluate(() => dueToday().deck.every(card => card.src !== 'Fall 2026')), 'Fall cards stay outside the ordinary Due today pool');
  await go('#/menu/fall');
  await page.locator('[data-act="fall-kind"][data-k="food"]').click();
  await expect(page.locator('.fall-card')).toHaveCount(8); checks++;
  const items = await page.evaluate(() => fallItems().map(i => ({ id: i.id, name: i.name })));
  for (const item of items) {
    await go('#/menu/fall/' + item.id);
    await expect(page.locator('.fall-study h2')).toHaveText(item.name); checks++;
    await page.locator('[data-act="fall-part"][data-k="ingredients"]').click();
    const notes = page.locator('.fall-note > summary');
    for (let i = 0; i < await notes.count(); i++) await notes.nth(i).click();
    await noOverflow(item.name + ' expanded notes fit at 390');
    ok(await page.locator('.fall-cites a').count() > 0, item.name + ' exposes sources');
  }
  for (const width of [320, 390, 1120]) for (const service of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    await go('#/menu/fall');
    await page.evaluate(mode => OOT.service.set(mode), service);
    await expect(page.locator('html')).toHaveAttribute('data-service', service); checks++;
    await noOverflow(width + ' ' + service + ' index fits');
    if (out && width === 390) await page.screenshot({ path: join(out, 'ledger-fall-phone-' + service + '.png'), fullPage: false });
    await page.locator('.fall-card').first().click();
    await noOverflow(width + ' ' + service + ' item fits');
    if (out && width === 390) await page.screenshot({ path: join(out, 'ledger-fall-item-phone-' + service + '.png'), fullPage: true });
    await page.locator('[data-act="fall-practise"]').click();
    await page.locator('[data-act="fc-flip"]').click();
    await noOverflow(width + ' ' + service + ' revealed recall fits');
  }
  await context.close();
  // A separate profile installs the actual worker, then reads and practises
  // without a network. This catches missing shell data or script dependencies.
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const off = await offline.newPage();
  off.on('pageerror', e => errors.push(e.message));
  await off.goto(base + '/#/menu/fall');
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await off.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find(n => /^ledger-v/.test(n)));
    return Promise.all(['css/fall-menu.css', 'js/data-fall-menu.js', 'js/ui-fall-menu.js'].map(async path => !!await cache.match(new URL(path, location.href))));
  });
  ok(cached.every(Boolean), 'Worker caches new styles, content and renderer');
  await offline.setOffline(true);
  await off.reload();
  await expect(off.locator('.fall-card')).toHaveCount(9); checks++;
  await off.locator('.fall-card').first().click();
  await expect(off.locator('.fall-study h2')).toBeVisible(); checks++;
  await off.locator('[data-act="fall-practise"]').click();
  await off.locator('[data-act="fc-flip"]').click();
  await expect(off.locator('.fall-answer')).toBeVisible(); checks++;
  ok(!errors.length, 'No browser errors: ' + errors.join('; '));
  const result = { status: 'passed', checks, browserErrors: errors, preview: base, offline: true };
  if (out) await writeFile(join(out, 'ledger-fall-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await offline.close();
} finally { await browser.close(); }
