/**
 * The House's wiring gate. Run: `node tools/check-house-wiring.mjs` (exits 1
 * on any problem).
 *
 * progress.bar is a PROJECTION of the House (js/house-bar.js): every record
 * on it has passed saveBarRecord, the one door that derives `draft`, carries
 * `maitre` and `house`, moves the 'My Bar · name' card on a rename and tells
 * the House of the save; and every record leaves by removeBarRecord, the one
 * door that takes the card with it. A write of progress.bar anywhere else is
 * a record the House never hears of, or one that skipped the shape pass, and
 * both failures are silent. So this gate greps the SHIPPED scripts for every
 * write of progress.bar (`progress.bar =`, `progress.bar.push`, an indexed
 * assignment, a splice) and names the function each sits in; a write outside
 * the whitelist below fails the build with the file, the line and the rule.
 *
 * The whitelist is the doors and the three places that rebuild the whole
 * list from stored records: ui-menu.js saveBarRecord, removeBarRecord and
 * normalizeBarRecords; app.js's boot IIFE; ui-new.js dataImport, both
 * branches; and house-bar.js houseSyncIn, the wake, which writes through the
 * doors and is named so a future hand that writes directly there is at least
 * writing where the comment says the rules are.
 *
 * The owner of a line is the nearest top-level function head above it (or
 * the boot IIFE's opening line), so a write inside a nested arrow reads as
 * the declaration it sits under; the scripts keep their doors as top-level
 * declarations, which is what makes the attribution exact.
 *
 * Proven able to fail: a `progress.bar.push(rec)` planted in ui-levels.js
 * (or anywhere outside the list) exits 1 and names it. LEDGER_JS=<dir> points
 * the gate at another copy of the scripts, which is how the plant is run
 * without touching the tree.
 *
 * This file also runs inside the Outside Of Time wing, from ledger/tools/;
 * keep the two copies identical.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = process.env.LEDGER_JS || join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

/* file: the functions that may write progress.bar there; 'boot' is app.js's
   async boot IIFE, which has no name */
const ALLOWED = {
	'ui-menu.js': ['saveBarRecord', 'removeBarRecord', 'normalizeBarRecords'],
	'app.js': ['boot'],
	'ui-new.js': ['dataImport'],
	'house-bar.js': ['houseSyncIn']
};

/* a write: an assignment to progress.bar (not a comparison), a push, an
   indexed assignment, a splice, an unshift */
const WRITE = /progress\.bar(?:\s*=(?!=)|\s*\[[^\]]*\]\s*=(?!=)|\.(?:push|splice|unshift|pop|shift)\s*\()/;
/* the top-level function or boot IIFE a line sits under, read upwards */
const FUNCTION_HEAD = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
const BOOT_HEAD = /^\(async\s*\(\)\s*=>\s*\{/;

const problems = [];
let writes = 0;
for (const file of readdirSync(JS).filter((f) => f.endsWith('.js')).sort()) {
	const lines = readFileSync(join(JS, file), 'utf8').split(/\r?\n/);
	lines.forEach((line, i) => {
		/* a comment line is not a write */
		if (/^\s*(?:\/\*|\*|\/\/)/.test(line)) return;
		if (!WRITE.test(line)) return;
		writes++;
		let owner = '(top level)';
		for (let k = i; k >= 0; k--) {
			const m = lines[k].match(FUNCTION_HEAD);
			if (m) { owner = m[1]; break; }
			if (BOOT_HEAD.test(lines[k])) { owner = 'boot'; break; }
		}
		const ok = (ALLOWED[file] || []).includes(owner);
		if (!ok) problems.push(`${file}:${i + 1} writes progress.bar inside ${owner}, which is not a door: ${line.trim()}`);
	});
}

if (problems.length) {
	console.error('check-house-wiring: FAILED');
	for (const p of problems) console.error('  ' + p);
	console.error('  The doors are saveBarRecord and removeBarRecord (ui-menu.js); the list is rebuilt whole only at boot and in dataImport.');
	process.exit(1);
}
console.log(`  ✓ progress.bar is written only through its doors (${writes} writes, all inside ${Object.values(ALLOWED).flat().join(', ')})`);
