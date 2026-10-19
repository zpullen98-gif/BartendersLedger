/* Coffee and tea, the house's page (18 October 2026), in a real browser with a
   disposable profile. LEDGER_URL (or LEDGER_PREVIEW_URL) names the served
   Ledger, the source or a published preview; LEDGER_PLAYWRIGHT names
   @playwright/test when it is not beside this checkout; OOT_SHARED names the
   House engine and the pack (else ../WorldTable/static/shared beside this
   checkout); LEDGER_QA_OUTPUT, when set, takes screenshots and the result.

   It holds: the cold addresses (the index, every entry, a bad id), the search
   (the results alone repainted, the count in role=status, focus and history
   kept), the group chips (a replace, the focus kept), the Back chain (an
   entry, the index, the menu, Home), a practice run (a blind front, a forged
   early grade refused, the answer after Flip, the entry read and Back to the
   same card, a readable Deck done), a quiz through to one Recent rounds row
   with Study this card and Back keeping the results, the keyboard left to
   the page's own controls, 320, 390 and 1120 in day and night service
   (nothing wider than the screen, every control 44px, no dash and no mark at
   or above U+2190 on the page), no request to YouTube or its pictures on any
   render, the house's own six read live in menu order with the tea note,
   the door between The Bar Compass and the producers, the house card and
   Back, and a reload with the network off. */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.LEDGER_PLAYWRIGHT || '@playwright/test');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.LEDGER_URL || process.env.LEDGER_PREVIEW_URL || 'http://127.0.0.1:8782').replace(/\/$/, '');
