/**
 * The menu importer's parser, gated.
 *
 * This is src/lib/menu-parse.test.ts from the World Table, ported from vitest
 * to node:test, and pointed at the SHIPPED js/menu-parse.js rather than at a
 * copy of it. Extracting the real function through vm is the same anti-drift
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
 * parser, not a transcription of it. The cocktail half at the bottom was
 * written here, because js/menu-drinks.js has no counterpart over there.
 *
 * Run: node tools/check-import.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const JS = process.env.LEDGER_JS || new URL('../js/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = readFileSync(join(JS, 'menu-parse.js'), 'utf8');
/* runInThisContext, not a sandbox: the parser touches no DOM, and an array
   built in another realm has another realm's Array.prototype, which makes
   every deepStrictEqual in this file fail on the prototype rather than on
   the values. */
const { parseMenuText } = vm.runInThisContext(src + ';({parseMenuText})');
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
globalThis.document = { getElementById: () => null, querySelector: () => null };
const APP = ['data-core.js', 'data-lore.js', 'data-service.js', 'data-ingredients.js',
	'ingredients.js', 'engine.js', 'ui-reference.js', 'ui-prep.js', 'menu-drinks.js'];
const W = vm.runInThisContext(APP.map((f) => readFileSync(join(JS, f), 'utf8')).join(';\n') +
	';({menuDrinkFromRow,menuDraftFromText,menuCanonMeasures,unmeasuredReason,' +
	'MD_isIngredientList,MD_spiritOf,lineOz,COCKTAILS,progress})');

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

	it('takes two run-on lines and then stops', () => {
		const { dishes } = parseMenuText('Roast chicken 16\nbread sauce\nand greens\nand a fourth line');
		expect(dishes[0].description).toBe('bread sauce and greens');
		expect(dishes).toHaveLength(2);
		expect(dishes[1].name).toBe('and a fourth line');
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
		const huge = 'Crispy squid 9.50\n'.repeat(20000);
		const started = Date.now();
		const { dishes, skipped } = parseMenuText(huge);
		expect(Date.now() - started).toBeLessThan(5000);
		expect(dishes.length).toBeLessThanOrEqual(5000);
		expect(skipped[skipped.length - 1]).toMatch(/^Only the first 200,000 characters were read/);
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
	   that came from nowhere. */
	it('never puts a measure on a spec line', () => {
		for (const d of draft(MENU)) {
			for (const line of d.rec.spec) {
				expect(W.lineOz(line)).toBe(0);
			}
		}
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
	it('names the measures as what is missing', () => {
		const [d] = draft('Garden Gimlet - Gin, elderflower, lime  14');
		expect(W.unmeasuredReason(d.rec)).toMatch(/printed no measures/);
	});

	it('says nothing about a drink that carries ounces', () => {
		expect(W.unmeasuredReason(W.COCKTAILS[0])).toBe(null);
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
