#!/usr/bin/env node
/**
 * The briefs for the placement run: everything an assigner, a challenger and a
 * reconciler need, as JSON, read from the files that enforce it.
 *
 *   node tools/levels/brief.mjs [--only cocktails,questions-craft] [--chunk 40]
 *
 * It WRITES one brief per chunk to tools/levels/out/<group>-<n>.brief.json (the
 * standard, the four levels, the fixed placements as the calibration set,
 * every item of the group with its signals) and PRINTS the small object to
 * pass as the Workflow's `args`: the briefs' directory, the levels, the
 * chunks as keys only. A Workflow script has no filesystem; its agents do.
 *
 * The groups follow the item kinds, so an assigner reads like beside like:
 * the cocktails a tier at a time, the shots and zero-proof drinks, the On Tap
 * cards, coffee and tea (cards and sections together), the On Tap questions,
 * the Behind the Stick questions, the craft questions (which also need a
 * subsection), and everything read (sections, producers, flights, prep,
 * plates, riffs, drills).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { universe, readStandard, OUT_DIR, SUBSECTIONS, CRAFT_SUBS, LEVEL_NAMES } from './lib.mjs';

const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const size = args.includes('--chunk') ? Number(args[args.indexOf('--chunk') + 1]) : 40;

const uni = universe();
const standard = readStandard();

/** @type {Record<string, { title: string, rows: any[], needSub?: boolean, signals: string }>} */
const GROUPS = {
	cocktails: {
		title: 'Cocktails, tiers 4 to 12',
		rows: uni.filter((r) => r.kind === 'card' && r.src === 'Cocktails' && !r.fixed).sort((a, b) => a.signals.tier - b.signals.tier),
		signals: 'tier and book (the themed book the drink is filed in: the fixed rules put tiers 1 and 2 at I and tier 3 at II; every drink here is placed at II, III or IV, NEVER I), family, spirit, method, glass, note, and the opening of its story (the lore). Within a book, the drinks a good bar pours weekly sit lower than its last members.'
	},
	shots: {
		title: 'Shots and zero-proof drinks',
		rows: uni.filter((r) => r.kind === 'card' && (r.src === 'Shots' || r.src === 'Zero Proof')),
		signals: 'cat (the board it sits on: Classic Shooters and Zero-Proof Classics lean low; Industry Handshakes, Flaming & Novelty, Bitter & Complex and Global Refreshers lean higher), and the note or the why.'
	},
	'ontap-cards': {
		title: 'On Tap cards',
		rows: uni.filter((r) => r.kind === 'card' && r.src === 'On Tap'),
		signals: 'dom (styles, faults, cider, sake) and cat, and the note. The everyday lagers and ales a bar pours lean I or II; the fault board, the Belgian and sour styles, cider, perry, sake and mead lean III; the rarest styles and the brewing process lean IV.'
	},
	coffee: {
		title: 'Coffee and tea: cards and sections',
		rows: uni.filter((r) => r.sub === 'coffee' && (r.kind === 'card' || r.kind === 'section')),
		signals: 'for a card, dom (shot, milk, filter, leaf, faults) and cat and the note; for a section, the tab and its lesson titles. The standard puts coffee and tea done properly, with their faults, at IV; the drinks a bar sells every morning (espresso, the milk drinks) sit lower.'
	},
	'questions-ontap': {
		title: 'On Tap questions',
		rows: uni.filter((r) => r.kind === 'question' && r.topic === 'ontap'),
		signals: 'the question, its answer and its explanation. Place a question at the level of the lesson it tests: the pour and the beer-clean glass I, the system, gas and the common faults II, the styles in full, cider, perry, sake and mead III, cellar and condition and how beer is made IV.'
	},
	'questions-stick': {
		title: 'Behind the Stick questions (service and wine)',
		rows: uni.filter((r) => r.kind === 'question' && (r.topic === 'service' || r.topic === 'wine')),
		signals: 'topic (service or wine), the question, its answer and its explanation. The legal floor in its plainest cases I; wine by the glass, the register, the money and the law in its cases II; wine service in sequence, conflict and safety on the floor, the trail standards III; the law at its edges and the ledger\'s money in full IV.'
	},
	'questions-craft': {
		title: 'Craft questions (spirits, technique, ingredients, balance)',
		rows: uni.filter((r) => r.kind === 'question' && !r.sub),
		needSub: true,
		signals: 'the question, its answer and its explanation. These carry no subsection yet: give each one the subsection it teaches, one of ' + CRAFT_SUBS.join(', ') + ' (cocktails = a named drink, a family or a spec; spirits = a spirit, its production or a producer; technique = shaking, stirring, dilution, the hands; prep = syrups, citrus, infusions, the walk-in; stick = service; coffee = coffee or tea; shots = shots or zero proof).'
	},
	read: {
		title: 'Everything read: drills, sections, producers, flights, prep, plates, riff frames',
		rows: uni.filter((r) => r.kind === 'drill' || (r.kind === 'section' && r.sub !== 'coffee') || ['producer', 'flight', 'prep', 'preplist', 'prepsafe', 'plate', 'riff'].includes(r.kind)),
		signals: 'kind and the item\'s own signals. A drill is placed at the level whose standard names it (the Barback\'s hands, the Bartender\'s drills timed to service, the Head Bartender\'s double strain, rail and blind tasting). A section of a reference tab at the level of most of its lessons; a producer at the level a guest would name it (the benchmark houses of the well lower, the specialist houses higher); a flight at III or IV (the standard puts the flights at the Head Bartender\'s palate); a prep sheet at the level a shift depends on it; the opening and closing lists and the label and shelf-life rules at I; the technique plates at the level of the technique; the riff frames at IV.'
	}
};

