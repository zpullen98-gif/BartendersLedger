/**
 * The four levels' screens, gated. Run: `node tools/check-home.mjs` (exits
 * non-zero on any problem).
 *
 * The whole app is loaded from index.html's own script list into a DOM-free
 * sandbox (tools/load-wing.mjs), so what is checked is the SHIPPED renderers.
 * Three records are put in front of them: a fresh one, a partial one, and one
 * with every Barback unit met. Against each:
 *
 *   - the home is the shared contract and nothing else (the consolidation,
 *     4 October 2026): one section.levels of four button.level (the names, a
 *     word and figure in each, and no numeral on sight or for a screen
 *     reader: the name is the whole label), and no doors; one card is `on`,
 *     carries aria-current and the words "Your level", and it is the level
 *     this gate works out for itself; every card's word and figure equals the
 *     one this gate computes independently from the placements and the
 *     records; the level page's Tonight's session row names the level it
 *     deals from
 *   - every level page is titled by the level's name alone, opens on Today's
 *     study (Due today, Quick quiz, Next reading, Tonight's session), then My
 *     restaurant and a search, then what it holds behind a closed disclosure:
 *     the eight subsections, each with "N at this level" and a door that says
 *     where it is read and resolves to a real tab; no training door is left on
 *     it; the switch between the four by their names is at its foot, under
 *     "Another level"; its test is the last thing on Quizzes, by name ("The
 *     Barback test")
 *   - every level test deals seventeen questions; sat wrong, it ends on "What
 *     got away" with no percentage, no score (no "n / m"), none of the quiz
 *     round's verdicts, and without adding a row to progress.quizzes; sat
 *     right, it ends on "Nothing got away."; either way the sitting is
 *     recorded in progress.levels
 *   - nothing these screens render carries an em dash
 *   - no level is named by a numeral anywhere a reader sees or hears one
 *     (the owner, 27 Sep 2026): the screens above, the one Back (which says
 *     Back and nothing else), the Library's level filter, the flashcards' level line,
 *     a level round's history label and the record's level tests all print
 *     the name
 *   - the twelve books live inside the levels, named and never numbered (the
 *     owner, 27 Sep 2026): no "tier" reaches the Library, the flashcards
 *     setup, a drink's chip, the search index or a level page; the book
 *     filter in the Library and the flashcards lists the books the level
 *     holds, in the order the levels climb, each "name (count at the
 *     level)", and a book the level does not hold falls back to Every book;
 *     a drink's chip is its level and its book; the Library reads by level,
 *     then book, then name; each level page names its books in that order
 *     as 44px doors with their count and where they continue, and every book
 *     door opens the Library at that level and that book
 *
 * This file also runs inside the Outside Of Time wing, from ledger/tools/;
 * keep the two copies identical.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadWing, LEDGER } from './load-wing.mjs';

const html = readFileSync(join(LEDGER, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map((m) => m[1]).filter((f) => f !== 'storage-alarm.js');
const W = loadWing(FILES);
const g = (n) => W.get(n);
const run = (code) => vm.runInContext(code, W);

const problems = [];
const fail = (m) => problems.push(m);
const EMDASH = String.fromCharCode(0x2014);

/* the records, swapped in by assignment inside the sandbox */
const setProgress = (p) => vm.runInContext('progress = ' + JSON.stringify(p) + '; LV_CARDS_FOR = null; allDrinks._c = null;', W);
const getProgress = () => JSON.parse(vm.runInContext('JSON.stringify(progress)', W));
const blank = () => ({ cards:{}, quizzes:[], practice:{}, qa:{}, levels:{}, tastings:[], bar:[], vidPrefs:{ channel:'auto', longform:false } });

/* ---- the independent reckoning ----
   Not the app's functions: the rules, written again from the placements and
   the records, so a bug in levels.js cannot agree with itself. */
