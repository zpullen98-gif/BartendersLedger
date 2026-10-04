/**
 * The menu importer's parser, gated.
 *
 * This is src/lib/menu-parse.test.ts from the World Table, ported from vitest
 * to node:test, and pointed at the SHIPPED js/menu-desk.js (the Menu Desk
 * port, through its parseMenuText adapter) rather than at a copy of it.
 * Extracting the real function through vm is the same anti-drift
 * discipline tools/check.mjs already uses for slugify: a test that reads a
 * duplicate of the code passes forever after the code changes.
 *
 * THE FIXTURES ARE THE ORIGINAL ONES, food and all, on purpose. They exercise
 * the same code path, and rewriting them as cocktails would drop coverage
 * while looking like work. A dish name with a bracket and a dot leader tests
 * exactly what a drink name with a bracket and a dot leader tests, and these
 * ones have already found bugs.
 *
 * HOW THE FOOD HALF GOT HERE, so it can be redone rather than guessed at: the
 * source file was taken verbatim and four things were removed, in this order.
 * The three vitest imports and the `type Row = Omit<...>` line; the two type
 * annotations on the `rows` and `one` helpers; the `as never` casts; and that
 * is all. Every assertion below is the assertion that was written for the
 * parser, not a transcription of it, with two pins re-read for the desk: the
 * reader now takes every run-on line until the next item, and a name over a
 * price on its own line is a priced dish. The cocktail half at the bottom was
 * written here, because js/menu-drinks.js has no counterpart over there.
 *
 * THE DESK HALF runs the three desk fixtures under tools/fixtures/ (copied
 * from WorldTable/src/lib/desk/fixtures, never edited here) through the
 * shipped readMenu, then through menuDrinkFromDeskItem and saveBarRecord
 * with progress stubbed, and pins the rule that matters most: every measure
 * lineOz finds on a produced spec line is a substring of the raw line the
 * row came from, and '3/4 oz lime' is one part reading 0.75, never '4 oz'.
 * Beside it: a draft is dealt by no deck, Tonight's Session included, and
 * arrives as a draft through the backup import's two branches; her method,
 * glass and garnish are kept INTO the field through keepMaitreField; "It is
 * a dish" on the shared origin replaces the inbox's row by id over a
 * Map-backed slot; and the never-twice answer is said once through say().
 *
 * Run: node tools/check-import.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const JS = process.env.LEDGER_JS || new URL('../js/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = readFileSync(join(JS, 'menu-desk.js'), 'utf8');
/* runInThisContext, not a sandbox: the parser touches no DOM, and an array
   built in another realm has another realm's Array.prototype, which makes
   every deepStrictEqual in this file fail on the prototype rather than on
   the values. */
const { parseMenuText, readMenu, deskSource, deskInbox, reReadAs, priceInRaw } = vm.runInThisContext(
	src + ';({parseMenuText,readMenu,deskSource,deskInbox,reReadAs,priceInRaw})');
/* the desk's line cap, raised for the House on 3 October 2026; the port keeps it inside its own scope, so the figure is pinned here */
const MAX_LINES = 20000;
const FIXTURES = new URL('./fixtures/', import.meta.url);
const fixture = (name) => readFileSync(new URL(name, FIXTURES), 'utf8');
const { htmlToMenuText, linkToText } = vm.runInThisContext(
	readFileSync(join(JS, 'menu-read.js'), 'utf8') + ';({htmlToMenuText,linkToText})');

/* The cocktail layer's lexicon is the SHIPPED vocabulary, so the whole app has
   to be loaded to test it. Same realm again, and the three globals the app
   touches at load time are stubbed on globalThis first rather than in a
   sandbox object, because a sandbox is a second realm and every deepStrictEqual
   in this file would then fail on a prototype instead of on a value. */
globalThis.window = {};
/* navigator is a getter-only global in node, so define rather than assign */
if(!globalThis.navigator) Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
/* ui-import.js rides along too, for the desk's re-kind and the never-twice
   answer. It calls say() and render(), which live in app.js and are not
   loaded, so both are stubs: say() collects what it was asked to announce,
   and the pins read that list. FileReader and confirm are the two globals
   the backup import touches; both are stubbed synchronous, so a pin reads
   the result in the same tick, and confirm answers from a queue because the
   import asks twice (merge? then replace?) on the replace path. */
globalThis.announced = [];
globalThis.say = (m) => { if (m) globalThis.announced.push(String(m)); };
globalThis.render = () => {};
globalThis.confirmAnswers = [];
globalThis.confirm = () => (globalThis.confirmAnswers.length ? globalThis.confirmAnswers.shift() : true);
globalThis.FileReader = class { readAsText(text){ this.result = text; if (this.onload) this.onload(); } };
/* ui-study.js, ui-new.js, ui-menu.js and ui-import.js ride along for the desk
   half: the record's save (saveBarRecord), its shape pass
   (normalizeBarRecord), the pour sources, the session deck, the backup
   import and the re-kind of a row are what the drafts and the round trip
   are asserted against, and they are the SHIPPED functions. Their order is
   index.html's, because ui-menu.js assigns SEARCH_INDEX, which ui-new.js
   declares; srs.js is here because the backup import calls srsMigrate. */
const APP = ['data-core.js', 'data-lore.js', 'data-ontap.js', 'data-coffee.js', 'data-service.js', 'data-ingredients.js',
	'ingredients.js', 'engine.js', 'srs.js', 'ui-study.js', 'ui-practice.js', 'ui-reference.js', 'ui-prep.js', 'ui-new.js',
	'menu-drinks.js', 'ui-menu.js', 'ui-import.js', 'data-levels.js', 'levels.js', 'ui-levels.js', 'house-bar.js', 'house-study.js'];
const W = vm.runInThisContext(APP.map((f) => readFileSync(join(JS, f), 'utf8')).join(';\n') +
	';({menuDrinkFromDeskItem,menuDraftsFromDesk,menuDraftFromText,menuCanonMeasures,unmeasuredReason,measureReport,' +
	'MD_isIngredientList,MD_listParts,MD_spiritOf,lineOz,COCKTAILS,progress,state,' +
	'saveBarRecord,normalizeBarRecord,normalizeBarRecords,normalizeMaitre,mergeMaitre,missingFor,pourSources,allDrinks,barChanged,' +
	'fcPool,buildRound,menuCardCount,sessionDeckParts,sessionCardPool,dataImport,keepMaitreField,' +
	'blankImport,importFromText,importReKind,levelOf,cardKey,todayLevel,todayDoor,LEVEL_ITEMS,' +
	'removeBarRecord,normalizeHouseRecords,mergeHouseRecords,FC_MODES,hasSpec,' +
	'houseHere,houseSyncIn,houseProject,houseSwitch,housePut,houseRemove,houseNames,houseNamesRefresh,' +
	'isHouseCard,hasKeptLines,keptLineOf,qMyBarLine,houseLineHTML,houseTakePack,houseImportChoice,houseOpenAdded,houseNotNow,houseMint,' +
	'menuFormulaChip,menuFormulaHTML,menuPaneHTML,menuListHTML,houseFormulaAct,houseProblems,houseUIHooks,houseAfterRender,houseStep,housePackPanelHTML,houseRedrawIfShown,' +
	'qMyBarUpsell,qMyBarParts,keptPartsOf,keptUpsellsOf,houseCardFits,houseCardBackHTML,houseUpsellWhy,houseDrillPanelHTML,houseStartCards,houseStartPair,' +
	'housePairReady,housePairWhy,houseQuizRound,renderQuiz,renderFlashcards,renderMenu,recordCard,QUIZ_MODES,' +
	'houseAutoLoad,houseDrillAct,houseDrillHTML,houseDrillDoorsHTML,houseSayItems,houseRoleDeck,houseSayPick,houseRowForm,' +
	'houseStudyOn,houseStudyHTML,houseStudyAct,houseStudyDeck,houseStudyDeepLink,houseStudyRoute,houseStudySectionOf,hsCanonFor,hsProducersFor,applyRoute,currentRoute})');

/* The House engine, ../shared/oot-house.js, for the house cases below: the
   wing layout keeps it two folders up, the source repo reads WorldTable's
   copy beside it, and OOT_SHARED=<dir> names another. A named directory
   that lacks the engine is a failure, so a mis-set path cannot pass as a
   skip; neither default present is a note and a skip. */
