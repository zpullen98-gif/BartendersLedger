/* Producers and flagships (23 November 2026), in a real browser with a
   disposable profile, on tools/check-caskstyles-browser.mjs's model and
   harness. LEDGER_URL (or LEDGER_PREVIEW_URL) names the served Ledger, the
   source (py serve.py 8782) or a published preview; LEDGER_PLAYWRIGHT (or
   PLAYWRIGHT_MODULE) names playwright or @playwright/test when neither is
   beside this checkout; LEDGER_AXE names axe-core's axe.min.js (else the one
   beside the Playwright module; absent is a note and skips the scoped
   accessibility pass); LEDGER_QA_OUTPUT, when set, takes screenshots and the
   result.

   It holds: the cold addresses (the root, every group, every house, a bad
   house landing on its group and a bad group on the root), the root drawn
   (its heading, the families in order, every group a row, no word of a
   partial or unrefuted build), a group drawn (the five houses as cards in
   the roster's order), a house drawn (the label, At the table, the flagship,
   the story, Recall and Sources closed, Previous and Next within the group,
   no picture), the Back chain (a house by its card, its group, the root, the
   Whisky & Brandy tab, Home), the doors in (the Atlas home's door, a style's
   Five producers, a liquor shelf bottle's producer door and a Library
   producer's door, each with Back to where it was opened), the search box,
   a recall run through the real handlers (a blind front, the answer after
   Flip, the house read and Back to the same card, our key only, a readable
   Deck done), a group's quiz round through the real handlers (ten questions
   labelled Producers and flagships, one Recent rounds row in mode
   caskhouses, nothing else written, Study this card and Back keeping the
   results), 375 and 390 in day and night service (nothing wider than the
   screen, every control 44px, no dash and no mark at or above U+2190 on the
   page, the scoped accessibility pass), a clean console, and a reload with
   the network off. The model has no mutation pass, so neither has this. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const { readFileSync } = await import('node:fs');
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\s?/, ''));
  process.exit(0);
}
const PW = process.env.LEDGER_PLAYWRIGHT || process.env.PLAYWRIGHT_MODULE || '@playwright/test';
const pw = require(PW);
const chromium = pw.chromium;
const base = (process.env.LEDGER_URL || process.env.LEDGER_PREVIEW_URL || 'http://127.0.0.1:8782').replace(/\/$/, '');
const out = process.env.LEDGER_QA_OUTPUT;
let axePath = process.env.LEDGER_AXE || '';
if (!axePath) { try { axePath = path.join(path.dirname(require.resolve(PW + '/package.json')), '..', 'axe-core', 'axe.min.js'); } catch (e) { axePath = ''; } }
const AXE = axePath && existsSync(axePath) ? axePath : '';
const browser = await chromium.launch({ headless: true });
const errors = [];
const notes = [];
let checks = 0;
function ok(value, label) { if (!value) throw Error(label); checks++; }
async function until(page, fn, arg, label, timeout = 12000) {
  try { await page.waitForFunction(fn, arg, { timeout }); checks++; } catch (e) { throw Error(label + ' (timed out)'); }
}
const DASH = /[‒-―]|&[mn]dash;| \x2d\x2d /;
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'America/New_York' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
let visit = 0;
async function go(hash) {
  await page.goto(base + '/?nosw&caskhousesqa=' + (++visit) + hash);
  try { await page.waitForFunction(() => typeof caskHouseRecords === 'function' && caskHouseRecords().length > 0 && !!document.querySelector('#view h2, #view [data-act="back"]'), null, { timeout: 30000 }); }
  catch (e) { throw Error('the page at ' + hash + ' did not draw (timed out)'); }
}
const text = (sel) => page.locator(sel).first().innerText();
const count = (sel) => page.locator(sel).count();
async function fits(label) { ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' fits the screen'); }
async function shot(name, fullPage = false) { if (out) await page.screenshot({ path: path.join(out, name + '.png'), fullPage }); }
async function clean(label) {
  const t = await page.locator('#view').innerText();
  const m = t.match(DASH);
  ok(!m, label + ' carries a dash (' + (m && m[0]) + ')');
  const high = [...t].find((c) => c.codePointAt(0) >= 0x2190);
  ok(!high, label + ' carries U+' + (high ? high.codePointAt(0).toString(16).toUpperCase() : ''));
}
async function controls(label) {
  const small = await page.locator('.caskhouse-page .btn, .caskhouse-page summary, .caskhouse-page a.caskhouse-grow, .caskhouse-page a.caskhouse-card, .caskhouse-page a.caskhouse-hit, .caskhouse-sources a, #caskhouse-home .btn')
    .evaluateAll((els) => els.filter((el) => el.getClientRects().length).map((el) => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, t: (el.textContent || el.id || '').trim().slice(0, 40) }))
      .filter((s) => s.h < 43.5 || s.w < 43.5));
  ok(!small.length, label + ': controls under 44px ' + JSON.stringify(small));
}
async function axe(scope, label) {
  if (!AXE) return;
  if (!await page.evaluate(() => typeof axe !== 'undefined')) await page.addScriptTag({ path: AXE });
  const v = await page.evaluate(async (sel) => {
    const r = await axe.run({ include: [[sel]] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return r.violations.map((x) => ({ id: x.id, n: x.nodes.slice(0, 3).map((nd) => nd.target.join(' ')) }));
  }, scope);
  ok(!v.length, label + ': accessibility ' + JSON.stringify(v));
}
async function backTap() { await page.locator('#view [data-act="back"]').click(); }
const urlIs = (re, label) => until(page, (src) => new RegExp(src).test(location.href), re.source, label);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const h2Is = (name, label) => until(page, (n) => { const h = document.querySelector('#view h2'); return !!h && h.textContent === n; }, name, label);
try {
  if (out) await mkdir(out, { recursive: true });
  if (!AXE) notes.push('no axe-core beside the Playwright module (LEDGER_AXE names one): the scoped accessibility pass is skipped');
  await go('#/casks/houses');
  const data = await page.evaluate(() => ({
    meta: caskHouseMeta(), families: caskHouseFamilies(),
    groups: caskHouseGroups().map((g) => ({ key: g.key, title: g.title, family: g.family, style: g.style, chapter: g.chapter, houses: g.houses })),
    houses: caskHouseRecords().map((r) => ({ key: r.key, group: r.group, producer: r.producer, name: r.bottle && r.bottle.name, shelf: r.shelf, library: r.library, slug: r.library ? slugify(r.library) : '' })),
  }));
  const H = (k) => data.houses.find((h) => h.key === k);
  const G = (k) => data.groups.find((g) => g.key === k);
  ok(data.groups.length === Number(data.meta.roster.groups) && data.meta.partial === false && Number(data.meta.unrefuted) === 0, 'the data is not the whole refuted roster');

  /* the cold root */
  ok((await text('#view h2')) === 'Producers and flagships', 'the root’s heading');
  ok(await count('.caskhouse-partial') === 0, 'the root speaks of a partial or unrefuted build');
  const fams = await page.locator('.caskhouse-family-h').evaluateAll((els) => els.map((el) => el.childNodes[0].textContent.trim()));
  ok(fams.join('|') === data.families.join('|'), 'the families are not in order: ' + fams.join(', '));
  const rows = await page.locator('.caskhouse-root a.caskhouse-grow').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  const wantRows = data.families.flatMap((f) => data.groups.filter((g) => g.family === f)).map((g) => '#/casks/houses/' + g.key);
  ok(rows.join('|') === wantRows.join('|'), 'every group a row, in order');
  await fits('the root at 390');
  await clean('the root');

  /* every group, cold, and every house, cold */
  for (const g of data.groups) {
    await go('#/casks/houses/' + g.key);
    ok((await text('.caskhouse-group h2')) === g.title, g.key + ' heading');
    ok(await count('#view [data-act="back"]') === 1, g.key + ' one Back');
    const cards = await page.locator('.caskhouse-cards a.caskhouse-card').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    ok(cards.join('|') === g.houses.map((k) => '#/casks/houses/' + g.key + '/' + k).join('|'), g.key + ': the five houses in order');
    await fits(g.key + ' at 390');
    await clean(g.key);
    for (let i = 0; i < g.houses.length; i++) {
      const h = H(g.houses[i]);
      await go('#/casks/houses/' + g.key + '/' + h.key);
      ok((await text('.caskhouse-house h2')) === h.producer, h.key + ' heading');
      ok((await text('.caskhouse-bottle-name')) === h.name, h.key + ': the flagship');
      const secs = await page.locator('.caskhouse-house .caskhouse-panel').evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby').replace('caskhouse-p-', '')));
      ok(secs[0] === 'table' && secs.includes('story') && secs.includes('recall'), h.key + ': the sections read ' + secs.join(', '));
      ok(await page.locator('.caskhouse-recall[open], .caskhouse-sources[open]').count() === 0, h.key + ': recall or sources drawn open');
      ok(await page.locator('#view iframe, #view img, #view video').count() === 0, h.key + ' draws a frame or a picture');
      ok(await count('.caskhouse-prev') === (i > 0 ? 1 : 0) && await count('.caskhouse-next') === (i < g.houses.length - 1 ? 1 : 0), h.key + ': Previous and Next');
      await fits(h.key + ' at 390');
      await clean(h.key);
    }
  }
  await go('#/casks/houses/' + data.groups[0].key + '/no-such-house');
  await urlIs(new RegExp('#/casks/houses/' + data.groups[0].key + '$'), 'a bad house does not land on its group');
  await go('#/casks/houses/no-such-group');
  await urlIs(/#\/casks\/houses$/, 'a bad group does not land on the root');

  /* the Back chain: a house by its card, the group, the root, the Whisky & Brandy tab, Home */
  const wg = G('wheated-bourbon') || data.groups[0];
  const wh = H(wg.houses.includes('pappy-van-winkle') ? 'pappy-van-winkle' : wg.houses[0]);
  await page.goto(base + '/?nosw&caskhousesqa=' + (++visit) + '#/casks');
  await page.waitForFunction(() => !!document.querySelector('#caskhouse-home'));
  checks++;
  await page.locator('#caskhouse-root-door').click();
  await urlIs(/#\/casks\/houses$/, 'the Atlas home’s door opens the root');
  await page.locator('#caskhouse-g-' + wg.key).click();
  await urlIs(new RegExp('#/casks/houses/' + wg.key + '$'), 'the row opens the group');
  await page.locator('#caskhouse-h-' + wh.key).click();
  await urlIs(new RegExp('#/casks/houses/' + wg.key + '/' + wh.key + '$'), 'the card opens the house');
  await h2Is(wh.producer, 'the house drawn');
  await backTap();
  await urlIs(new RegExp('#/casks/houses/' + wg.key + '$'), 'Back from the house to its group');
  await backTap();
  await urlIs(/#\/casks\/houses$/, 'Back from the group to the root');
  await backTap();
  await urlIs(/#\/casks$/, 'Back from the root to the Whisky & Brandy tab');
  ok((await text('#view h2')) === 'The Cask Atlas', 'the Whisky & Brandy tab drawn');
  await backTap();
  await urlIs(/#\/home$/, 'Back to Home');

  /* the doors in: a style, a shelf bottle, the Library */
  const sg = data.groups.find((g) => g.style);
  await go('#/casks/style/' + sg.style);
  await page.locator('#caskstyle-producers-' + sg.key).click();
  await urlIs(new RegExp('#/casks/houses/' + sg.key + '$'), 'a style’s Five producers opens its group');
  await backTap();
  await urlIs(new RegExp('#/casks/style/' + esc(sg.style) + '$'), 'Back from the group to the style');
  const sh = data.houses.find((h) => h.shelf);
  await go('#/menu/backbar/' + sh.shelf);
  await page.locator('#backbar-producer-' + sh.key).click();
  await urlIs(new RegExp('#/casks/houses/' + sh.group + '/' + sh.key + '$'), 'a shelf bottle’s door opens the house');
  await page.locator('.caskhouse-house a.caskhouse-bottle').waitFor();
  checks++;
  await backTap();
  await urlIs(new RegExp('#/menu/backbar/' + esc(sh.shelf) + '$'), 'Back from the house to the bottle');
  const lh = data.houses.find((h) => h.library);
  await go('#/producers/' + lh.slug);
  await page.locator('#caskhouse-ld-' + lh.key).click();
  await urlIs(new RegExp('#/casks/houses/' + lh.group + '/' + lh.key + '$'), 'a Library producer’s door opens the house');
  await page.locator('.caskhouse-library-door').waitFor();
  checks++;
  await backTap();
  await urlIs(new RegExp('#/producers/' + esc(lh.slug) + '$'), 'Back from the house to the Library');

  /* the search box */
  await go('#/casks/houses');
  await page.locator('#caskhouse-q').fill(wh.producer);
  await page.locator('#caskhouse-s-' + wh.key).waitFor();
  checks++;

  /* a recall run through the real handlers, the group's deck */
  await go('#/casks/houses/' + wg.key);
  await page.evaluate(() => { progress.cards = {}; saveProgress(); });
  await page.locator('.caskhouse-group [data-act="caskhouse-practise"]').click();
  await until(page, () => !!document.querySelector('.caskhouse-question'), null, 'the blind front');
  ok(await count('[data-act="fc-grade"]') === 0 && await count('.caskhouse-read-link') === 0, 'the front offers a grade or the house');
  const card = await page.evaluate(() => ({ key: cardKey(state.fc.deck[0]), back: state.fc.deck[0].back, item: state.fc.deck[0].itemId, n: state.fc.deck.length }));
  ok(card.n === wg.houses.length * 2, 'the group’s deck holds ' + card.n + ' cards');
  ok(/^Cask Houses · [a-z0-9-]+\/[a-z0-9-]+$/.test(card.key), 'the card’s key is ' + card.key);
  await page.locator('[data-act="fc-flip"]').click();
  await until(page, () => !!document.querySelector('.caskhouse-answer'), null, 'the answer after Flip');
  await page.locator('.caskhouse-read-link').click();
  await h2Is(H(card.item).producer, 'Learn why opens the house');
  await backTap();
  await until(page, () => !!document.querySelector('.caskhouse-answer'), null, 'Back from the house to the revealed card');
  ok(await page.evaluate((k) => cardKey(state.fc.deck[state.fc.idx]) === k, card.key), 'Back from the house is not the same revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate((k) => progress.cards[k] && progress.cards[k].w === 1 && Object.keys(progress.cards).length === 1, card.key), 'Again did not write the one house key');
  for (let i = 1; i < card.n; i++) { await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="1"]').click(); }
  await until(page, () => { const h = document.querySelector('#view h2'); return !!h && h.textContent === 'Deck done'; }, null, 'Deck done');
  ok(!(await page.locator('#view').innerText()).includes('Cask Houses ·'), 'Deck done shows a raw key');

  /* a group's quiz round through the real handlers */
  await go('#/casks/houses/' + wg.key);
  await page.evaluate(() => { progress.quizzes = []; progress.qa = {}; progress.cards = {}; saveProgress(); });
  const before = await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels }));
  await page.locator('.caskhouse-group [data-act="quiz-go"][data-m="caskhouses"]').click();
  await until(page, () => !!(state.quiz.round && state.quiz.round.length), null, 'the round is dealt');
  const n = await page.evaluate(() => state.quiz.round.length);
  ok(n === 10, 'the group’s round deals ' + n);
  ok(await page.evaluate((keys) => state.quiz.round.every((q) => keys.includes(q.caskHouseKey)), wg.houses), 'the group’s round deals another group');
  ok((await page.locator('#view').innerText()).includes('Question 1 of ' + n + ' · Producers and flagships'), 'the round is not labelled Producers and flagships');
  for (let i = 0; i < n; i++) {
    const right = await page.evaluate(() => { const qq = state.quiz.round[state.quiz.idx]; return qq.options.indexOf(qq.answer); });
    await page.locator('[data-act="quiz-pick"][data-i="' + (i === 0 ? (right + 1) % 4 : right) + '"]').click();
    await page.locator('[data-act="quiz-next"]').click();
  }
  await urlIs(/#\/quiz\/caskhouses\/done$/, 'the round’s results');
  ok(await page.evaluate(() => progress.quizzes.length === 1 && progress.quizzes[0].mode === 'caskhouses'), 'the round wrote no single caskhouses row');
  ok(await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels })) === before, 'the round wrote outside its row');
  const study = page.locator('[data-act="hash"]', { hasText: 'Study this card' });
  ok(await study.count() === 1, 'Study this card for the one miss');
  await study.click();
  await urlIs(/#\/casks\/houses\/[a-z0-9-]+\/[a-z0-9-]+$/, 'Study this card opens the house');
  ok(await count('.caskhouse-house h2') === 1, 'the house drawn from the results');
  await backTap();
  await urlIs(/#\/quiz\/caskhouses\/done$/, 'Back to the results');
  ok(await page.locator('[data-act="hash"]', { hasText: 'Study this card' }).count() === 1, 'Back lost the results');
  await go('#/quiz');
  ok((await text('.hist-row')).includes('Producers and flagships'), 'Recent rounds shows no producers row');

  /* 375 and 390, day and night, and the screenshots at 390 */
  const pick = (gk, want) => { const g = G(gk); return g ? (g.houses.includes(want) ? want : g.houses[0]) : ''; };
  const shots = [['root', '#/casks/houses', '.caskhouse-root'], ['group-' + wg.key, '#/casks/houses/' + wg.key, '.caskhouse-group']];
  for (const [gk, want] of [['wheated-bourbon', 'pappy-van-winkle'], ['islay', 'lagavulin'], ['cognac', 'hennessy'], ['blended-irish', 'jameson']]) {
    const k = pick(gk, want);
    if (k) shots.push(['house-' + k, '#/casks/houses/' + gk + '/' + k, '.caskhouse-house']); else notes.push('no group ' + gk + ' to photograph');
  }
  for (const width of [375, 390]) for (const service of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, hash, scope] of shots) {
      await go(hash);
      await page.evaluate((mode) => OOT.service.set(mode), service);
      await until(page, (m) => document.documentElement.getAttribute('data-service') === m, service, width + ' ' + service + ' service');
      await page.evaluate(() => document.querySelectorAll('.caskhouse-page details').forEach((d) => { d.open = true; }));
      await fits(width + ' ' + service + ' ' + name);
      await controls(width + ' ' + service + ' ' + name);
      await clean(width + ' ' + service + ' ' + name);
      await axe(scope, width + ' ' + service + ' ' + name);
      if (width === 390) {
        await page.evaluate(() => document.querySelectorAll('.caskhouse-page details').forEach((d) => { d.open = false; }));
        await shot('caskhouses-390-' + service + '-' + name, true);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  await context.close();

  /* a reload with the network off, in a profile that installs the worker */
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const off = await offline.newPage();
  off.on('pageerror', (e) => errors.push(e.message));
  await off.goto(base + '/#/casks/houses/' + wg.key + '/' + wh.key);
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  const cached = await off.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((x) => /^(oot-)?ledger-v/.test(x)));
    return Promise.all(['css/caskhouses.css', 'js/data-caskhouses.js', 'js/ui-caskhouses.js'].map(async (p) => !!await cache.match(new URL(p, location.href))));
  });
  ok(cached.every(Boolean), 'the worker does not cache the three files of the page');
  await offline.setOffline(true);
  await off.reload();
  await off.waitForFunction((nm) => { const h = document.querySelector('.caskhouse-house h2'); return typeof caskHouseRecords === 'function' && !!h && h.textContent === nm; }, wh.producer);
  checks++;
  await offline.close();
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  for (const n2 of notes) console.log('  note: ' + n2);
  const result = { status: 'passed', checks, preview: base, groups: data.groups.length, houses: data.houses.length, accessibility: !!AXE, offline: true, browserErrors: errors };
  if (out) await writeFile(path.join(out, 'caskhouses-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
