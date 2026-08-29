/**
 * The Ledger's first gate. Run: `node tools/check.mjs` — exits non-zero on any
 * problem, and every check here has been proven able to fail before shipping.
 *
 * The data files are classic scripts sharing one global scope, so they cannot
 * be imported; they are evaluated in a vm sandbox instead, the same trick the
 * World Table's extractor uses on its source html. What is checked:
 *
 *  - every family carries 3–5 observable marks and a fault with substance
 *  - every cocktail's `family` resolves (an orphan would throw in qFamily)
 *  - no mark or fault names a specific cocktail — a family standard is read
 *    beside up to 93 drinks, and a mark true of one is false copy on the rest
 *  - the mark-vs-membership forks stay honest: families whose members split
 *    on method may only speak about the fork behind a condition word
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../js/data-core.js', import.meta.url), 'utf8');
const { COCKTAILS, FAMILIES } = vm.runInNewContext(src + ';({COCKTAILS,FAMILIES})', {});

const problems = [];

// ---- shape ---------------------------------------------------------------
for (const [name, f] of Object.entries(FAMILIES)) {
	if (!Array.isArray(f.marks) || f.marks.length < 3 || f.marks.length > 5) {
		problems.push(`family "${name}": ${f.marks?.length ?? 0} marks — the standard is 3–5`);
	}
	if (typeof f.fault !== 'string' || f.fault.length < 40) {
		problems.push(`family "${name}": fault missing or too thin to diagnose anything`);
	}
	if (!f.formula || !f.lesson || !f.parent) {
		problems.push(`family "${name}": lost formula/lesson/parent`);
	}
}

// ---- membership ------------------------------------------------------------
const orphans = COCKTAILS.filter((c) => !FAMILIES[c.family]);
if (orphans.length) {
	problems.push(`cocktails with no family: ${orphans.map((c) => c.name).join(', ')}`);
}

// ---- no smuggled drinks ------------------------------------------------------
// Distinctive names only (len > 6) so "Punch" cannot collide with the family.
const names = COCKTAILS.map((c) => c.name).filter((n) => n.length > 6);
for (const [fam, f] of Object.entries(FAMILIES)) {
	const text = [...(f.marks ?? []), f.fault ?? ''].join(' ').toLowerCase();
	for (const n of names) {
		if (text.includes(n.toLowerCase())) {
			problems.push(`family "${fam}" names a specific drink in its standard: "${n}"`);
		}
	}
}

// ---- the forks stay behind condition words ------------------------------------
// A family whose members split on a method may only assert that method behind
// "where/served/members/whenever". Measured from the data, not assumed.
const CONDITION = /\b(where|served|members|whenever|to what the serve asks)\b/i;
const forks = [
	['Sour', /shak/i, 'shak'],
	['Highball', /sparkle|carbonat/i, 'sparkle'],
	['Spirit & Vermouth', /stirred/i, 'stirred'],
	['Egg & Cream', /dry shake|foam|head/i, 'dry shake'],
	['Old Fashioned', /dissolved|stirred/i, 'dissolved'],
	['Hot', /cream|float/i, 'float'],
	['Duo & Trio', /float/i, 'float'],
];
for (const [fam, re] of forks) {
	const f = FAMILIES[fam];
	if (!f?.marks) continue;
	for (const m of f.marks) {
		if (re.test(m) && !CONDITION.test(m)) {
			// Only a problem when the family genuinely forks on it.
			const members = COCKTAILS.filter((c) => c.family === fam);
			const methodBlob = (c) => (c.method + ' ' + c.spec.join(' ')).toLowerCase();
			const hits = members.filter((c) => re.test(methodBlob(c))).length;
			if (hits > 0 && hits < members.length) {
				problems.push(
					`family "${fam}": mark asserts a forked property without a condition word — "${m.slice(0, 60)}…" (${hits}/${members.length} members)`
				);
			}
		}
	}
}

if (problems.length) {
	for (const p of problems) console.error('  ✗ ' + p);
	console.error(`\n${problems.length} problem(s).`);
	process.exit(1);
}
console.log(`  ✓ ${Object.keys(FAMILIES).length} families, ${COCKTAILS.length} cocktails — marks sound, membership closed, no smuggled drinks`);