const SHARED_DEFAULTS = ['../../shared/', '../../worldtable/static/shared/'];
const sharedDir = process.env.OOT_SHARED
	? process.env.OOT_SHARED.replace(/[\\/]?$/, '/')
	: SHARED_DEFAULTS.map((d) => new URL(d, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).find((d) => existsSync(join(d, 'oot-house.js')));
const HOUSE_ENGINE = sharedDir ? join(sharedDir, 'oot-house.js') : null;
if (process.env.OOT_SHARED && !existsSync(HOUSE_ENGINE)) {
	console.error('check-import: OOT_SHARED names ' + sharedDir + ' but it holds no oot-house.js');
	process.exit(1);
}
if (!HOUSE_ENGINE) console.log('SKIPPED house cases: no shared folder beside this checkout (OOT_SHARED=<dir> names one)');

/* The handful of vitest matchers this suite uses, over node:assert. A shim
   rather than a rewrite, so every assertion below is the assertion that was
   written for the parser rather than my transcription of it. */
function subset(actual, expected, path){
	if (expected === null || typeof expected !== 'object') {
		assert.deepStrictEqual(actual, expected, path);
		return;
	}
	if (Array.isArray(expected)) {
		assert.ok(Array.isArray(actual), path + ' is not an array');
		assert.strictEqual(actual.length, expected.length, path + ' length');
		expected.forEach((v, i) => subset(actual[i], v, path + '[' + i + ']'));
		return;
	}
	assert.ok(actual && typeof actual === 'object', path + ' is not an object');
	for (const k of Object.keys(expected)) subset(actual[k], expected[k], path + '.' + k);
}
/* vitest's fake-timer calls, over node's own. Only the two timeout tests use
   them, and they are the two worth keeping: a fetch that never answers is the
   shape a bar's website actually fails in. */
const vi = {
	useFakeTimers: () => mock.timers.enable({ apis: ['setTimeout'] }),
	useRealTimers: () => mock.timers.reset(),
	/* node's mock.timers has tick, not tickAsync: fire the timers, then let the
	   promise chain the abort kicks off actually run before the assertion. */
	advanceTimersByTimeAsync: async (ms) => {
		mock.timers.tick(ms);
		await new Promise((r) => setImmediate(r));
	},
};

function expect(actual){
	const api = {
		toBe: (e) => assert.strictEqual(actual, e),
		toEqual: (e) => assert.deepStrictEqual(actual, e),
		toMatchObject: (e) => subset(actual, e, 'value'),
		toHaveLength: (n) => assert.strictEqual(actual.length, n),
		toMatch: (re) => assert.match(String(actual), re),
		toThrow: () => assert.throws(actual),
		toBeLessThan: (n) => assert.ok(actual < n, actual + ' is not < ' + n),
		toBeLessThanOrEqual: (n) => assert.ok(actual <= n, actual + ' is not <= ' + n),
		toBeGreaterThan: (n) => assert.ok(actual > n, actual + ' is not > ' + n),
		toBeGreaterThanOrEqual: (n) => assert.ok(actual >= n, actual + ' is not >= ' + n),
		toContain: (e) => assert.ok(
			typeof actual === 'string' ? actual.includes(e) : Array.prototype.includes.call(actual, e),
			JSON.stringify(e) + ' is not in ' + JSON.stringify(actual).slice(0, 400)),
	};
	/* every matcher negated, rather than a hand-listed few: a suite that uses
	   .not.toContain once and .not.toMatch once will use a third next year, and
	   a missing one fails as 'not a function' rather than as a real result. */
	api.not = {};
	for (const k of Object.keys(api)) {
		api.not[k] = (...a) => assert.throws(() => api[k](...a), () => true,
			'expected NOT ' + k + ', but it held');
	}
	api.not.toThrow = () => assert.doesNotThrow(actual);
	return api;
}
/**
 * The menu importer's parser, tested against the three shapes a real menu
 * arrives in: typed and tidy, printed with dot leaders and mixed currency, and
 * scraped off a photograph by an OCR pass that got most of it right.
 *
 * The fixtures are asserted whole rather than a row at a time. A menu parser
 * fails by drifting · a heading quietly becoming a dish, a description quietly
 * joining the row above · and a whole-menu assertion is the only kind that
 * notices, because it fails on the row that moved as well as the row that broke.
 */

/** The fields a row asserts on; `raw` is checked separately where it matters. */

const rows = (text) =>
	parseMenuText(text).dishes.map(({ raw: _raw, ...rest }) => rest);

const one = (text) => {
	const { dishes } = parseMenuText(text);
	expect(dishes).toHaveLength(1);
	return dishes[0];
};

describe('a clean typed menu', () => {
	const MENU = `
STARTERS

Crispy squid, lemon and chilli mayonnaise    9.50
Soup of the day (v)    6
Bread and butter    4.50

MAINS

Roast chicken, bread sauce and greens    18
Whole plaice - brown shrimp butter    MP
Cauliflower shawarma (vg) (gf)    15.50

PUDDINGS

Sticky toffee pudding    8
Cheese, three British    12 / 16

All prices include VAT. Please inform us of any allergies.
`;

	it('reads every dish, under the right heading, with the price as printed', () => {
		expect(rows(MENU)).toEqual([
			{
				section: 'STARTERS',
				name: 'Crispy squid',
				description: 'lemon and chilli mayonnaise',
				price: '9.50',
				tags: [],
				confidence: 'low'
			},
			{
				section: 'STARTERS',
				name: 'Soup of the day',
				description: '',
				price: '6',
				tags: ['v'],
				confidence: 'high'
			},
			{
				section: 'STARTERS',
				name: 'Bread and butter',
				description: '',
				price: '4.50',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'MAINS',
				name: 'Roast chicken',
				description: 'bread sauce and greens',
				price: '18',
				tags: [],
				confidence: 'low'
			},
			{
				section: 'MAINS',
				name: 'Whole plaice',
				description: 'brown shrimp butter',
				price: 'MP',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'MAINS',
				name: 'Cauliflower shawarma',
				description: '',
				price: '15.50',
				tags: ['vg', 'gf'],
				confidence: 'high'
			},
			{
				section: 'PUDDINGS',
				name: 'Sticky toffee pudding',
				description: '',
				price: '8',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'PUDDINGS',
				name: 'Cheese',
				description: 'three British',
				price: '12 / 16',
				tags: [],
				confidence: 'low'
			}
		]);
	});

	it('drops the footer notice rather than pricing it as a dish', () => {
		expect(parseMenuText(MENU).skipped).toEqual([
			'All prices include VAT. Please inform us of any allergies.'
		]);
	});

	it('keeps the source line on every row so the cook can see where it came from', () => {
		const squid = parseMenuText(MENU).dishes[0];
		expect(squid.raw).toBe('Crispy squid, lemon and chilli mayonnaise    9.50');
	});
});

describe('a printed menu with dot leaders and mixed currency', () => {
	const MENU = `~ To Begin ~
Olives .......... 4
Padrón peppers ......... £6.50
Jamón ibérico .... 14 GBP
Croquetas (v) ...... 7

~ From The Grill ~
Ribeye 300g ................ £34
Lamb chops ...... 26€
Chicken skewers ........ 12,50

Wines
Albariño          Glass 8 Bottle 30
Rioja Reserva 2019 ......... £42
`;

	it('reads through the leaders and keeps each currency exactly as printed', () => {
		expect(rows(MENU)).toEqual([
			{
				section: 'To Begin',
				name: 'Olives',
				description: '',
				price: '4',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'To Begin',
				name: 'Padrón peppers',
				description: '',
				price: '£6.50',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'To Begin',
				name: 'Jamón ibérico',
				description: '',
				price: '14 GBP',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'To Begin',
				name: 'Croquetas',
				description: '',
				price: '7',
				tags: ['v'],
				confidence: 'high'
			},
			{
				section: 'From The Grill',
				name: 'Ribeye 300g',
				description: '',
				price: '£34',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'From The Grill',
				name: 'Lamb chops',
				description: '',
				price: '26€',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'From The Grill',
				name: 'Chicken skewers',
				description: '',
				price: '12,50',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'Wines',
				name: 'Albariño',
				description: '',
				price: 'Glass 8 Bottle 30',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'Wines',
				name: 'Rioja Reserva 2019',
				description: '',
				price: '£42',
				tags: [],
				confidence: 'high'
			}
		]);
	});

	it('skips nothing, because nothing on this menu was a notice', () => {
		expect(parseMenuText(MENU).skipped).toEqual([]);
	});
});

describe('a menu scraped off a photograph', () => {
	const MENU = `STARTERS
l
Crispy squid .. 9.5
   with lemon aioli
Salt cod croquettes    8
   smoked paprika, aioli
O

SIDES
Chips   4
Greens   4
Bread

Open Mon - Fri 12 - 3pm
Tel 020 7946 0958
www.example.com
2
`;

	it('gathers the run-on lines, keeps the sides, and throws away the specks', () => {
		expect(rows(MENU)).toEqual([
			{
				section: 'STARTERS',
				name: 'Crispy squid',
				description: 'with lemon aioli',
				price: '9.5',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'STARTERS',
				name: 'Salt cod croquettes',
				description: 'smoked paprika, aioli',
				price: '8',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'SIDES',
				name: 'Chips',
				description: '',
				price: '4',
				tags: [],
				confidence: 'high'
			},
			{
				section: 'SIDES',
				name: 'Greens',
				description: '',
				price: '4',
				tags: [],
				confidence: 'high'
			},
			// Bread has the shape of a heading and is a side, which is the one
			// genuinely undecidable line on a menu. It sits in the middle of a
			// priced list with no blank line above it, so it stays a dish, priced
			// nothing and flagged for the cook to price.
			{
				section: 'SIDES',
				name: 'Bread',
				description: '',
				price: '',
				tags: [],
				confidence: 'low'
			}
		]);
	});

	it('sends the opening hours, the phone number, the website and the page number to skipped', () => {
		expect(parseMenuText(MENU).skipped).toEqual([
			'l',
			'O',
			'Open Mon - Fri 12 - 3pm',
			'Tel 020 7946 0958',
			'www.example.com',
			'2'
		]);
	});

	it('keeps both source lines on a dish that ran on', () => {
		expect(parseMenuText(MENU).dishes[0].raw).toBe('Crispy squid .. 9.5\n   with lemon aioli');
	});
});

describe('section headings', () => {
	it('reads a shouted heading, and does not sell it', () => {
		const { dishes } = parseMenuText('STARTERS\nOlives 4');
		expect(dishes).toHaveLength(1);
		expect(dishes[0].section).toBe('STARTERS');
	});

	it('reads a decorated heading and strips the decoration', () => {
		for (const heading of ['~ Mains ~', '— Puddings —', '*** SIDES ***', '=== Sides ===']) {
			const { dishes } = parseMenuText(`${heading}\nOlives 4`);
			expect(dishes).toHaveLength(1);
			expect(dishes[0].section).toBe(heading.replace(/^[~—*=\s]+|[~—*=\s]+$/g, ''));
		}
	});

	it('reads a heading that ends in a colon', () => {
		expect(parseMenuText('Sides:\nChips 4').dishes[0].section).toBe('Sides');
	});

	it('reads a title-case heading that has a break above it and a priced dish below', () => {
		expect(parseMenuText('To Begin\nOlives 4').dishes[0].section).toBe('To Begin');
		expect(parseMenuText('From the Grill\n\nRibeye 34').dishes[0].section).toBe('From the Grill');
	});

	it('leaves the section empty when the menu never said', () => {
		expect(parseMenuText('Olives 4').dishes[0].section).toBe('');
	});

	it('returns the heading as printed rather than tidying its case', () => {
		expect(parseMenuText('BBQ AND SMOKE\nRibs 14').dishes[0].section).toBe('BBQ AND SMOKE');
	});
});

describe('finding the price', () => {
	it('takes a price off the end however it was separated from the name', () => {
		expect(one('Crispy squid 9.5').price).toBe('9.5');
		expect(one('Crispy squid ....... 9.5').price).toBe('9.5');
		expect(one('Crispy squid\t9.5').price).toBe('9.5');
		expect(one('Crispy squid __________ 9.5').price).toBe('9.5');
	});

	it('keeps the currency exactly where the menu put it, or left it out', () => {
		const cases = ['12', '12.5', '12.50', '£12', '$12', '12€', '14 GBP', '£ 12', '50p'];
		for (const price of cases) {
			expect(one(`Crispy squid ${price}`).price).toBe(price);
		}
	});

	it('keeps two sizes on one line whole, because that is what the menu is selling', () => {
		expect(one('Soup 6/9').price).toBe('6/9');
		expect(one('Soup 6 / 9').price).toBe('6 / 9');
		expect(one('House Albariño Glass 8 Bottle 30').price).toBe('Glass 8 Bottle 30');
		expect(one('House Albariño Glass 8 Bottle 30').name).toBe('House Albariño');
	});

	it('keeps market price as printed', () => {
		for (const price of ['MP', 'M/P', 'POA', 'market price']) {
			const dish = one(`Whole lobster ${price}`);
			expect(dish.price).toBe(price);
			expect(dish.name).toBe('Whole lobster');
		}
	});

	it('leaves a number that belongs to the name in the name', () => {
		expect(one('Pinot Noir 2019 £42').name).toBe('Pinot Noir 2019');
		expect(one('Half chicken 14')).toMatchObject({ name: 'Half chicken', price: '14' });
		expect(one('Pizza 12 inch')).toMatchObject({ name: 'Pizza 12 inch', price: '' });
	});

	it('never invents a price it could not find', () => {
		expect(one('Soup of the day')).toMatchObject({ price: '', confidence: 'low' });
	});

	it('does not repair an OCR digit, because that would be inventing the price', () => {
		// The scan read 9.5 as 9.S. A row with no price is a row the cook fixes; a
		// row priced 9.5 on this parser's guess is a row nobody checks.
		expect(one('Crispy squid 9.S')).toMatchObject({
			name: 'Crispy squid 9.S',
			price: '',
			confidence: 'low'
		});
	});
});

describe('names and descriptions', () => {
	it('splits on a dash, a colon or a pipe and trusts the result', () => {
		for (const line of [
			'Whole plaice - brown shrimp butter 24',
			'Whole plaice – brown shrimp butter 24',
			'Whole plaice: brown shrimp butter 24',
			'Whole plaice | brown shrimp butter 24'
		]) {
			expect(one(line)).toMatchObject({
				name: 'Whole plaice',
				description: 'brown shrimp butter',
				confidence: 'high'
			});
		}
	});

	it('splits on a comma but says the row is a guess', () => {
		expect(one('Crispy squid, lemon aioli 9.5')).toMatchObject({
			name: 'Crispy squid',
			description: 'lemon aioli',
			confidence: 'low'
		});
	});

	it('takes a description off the next line, indented or not', () => {
		expect(one('Roast chicken 16\n  bread sauce and greens').description).toBe(
			'bread sauce and greens'
		);
		expect(one('Roast chicken 16\nbread sauce and greens').description).toBe(
			'bread sauce and greens'
		);
	});

	it('takes every run-on line until the next item', () => {
		// The two-line cap went with the desk: a description is however many
		// lines the menu gave it, and the next ITEM (a priced line, a name over
		// a price, a heading) is what ends it, not a count.
		const { dishes } = parseMenuText('Roast chicken 16\nbread sauce\nand greens\nand a fourth line');
		expect(dishes).toHaveLength(1);
		expect(dishes[0].description).toBe('bread sauce and greens and a fourth line');
		const two = parseMenuText('Roast chicken 16\nbread sauce\nand greens\nWhole plaice 24');
		expect(two).toMatchObject({ dishes: [{ description: 'bread sauce and greens' }, { name: 'Whole plaice', price: '24' }] });
	});

	it('keeps a word an OCR pass split in half with the dish it belongs to', () => {
		expect(one('Slow-roast pork bel 19\nly with apple sauce').description).toBe(
			'ly with apple sauce'
		);
	});

	it('never emits a row with no name', () => {
		expect(parseMenuText('9.50').dishes).toEqual([]);
		expect(parseMenuText('(v)').dishes).toEqual([]);
		expect(parseMenuText('9.50').skipped).toEqual(['9.50']);
		// A price alone is an orphan; a price under a name is the name's. This
		// was the main failure on a real menu: the price on its own line was
		// junk, and the dish above it went priceless.
		const { dishes } = parseMenuText('Soup of the day\n9.50');
		expect(dishes).toHaveLength(1);
		expect(dishes[0]).toMatchObject({ name: 'Soup of the day', price: '9.50', confidence: 'high' });
	});

	it('takes a takeaway menu number off the front of the dish', () => {
		expect(one('12. Sweet and sour pork 8.20')).toMatchObject({
			name: 'Sweet and sour pork',
			price: '8.20'
		});
		expect(one('13) Kung po chicken 8.60').name).toBe('Kung po chicken');
		// The row this was found on. Before the number came off, ' - ' read as the
		// kitchen separating a name from a description and this came back as a
		// dish called '14', marked high confidence because nothing had been
		// guessed on that reading.
		expect(one('14 - Egg fried rice 3.90')).toMatchObject({
			name: 'Egg fried rice',
			description: '',
			price: '3.90',
			confidence: 'high'
		});
	});

	it('shows the cook the numbering it took off, in raw', () => {
		expect(one('12. Sweet and sour pork 8.20').raw).toBe('12. Sweet and sour pork 8.20');
	});

	it('leaves a number alone that is not a menu numbering', () => {
		// A hyphenated name, a menu that prints the price first, and a page number
		// on its own line: none of them is a dish index and none of them may lose
		// its front.
		expect(one('5-spice duck 18').name).toBe('5-spice duck');
		expect(one('12.50 Soup of the day').name).toBe('12.50 Soup of the day');
		expect(parseMenuText('12.').dishes).toEqual([]);
	});
});

describe('dietary marks the menu printed', () => {
	it('takes a bracketed mark out of the name and into tags', () => {
		expect(one('Falafel (v) 8.50')).toMatchObject({ name: 'Falafel', tags: ['v'] });
		expect(one('Falafel [GF] 8.50')).toMatchObject({ name: 'Falafel', tags: ['gf'] });
		expect(one('Dhal (vg, gf) 9')).toMatchObject({ name: 'Dhal', tags: ['vg', 'gf'] });
		expect(one('Dhal (vegan) 9').tags).toEqual(['vg']);
	});

	it('takes a bare mark off either side of the price', () => {
		expect(one('Falafel v 8.50')).toMatchObject({ name: 'Falafel', tags: ['v'] });
		expect(one('Falafel 8.50 v')).toMatchObject({ name: 'Falafel', tags: ['v'] });
		expect(one('Dhal ve 9').tags).toEqual(['vg']);
		expect(one('Pistachio cake n 7').tags).toEqual(['n']);
	});

	it('leaves a bracket alone when it is not a mark', () => {
		expect(one('Crispy squid (served cold) 9.5').name).toBe('Crispy squid (served cold)');
	});

	it('leaves a word alone that merely starts like a mark', () => {
		expect(one('Mixed veg 4')).toMatchObject({ name: 'Mixed veg', tags: [] });
	});

	it('strips a decorative symbol but invents no meaning for it', () => {
		// The legend explaining the diamond is printed somewhere this parser cannot
		// see. Guessing at it would be putting a dietary claim in the kitchen's mouth.
		expect(one('Ribeye ◆ 34')).toMatchObject({ name: 'Ribeye', tags: [] });
	});

	it('infers nothing from a dish name or a description', () => {
		expect(one('Peanut satay chicken, coconut and lime 14').tags).toEqual([]);
		expect(one('Vegan chocolate torte 8').tags).toEqual([]);
		expect(one('Gluten free brownie 6').tags).toEqual([]);
	});
});

describe('what a menu says that is not a dish', () => {
	const NOTICES = [
		'All prices include VAT',
		'A discretionary service charge of 12.5% is added to your bill',
		'Please inform us of any allergies or intolerances',
		'We cannot guarantee the absence of nuts',
		'020 7946 0958',
		'Tel 020 7946 0958',
		'12 Bridge Street, Hebden Bridge',
		'hello@example.com',
		'www.example.com',
		'https://example.com',
		'Follow us @worldtable',
		'Open Mon - Fri 12 - 3pm',
		'Served Saturday 12pm to 4pm',
		'Page 2',
		'2'
	];

	it('sends every one of them to skipped and none of them to the menu', () => {
		for (const notice of NOTICES) {
			const { dishes, skipped } = parseMenuText(notice);
			expect({ notice, dishes: dishes.length }).toEqual({ notice, dishes: 0 });
			expect(skipped).toEqual([notice]);
		}
	});

	it('still sells a dish whose name carries a day or a number', () => {
		expect(one('Sunday roast 18.50')).toMatchObject({ name: 'Sunday roast', price: '18.50' });
		expect(one('Bottomless Saturday brunch 35')).toMatchObject({ price: '35' });
	});
});

describe('confidence means something', () => {
	it('is high only for a row nothing had to be guessed about', () => {
		expect(one('Sticky toffee pudding 8').confidence).toBe('high');
	});

	it('is low when there is no price', () => {
		expect(one('Sticky toffee pudding').confidence).toBe('low');
	});

	it('is low when the name is long enough to be a whole sentence read as one', () => {
		const long = 'Slow roasted shoulder of Yorkshire lamb with anchovy and rosemary and beans 26';
		expect(one(long).confidence).toBe('low');
		expect(one(long).name.length).toBeGreaterThan(60);
	});

	it('is low when the name and description were split on a comma', () => {
		expect(one('Ham, egg and chips 12').confidence).toBe('low');
	});
});

describe('the parser is total', () => {
	it('takes anything at all without throwing', () => {
		const inputs = [
			'',
			'   ',
			'\n\n\n',
			'\r\n\r\n',
			'£',
			'((((',
			'---------',
			'0'.repeat(500),
			'a\tb\tc',
			'😀 9.50',
			'  Olives 4'
		];
		for (const input of inputs) {
			expect(() => parseMenuText(input)).not.toThrow();
		}
		expect(parseMenuText('')).toEqual({ dishes: [], skipped: [] });
		expect(parseMenuText(null)).toEqual({ dishes: [], skipped: [] });
		expect(parseMenuText(undefined)).toEqual({ dishes: [], skipped: [] });
	});

	it('reads a menu typed with non-breaking spaces', () => {
		expect(one('Olives   4')).toMatchObject({ name: 'Olives', price: '4' });
	});

	it('stops at the size guard and says so rather than reading half a menu in silence', () => {
		/* Stacked, one row per four lines, so the twenty thousand lines read mint five thousand ids and read in time (the caps were raised for the House on 3 October 2026; the pin follows the source's). */
		const huge = 'Shrimp & Tasso Henican\n15.50\nWild shrimp stuffed with tasso ham, pickled okra and pepper jelly\n\n'.repeat(15000);
		const started = Date.now();
		const { dishes, skipped } = parseMenuText(huge);
		expect(Date.now() - started).toBeLessThan(5000);
		expect(dishes.length).toBeLessThanOrEqual(MAX_LINES);
		expect(skipped[skipped.length - 1]).toMatch(/^Only the first 1,000,000 characters were read/);
	});
});

describe('a bracket is never split down the middle', () => {
	/**
	 * A menu that keys its allergens on the dish prints them in one bracket, and
	 * the comma inside it is not the kitchen separating a name from a garnish.
	 * Splitting there produced a dish called 'Sticky toffee pudding (N' with
	 * 'G, D)' for a description: two halves of a bracket in two fields, and
	 * neither of them a dish.
	 */
	it('keeps a bracketed allergen key on the name, and reads none of it', () => {
		const [dish] = parseMenuText('Sticky toffee pudding (N, G, D) 8').dishes;
		expect(dish.name).toBe('Sticky toffee pudding (N, G, D)');
		expect(dish.description).toBe('');
		expect(dish.price).toBe('8');
		// The letters are the menu's own legend. They are not dietary marks this
		// module knows, so they stay in the name for the cook to tidy, and they
		// never become tags and never become allergens.
		expect(dish.tags).toEqual([]);
	});

	it('still splits on punctuation that sits outside the bracket', () => {
		const [dish] = parseMenuText('Chicken tikka masala (G, D) - with pilau rice 13.50').dishes;
		expect(dish.name).toBe('Chicken tikka masala (G, D)');
		expect(dish.description).toBe('with pilau rice');
	});

	it('still splits an ordinary comma when no bracket is involved', () => {
		const [dish] = parseMenuText('Crispy squid, lemon aioli 9.5').dishes;
		expect(dish.name).toBe('Crispy squid');
		expect(dish.description).toBe('lemon aioli');
		expect(dish.confidence).toBe('low');
	});
});

describe('an imported dish carries no allergen information', () => {
	/**
	 * The rule the whole feature turns on. `MenuDish.allergens` and
	 * `MenuDish.allergensCheckedAt` are what separate "this dish carries none"
	 * from "nobody has looked yet", and a photograph of a menu cannot tell anybody
	 * which of those is true. So this parser has nowhere to put an allergen even
	 * if it wanted one, and that is asserted here rather than left to good
	 * intentions: adding the field is what would have to fail, not using it.
	 */
	it('has no allergen field to fill in, on any row', () => {
		const { dishes } = parseMenuText(
			'STARTERS\nPeanut satay skewers (gf) 9\nSesame prawn toast, soy dip 8\nMilk chocolate torte 7'
		);
		expect(dishes).toHaveLength(3);
		for (const dish of dishes) {
			expect(Object.keys(dish).sort()).toEqual([
				'confidence',
				'description',
				'name',
				'price',
				'raw',
				'section',
				'tags'
			]);
			expect('allergens' in dish).toBe(false);
			expect('allergensCheckedAt' in dish).toBe(false);
		}
	});

	it('reads a printed mark as a printed mark and nothing more', () => {
		// (gf) on the satay is what the kitchen wrote on the page. It is not a
		// screening of the dish, and the peanut in the name produces nothing.
		expect(one('Peanut satay skewers (gf) 9').tags).toEqual(['gf']);
	});
});

/* ---------------------------------------------------------------------------
   THE COCKTAIL LAYER. Written here rather than ported: js/menu-drinks.js has
   no counterpart in the World Table, because a dish description is prose and a
   cocktail description is usually an ingredient list.
   ------------------------------------------------------------------------- */

const draft = (text) => W.menuDraftFromText(text).drafts;

describe('a description that is a list becomes a spec', () => {
	it('reads a comma list as ingredients and puts no measures on them', () => {
		const [d] = draft('Garden Gimlet - Gin, elderflower, cucumber, lime    14');
		expect(d.rec.name).toBe('Garden Gimlet');
		expect(d.rec.spec).toEqual(['Gin', 'elderflower', 'cucumber', 'lime']);
		expect(d.rec.price).toBe('14');
		expect(d.rec.note).toBe('');
	});

	it('reads a slash list and a plus list the same way', () => {
		expect(draft('Paloma | Tequila / grapefruit / lime / soda  12')[0].rec.spec)
			.toEqual(['Tequila', 'grapefruit', 'lime', 'soda']);
		expect(draft('Boulevardier: Bourbon + Campari + sweet vermouth  15')[0].rec.spec)
			.toEqual(['Bourbon', 'Campari', 'sweet vermouth']);
	});

	it('leaves prose as a note and never as a spec', () => {
		const [d] = draft('House Old Fashioned - Our house take on a classic, shaken hard and served long    16');
		expect(d.rec.spec).toEqual([]);
		expect(d.rec.note).toBe('Our house take on a classic, shaken hard and served long');
		expect(d.confidence).toBe('low');
	});

	it('refuses a list whose parts are sentences', () => {
		expect(W.MD_isIngredientList('Gin, elderflower, cucumber')).toBe(true);
		expect(W.MD_isIngredientList('Shaken hard and served long over a big rock, with a twist')).toBe(false);
		expect(W.MD_isIngredientList('Gin')).toBe(false);
		expect(W.MD_isIngredientList('Ask your bartender. We change it weekly, always fresh')).toBe(false);
	});

	it('refuses a list the vocabulary does not recognise at all', () => {
		expect(W.MD_isIngredientList('warm, generous, unhurried')).toBe(false);
	});
});

describe('a base spirit is read, never guessed', () => {
	it('takes the base a quantity-less list names first', () => {
		expect(draft('Garden Gimlet - Gin, elderflower, lime  14')[0].rec.spirit).toBe('Gin');
		expect(draft('Paloma - Tequila, grapefruit, lime  12')[0].rec.spirit).toBe('Tequila');
	});

	it('leaves the base open when two are named', () => {
		const [d] = draft('Ash and Ember - Mezcal, bourbon, agave, lemon  17');
		expect(d.rec.spirit).toBe('Other');
		expect(d.why).toMatch(/two spirits named/);
	});

	it('says Other when no spirit is named', () => {
		expect(draft('Seedlip Spritz - Seedlip, soda, grapefruit  9')[0].rec.spirit).toBe('Other');
	});
});

describe('a family comes from a heading or from nowhere', () => {
	it('files a drink under a heading that names a Ledger family', () => {
		const [d] = draft('SOURS\n\nGarden Gimlet - Gin, elderflower, lime  14');
		expect(d.rec.family).toBe('Sour');
	});

	it('leaves it Other under a heading that names no family', () => {
		const [d] = draft('SIGNATURES\n\nGarden Gimlet - Gin, elderflower, lime  14');
		expect(d.rec.family).toBe('Other');
	});
});

describe('nothing is invented', () => {
	const MENU = [
		'COCKTAILS',
		'',
		'Garden Gimlet - Gin, elderflower, cucumber, lime    14',
		'Paloma | Tequila / grapefruit / lime / soda  12',
		'Boulevardier: Bourbon + Campari + sweet vermouth  15',
		'House Old Fashioned - Our house take on a classic    16',
		'Margarita - Tequila, lime, orange liqueur    14',
		'Negroni    13',
		'Espresso Martini - Vodka, coffee liqueur, espresso   15',
	].join('\n');

	/* THE ONE THAT MATTERS. lineOz is the real shipped function, not a copy of
	   its pattern: if a measure ever reaches a produced line it reaches
	   balanceOf and the pour-cost sheet, and a bartender is shown a percentage
	   that came from nowhere. A menu that prints no measures produces none. */
	it('never puts a measure on a spec line the menu did not print', () => {
		for (const d of draft(MENU)) {
			for (const line of d.rec.spec) {
				expect(W.lineOz(line)).toBe(0);
			}
		}
	});

	/* And a menu that DOES print measures keeps them exactly, on the part the
	   menu put them on: every measure lineOz finds in a produced line is a
	   substring of the raw line the row came from. The trap this pins is the
	   fraction slash: the old splitter cut '3/4 oz lime' at the slash and
	   shipped a part reading '4 oz lime', an invented measure that reached the
	   cost sheet. The desk masks the fraction before it splits. */
	it('never puts a measure on a spec line that the raw line did not print', () => {
		const PRINTED = [
			'COCKTAILS',
			'',
			'Gimlet - 2 oz gin / 3/4 oz lime / 3/4 oz simple syrup   14',
			'Daiquiri | 2 oz white rum, 1 oz lime, 3/4 oz simple   13',
			'Old Fashioned',
			'15',
			'2 oz bourbon | 1/4 oz demerara syrup | 2 dashes angostura',
		].join('\n');
		const ds = draft(PRINTED);
		expect(ds).toHaveLength(3);
		const OZ = /(\d+\/\d+|\d+(?:\.\d+)?)\s*oz/g;
		for (const d of ds) {
			expect(d.rec.spec.length).toBeGreaterThan(0);
			for (const line of d.rec.spec) {
				for (const m of line.matchAll(OZ)) expect(d.raw).toContain(m[0]);
				expect(line).not.toMatch(/^4 oz/);
			}
		}
		const gimlet = ds[0].rec.spec;
		expect(gimlet).toEqual(['2 oz gin', '3/4 oz lime', '3/4 oz simple syrup']);
		expect(W.lineOz('3/4 oz lime')).toBe(0.75);
		/* read by the shipped lineOz: two, three quarters, three quarters; a
		   part reading '4 oz lime' would come out as 4 here, and never does */
		expect(gimlet.map(W.lineOz)).toEqual([2, 0.75, 0.75]);
		expect(ds[2].rec.spec).toEqual(['2 oz bourbon', '1/4 oz demerara syrup', '2 dashes angostura']);
		expect(W.lineOz(ds[2].rec.spec[1])).toBe(0.25);
	});

	it('splits the Ledger’s own list separator with the same fraction mask', () => {
		expect(W.MD_listParts('2 oz gin / 3/4 oz lime / 3/4 oz simple')).toEqual(['2 oz gin', '3/4 oz lime', '3/4 oz simple']);
		expect(W.MD_listParts('Tequila / grapefruit / lime / soda')).toEqual(['Tequila', 'grapefruit', 'lime', 'soda']);
		expect(W.MD_listParts('gin | benedictine | lime')).toEqual(['gin', 'benedictine', 'lime']);
		expect(W.MD_listParts('gin • lime · soda')).toEqual(['gin', 'lime', 'soda']);
		expect(W.MD_isIngredientList('2 oz gin / 3/4 oz lime')).toBe(true);
	});

	it('never puts a method, a glass or a garnish on a row', () => {
		for (const d of draft(MENU)) {
			expect(d.rec.method).toBe('');
			expect(d.rec.glass).toBe('');
			expect(d.rec.garnish).toBe('');
		}
	});

	it('never invents a price the menu did not print', () => {
		expect(draft('Garden Gimlet - Gin, elderflower, lime')[0].rec.price).toBe('');
	});

	it('is total: any text in, rows out, no throw', () => {
		for (const input of ['', '\n\n', '....', 'Negroni', '12.50', MENU]) {
			expect(() => W.menuDraftFromText(input)).not.toThrow();
		}
	});
});

describe('the canon measures are offered, never applied', () => {
	it('offers the book when the name matches and the menu named no stranger', () => {
		const [d] = draft('Margarita - Tequila, lime, orange liqueur  14');
		const offer = W.menuCanonMeasures(d.rec);
		expect(offer !== null).toBe(true);
		expect(offer.name).toBe('Margarita');
		expect(offer.spec.length).toBeGreaterThan(0);
		/* offered only: the draft itself still carries no measure */
		for (const line of d.rec.spec) expect(W.lineOz(line)).toBe(0);
	});

	it('refuses when the menu names an ingredient the canon does not have', () => {
		const [d] = draft('Margarita - Tequila, lime, orange liqueur, Campari  14');
		expect(W.menuCanonMeasures(d.rec)).toBe(null);
	});

	it('refuses when nothing in the canon carries the name', () => {
		const [d] = draft('Room 12 - Rye, sweet vermouth, maraschino  16');
		expect(W.menuCanonMeasures(d.rec)).toBe(null);
	});
});

describe('a measureless drink gets a reason, not a shrug', () => {
	it('refuses, and names the measure as what is missing', () => {
		const [d] = draft('Garden Gimlet - Gin, elderflower, lime  14');
		const why = W.unmeasuredReason(d.rec);
		expect(why).toMatch(/measure/);
	});

	/* The sentence used to open 'This one came off a menu', which the function
	   cannot know and which was false for three shipped canon cocktails and for
	   every hand-typed metric spec. It reports what it can see now, so the test
	   asserts the absence of the claim rather than its exact wording. */
	it('never claims to know where the drink came from', () => {
		const [d] = draft('Garden Gimlet - Gin, elderflower, lime  14');
		expect(W.unmeasuredReason(d.rec)).not.toMatch(/came off a menu|from a menu|imported/i);
		/* a canon spec written in parts is not a menu import either */
		const parts = W.COCKTAILS.find((c) => c.spec.some((l) => /\bparts?\b/.test(l)));
		if (parts) expect(W.unmeasuredReason(parts)).not.toMatch(/came off a menu/i);
	});

	/* THE BLOCKER THIS REPLACED. estimateABV divides by the MEASURED volume
	   only, so one measured line was enough to license a confident 0.0% ABV for
	   a gin drink, under a band line reading 'you can serve two'. A partially
	   measured spec has to refuse just as firmly as an unmeasured one. */
	it('refuses a spec whose alcohol carries no measure, even when another line does', () => {
		const partial = { name: 'Garden Gimlet', spec: ['Gin', 'elderflower', 'cucumber', '3/4 oz lime'] };
		expect(W.unmeasuredReason(partial)).toMatch(/carries no measure/);
		const m = W.measureReport(partial);
		expect(m.kind).toBe('some');
		expect(m.missingBooze.length).toBeGreaterThan(0);
	});

	/* and it must NOT fire on the ordinary canon shape, where a dash of bitters
	   or a garnish carries no ounces and never needed to: balanceOf and
	   estimateABV already skip those, so refusing over one would be noise, and a
	   check that cries wolf on half the book gets deleted. */
	it('says nothing about a drink that carries ounces', () => {
		expect(W.unmeasuredReason(W.COCKTAILS[0])).toBe(null);
		for (const name of ['Old Fashioned', 'Manhattan', 'Martini', 'Mojito', 'Sazerac']) {
			const c = W.COCKTAILS.find((x) => x.name === name);
			if (c) expect(W.unmeasuredReason(c)).toBe(null);
		}
	});
});

/* ---------------------------------------------------------------------------
   THE DESK HALF. The three fixtures the World Table pins its reader on, run
   through the shipped port and then through this app's own adopt path, with
   progress stubbed so saveBarRecord files into a list this test owns.
   ------------------------------------------------------------------------- */

const source = (text) => deskSource('paste', 'ledger', text);
/** A clean list for one test: saveBarRecord writes into W.progress.bar and this puts it back. */
function withBar(fn){
	const before = W.progress.bar;
	W.progress.bar = [];
	W.barChanged();
	try { return fn(); } finally { W.progress.bar = before; W.barChanged(); }
}

describe('the desk fixtures, read here', () => {
	const drinks = fixture('commanders-drinks.txt');
	const file = readMenu(drinks, source(drinks));

	it('reads the drinks list into four cocktails and six wines, and the bar’s share is the four', () => {
		expect(file.format).toBe('oot-menu-desk');
		expect(file.items.filter((i) => i.kind === 'cocktail')).toHaveLength(4);
		expect(file.items.filter((i) => i.kind === 'wine')).toHaveLength(6);
		const { drafts, counts, skipped } = W.menuDraftsFromDesk(file);
		expect(drafts.map((d) => d.rec.name)).toEqual(['Holy Trinity', 'Fuzzy Buffalo', 'Tequila Mockingbird #2', 'Gold Rush']);
		expect(counts).toMatchObject({ cocktails: 4, wines: 6, dishes: 0, unplaced: 0 });
		expect(skipped).toEqual([]);
	});

	it('reads the price from the line under the name and the spec from the line under that', () => {
		const [holy] = W.menuDraftsFromDesk(file).drafts;
		expect(holy.rec).toMatchObject({ name: 'Holy Trinity', price: '15', spec: ['trinity infused gin', 'benedictine', 'lime'], spirit: 'Gin', family: 'Other' });
		expect(holy.confidence).toBe('high');
		expect(holy.raw).toBe('Holy Trinity\n15\ntrinity infused gin | benedictine | lime');
		expect(holy.priceBlanked).toBe(false);
		expect(holy.unsure).toBe(false);
	});

	it('names the base through the lexicon, not the desk: reposado tequila is Tequila, bourbon is Whiskey', () => {
		const names = Object.fromEntries(W.menuDraftsFromDesk(file).drafts.map((d) => [d.rec.name, d.rec.spirit]));
		expect(names['Tequila Mockingbird #2']).toBe('Tequila');
		expect(names['Fuzzy Buffalo']).toBe('Whiskey');
		expect(names['Gold Rush']).toBe('Whiskey');
	});

	it('round trip: readMenu, menuDrinkFromDeskItem, saveBarRecord, and every record is a real drink', () => {
		withBar(() => {
			const { drafts } = W.menuDraftsFromDesk(file);
			for (const d of drafts) {
				const out = W.saveBarRecord(d.rec, null, { allowEmptySpec: true });
				expect(typeof out).toBe('object');
				expect(out.draft === undefined).toBe(true);
				expect(out.spec).toEqual(d.rec.spec);
				expect(out.price).toBe(d.rec.price);
				expect(Object.keys(out).sort()).toEqual(['family', 'garnish', 'glass', 'id', 'method', 'name', 'note', 'price', 'spec', 'spirit', 'ts']);
			}
			expect(W.progress.bar).toHaveLength(4);
			/* the menu printed no measures, so none reached the list */
			for (const b of W.progress.bar) for (const line of b.spec) expect(W.lineOz(line)).toBe(0);
			/* and the list is pourable in principle: a real spec, not a draft */
			expect(W.pourSources()).toContain('My Bar');
		});
	});

	it('the dinner menu: the one cocktail hiding in the tasting menu comes to the bar as an unsure row', () => {
		const dinner = fixture('commanders-dinner.txt');
		const f = readMenu(dinner, source(dinner));
		const { drafts, counts } = W.menuDraftsFromDesk(f);
		expect(counts.dishes).toBeGreaterThan(30);
		expect(drafts).toHaveLength(1);
		expect(drafts[0].rec.name).toBe('Kiss the Crab');
		expect(drafts[0].unsure).toBe(true);
		expect(drafts[0].confidence).toBe('low');
		expect(drafts[0].why).toMatch(/could not tell what this row is/);
		/* read again as a cocktail off its own lines. '~le Coup du Milieu~'
		   sits directly over the name with no blank between, and the desk
		   reads that framed note as the lead-in of the row UNDER it (it is
		   the page labelling the mid-meal drink), so the description opens
		   with the note, frame off, and then the line under the name. That
		   line opens with a 49-character part ('Blue crab-brown butter washed
		   Zacapa No. 23 Solera'), which is a sentence and not an ingredient
		   by both the desk's and this app's own rule, so the whole is the
		   note, not a spec, and the row waits for a person: a guessed split
		   would have shipped 'Blue crab-brown butter washed Zacapa No. 23
		   Solera' as one bottle on a spec line. Pinned whole so a change to
		   where the desk sends a framed note is heard here. */
		expect(drafts[0].rec.spec).toEqual([]);
		expect(drafts[0].rec.note).toBe(
			'le Coup du Milieu Blue crab-brown butter washed Zacapa No. 23 Solera, banana oleosacrum, dry vermouth, orange peel'
		);
		expect(drafts[0].raw).toBe(
			'~le Coup du Milieu~\nKiss the Crab\nBlue crab-brown butter washed Zacapa No. 23 Solera, banana oleosacrum, dry vermouth, orange peel'
		);
		expect(drafts[0].rec.price).toBe('');
	});

	it('the cellar list is nobody’s here: every row is a wine and the bar’s share is empty', () => {
		const list = fixture('codex-pdf-list.txt');
		const f = readMenu(list, source(list));
		expect(f.items.every((i) => i.kind === 'wine')).toBe(true);
		const out = W.menuDraftsFromDesk(f);
		expect(out.drafts).toEqual([]);
		expect(out.counts.wines).toBe(f.items.length);
	});

	it('the desk file is a draft, never a store: nothing in the round trip touches progress.bar but saveBarRecord', () => {
		withBar(() => {
			W.menuDraftsFromDesk(file);
			W.menuDraftFromText(drinks, 'paste');
			expect(W.progress.bar).toEqual([]);
		});
	});
});

describe('a draft: a name and nothing else', () => {
	const bare = () => draft('COCKTAILS\n\nNegroni    13')[0];

	it('is refused by the form path and filed as a draft by the importer’s', () => {
		withBar(() => {
			const d = bare();
			expect(d.rec.spec).toEqual([]);
			expect(d.confidence).toBe('low');
			expect(typeof W.saveBarRecord(d.rec, null)).toBe('string');
			const rec = W.saveBarRecord(d.rec, null, { allowEmptySpec: true });
			expect(typeof rec).toBe('object');
			expect(rec.draft).toBe(true);
			expect(rec.spec).toEqual([]);
			expect(rec.price).toBe('13');
		});
	});

	it('is refused by missingFor and by pourSources, so it never reads as ready to pour', () => {
		withBar(() => {
			const rec = W.saveBarRecord(bare().rec, null, { allowEmptySpec: true });
			/* a draft requires "nothing", which off an empty shelf would read as
			   pourable; the sentinel is what a shelf can never satisfy */
			expect(W.missingFor(rec, []).length).toBeGreaterThan(0);
			expect(W.missingFor(rec, ['gin', 'campari', 'sweet-vermouth']).length).toBeGreaterThan(0);
			expect(W.pourSources()).not.toContain('My Bar');
			expect(W.allDrinks().find((x) => x.src === 'My Bar' && x.name === 'Negroni').draft).toBe(true);
		});
	});

	it('stops being a draft the moment it is given a line', () => {
		withBar(() => {
			const rec = W.saveBarRecord(bare().rec, null, { allowEmptySpec: true });
			const edited = W.saveBarRecord({ name: 'Negroni', spec: ['1 oz gin', '1 oz Campari', '1 oz sweet vermouth'], family: 'Other', spirit: 'Gin', price: '13' }, rec.id);
			expect(typeof edited).toBe('object');
			expect(edited.draft === undefined).toBe(true);
			expect(W.pourSources()).toContain('My Bar');
			/* the shelf ids the vocabulary gives the three lines: gin, campari, sv */
			expect(W.missingFor(edited, ['gin', 'campari', 'sv'])).toEqual([]);
		});
	});

	it('survives the shape pass at boot as a draft, and a nameless record does not', () => {
		expect(W.normalizeBarRecord({ name: 'Negroni', spec: [], price: '13' })).toMatchObject({ name: 'Negroni', spec: [], draft: true });
		expect(W.normalizeBarRecord({ name: 'Paloma', spec: ['2 oz tequila'] }).draft === undefined).toBe(true);
		expect(W.normalizeBarRecord({ spec: ['2 oz tequila'] })).toBe(null);
		expect(W.normalizeBarRecords([{ name: 'A', spec: [] }, null, { name: 'B', spec: ['x'] }])).toMatchObject({ skipped: 1 });
	});

	it('is dealt by no flashcard deck and no quiz round: a ticket with no lines is not a question', () => {
		withBar(() => {
			/* a name no question in the bank could mention, because the mixed
			   round deals bank questions too and the bank knows the Negroni */
			const zed = draft('COCKTAILS\n\nHouse Draft Zed    13')[0];
			expect(zed.rec.spec).toEqual([]);
			W.saveBarRecord(zed.rec, null, { allowEmptySpec: true });
			const paloma = W.saveBarRecord({ name: 'Paloma', spec: ['2 oz tequila', '3 oz grapefruit soda', '1/2 oz lime'],
				glass: 'Highball', family: 'Highball', spirit: 'Tequila' }, null);
			expect(typeof paloma).toBe('object');
			/* the flashcard pool, filtered to the menu: the real drink and never the draft */
			const fc = W.state.fc;
			const was = fc.src;
			fc.src = 'My Bar';
			try { expect(W.fcPool().map((d) => d.name)).toEqual(['Paloma']); } finally { fc.src = was; }
			/* the Menu round, and the one menu question every mixed round deals:
			   no ticket is a draft's and no question is about the draft. Dealt
			   twenty times, because the rounds are shuffled samples. */
			for (let i = 0; i < 20; i++) {
				for (const q of W.buildRound('mybar').concat(W.buildRound('mixed'))) {
					if (q.ticket) expect(q.ticket.draft === undefined).toBe(true);
					expect(String(q.prompt) + ' ' + String(q.explain || '')).not.toMatch(/House Draft Zed/);
				}
			}
			/* and the round's floor counts drinks with a spec: one card, not two */
			expect(W.menuCardCount()).toBe(1);
			expect(W.progress.bar).toHaveLength(2);
			/* Tonight's Session: the venue's list deals FIRST in its ladder, so
			   an unfiltered pool made the draft the first new card every night.
			   Twenty deals over an empty card store (everything fresh, nothing
			   due), then the empty-deck fallback's pool: no draft in either,
			   and the real menu card is dealt. */
			const cards = W.progress.cards;
			W.progress.cards = {};
			try {
				for (let i = 0; i < 20; i++) {
					const { dueDeck, newDeck } = W.sessionDeckParts();
					for (const d of dueDeck.concat(newDeck)) expect(!!d.draft).toBe(false);
					expect(newDeck.some((d) => d.src === 'My Bar' && d.name === 'Paloma')).toBe(true);
					expect(newDeck.some((d) => d.name === 'House Draft Zed')).toBe(false);
				}
				const pool = W.sessionCardPool();
				expect(pool.some((d) => d.draft)).toBe(false);
				expect(pool.some((d) => d.name === 'House Draft Zed')).toBe(false);
				expect(pool.some((d) => d.src === 'My Bar' && d.name === 'Paloma')).toBe(true);
			} finally { W.progress.cards = cards; }
		});
	});

	it('arrives as a draft through the backup import too, merge or replace, with no boot in between', () => {
		const backup = (bar) => JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {}, bar } });
		withBar(() => {
			/* MERGE: OK on the one confirm. A record with a name and no spec,
			   as an older export or a hand-edited file carries it, and a
			   nameless row beside it. */
			globalThis.confirmAnswers = [true];
			W.dataImport(backup([{ name: 'Old Export', spec: [] }, { spec: ['no name'] }]));
			expect(W.progress.bar).toHaveLength(1);
			const merged = W.progress.bar[0];
			expect(merged).toMatchObject({ name: 'Old Export', spec: [], draft: true });
			expect(W.missingFor(merged, []).length).toBeGreaterThan(0);
			expect(W.pourSources()).not.toContain('My Bar');
			/* and a collision with the record already here takes the same pass:
			   the newer one wins, as a draft, with a forbidden mark refused */
			globalThis.confirmAnswers = [true];
			W.dataImport(backup([{ id: merged.id, name: 'Old Export', spec: [], ts: Date.now() + 1000,
				maitre: { allergens: { value: 'nuts', by: 'maitre', ts: 1 } } }]));
			expect(W.progress.bar).toHaveLength(1);
			expect(W.progress.bar[0].draft).toBe(true);
			expect(W.progress.bar[0].maitre === undefined).toBe(true);
		});
		/* REPLACE: Cancel on the first confirm, OK on the second. progress is
		   rebound whole by that branch, so the result is read back through the
		   realm and the old object put back after, or every later test in this
		   file would be looking at a stale one. */
		const before = W.progress;
		globalThis.confirmAnswers = [false, true];
		W.dataImport(backup([{ name: 'Whole Restore', spec: [] }]));
		const now = vm.runInThisContext('progress');
		try {
			expect(now === before).toBe(false);
			expect(now.bar).toHaveLength(1);
			expect(now.bar[0]).toMatchObject({ name: 'Whole Restore', spec: [], draft: true });
			expect(W.missingFor(now.bar[0], []).length).toBeGreaterThan(0);
		} finally {
			vm.runInThisContext('(function(o){ progress = o; })')(before);
			W.barChanged();
		}
	});

	it('is excluded from "the N that read cleanly": one spec part or none is not clean', () => {
		const ds = draft('COCKTAILS\n\nNegroni    13\nGarden Gimlet - Gin, elderflower, lime  14\nSeedlip Spritz - Seedlip  9');
		const clean = ds.filter((d) => d.confidence === 'high' && !d.existing && !d.unsure && d.rec.spec.length >= 2);
		expect(clean.map((d) => d.rec.name)).toEqual(['Garden Gimlet']);
	});
});

