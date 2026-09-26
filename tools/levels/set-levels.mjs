#!/usr/bin/env node
/**
 * Write a placement run into the authored record, and the record into the app.
 *
 *   node tools/levels/set-levels.mjs <run.json>   the run, then the emit
 *   node tools/levels/set-levels.mjs --emit       placements.json -> js/data-levels.js
 *
 * The run is what tools/levels/place.workflow.js returned (or the Workflow
 * tool's output file, whose `result` is that object):
 *   { placements: { <group>: [{ key, level, reason, sub? }] }, challenges,
 *     dispositions, criticChanges, criticDropped, critic, unresolved }
 *
 * It decides nothing. It lays the run over the universe (tools/levels/lib.mjs)
 * and refuses, all or nothing:
 *   - a key that is not an item, or one placed twice
 *   - an item left without a level (the fixed ones are filled here, by rule)
 *   - a level outside 1 to 4, a fixed rule broken (tiers 1 and 2 at I, tier 3
 *     at II, tiers 4 to 12 never at I), a placement with no reason
 *   - a craft question with no subsection or one outside CRAFT_SUBS
 * then writes tools/levels/placements.json (one item per line, universe
 * order), tools/levels/audit/<group>.json, and js/data-levels.js.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { universe, emitDataLevels, problemsOf, AUDIT_DIR, DATA_FILE, ROOT } from './lib.mjs';

const PLACEMENTS = join(ROOT, 'tools', 'levels', 'placements.json');

/** @param {string} m @param {string[]} [list] @returns {never} */
const die = (m, list = []) => {
	console.error(`\n  ✗ ${m}`);
	for (const p of list.slice(0, 40)) console.error(`      ${p}`);
	if (list.length > 40) console.error(`      ... and ${list.length - 40} more`);
	console.error('\n  nothing was written\n');
	process.exit(1);
};

/** One line per item, so a move is a one-line diff. */
const serialize = (placements) => `[\n${placements.map((p) => `\t${JSON.stringify(p)}`).join(',\n')}\n]\n`;

const uni = universe();
const argv = process.argv.slice(2);

if (argv.includes('--emit')) {
	if (!existsSync(PLACEMENTS)) die('tools/levels/placements.json does not exist yet: run a placement first');
	const placements = JSON.parse(readFileSync(PLACEMENTS, 'utf8'));
	const problems = problemsOf(placements, uni);
	if (problems.length) die(`${problems.length} problem(s) in tools/levels/placements.json`, problems);
	writeFileSync(DATA_FILE, emitDataLevels(placements, uni));
	console.log(`  js/data-levels.js emitted from ${placements.length} placements`);
	process.exit(0);
}

const file = argv.find((a) => !a.startsWith('--'));
if (!file) die('usage: node tools/levels/set-levels.mjs <run.json> | --emit');
const raw = JSON.parse(readFileSync(file, 'utf8'));
const run = raw && raw.result ? (typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result) : raw;
if (!run || typeof run.placements !== 'object') die('the input is { placements: { <group>: [...] } } and this one has none');

const byKey = new Map(uni.map((r) => [r.key, r]));
const placements = [];
const groupOf = new Map();
for (const [group, rows] of Object.entries(run.placements)) {
	for (const p of rows || []) {
		const r = byKey.get(p.key);
		placements.push({ key: p.key, level: p.level, sub: r?.sub ?? p.sub, reason: String(p.reason ?? '').trim() });
		groupOf.set(p.key, group);
	}
}
/* the rules' own placements, which no agent was asked for */
for (const r of uni) {
	if (r.fixed && !groupOf.has(r.key)) {
		placements.push({ key: r.key, level: r.fixed, sub: r.sub, reason: `Tier ${r.signals.tier}, ${r.signals.book}: Level ${r.fixed} by the owner's rule (tiers 1 and 2 are Level I, tier 3 is Level II).` });
		groupOf.set(r.key, 'fixed');
	}
}

const problems = problemsOf(placements, uni);
if (problems.length) die(`${problems.length} problem(s) with the placements`, problems);

/* universe order, so a re-run diffs as moves */
const order = new Map(uni.map((r, i) => [r.key, i]));
placements.sort((a, b) => order.get(a.key) - order.get(b.key));
writeFileSync(PLACEMENTS, serialize(placements));

mkdirSync(AUDIT_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const forGroup = (list, group) => (Array.isArray(list) ? list.filter((x) => x && (x.group === group || groupOf.get(x.key) === group)) : []);
for (const group of new Set([...groupOf.values()].filter((g) => g !== 'fixed'))) {
	const mine = placements.filter((p) => groupOf.get(p.key) === group);
	writeFileSync(
		join(AUDIT_DIR, `${group}.json`),
		JSON.stringify(
			{
				assigned: today,
				standard: 'tools/levels/README.md, "The standard"',
				counts: [1, 2, 3, 4].map((l) => mine.filter((p) => p.level === l).length),
				challenges: forGroup(run.challenges, group),
				dispositions: forGroup(run.dispositions, group),
				criticChanges: forGroup(run.criticChanges, group),
				criticDropped: forGroup(run.criticDropped, group),
				unresolved: forGroup(run.unresolved, group),
				notes: run.critic && run.critic.notes ? run.critic.notes : ''
			},
			null,
			'\t'
		) + '\n'
	);
}

writeFileSync(DATA_FILE, emitDataLevels(placements, uni));
const per = [1, 2, 3, 4].map((l) => `${l}: ${placements.filter((p) => p.level === l).length}`).join(', ');
console.log(`  ${placements.length} placed (${per}); tools/levels/placements.json, tools/levels/audit/, js/data-levels.js written`);
console.log('  now: node tools/check-levels.mjs');