const LEVEL_ITEMS = g('LEVEL_ITEMS');
const DRILLS = g('DRILLS');
const cardKeys = new Set(g('allDrinks')().filter((d) => d.src !== 'My Bar').map((d) => g('cardKey')(d)));
const SUBS = ['cocktails', 'shots', 'ontap', 'spirits', 'technique', 'stick', 'prep', 'coffee'];
const now = Date.now();
function mastered(p, k){ const s = p.cards[k]; return !!(s && s.r >= 3 && s.r > s.w); }
function drillOk(p, id){
	const d = DRILLS.find((x) => x.id === id), r = d.ready;
	return ((p.practice || {})[id] || []).some((e) =>
		r.op === 'lt' ? e.v > 0 && e.v < r.v : r.op === 'ge' ? e.v >= r.v : r.op === 'order' ? e.ok === true : typeof e.of === 'number' && e.v >= e.of);
}
function unitsOf(n, sub){
	return (LEVEL_ITEMS[sub][n] || []).filter((k) => k.startsWith('q:') || k.startsWith('drill:') || cardKeys.has(k));
}
function metOf(p, k){
	if (k.startsWith('q:')) return !!(p.qa[k] && p.qa[k].r >= 1);
	if (k.startsWith('drill:')) return drillOk(p, k.slice(6));
	return mastered(p, k);
}
function word(met, total, share){
	if (!total || met <= 0) return 'Untouched';
	if (met >= total) return 'Met';
	return Math.min(99, Math.max(1, Math.round(share * 100))) + '% met';
}
function levelWord(p, n){
	const cells = SUBS.map((s) => { const u = unitsOf(n, s); return { total: u.length, met: u.filter((k) => metOf(p, k)).length }; }).filter((c) => c.total);
	const met = cells.reduce((a, c) => a + c.met, 0), total = cells.reduce((a, c) => a + c.total, 0);
	const share = cells.reduce((a, c) => a + c.met / c.total, 0) / cells.length;
	return cells.every((c) => c.met >= c.total) ? 'Met' : word(met, total, share);
}
function firstUnmet(p){ for (let n = 1; n <= 4; n++) if (levelWord(p, n) !== 'Met') return n; return 4; }

/* ---- the three records ---- */
const fresh = blank();
const partial = blank();
/* the first of the five is overdue: met does not expire, so it still counts */
unitsOf(1, 'cocktails').slice(0, 5).forEach((k, i) => { partial.cards[k] = { r:4, w:0, due: i === 0 ? now - 9e5 : now + 9e8 }; });
unitsOf(1, 'stick').filter((k) => k.startsWith('q:')).slice(0, 3).forEach((k) => { partial.qa[k] = { r:1, w:0, last:now }; });
const levelOne = blank();
for (const s of SUBS) {
	for (const k of unitsOf(1, s)) {
		if (k.startsWith('q:')) levelOne.qa[k] = { r:1, w:0, last:now };
		else if (k.startsWith('drill:')) {
			const d = DRILLS.find((x) => x.id === k.slice(6)), r = d.ready;
			const e = r.op === 'lt' ? { v: r.v - 1 } : r.op === 'ge' ? { v: r.v } : r.op === 'order' ? { v: 90, ok: true } : { v: 5, of: 5 };
			levelOne.practice[d.id] = [{ d:'x', ts: now, ...e }];
		}
		else levelOne.cards[k] = { r:4, w:0, due: now + 9e8 };
	}
}

/* a level by numeral, in words or in the old span: none may be shown */
const NUMERAL = /\bLevel\s+(?:I{1,3}|IV|[1-4])\b|lv-num/;
const LEVELS = g('LEVELS');
const TABS = new Set(g('TABS').map((t) => t[0]));
const strip = (s) => s.replace(/<[^>]+>/g, '');