describe('the price guard runs on every row, whichever engine read it', () => {
	it('blanks a price that is not in the row’s own lines and says so', () => {
		const item = { id: 'k-00000001', kind: 'cocktail', section: '', name: 'Paloma', price: { printed: '99', parts: [{ amount: '99', label: '' }] },
			marks: [], confidence: 'high', why: [], raw: 'Paloma\ntequila | grapefruit | lime', lines: [0, 1],
			spec: ['tequila', 'grapefruit', 'lime'], description: '', baseSpirit: 'tequila' };
		const d = W.menuDrinkFromDeskItem(item);
		expect(d.rec.price).toBe('');
		expect(d.priceBlanked).toBe(true);
		expect(d.confidence).toBe('low');
		expect(d.why).toMatch(/blanked/);
	});

	it('keeps a price that is in the lines, whitespace folded', () => {
		expect(priceInRaw('45.00 / 22.50', 'Ployez\n45.00 /  22.50')).toBe(true);
		expect(priceInRaw('', 'anything')).toBe(true);
		expect(priceInRaw('12', 'Soup 9.50')).toBe(false);
	});

	it('takes the desk’s spirit word only when the lexicon resolves nothing, and through the lexicon', () => {
		const item = { id: 'k-00000002', kind: 'cocktail', section: '', name: 'House Thing', price: { printed: '', parts: [] },
			marks: [], confidence: 'low', why: [], raw: 'House Thing\nzzz | yyy', lines: [0, 1],
			spec: ['zzz', 'yyy'], description: '', baseSpirit: 'mezcal' };
		expect(W.menuDrinkFromDeskItem(item).rec.spirit).toBe('Mezcal');
		const none = Object.assign({}, item, { baseSpirit: '' });
		expect(W.menuDrinkFromDeskItem(none).rec.spirit).toBe('Other');
		/* a word the lexicon does not know as a spirit cannot become a base */
		const nonsense = Object.assign({}, item, { baseSpirit: 'moonbeam' });
		expect(W.menuDrinkFromDeskItem(nonsense).rec.spirit).toBe('Other');
	});
});

describe('her marks on a record', () => {
	const hers = { guest: { value: 'A gin sour with a herbal edge.', by: 'maitre', ts: 100, model: 'claude-opus-5' } };

	it('ride through saveBarRecord and the shape pass, and never as a plain field', () => {
		withBar(() => {
			const rec = W.saveBarRecord({ name: 'Holy Trinity', spec: ['gin', 'benedictine', 'lime'], maitre: hers }, null);
			expect(rec.maitre.guest).toMatchObject({ value: 'A gin sour with a herbal edge.', by: 'maitre' });
			expect(rec.note).toBe('');
			/* an edit through the form, which carries no marks, keeps them */
			const edited = W.saveBarRecord({ name: 'Holy Trinity', spec: ['2 oz gin', '1/2 oz benedictine', '3/4 oz lime'] }, rec.id);
			expect(edited.maitre.guest.by).toBe('maitre');
			const again = W.normalizeBarRecord(JSON.parse(JSON.stringify(edited)));
			expect(again.maitre).toEqual(edited.maitre);
		});
	});

	it('refuse any field the block does not name, allergens above all', () => {
		const m = W.normalizeMaitre({ guest: hers.guest, allergens: { value: 'nuts', by: 'maitre', ts: 1 }, contains: { value: 'x', by: 'maitre', ts: 1 } });
		expect(Object.keys(m)).toEqual(['guest']);
		expect(W.normalizeMaitre({})).toBe(null);
		expect(W.normalizeMaitre({ guest: { value: '', by: 'maitre', ts: 1 } })).toBe(null);
	});

	it('merge on import: the newer record’s block wins, the kept notes are unioned on ts|q', () => {
		const mine = { guest: { value: 'mine', by: 'person', ts: 5 }, kept: [{ q: 'a', a: 'A', ts: 1 }, { q: 'b', a: 'B', ts: 2 }] };
		const theirs = { guest: { value: 'theirs', by: 'maitre', ts: 9 }, kept: [{ q: 'b', a: 'B', ts: 2 }, { q: 'c', a: 'C', ts: 3 }] };
		const merged = W.mergeMaitre(theirs, mine);
		expect(merged.guest.value).toBe('theirs');
		expect(merged.kept.map((k) => k.q)).toEqual(['a', 'b', 'c']);
		expect(W.mergeMaitre(null, null)).toBe(null);
		/* the winner's marks are the winner's, even when it has none: a newer
		   save with no block is a newer decision; only the kept notes, which
		   are observations, survive from the loser */
		const noBlock = W.mergeMaitre(null, mine);
		expect(noBlock.guest === undefined).toBe(true);
		expect(noBlock.kept.map((k) => k.q)).toEqual(['a', 'b']);
	});

	it('her method, glass and garnish are kept INTO the field one at a time, and a draft keeps its licence', () => {
		withBar(() => {
			const dash = String.fromCharCode(0x2014);
			const marks = { glass: { value: 'Coupe', by: 'maitre', ts: 100, model: 'claude-haiku-4-5' },
				garnish: { value: 'Lime wheel', by: 'maitre', ts: 100 }, guest: hers.guest };
			const rec = W.saveBarRecord({ name: 'Holy Trinity', spec: ['gin', 'benedictine', 'lime'], maitre: marks }, null);
			/* unkept: the plain field is the placeholder and the mark is hers */
			expect(rec.glass).toBe(dash);
			expect(rec.maitre.glass.by).toBe('maitre');
			const kept = W.keepMaitreField(rec, 'glass', 'Coupe');
			expect(typeof kept).toBe('object');
			expect(kept.glass).toBe('Coupe');
			expect(kept.maitre.glass === undefined).toBe(true);
			expect(kept.maitre.garnish.value).toBe('Lime wheel');
			expect(kept.maitre.guest.by).toBe('maitre');
			expect(W.progress.bar).toHaveLength(1);
			/* Edit: the person's words go in, not hers */
			const edited = W.keepMaitreField(kept, 'garnish', 'Lime twist');
			expect(edited.garnish).toBe('Lime twist');
			expect(edited.maitre.garnish === undefined).toBe(true);
			/* the last mark kept off leaves no block, rather than the record's
			   old block coming back through the save's fallback */
			const only = W.saveBarRecord({ name: 'Lone Mark', spec: ['gin'], maitre: { method: { value: 'Stirred', by: 'maitre', ts: 1 } } }, null);
			const bare = W.keepMaitreField(only, 'method', 'Stirred');
			expect(bare.method).toBe('Stirred');
			expect(bare.maitre === undefined).toBe(true);
			/* while a form with NO block still keeps the record's marks */
			const viaForm = W.saveBarRecord({ name: 'Holy Trinity', spec: ['2 oz gin', '1 oz lime'] }, edited.id);
			expect(viaForm.maitre.guest.by).toBe('maitre');
			/* refusals in words: nothing of hers on the field, an empty edit, the guest line (no plain field) */
			expect(typeof W.keepMaitreField(bare, 'method', 'Shaken')).toBe('string');
			expect(typeof W.keepMaitreField(viaForm, 'guest', 'x')).toBe('string');
			const blank = W.saveBarRecord({ name: 'Blank Edit', spec: ['gin'], maitre: { glass: { value: 'Nick and Nora', by: 'maitre', ts: 1 } } }, null);
			expect(typeof W.keepMaitreField(blank, 'glass', '   ')).toBe('string');
			expect(W.progress.bar.find((b) => b.id === blank.id).maitre.glass.value).toBe('Nick and Nora');
			/* a draft: Keep changes no spec, so it stays a draft, out of every sheet, and keeps the glass */
			const d = W.saveBarRecord({ name: 'Draft With Glass', spec: [], maitre: { glass: { value: 'Rocks', by: 'maitre', ts: 1 } } }, null, { allowEmptySpec: true });
			const dk = W.keepMaitreField(d, 'glass', 'Rocks');
			expect(typeof dk).toBe('object');
			expect(dk.draft).toBe(true);
			expect(dk.glass).toBe('Rocks');
			expect(dk.maitre === undefined).toBe(true);
			expect(W.missingFor(dk, []).length).toBeGreaterThan(0);
		});
	});
});

describe('“It is a dish” on the shared origin', () => {
	/* A Map-backed slot, so the inbox's read, write, taken and clear all run
	   for real through the shipped port; the shared origin is a pathname, so
	   location is stubbed to one for the length of a test and taken away
	   after. The importer's state is put back too, because these tests build
	   a review list of their own. */
	function withSharedDesk(fn){
		const store = new Map();
		const storage = {
			getItem: (k) => (store.has(k) ? store.get(k) : null),
			setItem: (k, v) => { store.set(k, String(v)); },
			removeItem: (k) => { store.delete(k); },
		};
		const before = { storage: globalThis.localStorage, hadLocation: 'location' in globalThis, location: globalThis.location,
			imp: W.state.menu.imp, form: W.state.menu.form };
		globalThis.localStorage = storage;
		globalThis.location = { pathname: '/ledger/' };
		try { return withBar(fn); }
		finally {
			globalThis.localStorage = before.storage;
			if (before.hadLocation) globalThis.location = before.location; else delete globalThis.location;
			W.state.menu.imp = before.imp; W.state.menu.form = before.form;
		}
	}
	const drinks = fixture('commanders-drinks.txt');
	const dinner = fixture('commanders-dinner.txt');

	it('replaces the inbox’s row BY ID: the bar is not offered it again, the World Table sees it once, and the Codex’s taken mark survives', () => {
		withSharedDesk(() => {
			W.state.menu.imp = W.blankImport();
			W.importFromText(drinks, 'paste');
			const i = W.state.menu.imp;
			expect(i.drafts.map((d) => d.rec.name)).toContain('Holy Trinity');
			expect(i.handed).toMatchObject({ ok: true, shared: true, wines: 6 });
			/* the whole file is in the slot, the bar's rows riding along */
			const first = deskInbox.read();
			expect(deskInbox.share(first, 'cocktail').map((x) => x.name)).toContain('Holy Trinity');
			/* the Codex takes its share first, so that mark has to survive the rebuild */
			deskInbox.taken('wine');
			const k = i.drafts.findIndex((d) => d.rec.name === 'Holy Trinity');
			const id = i.drafts[k].item.id;
			W.importReKind(k, 'dish');
			const inbox = deskInbox.read();
			expect(deskInbox.share(inbox, 'cocktail').map((x) => x.name)).not.toContain('Holy Trinity');
			expect(deskInbox.share(inbox, 'cocktail')).toHaveLength(3);
			expect(deskInbox.share(inbox, 'dish').map((x) => x.name)).toEqual(['Holy Trinity']);
			expect(inbox.items.filter((x) => x.id === id).map((x) => x.kind)).toEqual(['dish']);
			expect(!!(inbox.taken && inbox.taken.wine)).toBe(true);
			expect(i.handed.dishes).toBe(1);
			expect(i.drafts.map((d) => d.rec.name)).not.toContain('Holy Trinity');
			/* the file in memory agrees with the slot, so the download would too */
			expect(i.file.items.filter((x) => x.id === id).map((x) => x.kind)).toEqual(['dish']);
			expect(globalThis.announced[globalThis.announced.length - 1]).toMatch(/Holy Trinity is now a dish, waiting for the World Table/);
		});
	});

	it('leaves a stranger’s desk alone: a newer read in the slot is not edited, and the row rides the download', () => {
		withSharedDesk(() => {
			W.state.menu.imp = W.blankImport();
			W.importFromText(drinks, 'paste');
			const i = W.state.menu.imp;
			/* another app reads another menu into the slot meanwhile */
			deskInbox.clear();
			deskInbox.write(readMenu(dinner, deskSource('paste', 'table', dinner)));
			const before = deskInbox.read();
			const k = i.drafts.findIndex((d) => d.rec.name === 'Holy Trinity');
			W.importReKind(k, 'dish');
			expect(deskInbox.read()).toEqual(before);
			expect(i.handed).toMatchObject({ ok: false, shared: true, dishes: 1, wines: 6 });
			expect(i.handed.said).toMatch(/newer read/);
			expect(i.file.items.some((x) => x.name === 'Holy Trinity' && x.kind === 'dish')).toBe(true);
			expect(i.drafts.map((d) => d.rec.name)).not.toContain('Holy Trinity');
		});
	});

	it('says the never-twice answer once, through the live region, and shows nothing to review', () => {
		withSharedDesk(() => {
			W.state.menu.imp = W.blankImport();
			W.importFromText(drinks, 'paste');
			globalThis.announced.length = 0;
			W.importFromText(drinks, 'paste');
			const i = W.state.menu.imp;
			expect(!!i.already).toBe(true);
			expect(i.already.share).toHaveLength(4);
			expect(i.drafts).toBe(null);
			expect(globalThis.announced).toHaveLength(1);
			expect(globalThis.announced[0]).toMatch(/^This menu was read .* 4 cocktails are already waiting here\.$/);
			/* and "Read it again anyway" reads */
			W.importFromText(drinks, 'paste', { again: true });
			expect(i.already).toBe(null);
			expect(i.drafts).toHaveLength(4);
		});
	});
});

/* ---------------------------------------------------------------------------
   THE ADDRESS DOOR. src/lib/menu-link.test.ts, ported the same way. What it
   proves that matters most is not the HTML walk but the REFUSAL: a static app
   with no server can only read another origin's page when that origin allows
   it, and this one will not route around that with a proxy. The refusal has to
   arrive as an ordinary ending with a working way forward, every time.
   ------------------------------------------------------------------------- */

/**
 * Reading a venue's menu from a link.
 *
 * Two things are under test, and the second matters more than the first. One
 * is the HTML walk: a real restaurant page is mostly navigation, analytics and
 * a cookie bar, and what comes out has to be the dishes, in the order they
 * were printed, with the prices still beside them.
 *
 * The other is the failure. A static app with no server can only read another
 * site's page if that site opted into CORS, and almost none have, so the
 * refusal is the path most cooks will take. Every refusal has to say what
 * happened and hand back an address they can open and copy from themselves.
 * The one exception is an address the app refused to open at all, which comes
 * back with no link, because a `javascript:` URL rendered as a clickable "open
 * it yourself" is a trap, not a next step.
 *
 * Nothing here reads allergens, and nothing here may be made to: a menu names
 * a dish, it does not name what is in it.
 */

const TABLE_MENU = `<!doctype html>
<html lang="en">
<head>
	<title>La Table</title>
	<meta name="description" content="Our menu">
	<style>.price { color: #900 }</style>
</head>
<body>
<header>
	<h1>La Table</h1>
	<nav><ul><li><a href="/">Home</a></li><li><a href="/menu">Menu</a></li></ul></nav>
</header>
<main>
	<h2>Starters</h2>
	<table class="menu">
		<tr><td class="name">Sopa de Lima</td><td class="price">$9</td></tr>
		<tr><td class="name">Pan con Tomate<br><span>rubbed with garlic &amp; salt</span></td><td class="price">$7</td></tr>
	</table>
	<h2>Mains</h2>
	<table class="menu">
		<thead><tr><th>Dish</th><th>Price</th></tr></thead>
		<tbody><tr><td>Cochinita Pibil</td><td>$24</td></tr></tbody>
	</table>
</main>
<footer><p>Open Tuesday to Sunday. &copy; 2026</p></footer>
</body>
</html>`;

const LIST_MENU = `<div class="menu">
	<h3>Small Plates</h3>
	<ul>
		<li><span class="name">Padr&oacute;n Peppers</span> <span class="price">6.50</span></li>
		<li>
			<div class="name">Boquerones</div>
			<div class="desc">white anchovies &amp; parsley</div>
			<div class="price">8</div>
		</li>
		<li><span>Tortilla</span>&nbsp;&nbsp;&nbsp;<span>7</span></li>
	</ul>
</div>`;

const SCRIPTED_MENU = `<body>
<div role="dialog" aria-label="Cookies">
	<p>We use cookies to improve your visit.</p>
	<button>Accept all</button>
</div>
<script>
	var menu = [{ "name": "Analytics Dish", "price": 999 }];
	if (a < b && c > d) { document.write("<p>Tracked</p>"); }
</script>
<section>
	<h2>Tacos</h2>
	<p>Al Pastor &mdash; 4.00</p>
	<p>Suadero <span aria-hidden="true">*</span> 4.50</p>
</section>
<div class="cookie-note">This site uses cookies</div>
</body>`;

const linesOf = (text) => text.split('\n');

describe('what comes out of a table-based menu page', () => {
	const text = htmlToMenuText(TABLE_MENU);

	it('keeps a row together, so the price stays beside its dish', () => {
		// A newline between the two cells would leave "$9" alone on a line,
		// where the next pass over the text reads it as a dish name.
		expect(linesOf(text)).toContain('Sopa de Lima\t$9');
		expect(linesOf(text)).toContain('Cochinita Pibil\t$24');
	});

	it('leaves the chrome, the stylesheet and the small print behind', () => {
		expect(text).not.toContain('.price');
		expect(text).not.toContain('color: #900');
		expect(text).not.toContain('Home');
		expect(text).not.toContain('Open Tuesday to Sunday');
		expect(text).not.toContain('Our menu');
	});

	it('keeps the reading order, so the sections still mean something', () => {
		expect(text.indexOf('Starters')).toBeGreaterThanOrEqual(0);
		expect(text.indexOf('Starters')).toBeLessThan(text.indexOf('Sopa de Lima'));
		expect(text.indexOf('Sopa de Lima')).toBeLessThan(text.indexOf('Mains'));
		expect(text.indexOf('Mains')).toBeLessThan(text.indexOf('Cochinita Pibil'));
	});

	it('turns a <br> into a line and decodes the entities around it', () => {
		expect(text).toContain('Pan con Tomate');
		expect(text).toContain('rubbed with garlic & salt');
	});

	it('never leaves a blank line doubled up', () => {
		expect(text).not.toMatch(/\n\n\n/);
		expect(text.startsWith('\n')).toBe(false);
		expect(text.endsWith('\n')).toBe(false);
	});
});

describe('what comes out of a list-based menu page', () => {
	const text = htmlToMenuText(LIST_MENU);
	const lines = linesOf(text);

	it('keeps inline spans on one line and the space between them', () => {
		// "Padrón Peppers6.50" is what a naive trim of every text run gives.
		expect(lines).toContain('Padrón Peppers 6.50');
	});

	it('gives each block-level part of an item its own line', () => {
		expect(lines).toContain('Boquerones');
		expect(lines).toContain('white anchovies & parsley');
		expect(lines).toContain('8');
	});

	it('collapses a run of &nbsp; to a single ordinary space', () => {
		expect(lines).toContain('Tortilla 7');
		// The nbsp itself, spelled out: it is invisible in this file otherwise.
		expect(text).not.toContain('\u00A0');
	});

	it('starts with the section heading', () => {
		expect(lines[0]).toBe('Small Plates');
	});
});

describe('a page carrying a script and a cookie bar', () => {
	const text = htmlToMenuText(SCRIPTED_MENU);

	it('imports nothing at all out of the script', () => {
		expect(text).not.toContain('Analytics Dish');
		expect(text).not.toContain('document.write');
		expect(text).not.toContain('Tracked');
		expect(text).not.toContain('var menu');
	});

	it('is not fooled by a comparison inside the script', () => {
		// `if (a < b && c > d)` reads as the start of a <b> element to anything
		// that walks tags through a script body, and the scan for its closing
		// bracket then runs on and swallows the menu underneath.
		expect(text).toContain('Al Pastor');
		expect(text).toContain('Tacos');
	});

	it('drops a cookie bar that marked itself as a dialog', () => {
		expect(text).not.toContain('Accept all');
		expect(text).not.toContain('We use cookies to improve your visit');
	});

	it('keeps a plainly-marked banner, because it cannot tell it from a dish', () => {
		// This is the honest half. There is no cookie-banner detector here; a
		// banner written as a plain div arrives as one more line for the cook
		// to delete on the review screen, and pretending otherwise would be a
		// promise the walk cannot keep.
		expect(text).toContain('This site uses cookies');
	});

	it('takes a decorative marker out without splitting the dish from its price', () => {
		expect(linesOf(text)).toContain('Suadero 4.50');
	});

	it('leaves the venue its own punctuation', () => {
		// The house style bans the em dash in the product's prose. This is the
		// venue's menu, not the product's prose, and rewriting a dish line is
		// not the importer's business.
		expect(text).toContain('Al Pastor — 4.00');
	});
});

