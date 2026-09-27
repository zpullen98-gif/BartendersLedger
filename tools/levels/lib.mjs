/**
 * The four levels' item universe, read from the SHIPPED scripts.
 *
 * Every item a Ledger level can hold, with the subsection it belongs to and
 * the signals the standard weighs. The app's own scripts are loaded through
 * tools/load-wing.mjs, so a renamed drink, a new question or a new section
 * shows up here the moment it ships; brief.mjs, set-levels.mjs and
 * tools/check-levels.mjs all read this one function, so what is placed, what
 * is written and what is gated cannot drift apart.
 *
 * KEYS are the app's own identities wherever it has one:
 *   a card        cardKey(d): 'Old Fashioned', 'Shots · Kamikaze',
 *                 'Zero Proof · Nojito', 'On Tap · American Lager',
 *                 'Coffee · Espresso' (Coffee is a deck source since the
 *                 four levels)
 *   a question    'q:' + slugify(q).slice(0, 64), unique across the bank
 *   a drill       'drill:' + id
 *   a section     'sec:' + tab + '/' + key ('sec:service/law',
 *                 'sec:notes/' + slugify(title))
 *   the rest      'prod:', 'flight:', 'prep:', 'preplist:', 'prepsafe:',
 *                 'plate:', 'riff:' + a slug of the item's own name
 *
 * MET-ABLE units are cards, questions and drills; everything else is read,
 * never graded, and is placed so a level page can open the right section.
 */

import { loadWing } from '../load-wing.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
export const OUT_DIR = join(HERE, 'out');
export const AUDIT_DIR = join(HERE, 'audit');
export const README = join(HERE, 'README.md');
export const DATA_FILE = join(ROOT, 'js', 'data-levels.js');

/** index.html's order, every script that defines content or a helper used here. */
export const FILES = ['data-core.js', 'data-ingredients.js', 'ingredients.js', 'engine.js', 'data-questions.js', 'data-lore.js',
	'data-ontap.js', 'data-coffee.js', 'data-coffee-films.js', 'data-service.js', 'srs.js', 'ui-study.js', 'ui-practice.js',
	'ui-reference.js', 'ui-prep.js', 'ui-new.js'];

/** The eight subsections, the same at every level, in the order a level page lists them. */
export const SUBSECTIONS = [
	{ key: 'cocktails', title: 'Cocktails' },
	{ key: 'shots', title: 'Shots and Zero Proof' },
	{ key: 'ontap', title: 'On Tap' },
	{ key: 'spirits', title: 'Spirits and Producers' },
	{ key: 'technique', title: 'Technique and Method' },
	{ key: 'stick', title: 'Behind the Stick' },
	{ key: 'prep', title: 'The Prep Room' },
	{ key: 'coffee', title: 'Coffee and Tea' }
];
export const SUB_KEYS = SUBSECTIONS.map((s) => s.key);

/** Where a craft question may be filed: the assigner chooses among these. */
export const CRAFT_SUBS = ['cocktails', 'spirits', 'technique', 'prep', 'stick', 'coffee', 'shots'];

/** A drill's subsection. Every other drill is Technique and Method. */
const DRILL_SUB = { blind: 'spirits', garnish: 'prep', mise: 'prep' };

/** Study Notes sections by title: the tab mixes subjects. */
const NOTE_SUB = {
	'Spirits: The Six Bases': 'spirits',
	'Technique: The Mechanics': 'technique',
	'Syrups, Citrus & Bitters': 'prep',
	'Hospitality: The Meehan Half': 'stick',
	'History: Know Your Lineage': 'cocktails',
	'Watch It Made: The Channels': 'technique',
	'Where to Go Deeper': 'spirits',
	'The Sober Service: NA & Low-ABV': 'shots',
	/* the Outside Of Time wing's name for the Meehan Half (see KEY_ALIAS) */
	'Hospitality: The Other Half': 'stick'
};

