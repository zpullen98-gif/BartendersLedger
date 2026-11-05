/* At the table: every style (5 November 2026), in a real browser with a
   disposable profile. LEDGER_URL (or LEDGER_PREVIEW_URL) names the served
   Ledger, the source (py serve.py 8782) or a published preview; LEDGER_PLAYWRIGHT
   (or PLAYWRIGHT_MODULE) names playwright or @playwright/test when neither is
   beside this checkout; LEDGER_AXE names axe-core's axe.min.js (else the one
   beside the Playwright module; absent is a note and skips the scoped
   accessibility pass); LEDGER_QA_OUTPUT, when set, takes screenshots and the
   result.

   It holds: the cold addresses (the Cask Atlas home, every style, a bad id),
   the home's new section (its heading, the families in order, every style a
   row), a style drawn (the heading, the family, the sections in order, the
   forty-five, recall and sources closed, no picture), a chapter's Styles to
   present and Back to the chapter, a liquor shelf bottle's Its style at the
   table and Back to the bottle, the Back chain (a style by its row, the home,
   Home), a recall run through the real handlers (a blind front, a forged
   early grade refused, the answer after Flip, the style read and Back to the
   same card, our key only, a readable Deck done, an empty Due or missed),
   Today's cask study dealing a due style card with its door and Back, a quiz
   round through the real handlers (one Recent rounds row in mode caskstyles,
   nothing else written, Study this card and Back keeping the results), 320,
   390 and 1120 in day and night service (nothing wider than the screen, every
   control 44px, no dash and no mark at or above U+2190 on the page, and the
   scoped accessibility pass), and a reload with the network off. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
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
const DASH = /[\u2012-\u2015]|&[mn]dash;| \x2d\x2d /;
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'America/New_York' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', (e) => errors.push(e.message));
let visit = 0;
async function go(hash) {
  await page.goto(base + '/?nosw&caskstylesqa=' + (++visit) + hash);
  await page.waitForFunction(() => typeof caskStyleEntries === 'function' && caskStyleEntries().length > 0 && !!document.querySelector('#view h2, #view [data-act="back"]'));
}
const text = (sel) => page.locator(sel).first().innerText();
const words = (sel) => page.locator(sel).first().evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
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
  const small = await page.locator('#caskstyle-home .btn, #caskstyle-home a.caskstyle-row, .caskstyle-page .btn, .caskstyle-page summary, .caskstyle-sources a, .caskstyle-doors .btn, a.backbar-style')
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
try {
  if (out) await mkdir(out, { recursive: true });
  if (!AXE) notes.push('no axe-core beside the Playwright module (LEDGER_AXE names one): the scoped accessibility pass is skipped');
  await go('#/casks');
  const data = await page.evaluate(() => ({ entries: caskStyleEntries(), families: caskStyleFamilies(), chapters: caskChapters().map((c) => c.id),
    bottles: backbarEntries().map((b) => b.id) }));
  const first = data.entries[0];

  /* the cold home and its new section */
  ok((await text('#view h2')) === 'The Cask Atlas', 'the Cask Atlas home');
  ok((await text('#caskstyle-home h3')) === 'At the table: every style', 'the section\u2019s heading');
  const sections = await page.locator('.cask-atlas > section, .cask-atlas > details').evaluateAll((els) => els.map((el) => el.id || el.className));
  ok(sections.indexOf('caskstyle-home') === sections.indexOf('cask-section cask-daily') + 1, 'the section is not after Today\u2019s cask study: ' + sections.join(', '));
  const fams = await page.locator('.caskstyle-family-h').evaluateAll((els) => els.map((el) => el.id.replace('caskstyle-f-', '')));
  ok(fams.join('|') === data.families.map((f) => f.id).filter((f) => data.entries.some((e) => e.family === f)).join('|'), 'the families are not in order: ' + fams.join(', '));
  ok(await count('#caskstyle-home a.caskstyle-row') === data.entries.length, 'every style a row');
  ok(await count('#caskstyle-home [data-act="caskstyle-practise"][data-deck="caskstyles"]') === 1 && await count('#caskstyle-home [data-act="quiz-go"][data-m="caskstyles"]') === 1, 'Practise the cards and Take the quiz on the home');
  await fits('the home at 390');
  await clean('the home');

  /* every style, cold */
  for (const e of data.entries) {
    await go('#/casks/style/' + e.id);
    ok((await text('.caskstyle-page h2')) === e.name, e.id + ' heading');
    ok(await count('#view [data-act="back"]') === 1, e.id + ' one Back');
    ok((await words('.caskstyle-fam')).endsWith(data.families.find((f) => f.id === e.family).title), e.id + ': the family');
    const ids = await page.locator('.caskstyle-panel').evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby').replace('caskstyle-p-', '')));
    const want = ['table', 'pour', 'guest', 'law', 'made', 'taste', 'differs', 'houses', 'shelf', 'chapter', 'canon', 'recall']
      .filter((s) => (s !== 'shelf' || e.shelf.length) && (s !== 'canon' || e.canon.length) && (s !== 'chapter' || e.chapters.length));
    ok(ids.join('|') === want.join('|'), e.id + ': the sections read ' + ids.join(', '));
    ok((await text('.caskstyle-s45')) === e.lines.s45, e.id + ': the forty-five');
    const s45 = await page.locator('.caskstyle-s45').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const sale = await page.locator('.caskstyle-sale p:not(.caskstyle-label)').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const quiet = await page.locator('.caskstyle-quiet p').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    ok(s45 > sale && sale > quiet, e.id + ': the forty-five is not the large line and the ten the quiet one (' + [s45, sale, quiet].join(', ') + ')');
    ok(await page.locator('.caskstyle-recall[open], .caskstyle-sources[open]').count() === 0, e.id + ': recall or sources drawn open');
    ok(await page.locator('#view iframe, #view img, #view video').count() === 0, e.id + ' draws a frame or a picture');
    await fits(e.id + ' at 390');
    await clean(e.id);
  }
  await go('#/casks/style/no-such-style');
  await urlIs(/#\/casks$/, 'a bad id does not land on the Cask Atlas home');
  ok((await text('#view h2')) === 'The Cask Atlas', 'a bad id\u2019s heading');

  /* the Back chain from the home */
  await go('#/casks');
  await page.locator('#caskstyle-home a.caskstyle-row[href="#/casks/style/' + first.id + '"]').click();
  await until(page, (n) => { const h = document.querySelector('.caskstyle-page h2'); return !!h && h.textContent === n; }, first.name, 'the row opens the style');
  await backTap();
  await urlIs(/#\/casks$/, 'Back from a style to the Cask Atlas home');
  ok(await page.evaluate((id) => document.activeElement && document.activeElement.id === 'caskstyle-r-' + id, first.id), 'Back did not return the focus to the style\u2019s row');
  await backTap();
  await urlIs(/#\/home$/, 'Back to Home');

  /* a chapter's Styles to present, and Back to the chapter */
  const ch = first.chapters[0];
  await go('#/casks/' + ch);
  ok((await text('#caskstyle-doors-h')) === 'Styles to present', ch + ': Styles to present');
  const doors = await page.locator('.caskstyle-doors a.caskstyle-door').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  ok(doors.join('|') === data.entries.filter((e) => e.chapters.includes(ch)).map((e) => '#/casks/style/' + e.id).join('|'), ch + ': the doors read ' + doors.join(', '));
  await page.locator('#caskstyle-d-' + first.id).click();
  await urlIs(new RegExp('#/casks/style/' + first.id + '$'), 'a chapter\u2019s door opens the style');
  await backTap();
  await urlIs(new RegExp('#/casks/' + ch + '$'), 'Back from the style to the chapter');
  await fits(ch + ' at 390');

  /* a liquor shelf bottle's Its style at the table, and Back to the bottle */
  const withShelf = data.entries.find((e) => e.shelf.length);
  if (withShelf) {
    const b = withShelf.shelf[0];
    await go('#/menu/backbar/' + b);
    ok((await text('#backbar-d-style')) === 'Its style at the table', b + ': Its style at the table');
    await page.locator('a.backbar-style[href="#/casks/style/' + withShelf.id + '"]').click();
    await urlIs(new RegExp('#/casks/style/' + withShelf.id + '$'), 'a bottle\u2019s door opens the style');
    await page.locator('.caskstyle-page a.caskstyle-bottle[href="#/menu/backbar/' + b + '"]').waitFor();
    checks++;
    await backTap();
    await urlIs(new RegExp('#/menu/backbar/' + esc(b) + '$'), 'Back from the style to the bottle');
  } else notes.push('no style written yet holds a liquor shelf bottle');

  /* a recall run through the real handlers */
  await go('#/casks/style/' + first.id);
  await page.evaluate(() => { progress.cards = {}; saveProgress(); });
  await page.locator('.caskstyle-page [data-act="caskstyle-practise"]').click();
  await until(page, () => !!document.querySelector('.caskstyle-question'), null, 'the blind front');
  ok(await count('[data-act="fc-grade"]') === 0 && await count('.caskstyle-read-link') === 0, 'the front offers a grade or the style');
  const card = await page.evaluate(() => ({ key: cardKey(state.fc.deck[0]), back: state.fc.deck[0].back, item: state.fc.deck[0].itemId }));
  ok(!(await page.locator('#view').innerText()).includes(card.back.slice(0, 40)), 'the blind front shows the answer');
  await page.evaluate(() => document.querySelector('#view').insertAdjacentHTML('beforeend', '<button id="forged-grade" data-act="fc-grade" data-ok="1">A forged early grade</button>'));
  await page.locator('#forged-grade').click();
  ok(await page.evaluate((k) => !progress.cards[k] && state.fc.idx === 0, card.key), 'a forged grade before Flip was recorded');
  await page.evaluate(() => { const b = document.getElementById('forged-grade'); if (b) b.remove(); });
  await page.locator('[data-act="fc-flip"]').click();
  await until(page, (t) => { const a = document.querySelector('.caskstyle-answer'); return !!a && a.textContent.indexOf(t) >= 0; }, card.back.slice(0, 30), 'the answer after Flip');
  await page.locator('.caskstyle-read-link').click();
  await until(page, (n) => { const h = document.querySelector('.caskstyle-page h2'); return !!h && h.textContent === n; }, data.entries.find((e) => e.id === card.item).name, 'Learn why opens the style');
  await backTap();
  await until(page, () => !!document.querySelector('.caskstyle-answer'), null, 'Back from the style to the revealed card');
  ok(await page.evaluate((k) => cardKey(state.fc.deck[state.fc.idx]) === k, card.key), 'Back from the style is not the same revealed card');
  await page.locator('[data-act="fc-grade"][data-ok="0"]').click();
  ok(await page.evaluate((k) => progress.cards[k] && progress.cards[k].w === 1 && Object.keys(progress.cards).length === 1, card.key), 'Again did not write the one style key');
  for (let i = 1; i < data.entries.length; i++) { await page.locator('[data-act="fc-flip"]').click(); await page.locator('[data-act="fc-grade"][data-ok="1"]').click(); }
  await until(page, () => { const h = document.querySelector('#view h2'); return !!h && h.textContent === 'Deck done'; }, null, 'Deck done');
  ok(!(await page.locator('#view').innerText()).includes('Cask Styles \u00b7'), 'Deck done shows a raw key');
  await go('#/casks');
  await page.evaluate(() => { progress.cards = {}; saveProgress(); render(); });
  await page.locator('#caskstyle-home [data-act="deck"][data-deck="caskstyles:again"]').click();
  await until(page, () => /No cards in this deck yet/.test((document.querySelector('.deck-count') || {}).textContent || ''), null, 'an empty Due or missed');
  ok(await count('[data-act="fc-start"]') === 0, 'an empty Due or missed starts a run');

  /* Today's cask study deals a due style card, with its door and Back */
  await go('#/casks');
  const due = data.entries[data.entries.length - 1];
  await page.evaluate((k) => { progress.cards = {}; const now = Date.now(); progress.cards[k] = { r: 1, w: 0, reps: 1, ef: 2.5, ivl: 1, last: now - 3 * 86400000, due: now - 86400000 }; saveProgress(); render(); }, 'Cask Styles \u00b7 ' + due.id + '/recall');
  await page.locator('[data-act="cask-start"][data-s="today"]').click();
  await until(page, () => !!(caskState().run && caskState().run.rows.length), null, 'Today\u2019s cask study starts');
  const at = await page.evaluate((id) => caskState().run.rows.findIndex((r) => r.style === id), due.id);
  ok(at >= 0, 'Today\u2019s cask study does not deal the due style card');
  await page.evaluate((i) => { caskState().run.idx = i; render(); }, at);
  ok(await count('.caskstyle-run-door') === 0, 'the style door on the front');
  await page.locator('[data-act="cask-flip"]').click();
  await page.locator('#caskstyle-run-' + due.id).click();
  await urlIs(new RegExp('#/casks/style/' + due.id + '$'), 'the run\u2019s door opens the style');
  await backTap();
  await until(page, (i) => !!document.querySelector('.cask-answer') && caskState().run.idx === i, at, 'Back from the style to the revealed run card');
  await page.locator('[data-act="cask-grade"][data-k="yes"]').click();
  ok(await page.evaluate((k) => progress.cards[k].reps === 2 && Object.keys(progress.cards).length === 1, 'Cask Styles \u00b7 ' + due.id + '/recall'), 'grading the run card did not write its key alone');

  /* a quiz round through the real handlers */
  await go('#/casks/style/' + first.id);
  await page.evaluate(() => { progress.quizzes = []; progress.qa = {}; progress.cards = {}; saveProgress(); });
  const before = await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels }));
  await page.locator('.caskstyle-page [data-act="quiz-go"][data-m="caskstyles"]').click();
  await until(page, () => !!(state.quiz.round && state.quiz.round.length), null, 'the round is dealt');
  const n = await page.evaluate(() => state.quiz.round.length);
  ok(n === Math.min(10, data.entries.length), 'the round deals ' + n);
  ok((await page.locator('#view').innerText()).includes('Question 1 of ' + n + ' \u00b7 Every style at the table'), 'the round is not labelled Every style at the table');
  for (let i = 0; i < n; i++) {
    const right = await page.evaluate(() => { const qq = state.quiz.round[state.quiz.idx]; return qq.options.indexOf(qq.answer); });
    await page.locator('[data-act="quiz-pick"][data-i="' + (i === 0 ? (right + 1) % 4 : right) + '"]').click();
    await page.locator('[data-act="quiz-next"]').click();
  }
  await urlIs(/#\/quiz\/caskstyles\/done$/, 'the round\u2019s results');
  ok(await page.evaluate(() => progress.quizzes.length === 1 && progress.quizzes[0].mode === 'caskstyles'), 'the round wrote no single caskstyles row');
  ok(await page.evaluate(() => JSON.stringify({ qa: progress.qa, cards: progress.cards, levels: progress.levels })) === before, 'the round wrote outside its row');
  const study = page.locator('[data-act="hash"]', { hasText: 'Study this card' });
  ok(await study.count() === 1, 'Study this card for the one miss');
  await study.click();
  await urlIs(/#\/casks\/style\/[a-z0-9-]+$/, 'Study this card opens the style');
  ok(await count('.caskstyle-page h2') === 1, 'the style drawn from the results');
  await backTap();
  await urlIs(/#\/quiz\/caskstyles\/done$/, 'Back to the results');
  ok(await page.locator('[data-act="hash"]', { hasText: 'Study this card' }).count() === 1, 'Back lost the results');
  await go('#/quiz');
  ok((await text('.hist-row')).includes('Every style at the table'), 'Recent rounds shows no style row');

  /* 320, 390 and 1120, day and night */
  for (const width of [320, 390, 1120]) for (const service of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    await go('#/casks');
    await page.evaluate((mode) => OOT.service.set(mode), service);
    await until(page, (m) => document.documentElement.getAttribute('data-service') === m, service, width + ' ' + service + ' service');
    await page.locator('#caskstyle-home').scrollIntoViewIfNeeded();
    await fits(width + ' ' + service + ' home');
    await controls(width + ' ' + service + ' home');
    await clean(width + ' ' + service + ' home');
    await axe('#caskstyle-home', width + ' ' + service + ' home section');
    if (width !== 1120) await shot('caskstyles-' + width + '-' + service + '-home');
    await go('#/casks/style/' + first.id);
    await page.evaluate(() => document.querySelectorAll('.caskstyle-page details').forEach((d) => { d.open = true; }));
    await fits(width + ' ' + service + ' style');
    await controls(width + ' ' + service + ' style');
    await clean(width + ' ' + service + ' style');
    await axe('.caskstyle-page', width + ' ' + service + ' style');
    if (width !== 1120) await shot('caskstyles-' + width + '-' + service + '-style', true);
    await go('#/casks/' + ch);
    await fits(width + ' ' + service + ' chapter');
    await controls(width + ' ' + service + ' chapter');
    await axe('.caskstyle-doors', width + ' ' + service + ' chapter doors');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  await context.close();

  /* a reload with the network off, in a profile that installs the worker */
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const off = await offline.newPage();
  off.on('pageerror', (e) => errors.push(e.message));
  await off.goto(base + '/#/casks/style/' + first.id);
  await off.evaluate(async () => { await navigator.serviceWorker.ready; });
  await off.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  const cached = await off.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((x) => /^(oot-)?ledger-v/.test(x)));
    return Promise.all(['css/caskstyles.css', 'js/data-caskstyles.js', 'js/ui-caskstyles.js'].map(async (p) => !!await cache.match(new URL(p, location.href))));
  });
  ok(cached.every(Boolean), 'the worker does not cache the three new files');
  await offline.setOffline(true);
  await off.reload();
  await off.waitForFunction((nm) => { const h = document.querySelector('.caskstyle-page h2'); return typeof caskStyleEntries === 'function' && !!h && h.textContent === nm; }, first.name);
  checks++;
  await off.locator('.caskstyle-page [data-act="caskstyle-practise"]').click();
  await off.locator('[data-act="fc-flip"]').click();
  await off.waitForFunction(() => !!document.querySelector('.caskstyle-answer'));
  checks++;
  await offline.close();
  ok(!errors.length, 'browser errors: ' + errors.join('; '));
  for (const n2 of notes) console.log('  note: ' + n2);
  const result = { status: 'passed', checks, preview: base, styles: data.entries.length, accessibility: !!AXE, offline: true, browserErrors: errors };
  if (out) await writeFile(path.join(out, 'caskstyles-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
