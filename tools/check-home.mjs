/**
 * The four levels' screens, gated. Run: `node tools/check-home.mjs` (exits
 * non-zero on any problem).
 *
 * The whole app is loaded from index.html's own script list into a DOM-free
 * sandbox (tools/load-wing.mjs), so what is checked is the SHIPPED renderers.
 * Three records are put in front of them: a fresh one, a partial one, and one
 * with every Level I unit met. Against each:
 *
 *   - the home is the shared contract and nothing else: one section.levels of
 *     four button.level (I to IV, the names, a word and figure in each), then
 *     one nav.quiet of four doors (Today, Library, Record, Mine · My Bar); one
 *     card is `on`, carries aria-current and the words "Your level", and it is
 *     the level this gate works out for itself; every card's word and figure
 *     equals the one this gate computes independently from the placements
 *     and the records; the Today door names the level it deals from
 *   - every level page lists the eight subsections, each with "N at this
 *     level", and every training door it draws resolves to a real tab; the
 *     page ends on "The Level N test"
 *   - every level test deals seventeen questions; sat wrong, it ends on "What
 *     got away" with no percentage, no score (no "n / m"), none of the quiz
 *     round's verdicts, and without adding a row to progress.quizzes; sat
 *     right, it ends on "Nothing got away."; either way the sitting is
 *     recorded in progress.levels
 *   - nothing these screens render carries an em dash
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

const romans = ['I', 'II', 'III', 'IV'];
const LEVELS = g('LEVELS');
const TABS = new Set(g('TABS').map((t) => t[0]));
const strip = (s) => s.replace(/<[^>]+>/g, '');

for (const [name, rec] of [['fresh', fresh], ['partial', partial], ['Level I met', levelOne]]) {
	setProgress(rec);
	run('state.lt = null; state.sess = null; state.level.n = null;');
	const home = g('renderHome')();
	const where = `home (${name})`;
	if (home.includes(EMDASH)) fail(`${where}: carries an em dash`);
	const inner = home.replace(/^<div class="home4">/, '').replace(/<\/div>$/, '');
	if (!/^<section class="levels" aria-label="Levels">[\s\S]*<\/section><nav class="quiet" aria-label="Doors">[\s\S]*<\/nav>$/.test(inner)) fail(`${where}: is not exactly section.levels then nav.quiet`);
	const cards = [...home.matchAll(/<button class="level( on)?" data-act="level-open" data-n="(\d)" data-level="\d"( aria-current="step")?>([\s\S]*?)<\/button>/g)];
	if (cards.length !== 4) fail(`${where}: ${cards.length} level cards, not four`);
	const want = firstUnmet(rec);
	cards.forEach((c, i) => {
		const n = Number(c[2]), body = c[4];
		if (n !== i + 1) fail(`${where}: card ${i + 1} is level ${n}`);
		const num = (body.match(/<span class="lv-num">([^<]*)<\/span>/) || [])[1];
		const nm = (body.match(/<span class="lv-name">([^<]*)<\/span>/) || [])[1];
		const stat = (body.match(/<span class="lv-stat">([^<]*)<\/span>/) || [])[1];
		if (num !== romans[i]) fail(`${where}: card ${i + 1} numeral ${num}`);
		if (nm !== LEVELS[i].name) fail(`${where}: card ${i + 1} name ${nm}`);
		const expect = levelWord(rec, n);
		if (stat !== expect) fail(`${where}: Level ${romans[i]} reads "${stat}", the gate reckons "${expect}"`);
		const on = Boolean(c[1]);
		if (on !== (n === want)) fail(`${where}: Level ${romans[i]} ${on ? 'is' : 'is not'} marked, and the reader is on Level ${romans[want - 1]}`);
		if (on && (!c[3] || !/<span class="lv-here">Your level<\/span>/.test(body))) fail(`${where}: the current card lacks aria-current or "Your level"`);
		if (!on && /lv-here/.test(body)) fail(`${where}: "Your level" on a card that is not current`);
	});
	const doors = [...home.matchAll(/<button class="door" data-act="door" data-d="(\w+)"><span class="door-name">([^<]*)<\/span><span class="door-line">([^<]*)<\/span>(?:<span class="door-sub">([^<]*)<\/span>)?<\/button>/g)];
	const names = doors.map((d) => d[2]);
	if (names.join('|') !== 'Today|Library|Record|Mine · My Bar') fail(`${where}: the doors read ${JSON.stringify(names)}`);
	const today = doors[0] && doors[0][4];
	const deals = g('todayLevel')();
	if (today !== `Today deals from Level ${romans[deals - 1]}.`) fail(`${where}: the Today door says ${JSON.stringify(today)}`);
	if (name === 'Level I met' && deals !== 2) fail(`${where}: with Level I met, Today still deals from Level ${romans[deals - 1]}`);
	if (name === 'fresh' && deals !== 1) fail(`${where}: a fresh record is dealt Level ${romans[deals - 1]}`);
}

/* ---- the level pages and their doors ---- */
setProgress(fresh);
for (let n = 1; n <= 4; n++) {
	run(`state.lt = null; state.level.n = ${n};`);
	const page = g('renderLevel')();
	const where = `Level ${romans[n - 1]}'s page`;
	if (page.includes(EMDASH)) fail(`${where}: carries an em dash`);
	if (!page.includes(`<h2 class="lv-title"><span class="lv-num">${romans[n - 1]}</span> ${LEVELS[n - 1].name}</h2>`)) fail(`${where}: the title is not the numeral and the name`);
	const subs = [...page.matchAll(/<li class="subsection" data-sub="(\w+)">([\s\S]*?)<\/li>/g)];
	if (subs.length !== 8) fail(`${where}: ${subs.length} subsections, not eight`);
	for (const s of subs) {
		if (!/<p class="sub-line">\d+ at this level · [^<]+<\/p>/.test(s[2])) fail(`${where}, ${s[1]}: no "N at this level"`);
		const trains = [...s[2].matchAll(/data-act="train" data-m="(\w+)" data-n="(\d)" data-s="(\w+)"/g)];
		if (!trains.length) fail(`${where}, ${s[1]}: no training door`);
		for (const t of trains) {
			const target = g('trainTarget')(t[1], Number(t[2]), t[3]);
			if (!target || !TABS.has(target.tab)) fail(`${where}, ${s[1]}: the ${t[1]} door goes nowhere`);
		}
	}
	if (/data-m="read"[^>]*>Read<\/button>/.test(page)) fail(`${where}: a Read door does not say where it goes`);
	const last = page.match(/<button class="btn btn-brass leveltest" data-act="lt-start" data-n="(\d)">([^<]*)<\/button>/);
	if (!last || last[2] !== `The Level ${romans[n - 1]} test`) fail(`${where}: does not end on its test`);
}