/* One key for an item the Outside Of Time wing renamed. The wing names
   nobody, so five history questions, the hospitality note and Don's Mix read
   differently there; each is the same item at the same level. The wing's key
   maps to the Ledger's here, the emitted js/data-levels.js carries the map as
   LEVEL_KEY_ALIAS, and the app's qKey and read doors apply it, so the
   placements, the answers in progress.qa and a backup carried between the
   two all agree. */
export const KEY_ALIAS = {
	'q:when-were-cocktail-specs-first-collected-and-published-in-a-bar-': 'q:who-published-the-first-cocktail-book-and-when',
	'q:the-flamed-orange-peel-became-the-signature-move-of-which-room': 'q:the-flamed-orange-peel-is-the-signature-move-of-which-bartender',
	'q:the-cocktail-families-framework-this-ledger-is-built-on-was-set-': 'q:the-cocktail-families-framework-was-popularized-in-the-joy-of-mi',
	'q:which-influential-new-york-bar-opened-in-2007-was-entered-throug': 'q:jim-meehan-s-influential-new-york-bar-opened-in-2007-was-called',
	'q:the-hanky-panky-was-created-by-the-head-bartender-of-which-room': 'q:ada-coleman-creator-of-the-hanky-panky-was-head-bartender-at',
	'sec:notes/hospitality-the-other-half': 'sec:notes/hospitality-the-meehan-half',
	'prep:don-s-mix': 'prep:donn-s-mix'
};

const clip = (s, n = 140) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function loadApp() {
	return loadWing(FILES);
}

/**
 * Every item, as rows { key, name, kind, sub, metable, fixed?, signals }.
 * `fixed` is a level the rules decide, never an agent: the Core Dozen and
 * the Classics Canon (keys tier:1 and tier:2) are Barback, every drink, and
 * the Extended Canon (tier:3) is Bartender, every drink, by the owner's
 * standard. A book is named and never numbered where a reader sees it;
 * `signals.tier` is its key, for the agents' briefs only.
 */
