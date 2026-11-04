/* The liquor shelf (4 November 2026), in a real browser with a disposable
   profile. LEDGER_URL (or LEDGER_PREVIEW_URL) names the served Ledger, the
   source or a published preview (serve the source from a root whose shared/
   holds the House engine and the pack, at /ledger/); LEDGER_PLAYWRIGHT (or
   PLAYWRIGHT_MODULE) names playwright or @playwright/test when neither is
   beside this checkout; OOT_SHARED names the House engine and the pack (else
   ../WorldTable/static/shared beside this checkout); LEDGER_QA_OUTPUT, when
   set, takes screenshots and the result.

   It holds: the cold addresses (the shelf, every bottle, a bad id), the shelf
   and a bottle drawn (the heading, the groups, the rows, To confirm at the
   bar, the sections, the lines), the search (the results alone repainted,
   the count in role=status, focus and history kept), the Back chain (a
   bottle, the shelf, Bar studies, the menu, Home), the keyboard left to the
   page's own controls, a recall run through the real handlers (a blind
   front, a forged early grade refused, the answer after Flip, the bottle read
   and Back to the same card, our key only, a readable Deck done, an empty Due
   or missed), a quiz round through the real handlers (one Recent rounds row
   in mode backbar, nothing else written, Study this card and Back keeping the
   results), 320, 390 and 1120 in day and night service (nothing wider than
   the screen, every control 44px, no dash and no mark at or above U+2190 on
   the page), no request to a video host on any render, the house's drinks
   read live with the house card and Back, and a reload with the network off. */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const pw = require(process.env.LEDGER_PLAYWRIGHT || process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const chromium = pw.chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.LEDGER_URL || process.env.LEDGER_PREVIEW_URL || 'http://127.0.0.1:8782').replace(/\/$/, '');