for (const [name, rec] of [['fresh', fresh], ['partial', partial], ['Barback met', levelOne]]) {
	setProgress(rec);
	run('state.lt = null; state.sess = null; state.level.n = null;');
	const home = g('renderHome')();
	const where = `home (${name})`;
	if (home.includes(EMDASH)) fail(`${where}: carries an em dash`);
	if (NUMERAL.test(home)) fail(`${where}: names a level by a numeral`);
	const inner = home.replace(/^<div class="home4">/, '').replace(/<\/div>$/, '');
	if (!/^<section class="levels" aria-label="Levels">[\s\S]*<\/section>$/.test(inner) || /<nav\b/.test(inner)) fail(`${where}: is not exactly section.levels and nothing else`);
	const cards = [...home.matchAll(/<button class="level( on)?" data-act="level-open" data-n="(\d)" data-level="\d"( aria-current="step")?>([\s\S]*?)<\/button>/g)];
	if (cards.length !== 4) fail(`${where}: ${cards.length} level cards, not four`);
	const want = firstUnmet(rec);
	cards.forEach((c, i) => {
		const n = Number(c[2]), body = c[4];
		if (n !== i + 1) fail(`${where}: card ${i + 1} is level ${n}`);
		if (/sr-only/.test(body)) fail(`${where}: card ${i + 1} carries hidden words, and its name is the whole label`);
		const nm = (body.match(/<span class="lv-name">([^<]*)<\/span>/) || [])[1];
		const stat = (body.match(/<span class="lv-stat">([^<]*)<\/span>/) || [])[1];
		if (nm !== LEVELS[i].name) fail(`${where}: card ${i + 1} name ${nm}`);
		const expect = levelWord(rec, n);
		if (stat !== expect) fail(`${where}: ${LEVELS[i].name} reads "${stat}", the gate reckons "${expect}"`);
		const on = Boolean(c[1]);
		if (on !== (n === want)) fail(`${where}: ${LEVELS[i].name} ${on ? 'is' : 'is not'} marked, and the reader is on ${LEVELS[want - 1].name}`);
		if (on && (!c[3] || !/<span class="lv-here">Your level<\/span>/.test(body))) fail(`${where}: the current card lacks aria-current or "Your level"`);
		if (!on && /lv-here/.test(body)) fail(`${where}: "Your level" on a card that is not current`);
	});
	/* the old Today door's words live on as the level page's Tonight's session row */
	run(`state.level.n = ${want};`);
	const lp = g('renderLevel')();
	const doors = [...lp.matchAll(/<button class="door" data-act="door" data-d="(\w+)"><span class="door-name">([^<]*)<\/span><span class="door-line">([^<]*)<\/span>(?:<span class="door-sub">([^<]*)<\/span>)?<\/button>/g)];
	const today = doors[0] && doors[0][4];
	const deals = g('todayLevel')();
	if (!doors[0] || doors[0][2] !== 'Tonight’s session') fail(`${where}: the level page has no Tonight's session row`);
	if (today !== `Today deals from ${LEVELS[deals - 1].name}.`) fail(`${where}: Tonight's session says ${JSON.stringify(today)}`);
	if (name === 'Barback met' && deals !== 2) fail(`${where}: with Barback met, Today still deals from ${LEVELS[deals - 1].name}`);
	if (name === 'fresh' && deals !== 1) fail(`${where}: a fresh record is dealt ${LEVELS[deals - 1].name}`);
}