describe('the parts of a page that trip a naive strip', () => {
	it('keeps a bare < in a description instead of eating the rest of the line', () => {
		expect(htmlToMenuText('<p>Ready in < 5 minutes, at the pass</p>')).toBe(
			'Ready in < 5 minutes, at the pass'
		);
	});

	it('does not end a tag inside a quoted attribute', () => {
		// indexOf('>') ends this tag mid-attribute and spills stew"> into the menu.
		expect(htmlToMenuText('<a href="/x" title="soup > stew">Caldo</a>')).toBe('Caldo');
	});

	it('drops an HTML comment, including one wrapping markup', () => {
		expect(htmlToMenuText('<p>Mole</p><!-- <p>Old price 12</p> --><p>16</p>')).toBe('Mole\n16');
	});

	it('drops a head that was never closed, and stops at the body', () => {
		// </head> is optional in HTML and hand-written pages leave it out. A
		// scan that only looks for the closing tag eats the whole document.
		const text = htmlToMenuText(
			'<html><head><title>Ignore me</title><body><p>Ceviche</p></body></html>'
		);
		expect(text).toBe('Ceviche');
	});

	it('drops hidden content but keeps an accordion section', () => {
		expect(htmlToMenuText('<div hidden><p>Last year</p></div><p>Now</p>')).toBe('Now');
		expect(htmlToMenuText('<div aria-hidden="true"><p>Icon</p></div><p>Now</p>')).toBe('Now');
		// hidden="until-found" is how a browser marks a collapsed section it
		// will reveal on find-in-page, and on a restaurant site that is very
		// often the menu itself.
		expect(htmlToMenuText('<div hidden="until-found"><p>Desserts</p></div>')).toBe('Desserts');
	});

	it('does not mistake data-hidden for hidden', () => {
		expect(htmlToMenuText('<div data-hidden="true"><p>Churros</p></div>')).toBe('Churros');
	});

	it('counts nesting, so an inner nav does not end the outer one early', () => {
		const text = htmlToMenuText('<nav>A<nav>B</nav>C</nav><p>Arepas</p>');
		expect(text).toBe('Arepas');
	});

	it('decodes numeric and named entities, and leaves a bare ampersand alone', () => {
		expect(htmlToMenuText('<p>Caf&eacute; &#8226; Th&#xe9; &frac12; portion</p>')).toBe(
			'Café • Thé ½ portion'
		);
		// Requiring the semicolon is what keeps this from reading an entity out
		// of a page that never had one.
		expect(htmlToMenuText('<p>AT&Tea Room, salt &amp; pepper</p>')).toBe(
			'AT&Tea Room, salt & pepper'
		);
		expect(htmlToMenuText('<p>&notareal; entity</p>')).toBe('&notareal; entity');
	});

	it('strips the invisible characters that would ride into a saved dish', () => {
		// A soft hyphen inside a name is impossible to see on the review screen
		// and breaks every later match against that name.
		expect(htmlToMenuText('<p>Bouil&shy;labaisse</p>')).toBe('Bouillabaisse');
		expect(htmlToMenuText('<p>Ta\u200Bcos</p>')).toBe('Tacos');
	});

	it('returns nothing for a page with nothing in it', () => {
		expect(htmlToMenuText('')).toBe('');
		expect(htmlToMenuText('<html><body>   \n  </body></html>')).toBe('');
	});
});

/* ---------------------------------------------------------------------- */

/** A fetch that answers with whatever the test hands it, and records the call. */
function fetchReturning(reply, calls = []){
	return (async (input, init) => {
		calls.push({ url: String(input), init });
		return typeof reply === 'function' ? reply() : reply;
	});
}

const html = (body, type = 'text/html; charset=utf-8', status = 200) =>
	new Response(body, { status, headers: { 'content-type': type } });

/** Narrowing helper, so a failed read can be read for its reason. */
function refused(result){
	if (result.ok) throw new Error(`expected a refusal, got text: ${result.text.slice(0, 60)}`);
	return { reason: result.reason, openUrl: result.openUrl };
}

describe('the address a cook pastes', () => {
	it('completes a bare domain with https', async () => {
		const calls = [];
		await linkToText('joesdiner.test/menu', fetchReturning(html(LIST_MENU), calls));
		expect(calls[0].url).toBe('https://joesdiner.test/menu');
	});

	it('trims the whitespace that comes with a copied link', async () => {
		const calls = [];
		await linkToText('  https://joesdiner.test/menu  ', fetchReturning(html(LIST_MENU), calls));
		expect(calls[0].url).toBe('https://joesdiner.test/menu');
	});

	it('leaves an http address as http rather than upgrading it silently', async () => {
		const calls = [];
		await linkToText('http://joesdiner.test/menu', fetchReturning(html(LIST_MENU), calls));
		expect(calls[0].url).toBe('http://joesdiner.test/menu');
	});

	it('refuses a scheme that is not http or https, and offers no link to open', async () => {
		const calls = [];
		for (const bad of ['javascript:alert(1)', 'data:text/html,<p>x</p>', 'ftp://x.test/menu']) {
			const said = refused(await linkToText(bad, fetchReturning(html(''), calls)));
			expect(said.reason).toMatch(/http and https/);
			// The screen renders openUrl as a link. Handing back an address the
			// app just declined to fetch would turn the refusal into a click.
			expect(said.openUrl).toBe('');
		}
		expect(calls).toHaveLength(0);
	});

	it('refuses an empty box and a mangled address without fetching', async () => {
		const calls = [];
		expect(refused(await linkToText('   ', fetchReturning(html(''), calls))).reason).toMatch(
			/no address/i
		);
		expect(
			refused(await linkToText('not an address at all', fetchReturning(html(''), calls))).reason
		).toMatch(/not a web address/i);
		expect(calls).toHaveLength(0);
	});
});

describe('reading the page at the far end', () => {
	it('hands back the menu text, and nothing that could pass for an allergen', async () => {
		const result = await linkToText('joesdiner.test/menu', fetchReturning(html(TABLE_MENU)));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.text).toContain('Sopa de Lima\t$9');
		expect(result.text).not.toContain('Home');
		// The contract the review screen leans on: text, and only text. An
		// allergen has to be checked dish by dish by a person.
		expect(Object.keys(result).sort()).toEqual(['ok', 'text']);
	});

	it('sends nothing about the cook along with the request', async () => {
		const calls = [];
		await linkToText('joesdiner.test/menu', fetchReturning(html(TABLE_MENU), calls));
		expect(calls[0].init?.credentials).toBe('omit');
		expect(calls[0].init?.referrerPolicy).toBe('no-referrer');
	});

	it('takes a text/plain menu as it stands rather than through the HTML walk', async () => {
		// The HTML pass collapses newlines, which is the one thing a plain-text
		// menu cannot survive.
		const plain = 'STARTERS\nSopa de Lima 9\nPan con Tomate 7\n\nMAINS\nCochinita Pibil 24\n';
		const result = await linkToText(
			'joesdiner.test/menu.txt',
			fetchReturning(html(plain, 'text/plain'))
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(linesOf(result.text)).toContain('Sopa de Lima 9');
		expect(linesOf(result.text)).toContain('Cochinita Pibil 24');
	});
});

describe('when the read cannot happen, and the cook needs the next step', () => {
	const target = 'https://joesdiner.test/menu';

	it('names the refusal for what it is, and hands back the address to open', async () => {
		// This is the ordinary ending, not the rare one: a browser cannot read
		// another site's page unless that site opted in, and restaurant sites
		// have no reason to have done it.
		const said = refused(
			await linkToText(target, (() => {
				throw new TypeError('Failed to fetch');
			}))
		);
		expect(said.reason).toMatch(/did not allow the app to read/);
		expect(said.openUrl).toBe(target);
	});

	it('says the page is gone on a 404, and still offers the address', async () => {
		const said = refused(await linkToText(target, fetchReturning(html('Not found', 'text/html', 404))));
		expect(said.reason).toContain('404');
		expect(said.openUrl).toBe(target);
	});

	it('names the site error on any other bad status', async () => {
		expect(
			refused(await linkToText(target, fetchReturning(html('nope', 'text/html', 503)))).reason
		).toContain('503');
		expect(
			refused(await linkToText(target, fetchReturning(html('nope', 'text/html', 403)))).reason
		).toContain('403');
	});

	it('stops waiting on a site that never answers', async () => {
		vi.useFakeTimers();
		try {
			const hangs = ((_input, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new DOMException('aborted', 'AbortError'))
					);
				}));
			const pending = linkToText(target, hangs);
			await vi.advanceTimersByTimeAsync(60000);
			const said = refused(await pending);
			expect(said.reason).toMatch(/took longer than \d+ seconds/);
			expect(said.openUrl).toBe(target);
		} finally {
			vi.useRealTimers();
		}
	});

	it('stops waiting on a site that answers and then stalls mid-page', async () => {
		// The clock has to cover the read, not just the reply. Clearing it once
		// the headers arrived left a stalled body waiting for good.
		vi.useFakeTimers();
		try {
			const stalls = ((_input, init) =>
				Promise.resolve({
					ok: true,
					status: 200,
					headers: new Headers({ 'content-type': 'text/html' }),
					text: () =>
						new Promise<string>((_resolve, reject) => {
							init?.signal?.addEventListener('abort', () =>
								reject(new DOMException('aborted', 'AbortError'))
							);
						})
				}));
			const pending = linkToText(target, stalls);
			await vi.advanceTimersByTimeAsync(60000);
			const said = refused(await pending);
			expect(said.reason).toMatch(/took longer than \d+ seconds/);
			expect(said.openUrl).toBe(target);
		} finally {
			vi.useRealTimers();
		}
	});

	it('says so when the link is a PDF, which is what half of them are', async () => {
		const said = refused(
			await linkToText(target, fetchReturning(html('%PDF-1.7', 'application/pdf')))
		);
		expect(said.reason).toMatch(/PDF/);
		expect(said.openUrl).toBe(target);
	});

	it('names any other kind of file rather than importing gibberish', async () => {
		const said = refused(
			await linkToText(target, fetchReturning(html('{"menu":[]}', 'application/json')))
		);
		expect(said.reason).toContain('application/json');
	});

	it('explains a page whose menu is drawn after it loads', async () => {
		// A JavaScript-rendered menu returns a full document whose text is a
		// cookie line and a phone number. Calling that a success hands the cook
		// an empty box with nothing to do about it.
		const shell = '<html><head><title>Joe</title></head><body><div id="app"></div></body></html>';
		const said = refused(await linkToText(target, fetchReturning(html(shell))));
		expect(said.reason).toMatch(/almost no text/);
		expect(said.openUrl).toBe(target);
	});

	it('writes every refusal in the house voice', async () => {
		const reasons = [
			refused(await linkToText('javascript:alert(1)')).reason,
			refused(await linkToText('   ')).reason,
			refused(await linkToText(target, fetchReturning(html('x', 'text/html', 404)))).reason,
			refused(await linkToText(target, fetchReturning(html('%PDF', 'application/pdf')))).reason,
			refused(
				await linkToText(target, (() => {
					throw new TypeError('Failed to fetch');
				}))
			).reason
		];
		for (const reason of reasons) {
			expect(reason).not.toContain('—');
			expect(reason).not.toContain(' -- ');
			expect(reason).not.toMatch(/sorry|unfortunately|oops/i);
			// One sentence, and it ends like one.
			expect(reason.trim()).toMatch(/[.)]$/);
		}
	});
});

/* ---- the four levels: Tonight deals from the level, and a backup keeps the
   answers and the tests. Here because this is the file that already loads the
   session deck and the backup import as they ship. */
describe('the four levels, in the session and the backup', () => {
	const cardKeysAt = (n) => Object.keys(W.LEVEL_ITEMS).flatMap((s) => W.LEVEL_ITEMS[s][n]).filter((k) => !/^(q|drill|sec|prod|flight|prep|preplist|prepsafe|plate|riff):/.test(k));

	it('a fresh store is dealt Barback, then Bartender once every Barback card is seen, and the Today door names which', () => {
		const cards = W.progress.cards;
		W.progress.cards = {};
		try {
			expect(W.todayLevel()).toBe(1);
			for (let i = 0; i < 12; i++) {
				const { newDeck } = W.sessionDeckParts();
				for (const d of newDeck.filter((x) => x.src !== 'My Bar')) expect(W.levelOf(W.cardKey(d))).toBe(1);
			}
			expect(W.todayDoor().sub).toBe('Today deals from Barback.');
			for (const k of cardKeysAt(1)) W.progress.cards[k] = { r: 1, w: 0, due: Date.now() + 9e8 };
			expect(W.todayLevel()).toBe(2);
			for (let i = 0; i < 12; i++) {
				const { newDeck } = W.sessionDeckParts();
				for (const d of newDeck.filter((x) => x.src !== 'My Bar')) expect(W.levelOf(W.cardKey(d))).toBe(2);
			}
			expect(W.todayDoor().sub).toBe('Today deals from Bartender.');
		} finally { W.progress.cards = cards; }
	});

	it('a level whose only unseen cards are on the wall deals the wall in every seat; the menu leads while it has a new card; a night of reviews says so', () => {
		const cards = W.progress.cards, bar = W.progress.bar;
		W.progress.cards = {};
		try {
			const tap1 = new Set(cardKeysAt(1).filter((k) => k.startsWith('On Tap · ')));
			expect(tap1.size).toBeGreaterThan(0);
			for (const k of cardKeysAt(1)) if (!tap1.has(k)) W.progress.cards[k] = { r: 1, w: 0, due: Date.now() + 9e8 };
			expect(W.todayLevel()).toBe(1);
			for (let i = 0; i < 12; i++) {
				const { newDeck } = W.sessionDeckParts();
				expect(newDeck.length).toBeGreaterThan(0);
				for (const d of newDeck) expect(tap1.has(W.cardKey(d))).toBe(true);
			}
			expect(W.todayDoor().sub).toBe('Today deals from Barback.');
			W.progress.bar = [{ id: 'lv-pin', name: 'House Sour', spec: ['2 oz rye', '1 oz lemon juice', '0.75 oz simple syrup'], method: 'Shake', glass: 'Coupe', garnish: 'Lemon twist', note: '', family: 'Sour', spirit: 'Rye' }];
			W.barChanged();
			expect(W.todayDoor().sub).toBe('Today deals from your menu, then Barback.');
			W.progress.bar = [];
			W.barChanged();
			for (const d of W.sessionCardPool()) W.progress.cards[W.cardKey(d)] = { r: 1, w: 0, due: Date.now() + 9e8 };
			expect(W.sessionDeckParts().newDeck).toHaveLength(0);
			expect(W.todayDoor().sub).toBe('Reviews only tonight.');
		} finally { W.progress.cards = cards; W.progress.bar = bar; W.barChanged(); }
	});

	it('a backup whose answers or level tests are the wrong shape loses only the bad rows', () => {
		const qa = W.progress.qa, lv = W.progress.levels;
		W.progress.qa = {};
		W.progress.levels = {};
		const file = JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {},
			qa: { 'q:junk': 'yes', 'q:list': [1, 2], 'q:ok': { r: '2', w: -1 } },
			levels: { 9: [{ ts: 1, total: 17, miss: 0 }], 1: [{ ts: 5, total: 17, miss: 2 }, null, 'x', { total: 17 }], 2: 'lots' } } });
		try {
			globalThis.confirmAnswers = [true];
			W.dataImport(file);
			expect(W.progress.qa).toEqual({ 'q:ok': { r: 2, w: 0, last: 0 } });
			expect(Object.keys(W.progress.levels)).toEqual(['1']);
			expect(W.progress.levels[1].map((x) => x.ts)).toEqual([5]);
		} finally { W.progress.qa = qa; W.progress.levels = lv; }
	});

	it('a backup merges the answers (the larger count wins) and the level tests (a union by time), and a second import changes nothing', () => {
		const qa = W.progress.qa, lv = W.progress.levels;
		W.progress.qa = { 'q:a': { r: 1, w: 2, last: 5 } };
		W.progress.levels = { 1: [{ ts: 10, total: 17, miss: 3 }] };
		const file = JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {},
			qa: { 'q:a': { r: 3, w: 1, last: 9 }, 'q:b': { r: 1, w: 0, last: 7 } },
			levels: { 1: [{ ts: 10, total: 17, miss: 3 }, { ts: 20, total: 17, miss: 0 }], 2: [{ ts: 30, total: 17, miss: 5 }] } } });
		try {
			for (let pass = 0; pass < 2; pass++) {
				globalThis.confirmAnswers = [true];
				W.dataImport(file);
				expect(W.progress.qa['q:a']).toEqual({ r: 3, w: 2, last: 9 });
				expect(W.progress.qa['q:b']).toEqual({ r: 1, w: 0, last: 7 });
				expect(W.progress.levels[1].map((x) => x.ts)).toEqual([10, 20]);
				expect(W.progress.levels[2]).toHaveLength(1);
			}
		} finally { W.progress.qa = qa; W.progress.levels = lv; }
	});
});

/* The least of a DOM the shared screens need, for the two doors: elements
   with children, attributes, text, listeners, closest and querySelector by
   tag, class and attribute. Ported from WorldTable's tools/check-house-ui.mjs. */