export function universe(W = loadApp()) {
	const g = (n) => W.get(n);
	const slugify = g('slugify');
	const rows = [];
	const push = (r) => rows.push(KEY_ALIAS[r.key] ? { ...r, key: KEY_ALIAS[r.key] } : r);

	const TIER_NAMES = g('TIER_NAMES');
	const LORE = g('LORE') || {};
	for (const c of g('COCKTAILS')) {
		push({
			key: c.name, name: c.name, kind: 'card', src: 'Cocktails', sub: 'cocktails', metable: true,
			fixed: c.tier <= 2 ? 1 : c.tier === 3 ? 2 : undefined,
			signals: { tier: c.tier, book: TIER_NAMES[c.tier], family: c.family, spirit: c.spirit, method: c.method, glass: c.glass, note: clip(c.note, 120), story: clip(LORE[c.name], 140) }
		});
	}
	for (const s of g('SHOTS')) push({ key: 'Shots · ' + s.name, name: s.name, kind: 'card', src: 'Shots', sub: 'shots', metable: true, signals: { cat: s.cat, note: clip(s.note, 120) } });
	for (const d of g('NA_DRINKS')) push({ key: 'Zero Proof · ' + d.name, name: d.name, kind: 'card', src: 'Zero Proof', sub: 'shots', metable: true, signals: { cat: d.cat, why: clip(d.why, 120) } });
	for (const x of g('ONTAP_REF')) push({ key: 'On Tap · ' + x.name, name: x.name, kind: 'card', src: 'On Tap', sub: 'ontap', metable: true, signals: { dom: x.dom, cat: x.cat, note: clip(x.note, 140) } });
	for (const x of g('COFFEE_REF')) push({ key: 'Coffee · ' + x.name, name: x.name, kind: 'card', src: 'Coffee', sub: 'coffee', metable: true, signals: { dom: x.dom, cat: x.cat, note: clip(x.note, 140) } });

	const topicOf = g('topicOf');
	for (const k of g('KNOWLEDGE')) {
		const topic = topicOf(k);
		const sub = topic === 'ontap' ? 'ontap' : topic === 'service' || topic === 'wine' ? 'stick' : null;
		push({
			key: 'q:' + slugify(k.q).slice(0, 64), name: clip(k.q, 90), kind: 'question', topic, sub, metable: true,
			signals: { topic, q: clip(k.q, 220), answer: clip(k.options[k.a], 120), explain: clip(k.explain, 160) }
		});
	}
	for (const d of g('DRILLS')) push({ key: 'drill:' + d.id, name: d.name, kind: 'drill', sub: DRILL_SUB[d.id] || 'technique', metable: true, signals: { unit: d.unit, desc: clip(d.desc, 400), hidden: !!d.hidden } });

	const section = (tab, sub, key, title, rowsOf) => push({ key: 'sec:' + tab + '/' + key, name: title, kind: 'section', tab, secKey: key, sub, metable: false, signals: { tab, lessons: rowsOf.slice(0, 8) } });
	for (const s of g('SERVICE_STUDY')) section('service', 'stick', s.key, s.title, s.rows.map((r) => r[0]));
	for (const s of g('ONTAP_STUDY')) section('ontap', 'ontap', s.key, s.title, s.rows.map((r) => r[0]));
	for (const s of g('COFFEE_STUDY')) section('coffee', 'coffee', s.key, s.title, s.rows.map((r) => r[0]));
	for (const s of g('STUDY')) {
		const sub = NOTE_SUB[s.title];
		if (!sub) throw new Error(`Study Notes section "${s.title}" has no subsection in tools/levels/lib.mjs NOTE_SUB`);
		section('notes', sub, slugify(s.title), s.title, s.rows.map((r) => (Array.isArray(r) ? r[0] : r.t || r.title || String(r)).toString()));
	}

	for (const p of g('PRODUCERS')) push({ key: 'prod:' + slugify(p.name), name: p.name, kind: 'producer', sub: 'spirits', metable: false, signals: { cat: p.cat, where: p.where, why: clip(p.why, 120) } });
	for (const f of g('FLIGHTS')) push({ key: 'flight:' + slugify(f.name), name: f.name, kind: 'flight', sub: 'spirits', metable: false, signals: { cat: f.cat, teaches: clip(f.teaches, 140) } });
	for (const p of g('PREPS')) push({ key: 'prep:' + slugify(p.name), name: p.name, kind: 'prep', sub: 'prep', metable: false, signals: { cat: p.cat, uses: clip(p.uses, 120), keeps: clip(p.keeps, 80) } });
	for (const l of g('PREP_LISTS')) push({ key: 'preplist:' + slugify(l[0]), name: l[0], kind: 'preplist', sub: 'prep', metable: false, signals: { items: (l[1] || []).length } });
	for (const s of g('PREP_SAFETY')) push({ key: 'prepsafe:' + slugify(s[0]), name: s[0], kind: 'prepsafe', sub: 'prep', metable: false, signals: { text: clip(s[1], 160) } });
	for (const p of g('PLATES')) push({ key: 'plate:' + p.id, name: p.title, kind: 'plate', sub: 'technique', metable: false, signals: { caption: clip(p.caption, 140) } });
	for (const r of g('RIFFS')) push({ key: 'riff:' + slugify(r.label), name: r.label, kind: 'riff', sub: 'cocktails', metable: false, signals: { family: r.fam } });

	const seen = new Map();
	for (const r of rows) {
		if (seen.has(r.key)) throw new Error(`two items share the key ${JSON.stringify(r.key)}: ${seen.get(r.key)} and ${r.kind}`);
		seen.set(r.key, r.kind);
	}
	return rows;
}