/** Even chunks of at most `size`. */
function chunk(rows, n) {
	const k = Math.max(1, Math.ceil(rows.length / n));
	const per = Math.ceil(rows.length / k);
	const out = [];
	for (let i = 0; i < rows.length; i += per) out.push(rows.slice(i, i + per));
	return out;
}

const calibration = uni
	.filter((r) => r.fixed)
	.map((r) => ({ name: r.name, level: r.fixed, tier: r.signals.tier, book: r.signals.book, family: r.signals.family }));

mkdirSync(OUT_DIR, { recursive: true });
const chunks = [];
const totals = {};
for (const [group, G] of Object.entries(GROUPS)) {
	if (only && !only.has(group)) continue;
	/* One brief per CHUNK, one roster row per line: an agent reads its own
	   forty rows and the standard, not three hundred rows it was never asked
	   about. */
	const rowLine = (r) => JSON.stringify({ key: r.key, name: r.name, kind: r.kind, sub: r.sub ?? undefined, ...r.signals });
	const parts = chunk(G.rows, size);
	parts.forEach((rows, i) => {
		const head = {
			group,
			chunk: `${i + 1} of ${parts.length}`,
			title: G.title,
			standard,
			levels: LEVEL_NAMES.map((name, j) => ({ level: j + 1, name })),
			subsections: SUBSECTIONS,
			signals: G.signals,
			needSub: Boolean(G.needSub),
			craftSubs: G.needSub ? CRAFT_SUBS : undefined,
			calibration
		};
		const text = JSON.stringify(head, null, 1).replace(/\n}$/, ',\n "roster": [\n') + rows.map(rowLine).join(',\n') + '\n ]\n}\n';
		JSON.parse(text);
		writeFileSync(join(OUT_DIR, `${group}-${i + 1}.brief.json`), text);
		chunks.push({ group, title: G.title, n: i + 1, of: parts.length, needSub: Boolean(G.needSub), rows: rows.map((r) => ({ key: r.key })) });
	});
	totals[group] = G.rows.length;
	console.error(`  ${group}: ${G.rows.length} item(s) in ${parts.length} chunk(s)`);
}

process.stdout.write(
	JSON.stringify({
		briefDir: OUT_DIR.split('\\').join('/'),
		levels: LEVEL_NAMES.map((name, i) => ({ level: i + 1, name })),
		craftSubs: CRAFT_SUBS,
		totals,
		chunks
	}) + '\n'
);
