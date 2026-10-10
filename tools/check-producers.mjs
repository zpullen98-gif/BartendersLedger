/**
 * The Ledger's library of producers, gated. Run: `node tools/check-producers.mjs`
 * (exits non-zero on any problem; `LEDGER_JS=<dir>` reads another copy of js/).
 *
 * The Producers tab (js/ui-reference.js) holds PROD_CATS, PRIMERS and the
 * general library PRODUCERS. The drink producers of October 2026 add houses
 * to it, and two categories (Vodka, Absinthe & Bitters) arrived first, so
 * this gate holds every entry to the shape the tab draws, and the entries
 * added after that day to the house rules the older ones predate:
 *
 *   - every entry has a name, a cat that PROD_CATS lists, a where, an est,
 *     a why, a process and a bar, each a string with words in it
 *   - no two entries share a name, nor a name that folds to the same words
 *   - every category in PROD_CATS has a PRIMERS entry of [title, text] pairs,
 *     at least two, and PRIMERS names no category the tab does not list
 *   - THE LEDGER NAMES NOBODY LIVING: no entry and no primer, old or new,
 *     names anyone on LIVING below, matched on folded whole words
 *   - an entry ADDED after the frozen list BASE_NAMES (the 66 houses the
 *     library held on 10 October 2026, compared by name), and a primer of a
 *     category added after BASE_CATS, carries no em dash (U+2014, its
 *     entities or a spaced double hyphen) and no en dash, and none of the
 *     American spellings the app's prose never uses. The older entries keep
 *     their dashes and their spelling; nothing here rewrites them.
 *
 * LIVING is a list of people who are alive, or not known to have died, and
 * who a producer's story is likely to reach for: founders, master
 * distillers and blenders, owners, the bar people of New Orleans and the
 * Brennan family and partners. A role says what they did ("its master
 * distiller", "the founder"). Add a name whenever a draft reaches for one;
 * a false alarm costs a rewrite, a miss names somebody. tools/check-import.mjs
 * reads the same list over the producer text the house's drink cards show.
 *
 * Every rule proves it can fail: after the real library passes, a mutated
 * copy is audited once per rule and each must turn red.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* living, or not known to have died: named by role, never by name */