function stubSelector(sel) {
	return sel.split(',').map((raw) => {
		const m = /^([a-zA-Z0-9]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/.exec(raw.trim());
		if (!m) throw new Error('stub: a selector it does not read: ' + raw);
		const attrs = [];
		const re = /\[([^\]=]+)(?:=("?)([^\]"]*)\2)?\]/g;
		let a;
		while ((a = re.exec(m[3]))) attrs.push({ name: a[1], value: a[3] === undefined ? null : a[3] });
		return { tag: m[1].toUpperCase(), classes: m[2] ? m[2].split('.').filter(Boolean) : [], attrs };
	});
}
class StubNode {
	constructor(kind, tag, text) {
		this.kind = kind; this.tagName = tag.toUpperCase(); this.text = text;
		this.childNodes = []; this.parentNode = null; this.attrs = {}; this.listeners = {}; this.value = '';
	}
	get firstChild() { return this.childNodes.length ? this.childNodes[0] : null; }
	get dataset() { const d = {}; for (const k of Object.keys(this.attrs)) if (k.startsWith('data-')) d[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = this.attrs[k]; return d; }
	appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); return n; }
	removeChild(n) { const i = this.childNodes.indexOf(n); if (i < 0) throw new Error('stub: not a child'); this.childNodes.splice(i, 1); n.parentNode = null; return n; }
	setAttribute(k, v) { this.attrs[k] = String(v); }
	getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
	get textContent() { return this.kind === 'text' ? this.text : this.childNodes.map((c) => c.textContent).join(''); }
	addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
	dispatch(type) { const ev = { type, target: this, preventDefault() {} }; for (let n = this; n; n = n.parentNode) for (const fn of (n.listeners[type] || []).slice()) fn.call(n, ev); }
	click() { this.dispatch('click'); }
	focus() {}
	matches(sel) { return stubSelector(sel).some((p) => {
		if (p.tag && this.tagName !== p.tag) return false;
		const cls = (this.getAttribute('class') || '').split(/\s+/);
		for (const c of p.classes) if (!cls.includes(c)) return false;
		for (const a of p.attrs) { const v = this.getAttribute(a.name); if (v === null) return false; if (a.value !== null && v !== a.value) return false; }
		return true;
	}); }
	closest(sel) { for (let n = this; n; n = n.parentNode) if (n.kind === 'element' && n.matches(sel)) return n; return null; }
	querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.childNodes) { if (c.kind === 'element' && c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
	querySelector(sel) { const all = this.querySelectorAll(sel); return all.length ? all[0] : null; }
}
function stubDocument() {
	return { head: new StubNode('element', 'head', ''), body: new StubNode('element', 'body', ''),
		createElement: (tag) => new StubNode('element', tag, ''), createTextNode: (s) => new StubNode('text', '#text', String(s)) };
}
/* the app's own escaper, for a label pinned through it */
const W_esc = vm.runInThisContext('esc');

/* ---- the House ---------------------------------------------------------
   The engine is loaded into this realm over a Map (no IndexedDB in node, so
   the api is volatile) and installed where the shipped house-bar.js reads
   it, OOT.house; every case builds a fresh api so no house leaks between
   them. The fixture is the World Table's own house-min.json, copied and never
   edited here; a pack is built from it through the engine's own buildPack. */
const houseDescribe = HOUSE_ENGINE ? describe : describe.skip;
houseDescribe('the House behind the menu', () => {
	vm.runInThisContext(readFileSync(HOUSE_ENGINE, 'utf8'));
	/* the engine installs on window; house-bar.js reads the bare name */
	globalThis.OOT = globalThis.window.OOT;
	const lib = OOT.houseLib;
	const fixtureHouse = () => JSON.parse(fixture('house-min.json'));
	const packOf = (house) => JSON.stringify(lib.buildPack(house, 'tools', Date.now()));
	const fresh = () => { OOT.house = lib.createHouseApi(lib.mapStorage(), { from: 'ledger' }); return OOT.house; };
	const importCurrent = async (house) => {
		const api = fresh();
		const r = await api.importPack(packOf(house || fixtureHouse()), { mode: 'new' });
		expect(r.ok).toBe(true);
		expect(r.current).toBe(true);
		return api;
	};
	const withBarAsync = async (fn) => {
		const before = W.progress.bar, cards = W.progress.cards;
		W.progress.bar = [];
		W.progress.cards = {};
		W.barChanged();
		try { return await fn(); } finally { W.progress.bar = before; W.progress.cards = cards; W.barChanged(); }
	};
	const TWELVE = ['family', 'garnish', 'glass', 'house', 'id', 'method', 'name', 'note', 'price', 'spec', 'spirit', 'ts'];
	const lastPut = () => vm.runInThisContext('houseLastPut');

	it('a spec-less house drink is filed as a draft through saveBarRecord, under the House’s own id, with the twelve keys, and the next wake has nothing to say', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			const out = await W.houseSyncIn();
			expect(out.ok).toBe(true);
			expect(out.changes.map((c) => c.what).sort()).toEqual(['row-added', 'row-added']);
			expect(W.progress.bar).toHaveLength(2);
			const verjus = W.progress.bar.find((b) => b.id === 'b-verjus01');
			expect(verjus.draft).toBe(true);
			expect(verjus.house).toBe('h-lantern0');
			expect(Object.keys(verjus).filter((k) => k !== 'draft').sort()).toEqual(TWELVE);
			expect(verjus.maitre === undefined).toBe(true);
			expect(W.missingFor(verjus, []).length).toBeGreaterThan(0);
			const collins = W.progress.bar.find((b) => b.id === 'b-collins1');
			expect(collins.draft === undefined).toBe(true);
			expect(collins.spec).toEqual(['50 ml gin', '25 ml lemon', '15 ml rosemary syrup', 'top soda']);
			expect(collins.maitre.say.by).toBe('person');
			expect(collins.ts).toBe(1790589600000);
			expect(W.pourSources()).toContain('My Bar');
			/* stable: the stamp the two sides agreed on was written, not the clock */
			const again = await W.houseSyncIn();
			expect(again.changes).toEqual([]);
			expect(W.progress.bar).toHaveLength(2);
		});
	});

	it('a person’s save reaches the House through housePut, carries the house stamp back, and the placeholder glass never churns', async () => {
		const api = await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const rec = W.saveBarRecord({ name: 'House Sour', spec: ['2 oz rye', '1 oz lemon'], family: 'Sour', spirit: 'Rye' }, null);
			expect(typeof rec).toBe('object');
			expect(rec.house === undefined).toBe(true);
			await lastPut();
			const item = api.current().cocktails.find((c) => c.id === rec.id);
			expect(item.name).toBe('House Sour');
			expect(item.glass).toBe('');
			const now = W.progress.bar.find((b) => b.id === rec.id);
			expect(now.house).toBe('h-lantern0');
			expect(now.glass).toBe(String.fromCharCode(0x2014));
			/* eleven keys plus the house, and still no empty key */
			expect(Object.keys(now).sort()).toEqual(TWELVE);
			const again = await W.houseSyncIn();
			expect(again.changes).toEqual([]);
			/* an edit through the form, which carries no house, keeps it */
			const edited = W.saveBarRecord({ name: 'House Sour', spec: ['2 oz rye', '1 oz lemon', '0.75 oz simple'], family: 'Sour', spirit: 'Rye' }, rec.id);
			expect(edited.house).toBe('h-lantern0');
			await lastPut();
			expect(api.current().cocktails.find((c) => c.id === rec.id).spec).toHaveLength(3);
		});
	});

	it('a kept line beats hers, whichever side is newer', async () => {
		const house = fixtureHouse();
		house.cocktails[0].guest = { value: 'Her line, newer', by: 'maitre', ts: 1900000000000 };
		await importCurrent(house);
		await withBarAsync(async () => {
			W.progress.bar = [{ id: 'b-collins1', house: 'h-lantern0', name: 'The Lantern Collins', spec: ['50 ml gin'], method: '', glass: '', garnish: '', note: '', family: 'Collins', spirit: 'Gin', price: '', ts: 5,
				maitre: { guest: { value: 'My own words', by: 'person', ts: 5 } } }];
			W.barChanged();
			const out = await W.houseSyncIn();
			const item = OOT.house.current().cocktails.find((c) => c.id === 'b-collins1');
			expect(item.guest).toMatchObject({ value: 'My own words', by: 'person' });
			const row = W.progress.bar.find((b) => b.id === 'b-collins1');
			expect(row.maitre.guest).toMatchObject({ value: 'My own words', by: 'person' });
			expect(out.changes.some((c) => c.id === 'b-collins1' && c.what === 'item-updated')).toBe(true);
		});
		/* and the other way: hers on the row, kept on the House */
		await importCurrent();
		await withBarAsync(async () => {
			W.progress.bar = [{ id: 'b-collins1', house: 'h-lantern0', name: 'The Lantern Collins', spec: ['50 ml gin'], method: '', glass: '', garnish: '', note: '', family: 'Collins', spirit: 'Gin', price: '', ts: 1900000000000,
				maitre: { guest: { value: 'Her line, newer', by: 'maitre', ts: 1900000000000 } } }];
			W.barChanged();
			await W.houseSyncIn();
			const row = W.progress.bar.find((b) => b.id === 'b-collins1');
			expect(row.maitre.guest.by).toBe('person');
			expect(row.maitre.guest.value).toBe('A long gin drink with lemon, a rosemary syrup from the hearth and soda.');
			expect(OOT.house.current().cocktails.find((c) => c.id === 'b-collins1').guest.by).toBe('person');
		});
	});

	it('no removal without a tombstone: a row the House lacks is added to it; a newer tombstone takes the row and its card; an older one is stale and goes instead', async () => {
		const house = fixtureHouse();
		house.removed = { 'b-oldtomb1': 1 };
		const api = await importCurrent(house);
		await withBarAsync(async () => {
			const row = (id, name) => ({ id, house: 'h-lantern0', name, spec: ['2 oz rye'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', price: '', ts: 5 });
			W.progress.bar = [row('b-abcdefgh', 'House Sour'), row('b-oldtomb1', 'Old Tombstone Sour')];
			W.progress.cards['My Bar · House Sour'] = { r: 2, w: 0 };
			W.barChanged();
			const out = await W.houseSyncIn();
			expect(W.progress.bar.map((b) => b.id).sort()).toEqual(['b-abcdefgh', 'b-collins1', 'b-oldtomb1', 'b-verjus01']);
			expect(out.changes.filter((c) => c.what === 'row-removed')).toEqual([]);
			expect(api.current().cocktails.some((c) => c.id === 'b-abcdefgh')).toBe(true);
			expect(api.current().cocktails.some((c) => c.id === 'b-oldtomb1')).toBe(true);
			expect(api.current().removed['b-oldtomb1'] === undefined).toBe(true);
			/* the Remove act's two steps: the list first, then the tombstone */
			expect(W.removeBarRecord('b-abcdefgh').name).toBe('House Sour');
			expect(W.progress.cards['My Bar · House Sour'] === undefined).toBe(true);
			expect(await W.houseRemove('b-abcdefgh')).toBe(true);
			expect(typeof api.current().removed['b-abcdefgh']).toBe('number');
			/* an old backup brings the row back, older than the tombstone: the wake takes it off again, card and all */
			W.progress.bar.push(row('b-abcdefgh', 'House Sour'));
			W.progress.cards['My Bar · House Sour'] = { r: 2, w: 0 };
			W.barChanged();
			const again = await W.houseSyncIn();
			expect(again.changes.some((c) => c.id === 'b-abcdefgh' && c.what === 'row-removed')).toBe(true);
			expect(W.progress.bar.some((b) => b.id === 'b-abcdefgh')).toBe(false);
			expect(W.progress.cards['My Bar · House Sour'] === undefined).toBe(true);
			expect(W.removeBarRecord('b-nothere1')).toBe(null);
		});
	});

	it('a name twin is re-keyed to the House’s id through saveBarRecord, and its card moves with the name', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			W.progress.bar = [{ id: 'b-oldid001', house: 'h-lantern0', name: 'the lantern collins', spec: ['50 ml gin'], method: '', glass: '', garnish: '', note: '', family: 'Collins', spirit: 'Gin', price: '', ts: 1 }];
			W.progress.cards['My Bar · the lantern collins'] = { r: 3, w: 1 };
			W.barChanged();
			const out = await W.houseSyncIn();
			expect(out.changes.some((c) => c.what === 'renamed' && c.id === 'b-collins1' && c.from === 'b-oldid001')).toBe(true);
			expect(W.progress.bar.map((b) => b.id).sort()).toEqual(['b-collins1', 'b-verjus01']);
			const rec = W.progress.bar.find((b) => b.id === 'b-collins1');
			expect(rec.name).toBe('The Lantern Collins');
			expect(rec.spec).toHaveLength(4);
			expect(W.progress.cards['My Bar · The Lantern Collins']).toMatchObject({ r: 3, w: 1 });
			expect(W.progress.cards['My Bar · the lantern collins'] === undefined).toBe(true);
		});
	});

	it('progress.house unions on ts|id in the merge branch, capped at a thousand, and is normalised in the replace branch', () => {
		const was = W.progress.house;
		W.progress.house = { say: [{ ts: 1, id: 'a', verdict: 'clean' }], role: [] };
		const file = (house) => JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {}, house } });
		try {
			for (let pass = 0; pass < 2; pass++) {
				globalThis.confirmAnswers = [true];
				W.dataImport(file({ say: [{ ts: 1, id: 'a', verdict: 'clean' }, { ts: 2, id: 'b' }, 'junk', { id: 'no stamp' }], role: [{ ts: 3, id: 'c' }], other: [1] }));
				expect(W.progress.house.say.map((x) => x.ts + '|' + x.id)).toEqual(['1|a', '2|b']);
				expect(W.progress.house.role.map((x) => x.id)).toEqual(['c']);
				expect(Object.keys(W.progress.house).sort()).toEqual(['role', 'say']);
			}
			const many = Array.from({ length: 1200 }, (_, i) => ({ ts: i + 10, id: 's' + i }));
			globalThis.confirmAnswers = [true];
			W.dataImport(file({ say: many, role: [] }));
			expect(W.progress.house.say).toHaveLength(1000);
			expect(W.progress.house.say[999].id).toBe('s1199');
			/* a backup with no house store leaves the records alone */
			globalThis.confirmAnswers = [true];
			W.dataImport(JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {} } }));
			expect(W.progress.house.say).toHaveLength(1000);
		} finally { W.progress.house = was; }
		/* REPLACE: the backup's store as it stands, normalised, or defaulted when it carries none */
		const before = W.progress;
		globalThis.confirmAnswers = [false, true];
		W.dataImport(file({ say: 'junk', role: [{ ts: 7, id: 'r' }, null] }));
		let now = vm.runInThisContext('progress');
		try {
			expect(now.house).toEqual({ say: [], role: [{ ts: 7, id: 'r' }] });
			globalThis.confirmAnswers = [false, true];
			W.dataImport(JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {} } }));
			now = vm.runInThisContext('progress');
			expect(now.house).toEqual({ say: [], role: [] });
		} finally {
			vm.runInThisContext('(function(o){ progress = o; })')(before);
			W.barChanged();
		}
	});

	it('the orphan sweep spares a card whose drink is on any house on the device, current or not', async () => {
		const api = await importCurrent();
		const second = fixtureHouse();
		second.id = 'h-second01';
		second.name = 'The Second Room';
		second.dishes = []; second.wines = []; second.tastings = []; second.lexicon = []; second.scenarios = []; second.mixUps = []; second.mustKnows = []; second.askAtLineup = []; second.disputes = [];
		second.cocktails = [{ id: 'b-second01', house: 'h-second01', kind: 'cocktail', name: 'Second House Sour', section: '', meals: [], price: '', prices: [], spec: ['2 oz rye'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', zeroProof: false, serviceNote: '', ts: 5 }];
		const r = await api.importPack(packOf(second), { mode: 'new' });
		expect(r.ok).toBe(true);
		expect(r.current).toBe(false);
		await W.houseNamesRefresh();
		expect(W.houseNames().sort()).toEqual(['Second House Sour', 'The Lantern Collins', 'Verjus and Tonic']);
		await withBarAsync(async () => {
			W.progress.cards['My Bar · Second House Sour'] = { r: 4, w: 0 };
			W.progress.cards['My Bar · The Lantern Collins'] = { r: 1, w: 0 };
			W.progress.cards['My Bar · Nowhere'] = { r: 1, w: 0 };
			globalThis.confirmAnswers = [true];
			W.dataImport(JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {}, bar: [] } }));
			expect(W.progress.cards['My Bar · Second House Sour']).toMatchObject({ r: 4 });
			expect(W.progress.cards['My Bar · The Lantern Collins']).toMatchObject({ r: 1 });
			expect(W.progress.cards['My Bar · Nowhere'] === undefined).toBe(true);
		});
	});

	it('a switch of house replaces the list through the doors and leaves the outgoing cards for the day the house comes back', async () => {
		const api = await importCurrent();
		const second = fixtureHouse();
		second.id = 'h-second01'; second.name = 'The Second Room';
		second.dishes = []; second.wines = []; second.tastings = []; second.lexicon = []; second.scenarios = []; second.mixUps = []; second.mustKnows = []; second.askAtLineup = []; second.disputes = [];
		second.cocktails = [{ id: 'b-second01', house: 'h-second01', kind: 'cocktail', name: 'Second House Sour', section: '', meals: [], price: '', prices: [], spec: ['2 oz rye'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', zeroProof: false, serviceNote: '', ts: 5 }];
		await api.importPack(packOf(second), { mode: 'new' });
		await withBarAsync(async () => {
			await W.houseSyncIn();
			W.progress.cards['My Bar · The Lantern Collins'] = { r: 2, w: 0 };
			expect(await W.houseSwitch('h-second01')).toBe(true);
			expect(api.currentId()).toBe('h-second01');
			expect(W.progress.bar.map((b) => b.id)).toEqual(['b-second01']);
			expect(W.progress.bar[0].house).toBe('h-second01');
			expect(W.progress.cards['My Bar · The Lantern Collins']).toMatchObject({ r: 2 });
			expect(W.houseLineHTML()).toContain('The Second Room · 1 drink here');
			expect(await W.houseSwitch('h-lantern0')).toBe(true);
			expect(W.progress.bar.map((b) => b.id).sort()).toEqual(['b-collins1', 'b-verjus01']);
			expect(W.houseLineHTML()).toContain('The Lantern Room · 2 drinks here · complete · menus read 2026-09-28');
		});
	});

	it('isHouseCard deals a line-only draft to line10 and never to name2spec, and an unkept line is no card', async () => {
		const api = await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const fc = W.state.fc, was = fc.src;
			fc.src = 'My Bar';
			try {
				expect(W.fcPool().map((d) => d.name)).toEqual(['The Lantern Collins']);
				expect(W.menuCardCount()).toBe(1);
				const verjus = W.progress.bar.find((b) => b.id === 'b-verjus01');
				expect(W.isHouseCard(verjus)).toBe(false);
				/* hers, not kept: still no card */
				expect(await api.setMark('cocktail', 'b-verjus01', 'lines', { value: { s10: 'Her ten second line about verjus.', s20: '', s45: '' }, by: 'maitre', ts: 1 })).toBe(true);
				expect(W.isHouseCard(verjus)).toBe(false);
				expect(W.fcPool().map((d) => d.name)).toEqual(['The Lantern Collins']);
				/* kept: a card for the line modes and nothing else */
				expect(await api.setMark('cocktail', 'b-verjus01', 'lines', { value: { s10: 'Verjus and tonic, sharp as a lemon and nothing in it.', s20: '', s45: '' }, by: 'person', ts: 2 })).toBe(true);
				expect(W.isHouseCard(verjus)).toBe(true);
				expect(W.hasKeptLines(verjus)).toBe(true);
				expect(W.keptLineOf(verjus, 's10')).toMatch(/^Verjus and tonic/);
				expect(W.keptLineOf(verjus, 's20')).toBe('');
				expect(W.menuCardCount()).toBe(2);
				const pool = W.fcPool();
				expect(pool.map((d) => d.name).sort()).toEqual(['The Lantern Collins', 'Verjus and Tonic']);
				const card = pool.find((d) => d.name === 'Verjus and Tonic');
				expect(card.draft).toBe(true);
				const fits = Object.fromEntries(W.FC_MODES.map((m) => [m[0], !!m[3](card)]));
				expect(fits).toEqual({ name2spec: false, spec2name: false, build: false, cloze: false, service: false, line10: true, line20: false, line45: false, parts: false, upsell: false, study: true });
				/* the fixture's Collins carries a spec AND kept lines: every mode fits it */
				const collins = pool.find((d) => d.name === 'The Lantern Collins');
				expect(W.FC_MODES.find((m) => m[0] === 'name2spec')[3](collins)).toBe(true);
				expect(W.FC_MODES.find((m) => m[0] === 'line45')[3](collins)).toBe(true);
				/* a beer card still fits the name modes with no spec */
				const beer = W.allDrinks().find((d) => d.src === 'On Tap');
				expect(W.FC_MODES.find((m) => m[0] === 'name2spec')[3](beer)).toBe(true);
				/* the Menu round: no ticket is the draft's, and its line is asked */
				let lineAsked = false;
				for (let i = 0; i < 20; i++) {
					for (const q of W.buildRound('mybar')) {
						if (q.ticket) expect(q.ticket.draft === undefined).toBe(true);
						if (/Verjus and Tonic/.test(q.prompt)) { lineAsked = true; expect(q.answer).toMatch(/^Verjus and tonic/); expect(q.options).toHaveLength(4); }
					}
				}
				expect(lineAsked).toBe(true);
				const ql = W.qMyBarLine(verjus);
				expect(ql.prompt).toBe('Which is the line for Verjus and Tonic on your menu, said in ten seconds?');
				expect(ql.options).toContain(ql.answer);
				/* every wrong answer is a line kept on the house's other drink, the Collins */
				const collinsLines = ['s10', 's20', 's45'].map((k) => W.keptLineOf(W.progress.bar.find((b) => b.id === 'b-collins1'), k).trim());
				for (const o of ql.options) if (o !== ql.answer) expect(collinsLines).toContain(o);
				/* the Collins has one line kept elsewhere, not three: no question */
				expect(W.qMyBarLine(W.progress.bar.find((b) => b.id === 'b-collins1'))).toBe(null);
				/* no kept line, no question */
				expect(W.qMyBarLine({ id: 'b-nothere1', name: 'Nowhere', spec: [] })).toBe(null);
			} finally { fc.src = was; }
		});
	});

	/* ---- the offline drills (piece 7): the two card modes, the two Menu
	   round questions and Pair the menu. Every one reads kept marks only,
	   stands behind no lock, and writes nothing to progress.levels or
	   progress.house. A house of n cocktails, each with its parts, its
	   lines and an upsell to the next one, by person unless `hers` names
	   it; four dishes with a kept pairing onto four wines and four of the
	   cocktails, for the engine's two pairing kinds. */
	const bigHouse = (n, hers) => {
		const house = fixtureHouse();
		const base = house.cocktails[0];
		const ids = Array.from({ length: n }, (_, i) => 'b-drink00' + String(i + 1).padStart(2, '0'));
		house.cocktails = ids.map((id, i) => {
			const c = JSON.parse(JSON.stringify(base));
			c.id = id; c.name = 'House Drink ' + ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][i];
			c.spec = ['50 ml gin', (20 + i) + ' ml lemon'];
			const by = hers && hers.indexOf(id) >= 0 ? 'maitre' : 'person';
			c.parts = { value: { main: 'Gin', technique: 'Shaken', sauce: 'Lemon and syrup number ' + (i + 1), sides: 'A coupe', taste: 'Sharp' }, by, ts: 1790672400000 };
			c.lines = { value: { s10: 'The ten second line for drink number ' + (i + 1) + '.', s20: '', s45: '' }, by, ts: 1790672400000 };
			c.upsells = { value: [ids[(i + 1) % n]], by, ts: 1790672400000 };
			delete c.say; delete c.guest; delete c.why; delete c.pairs; delete c.origin; delete c.ingredientsNamed;
			return c;
		});
		const wine = house.wines[0];
		house.wines = ['One', 'Two', 'Three', 'Four'].map((w, i) => Object.assign(JSON.parse(JSON.stringify(wine)), { id: 'w-wine000' + (i + 1), name: 'Quay Wine ' + w, wine: 'Quay ' + w }));
		const dish = house.dishes[0];
		house.dishes = ['Hake', 'Lamb', 'Beet', 'Pie'].map((d, i) => {
			const x = JSON.parse(JSON.stringify(dish));
			x.id = 'd-dish000' + (i + 1); x.name = 'Lantern ' + d;
			x.pairing.value.wineId = 'w-wine000' + (i + 1);
			x.pairing.value.zeroProofId = ids[i % n];
			return x;
		});
		house.tastings = [];
		house.mixUps = [];
		house.scenarios = [];
		return house;
	};
	const row = (id) => W.progress.bar.find((b) => b.id === id);
	const names = (house) => house.cocktails.map((c) => c.name);

	it('the parts and the upsell cards deal only on kept marks and never on hers, and the back shows the kept parts under the engine labels and the kept upsells by name', async () => {
		await importCurrent(bigHouse(4, ['b-drink0002']));
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.progress.bar).toHaveLength(4);
			const fc = W.state.fc, was = fc.src;
			fc.src = 'My Bar';
			try {
				const pool = W.fcPool();
				expect(pool).toHaveLength(4);
				const kept = pool.find((d) => d.name === 'House Drink One');
				const hers = pool.find((d) => d.name === 'House Drink Two');
				const fitsOf = (d) => Object.fromEntries(W.FC_MODES.map((m) => [m[0], !!m[3](d)]));
				expect(fitsOf(kept)).toMatchObject({ parts: true, upsell: true, line10: true });
				expect(fitsOf(hers)).toMatchObject({ parts: false, upsell: false, line10: false, name2spec: true });
				expect(W.keptPartsOf(hers)).toBe(null);
				expect(W.keptUpsellsOf(hers)).toBe(null);
				expect(W.keptPartsOf(kept)).toMatchObject({ sauce: 'Lemon and syrup number 1' });
				expect(W.keptUpsellsOf(kept)).toEqual(['House Drink Two']);
				/* the back of each card */
				const parts = W.houseCardBackHTML('parts', kept);
				for (const label of Object.values(OOT.houseLib.COCKTAIL_PARTS)) expect(parts).toContain(W_esc(label));
				expect(parts).toContain('Lemon and syrup number 1');
				expect(W.houseCardBackHTML('upsell', kept)).toContain('House Drink Two');
				/* the deck of a house mode, over the menu alone, through the Menu tab's door */
				const levels = JSON.stringify(W.progress.levels), houseRec = JSON.stringify(W.progress.house);
				expect(W.houseStartCards('parts')).toBe(true);
				expect(W.state.tab).toBe('flashcards');
				expect(fc.mode).toBe('parts');
				expect(fc.deck.map((d) => d.name).sort()).toEqual(['House Drink Four', 'House Drink One', 'House Drink Three']);
				let html = W.renderFlashcards();
				expect(html).toContain('What is in it?');
				expect(html).toContain('data-act="fc-flip"');
				fc.flipped = true;
				html = W.renderFlashcards();
				expect(html).toContain('data-act="fc-grade" data-ok="1"');
				expect(html).toContain('Lemon and syrup number');
				/* graded through the deck, under My Bar, and nothing on a level or on the house */
				const name = fc.deck[fc.idx].name;
				W.recordCard(true);
				expect(W.progress.cards['My Bar \u00b7 ' + name]).toMatchObject({ r: 1, w: 0 });
				expect(JSON.stringify(W.progress.levels)).toBe(levels);
				expect(JSON.stringify(W.progress.house)).toBe(houseRec);
				expect(W.houseStartCards('upsell')).toBe(true);
				expect(fc.deck).toHaveLength(3);
				fc.flipped = true;
				expect(W.renderFlashcards()).toContain('What you kept to offer next');
				/* a mode nobody can run is refused and the setup is shown */
				expect(W.houseStartCards('nowhere')).toBe(false);
				/* every mark hers: no card for the two modes, and the panel says so */
				await importCurrent(bigHouse(4, ['b-drink0001', 'b-drink0002', 'b-drink0003', 'b-drink0004']));
				await W.houseProject();
				expect(W.houseStartCards('parts')).toBe(false);
				expect(fc.stage).toBe('setup');
				expect(W.houseDrillPanelHTML()).toContain('Nothing kept yet');
			} finally { fc.src = was; fc.stage = 'setup'; fc.deck = []; W.state.tab = 'home'; }
		});
	});

	it('qMyBarUpsell deals four options that are all house cocktails, the answer a kept upsell, never another kept upsell among the wrong ones, and nothing on hers', async () => {
		const house = bigHouse(5, ['b-drink0005']);
		await importCurrent(house);
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const all = names(house);
			for (let i = 0; i < 40; i++) {
				const q = W.qMyBarUpsell(row('b-drink0001'));
				expect(q.prompt).toBe('A guest has finished the House Drink One. Which drink on your menu do you offer next?');
				expect(q.options).toHaveLength(4);
				expect(new Set(q.options).size).toBe(4);
				for (const o of q.options) expect(all).toContain(o);
				expect(q.answer).toBe('House Drink Two');
				expect(q.options).toContain(q.answer);
				expect(q.options.indexOf('Old Fashioned')).toBe(-1);
			}
			/* two kept upsells: the other one is never a wrong option */
			await OOT.house.setMark('cocktail', 'b-drink0001', 'upsells', { value: ['b-drink0002', 'b-drink0003'], by: 'person', ts: 2 });
			for (let i = 0; i < 40; i++) {
				const q = W.qMyBarUpsell(row('b-drink0001'));
				expect(['House Drink Two', 'House Drink Three']).toContain(q.answer);
				const other = q.answer === 'House Drink Two' ? 'House Drink Three' : 'House Drink Two';
				expect(q.options.indexOf(other)).toBe(-1);
			}
			/* hers, not kept: no question; and a drink since taken off the house names nothing */
			expect(W.qMyBarUpsell(row('b-drink0005'))).toBe(null);
			await OOT.house.setMark('cocktail', 'b-drink0004', 'upsells', { value: ['b-nothere1'], by: 'person', ts: 2 });
			expect(W.qMyBarUpsell(row('b-drink0004'))).toBe(null);
			/* the Menu round carries it */
			let asked = false;
			for (let i = 0; i < 20 && !asked; i++) asked = W.buildRound('mybar').some((q) => /offer next\?$/.test(q.prompt));
			expect(asked).toBe(true);
		});
	});

	it('a round over a house with three cocktails deals no upsell question, and the Menu tab says why', async () => {
		await importCurrent(bigHouse(3));
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.progress.bar).toHaveLength(3);
			expect(W.qMyBarUpsell(row('b-drink0001'))).toBe(null);
			for (let i = 0; i < 20; i++) for (const q of W.buildRound('mybar')) expect(/offer next/.test(q.prompt)).toBe(false);
			expect(W.houseUpsellWhy()).toBe('The offer next question opens at four cocktails on the house: 3 here.');
			const panel = W.houseDrillPanelHTML();
			expect(panel).toContain('The offer next question opens at four cocktails on the house: 3 here.');
			expect(panel).toContain('data-act="house-fc" data-mode="line10">The ten second line (3)</button>');
			expect(panel).toContain('data-act="house-fc" data-mode="parts">The five parts (3)</button>');
			expect(panel).toContain('data-act="house-fc" data-mode="upsell">What to offer next (3)</button>');
			expect(panel).toContain('counted toward no level');
			/* and the Menu tab draws it under Drill what is on it */
			W.state.menu.view = 'add';
			try {
				const menu = W.renderMenu();
				expect(menu).toContain('Drill what is on it');
				expect(menu).toContain('data-act="house-fc" data-mode="parts"');
			} finally { W.state.menu.view = 'menu'; }
			/* four cocktails, and it opens */
			await importCurrent(bigHouse(4));
			await W.houseProject();
			expect(W.houseUpsellWhy()).toBe('');
			expect(W.qMyBarUpsell(row('b-drink0001'))).not.toBe(null);
			expect(W.houseDrillPanelHTML()).not.toContain('offer next question opens');
		});
	});

	it('qMyBarParts deals the kept modifiers and key flavours of four house drinks, never hers, and the fixture\'s two drinks deal none', async () => {
		await importCurrent(bigHouse(5, ['b-drink0005']));
		await withBarAsync(async () => {
			await W.houseSyncIn();
			for (let i = 0; i < 40; i++) {
				const q = W.qMyBarParts(row('b-drink0001'));
				expect(q.prompt).toBe('Which are the modifiers and key flavours of your House Drink One?');
				expect(q.options).toHaveLength(4);
				expect(new Set(q.options).size).toBe(4);
				expect(q.answer).toBe('Lemon and syrup number 1');
				expect(q.options).toContain(q.answer);
				for (const o of q.options) expect(/^Lemon and syrup number [1-4]$/.test(o)).toBe(true);
				/* her unkept parts on the fifth are no option */
				expect(q.options.indexOf('Lemon and syrup number 5')).toBe(-1);
			}
			expect(W.qMyBarParts(row('b-drink0005'))).toBe(null);
		});
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.qMyBarParts(row('b-collins1'))).toBe(null);
			expect(W.qMyBarUpsell(row('b-collins1'))).toBe(null);
		});
	});

	it('Pair the menu deals the engine\'s firstPickFor and zeroProofFor over the current house into the quiz, only where the house is ready, and writes nothing to a level', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.housePairReady()).toEqual([]);
			expect(W.housePairWhy()).toBe('Pair the menu opens at four dishes with a kept pairing: 1 name a wine and 1 a drink without alcohol here.');
			expect(W.houseQuizRound()).toEqual([]);
			expect(W.buildRound('housepair')).toEqual([]);
			expect(W.houseStartPair()).toBe(false);
			expect(W.state.quiz.stage).toBe('setup');
			expect(W.houseDrillPanelHTML()).toContain('Pair the menu opens at four dishes');
			expect(W.houseDrillPanelHTML()).not.toContain('data-act="house-pair"');
			W.state.quiz.mode = 'housepair';
			let setup = W.renderQuiz();
			expect(setup).not.toContain('data-m="housepair"');
			expect(W.state.quiz.mode).toBe('mixed');
		});
		const house = bigHouse(4);
		await importCurrent(house);
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.housePairReady()).toEqual(['firstPickFor', 'zeroProofFor']);
			const labels = OOT.houseLib.drills.DRILL_LABELS;
			const wines = house.wines.map((w) => w.name), drinks = names(house), dishes = house.dishes.map((d) => d.name);
			for (let i = 0; i < 10; i++) {
				const round = W.houseQuizRound();
				expect(round.length > 0 && round.length <= 10).toBe(true);
				for (const q of round) {
					expect(q.options).toHaveLength(4);
					expect(new Set(q.options).size).toBe(4);
					expect(q.options).toContain(q.answer);
					const dish = dishes.find((d) => q.prompt.indexOf(d + '. ') === 0);
					expect(!!dish).toBe(true);
					expect(q.prompt).toBe(dish + '. ' + labels[q.houseKind]);
					const field = q.houseKind === 'firstPickFor' ? wines : drinks;
					for (const o of q.options) expect(field).toContain(o);
					expect(q.qkey === undefined).toBe(true);
				}
				expect(new Set(round.map((q) => q.houseKind + '|' + q.prompt)).size).toBe(round.length);
			}
			const levels = JSON.stringify(W.progress.levels), houseRec = JSON.stringify(W.progress.house);
			expect(W.houseStartPair()).toBe(true);
			expect(W.state.tab).toBe('quiz');
			expect(W.state.quiz.mode).toBe('housepair');
			expect(W.state.quiz.stage).toBe('run');
			const run = W.renderQuiz();
			expect(run).toContain('data-act="quiz-pick"');
			expect(run).toContain('Which wine is the first pick with this dish?');
			W.state.quiz.stage = 'setup';
			const setup = W.renderQuiz();
			expect(setup).toContain('data-act="quiz-mode" data-m="housepair">Pair the menu</button>');
			expect(W.state.quiz.mode).toBe('housepair');
			expect(W.houseDrillPanelHTML()).toContain('data-act="house-pair">Pair the menu</button>');
			expect(JSON.stringify(W.progress.levels)).toBe(levels);
			expect(JSON.stringify(W.progress.house)).toBe(houseRec);
			W.state.quiz.mode = 'mixed'; W.state.tab = 'home';
		});
		/* no engine lib at all: nothing deals, and the mode falls back */
		const libWas = OOT.houseLib;
		delete OOT.houseLib;
		try {
			expect(W.housePairReady()).toEqual([]);
			expect(W.houseQuizRound()).toEqual([]);
		} finally { OOT.houseLib = libWas; }
		/* the drills join no lock: the shared lock table is untouched by this wing */
		expect(readFileSync(join(JS, 'house-bar.js'), 'utf8')).not.toMatch(/oot-locks|OOT\.locks|OOT\.gate/);
	});

	/* ---- the adversarial verifier's cases (piece 7). Each names a hole the
	   build left; each fails until the hole is closed. ---- */
	it('VERIFIER: a spec-less house drink with kept parts and kept upsells and no kept line gets its parts and upsell cards', async () => {
		const house = bigHouse(4);
		const c = house.cocktails[0];
		c.spec = [];
		delete c.lines;
		await importCurrent(house);
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const fc = W.state.fc, was = fc.src;
			fc.src = 'My Bar';
			try {
				expect(W.keptPartsOf(row('b-drink0001'))).not.toBe(null);
				expect(W.houseCardFits('parts', row('b-drink0001'))).toBe(true);
				/* the deck the Menu tab door opens must hold it */
				expect(W.houseStartCards('parts')).toBe(true);
				expect(fc.deck.map((d) => d.name)).toContain('House Drink One');
			} finally { fc.src = was; fc.stage = 'setup'; fc.deck = []; W.state.tab = 'home'; }
		});
	});

	it('VERIFIER: a drink with kept upsells that deals no offer next question on a house of four cocktails is told why', async () => {
		await importCurrent(bigHouse(4));
		await withBarAsync(async () => {
			await W.houseSyncIn();
			await OOT.house.setMark('cocktail', 'b-drink0001', 'upsells', { value: ['b-drink0002', 'b-drink0003'], by: 'person', ts: 2 });
			await W.houseProject();
			const q = W.qMyBarUpsell(row('b-drink0001'));
			const panel = W.houseDrillPanelHTML();
			expect(q !== null || /offer next question/i.test(panel)).toBe(true);
		});
	});

	it('VERIFIER: every option of qMyBarLine is a kept line of a drink on this house, never a canon note or an unkept note', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const keptLines = [];
			for (const b of W.progress.bar) for (const k of ['s10', 's20', 's45']) { const t = W.keptLineOf(b, k); if (t) keptLines.push(t.trim()); }
			for (let i = 0; i < 20; i++) {
				const q = W.qMyBarLine(row('b-collins1'));
				if (!q) continue;
				for (const o of q.options) expect(keptLines).toContain(o);
			}
			/* the fixture's Collins has no line kept on another drink: no question, and the Menu tab says why */
			expect(W.qMyBarLine(row('b-collins1'))).toBe(null);
			expect(W.houseDrillPanelHTML()).toMatch(/The which line question needs three lines kept on the house.{1,8}s other drinks: The Lantern Collins has fewer\./);
		});
	});

	it('VERIFIER: a Pair the menu round writes no progress.quizzes row, so no house drill rides in a backup or the dashboard trend before piece 10', () => {
		const app = readFileSync(join(JS, 'app.js'), 'utf8');
		const at = app.indexOf("act==='quiz-next'");
		expect(at).toBeGreaterThan(-1);
		const block = app.slice(at, app.indexOf("act==='quiz-replay'", at));
		expect(block).toMatch(/housepair/);
	});

	it('VERIFIER: with the engine here and no current house, the panel, the modes and the pair round draw without throwing', async () => {
		fresh();
		await OOT.house.ready();
		await withBarAsync(async () => {
			expect(!OOT.house.current()).toBe(true);
			expect(() => W.houseDrillPanelHTML()).not.toThrow();
			expect(W.houseQuizRound()).toEqual([]);
			expect(W.qMyBarUpsell({ id: 'b-x', name: 'X', spec: ['1 oz gin'] })).toBe(null);
			W.state.quiz.mode = 'housepair';
			expect(() => W.renderQuiz()).not.toThrow();
			expect(W.state.quiz.mode).toBe('mixed');
		});
	});

	it('a pack whose id is on the device stops on the choice; every import ends on "{name} added. Open it now?"; Open switches, Not now does not; the first house minted adopts the list', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const h = W.state.house;
			expect(await W.houseTakePack('not json')).toBe(null);
			expect(h.err).toMatch(/not a house pack/);
			await W.houseTakePack(packOf(fixtureHouse()));
			expect(h.pending).toMatchObject({ id: 'h-lantern0', name: 'The Lantern Room', intoName: 'The Lantern Room' });
			let html = W.houseLineHTML();
			expect(html).toContain('The Lantern Room is already on this device. Add it as a new house, or merge it into The Lantern Room.');
			expect(html).toContain('data-act="house-import-new"');
			expect(html).toContain('data-act="house-import-merge"');
			expect(OOT.house.list()).toHaveLength(1);
			const r = await W.houseImportChoice('new');
			expect(r.ok).toBe(true);
			expect(h.pending).toBe(null);
			expect(h.added.name).toBe('The Lantern Room');
			expect(h.added.id === 'h-lantern0').toBe(false);
			html = W.houseLineHTML();
			expect(html).toContain('The Lantern Room added. Open it now?');
			expect(html).toContain('data-act="house-open-added">Open</button>');
			expect(html).toContain('data-act="house-not-now">Not now</button>');
			expect(OOT.house.list()).toHaveLength(2);
			expect(OOT.house.currentId()).toBe('h-lantern0');
			const addedId = h.added.id;
			W.houseNotNow();
			expect(h.added).toBe(null);
			expect(OOT.house.currentId()).toBe('h-lantern0');
			h.added = { id: addedId, name: 'The Lantern Room' };
			expect(await W.houseOpenAdded()).toBe(true);
			expect(OOT.house.currentId()).toBe(addedId);
			expect(h.added).toBe(null);
			expect(W.progress.bar.map((b) => b.house)).toEqual([addedId, addedId]);
			/* merge into the twin, said in the engine's words */
			await W.houseTakePack(packOf(fixtureHouse()));
			const m = await W.houseImportChoice('merge');
			expect(m.ok).toBe(true);
			expect(OOT.house.list()).toHaveLength(2);
		});
		/* a device with no house: the drinks already here join the one minted */
		fresh();
		await withBarAsync(async () => {
			W.progress.bar = [{ id: 'b-abcdefgh', name: 'House Sour', spec: ['2 oz rye'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', price: '', ts: 5 }];
			W.barChanged();
			W.state.house.name = 'The Corner Bar';
			const made = await W.houseMint();
			expect(made.name).toBe('The Corner Bar');
			expect(OOT.house.currentId()).toBe(made.id);
			expect(W.progress.bar[0].house).toBe(made.id);
			expect(OOT.house.current().cocktails.map((c) => c.name)).toEqual(['House Sour']);
			expect(W.state.house.live).toBe('The Corner Bar is your house now.');
			expect(W.houseLineHTML()).toContain('The Corner Bar · 1 drink here · next: the house card');
		});
	});

	it('with no house on the device the wake does nothing and the line says so', async () => {
		fresh();
		await withBarAsync(async () => {
			W.progress.bar = [{ id: 'b-abcdefgh', name: 'House Sour', spec: ['2 oz rye'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', price: '', ts: 5 }];
			W.barChanged();
			expect(await W.houseSyncIn()).toBe(null);
			expect(W.progress.bar).toHaveLength(1);
			expect(W.progress.bar[0].house === undefined).toBe(true);
			expect(OOT.house.list()).toEqual([]);
			expect(W.houseLineHTML()).toContain('No house yet.');
			expect(W.houseLineHTML()).not.toContain('data-act="house-export">Export</button>');
		});
	});

	/* VERIFIER CASES (3 October 2026): two holes found on review, each a failing case and no fix. */
	it('a backup merged through dataImport reaches the House too: projection first, House second, not projection only', async () => {
		const api = await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const row = { id: 'b-backup01', name: 'Backup Sour', spec: ['2 oz rye', '1 oz lemon'], method: '', glass: '', garnish: '', note: '', family: 'Sour', spirit: 'Rye', price: '', ts: 5 };
			globalThis.confirmAnswers = [true];
			W.dataImport(JSON.stringify({ app: 'bartenders-ledger', progress: { cards: {}, bar: [row] } }));
			expect(W.progress.bar.some((b) => b.id === 'b-backup01')).toBe(true);
			/* the House must hear of the row the import filed, by the time any asynchronous put would have landed */
			await new Promise((r) => setTimeout(r, 20));
			expect(api.current().cocktails.some((c) => c.id === 'b-backup01')).toBe(true);
			expect(api.buildPack('ledger').pack.house.cocktails.some((c) => c.name === 'Backup Sour')).toBe(true);
		});
	});

	it('two wakes in flight at once (the boot and a storage event) end on the list once and no refusal on Mine', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			W.state.house.err = '';
			const both = await Promise.all([W.houseSyncIn(), W.houseSyncIn()]);
			expect(both[0].ok && both[1].ok).toBe(true);
			expect(W.progress.bar).toHaveLength(2);
			expect(W.state.house.err).toBe('');
		});
	});

	it('a projection asked for while a wake is in flight waits its turn, so the two file the list once and no refusal on Mine', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			W.state.house.err = '';
			const both = await Promise.all([W.houseSyncIn(), W.houseProject()]);
			expect(both[0].ok).toBe(true);
			expect(both[1]).toHaveLength(2);
			expect(W.progress.bar).toHaveLength(2);
			expect(W.state.house.err).toBe('');
			/* and the other way round, the wake queued behind the projection */
			const again = await Promise.all([W.houseProject(), W.houseSyncIn()]);
			expect(again[1].changes).toHaveLength(0);
			expect(W.progress.bar).toHaveLength(2);
			expect(W.state.house.err).toBe('');
		});
	});

	/* ---- read and keep, no key (the formula pane, the two doors, the pack) ----
	   The pane's acts read their boxes through app.js's captureLiveInputs,
	   which is not loaded here (app.js boots), so the function is cut out
	   of the shipped source by its head and run in this realm; a box is a
	   stub the document hands back by id. Every new input id the pane
	   mints must be in that function, by grep, or a render between typing
	   and Save eats the edit. */
	const APP_SRC = readFileSync(join(JS, 'app.js'), 'utf8');
	const captureSrc = (() => {
		const at = APP_SRC.indexOf('\nfunction captureLiveInputs(){');
		expect(at > 0).toBe(true);
		const end = APP_SRC.indexOf('\n}\n', at);
		return APP_SRC.slice(at + 1, end + 2);
	})();
	vm.runInThisContext(captureSrc + ';globalThis.captureLiveInputs = captureLiveInputs;');
	const boxes = {};
	const docWas = globalThis.document;
	const withBoxes = async (fn) => {
		globalThis.document = { getElementById: (id) => (Object.prototype.hasOwnProperty.call(boxes, id) ? boxes[id] : null), querySelector: () => null, querySelectorAll: () => [] };
		try { return await fn(); } finally { globalThis.document = docWas; for (const k of Object.keys(boxes)) delete boxes[k]; }
	};
	const openOn = (id) => { W.state.menu.open = id; W.state.menu.pane = 'formula'; W.state.house.edit = null; W.state.house.note = null; W.state.house.pick = ''; W.state.house.said = ''; };
	const collins = () => OOT.house.current().cocktails.find((c) => c.id === 'b-collins1');
	const bar = (id) => W.progress.bar.find((b) => b.id === id);
	/* the fixture with her marks instead of kept ones on the Collins */
	const hersHouse = () => {
		const house = fixtureHouse();
		const c = house.cocktails[0];
		for (const f of ['parts', 'lines', 'upsells']) c[f] = Object.assign({}, c[f], { by: 'maitre', ts: 1790672400000 });
		return house;
	};

	it('every input id the formula pane mints is in captureLiveInputs, and the two hooks the pane needs are in ui-menu.js and ui-new.js', () => {
		const bar = readFileSync(join(JS, 'house-bar.js'), 'utf8');
		const ids = new Set();
		/* a whole id; the two the loops mint come below, and the counts are output */
		for (const m of bar.matchAll(/id="(hf-[a-z0-9-]+)"/g)) if (!m[1].startsWith('hf-count')) ids.add(m[1]);
		for (const m of bar.matchAll(/id="hf-(part|line)-' \+ k \+ '"/g)) { for (const k of (m[1] === 'part' ? ['main', 'technique', 'sauce', 'sides', 'taste'] : ['s10', 's20', 's45'])) ids.add('hf-' + m[1] + '-' + k); }
		expect([...ids].sort()).toEqual(['hf-line-s10', 'hf-line-s20', 'hf-line-s45', 'hf-note', 'hf-part-main', 'hf-part-sauce', 'hf-part-sides', 'hf-part-taste', 'hf-part-technique', 'hf-upsell']);
		for (const id of ids) expect(captureSrc.includes("'" + id + "'")).toBe(true);
		/* the counts are output, not input, and need no grab */
		expect(bar).toContain("id=\"hf-count-' + k + '\"");
		expect(readFileSync(join(JS, 'ui-menu.js'), 'utf8')).toContain("typeof menuFormulaChip === 'function' ? menuFormulaChip() : []");
		expect(readFileSync(join(JS, 'ui-menu.js'), 'utf8')).toContain("if(pane === 'formula') return typeof menuFormulaHTML === 'function' ? menuFormulaHTML(b) : ''");
		expect(readFileSync(join(JS, 'ui-new.js'), 'utf8')).toContain("typeof housePackPanelHTML === 'function' ? housePackPanelHTML() : ''");
		expect(APP_SRC).toContain("if(typeof houseAfterRender === 'function') houseAfterRender();");
		expect(APP_SRC).toContain("else if(act.indexOf('hf-')===0){ houseFormulaAct(act, el.dataset); return; }");
	});

	it('the formula chip is the fifth on an open drink with the engine, and the pane draws the parts with the engine labels, the lines with their counts, the upsells by name and the note under its fixed eyebrow', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.menuFormulaChip()).toEqual([['formula', 'The formula']]);
			openOn('b-collins1');
			const list = W.menuListHTML();
			expect(list).toContain('data-act="menu-pane" data-p="formula">The formula</button>');
			expect(list.indexOf('data-p="cost"') < list.indexOf('data-p="formula"')).toBe(true);
			const html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			for (const label of Object.values(OOT.houseLib.COCKTAIL_PARTS)) expect(html).toContain(W_esc(label));
			expect(html).toContain('Built over cubed ice and stirred, topped with soda');
			expect(html).toContain('13 of 25 words');
			expect(html).toContain('Verjus and Tonic');
			expect(html).toContain('Your words. Allergens: confirm at lineup.');
			expect(html).toContain('id="hf-note"');
			/* every mark on the fixture Collins is kept: Kept, and no Keep all */
			expect(html).not.toContain('Hers, not yet kept');
			expect(html).not.toContain('Keep all on the drink');
			expect((html.match(/>Kept</g) || []).length).toBe(3);
			/* the picker offers only the house's other cocktails, and not one already listed */
			expect(html).not.toContain('<option value="b-verjus01"');
			expect(html).toContain('Every other drink on the house is already here.');
			/* the drink with nothing on it: every block says so, with Write it, and no Keep */
			const verjus = W.menuPaneHTML(bar('b-verjus01'), 'formula');
			expect((verjus.match(/>Nothing yet</g) || []).length).toBe(3);
			expect(verjus).toContain('>Write it</button>');
			expect(verjus).not.toContain('>Keep</button>');
			expect(verjus).toContain('<option value="b-collins1"');
			/* no allergen reaches the pane beyond the fixed eyebrow */
			expect((html.match(/llergen/g) || []).length).toBe(1);
		});
		/* and nothing at all with no house open */
		fresh();
		expect(W.menuFormulaHTML({ id: 'b-x', name: 'X' })).toContain('No house holds this drink yet.');
	});

	it('Keep on a part and a line writes her value back through the engine with by person, and Keep all takes the rest', async () => {
		await importCurrent(hersHouse());
		await withBarAsync(async () => {
			await W.houseSyncIn();
			openOn('b-collins1');
			expect(collins().parts.by).toBe('maitre');
			let html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			expect((html.match(/Hers, not yet kept/g) || []).length).toBe(3);
			expect(html).toContain('>Keep all on the drink</button>');
			expect(html).toContain('data-act="hf-keep" data-id="b-collins1" data-f="parts"');
			expect(await W.houseFormulaAct('hf-keep', { id: 'b-collins1', f: 'parts' })).toBe(true);
			expect(collins().parts.by).toBe('person');
			expect(collins().parts.value.main).toBe('Gin');
			expect(collins().parts.ts > 1790672400000).toBe(true);
			expect(await W.houseFormulaAct('hf-keep', { id: 'b-collins1', f: 'lines' })).toBe(true);
			expect(collins().lines.by).toBe('person');
			expect(collins().lines.value.s10).toMatch(/^A long gin drink/);
			expect(W.state.house.said).toBe('Kept. It is yours now and goes with the drink.');
			/* a kept mark offers no Keep */
			html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			expect(html).not.toContain('data-act="hf-keep" data-id="b-collins1" data-f="parts"');
			expect(html).toContain('data-act="hf-keep" data-id="b-collins1" data-f="upsells"');
			/* Keep all: the upsells, the one left */
			expect(await W.houseFormulaAct('hf-keep-all', { id: 'b-collins1' })).toBe(true);
			expect(collins().upsells.by).toBe('person');
			expect(W.state.house.said).toBe('Kept, all 1 on the drink.');
			expect(W.menuPaneHTML(bar('b-collins1'), 'formula')).not.toContain('Hers, not yet kept');
			/* the kept line is a card's now */
			expect(W.hasKeptLines(bar('b-collins1'))).toBe(true);
			/* and the row carries none of it: parts, lines and upsells are House-only */
			expect(bar('b-collins1').parts === undefined && bar('b-collins1').lines === undefined && bar('b-collins1').upsells === undefined).toBe(true);
		});
	});

	it('Edit then Save writes the typed words from the boxes, an edited line over the cap shows the over-cap word and still saves, and Discard removes the mark', async () => {
		await importCurrent(hersHouse());
		await withBarAsync(async () => {
			await W.houseSyncIn();
			openOn('b-collins1');
			await W.houseFormulaAct('hf-edit', { id: 'b-collins1', f: 'lines' });
			expect(W.state.house.edit).toMatchObject({ id: 'b-collins1', field: 'lines' });
			let html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			expect(html).toContain('id="hf-line-s10"');
			expect(html).toContain('id="hf-count-s10"');
			expect(html).toContain('>Save</button>');
			expect(html).toContain('>Cancel</button>');
			/* one editor at a time: Edit on the parts closes the lines */
			await W.houseFormulaAct('hf-edit', { id: 'b-collins1', f: 'parts' });
			expect(W.state.house.edit.field).toBe('parts');
			expect(W.menuPaneHTML(bar('b-collins1'), 'formula')).not.toContain('id="hf-line-s10"');
			await W.houseFormulaAct('hf-edit', { id: 'b-collins1', f: 'lines' });
			const long = Array.from({ length: 30 }, (_, i) => 'word' + i).join(' ');
			await withBoxes(async () => {
				boxes['hf-line-s10'] = { value: long };
				boxes['hf-line-s20'] = { value: 'My twenty.' };
				boxes['hf-line-s45'] = { value: '' };
				expect(await W.houseFormulaAct('hf-save', { id: 'b-collins1', f: 'lines' })).toBe(true);
			});
			expect(W.state.house.edit).toBe(null);
			const m = collins().lines;
			expect(m.by).toBe('person');
			expect(m.value.s10).toBe(long);
			expect(m.value.s20).toBe('My twenty.');
			expect(m.value.s45).toBe('');
			html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			expect(html).toContain('30 of 25 words. Over its cap');
			expect(html).toContain('2 of 50 words');
			expect(W.state.house.said).toBe('Saved, in your words.');
			/* the engine's own count says the same through the problems hook */
			expect(W.houseProblems('cocktail', 'b-collins1')).toEqual([{ field: 'lines', said: 'By the engine, the ten seconds line runs 30 words against its cap of 25.' }]);
			/* the parts, typed */
			await W.houseFormulaAct('hf-edit', { id: 'b-collins1', f: 'parts' });
			await withBoxes(async () => {
				for (const k of ['main', 'technique', 'sauce', 'sides', 'taste']) boxes['hf-part-' + k] = { value: 'my ' + k };
				expect(await W.houseFormulaAct('hf-save', { id: 'b-collins1', f: 'parts' })).toBe(true);
			});
			expect(collins().parts).toMatchObject({ by: 'person', value: { main: 'my main', taste: 'my taste' } });
			/* every box empty is no save */
			await W.houseFormulaAct('hf-edit', { id: 'b-collins1', f: 'parts' });
			await withBoxes(async () => {
				for (const k of ['main', 'technique', 'sauce', 'sides', 'taste']) boxes['hf-part-' + k] = { value: '  ' };
				expect(await W.houseFormulaAct('hf-save', { id: 'b-collins1', f: 'parts' })).toBe(false);
			});
			expect(W.state.house.said).toMatch(/^Nothing to save/);
			expect(collins().parts.value.main).toBe('my main');
			/* Discard: the mark is gone from the engine and the pane says Nothing yet */
			expect(await W.houseFormulaAct('hf-discard', { id: 'b-collins1', f: 'lines' })).toBe(true);
			expect(collins().lines === undefined).toBe(true);
			expect(W.hasKeptLines(bar('b-collins1'))).toBe(false);
			html = W.menuPaneHTML(bar('b-collins1'), 'formula');
			expect(html).toContain('what you would say about it in ten, twenty and forty five seconds');
			expect(W.houseProblems('cocktail', 'b-collins1')).toEqual([]);
			/* a dash in a kept line is said by the engine too */
			await OOT.house.setMark('cocktail', 'b-collins1', 'lines', { value: { s10: 'Gin ' + String.fromCharCode(8212) + ' long', s20: '', s45: '' }, by: 'maitre', ts: 3 });
			expect(W.houseProblems('cocktail', 'b-collins1')).toEqual([{ field: 'lines', said: 'By the engine, the ten seconds line carries a dash.' }]);
			expect(W.menuPaneHTML(bar('b-collins1'), 'formula')).toContain('Carries a dash');
		});
	});

	it('the service note saves through setItemField and never through the row, and the upsell picker adds and removes only house cocktails', async () => {
		const api = await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			openOn('b-verjus01');
			const put = mock.method(api, 'put');
			const field = mock.method(api, 'setItemField');
			const rowBefore = JSON.stringify(bar('b-verjus01'));
			await withBoxes(async () => {
				boxes['hf-note'] = { value: '  Tell the kitchen when it is for the chef.  ', dataset: { id: 'b-verjus01' } };
				expect(await W.houseFormulaAct('hf-note-save', { id: 'b-verjus01' })).toBe(true);
			});
			expect(field.mock.callCount()).toBe(1);
			expect(field.mock.calls[0].arguments).toEqual(['cocktail', 'b-verjus01', { serviceNote: 'Tell the kitchen when it is for the chef.' }]);
			expect(put.mock.callCount()).toBe(0);
			expect(api.current().cocktails.find((c) => c.id === 'b-verjus01').serviceNote).toBe('Tell the kitchen when it is for the chef.');
			expect(JSON.stringify(bar('b-verjus01'))).toBe(rowBefore);
			expect(bar('b-verjus01').serviceNote === undefined).toBe(true);
			expect(W.state.house.said).toBe('Saved. Your words, on the house.');
			const html = W.menuPaneHTML(bar('b-verjus01'), 'formula');
			expect(html).toContain('>Tell the kitchen when it is for the chef.</textarea>');
			/* the next wake: the engine re-stamped the item, so the row may be
			   filed again under the new stamp, and still carries no note and
			   the same twelve keys */
			const again = await W.houseSyncIn();
			expect(again.changes.every((c) => c.what === 'row-updated' && c.id === 'b-verjus01')).toBe(true);
			/* the twelve, and the draft flag a spec-less row carries */
			expect(Object.keys(bar('b-verjus01')).sort()).toEqual(TWELVE.concat(['draft']).sort());
			expect(bar('b-verjus01').serviceNote === undefined).toBe(true);
			expect((await W.houseSyncIn()).changes).toHaveLength(0);
			put.mock.restore(); field.mock.restore();
			/* the picker: a house cocktail is added as a person's mark; anything else is refused */
			W.state.house.pick = 'b-nothere1';
			expect(await W.houseFormulaAct('hf-upsell-add', { id: 'b-verjus01' })).toBe(false);
			expect(W.state.house.said).toBe('Choose a drink on this house first.');
			W.state.house.pick = 'b-verjus01';
			expect(await W.houseFormulaAct('hf-upsell-add', { id: 'b-verjus01' })).toBe(false);
			W.state.house.pick = 'b-collins1';
			expect(await W.houseFormulaAct('hf-upsell-add', { id: 'b-verjus01' })).toBe(true);
			expect(api.current().cocktails.find((c) => c.id === 'b-verjus01').upsells).toMatchObject({ by: 'person', value: ['b-collins1'] });
			let pane = W.menuPaneHTML(bar('b-verjus01'), 'formula');
			expect(pane).toContain('The Lantern Collins');
			expect(pane).toContain('data-act="hf-upsell-drop" data-id="b-verjus01" data-up="b-collins1"');
			expect(pane).not.toContain('<option value="b-collins1"');
			/* the picker read from the box, a canon drink's name is never an option */
			expect(pane).not.toContain('Old Fashioned');
			expect(await W.houseFormulaAct('hf-upsell-drop', { id: 'b-verjus01', up: 'b-collins1' })).toBe(true);
			expect(api.current().cocktails.find((c) => c.id === 'b-verjus01').upsells === undefined).toBe(true);
			pane = W.menuPaneHTML(bar('b-verjus01'), 'formula');
			expect(pane).toContain('<option value="b-collins1"');
		});
	});

	it('the two doors draw the shared screens with the fixture house, a Keep through the review hook lands on the engine, and the panels redraw from the house', async () => {
		const UI_SRC = readFileSync(join(sharedDir, 'oot-house-ui.js'), 'utf8');
		await importCurrent(hersHouse());
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const h = W.state.house;
			/* the chips, only with the shared screens here */
			delete OOT.houseUI;
			let line = W.houseLineHTML();
			expect(line).not.toContain('>The house</button>');
			expect(line).not.toContain('>Hers, to look over</button>');
			const doc = stubDocument();
			globalThis.window.document = doc;
			vm.runInThisContext(UI_SRC);
			expect(typeof OOT.houseUI.review).toBe('function');
			line = W.houseLineHTML();
			expect(line).toContain('data-act="house-panel" data-p="read" aria-expanded="false">The house</button>');
			expect(line).toContain('data-act="house-panel" data-p="review" aria-expanded="false">Hers, to look over</button>');
			expect(line).not.toContain('house-ui-root');
			/* the read door */
			h.panel = 'read';
			line = W.houseLineHTML();
			expect(line).toContain('data-p="read" aria-expanded="true"');
			expect(line).toContain('<div id="house-ui-root"></div>');
			const root = doc.createElement('div');
			root.setAttribute('id', 'house-ui-root');
			let renders = 0;
			const renderWas = globalThis.render;
			globalThis.render = () => { renders++; };
			await withBoxes(async () => {
				boxes['house-ui-root'] = root;
				W.houseAfterRender();
				expect(root.getAttribute('data-oot-house-ui')).toBe('read');
				expect(root.textContent).toContain('The Lantern Room');
				expect(root.textContent).toContain('The house');
				/* the review door, on its steps */
				h.panel = 'review';
				line = W.houseLineHTML();
				for (const s of ['formula', 'pairings', 'wines', 'lexicon', 'scenarios']) expect(line).toContain('data-act="house-step" data-s="' + s + '"');
				expect(line).toContain('data-s="formula" aria-pressed="true"');
				W.houseStep('wines'); expect(h.step).toBe('wines');
				W.houseStep('nowhere'); expect(h.step).toBe('wines');
				W.houseStep('formula');
				W.houseAfterRender();
				expect(root.getAttribute('data-oot-house-ui')).toBe('review');
				expect(root.textContent).toContain('Hers, not yet kept');
				expect(root.textContent).toContain('The Lantern Collins');
				/* the problems hook's sentence is drawn on a line over its cap */
				await OOT.house.setMark('cocktail', 'b-collins1', 'lines', { value: { s10: Array.from({ length: 30 }, (_, i) => 'w' + i).join(' '), s20: '', s45: '' }, by: 'maitre', ts: 5 });
				W.houseAfterRender();
				expect(root.textContent).toContain('By the engine, the ten seconds line runs 30 words against its cap of 25.');
				/* Keep through the hook: the parts, by person on the engine */
				const keep = root.querySelectorAll('button[data-h="keep"][data-id="b-collins1"][data-field="parts"]');
				expect(keep).toHaveLength(1);
				expect(collins().parts.by).toBe('maitre');
				const before = renders;
				keep[0].click();
				await new Promise((r) => setTimeout(r, 20));
				expect(collins().parts.by).toBe('person');
				expect(collins().parts.value.main).toBe('Gin');
				/* the engine's change asked for a render, which draws the panel again from the house */
				expect(renders > before).toBe(true);
				W.houseAfterRender();
				expect(root.querySelectorAll('button[data-h="keep"][data-id="b-collins1"][data-field="parts"]')).toHaveLength(0);
				/* Discard through the hook */
				const discard = root.querySelectorAll('button[data-h="discard"][data-id="b-collins1"][data-field="upsells"]');
				expect(discard).toHaveLength(1);
				discard[0].click();
				await new Promise((r) => setTimeout(r, 20));
				expect(collins().upsells === undefined).toBe(true);
				/* a change the pane shows asks for a render too; one with nothing showing does not */
				h.panel = ''; W.state.menu.open = null;
				const quiet = renders;
				W.houseRedrawIfShown();
				expect(renders).toBe(quiet);
				W.state.menu.open = 'b-collins1'; W.state.menu.pane = 'formula';
				W.houseRedrawIfShown();
				expect(renders).toBe(quiet + 1);
			});
			globalThis.render = renderWas;
			delete globalThis.window.document;
		});
	});

	it('My Data offers the house as a pack, the same file the Mine chip makes, and nothing with no house', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const html = W.housePackPanelHTML();
			expect(html).toContain('data-act="house-export">Export the house as a pack</button>');
			expect(html).toContain('The Lantern Room, with its 2 drinks');
			expect(W.houseLineHTML()).toContain('data-act="house-export">Export</button>');
			expect(OOT.house.buildPack('ledger').filename).toMatch(/^house-the-lantern-room-.*\.oothouse\.json$/);
		});
		fresh();
		expect(W.housePackPanelHTML()).toBe('');
	});

	/* ---- the verifier's cases: holes in read and keep, each a failing case
	   until the piece closes it. Nothing here is planted for keeps: each case
	   names the hole in its title and the fix belongs in js/house-bar.js (or
	   the engine) rather than in the assertion. */

	it('VERIFIER: a Keep pressed while a wake is in flight lands on the engine and the wake\'s own change lands too, whichever starts first', async () => {
		for (const keepFirst of [true, false]) {
			await importCurrent(hersHouse());
			await withBarAsync(async () => {
				await W.houseSyncIn();
				openOn('b-collins1');
				/* the list carries a newer price, so the wake has something to write */
				const row = bar('b-collins1');
				row.price = '99'; row.ts = Date.now() + 5000;
				const keep = () => W.houseFormulaAct('hf-keep', { id: 'b-collins1', f: 'parts' });
				const wake = () => W.houseSyncIn();
				const [a, b] = keepFirst ? [keep(), wake()] : [wake(), keep()];
				const [kept, out] = keepFirst ? await Promise.all([a, b]) : (await Promise.all([a, b])).reverse();
				expect(kept).toBe(true);
				expect(out.ok).toBe(true);
				/* the Keep said Kept, so the house holds it after the wake too */
				expect(collins().parts.by).toBe('person');
				/* and the wake's own write was not thrown away by the Keep */
				expect(collins().price).toBe('99');
			});
		}
	});

	it('VERIFIER: an editor open in the review door, with words typed in it, survives the render the wing does on every press and every wake', async () => {
		const UI_SRC = readFileSync(join(sharedDir, 'oot-house-ui.js'), 'utf8');
		await importCurrent(hersHouse());
		await withBarAsync(async () => {
			await W.houseSyncIn();
			const doc = stubDocument();
			globalThis.window.document = doc;
			delete OOT.houseUI;
			vm.runInThisContext(UI_SRC);
			const h = W.state.house;
			h.panel = 'review'; h.step = 'formula';
			const renderWas = globalThis.render;
			globalThis.render = () => {};
			try {
				/* the first paint: the root under the line, Edit pressed on her lines */
				const root1 = doc.createElement('div'); root1.setAttribute('id', 'house-ui-root');
				await withBoxes(async () => {
					boxes['house-ui-root'] = root1;
					W.houseAfterRender();
					const edit = root1.querySelectorAll('button[data-h="edit"][data-id="b-collins1"][data-field="lines"]');
					expect(edit).toHaveLength(1);
					edit[0].click();
					const ed = root1.querySelector('[data-editor="lines"]');
					expect(ed).not.toBe(null);
					const box = ed.querySelector('[data-e]');
					expect(box).not.toBe(null);
					box.value = 'words a person is still typing';
				});
				/* render(): #view is innerHTML, so the root is a NEW element, and
				   houseAfterRender draws into it; the editor and the typed words
				   must still be there, as every box in captureLiveInputs is */
				const root2 = doc.createElement('div'); root2.setAttribute('id', 'house-ui-root');
				await withBoxes(async () => {
					boxes['house-ui-root'] = root2;
					W.houseAfterRender();
					const ed = root2.querySelector('[data-editor="lines"]');
					expect(ed).not.toBe(null);
					expect(ed.querySelector('[data-e]').value).toBe('words a person is still typing');
				});
			} finally {
				globalThis.render = renderWas;
				delete globalThis.window.document;
			}
		});
	});

	it('VERIFIER: a merge of a newer pack through Import a pack keeps the service note a person wrote on this device', async () => {
		const api = await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(await api.setItemField('cocktail', 'b-verjus01', { serviceNote: 'My own words, on this device.' })).toBe(true);
			/* the same house from another device, its Verjus stamped later and carrying no note */
			const other = fixtureHouse();
			other.cocktails.find((c) => c.id === 'b-verjus01').ts = Date.now() + 20000;
			await W.houseTakePack(packOf(other));
			expect(W.state.house.pending && W.state.house.pending.id).toBe('h-lantern0');
			const r = await W.houseImportChoice('merge');
			expect(r.ok).toBe(true);
			expect(api.current().cocktails.find((c) => c.id === 'b-verjus01').serviceNote).toBe('My own words, on this device.');
		});
	});

	it('VERIFIER: no new screen carries an allergen word beyond the fixed eyebrow', async () => {
		await importCurrent();
		await withBarAsync(async () => {
			await W.houseSyncIn();
			expect(W.housePackPanelHTML()).not.toMatch(/llergen/);
			const bar = readFileSync(join(JS, 'house-bar.js'), 'utf8');
			const from = bar.indexOf('READ AND KEEP, NO KEY');
			expect(from > 0).toBe(true);
			const strings = bar.slice(from).split('\n').filter((l) => /llergen/.test(l) && !/^\s*(\/\*|\*|\/\/)/.test(l) && !/^\s+an allergen: the note/.test(l));
			expect(strings).toEqual(["var HOUSE_NOTE_EYEBROW = 'Your words. Allergens: confirm at lineup.';",
				"var HOUSE_DRILL_KITCHEN = 'Allergens are the kitchen\\'s: confirm at lineup.';"]);
		});
	});
	/* ---- the shipped pack at boot, and Say it back and Guest at the table ----
	   The pack is the one this site ships, read from the shared folder; the
	   fetch is a stub handing back its text, and the device is a Map whose
	   every write is counted, so "writes nothing" is a count of nought. */
	const PACK_PATH = join(sharedDir, 'packs', 'brennans-new-orleans.v1.oothouse.json');
	const packIt = existsSync(PACK_PATH) ? it : it.skip;
	const PACK_TEXT = existsSync(PACK_PATH) ? readFileSync(PACK_PATH, 'utf8') : '';
	const counted = () => {
		const backing = new Map();
		const box = { writes: 0 };
		const set = backing.set.bind(backing);
		backing.set = (k, v) => { box.writes++; return set(k, v); };
		OOT.house = lib.createHouseApi(lib.mapStorage(backing), { from: 'ledger' });
		return box;
	};
	const withFetch = async (answer, fn) => {
		const was = globalThis.fetch;
		const calls = [];
		globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return typeof answer === 'function' ? answer(url) : { ok: true, status: 200, text: async () => answer }; };
		try { return await fn(calls); } finally { globalThis.fetch = was; }
	};
	/* an earlier edition of the same pack: built two days before, every
	   edition stamp moved with it, and its last drink not yet on it */
	const olderEdition = () => {
		const stamp = Date.parse(JSON.parse(PACK_TEXT).house.pack.builtAt);
		const older = stamp - 2 * 86400000;
		const p = JSON.parse(PACK_TEXT.split(String(stamp)).join(String(older)));
		p.house.pack.builtAt = new Date(older).toISOString();
		const gone = p.house.cocktails.pop();
		/* nothing else may point at the drink this edition lacks */
		const strip = (v) => {
			if (Array.isArray(v)) return v.filter((x) => x !== gone.id).map(strip);
			if (v && typeof v === 'object') { for (const k of Object.keys(v)) { if (v[k] === gone.id) v[k] = ''; else v[k] = strip(v[k]); } }
			return v;
		};
		for (const k of Object.keys(p.house)) if (k !== 'cocktails') p.house[k] = strip(p.house[k]);
		p.house.cocktails = strip(p.house.cocktails);
		return { text: JSON.stringify(p), gone };
	};

	packIt('the auto-load adds the shipped pack on an empty device, takes its drinks through the doors, says so once, and a second boot writes nothing', async () => {
		const box = counted();
		const pack = JSON.parse(PACK_TEXT).house;
		await withBarAsync(async () => {
			await withFetch(PACK_TEXT, async (calls) => {
				/* the boot's order: the wake (no house yet, nothing), then the pack */
				expect(await W.houseSyncIn()).toBe(null);
				expect(box.writes).toBe(0);
				const r = await W.houseAutoLoad();
				expect(r.action).toBe('added');
				expect(r.current).toBe(true);
				expect(calls).toHaveLength(1);
				expect(calls[0].url).toBe('../shared/packs/brennans-new-orleans.v1.oothouse.json');
				expect(calls[0].opts).toEqual({ cache: 'no-cache' });
				const cur = OOT.house.current();
				expect(cur.name).toBe(pack.name);
				expect(W.progress.bar).toHaveLength(pack.cocktails.length);
				expect(W.progress.bar.every((b) => b.house === cur.id)).toBe(true);
				expect(W.progress.bar.map((b) => b.id).sort()).toEqual(pack.cocktails.map((c) => c.id).sort());
				expect(W.state.house.err).toBe('');
				expect(W.state.house.live).toBe(pack.name + ' is loaded: ' + pack.dishes.length + ' dishes, ' + pack.cocktails.length + ' drinks, ' + pack.wines.length + ' wines.');
				/* the second boot: the wake and the pack again, and nothing written anywhere */
				const bar = JSON.stringify(W.progress.bar), cards = JSON.stringify(W.progress.cards);
				const writes = box.writes;
				W.state.house.live = '';
				await W.houseSyncIn();
				const again = await W.houseAutoLoad();
				expect(again.action).toBe('current');
				expect(box.writes).toBe(writes);
				expect(JSON.stringify(W.progress.bar)).toBe(bar);
				expect(JSON.stringify(W.progress.cards)).toBe(cards);
				expect(W.state.house.live).toBe('');
			});
			/* offline, or a fetch that fails: nothing asked of the engine, nothing written */
			const writes = box.writes;
			navigator.onLine = false;
			try {
				await withFetch(PACK_TEXT, async (calls) => { expect(await W.houseAutoLoad()).toBe(null); expect(calls).toHaveLength(0); });
			} finally { delete navigator.onLine; }
			await withFetch(() => { throw new Error('offline'); }, async () => { expect(await W.houseAutoLoad()).toBe(null); });
			await withFetch(() => ({ ok: false, status: 404, text: async () => 'gone' }), async () => { expect(await W.houseAutoLoad()).toBe(null); });
			await withFetch('not a pack', async () => { expect((await W.houseAutoLoad()).action).toBe('refused'); });
			expect(box.writes).toBe(writes);
		});
	});

	packIt('a newer edition refreshes the house through the sync, adds what it brings, and keeps a drink the person edited and a line the person kept', async () => {
		counted();
		const { text: oldText, gone } = olderEdition();
		await withBarAsync(async () => {
			await withFetch(oldText, async () => { expect((await W.houseAutoLoad()).action).toBe('added'); });
			expect(W.progress.bar.some((b) => b.id === gone.id)).toBe(false);
			/* the person edits a drink on the list (projection first, House second) */
			const first = W.progress.bar[0];
			const form = W.houseRowForm(first);
			form.note = 'My own words on this drink.';
			const saved = W.saveBarRecord(form, first.id);
			expect(typeof saved === 'string').toBe(false);
			await lastPut();
			expect(OOT.house.current().cocktails.find((c) => c.id === first.id).note).toBe('My own words on this drink.');
			/* and keeps a line of their own on another */
			const second = W.progress.bar[1];
			const mine = { value: { s10: 'My ten second line.', s20: 'My twenty second line, in my words.', s45: 'My forty five second line.' }, by: 'person', ts: Date.now() + 1000 };
			expect(await OOT.house.setMark('cocktail', second.id, 'lines', mine)).toBe(true);
			W.state.house.live = '';
			await withFetch(PACK_TEXT, async () => {
				const r = await W.houseAutoLoad();
				expect(r.action).toBe('refreshed');
				expect(r.counts.added).toBe(1);
			});
			const cur = OOT.house.current();
			expect(W.state.house.live).toBe(cur.name + ' updated: 1 new.');
			/* the drink the edition brought reached the list through the doors */
			expect(W.progress.bar.some((b) => b.id === gone.id && b.house === cur.id)).toBe(true);
			expect(W.progress.bar).toHaveLength(JSON.parse(PACK_TEXT).house.cocktails.length);
			/* the person's edit stands, on the house and on the list */
			expect(cur.cocktails.find((c) => c.id === first.id).note).toBe('My own words on this drink.');
			expect(W.progress.bar.find((b) => b.id === first.id).note).toBe('My own words on this drink.');
			expect(cur.cocktails.find((c) => c.id === second.id).lines.value.s20).toBe('My twenty second line, in my words.');
			expect(W.state.house.err).toBe('');
		});
	});

	packIt('Say it back over the house drinks: reached from the Menu tab and Mine, graded through houseLib.drills.gradeSaid, and written only on Record it', async () => {
		counted();
		await withBarAsync(async () => {
			await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
			const tab = W.state.tab;
			const before = { levels: JSON.stringify(W.progress.levels), qa: JSON.stringify(W.progress.qa), cards: JSON.stringify(W.progress.cards) };
			const recWas = W.progress.house;
			W.progress.house = { say: [], role: [] };
			try {
				await withBoxes(async () => {
					/* the two doors: the Menu tab's drill panel and Mine's house line */
					expect(W.houseDrillPanelHTML()).toContain('data-act="hd-open" data-mode="say"');
					expect(W.houseDrillPanelHTML()).toContain('data-act="hd-open" data-mode="role"');
					expect(W.houseLineHTML()).toContain('data-act="hd-open" data-mode="say"');
					const cur = OOT.house.current();
					const items = W.houseSayItems();
					expect(items.length).toBe(cur.cocktails.filter((c) => c.lines && c.lines.by === 'person').length);
					expect(items.every((i) => i.kind === 'cocktail')).toBe(true);
					W.state.tab = 'menu';
					W.houseDrillAct('hd-open', { mode: 'say' });
					expect(W.state.tab).toBe('mine');
					expect(W.state.house.drill).toBe('say');
					expect(items.some((i) => i.id === W.state.house.say.id)).toBe(true);
					/* the screen on Mine, under the line, every control 44px */
					const html = W.houseLineHTML();
					expect(html).toContain('id="house-drill-head"');
					expect(html).toContain('id="hs-item"');
					expect(html).toContain('id="hs-said"');
					expect(html).not.toContain('Speak');
					for (const m of html.slice(html.indexOf('house-drill')).matchAll(/<(button|select|textarea)\b[^>]*>/g)) expect(m[0]).toMatch(/min-height:(44|88)px/);
					/* a chosen drink, its kept line typed back */
					const drink = cur.cocktails.find((c) => c.id === items[0].id);
					W.houseSayPick(drink.id);
					W.houseDrillAct('hd-say-length', { l: 's20' });
					const said = drink.lines.value.s20;
					boxes['hs-said'] = { value: said };
					W.houseDrillAct('hd-say-check', {});
					const g = W.state.house.say.grade;
					expect(g).toEqual(lib.drills.gradeSaid(cur, drink.id, 's20', said));
					expect(g.verdict).toBe('met');
					expect(W.progress.house.say).toHaveLength(0);
					const shown = W.houseDrillHTML();
					expect(shown).toContain('>Met<');
					for (const p of g.parts) expect(shown).toContain(W_esc(p.label));
					expect(shown).toContain('Your kept line');
					expect(shown).toContain(W_esc(said));
					expect(shown).toContain('data-act="hd-say-record"');
					/* Record it: the one write, in its shape, once */
					W.houseDrillAct('hd-say-record', {});
					W.houseDrillAct('hd-say-record', {});
					expect(W.progress.house.say).toHaveLength(1);
					const e = W.progress.house.say[0];
					expect(Object.keys(e).sort()).toEqual(['coverage', 'id', 'kind', 'length', 'ts', 'verdict']);
					expect(e).toMatchObject({ id: drink.id, kind: 'cocktail', length: 's20', verdict: 'met', coverage: g.coverage });
					expect(W.houseDrillHTML()).toContain('Recorded.');
					/* Try again empties the box and the grade; a line said badly is missed, and nothing is written without Record it */
					W.houseDrillAct('hd-say-again', {});
					expect(boxes['hs-said'].value).toBe('');
					expect(W.state.house.say.grade).toBe(null);
					boxes['hs-said'].value = 'Something else entirely about a lemon.';
					W.houseDrillAct('hd-say-check', {});
					expect(W.state.house.say.grade.verdict).toBe('missed');
					expect(W.houseDrillHTML()).toContain('>Missed<');
					expect(W.progress.house.say).toHaveLength(1);
					/* Next deals another drink with a kept line */
					W.houseDrillAct('hd-say-next', {});
					expect(items.some((i) => i.id === W.state.house.say.id)).toBe(true);
					/* the speech button only where the browser offers one, with its sentence */
					window.webkitSpeechRecognition = function () {};
					try {
						const sp = W.houseDrillHTML();
						expect(sp).toContain('data-act="hd-speak"');
						expect(sp).toContain('Your voice goes to your browser');
						expect(sp).toContain('not to Anthropic.');
					} finally { delete window.webkitSpeechRecognition; }
				});
				expect(JSON.stringify(W.progress.levels)).toBe(before.levels);
				expect(JSON.stringify(W.progress.qa)).toBe(before.qa);
				expect(JSON.stringify(W.progress.cards)).toBe(before.cards);
			} finally { W.progress.house = recWas; W.state.tab = tab; W.state.house.drill = ''; }
		});
	});

	packIt('Guest at the table deals the kept scenarios and the mix ups, grades through houseLib.drills.gradeScenario, and writes only on Record it', async () => {
		counted();
		await withBarAsync(async () => {
			await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
			const tab = W.state.tab;
			const recWas = W.progress.house;
			W.progress.house = { say: [], role: [] };
			try {
				await withBoxes(async () => {
					const cur = OOT.house.current();
					const deck = W.houseRoleDeck();
					const scen = deck.filter((e) => e.kind === 'scenario');
					/* the deck is the kept scenarios about a drink, less any on
					   the kitchen's word or about a person, then the kept mix ups
					   about a drink */
					const drinks = new Set(cur.cocktails.map((c) => c.id));
					const kitchen = /allerg|shellfish|gluten|tree nut|\bnuts?\b|vegan|vegetarian|dairy|lactose|coeliac|celiac|peanut|pregnan/i;
					const person = /\bfound(?:ed|er)\b|\bOwen Brennan\b|\bElla Brennan\b/;
					const textOf = (s) => [s.title, s.guest, s.you && s.you.value, s.principle && s.principle.value].join(' ');
					const roleIds = lib.drills.roleable(cur).map((s) => s.id);
					for (const e of scen) expect(roleIds.includes(e.id)).toBe(true);
					const wanted = roleIds.map((id) => cur.scenarios.find((s) => s.id === id))
						.filter((s) => (s.itemIds || []).some((i) => drinks.has(i)) && !kitchen.test(textOf(s)) && !person.test(textOf(s)));
					expect(wanted.length > 5).toBe(true);
					expect(scen.map((e) => e.id).sort()).toEqual(wanted.map((s) => s.id).sort());
					expect(deck.filter((e) => e.kind === 'mixup')).toHaveLength(cur.mixUps.filter((m) => m.difference && m.difference.by === 'person' && (drinks.has(m.aId) || drinks.has(m.bId))).length);
					W.houseDrillAct('hd-open', { mode: 'role' });
					expect(W.state.tab).toBe('mine');
					expect(W.state.house.drill).toBe('role');
					/* a scenario, answered with its kept words */
					const sc = cur.scenarios.find((s) => s.id === scen[0].id);
					W.state.house.role = { kind: 'scenario', id: sc.id, text: '', grade: null, recorded: false };
					expect(W.houseDrillHTML()).toContain(W_esc(sc.guest));
					boxes['hr-said'] = { value: sc.you.value };
					W.houseDrillAct('hd-role-check', {});
					const g = W.state.house.role.grade;
					expect(g).toEqual(lib.drills.gradeScenario(cur, sc.id, sc.you.value));
					expect(g.verdict).toBe('met');
					expect(W.progress.house.role).toHaveLength(0);
					const shown = W.houseDrillHTML();
					expect(shown).toContain('>Met<');
					expect(shown).toContain('The kept answer');
					if (g.principle) expect(shown).toContain(W_esc(g.principle));
					W.houseDrillAct('hd-role-record', {});
					expect(W.progress.house.role).toHaveLength(1);
					expect(Object.keys(W.progress.house.role[0]).sort()).toEqual(['coverage', 'id', 'kind', 'ts', 'verdict']);
					expect(W.progress.house.role[0]).toMatchObject({ id: sc.id, kind: 'scenario', verdict: 'met' });
					/* a mix up, asked as which is which, graded against the kept difference */
					const mx = deck.find((e) => e.kind === 'mixup');
					const m = cur.mixUps.find((x) => x.id === mx.id);
					W.state.house.role = { kind: 'mixup', id: mx.id, text: '', grade: null, recorded: false };
					expect(W.houseDrillHTML()).toContain('Which is which');
					boxes['hr-said'].value = m.difference.value;
					W.houseDrillAct('hd-role-check', {});
					expect(W.state.house.role.grade.verdict).toBe('met');
					expect(W.state.house.role.grade.keptYou).toBe(m.difference.value.trim());
					expect(W.progress.house.role).toHaveLength(1);
					W.houseDrillAct('hd-role-record', {});
					expect(W.progress.house.role).toHaveLength(2);
					expect(W.progress.house.role[1]).toMatchObject({ id: mx.id, kind: 'mixup', verdict: 'met' });
					/* the mix up's copy of the house was never saved */
					expect(OOT.house.current().scenarios).toHaveLength(cur.scenarios.length);
					/* an empty answer is missed and says so */
					W.houseDrillAct('hd-role-again', {});
					W.houseDrillAct('hd-role-check', {});
					expect(W.state.house.role.grade.verdict).toBe('missed');
					W.houseDrillAct('hd-role-deal', {});
					expect(deck.some((e) => e.kind === W.state.house.role.kind && e.id === W.state.house.role.id)).toBe(true);
				});
			} finally { W.progress.house = recWas; W.state.tab = tab; W.state.house.drill = ''; }
		});
	});

	/* ---- the study view of the house's drinks (js/house-study.js) ----
	   The shipped pack through the auto-load, as above; location and
	   history are stubs this realm installs for the address cases and
	   takes away after. */
	const withStudy = async (fn) => {
		const tab = W.state.tab, menu = Object.assign({}, W.state.menu), fc = Object.assign({}, W.state.fc);
		const locWas = globalThis.location, histWas = globalThis.history;
		const pushed = [];
		globalThis.location = { hash: '', pathname: '/ledger/' };
		globalThis.history = { replaceState(s, t, h) { globalThis.location.hash = h; }, pushState(s, t, h) { pushed.push(h); globalThis.location.hash = h; } };
		W.state.menu.view = 'menu'; W.state.menu.open = null;
		W.state.menu.study = { q: '', sec: '', open: null, editAll: false, deck: null, y: 0, jump: null, pushed: false, l20: false, l45: false, lastId: null };
		try { return await fn(pushed); } finally {
			W.state.tab = tab; Object.assign(W.state.menu, menu); W.state.menu.study = null; Object.assign(W.state.fc, fc);
			if (locWas === undefined) delete globalThis.location; else globalThis.location = locWas;
			if (histWas === undefined) delete globalThis.history; else globalThis.history = histWas;
		}
	};
	/* the router reads app.js's tab list, which boots and is not loaded here */
	if (!/\bTABS\b/.test(Object.keys(globalThis).join(' '))) { try { vm.runInThisContext('TABS'); } catch (e) { vm.runInThisContext(APP_SRC.match(/^const TABS = .*$/m)[0].replace(/^const /, 'var ')); } }
	const SAZ = 'b-olsmh04y', CATALINA = 'b-uzw5oty7', HUSSARDE = 'd-1q0xk7jv';

	packIt('the study view is the default with a house: one row per drink in the house\'s order, its sections in order, and today\'s list behind Edit the menu or with no house', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async () => {
				/* no house: today's screen */
				expect(W.houseStudyOn()).toBe(false);
				expect(W.renderMenu()).not.toContain('hs-bar');
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				const cur = OOT.house.current();
				expect(W.houseStudyOn()).toBe(true);
				const html = W.renderMenu();
				expect(html).toContain('class="hs-bar"');
				expect(html).toContain('id="hs-q"');
				expect(html).toContain('data-act="hs-cards"');
				expect(html).not.toContain('data-act="menu-open"');
				const rows = [...html.matchAll(/<button class="hs-row" data-act="hs-open" data-id="([^"]+)"/g)].map((m) => m[1]);
				expect(rows).toEqual(cur.cocktails.map((c) => c.id));
				const secs = [...html.matchAll(/<h3 class="eyebrow hs-sec-name">([^<]+) · \d+<\/h3>/g)].map((m) => m[1]);
				const want = [...new Set(cur.cocktails.map((c) => c.section))].map(W_esc);
				expect(secs).toEqual(want);
				expect(secs).toHaveLength(8);
				expect(html).not.toMatch(/<[^>]*\schecked[\s>=]/);
				/* every control a button of the study view, none under its height rule by class */
				expect(html).toContain('Menus read 26 September 2026');
				/* Edit the menu: today's list, unchanged, with the switch back */
				W.houseStudyAct('hs-editall', {});
				expect(W.houseStudyOn()).toBe(false);
				const edit = W.renderMenu();
				expect(edit).toContain('data-act="menu-open"');
				expect(edit).toContain('Edit the menu: on');
				expect(edit).not.toContain('hs-bar');
				W.houseStudyAct('hs-editall', {});
				expect(W.houseStudyOn()).toBe(true);
				/* the card's Edit opens that drink on today's Build pane */
				W.houseStudyAct('hs-edit', { id: SAZ });
				expect(W.state.menu.study.editAll).toBe(true);
				expect(W.state.menu.open).toBe(SAZ);
				expect(W.state.menu.pane).toBe('build');
				expect(W.renderMenu()).toContain('aria-expanded="true" data-act="menu-open" data-id="' + SAZ + '"');
			});
		});
	});

	packIt('the Classic Sazerac card links the canon Sazerac and its story, never draws the canon\'s quantities, and shows its upsells as buttons to their cards', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async (pushed) => {
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				W.houseStudyAct('hs-open', { id: SAZ });
				expect(pushed).toEqual(['#/menu/classic-sazerac']);
				const card = W.renderMenu();
				expect(card).toContain('id="hs-name"');
				expect(card).toContain('>Classic Sazerac</h2>');
				expect(card).not.toContain('hs-bar');
				expect(card).toContain('class="ticket"');
				/* About it and On the floor wherever the edition carries the fixed questions */
				const qs = (OOT.house.current().cocktails.find((c) => c.id === SAZ).kept || []).map((n) => n.q);
				const heads = ['The build', 'The five parts', 'In this app'].concat(qs.includes('Tell me about it.') ? ['About it'] : [], qs.includes('How do I sell it?') ? ['On the floor'] : []);
				for (const h of heads) expect(card).toContain('>' + h + '</h3>');
				expect(card).toContain('<div class="eyebrow">Offer next</div>');
				expect(card).toContain('data-act="hs-open" data-id="b-15i9pacz">Thompson’s Dream $20</button>');
				expect(card).toContain('data-act="hs-open" data-id="b-m0mhbaq8">Origin Story $40</button>');
				expect(card).toContain('href="#/library/sazerac"');
				expect(card).toContain(W_esc('The classic Sazerac is in the Library. Its build is the classic’s, not ours.'));
				expect(card).toContain('Read the whole story');
				const canon = W.COCKTAILS.find((c) => c.name === 'Sazerac');
				/* the canon's quantities: every measured line of its spec */
				for (const line of canon.spec.filter((l) => /\d/.test(l))) expect(card).not.toContain(W_esc(line));
				expect((card.match(/class="hs-price">\$13</g) || []).length).toBe(1);
				expect(card).toContain('Prices as printed on 26 September 2026. Confirm before quoting.');
				expect(card).toContain('<dt>Bitters</dt>');
				expect(card).toContain('<dt>Rinse</dt>');
				expect(card).toContain('Your words. Allergens: confirm at lineup.');
				expect(card).not.toMatch(/<[^>]*\schecked[\s>=]/);
				expect(card).not.toContain('/table/menu#');
				expect(card).toContain('SAZ-uh-rak');
				/* the next card replaces the address, it pushes nothing */
				W.houseStudyAct('hs-next', {});
				expect(pushed).toHaveLength(1);
				/* Catalina Island is poured with Eggs Hussarde: the Table's card, on the suite's path */
				W.houseStudyAct('hs-open', { id: CATALINA });
				const cat = W.renderMenu();
				expect(cat).toContain('<div class="eyebrow">Poured with</div>');
				expect(cat).toContain('href="/table/menu#' + HUSSARDE + '"');
				/* off the suite's path, the same dish is words and no link */
				globalThis.location.pathname = '/';
				expect(W.renderMenu()).not.toContain('/table/menu#');
				/* the canon and the producers across the menu, by the rules alone */
				const cur = OOT.house.current();
				const canonN = cur.cocktails.filter((c) => W.hsCanonFor(c)).length;
				const prodN = cur.cocktails.filter((c) => W.hsProducersFor(c, W.progress.bar.find((b) => b.id === c.id) || c).length).length;
				expect(canonN >= 9).toBe(true);
				expect(prodN >= 4).toBe(true);
			});
		});
	});

	packIt('#drink=<id> opens that drink\'s study card and leaves its own address; a malformed one writes nothing; the drink\'s address opens the card and not the editor, and the menu\'s address closes it', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async () => {
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				globalThis.location.hash = '#drink=b-OLSMH04Y';
				W.state.tab = 'home';
				expect(W.houseStudyDeepLink()).toBe(false);
				expect(globalThis.location.hash).toBe('#drink=b-OLSMH04Y');
				expect(W.state.tab).toBe('home');
				expect(W.state.menu.study.open).toBe(null);
				globalThis.location.hash = '#drink=' + SAZ;
				expect(W.houseStudyDeepLink()).toBe(true);
				expect(W.state.tab).toBe('menu');
				expect(W.state.menu.study.open).toBe(SAZ);
				expect(globalThis.location.hash).toBe('#/menu/classic-sazerac');
				/* the router runs next at boot, on the address left behind */
				expect(W.applyRoute()).toBe(true);
				expect(W.state.menu.study.open).toBe(SAZ);
				expect(W.state.menu.open).toBe(null);
				expect(W.currentRoute()).toBe('#/menu/classic-sazerac');
				expect(W.renderMenu()).toContain('>Classic Sazerac</h2>');
				/* the menu's address closes the card, as the back gesture does */
				globalThis.location.hash = '#/menu';
				W.applyRoute();
				expect(W.state.menu.study.open).toBe(null);
				expect(W.state.menu.study.jump).toBe('back');
				expect(W.currentRoute()).toBe('#/menu');
				/* the global search's address, with Edit the menu on: today's Build pane */
				W.state.menu.study.editAll = true;
				globalThis.location.hash = '#/menu/classic-sazerac';
				W.applyRoute();
				expect(W.state.menu.study.open).toBe(null);
				expect(W.state.menu.open).toBe(SAZ);
				expect(W.state.menu.pane).toBe('build');
			});
		});
	});

	packIt('flash cards from the study view deal only house drinks in scope, grade the deck\'s own record, show Got it only after Flip, and the weak ones are the trouble cards', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async () => {
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				const cur = OOT.house.current();
				const houseIds = new Set(cur.cocktails.map((c) => c.id));
				/* a drink of the person's own, on no house, is never dealt by the house deck */
				W.progress.bar.push({ id: 'b-own00001', name: 'My Own Sour', spec: ['2 oz gin', '1 oz lemon', '3/4 oz syrup'], method: 'Shake', glass: 'Coupe', garnish: '', family: '', spirit: '', price: '', note: '', ts: 1 });
				W.barChanged();
				expect(W.houseStudyDeck({})).toBe(true);
				const all = W.state.menu.study.deck.ids;
				expect(all.length > 10).toBe(true);
				expect(all.every((id) => houseIds.has(id))).toBe(true);
				expect(all).toEqual(cur.cocktails.filter((c) => all.includes(c.id)).map((c) => c.id));
				expect(W.houseStudyDeck({ section: 'Signature drinks' })).toBe(true);
				const sig = W.state.menu.study.deck.ids;
				expect(sig.length > 0).toBe(true);
				expect(sig.every((id) => W.houseStudySectionOf(id) === 'Signature drinks')).toBe(true);
				/* one drink's card: the face is one button, Got it comes after Flip */
				W.houseStudyAct('hs-cards', { id: SAZ });
				expect(W.state.menu.study.deck.ids).toEqual([SAZ]);
				let face = W.renderMenu();
				expect(face).toContain('data-act="hs-flip"');
				expect(face).toContain('Say the ten second line aloud, then flip.');
				expect(face).not.toContain('data-act="hs-got"');
				W.houseStudyAct('hs-flip', {});
				face = W.renderMenu();
				expect(face).toContain('data-act="hs-got"');
				expect(face).toContain('data-act="hs-again"');
				expect(face.indexOf('data-act="hs-again"') < face.indexOf('data-act="hs-got"')).toBe(true);
				W.houseStudyAct('hs-got', {});
				expect(W.progress.cards['My Bar · Classic Sazerac']).toMatchObject({ r: 1, w: 0 });
				expect(W.renderMenu()).toContain('Deck complete');
				/* Again on the Bloody Bull makes it the one weak card */
				W.houseStudyAct('hs-cards', { id: 'b-xid4q2qi' });
				W.houseStudyAct('hs-flip', {});
				W.houseStudyAct('hs-again', {});
				expect(W.progress.cards['My Bar · Bloody Bull']).toMatchObject({ r: 0, w: 1 });
				W.houseStudyAct('hs-close', {});
				expect(W.renderMenu()).toContain('My weak ones (1)');
				expect(W.houseStudyDeck({ weak: true })).toBe(true);
				expect(W.state.menu.study.deck.ids).toEqual(['b-xid4q2qi']);
				/* the Flashcards tab's own deck, the house card mode and a section */
				W.state.fc.src = 'My Bar'; W.state.fc.section = 'Signature drinks';
				const pool = W.fcPool();
				expect(pool.length > 0).toBe(true);
				expect(pool.every((d) => d.src === 'My Bar' && W.houseStudySectionOf(d.ref.id) === 'Signature drinks')).toBe(true);
				expect(W.FC_MODES.find((m) => m[0] === 'study')[3](pool[0])).toBe(true);
			});
		});
	});

	it('every input id the study view mints joins captureLiveInputs, and the hooks are where the design puts them', () => {
		const study = readFileSync(join(JS, 'house-study.js'), 'utf8');
		const ids = new Set();
		for (const m of study.matchAll(/<(?:textarea|input|select)\b[^>]*id="([a-z0-9-]+)"/g)) ids.add(m[1]);
		expect([...ids]).toEqual(['hs-q']);
		const ui = readFileSync(join(JS, 'ui-study.js'), 'utf8');
		expect(ui).toContain('id="fc-section"');
		for (const id of ['hs-q', 'fc-section']) expect(captureSrc.includes("'" + id + "'")).toBe(true);
		expect(APP_SRC).toContain("else if(act.indexOf('hs-')===0){ houseStudyAct(act, el.dataset); return; }");
		const boot = APP_SRC.slice(APP_SRC.indexOf('(async () => {'));
		expect(boot.indexOf('houseStudyDeepLink()') > 0 && boot.indexOf('houseStudyDeepLink()') < boot.indexOf('applyRoute()')).toBe(true);
		expect(readFileSync(join(JS, 'ui-menu.js'), 'utf8')).toContain("(typeof houseStudyOn === 'function' && houseStudyOn()) ? houseStudyHTML() : menuListHTML()");
		expect(/[\u2013\u2014]| -{2} /.test(study)).toBe(false);
		expect(/\b(colou?r|favorite|practice|Lizzy|Brennan)\b/.test(study.replace(/\/\*[\s\S]*?\*\//g, ''))).toBe(false);
	});

	/* ---- VERIFIER (study view): a card opened under a shift that hides its drink ----
	   With "Dinner" chosen, a deep link from the Table (or the global search,
	   or an Offer next button) to a breakfast-only drink, or to a Roost Bar
	   drink whose meals name no house meal, opened a card reading "0 of 3 in
	   Signature drinks" or "0 of 0 in Luxury Roost Bar Cocktails" with no
	   Next and no Previous: the position counts the shift's rows, which do not
	   hold the drink. The card must say a real position and offer a way on. */
	packIt('VERIFIER: a card opened on a drink the chosen shift hides still says a real position and offers Next', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async () => {
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				const ls = globalThis.localStorage;
				const store = { 'oot-study-meal-v1': 'Dinner' };
				globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
				try {
					for (const id of ['b-c0ei23l2', 'b-30rc57xd']) {
						W.houseStudyAct('hs-open', { id });
						const card = W.renderMenu();
						const pos = (card.match(/<span class="hs-pos">([^<]*)<\/span>/) || [])[1] || '';
						expect(pos).not.toMatch(/^0 of /);
						expect(card).toContain('data-act="hs-next"');
						W.houseStudyAct('hs-back', {});
					}
				} finally { globalThis.localStorage = ls; }
			});
		});
	});

	/* ---- REPAIR (study view): the shift, the offer line, the Library's story, the build ----
	   A drink whose meals name no house meal (the Roost Bar's three, tagged
	   with the room) shows under every shift, the way an untagged one does;
	   each upsell keeps its comma inside one piece; the Library's story is
	   its own closed disclosure, labelled as the Library's, below the
	   house's coaching; the build is printed once, with words and no dash. */
	packIt('REPAIR: the Roost Bar rows show under Dinner, the offer line keeps its commas, the story is the Library\'s and closed, the build is said once', async () => {
		counted();
		await withBarAsync(async () => {
			await withStudy(async () => {
				await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
				const ls = globalThis.localStorage;
				const store = { 'oot-study-meal-v1': 'Dinner' };
				globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
				try {
					const list = W.renderMenu();
					for (const id of ['b-30rc57xd', 'b-1acbdbmb', 'b-h6w1b886']) expect(list).toContain('data-act="hs-open" data-id="' + id + '"');
					/* a breakfast-only drink still leaves the Dinner list */
					expect(list).not.toContain('data-act="hs-open" data-id="b-c0ei23l2"');
					store['oot-study-meal-v1'] = "Bubbles at Brennan's";
					const bub = W.renderMenu();
					for (const id of ['b-590pi2gd', 'b-30rc57xd', 'b-1acbdbmb', 'b-h6w1b886']) expect(bub).toContain('data-act="hs-open" data-id="' + id + '"');
					/* the card off the shift says so in words */
					W.houseStudyAct('hs-open', { id: 'b-c0ei23l2' });
					expect(W.renderMenu()).toContain('Not on the Bubbles at Brennan');
					W.houseStudyAct('hs-back', {});
				} finally { globalThis.localStorage = ls; }
				W.houseStudyAct('hs-open', { id: SAZ });
				const card = W.renderMenu();
				const offer = (card.match(/<p class="hs-offer">([\s\S]*?)<\/p>/) || [])[1] || '';
				expect(offer).toContain('Thompson’s Dream $20</button>,</span>');
				expect(offer).not.toMatch(/<\/span>\s*,/);
				const story = card.indexOf('The Library’s story, not the house’s');
				expect(story > card.indexOf('>In this app</h3>')).toBe(true);
				expect(card.slice(0, story)).toMatch(/<details class="hs-more"><summary>$/);
				expect(card).not.toContain('<div class="eyebrow">The story</div>');
				const floor = card.indexOf('>On the floor</h3>');
				if (floor >= 0) expect(story > floor).toBe(true);
				const build = card.slice(card.indexOf('>The build</h3>'), card.indexOf('</section>', card.indexOf('>The build</h3>')));
				expect(/[\u2013\u2014]/.test(build)).toBe(false);
				expect((build.match(/not printed; confirm with the bar/g) || []).length).toBe(2);
				expect(build).not.toContain('<li>Method:');
				expect(build).not.toContain('<li>Glass:');
			});
		});
	});

	/* ---- VERIFIER cases (adversarial pass on the auto-load and the drills) ---- */
	packIt('VERIFIER: a drink the person took off the list stays off after a newer edition refreshes the house', async () => {
		counted();
		const { text: oldText } = olderEdition();
		await withBarAsync(async () => {
			await withFetch(oldText, async () => { expect((await W.houseAutoLoad()).action).toBe('added'); });
			const gone = W.progress.bar[2];
			W.removeBarRecord(gone.id);
			expect(await W.houseRemove(gone.id)).toBe(true);
			expect(W.progress.bar.some((b) => b.id === gone.id)).toBe(false);
			await withFetch(PACK_TEXT, async () => { expect((await W.houseAutoLoad()).action).toBe('refreshed'); });
			expect(OOT.house.current().cocktails.some((c) => c.id === gone.id)).toBe(false);
			expect(W.progress.bar.some((b) => b.id === gone.id)).toBe(false);
		});
	});

	packIt('VERIFIER: a refresh of the shipped house while another house is current never switches the current house or touches its list', async () => {
		counted();
		const { text: oldText } = olderEdition();
		await withBarAsync(async () => {
			expect((await OOT.house.importPack(packOf(fixtureHouse()), { mode: 'new' })).ok).toBe(true);
			await W.houseSyncIn();
			const mineId = OOT.house.currentId();
			await withFetch(oldText, async () => {
				const r = await W.houseAutoLoad();
				expect(r.action).toBe('added');
				expect(r.current).toBe(false);
			});
			expect(OOT.house.currentId()).toBe(mineId);
			const list = JSON.stringify(W.progress.bar);
			await withFetch(PACK_TEXT, async () => { expect((await W.houseAutoLoad()).action).toBe('refreshed'); });
			expect(OOT.house.currentId()).toBe(mineId);
			expect(JSON.stringify(W.progress.bar)).toBe(list);
		});
	});

	packIt('VERIFIER: drinks the person typed before any house are never filed into the shipped house by the auto-load', async () => {
		counted();
		await withBarAsync(async () => {
			const mine = W.saveBarRecord({ name: 'My Own Negroni', spec: ['1 oz gin', '1 oz Campari', '1 oz sweet vermouth'], method: 'Stir', glass: 'Rocks', garnish: 'Orange', family: '', spirit: '', price: '', note: '' }, null);
			expect(typeof mine === 'string').toBe(false);
			const id = W.progress.bar[0].id;
			await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
			expect(W.progress.bar.some((b) => b.id === id)).toBe(true);
			const shipped = OOT.house.list().find((s) => s.id === JSON.parse(PACK_TEXT).house.id);
			expect(!!shipped).toBe(true);
			const cur = OOT.house.current();
			if (cur && cur.id === shipped.id) expect(cur.cocktails.some((c) => c.id === id || c.name === 'My Own Negroni')).toBe(false);
			/* the person's drinks are kept under a hand house of their own,
			   which stays current; the shipped house waits behind 'Open it now?' */
			expect(cur.id).not.toBe(shipped.id);
			expect(cur.cocktails.some((c) => c.id === id)).toBe(true);
			expect(W.state.house.added && W.state.house.added.id).toBe(shipped.id);
			expect(W.progress.bar.every((b) => b.house === cur.id)).toBe(true);
		});
	});

	packIt('VERIFIER: Guest at the table grades nobody on allergen content: no allergy scenario is dealt', async () => {
		counted();
		await withBarAsync(async () => {
			await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
			const cur = OOT.house.current();
			const ALG = /allerg|shellfish|gluten|tree nut|\bnuts?\b|vegan|dairy|lactose|coeliac|celiac|peanut/i;
			const bad = [];
			for (const e of W.houseRoleDeck()) {
				const sc = e.kind === 'scenario' ? cur.scenarios.find((s) => s.id === e.id) : null;
				const text = sc ? [sc.title, sc.guest, sc.you && sc.you.value, sc.principle && sc.principle.value].join(' ') : [e.title, e.guest, e.difference, e.ask].join(' ');
				if (ALG.test(text)) bad.push(e.title);
			}
			expect(bad).toEqual([]);
		});
	});

	packIt('VERIFIER: the Ledger names nobody: no person\'s name reaches Say it back or Guest at the table', async () => {
		counted();
		await withBarAsync(async () => {
			await withFetch(PACK_TEXT, async () => { await W.houseAutoLoad(); });
			const cur = OOT.house.current();
			const PEOPLE = /\bOwen Brennan\b|\bElla Brennan\b|\bPaul Blang/;
			const bad = [];
			for (const e of W.houseRoleDeck()) {
				const sc = e.kind === 'scenario' ? cur.scenarios.find((s) => s.id === e.id) : null;
				const text = sc ? [sc.title, sc.guest, sc.you && sc.you.value, sc.principle && sc.principle.value].join(' ') : [e.title, e.guest, e.difference, e.ask].join(' ');
				if (PEOPLE.test(text)) bad.push(e.title);
			}
			for (const i of W.houseSayItems()) {
				const c = cur.cocktails.find((x) => x.id === i.id);
				if (PEOPLE.test(JSON.stringify(c.lines && c.lines.value))) bad.push(c.name);
			}
			expect(bad).toEqual([]);
		});
	});

	it('VERIFIER: every new input id on the drills screen, the select included, joins captureLiveInputs', () => {
		const bar = readFileSync(join(JS, 'house-bar.js'), 'utf8');
		const from = bar.indexOf('SAY IT BACK AND GUEST AT THE TABLE');
		const ids = new Set();
		for (const m of bar.slice(from).matchAll(/<(?:textarea|input|select)\b[^>]*id="([a-z0-9-]+)"/g)) ids.add(m[1]);
		expect(ids.has('hs-item')).toBe(true);
		for (const id of ids) expect(captureSrc.includes("'" + id + "'")).toBe(true);
	});

	it('the two drills\' boxes are in captureLiveInputs, their list is heard on change, their acts reach the drill, and the boot loads the pack after the wake', () => {
		const bar = readFileSync(join(JS, 'house-bar.js'), 'utf8');
		const from = bar.indexOf('SAY IT BACK AND GUEST AT THE TABLE');
		expect(from > 0).toBe(true);
		const ids = new Set();
		for (const m of bar.slice(from).matchAll(/<(?:textarea|input)\b[^>]*id="([a-z0-9-]+)"/g)) ids.add(m[1]);
		expect([...ids].sort()).toEqual(['hr-said', 'hs-said']);
		for (const id of ids) expect(captureSrc.includes("'" + id + "'")).toBe(true);
		expect(APP_SRC).toContain("if(hsi) hsi.addEventListener('change', e => { houseSayPick(e.target.value); });");
		expect(APP_SRC).toContain("else if(act.indexOf('hd-')===0){ houseDrillAct(act, el.dataset); return; }");
		const boot = APP_SRC.slice(APP_SRC.indexOf('(async () => {'));
		expect(boot.indexOf('await houseSyncIn()') > 0).toBe(true);
		expect(boot.indexOf('houseAutoLoad()') > boot.indexOf('await houseSyncIn()')).toBe(true);
		expect(boot).not.toContain('await houseAutoLoad');
	});
});