const shared = process.env.OOT_SHARED || path.resolve(root, '../WorldTable/static/shared');
const out = process.env.LEDGER_QA_OUTPUT;
const browser = await chromium.launch({ headless: true });
const errors = [];
const outside = [];
let checks = 0;
function ok(value, label) { if (!value) throw Error(label); checks++; }
/* wait until fn() in the page is true, or fail with the label */
async function until(page, fn, arg, label, timeout = 12000) {
  try { await page.waitForFunction(fn, arg, { timeout }); checks++; } catch (e) { throw Error(label + ' (timed out)'); }
}
const DASH = /[\u2012-\u2015]|&[mn]dash;| \x2d\x2d /;
const VIDEO = /youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com|youtube-nocookie|vimeo\.com|vimeocdn\.com/;
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'America/New_York' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', (e) => errors.push(e.message));
/* nothing on a render may ask a video host or its picture host for anything */
page.on('request', (r) => { if (VIDEO.test(r.url())) outside.push(r.url()); });
let visit = 0;
async function go(hash) {
  await page.goto(base + '/?nosw&backbarqa=' + (++visit) + hash);
  await page.waitForFunction(() => typeof backbarEntries === 'function' && backbarEntries().length > 0 && !!document.querySelector('#view h2, #view [data-act="back"]'));
}
const text = (sel) => page.locator(sel).first().innerText();
/* the words as written, before a stylesheet sets them in capitals */
const words = (sel) => page.locator(sel).first().evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
const count = (sel) => page.locator(sel).count();
async function fits(label) { ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' fits the screen'); }
async function shot(name, fullPage = false) { if (out) await page.screenshot({ path: path.join(out, name + '.png'), fullPage }); }
/* the page's own words: no dash, nothing at or above U+2190 */
async function clean(label) {
  const t = await page.locator('#view').innerText();
  const m = t.match(DASH);
  ok(!m, label + ' carries a dash (' + (m && m[0]) + ')');
  const high = [...t].find((c) => c.codePointAt(0) >= 0x2190);
  ok(!high, label + ' carries U+' + (high ? high.codePointAt(0).toString(16).toUpperCase() : ''));
}
async function controls(label) {
  const small = await page.locator('.house-sections .tab-btn, .house-subsections .tab-btn, .backbar-index .btn, .backbar-index input, .backbar-index a.backbar-row, .backbar-detail .btn, .backbar-detail summary, .backbar-detail a.hs-link, .backbar-sources a')
    .evaluateAll((els) => els.filter((el) => el.getClientRects().length).map((el) => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, t: (el.textContent || el.id || '').trim().slice(0, 40) }))
      .filter((s) => s.h < 43.5 || s.w < 43.5));
  ok(!small.length, label + ': controls under 44px ' + JSON.stringify(small));
}
async function backTap() { await page.locator('#view [data-act="back"]').click(); }
const urlIs = (re, label) => until(page, (src) => new RegExp(src).test(location.href), re.source, label);
try {
  if (out) await mkdir(out, { recursive: true });
  await go('#/menu/backbar');
  const data = await page.evaluate(() => ({ entries: backbarEntries(), confirm: backbarConfirm(), groups: backbarGroups() }));
  const first = data.entries[0];

  /* the cold shelf */
  ok((await text('#view h2')) === 'The liquor shelf', 'the shelf\u2019s heading');
  ok(await count('#view [data-act="back"]') === 1, 'one Back on the shelf');
  const subs = await page.locator('.house-sections .tab-btn').evaluateAll((els) => els.map((el) => ({ t: el.textContent.trim(), on: el.getAttribute('aria-current') === 'page' })));
  ok(subs.map((s) => s.t).join('|') === 'Menu|Bar studies|Service rehearsal|House reference' && subs[1].on && subs.filter((s) => s.on).length === 1, 'Bar studies is not the lit learning section: ' + JSON.stringify(subs));
  const pages = await page.locator('.house-subsections .tab-btn').evaluateAll((els) => els.map((el) => ({ v: el.dataset.v, on: el.getAttribute('aria-current') === 'page' })));
  ok(pages.map((p) => p.v).indexOf('backbar') === pages.map((p) => p.v).indexOf('brew') + 1, 'The liquor shelf is not after Coffee and tea: ' + pages.map((p) => p.v).join(', '));
  ok(pages.find((p) => p.v === 'backbar').on, 'The liquor shelf is not the current page');
  ok(await count('[data-act="backbar-practise"][data-deck="backbar"]') === 1 && await count('.backbar-practice [data-act="quiz-go"][data-m="backbar"]') === 1, 'Practise the cards and Take the quiz');
  ok(await page.locator('label[for="backbar-q"]').count() === 1, 'the search is not labelled');
  ok(await count('#backbar-results .backbar-row') === data.entries.length, 'every bottle a row');
  ok(await count('#backbar-results .backbar-confirm-row') === data.confirm.length, 'every bottle to confirm');
  const heads = await page.locator('.backbar-group-h').evaluateAll((els) => els.map((el) => el.id.replace('backbar-g-', '')));
  ok(heads[heads.length - 1] === 'confirm' || !data.confirm.length, 'To confirm at the bar is not last: ' + heads.join(', '));
  ok(heads.join('|') === data.groups.map((x) => x.id).filter((id) => heads.includes(id)).join('|'), 'the groups are not the bar\u2019s order: ' + heads.join(', '));
  if (data.confirm.length) {
    const c = data.confirm[0];
    const row = await words('#backbar-c-' + c.id);
    ok(row.includes('Photograph ' + c.photo) && row.includes(c.ask), 'a confirm row\u2019s photograph and question');
  }
  await fits('the shelf at 390');
  await clean('the shelf');

  /* every bottle, cold */
  for (const e of data.entries) {
    await go('#/menu/backbar/' + e.id);
    ok((await text('.backbar-detail h2')) === e.name, e.id + ' heading');
    ok(await count('#view [data-act="back"]') === 1, e.id + ' one Back');
    for (const h of ['table', 'pour', 'house', 'facts', 'guest', 'story', 'watchfor', 'links', 'recall']) ok(await count('#backbar-d-' + h) === 1, e.id + ': no ' + h);
    ok((await text('.backbar-s45')) === e.lines.s45, e.id + ': the forty-five');
    ok(await page.locator('.backbar-recall[open], .backbar-sources[open]').count() === 0, e.id + ': recall or sources drawn open');
    ok(await page.locator('#view iframe, #view img, #view video').count() === 0, e.id + ' draws a frame or a picture');
    await fits(e.id + ' at 390');
    await clean(e.id);
  }
  await go('#/menu/backbar/no-such-bottle');
  await urlIs(/#\/menu\/backbar$/, 'a bad id does not land on the shelf');
  ok((await text('#view h2')) === 'The liquor shelf', 'a bad id\u2019s heading');

  /* the search: the results alone, the count spoken, focus and history kept */
  await go('#/menu/backbar');
  const q = page.locator('#backbar-q');
  await q.focus();
  const len0 = await page.evaluate(() => history.length);
  const term = first.name.slice(0, Math.max(4, Math.min(8, first.name.length))).toLowerCase();
  await q.pressSequentially(term);
  const want = await page.evaluate((t) => backbarEntries().filter((e) => backbarSearchText(e).indexOf(t) >= 0).length, term);
  await until(page, (n) => document.querySelectorAll('#backbar-results .backbar-row').length === n, want, 'the search shows ' + want + ' rows');
  ok((await text('#backbar-results [role="status"]')).includes(want + ' of ' + data.entries.length), 'the spoken count');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'backbar-q'), 'typing in the search lost the focus');
  ok(await page.evaluate(() => history.length) === len0, 'typing in the search wrote history');
  await q.fill('zzzz no such bottle');
  await until(page, () => !!document.querySelector('.backbar-empty'), null, 'no empty line');
  await q.fill('');
  await until(page, (n) => document.querySelectorAll('#backbar-results .backbar-row').length === n, data.entries.length, 'the search cleared');

  /* the Back chain */
  await go('#/menu');
  await page.locator('.house-sections [data-v="studies"]').click();
  await urlIs(/#\/menu\/view\/studies$/, 'Bar studies');
  ok(await count('a.backbar-door') === 1, 'Bar studies has no door to the shelf');
  await page.locator('.house-subsections [data-v="backbar"]').click();
  await urlIs(/#\/menu\/backbar$/, 'the sub-nav to the shelf');
  await page.locator('#backbar-q').fill(first.name);
  await page.locator('#backbar-results a.backbar-row[href="#/menu/backbar/' + first.id + '"]').click();
  await until(page, (n) => { const h = document.querySelector('.backbar-detail h2'); return !!h && h.textContent === n; }, first.name, 'the row opens the bottle');
  await backTap();
  await urlIs(/#\/menu\/backbar$/, 'Back from a bottle to the shelf');
  ok(await page.locator('#backbar-q').inputValue() === first.name, 'Back lost the search');
  await page.locator('#backbar-q').fill('');
  await backTap();
  await urlIs(/#\/menu\/view\/studies$/, 'Back from the shelf to Bar studies');
  await backTap();
  await urlIs(/#\/menu$/, 'Back to the menu');
  await backTap();
  await urlIs(/#\/home$/, 'Back to Home');

  /* the keyboard belongs to the page's own controls */
  await go('#/menu/backbar/' + first.id);
  const recall = page.locator('.backbar-recall summary').first();
  await recall.click();
  ok(await page.locator('.backbar-recall[open]').count() === 1, 'the recall disclosure does not open');
  await recall.focus();
  const keysBefore = await page.evaluate(() => JSON.stringify({ hash: location.hash, cards: progress.cards }));
  for (const key of ['ArrowLeft', 'ArrowRight', '1', '2', '/']) await page.keyboard.press(key);
  ok(await page.evaluate(() => JSON.stringify({ hash: location.hash, cards: progress.cards })) === keysBefore, 'a key on a bottle left the page');
  await go('#/menu/backbar');
  await page.locator('#backbar-q').focus();
  for (const key of ['1', '2', '/']) await page.keyboard.press(key);
  ok(await page.locator('#backbar-q').inputValue() === '12/' && /#\/menu\/backbar$/.test(page.url()), 'the search box did not keep its own keys');
  await page.locator('#backbar-q').fill('');

  /* a recall run through the real handlers */
  await page.evaluate(() => { progress.cards = {}; saveProgress(); });
  await page.locator('[data-act="backbar-practise"][data-deck="backbar"]').click();
  await until(page, () => !!document.querySelector('.backbar-question'), null, 'the blind front');
  ok(await count('[data-act="fc-grade"]') === 0, 'the front offers a grade');
  const card = await page.evaluate(() => ({ key: cardKey(state.fc.deck[0]), back: state.fc.deck[0].back, item: state.fc.deck[0].itemId }));
  ok(!(await page.locator('#view').innerText()).includes(card.back), 'the blind front shows the answer');
  await page.evaluate(() => document.querySelector('#view').insertAdjacentHTML('beforeend', '<button id="forged-grade" data-act="fc-grade" data-ok="1">A forged early grade</button>'));
  await page.locator('#forged-grade').click();
  ok(await page.evaluate((k) => !progress.cards[k] && state.fc.idx === 0, card.key), 'a forged grade before Flip was recorded');
  await page.evaluate(() => { const b = document.getElementById('forged-grade'); if (b) b.remove(); });
  await page.locator('[data-act="fc-flip"]').click();
  await until(page, (t) => { const a = document.querySelector('.backbar-answer'); return !!a && a.textContent.indexOf(t) >= 0; }, card.back.slice(0, 30), 'the answer after Flip');
  await page.locator('.backbar-read-link').click();
  await until(page, (n) => { const h = document.querySelector('.backbar-detail h2'); return !!h && h.textContent === n; }, data.entries.find((e) => e.id === card.item).name, 'Learn why opens the bottle');
  await backTap();
  await until(page, () => !!document.querySelector('.backbar-answer'), null, 'Back from the bottle to the revealed card');
  ok(await page.evaluate((k) => cardKey(state.fc.deck[state.fc.idx]) === k, card.key), 'Back from the bottle is not the same revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate((k) => progress.cards[k] && progress.cards[k].w === 1 && Object.keys(progress.cards).length === 1, card.key), 'Again did not write the one Back Bar key');
  for (let i = 1; i < data.entries.length; i++) { await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="1"]').click(); }
  await until(page, () => { const h = document.querySelector('#view h2'); return !!h && h.textContent === 'Deck done'; }, null, 'Deck done');
  ok(!(await page.locator('#view').innerText()).includes('Back Bar \u00b7'), 'Deck done shows a raw key');
  await go('#/menu/backbar');
  await page.evaluate(() => { progress.cards = {}; saveProgress(); render(); });
  await page.locator('[data-act="deck"][data-deck="backbar:again"]').click();
  await until(page, () => /No cards in this deck yet/.test((document.querySelector('.deck-count') || {}).textContent || ''), null, 'an empty Due or missed');
  ok(await count('[data-act="fc-start"]') === 0, 'an empty Due or missed starts a run');

  /* a quiz round through the real handlers */
  await go('#/menu/backbar');
  await page.evaluate(() => { progress.quizzes = []; progress.qa = {}; saveProgress(); });
  const before = await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels }));
  await page.locator('.backbar-practice [data-act="quiz-go"][data-m="backbar"]').click();
  await until(page, () => !!(state.quiz.round && state.quiz.round.length), null, 'the round is dealt');
  const n = await page.evaluate(() => state.quiz.round.length);
  ok(n === Math.min(10, data.entries.length), 'the round deals ' + n);
  ok((await page.locator('#view').innerText()).includes('Question 1 of ' + n + ' \u00b7 The liquor shelf'), 'the round is not labelled The liquor shelf');
  for (let i = 0; i < n; i++) {
    const right = await page.evaluate(() => { const qq = state.quiz.round[state.quiz.idx]; return qq.options.indexOf(qq.answer); });
    await page.locator('[data-act="quiz-pick"][data-i="' + (i === 0 ? (right + 1) % 4 : right) + '"]').click();
    await page.locator('[data-act="quiz-next"]').click();
  }
  await urlIs(/#\/quiz\/backbar\/done$/, 'the round\u2019s results');
  ok(await page.evaluate(() => progress.quizzes.length === 1 && progress.quizzes[0].mode === 'backbar'), 'the round wrote no single backbar row');
  ok(await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels })) === before, 'the round wrote outside its row');
  const study = page.locator('[data-act="hash"]', { hasText: 'Study this card' });
  ok(await study.count() === 1, 'Study this card for the one miss');
  await study.click();
  await urlIs(/#\/menu\/backbar\/[a-z0-9-]+$/, 'Study this card opens the bottle');
  ok(await count('.backbar-detail h2') === 1, 'the bottle drawn from the results');
  await backTap();
  await urlIs(/#\/quiz\/backbar\/done$/, 'Back to the results');
  ok(await page.locator('[data-act="hash"]', { hasText: 'Study this card' }).count() === 1, 'Back lost the results');
  await go('#/quiz');
  ok((await text('.hist-row')).includes('The liquor shelf'), 'Recent rounds shows no liquor shelf row');

  /* 320, 390 and 1120, day and night */
  for (const width of [320, 390, 1120]) for (const service of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    await go('#/menu/backbar');
    await page.evaluate((mode) => OOT.service.set(mode), service);
    await until(page, (m) => document.documentElement.getAttribute('data-service') === m, service, width + ' ' + service + ' service');
    await fits(width + ' ' + service + ' shelf');
    await controls(width + ' ' + service + ' shelf');
    await clean(width + ' ' + service + ' shelf');
    if (width !== 1120) await shot('backbar-' + width + '-' + service + '-shelf');
    await go('#/menu/backbar/' + first.id);
    await page.evaluate(() => document.querySelectorAll('.backbar-detail details').forEach((d) => { d.open = true; }));
    await fits(width + ' ' + service + ' bottle');
    await controls(width + ' ' + service + ' bottle');
    await clean(width + ' ' + service + ' bottle');
    if (width !== 1120) await shot('backbar-' + width + '-' + service + '-bottle', true);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  /* the house: the shipped engine and pack in this profile alone */
  await go('#/menu/backbar');
  if (!await page.evaluate(() => !!(window.OOT && OOT.house))) await page.addScriptTag({ content: await readFile(path.join(shared, 'oot-house.js'), 'utf8') });
  const pack = await readFile(path.join(shared, 'packs/brennans-new-orleans.v1.oothouse.json'), 'utf8');
  await page.evaluate(async (payload) => { await OOT.house.importPack(payload, { mode: 'new' }); await houseSyncIn(); render(); }, pack);
  const house = await page.evaluate(() => {
    const h = hsCurrent();
    return { name: h.name, uses: backbarEntries().map((e) => ({ id: e.id, uses: backbarUses(h, e).map((x) => ({ id: x.id, name: x.name })), family: backbarFamily(h, e).map((x) => x.id) })) };
  });
  ok((await words('.backbar-heading .eyebrow')) === house.name + ' \u00b7 The liquor shelf', 'the shelf\u2019s eyebrow does not read the house');
  const used = house.uses.find((u) => u.uses.some((x) => /^b-/.test(x.id)));
  let houseCard = false;
  if (used) {
    const item = used.uses.find((x) => /^b-/.test(x.id));
    await page.locator('#backbar-results a.backbar-row[href="#/menu/backbar/' + used.id + '"]').click();
    await until(page, () => !!document.querySelector('.backbar-detail'), null, 'the bottle with a house drink');
    const rows = await page.locator('.backbar-use-row').evaluateAll((els) => els.map((el) => el.dataset.houseId));
    ok(rows.join('|') === used.uses.map((x) => x.id).join('|'), 'At the house draws ' + rows.join(', '));
    ok(!/[$\u00a3\u20ac]/.test(await page.locator('#view').innerText()), 'a price drawn with the house loaded');
    await page.locator('.backbar-use-row[data-house-id="' + item.id + '"] [data-act="backbar-house"]').click();
    await until(page, (nm) => { const h = document.querySelector('.hs-card h2'); return !!h && h.textContent === nm; }, item.name, 'Open the house card');
    await backTap();
    await urlIs(new RegExp('#/menu/backbar/' + used.id + '$'), 'Back from the house card to the bottle');
    houseCard = true;
  }
  const fam = house.uses.find((u) => u.family.length);
  if (fam) {
    /* in the app, so the house stays woken: From the same house and the house's producer profile */
    await page.evaluate((id) => gotoHash('#/menu/backbar/' + id), fam.id);
    await urlIs(new RegExp('#/menu/backbar/' + fam.id + '$'), 'the bottle with a producer profile');
    ok(await count('.backbar-family-row') === fam.family.length, 'From the same house draws ' + await count('.backbar-family-row') + ' profiles, not ' + fam.family.length);
    const profile = page.locator('.backbar-links a[href^="#/producers/house/"]').first();
    if (await profile.count()) {
      const href = await profile.getAttribute('href');
      await profile.click();
      await urlIs(new RegExp(href.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$'), 'the house producer profile');
      await backTap();
      await urlIs(new RegExp('#/menu/backbar/' + fam.id + '$'), 'Back from the profile to the bottle');
    }
  }
  ok(!outside.length, 'a render asked a video host: ' + outside.slice(0, 3).join(' '));
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  await context.close();

  /* a reload with the network off, in a profile that installs the worker */
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const off = await offline.newPage();
  off.on('pageerror', (e) => errors.push(e.message));
  off.on('request', (r) => { if (VIDEO.test(r.url())) outside.push(r.url()); });
  await off.goto(base + '/#/menu/backbar');
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  const cached = await off.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((x) => /^(oot-)?ledger-v/.test(x)));
    return Promise.all(['css/backbar.css', 'js/data-backbar.js', 'js/ui-backbar.js'].map(async (p) => !!await cache.match(new URL(p, location.href))));
  });
  ok(cached.every(Boolean), 'the worker does not cache the three new files');
  await offline.setOffline(true);
  await off.reload();
  await off.waitForFunction(() => typeof backbarEntries === 'function' && !!document.querySelector('#view h2'));
  ok((await off.locator('#view h2').first().innerText()) === 'The liquor shelf', 'the shelf offline');
  await off.locator('#backbar-results a.backbar-row').first().click();
  await off.waitForFunction((nm) => { const h = document.querySelector('.backbar-detail h2'); return !!h && h.textContent === nm; }, first.name);
  checks++;
  await off.locator('[data-act="backbar-practise"]').click();
  await off.locator('[data-act="fc-flip"]').click();
  await off.waitForFunction(() => !!document.querySelector('.backbar-answer'));
  checks++;
  await offline.close();
  ok(!outside.length, 'a render asked a video host: ' + outside.slice(0, 3).join(' '));
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  const result = { status: 'passed', checks, preview: base, bottles: data.entries.length, confirm: data.confirm.length, houseCard, videoRequests: outside.length, offline: true, browserErrors: errors };
  if (out) await writeFile(path.join(out, 'backbar-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