export const LIVING = [
	/* named by the library's older entries until October 2026, said by role since */
	'Desmond Payne', 'Fritz Maytag', 'Simon Ford', 'Charles Maxwell', 'Jimmy Russell', 'Eddie Russell', 'Bruce Russell',
	'John Glaser', 'Richard Seale', 'Joy Spence', 'Guillermo Erickson Sauza', 'Carlos Camarena', 'Felipe Camarena',
	'Salvador Rosales', 'Ron Cooper', 'Alexandre Gabriel',
	/* master distillers, blenders, founders and owners a drink producer's story may reach for */
	'Harlen Wheatley', 'Drew Kulsveen', 'Britt Kulsveen', 'Fred Noe', 'Freddie Noe', 'Chris Morris', 'Elizabeth McCall',
	'Brent Elliott', 'Bill Samuels', 'Rob Samuels', 'Julian Van Winkle', 'Conor O\u2019Driscoll', 'Conor O\'Driscoll',
	'Denny Potter', 'Jim Rutledge', 'Eboni Major', 'Nicole Austin', 'Bill Lumsden', 'Jim McEwan', 'Rachel Barrie',
	'Lesley Gracie', 'Lance Winters', 'J\u00f6rg Rupf', 'Ted Breaux', 'Stephan Berg', 'Alexander Hauck',
	'Alexander Stein', 'Christoph Keller', 'Kaveh Zamanian', 'Tadeusz Dorda', 'Pierre-Emmanuel Taittinger',
	'Vitalie Taittinger', 'Clovis Taittinger', 'Mark Livings', 'Jim Patton', 'David Blossman', 'Joey W\u00f6lffer',
	'Marc W\u00f6lffer', 'William Goldring', 'Bill Goldring', 'Mark Brown', 'Guillaume Drouin', 'Giannola Nonino',
	/* the bar people of New Orleans and beyond a story may quote */
	'Chris McMillian', 'Neal Bodenheimer', 'Ann Tuennerman', 'Dale DeGroff', 'Audrey Saunders',
	/* the Brennan family and the house's partners */
	'Ralph Brennan', 'Terry White', 'Pip Brennan', 'Clark Brennan', 'Dickie Brennan', 'Lally Brennan', 'Ti Martin',
	'Ti Adelaide Martin', 'Alex Brennan-Martin',
	/* met in the bar producers research of 10 October 2026 (research/producers-bar-*-2026-10-10.md in the
	   World Table), living or not known to have died; a full name, so a house that shares a surname
	   (Dudognon, Fee, Zamora, Toschi, Perrone) is never refused */
	'Claudine Dudognon', 'Gerald Buraud', 'Pierre Buraud', 'Ellen Fee', 'Benjamin Fee Spacher', 'Jon F Spacher', 'Jon Spacher',
	'Laurent Schun', 'Mark Byers', 'Ted Haigh', 'Jared Gurfein', 'Davendranath Tancoo',
	'Bruno Borie', 'Steve Morris', 'Brad Pitt', 'Gilles Pudlowski', 'Mitchell Rabinowitz', 'Mark Diacono',
	'Diego Zamora', '\u00c1ngel Zamora', 'Josefina Zamora', 'Emilio Restoy', 'Giancarlo Toschi', 'Lanfranco Toschi', 'Jules Berman',
	'Heather Zamanian', 'Even Kulsveen', 'Even G. Kulsveen', 'Martha Willett Kulsveen', 'Craig Beam', 'Fred Minnick',
	'Tad Dorda', 'Waldemar Durakiewicz', 'David Stewart', 'John Ross', 'Glenn Gordon', 'Charles Gordon', 'Janet Sheed Roberts',
	'Sal Bivalacqua', 'Eileen Bivalacqua', 'Erik Morningstar', 'Austin Evans', 'Richard Patrick', 'Pat Thomas',
	'Juan Ignacio Gallardo Thurlow', 'Juan Gallardo', 'Santiago Gallardo', 'Santiago Cortina Gallardo', 'Philipp Mainzer',
	'Dawnine Dyer', 'Ana Paula Bartolucci', 'Stefano Perrone', 'Roman Roth', 'Carl Hartmann', 'Paul Gloster',
	'David Gimpelson', 'Patrick Borg', 'Rich Doyle', 'Rush Cumming', 'Antonio Galloni', 'Renaud Poirier', 'Bertrand de Ladoucette'
];

/* the 66 houses of 10 October 2026: older than the dash rule here */
export const BASE_NAMES = ['Tanqueray', 'Beefeater', 'Plymouth', 'Hayman\u2019s', 'Sipsmith', 'Junipero (Anchor)', 'Monkey 47', 'Ford\u2019s',
	'Buffalo Trace', 'Heaven Hill', 'Wild Turkey', 'Four Roses', 'Maker\u2019s Mark', 'Jim Beam', 'Michter\u2019s', 'Old Forester', 'Willett',
	'MGP of Indiana', 'Springbank', 'Laphroaig', 'Ardbeg', 'Lagavulin', 'The Macallan', 'Glenfiddich', 'Highland Park', 'Compass Box',
	'Midleton', 'Bushmills', 'Teeling', 'Suntory Yamazaki', 'Nikka Yoichi', 'Foursquare', 'Hampden Estate', 'Appleton Estate', 'Mount Gay',
	'Demerara Distillers', 'Rhum J.M / Neisson', 'Havana Club', 'Fortaleza', 'Tequila Ocho', 'Siete Leguas', 'G4 / El Pandillo',
	'Cascahu\u00edn', 'Del Maguey', 'Mezcal Vago / Rey Campero', 'Hennessy', 'Pierre Ferrand', 'Delamain', 'Ch\u00e2teau du Tariquet',
	'Christian Drouin', 'Caravedo / Pisco Porton', 'Carpano', 'Cocchi', 'Dolin', 'Noilly Prat', 'Campari', 'Lillet', 'Chartreuse',
	'Fernet-Branca', 'Luxardo', 'B\u00e9n\u00e9dictine', 'Cointreau', 'Combier', 'Giffard', 'Amaro Nonino', 'Cynar'];