describe('house-bar.js with no engine at all', () => {
	it('loads with no OOT, and every door does nothing', async () => {
		const sandbox = { console, setTimeout, clearTimeout, Promise, window: { addEventListener() {} },
			state: { menu: { form: null, editing: null, open: null }, fc: {} }, progress: { bar: [{ id: 'b-1', name: 'A', spec: [] }] },
			hasSpec: (d) => Array.isArray(d.spec) && d.spec.length, barText: (v) => (v == null ? '' : String(v).trim()),
			sample: (a, n) => a.slice(0, n), shuffle: (a) => a.slice(), esc: (s) => String(s), COCKTAILS: [] };
		vm.createContext(sandbox);
		vm.runInContext(readFileSync(join(JS, 'house-bar.js'), 'utf8'), sandbox, { filename: 'house-bar.js' });
		vm.runInContext(readFileSync(join(JS, 'house-study.js'), 'utf8'), sandbox, { filename: 'house-study.js' });
		const g = (n) => vm.runInContext(n, sandbox);
		expect(g('houseHere()')).toBe(null);
		expect(g('houseLineHTML()')).toBe('');
		expect(g('isHouseCard({ spec: [] })')).toBe(false);
		expect(g('isHouseCard({ spec: ["x"] })')).toBe(true);
		expect(g('hasKeptLines({ id: "b-1", spec: [] })')).toBe(false);
		expect(g('houseNames()')).toHaveLength(0);
		expect(await g('houseSyncIn()')).toBe(null);
		expect(await g('houseProject()')).toBe(null);
		expect(await g('housePut({ id: "b-1" })')).toBe(null);
		expect(await g('houseRemove("b-1")')).toBe(false);
		expect(g('qMyBarLine({ id: "b-1", name: "A", spec: [] })')).toBe(null);
		expect(g('qMyBarUpsell({ id: "b-1", name: "A", spec: [] })')).toBe(null);
		expect(g('qMyBarParts({ id: "b-1", name: "A", spec: [] })')).toBe(null);
		expect(g('houseCardFits("parts", { id: "b-1", spec: [] })')).toBe(false);
		expect(g('houseCardFits("upsell", { id: "b-1", spec: [] })')).toBe(false);
		expect(g('houseDrillPanelHTML()')).toBe('');
		expect(g('housePairReady()')).toHaveLength(0);
		expect(g('houseQuizRound()')).toHaveLength(0);
		expect(g('houseUpsellWhy()')).toBe('');
		expect(g('state.house.panel')).toBe('');
		/* the shipped pack and the two offline drills: nothing at all */
		expect(await g('houseAutoLoad()')).toBe(null);
		expect(g('houseDrillHTML()')).toBe('');
		expect(g('houseDrillDoorsHTML()')).toBe('');
		expect(g('houseSayItems()')).toHaveLength(0);
		expect(g('houseRoleDeck()')).toHaveLength(0);
		/* the study view: off, empty, and the address read and dropped */
		expect(g('houseStudyOn()')).toBe(false);
		expect(g('houseStudyHTML()')).toBe('');
		expect(g('houseStudyDeepLink()')).toBe(false);
		expect(g('houseStudyRoute(null)')).toBe(false);
		expect(g('houseStudyEditBarHTML()')).toBe('');
		expect(g('houseStudyDeck({})')).toBe(false);
		expect(sandbox.progress.bar).toHaveLength(1);
	});
});