const shared = process.env.OOT_SHARED || path.resolve(root, '../WorldTable/static/shared');
const out = process.env.LEDGER_QA_OUTPUT;
const browser = await chromium.launch({ headless: true });
const errors = [];
const outside = [];
let checks = 0;
function ok(value, label) { if (!value) throw Error(label); checks++; }
const DASH = /[\u2012-\u2015]|&[mn]dash;| \x2d\x2d /;
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'America/New_York' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', (e) => errors.push(e.message));
/* nothing on a render may ask YouTube or its picture host for anything */
page.on('request', (r) => { if (/youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com|youtube-nocookie/.test(r.url())) outside.push(r.url()); });
let visit = 0;
async function go(hash) {
  await page.goto(base + '/?nosw&brewqa=' + (++visit) + hash);
  /* the menu with no house loaded draws no heading, so the paint is what is awaited */
  await page.waitForFunction(() => typeof brewEntries === 'function' && brewEntries().length > 0 && !!document.querySelector('#view h2, #view [data-act="back"]'));
}
async function fits(label) { ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' fits the screen'); }
async function shot(name, fullPage = false) { if (out) await page.screenshot({ path: path.join(out, name + '.png'), fullPage }); }
/* the page's own words: no dash, nothing at or above U+2190 */
async function clean(label) {
  const text = await page.locator('#view').innerText();
  const m = text.match(DASH);
  ok(!m, label + ' carries a dash (' + (m && m[0]) + ')');
  const high = [...text].find((c) => c.codePointAt(0) >= 0x2190);
  ok(!high, label + ' carries U+' + (high ? high.codePointAt(0).toString(16).toUpperCase() : ''));
}
async function controls(label) {
  const small = await page.locator('.brew-menu-tabs .tab-btn, .brew-index .btn, .brew-index .chip, .brew-index input, .brew-index a.brew-row, .brew-detail .btn, .brew-detail summary, .brew-detail a.hs-link, .brew-sources a')
    .evaluateAll((els) => els.filter((el) => el.getClientRects().length).map((el) => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, t: (el.textContent || el.id || '').trim().slice(0, 40) }))
      .filter((s) => s.h < 43.5 || s.w < 43.5));
  ok(!small.length, label + ': controls under 44px ' + JSON.stringify(small));
}
try {
  if (out) await mkdir(out, { recursive: true });
  const data = await (async () => { await go('#/menu/brew'); return page.evaluate(() => ({ entries: brewEntries(), groups: brewGroups() })); })();
  const first = data.entries[0];

  /* the cold addresses */
  await expect(page.locator('#view h2')).toHaveText('Coffee and tea'); checks++;
  await expect(page.locator('#view [data-act="back"]')).toHaveCount(1); checks++;
  const subs = await page.locator('.brew-menu-tabs .tab-btn').evaluateAll((els) => els.map((el) => ({ t: el.textContent.trim(), on: el.getAttribute('aria-current') === 'true', h: el.getBoundingClientRect().height })));
  ok(subs.map((s) => s.t).join('|') === 'The menu|The Bar Compass|Fall 2026|Coffee and tea|The stock|Add drinks', 'the sub-nav reads ' + subs.map((s) => s.t).join('|'));
  ok(subs[3].on && subs.filter((s) => s.on).length === 1, 'Coffee and tea is not the one current sub-view');
  ok(subs.every((s) => s.h >= 43.5), 'a sub-nav button under 44px');
  await expect(page.locator('#brew-results .brew-row')).toHaveCount(data.entries.length); checks++;
  for (const e of data.entries) {
    await go('#/menu/brew/' + e.id);
    await expect(page.locator('.brew-detail h2')).toHaveText(e.name); checks++;
    await expect(page.locator('#view [data-act="back"]')).toHaveCount(1); checks++;
    await expect(page.locator('.brew-steps li')).toHaveCount(e.make.steps.length); checks++;
    await expect(page.locator('.brew-make .brew-boundary')).toHaveText('A general method, not the house build.'); checks++;
    await expect(page.locator('.brew-search-video')).toHaveCount(1); checks++;
    await expect(page.locator('.brew-video')).toHaveCount(e.video ? 1 : 0); checks++;
    ok(await page.locator('#view iframe, #view img, #view video').count() === 0, e.id + ' draws a frame or a picture');
    await fits(e.id + ' at 390');
    await clean(e.id);
  }
  await go('#/menu/brew/no-such-entry');
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  await expect(page.locator('#view h2')).toHaveText('Coffee and tea'); checks++;

  /* the search: the results alone, the count spoken, focus and history kept */
  await go('#/menu/brew');
  const q = page.locator('#brew-q');
  await q.focus();
  const len0 = await page.evaluate(() => history.length);
  const term = first.name.slice(0, Math.max(4, Math.min(8, first.name.length)));
  await q.pressSequentially(term);
  const want = await page.evaluate((t) => brewEntries().filter((e) => brewSearchText(e).indexOf(t.toLowerCase()) >= 0).length, term);
  await expect(page.locator('#brew-results .brew-row')).toHaveCount(want); checks++;
  await expect(page.locator('#brew-results [role="status"]')).toContainText(want + ' of ' + data.entries.length); checks++;
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'brew-q'), 'typing in the search lost the focus');
  ok(await page.evaluate(() => history.length) === len0, 'typing in the search wrote history');
  await q.fill('zzzz no such drink');
  await expect(page.locator('.brew-empty')).toHaveCount(1); checks++;
  await q.fill('');
  await expect(page.locator('#brew-results .brew-row')).toHaveCount(data.entries.length); checks++;

  /* the chips: a replace, the focus on the chip */
  const grp = data.groups.find((g) => g.id !== 'house' && data.entries.some((e) => e.group === g.id));
  const chip = page.locator('.brew-chips [data-act="brew-group"][data-k="' + grp.id + '"]');
  const len1 = await page.evaluate(() => history.length);
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true'); checks++;
  await expect(page.locator('#brew-results .brew-row')).toHaveCount(data.entries.filter((e) => e.group === grp.id).length); checks++;
  ok(await page.evaluate(() => history.length) === len1, 'a chip wrote history');
  ok(await page.evaluate((k) => !!document.activeElement && document.activeElement.dataset.k === k, grp.id), 'a chip lost the focus');
  await page.locator('.brew-chips [data-act="brew-group"][data-k="all"]').click();

  /* the Back chain */
  await go('#/menu');
  await page.locator('[data-act="menu-view"][data-v="brew"]').click();
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  await page.locator('#brew-q').fill(first.name);
  await page.locator('#brew-results a.brew-row[href="#/menu/brew/' + first.id + '"]').click();
  await expect(page.locator('.brew-detail h2')).toHaveText(first.name); checks++;
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  await expect(page.locator('#brew-q')).toHaveValue(first.name); checks++;
  await page.locator('#brew-q').fill('');
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(/#\/menu$/); checks++;
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(/#\/home$/); checks++;

  /* the keyboard belongs to the page's own controls */
  await go('#/menu/brew/' + first.id);
  const recall = page.locator('.brew-recall summary').first();
  await recall.click();
  await expect(recall.locator('..')).toHaveAttribute('open', ''); checks++;
  await recall.focus();
  const keysBefore = await page.evaluate(() => JSON.stringify({ hash: location.hash, cards: progress.cards, search: !!(typeof search !== 'undefined' && search.open) }));
  for (const key of ['ArrowLeft', 'ArrowRight', '1', '2', '/']) await page.keyboard.press(key);
  ok(await page.evaluate(() => JSON.stringify({ hash: location.hash, cards: progress.cards, search: !!(typeof search !== 'undefined' && search.open) })) === keysBefore, 'a key on an entry left the page or opened the search');
  await go('#/menu/brew');
  await page.locator('#brew-q').focus();
  for (const key of ['1', '2', '/']) await page.keyboard.press(key);
  ok(await page.locator('#brew-q').inputValue() === '12/' && /#\/menu\/brew$/.test(page.url()), 'the search box did not keep its own keys');
  await page.locator('#brew-q').fill('');

  /* a practice run */
  await page.evaluate(() => { progress.cards = {}; saveProgress(); });
  await page.locator('[data-act="brew-practise"][data-deck="brew"]').click();
  await expect(page.locator('.brew-question')).toHaveCount(1); checks++;
  await expect(page.locator('[data-act="fc-grade"]')).toHaveCount(0); checks++;
  const card = await page.evaluate(() => ({ key: cardKey(state.fc.deck[0]), back: state.fc.deck[0].back, item: state.fc.deck[0].itemId }));
  ok(!(await page.locator('#view').innerText()).includes(card.back), 'the blind front shows the answer');
  ok(await page.locator('.study-face img').count() === 0, 'the blind front draws a picture');
  await page.evaluate(() => document.querySelector('#view').insertAdjacentHTML('beforeend', '<button id="forged-grade" data-act="fc-grade" data-ok="1">A forged early grade</button>'));
  await page.locator('#forged-grade').click();
  ok(await page.evaluate((k) => !progress.cards[k] && state.fc.idx === 0, card.key), 'a forged grade before Flip was recorded');
  await page.evaluate(() => { const b = document.getElementById('forged-grade'); if (b) b.remove(); });
  await page.locator('[data-act="fc-flip"]').click();
  await expect(page.locator('.brew-answer')).toContainText(card.back.split('\n')[0].slice(0, 30)); checks++;
  await expect(page.locator('.study-face .brew-boundary')).toHaveText('A general method, not the house build.'); checks++;
  await page.locator('.brew-read-link').click();
  await expect(page.locator('.brew-detail h2')).toHaveText(data.entries.find((e) => e.id === card.item).name); checks++;
  await page.locator('#view [data-act="back"]').click();
  await expect(page.locator('.brew-answer')).toContainText(card.back.split('\n')[0].slice(0, 30)); checks++;
  ok(await page.evaluate((k) => cardKey(state.fc.deck[state.fc.idx]) === k, card.key), 'Back from the entry is not the same revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate((k) => progress.cards[k] && progress.cards[k].w === 1 && Object.keys(progress.cards).length === 1, card.key), 'Again did not write the one Brew Guide key');
  for (let i = 1; i < data.entries.length; i++) { await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="1"]').click(); }
  await expect(page.locator('#view h2')).toHaveText('Deck done'); checks++;
  ok(!(await page.locator('#view').innerText()).includes('Brew Guide'), 'Deck done shows a raw key');
  await go('#/menu/brew');
  await page.evaluate(() => { progress.cards = {}; saveProgress(); render(); });
  await page.locator('[data-act="deck"][data-deck="brew:again"]').click();
  await expect(page.locator('.deck-count')).toContainText('No cards in this deck yet'); checks++;
  ok(await page.locator('[data-act="fc-start"]').count() === 0, 'an empty Due or missed starts a run');

  /* a quiz: one Recent rounds row, Study this card and Back */
  await go('#/menu/brew');
  await page.evaluate(() => { progress.quizzes = []; progress.qa = {}; saveProgress(); });
  const qaBefore = await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels }));
  await page.locator('.brew-practice [data-act="quiz-go"][data-m="brew"]').click();
  const n = await page.evaluate(() => state.quiz.round.length);
  ok(n === Math.min(10, data.entries.length), 'the round deals ' + n);
  await expect(page.locator('#view')).toContainText('Question 1 of ' + n + ' \u00b7 Coffee and tea'); checks++;
  for (let i = 0; i < n; i++) {
    const right = await page.evaluate(() => { const qq = state.quiz.round[state.quiz.idx]; return qq.options.indexOf(qq.answer); });
    await page.locator('[data-act="quiz-pick"][data-i="' + (i === 0 ? (right + 1) % 4 : right) + '"]').click();
    await page.locator('[data-act="quiz-next"]').click();
  }
  await expect(page).toHaveURL(/#\/quiz\/brew\/done$/); checks++;
  ok(await page.evaluate(() => progress.quizzes.length === 1 && progress.quizzes[0].mode === 'brew'), 'the round wrote no single brew row');
  ok(await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels })) === qaBefore, 'the round wrote outside its row');
  const study = page.locator('[data-act="hash"]', { hasText: 'Study this card' });
  await expect(study).toHaveCount(1); checks++;
  await study.click();
  await expect(page).toHaveURL(/#\/menu\/brew\/[a-z0-9-]+$/); checks++;
  await expect(page.locator('.brew-detail h2')).toHaveCount(1); checks++;
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(/#\/quiz\/brew\/done$/); checks++;
  await expect(page.locator('[data-act="hash"]', { hasText: 'Study this card' })).toHaveCount(1); checks++;
  await go('#/quiz');
  await expect(page.locator('.hist-row').first()).toContainText('Coffee and tea'); checks++;

  /* 320, 390 and 1120, day and night */
  for (const width of [320, 390, 1120]) for (const service of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    await go('#/menu/brew');
    await page.evaluate((mode) => OOT.service.set(mode), service);
    await expect(page.locator('html')).toHaveAttribute('data-service', service); checks++;
    await fits(width + ' ' + service + ' index');
    await controls(width + ' ' + service + ' index');
    await clean(width + ' ' + service + ' index');
    if (width !== 1120) await shot('brew-' + width + '-' + service + '-index');
    await go('#/menu/brew/' + first.id);
    await page.evaluate(() => document.querySelectorAll('.brew-detail details').forEach((d) => { d.open = true; }));
    await fits(width + ' ' + service + ' entry');
    await controls(width + ' ' + service + ' entry');
    await clean(width + ' ' + service + ' entry');
    if (width !== 1120) await shot('brew-' + width + '-' + service + '-entry', true);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  /* the house: the shipped engine and pack in this profile alone */
  await go('#/menu/brew');
  if (!await page.evaluate(() => !!(window.OOT && OOT.house))) await page.addScriptTag({ content: await readFile(path.join(shared, 'oot-house.js'), 'utf8') });
  const pack = await readFile(path.join(shared, 'packs/brennans-new-orleans.v1.oothouse.json'), 'utf8');
  await page.evaluate(async (payload) => { await OOT.house.importPack(payload, { mode: 'new' }); await houseSyncIn(); render(); }, pack);
  const house = await page.evaluate(() => {
    const h = hsCurrent(), all = [].concat(h.cocktails || [], h.dishes || []);
    const ids = brewData().house.ids.slice().sort((a, b) => all.findIndex((x) => x.id === a) - all.findIndex((x) => x.id === b));
    const tea = (h.askAtLineup || []).find((a) => a.id === brewData().house.teaAsk);
    return { ids, rows: ids.map((id) => { const it = all.find((x) => x.id === id); return { id, name: it.name, price: it.price, section: it.section }; }), tea: tea && tea.question };
  });
  const drawn = await page.locator('.brew-house-row').evaluateAll((els) => els.map((el) => el.dataset.houseId));
  ok(drawn.join('|') === house.ids.join('|'), 'At the house draws ' + drawn.join(', ') + ', not the menus\u2019 order ' + house.ids.join(', '));
  for (const r of house.rows) {
    const row = page.locator('.brew-house-row[data-house-id="' + r.id + '"]');
    await expect(row.locator('.brew-house-name')).toContainText(r.name); checks++;
    await expect(row.locator('.brew-price')).toHaveText(r.price); checks++;
    await expect(row.locator('.eyebrow')).toHaveText(r.section); checks++;
  }
  await expect(page.locator('.brew-tea-note')).toContainText(house.tea); checks++;
  await page.locator('.brew-house-row[data-house-id="' + house.ids[0] + '"] [data-act="brew-house"]').click();
  await expect(page.locator('.hs-card h2')).toHaveText(house.rows[0].name); checks++;
  await page.locator('#view [data-act="back"]').click();
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  /* the house's word lands on its page with nothing open */
  await page.locator('#bnav [data-cluster="brennans"]').click();
  await expect(page).toHaveURL(/#\/menu$/); checks++;
  await expect(page.locator('#hs-brew-h')).toHaveText('Coffee and tea'); checks++;
  const doors = await page.evaluate(() => ['hs-compass-h', 'hs-brew-h', 'hs-producers-h'].map((id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY : -1; }));
  ok(doors.every((t) => t >= 0) && doors[0] < doors[1] && doors[1] < doors[2], 'the door does not stand between The Bar Compass and the producers: ' + doors.join(', '));
  const jumps = await page.locator('.hs-jumps [data-act="hs-jump"]').evaluateAll((els) => els.map((el) => el.dataset.to));
  ok(jumps.indexOf('hs-brew-h') === jumps.indexOf('hs-compass-h') + 1 && jumps.indexOf('hs-producers-h') === jumps.indexOf('hs-brew-h') + 1, 'the jump row reads ' + jumps.join(', '));
  const len2 = await page.evaluate(() => history.length);
  await page.locator('.hs-jumps [data-act="hs-jump"][data-to="hs-brew-h"]').click();
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'hs-brew-h'), 'the jump did not focus the Coffee and tea heading');
  ok(await page.evaluate(() => history.length) === len2 && /#\/menu$/.test(page.url()), 'the jump wrote an address or an entry');
  await page.locator('a.brew-door').click();
  await expect(page).toHaveURL(/#\/menu\/brew$/); checks++;
  ok(!outside.length, 'a render asked YouTube or its pictures: ' + outside.slice(0, 3).join(' '));
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  await context.close();

  /* a reload with the network off, in a profile that installs the worker */
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const off = await offline.newPage();
  off.on('pageerror', (e) => errors.push(e.message));
  await off.goto(base + '/#/menu/brew');
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  const cached = await off.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((x) => /^(oot-)?ledger-v/.test(x)));
    return Promise.all(['css/brew.css', 'js/data-brew.js', 'js/ui-brew.js'].map(async (p) => !!await cache.match(new URL(p, location.href))));
  });
  ok(cached.every(Boolean), 'the worker does not cache the three new files');
  await offline.setOffline(true);
  await off.reload();
  await off.waitForFunction(() => typeof brewEntries === 'function' && !!document.querySelector('#view h2'));
  await expect(off.locator('#view h2')).toHaveText('Coffee and tea'); checks++;
  await off.locator('#brew-results a.brew-row').first().click();
  await expect(off.locator('.brew-detail h2')).toHaveText(first.name); checks++;
  await expect(off.locator('.brew-watch')).toContainText('needs a connection'); checks++;
  await off.locator('[data-act="brew-practise"]').click();
  await off.locator('[data-act="fc-flip"]').click();
  await expect(off.locator('.brew-answer')).toBeVisible(); checks++;
  await offline.close();
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  const result = { status: 'passed', checks, preview: base, entries: data.entries.length, houseRows: house.ids.length, outsideRequests: outside.length, offline: true, browserErrors: errors };
  if (out) await writeFile(path.join(out, 'brew-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