/* the nine categories of 10 October 2026 */
export const BASE_CATS = ['Gin', 'Bourbon & Rye', 'Scotch', 'Irish & Japanese', 'Rum', 'Agave', 'Brandy', 'Vermouth & Aperitivo', 'Amaro & Liqueur'];

const FIELDS = ['name', 'cat', 'where', 'est', 'why', 'process', 'bar'];
const DASH = /[\u2013\u2014]|&[mn]dash;|&#821[12];|&#x201[34];| \x2d\x2d /i;
/* American spellings the app's own prose never uses; a brand keeps its own */
const AMERICAN = /\b(?:colors?|colored|coloring|flavors?|flavored|flavoring|flavorful|centers?|centered|favorites?|savory|honors?|labeled|labeling|neighbors?|odors?|vapors?|liters?)\b/i;

/* folded words, so a possessive, an accent or a capital cannot hide a name */
export function foldWords(s){
	const t = String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[\u2018\u2019]/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
	return t ? ' ' + t + ' ' : ' ';
}
/* every name on LIVING the text carries, as a whole run of words */
export function livingIn(text, list = LIVING){
	const hay = foldWords(text);
	const out = [];
	for (const n of list) {
		const f = foldWords(n);
		if (f.trim() && hay.indexOf(f) >= 0 && out.indexOf(n) < 0) out.push(n);
	}
	return out;
}

/* the whole library's audit: one line per problem */
export function audit({ PRODUCERS, PROD_CATS, PRIMERS }){
	const problems = [];
	if (!Array.isArray(PRODUCERS) || !Array.isArray(PROD_CATS) || !PRIMERS || typeof PRIMERS !== 'object') return ['PRODUCERS, PROD_CATS or PRIMERS is missing or the wrong shape'];
	const base = new Set(BASE_NAMES);
	const seen = new Map();
	PRODUCERS.forEach((p, i) => {
		const at = 'PRODUCERS[' + i + '] ' + (p && typeof p.name === 'string' ? p.name : '(no name)');
		if (!p || typeof p !== 'object') { problems.push(at + ': not an object'); return; }
		for (const f of FIELDS) if (typeof p[f] !== 'string' || !p[f].trim()) problems.push(at + ': no ' + f);
		if (typeof p.cat === 'string' && PROD_CATS.indexOf(p.cat) < 0) problems.push(at + ': cat "' + p.cat + '" is not in PROD_CATS');
		if (typeof p.name === 'string' && p.name.trim()) {
			const f = foldWords(p.name);
			if (seen.has(f)) problems.push(at + ': the name is taken by PRODUCERS[' + seen.get(f) + ']');
			else seen.set(f, i);
		}
		const text = FIELDS.map((f) => (typeof p[f] === 'string' ? p[f] : '')).join(' \n ');
		const named = livingIn(text);
		if (named.length) problems.push(at + ': names ' + named.join(', ') + ', who is living; say the role instead');
		if (!base.has(p.name)) {
			for (const f of FIELDS) {
				const v = typeof p[f] === 'string' ? p[f] : '';
				const d = v.match(DASH);
				if (d) problems.push(at + ': added after 10 October 2026 and its ' + f + ' carries a dash (' + JSON.stringify(d[0]) + '); use a comma, a colon or a full stop');
				const am = v.match(AMERICAN);
				if (am) problems.push(at + ': added after 10 October 2026 and its ' + f + ' spells "' + am[0] + '" the American way');
			}
		}
	});
	const cats = new Set(BASE_CATS);
	for (const c of PROD_CATS) {
		const pr = PRIMERS[c];
		if (!Array.isArray(pr) || pr.length < 2 || !pr.every((x) => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && x[0].trim() && typeof x[1] === 'string' && x[1].trim())) {
			problems.push('PRIMERS["' + c + '"]: not two or more [title, text] pairs');
			continue;
		}
		const text = pr.map((x) => x.join(' \n ')).join(' \n ');
		const named = livingIn(text);
		if (named.length) problems.push('PRIMERS["' + c + '"]: names ' + named.join(', ') + ', who is living; say the role instead');
		if (!cats.has(c)) {
			const d = text.match(DASH);
			if (d) problems.push('PRIMERS["' + c + '"]: a category added after 10 October 2026 and its primer carries a dash (' + JSON.stringify(d[0]) + ')');
			const am = text.match(AMERICAN);
			if (am) problems.push('PRIMERS["' + c + '"]: a category added after 10 October 2026 and its primer spells "' + am[0] + '" the American way');
		}
	}
	for (const k of Object.keys(PRIMERS)) if (PROD_CATS.indexOf(k) < 0) problems.push('PRIMERS["' + k + '"]: a primer for a category PROD_CATS does not list');
	if (new Set(PROD_CATS).size !== PROD_CATS.length) problems.push('PROD_CATS lists a category twice');
	return problems;
}