/* ---- the level pages and their doors ---- */
setProgress(fresh);
for (let n = 1; n <= 4; n++) {
	run(`state.lt = null; state.level.n = ${n};`);
	const page = g('renderLevel')();
	const where = `the ${LEVELS[n - 1].name} page`;
	if (page.includes(EMDASH)) fail(`${where}: carries an em dash`);
	if (NUMERAL.test(page)) fail(`${where}: names a level by a numeral`);
	if (!page.includes(`<h2 class="lv-title" tabindex="-1">${LEVELS[n - 1].name}</h2>`)) fail(`${where}: the title is not the name alone`);
	const sw = (page.match(/<nav class="lv-switch"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
	const swNames = [...sw.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
	if (swNames.join('|') !== LEVELS.map((l) => l.name).join('|')) fail(`${where}: the switch reads ${JSON.stringify(swNames)}, not the four names`);
	/* the page's order: Today's study, My restaurant, Search, what it holds, then the switch */
	const at = (re) => { const m = page.match(re); return m ? m.index : -1; };
	const order = [at(/>Today’s study<\/h3>/), at(/>My restaurant<\/h3>/), at(/>Search<\/h3>/), at(/<details class="lv-holds">/), at(/>Another level<\/h3>/), at(/<nav class="lv-switch"/)];
	if (order.some((x) => x < 0) || order.some((x, i) => i && x < order[i - 1])) fail(`${where}: does not read Today's study, My restaurant, Search, what it holds, then Another level (${order.join(',')})`);
	const rows = [...page.matchAll(/<nav class="quiet rows today"[^>]*>([\s\S]*?)<\/nav>/g)].map((m) => [...m[1].matchAll(/<span class="door-name">([^<]*)<\/span>/g)].map((x) => x[1]))[0] || [];
	if (rows.join('|') !== 'Due today|Quick quiz|Next reading|Tonight’s session') fail(`${where}: Today's study reads ${JSON.stringify(rows)}`);
	if (!/<input class="input" id="lv-q"/.test(page)) fail(`${where}: no search box`);
	if (!page.includes(`<span class="when-closed">Show what ${LEVELS[n - 1].name} holds</span>`)) fail(`${where}: what it holds is not a disclosure that says Show`);
	if (/data-act="train"/.test(page)) fail(`${where}: a training door is still on the page`);
	if (/data-act="lt-start"/.test(page)) fail(`${where}: the test is still on the page, not on Quizzes`);
	const subs = [...page.matchAll(/<li class="subsection" data-sub="(\w+)">([\s\S]*?)<\/li>/g)];
	if (subs.length !== 8) fail(`${where}: ${subs.length} subsections, not eight`);
	for (const s2 of subs) {
		if (!/<p class="sub-line">\d+ at this level · [^<]+<\/p>/.test(s2[2])) fail(`${where}, ${s2[1]}: no "N at this level"`);
		const reads = [...s2[2].matchAll(/data-act="read-at" data-n="(\d)" data-s="(\w+)">([^<]*)<\/button>/g)];
		if (reads.length !== 1) fail(`${where}, ${s2[1]}: ${reads.length} reading doors, not one`);
		for (const t of reads) {
			const target = g('readDoorTarget')(Number(t[1]), t[2]);
			if (!target || !TABS.has(target.tab)) fail(`${where}, ${s2[1]}: the reading door goes nowhere`);
			if (!t[3].trim()) fail(`${where}, ${s2[1]}: the reading door says nothing`);
		}
	}
}
/* the test is the last thing on Quizzes, by the chosen level's name */
for (let n = 1; n <= 4; n++) {
	setProgress(fresh);
	run(`localStorage.getItem = (k) => k === 'oot-level-ledger-v1' ? '${n}' : null; state.lt = null; state.tab = 'quiz'; state.quiz.stage = 'setup';`);
	const q = g('renderQuiz')();
	const last = [...q.matchAll(/<button class="btn btn-brass leveltest" data-act="lt-start" data-n="(\d)"[^>]*>([^<]*)<\/button>/g)];
	if (last.length !== 1 || last[0][2] !== `The ${LEVELS[n - 1].name} test` || Number(last[0][1]) !== n) fail(`Quizzes at ${LEVELS[n - 1].name}: does not end on the ${LEVELS[n - 1].name} test`);
	if (NUMERAL.test(q)) fail(`Quizzes at ${LEVELS[n - 1].name}: names a level by a numeral`);
	if (q.includes(EMDASH)) fail(`Quizzes at ${LEVELS[n - 1].name}: carries an em dash`);
}
run('localStorage.getItem = () => null;');

/* ---- the level tests ---- */
const VERDICTS = ['Clean round', 'Solid. Read the misses', 'Half is a start', 'Everyone starts by polishing'];
for (let n = 1; n <= 4; n++) {
	for (const right of [false, true]) {
		setProgress(blank());
		const quizzesBefore = getProgress().quizzes.length;
		const t = g('ltStart')(n);
		const where = `the ${LEVELS[n - 1].name} test, sat ${right ? 'right' : 'wrong'}`;
		if (t.none || t.qs.length !== 17) { fail(`${where}: dealt ${t.none ? 'nothing' : t.qs.length + ' questions'}, not seventeen`); continue; }
		for (let i = 0; i < 17; i++) {
			const q = vm.runInContext('state.lt.qs[state.lt.idx]', W);
			const idx = right ? q.options.indexOf(q.answer) : q.options.findIndex((o) => o !== q.answer);
			if (idx < 0) { fail(`${where}: question ${i + 1} has no ${right ? 'right' : 'wrong'} option`); break; }
			/* the screen's own words: the question's content (the book's prose,
			   which carries its own dashes, fractions and percentages) is not
			   the page talking, so the panel that holds it is taken out */
			const screen = g('renderLevelTest')().replace(/<div class="panel p5 col">[\s\S]*$/, '');
			if (screen.includes(EMDASH)) fail(`${where}: question ${i + 1}'s screen carries an em dash`);
			if (NUMERAL.test(screen)) fail(`${where}: question ${i + 1}'s screen names a level by a numeral`);
			if (!screen.includes(`<h2 class="lv-title">The ${LEVELS[n - 1].name} test</h2>`)) fail(`${where}: question ${i + 1}'s screen is not headed by the level's name`);
			if (/%|score/i.test(strip(screen))) fail(`${where}: question ${i + 1}'s screen shows a percentage or a score`);
			g('ltPick')(idx);
			g('ltNext')();
		}
		/* the end, less the missed rows' content (their prompts, answers and
		   explanations are the book's words, "3/4 oz" and "40%" among them) */
		const done = g('renderLevelTest')().replace(/<ul class="lt-misses">[\s\S]*?<\/ul>/, '<ul class="lt-misses"></ul>');
		const text = strip(done);
		if (done.includes(EMDASH)) fail(`${where}: the end carries an em dash`);
		if (NUMERAL.test(done)) fail(`${where}: the end names a level by a numeral`);
		if (/>Back to /.test(done)) fail(`${where}: carries a second way back ("Back to"), where the one Back above serves`);
		if (/%/.test(text)) fail(`${where}: the end shows a percentage`);
		if (/\d+\s*\/\s*\d+/.test(text)) fail(`${where}: the end shows a score`);
		for (const v of VERDICTS) if (text.includes(v)) fail(`${where}: the end says the quiz's verdict "${v}"`);
		if (right && !text.includes('Nothing got away.')) fail(`${where}: does not end on "Nothing got away."`);
		if (!right && !text.includes('What got away, with the right answers.')) fail(`${where}: does not end on what got away`);
		const after = getProgress();
		if (after.quizzes.length !== quizzesBefore) fail(`${where}: wrote a quiz round into progress.quizzes`);
		if (!(after.levels[n] || []).length) fail(`${where}: the sitting is not recorded`);
	}
}

/* ---- a level's Quiz door on the beer and coffee cards ----
   The question is the card: the ordinary quiz screen must draw it, blind,
   with the name nowhere on it. */
setProgress(blank());
let factQs = 0;
for (let n = 1; n <= 4; n++) {
	for (const sub of ['ontap', 'coffee']) {
		const t = g('trainTarget')('quiz', n, sub);
		if (!t) continue;
		if (!g('applyTarget')(t)) { fail(`${LEVELS[n - 1].name}, ${sub}: the Quiz door dealt nothing`); continue; }
		const round = vm.runInContext('state.quiz.round', W);
		round.forEach((q, i) => {
			if (!q.factCard) return;
			factQs++;
			run(`state.quiz.idx = ${i}; state.quiz.picked = null;`);
			const screen = g('renderQuiz')();
			const whole = (screen.match(/<div class="ticket">[\s\S]*?<\/div><\/div>(?=<div class="col-sm">)/) || [])[0];
			if (!whole) { fail(`${LEVELS[n - 1].name}, ${sub}: "${q.factCard.name}" is asked without its card`); return; }
			/* the facts, below the card's category (a cider is labelled Cider on
			   purpose: the decoys are ciders too) */
			const ticket = whole.split('<div class="tix-rule"></div>').slice(1).join(' ');
			const words = q.factCard.name.split(/[^A-Za-z\u00C0-\u024F]+/).filter((w) => w.length >= 4);
			const text = strip(ticket).toLowerCase();
			for (const w of words) if (new RegExp('(^|[^a-z\u00C0-\u024F])' + w.toLowerCase() + '($|[^a-z\u00C0-\u024F])').test(text)) fail(`${LEVELS[n - 1].name}, ${sub}: the blind card for "${q.factCard.name}" names it`);
		});
	}
}
if (!factQs) fail('no Quiz door dealt a beer or coffee card, so the blind card was never checked');

/* ---- a level is its name everywhere else it is shown ----
   The way back from a level's tab, the Library's level filter, the
   flashcards' level line, a level round's history label and the record's
   level tests each print a level, and each prints its name. */
const NAMES = LEVELS.map((l) => l.name);
setProgress({ ...blank(), levels: Object.fromEntries(NAMES.map((_, i) => [i + 1, [{ ts: now, total: 17, miss: 0 }]])) });
for (let n = 1; n <= 4; n++) {
	const name = NAMES[n - 1];
	run(`state.lt = null; state.tab = 'flashcards'; state.level.n = ${n};`);
	const crumb = g('clusterChromeHTML')();
	if ((crumb.match(/data-act="back"/g) || []).length !== 1 || !crumb.includes('data-act="back">Back</button>') || /Back to/.test(crumb)) fail(`the way back from a tab reads ${JSON.stringify(strip(crumb))}, not the one Back`);
	const label = g('modeLabel')(`level-${n}-cocktails`);
	if (label !== `${name} · Cocktails`) fail(`a ${name} round's history label reads ${JSON.stringify(label)}`);
	if (!g('applyTarget')(g('trainTarget')('cards', n, 'cocktails'))) { fail(`the ${name} Flashcards door deals nothing`); continue; }
	const fc = g('renderFlashcards')();
	if (!fc.includes(`Dealing from ${name}, Cocktails.`)) fail(`the ${name} Flashcards door does not say it deals from ${name}`);
	if (NUMERAL.test(fc)) fail(`the ${name} flashcards names a level by a numeral`);
}
run("state.tab = 'library'; state.lib = { q:'', fam:'All', tier:'All', open:null, level:null };");
const libSel = (g('renderLibrary')().match(/<select[^>]*id="lib-level"[^>]*>([\s\S]*?)<\/select>/) || [])[1] || '';
const libOpts = [...libSel.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
if (libOpts.join('|') !== ['Every level', ...NAMES].join('|')) fail(`the Library's level filter reads ${JSON.stringify(libOpts)}`);
const sat = [...g('levelTestsHTML')().matchAll(/<div class="hist-row"><span>([^<]*)<\/span>/g)].map((m) => m[1]);
if (sat.join('|') !== NAMES.join('|')) fail(`the record's level tests read ${JSON.stringify(sat)}`);
if (NUMERAL.test(g('renderMine')())) fail('Mine names a level by a numeral');
run("state.tab = 'home';");

/* ---- the books inside the levels ----
   The twelve books are named and never numbered anywhere a reader sees or
   hears one (the owner, 27 Sep 2026): no "Tier", no "tiers", no book's
   number. Written again here from LEVEL_ITEMS and the drinks, not from the
   app's helpers: the books a level holds, in the order the levels climb
   (each book's mean level, a tie in key order), each with its count there. */
const COCKTAILS = g('COCKTAILS');
const BOOKS = g('TIER_NAMES');
const TIERWORD = /\btiers?\b/i;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const drinkLevel = new Map();
for (let n = 1; n <= 4; n++) for (const k of LEVEL_ITEMS.cocktails[n] || []) drinkLevel.set(k, n);
const meanLevel = (t) => { const ls = COCKTAILS.filter((c) => c.tier === t).map((c) => drinkLevel.get(c.name) || 0); return ls.reduce((a, b) => a + b, 0) / ls.length; };
const climb = Object.keys(BOOKS).map(Number).sort((a, b) => (meanLevel(a) - meanLevel(b)) || (a - b));
if (climb.join() !== (g('BOOK_ORDER') || []).join()) fail(`BOOK_ORDER ${JSON.stringify(g('BOOK_ORDER'))} is not the order the levels climb, ${JSON.stringify(climb)}`);
const booksAt = (n) => climb.map((t) => ({ t, name: BOOKS[t], n: COCKTAILS.filter((c) => c.tier === t && (!n || drinkLevel.get(c.name) === n)).length })).filter((b) => b.n);
const bookLabel = (b) => `${b.name} (${b.n})`;
const nextLevelOf = (t, n) => { for (let m = n + 1; m <= 4; m++) if (COCKTAILS.some((c) => c.tier === t && drinkLevel.get(c.name) === m)) return m; return null; };
/* a book select's options, their words and the one selected */
const bookSelect = (screen, id) => {
	const m = screen.match(new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/select>`));
	if (!m) return null;
	const opts = [...m[1].matchAll(/<option value="[^"]*"( selected)?>([^<]*)<\/option>/g)];
	return { tag: m[0].slice(0, m[0].indexOf('>') + 1), words: opts.map((o) => unesc(o[2])), selected: unesc((opts.find((o) => o[1]) || [])[2] || '') };
};
const bookWhere = (n) => (n ? NAMES[n - 1] : 'every level');

/* the Library: the book filter scoped by the level, the order, the chips */
setProgress(blank());
for (const n of [0, 1, 2, 3, 4]) {
	run(`state.tab = 'library'; state.lib = { q:'', fam:'All', tier:'All', open:null, level:${n || null} };`);
	const lib = g('renderLibrary')();
	const where = `the Library at ${bookWhere(n)}`;
	if (TIERWORD.test(lib)) fail(`${where}: says "tier"`);
	const sel = bookSelect(lib, 'lib-book');
	if (!sel) { fail(`${where}: no book filter`); continue; }
	if (!/aria-label="Filter by book"/.test(sel.tag)) fail(`${where}: the book filter is not labelled "Filter by book"`);
	const want = ['Every book', ...booksAt(n).map(bookLabel)];
	if (sel.words.join('|') !== want.join('|')) fail(`${where}: the book filter reads ${JSON.stringify(sel.words)}, not ${JSON.stringify(want)}`);
	if (n === 1 && want.join('|') !== 'Every book|The Core Dozen (12)|The Classics Canon (21)') fail(`Barback holds ${JSON.stringify(want.slice(1))}, not the Core Dozen and the Classics Canon`);
	/* every drink's chip is its level and its book, by name, and the list reads
	   by level, then book order, then name */
	const heads = [...lib.matchAll(/data-act="lib-toggle" data-i="(\d+)"[^>]*>[\s\S]*?<span class="bold">[^<]*<\/span><span class="chip">[^<]*<\/span><span class="chip brass">[^<]*<\/span><span class="chip">([^<]*)<\/span>/g)];
	const expect = COCKTAILS.map((c, i) => ({ c, i, l: drinkLevel.get(c.name) || 5, b: climb.indexOf(c.tier) }))
		.filter((x) => !n || x.l === n)
		.sort((a, b) => (a.l - b.l) || (a.b - b.b) || a.c.name.localeCompare(b.c.name));
	if (heads.map((h) => h[1]).join() !== expect.map((x) => x.i).join()) fail(`${where}: the drinks do not read by level, then book order, then name`);
	for (const h of heads) {
		const c = COCKTAILS[Number(h[1])];
		const chip = unesc(h[2]);
		const place = `${NAMES[drinkLevel.get(c.name) - 1]} · ${BOOKS[c.tier]}`;
		if (chip !== place) { fail(`${where}: ${c.name} carries "${chip}", not "${place}"`); break; }
	}
}
/* a book the level does not hold falls back to Every book; one it holds stays */
run("state.tab = 'library'; state.lib = { q:'', fam:'All', tier:'10', open:null, level:1 };");
{
	const sel = bookSelect(g('renderLibrary')(), 'lib-book');
	if (vm.runInContext('state.lib.tier', W) !== 'All' || (sel && sel.selected !== 'Every book')) fail('the Library at Barback keeps a book Barback does not hold, where it should read Every book');
	if (g('libList')().length !== booksAt(1).reduce((a, b) => a + b.n, 0)) fail('the Library at Barback, Every book, does not list every Barback drink');
}
/* the flashcards setup: the same filter, scoped by the level it deals from */
for (let n = 1; n <= 4; n++) {
	g('applyTarget')(g('trainTarget')('cards', n, 'cocktails'));
	run("state.fc.tier = '10';");
	const fc = g('renderFlashcards')();
	const where = `the flashcards dealing from ${NAMES[n - 1]}`;
	if (TIERWORD.test(fc)) fail(`${where}: says "tier"`);
	const sel = bookSelect(fc, 'fc-book');
	if (!sel) { fail(`${where}: no book filter`); continue; }
	if (!/aria-label="Filter by book"/.test(sel.tag)) fail(`${where}: the book filter is not labelled "Filter by book"`);
	const want = ['Every book', ...booksAt(n).map(bookLabel)];
	if (sel.words.join('|') !== want.join('|')) fail(`${where}: the book filter reads ${JSON.stringify(sel.words)}, not ${JSON.stringify(want)}`);
	const held = booksAt(n).some((b) => b.t === 10);
	if (sel.selected !== (held ? bookLabel(booksAt(n).find((b) => b.t === 10)) : 'Every book')) fail(`${where}: the Obscura chosen reads ${JSON.stringify(sel.selected)}`);
}
run('state.fc.level = null; state.fc.sub = null; state.fc.tier = \'All\';');
{
	const fc = g('renderFlashcards')();
	const sel = bookSelect(fc, 'fc-book');
	const want = ['Every book', ...booksAt(0).map(bookLabel)];
	if (!sel || sel.words.join('|') !== want.join('|')) fail(`the flashcards at every level: the book filter reads ${JSON.stringify(sel && sel.words)}`);
	if (TIERWORD.test(fc)) fail('the flashcards at every level: says "tier"');
}
/* the search index: family, spirit and the book's name */
for (const e of g('buildSearchIndex')()) {
	if (TIERWORD.test(e.s)) { fail(`the search index: "${e.t}" reads "${e.s}"`); break; }
	if (!e.h.startsWith('#/library/')) continue;
	const c = COCKTAILS.find((x) => x.name === e.t);
	if (c && e.s !== `${c.family} · ${c.spirit} · ${BOOKS[c.tier]}`) { fail(`the search index: "${e.t}" reads "${e.s}"`); break; }
}
/* a level page: its books, in book order, each a door with its count there,
   saying where it continues, and each door opens the Library at the level
   and the book */
const css = readFileSync(join(LEDGER, 'css', 'ledger.css'), 'utf8');
if (!/\.book\{[^}]*min-height:44px/.test(css)) fail('a book door is not 44px tall (css/ledger.css .book)');
for (let n = 1; n <= 4; n++) {
	setProgress(blank());
	run(`state.lt = null; state.tab = 'level'; state.level.n = ${n};`);
	const page = g('renderLevel')();
	const where = `the ${NAMES[n - 1]} page`;
	if (TIERWORD.test(page)) fail(`${where}: says "tier"`);
	const cell = (page.match(/<li class="subsection" data-sub="cocktails">([\s\S]*?)<\/li>/) || [])[1] || '';
	const group = cell.match(/<div class="books" role="group" aria-label="([^"]*)">([\s\S]*?)<\/div>/);
	if (!group) { fail(`${where}: the cocktails name no books`); continue; }
	if (group[1] !== `The books at ${NAMES[n - 1]}`) fail(`${where}: the books are labelled ${JSON.stringify(group[1])}`);
	const doors = [...group[2].matchAll(/<button class="book" data-act="book" data-n="(\d)" data-t="(\d+)">([\s\S]*?)<\/button>/g)];
	const want = booksAt(n);
	if (doors.map((d) => Number(d[2])).join() !== want.map((b) => b.t).join()) fail(`${where}: the books read ${JSON.stringify(doors.map((d) => BOOKS[d[2]]))}, not ${JSON.stringify(want.map((b) => b.name))} in book order`);
	for (const d of doors) {
		const b = want.find((x) => x.t === Number(d[2]));
		if (!b) continue;
		const next = nextLevelOf(b.t, n);
		const words = `${b.name} ${b.n} drink${b.n === 1 ? '' : 's'}${next ? ` Continues at ${NAMES[next - 1]}` : ''}`;
		if (unesc(strip(d[3])) !== words) fail(`${where}: the door to ${b.name} reads ${JSON.stringify(unesc(strip(d[3])))}, not ${JSON.stringify(words)}`);
		if (Number(d[1]) !== n) fail(`${where}: the door to ${b.name} opens another level`);
		const t = g('bookTarget')(n, b.t);
		if (!g('applyTarget')(t)) { fail(`${where}: the door to ${b.name} goes nowhere`); continue; }
		const lib = vm.runInContext('JSON.stringify({ tab: state.tab, level: state.lib.level, tier: state.lib.tier })', W);
		if (lib !== JSON.stringify({ tab: 'library', level: n, tier: String(b.t) })) fail(`${where}: the door to ${b.name} lands on ${lib}`);
		const sel = bookSelect(g('renderLibrary')(), 'lib-book');
		if (!sel || sel.selected !== bookLabel(b)) fail(`${where}: the door to ${b.name} opens the Library on ${JSON.stringify(sel && sel.selected)}`);
		if (g('libList')().length !== b.n) fail(`${where}: the door to ${b.name} lists ${g('libList')().length} drinks, not ${b.n}`);
	}
}
run("state.tab = 'home';");

/* ---- the Record door lands on the record, More's first row ---- */
run("state.mine.at = 'record';");
if (!/<h2 class="lv-title" id="record-head" tabindex="-1" data-open="1">The record<\/h2>/.test(g('renderRecord')())) fail('the Record door does not land on the record heading');
if (!/data-act="go" data-tab="record"/.test(g('renderMine')())) fail('More has no door to the record');

if (problems.length) {
	console.error(`\n  ✗ ${problems.length} problem(s)`);
	for (const p of problems.slice(0, 60)) console.error(`    ${p}`);
	process.exit(1);
}
console.log('  ✓ the home is the contract on three records, every level page and door resolves, every level test ends on what got away with no score, every level is its name, and the twelve books sit inside the levels by name');
