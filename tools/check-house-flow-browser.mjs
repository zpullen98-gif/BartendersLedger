/* Brennan's focused learning rooms, exercised through real controls in an
   isolated profile. LEDGER_URL may name either source or the public preview;
   OOT_SHARED supplies the canonical house pack. No user record is opened. */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.LEDGER_PLAYWRIGHT || '@playwright/test');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.LEDGER_URL || 'http://127.0.0.1:8782').replace(/\/$/, '');
const shared = process.env.OOT_SHARED || path.resolve(root, '../WorldTable/static/shared');
const output = process.env.LEDGER_QA_OUTPUT;
const engine = await readFile(path.join(shared, 'oot-house.js'), 'utf8');
const packText = await readFile(path.join(shared, 'packs/brennans-new-orleans.v1.oothouse.json'), 'utf8');
const pack = JSON.parse(packText).house;
const browser = await chromium.launch({ headless: true });
const errors = [];
let checks = 0, visits = 0;
function ok(value, message) { if (!value) throw Error(message); checks++; }
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', (e) => errors.push(e.message));
async function go(hash, house = true) {
  await page.goto(base + '/?nosw&houseflow=' + (++visits) + hash);
  await page.waitForFunction(() => typeof houseFlowHTML === 'function' && !!document.querySelector('#view'));
  if (house) {
    if (!await page.evaluate(() => !!(window.OOT && OOT.house))) await page.addScriptTag({ content: engine });
    await page.evaluate(async (payload) => {
      if (!OOT.house.current()) await OOT.house.importPack(payload, { mode: 'new' });
      await houseSyncIn(); applyRoute(); render();
    }, packText);
  }
}
async function back(hash) {
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')); checks++;
}
async function fits(label) { ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' overflows'); }
async function settlePaint() { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); }
const sections = [['menu', 'Menu'], ['studies', 'Bar studies'], ['rehearsal', 'Service rehearsal'], ['reference', 'House reference']];
try {
  if (output) await mkdir(output, { recursive: true });
  /* A fresh standalone install keeps every route and its editing entrance. */
  await go('#/menu', false);
  for (const view of ['studies', 'rehearsal', 'reference']) {
    await page.locator('.house-sections [data-v="' + view + '"]').click();
    await expect(page).toHaveURL(new RegExp('#/menu/view/' + view + '$')); checks++;
    await back('#/menu');
  }
  await page.locator('.house-sections [data-v="reference"]').click();
  await page.locator('.house-subsections [data-v="add"]').click();
  await expect(page).toHaveURL(/#\/menu\/view\/add$/); checks++;
  await back('#/menu/view/reference');

  await context.addInitScript({ content: engine });
  await go('#/menu');
  const live = await page.evaluate(() => ({ ids: hsRows(hsCurrent(), '').map((r) => r.id), sections: hsSections(hsRows(hsCurrent(), '')).map((s) => s.section) }));
  ok(live.ids.length === pack.cocktails.length, 'Every house drink is available');
  await expect(page.locator('.hs-row')).toHaveCount(live.ids.length); checks++;
  await expect(page.locator('details.hs-category')).toHaveCount(live.sections.length); checks++;
  await expect(page.locator('details.hs-category[open]')).toHaveCount(0); checks++;
  ok(await page.locator('.hs-row:visible').count() === 0, 'The menu starts compact');
  ok(await page.locator('.hs-jumps,#hs-videos-h,#hs-producers-h').count() === 0, 'Long reference lists have moved out of Menu');
  const labels = await page.locator('.house-sections button').allTextContents();
  ok(labels.join('|') === sections.map((x) => x[1]).join('|'), 'Four clear learning sections');
  await page.evaluate(() => {
    progress.cards['My Bar · Classic Sazerac'] = { r: 2, w: 1, reps: 2, ease: 2.5, interval: 2, due: Date.now() + 86400000, last: Date.now() };
    saveProgress();
  });
  const record = await page.evaluate(() => JSON.stringify(progress));

  /* User expansion, filter, search and exact opener survive a card and Back. */
  const firstCategory = page.locator('details.hs-category').first();
  await firstCategory.locator('summary').click();
  await expect(firstCategory).toHaveAttribute('open', ''); checks++;
  await expect.poll(() => page.evaluate((s) => !!hsState().expanded[s], live.sections[0])).toBe(true); checks++;
  await page.locator('#hs-section').selectOption('Classic Eye Openers');
  await expect(page.locator('details.hs-category')).toHaveCount(1); checks++;
  await expect(page.locator('details.hs-category')).toHaveAttribute('open', ''); checks++;
  await page.locator('#hs-q').fill('milk');
  const matches = await page.locator('.hs-row').count();
  ok(matches > 0, 'Search finds a drink inside the chosen category');
  const opener = page.locator('.hs-row').first();
  const id = await opener.getAttribute('data-id');
  const expectedName = await page.evaluate((id) => hsCurrent().cocktails.find((c) => c.id === id).name, id);
  await opener.scrollIntoViewIfNeeded();
  const beforeY = await page.evaluate(() => scrollY);
  await opener.click();
  await expect(page.locator('.hs-card h2')).toHaveText(expectedName); checks++;
  await back('#/menu/section/classic-eye-openers');
  await settlePaint();
  await expect(page.locator('#hs-q')).toHaveValue('milk'); checks++;
  await expect(page.locator('#hs-section')).toHaveValue('Classic Eye Openers'); checks++;
  ok(await page.evaluate((id) => document.activeElement?.dataset.id === id, id), 'Back focuses the exact opening drink');
  ok(Math.abs(await page.evaluate(() => scrollY) - beforeY) <= 2, 'Back preserves menu scroll');
  await page.locator('#hs-q').fill('');
  await page.locator('#hs-section').selectOption('');
  await expect(page.locator('details.hs-category').first()).toHaveAttribute('open', ''); checks++;
  await page.locator('#hs-q').fill('zzzz-no-drink');
  await expect(page.locator('.hs-row')).toHaveCount(0); checks++;
  await page.locator('#hs-q').fill('');
  await expect(page.locator('.hs-row')).toHaveCount(live.ids.length); checks++;

  /* Everything displaced from the menu remains in its destination. */
  await page.locator('.house-sections [data-v="studies"]').click();
  await expect(page.locator('a.bc-door')).toHaveCount(1); checks++;
  await expect(page.locator('a.brew-door')).toHaveCount(1); checks++;
  await expect(page.locator('#hs-videos-h')).toHaveCount(1); checks++;
  const videoIds = await page.locator('.hs-video').evaluateAll((els) => els.map((el) => el.dataset.video));
  const expectedVideos = await page.evaluate(() => hsVideoGroups(hsCurrent()).flatMap((g) => g.videos.map((v) => v.id)));
  ok(JSON.stringify(videoIds) === JSON.stringify(expectedVideos), 'All house training videos remain in order');
  const watch = page.locator('[data-flow-keep="videos"]');
  await watch.locator(':scope > summary').click();
  const related = page.locator('.hs-video [data-act="hs-open"]').first();
  const topic = related.locator('xpath=ancestor::details[1]');
  if (await topic.getAttribute('open') === null) await topic.locator(':scope > summary').click();
  const relatedId = await related.getAttribute('data-id');
  const relatedVideo = await related.evaluate((el) => el.closest('[data-video]').dataset.video);
  await related.click();
  await expect(page.locator('.hs-card')).toHaveCount(1); checks++;
  ok(await page.evaluate((id) => hsState().open === id, relatedId), 'A video opens its related house drink');
  await back('#/menu/view/studies');
  await expect(page.locator('[data-flow-keep="videos"]')).toHaveAttribute('open', ''); checks++;
  ok(await page.evaluate(({id, video}) => document.activeElement?.dataset.id === id && document.activeElement?.closest('[data-video]')?.dataset.video === video, {id: relatedId, video: relatedVideo}), 'Video Back restores the exact related drink opener');
  await page.locator('a.brew-door').click();
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  await back('#/menu/view/studies');
  await expect(page.locator('[data-flow-keep="videos"]')).toHaveAttribute('open', ''); checks++;
  await page.locator('.house-sections [data-v="reference"]').click();
  await expect(page.locator('[data-act="lv-producers"]')).toHaveCount(1); checks++;
  const lists = await page.evaluate(() => {
    const template = document.createElement('template'); template.innerHTML = hsHouseListsHTML(hsCurrent());
    const expected = template.content.firstElementChild;
    const actual = document.querySelector('[data-house-flow="reference"] section[aria-label="' + CSS.escape(expected.getAttribute('aria-label')) + '"]');
    const normal = (text) => text.replace(/\s+/g, ' ').trim();
    return { actual: normal(actual?.textContent || ''), expected: normal(expected.textContent), actualRows: actual?.querySelectorAll('li').length, expectedRows: expected.querySelectorAll('li').length };
  });
  ok(lists.expected.length > 0 && lists.actual === lists.expected && lists.actualRows === lists.expectedRows, 'Every kept house list is retained');
  await page.locator('[data-act="lv-producers"]').click();
  await expect(page).toHaveURL(/#\/producers$/); checks++;
  await back('#/menu/view/reference');
  await page.locator('.house-sections [data-v="rehearsal"]').click();
  await expect(page.locator('.house-flow-step')).toHaveCount(3); checks++;
  await expect(page.locator('[data-act="today"][data-d="due"]')).toHaveCount(1); checks++;
  await expect(page.locator('[data-act="hd-open"][data-mode="say"]')).toHaveCount(1); checks++;
  await expect(page.locator('[data-act="hd-open"][data-mode="role"]')).toHaveCount(1); checks++;
  await page.locator('[data-act="deck"][data-deck="menu"]').click();
  await expect(page).toHaveURL(/#\/flashcards\/menu$/); checks++;
  await back('#/menu/view/rehearsal');
  ok(await page.evaluate(() => JSON.stringify(progress)) === record, 'Reading, filtering, navigation and deck setup preserve saved grades and recipes');

  /* Cold addresses climb the new hierarchy without adding browser entries. */
  for (const [from, parents] of [
    ['#/menu/brew', ['#/menu/view/studies', '#/menu', '#/home']],
    ['#/menu/compass', ['#/menu/view/studies', '#/menu', '#/home']],
    ['#/menu/view/stock', ['#/menu/view/reference', '#/menu', '#/home']],
    ['#/menu/view/add', ['#/menu/view/reference', '#/menu', '#/home']],
    ['#/menu/section/classic-eye-openers', ['#/menu', '#/home']]
  ]) {
    await go(from);
    const size = await page.evaluate(() => history.length);
    for (const parent of parents) await back(parent);
    ok(await page.evaluate(() => history.length) === size, from + ' cold Back adds no history');
  }

  for (const width of [320, 390, 1120]) for (const mode of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    for (const [view] of sections) {
      await go(view === 'menu' ? '#/menu' : '#/menu/view/' + view);
      await page.evaluate((mode) => OOT.service.set(mode), mode);
      await expect(page.locator('html')).toHaveAttribute('data-service', mode); checks++;
      await fits(view + ' ' + width + ' ' + mode);
      const small = await page.locator('.house-sections button,.house-subsections button,.hs-category > summary,#hs-q,#hs-section,.house-flow .door,.house-flow summary')
        .evaluateAll((els) => els.filter((el) => el.getClientRects().length).map((el) => ({ text: el.textContent.trim().slice(0, 50), height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width })).filter((s) => s.height < 43 || s.width < 43));
      ok(!small.length, view + ' ' + width + ' ' + mode + ' small controls ' + JSON.stringify(small));
      if (output && width === 390) await page.screenshot({ path: path.join(output, 'house-flow-' + view + '-' + mode + '.png'), fullPage: true });
    }
  }
  /* A different house must never be forced into Brennan's menu headings. */
  await go('#/menu');
  const custom = JSON.parse(packText);
  custom.house.id = 'h-fixture99';
  custom.house.name = 'The Fixture Room & Bar';
  for (const item of custom.house.cocktails) item.section = 'Our ' + item.section;
  await page.evaluate(async (payload) => { const result = await OOT.house.importPack(payload, { mode: 'new' }); if (!result.ok) throw Error(result.said); await houseSwitch(result.added); await houseSyncIn(); state.menu.study = null; state.menu.view = 'menu'; render(); }, JSON.stringify(custom));
  await expect(page.locator('#bnav [data-cluster="brennans"]')).toHaveText('The Fixture Room & Bar'); checks++;
  ok((await page.locator('details.hs-category').evaluateAll((els) => els.map((el) => el.dataset.section))).every((s) => s.startsWith('Our ')), 'Custom sections use their own names');
  await expect(page.locator('.hs-row')).toHaveCount(custom.house.cocktails.length); checks++;
  ok(!errors.length, 'No browser errors: ' + errors.join('; '));
  const result = { status: 'passed', checks, base, drinks: live.ids.length, menuSections: live.sections.length, browserErrors: errors };
  if (output) await writeFile(path.join(output, 'house-flow-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await context.close(); await browser.close(); }