/* the library as the app holds it */
export function loadLibrary(dir){
	const jsDir = dir || process.env.LEDGER_JS || join(dirname(fileURLToPath(import.meta.url)), '..', 'js');
	const src = readFileSync(join(jsDir, 'ui-reference.js'), 'utf8');
	return vm.runInNewContext(src + ';({PRODUCERS, PROD_CATS, PRIMERS})', {});
}

function main(){
	const lib = loadLibrary();
	const problems = audit(lib);
	/* every rule proves it can fail, on a copy */
	const clone = () => JSON.parse(JSON.stringify(lib));
	const added = { name: 'A Test House', cat: 'Gin', where: 'Testshire', est: '2026', why: 'A test why.', process: 'A test process.', bar: 'A test bar line.' };
	const PROOFS = [
		['a missing field', (l) => { const e = Object.assign({}, added); delete e.bar; l.PRODUCERS.push(e); }],
		['a cat the tab does not list', (l) => { l.PRODUCERS.push(Object.assign({}, added, { cat: 'Moonshine' })); }],
		['a name taken twice', (l) => { l.PRODUCERS.push(Object.assign({}, added, { name: 'Tanqueray' })); }],
		['a living name in an old entry', (l) => { l.PRODUCERS[1].process += ' Desmond Payne ran it.'; }],
		['a living name in a new primer', (l) => { l.PRIMERS['Vodka'][0][1] += ' As Ted Breaux says.'; }],
		['an em dash in an added entry', (l) => { l.PRODUCERS.push(Object.assign({}, added, { why: 'A house \u2014 a test.' })); }],
		['a spaced double hyphen in an added entry', (l) => { l.PRODUCERS.push(Object.assign({}, added, { bar: 'A bar \x2d\x2d a test.' })); }],
		['an en dash in a new primer', (l) => { l.PRIMERS['Absinthe & Bitters'][1][1] += ' 45\u201374%.'; }],
		['an American spelling in an added entry', (l) => { l.PRODUCERS.push(Object.assign({}, added, { process: 'Its color is gold.' })); }],
		['a category with no primer', (l) => { l.PROD_CATS.push('Sake'); }],
		['a primer of one pair', (l) => { l.PRIMERS['Vodka'] = l.PRIMERS['Vodka'].slice(0, 1); }],
	];
	let held = 0;
	for (const [name, mutate] of PROOFS) {
		const l = clone();
		mutate(l);
		if (audit(l).length > problems.length) held++;
		else problems.push('the proof "' + name + '" left this gate green');
	}
	/* and an old entry keeps its dash: the rule is for what is added */
	if (!lib.PRODUCERS.some((p) => DASH.test(p.process || '')) && lib.PRODUCERS.length) console.log('  note: no older entry carries a dash any more');
	if (problems.length) {
		console.error('\n  \u2717 ' + problems.length + ' problem(s) in the library of producers');
		for (const p of problems.slice(0, 60)) console.error('    ' + p);
		process.exit(1);
	}
	const addedN = lib.PRODUCERS.filter((p) => BASE_NAMES.indexOf(p.name) < 0).length;
	console.log('  \u2713 ' + lib.PRODUCERS.length + ' producers in ' + lib.PROD_CATS.length + ' categories (' + addedN + ' added since 10 October 2026), every field there, every cat listed, every name once, every category with its primer, nobody living named, the added entries and primers dash free; ' + held + ' of ' + PROOFS.length + ' proofs turned the gate red');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