/** The standard, read out of README.md's "## The standard" section. */
export function readStandard() {
	const text = readFileSync(README, 'utf8');
	const section = (text.split(/^## The standard\s*$/m)[1] ?? '').split(/^## /m)[0].trim();
	if (!section) throw new Error('tools/levels/README.md has no "## The standard" section');
	return section;
}

/** Non-ASCII to \uXXXX, so the emitted script is pure ASCII (the films rule). */
export const asciiJson = (v) => JSON.stringify(v).replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

/** The four levels' names, in key order. The blurbs live in js/levels.js. */
export const LEVEL_NAMES = ['Barback', 'Bartender', 'Head Bartender', 'Bar Manager'];

/**
 * The emitted script, from the authored placements, in universe order within
 * each subsection and level. One function, called by set-levels.mjs to write
 * the file and by tools/check-levels.mjs to prove the file is exactly this.
 *
 * @param {Array<{ key: string, level: number, sub: string }>} placements
 * @param {Array<{ key: string }>} uni
 */
export function emitDataLevels(placements, uni) {
	const at = new Map(placements.map((p) => [p.key, p]));
	/** @type {Record<string, Record<string, string[]>>} */
	const items = {};
	for (const s of SUB_KEYS) items[s] = { 1: [], 2: [], 3: [], 4: [] };
	for (const r of uni) {
		const p = at.get(r.key);
		if (!p) continue;
		items[p.sub][p.level].push(r.key);
	}
	return (
		'/* The four levels: the level every item of the Ledger sits at, by subsection\n' +
		'   and level. MACHINE WRITTEN by tools/levels/set-levels.mjs from\n' +
		'   tools/levels/placements.json, which is the authored record with the reason\n' +
		'   for every item; never hand-edit this file (edit the placements and run\n' +
		'   node tools/levels/set-levels.mjs --emit). Pure ASCII: every non-ASCII\n' +
		'   character is a backslash-u escape. tools/check-levels.mjs holds it to the\n' +
		'   placements and to the items the app ships. js/levels.js reads it. */\n' +
		'const LEVEL_ITEMS = ' + asciiJson(items) + ';\n' +
		'/* the Outside Of Time wing\'s keys for items it renamed, to the Ledger\'s\n' +
		'   (tools/levels/lib.mjs KEY_ALIAS) */\n' +
		'const LEVEL_KEY_ALIAS = ' + asciiJson(KEY_ALIAS) + ';\n'
	);
}

/** Every problem with a full set of placements against the universe. */
export function problemsOf(placements, uni) {
	const problems = [];
	const byKey = new Map(uni.map((r) => [r.key, r]));
	const seen = new Set();
	for (const p of placements) {
		const r = byKey.get(p.key);
		const where = JSON.stringify(p.key);
		if (!r) { problems.push(`${where}: not an item the Ledger ships`); continue; }
		if (seen.has(p.key)) problems.push(`${where}: placed twice`);
		seen.add(p.key);
		if (![1, 2, 3, 4].includes(p.level)) problems.push(`${where}: level ${JSON.stringify(p.level)} is not 1 to 4`);
		const named = (n) => LEVEL_NAMES[n - 1] || JSON.stringify(n);
		if (r.fixed && p.level !== r.fixed) problems.push(`${where}: ${r.signals.book} is ${named(r.fixed)}, every drink, by rule; placed at ${named(p.level)}`);
		/* every book after the first three (keys 4 to 12) */
		if (r.kind === 'card' && r.src === 'Cocktails' && r.signals.tier >= 4 && p.level === 1) problems.push(`${where}: ${r.signals.book} is never Barback; only the Core Dozen and the Classics Canon are`);
		if (typeof p.reason !== 'string' || p.reason.trim().length < 12) problems.push(`${where}: carries no reason`);
		const want = r.sub ?? null;
		if (want && p.sub !== want) problems.push(`${where}: filed under ${JSON.stringify(p.sub)}, belongs to ${want}`);
		if (!want && !CRAFT_SUBS.includes(p.sub)) problems.push(`${where}: a craft question needs a subsection, one of ${CRAFT_SUBS.join(', ')}; has ${JSON.stringify(p.sub)}`);
	}
	for (const r of uni) if (!seen.has(r.key)) problems.push(`${JSON.stringify(r.key)} (${r.kind}) has no level`);
	return problems;
}