/* ---- the level tests ---- */
const VERDICTS = ['Clean round', 'Solid. Read the misses', 'Half is a start', 'Everyone starts by polishing'];
for (let n = 1; n <= 4; n++) {
	for (const right of [false, true]) {
		setProgress(blank());
		const quizzesBefore = getProgress().quizzes.length;
		const t = g('ltStart')(n);
		const where = `the Level ${romans[n - 1]} test, sat ${right ? 'right' : 'wrong'}`;
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
			if (/%|score/i.test(strip(screen))) fail(`${where}: question ${i + 1}'s screen shows a percentage or a score`);
			g('ltPick')(idx);
			g('ltNext')();
		}
		/* the end, less the missed rows' content (their prompts, answers and
		   explanations are the book's words, "3/4 oz" and "40%" among them) */
		const done = g('renderLevelTest')().replace(/<ul class="lt-misses">[\s\S]*?<\/ul>/, '<ul class="lt-misses"></ul>');
		const text = strip(done);
		if (done.includes(EMDASH)) fail(`${where}: the end carries an em dash`);
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
		if (!g('applyTarget')(t)) { fail(`Level ${romans[n - 1]}, ${sub}: the Quiz door dealt nothing`); continue; }
		const round = vm.runInContext('state.quiz.round', W);
		round.forEach((q, i) => {
			if (!q.factCard) return;
			factQs++;
			run(`state.quiz.idx = ${i}; state.quiz.picked = null;`);
			const screen = g('renderQuiz')();
			const whole = (screen.match(/<div class="ticket">[\s\S]*?<\/div><\/div>(?=<div class="col-sm">)/) || [])[0];
			if (!whole) { fail(`Level ${romans[n - 1]}, ${sub}: "${q.factCard.name}" is asked without its card`); return; }
			/* the facts, below the card's category (a cider is labelled Cider on
			   purpose: the decoys are ciders too) */
			const ticket = whole.split('<div class="tix-rule"></div>').slice(1).join(' ');
			const words = q.factCard.name.split(/[^A-Za-z\u00C0-\u024F]+/).filter((w) => w.length >= 4);
			const text = strip(ticket).toLowerCase();
			for (const w of words) if (new RegExp('(^|[^a-z\u00C0-\u024F])' + w.toLowerCase() + '($|[^a-z\u00C0-\u024F])').test(text)) fail(`Level ${romans[n - 1]}, ${sub}: the blind card for "${q.factCard.name}" names it`);
		});
	}
}
if (!factQs) fail('no Quiz door dealt a beer or coffee card, so the blind card was never checked');

/* ---- the Record door lands on the record ---- */
run("state.mine.at = 'record';");
if (!/<h3 class="sub-head" id="record-head" tabindex="-1" data-open="1">The record<\/h3>/.test(g('renderMine')())) fail('the Record door does not land on the record heading');

if (problems.length) {
	console.error(`\n  ✗ ${problems.length} problem(s)`);
	for (const p of problems.slice(0, 60)) console.error(`    ${p}`);
	process.exit(1);
}
console.log('  ✓ the home is the contract on three records, every level page and door resolves, every level test ends on what got away with no score');
