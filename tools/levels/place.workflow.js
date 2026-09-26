export const meta = {
	name: 'ledger-levels-placement',
	description: 'Place every unlevelled item of the Bartender\'s Ledger against the written standard: an assigner per chunk, a challenger arguing each placement from the floor, a reconciler, then one cross-subsection critic with one bounded repair',
	phases: [
		{ title: 'Assign', detail: 'each chunk placed against the standard, with a reason per item' },
		{ title: 'Challenge', detail: 'every placement argued from the floor' },
		{ title: 'Reconcile', detail: 'each challenge answered: moved or kept, with the fact' },
		{ title: 'Critic', detail: 'the whole placement read across subsections, at most a tenth moved' }
	]
}

/* Run with the Workflow tool:
     scriptPath: a copy of this file inside the session's working directory
     args:       the JSON printed by  node tools/levels/brief.mjs
   Save what the run returned, then
     node tools/levels/set-levels.mjs <the saved run>
     node tools/check-levels.mjs                                               */

const B = args
const LEVEL_NAMES = B.levels.map((l) => `${l.level} = ${l.name}`).join(', ')

const placementSchema = (needSub, min = 1) => ({
	type: 'object',
	properties: {
		key: { type: 'string', description: 'the roster key, copied exactly, character for character' },
		level: { type: 'integer', minimum: min, maximum: 4, description: `the level key: ${LEVEL_NAMES}` },
		...(needSub ? { sub: { type: 'string', enum: B.craftSubs, description: 'the subsection this question teaches' } } : {}),
		reason: { type: 'string', minLength: 20, maxLength: 240, description: 'one sentence: which signal or which line of the standard places it here' }
	},
	required: needSub ? ['key', 'level', 'sub', 'reason'] : ['key', 'level', 'reason']
})
const PLACEMENTS = (needSub, min) => ({ type: 'object', properties: { placements: { type: 'array', items: placementSchema(needSub, min) } }, required: ['placements'] })
/* tiers 4 to 12 are never Level I: the schema holds it, not only the prompt */
const minFor = (chunk) => (chunk.group === 'cocktails' ? 2 : 1)

const CHALLENGES = {
	type: 'object',
	properties: {
		challenges: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					key: { type: 'string' },
					proposed: { type: 'integer', minimum: 1, maximum: 4 },
					because: { type: 'string', minLength: 20, maxLength: 300 }
				},
				required: ['key', 'proposed', 'because']
			}
		}
	},
	required: ['challenges']
}

const reconciledSchema = (needSub, min) => ({
	type: 'object',
	properties: {
		placements: { type: 'array', items: placementSchema(needSub, min) },
		dispositions: {
			type: 'array',
			items: {
				type: 'object',
				properties: { key: { type: 'string' }, action: { type: 'string', enum: ['moved', 'kept'] }, reason: { type: 'string' } },
				required: ['key', 'action', 'reason']
			}
		}
	},
	required: ['placements', 'dispositions']
})

const CRITIC = {
	type: 'object',
	properties: {
		ok: { type: 'boolean' },
		moves: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					group: { type: 'string' },
					key: { type: 'string' },
					to: { type: 'integer', minimum: 1, maximum: 4 },
					because: { type: 'string', minLength: 20, maxLength: 300 }
				},
				required: ['group', 'key', 'to', 'because']
			}
		},
		notes: { type: 'string' }
	},
	required: ['ok', 'moves', 'notes']
}

const RULES = `
THE FOUR LEVELS are the whole Bartender's Ledger's ladder: I Barback, II Bartender, III Head Bartender, IV Bar Manager. A reader meets each of eight subsections (Cocktails; Shots and Zero Proof; On Tap; Spirits and Producers; Technique and Method; Behind the Stick; The Prep Room; Coffee and Tea) level by level, and the home says how much of each level is met. NOTHING IS LOCKED: a level guides, it never bars. So an item placed LOW costs nothing, and an item placed HIGH is hidden from the reader who most needs it. TIES BREAK DOWN.

You place items by their LEVEL KEY (${LEVEL_NAMES}), against the written standard in the brief, weighing the signals in the order the standard gives them. The FIXED placements (tiers 1 and 2 of the cocktail canon at Level I, tier 3 at Level II) are the calibration set, listed in the brief; no cocktail of tier 4 to 12 is ever Level I.

A REASON names the signal or the line of the standard that decides it, in one sentence, so a person can disagree with it later. No quotas: do not spread items to make the numbers even. The supply minimums in the standard only catch a level left empty; the critic watches them.

HARD RULES: copy every key EXACTLY from the roster, character for character (keys carry accents and a middle dot, ' · '); place every key you are given and no other; one level per key; British English; no em dash and no en dash (use a comma, a colon or a full stop); never a word about the reader ("beginner", "advanced"): a level describes what is asked at that level, never who is asking.
`

const BRIEF = (chunk) => `
THE BRIEF is a JSON file on disk. READ IT FIRST, in full, with your file-reading tool: ${B.briefDir}/${chunk.group}-${chunk.n}.brief.json
It holds: "standard" (the four levels as the owner wrote them, the signals in the order they weigh, and the supply), "levels", "subsections", "signals" (what the fields on this group's roster rows mean and which way they lean), "calibration" (the fixed placements: every tier 1 and 2 drink at I, every tier 3 drink at II), and "roster" (every item of this chunk with its signals, one per line).${chunk.needSub ? ` This group is CRAFT QUESTIONS: give each one a "sub", the subsection it teaches, one of ${B.craftSubs.join(', ')}.` : ''}
`

/* A chunk carries its keys (rows) or only how many it holds (count): with
   count, every agent reads its keys from the chunk's brief, which keeps the
   Workflow's args small, and set-levels.mjs refuses anything missing or
   placed twice. */
const countOf = (c) => (c.rows ? c.rows.length : c.count)
const rosterText = (c) => (c.rows ? JSON.stringify(c.rows, null, 1) : 'They are every row of the roster in the brief, in order: copy each key from there.')

log(`${B.chunks.length} chunk(s) across ${Object.keys(B.totals).length} group(s): ${Object.entries(B.totals).map(([k, n]) => `${k} ${n}`).join(', ')}`)

const results = await pipeline(
	B.chunks,
	(chunk) =>
		agent(
			`${RULES}${BRIEF(chunk)}
YOU ARE THE ASSIGNER for "${chunk.title}", chunk ${chunk.n} of ${chunk.of}. Place EACH of these ${countOf(chunk)} roster keys, and only these, at one level, with a reason${chunk.needSub ? ' and a subsection' : ''}. Find each one's full row (its signals) in the brief's "roster" before you place it. Read the standard's paragraph for each level before you begin.

${rosterText(chunk)}

Return the placements through the schema. Before you return, check that every key above is placed exactly once, copied exactly, and that no reason mentions the reader.`,
			{ label: `assign:${chunk.group}:${chunk.n}`, phase: 'Assign', schema: PLACEMENTS(chunk.needSub, minFor(chunk)), effort: 'high' }
		),
	async (drafted, chunk) => {
		const placements = (drafted && drafted.placements) || []
		const keys = chunk.rows ? new Set(chunk.rows.map((r) => r.key)) : null
		const missing = chunk.rows ? chunk.rows.filter((r) => !placements.some((p) => p.key === r.key)) : []
		const short = chunk.rows ? 0 : Math.max(0, chunk.count - placements.length)
		if (short) log(`${chunk.group} ${chunk.n}: the assigner placed ${placements.length} of ${chunk.count}; the reconciler is asked for the rest`)
		if (missing.length) log(`${chunk.group} ${chunk.n}: the assigner left ${missing.length} key(s) unplaced; the reconciler is asked for them`)
		const challenged = await agent(
			`${RULES}${BRIEF(chunk)}
YOU ARE THE CHALLENGER, from the floor. You have run a bar, hired and trained its staff and written its menu; you know which drink a guest orders on a Tuesday, which question a trail shift is marked on, and what a barback is actually trusted with in week one. Read every placement below against the standard and the signals in the brief and CHALLENGE the ones that are wrong: an everyday item placed high (the commonest failure, and the costly one, because it hides the item), a rare or specialist item placed low, a drink placed against its book with no argument${chunk.needSub ? ', a question filed under the wrong subsection' : ''}. Do not report what is right. For each challenge give the level you argue for and the fact that decides it.

THE PLACEMENTS:
${JSON.stringify(placements, null, 1)}`,
			{ label: `challenge:${chunk.group}:${chunk.n}`, phase: 'Challenge', schema: CHALLENGES, effort: 'high' }
		)
		const challenges = ((challenged && challenged.challenges) || []).filter((c) => !keys || keys.has(c.key)).map((c) => ({ ...c, group: chunk.group }))
		return { placements, challenges, missing, short, chunk }
	},
	async (stage) => {
		if (!stage) return null
		const { placements, challenges, missing, short, chunk } = stage
		if (!challenges.length && !missing.length && !short) return { ...stage, dispositions: [] }
		const fixed = await agent(
			`${RULES}${BRIEF(chunk)}
YOU ARE THE RECONCILER. An assigner placed these items and a challenger argued some of them from the floor. Answer EVERY challenge with a disposition: "moved" (you changed the level; say why the challenge wins) or "kept" (say why the assigner's level stands, with the fact). Decide by the standard and the signals, ties breaking DOWN. Return ALL ${countOf(chunk)} placements for this chunk (every row of the brief's roster), changed or not, each with a reason that stands on its own${chunk.needSub ? ' and a subsection' : ''}${missing.length ? `, INCLUDING these the assigner left out: ${JSON.stringify(missing.map((r) => r.key))}` : ''}${short ? `, INCLUDING the ${short} roster key(s) the assigner left out` : ''}.

THE CHUNK'S ROSTER:
${rosterText(chunk)}

CHALLENGES:
${JSON.stringify(challenges, null, 1)}

THE PLACEMENTS:
${JSON.stringify(placements, null, 1)}`,
			{ label: `reconcile:${chunk.group}:${chunk.n}`, phase: 'Reconcile', schema: reconciledSchema(chunk.needSub, minFor(chunk)), effort: 'medium' }
		)
		if (!fixed || !fixed.placements || !fixed.placements.length) {
			log(`${chunk.group} ${chunk.n}: the reconciler returned nothing; keeping the assigner's placements with the challenges undisposed`)
			return { ...stage, dispositions: [] }
		}
		return { ...stage, placements: fixed.placements, dispositions: (fixed.dispositions || []).map((d) => ({ ...d, group: chunk.group })) }
	}
)

const done = results.filter(Boolean)
if (done.length !== B.chunks.length) log(`${B.chunks.length - done.length} chunk(s) died; their items are NOT in the result. Resume the run to fill them`)

const placements = {}
const challenges = []
const dispositions = []
const unresolved = []
for (const r of done) {
	const list = placements[r.chunk.group] || (placements[r.chunk.group] = [])
	const own = r.chunk.rows ? new Set(r.chunk.rows.map((x) => x.key)) : null
	for (const p of r.placements) {
		if (own && !own.has(p.key)) { unresolved.push({ group: r.chunk.group, key: p.key, issue: 'placed a key outside its chunk' }); continue }
		const at = list.findIndex((x) => x.key === p.key)
		if (at >= 0) list[at] = p
		else list.push(p)
	}
	if (r.chunk.rows) { for (const row of r.chunk.rows) if (!list.some((p) => p.key === row.key)) unresolved.push({ group: r.chunk.group, key: row.key, issue: 'never placed' }) }
	else if (r.placements.length < r.chunk.count) unresolved.push({ group: r.chunk.group, key: `chunk ${r.chunk.n}`, issue: `${r.chunk.count - r.placements.length} of its keys never placed` })
	challenges.push(...r.challenges)
	dispositions.push(...r.dispositions)
}
const total = Object.values(placements).reduce((n, l) => n + l.length, 0)
log(`${total} placed, ${challenges.length} challenge(s), ${dispositions.filter((d) => d.action === 'moved').length} moved, ${unresolved.length} unresolved`)

phase('Critic')
const summary = Object.entries(placements).map(([group, list]) => ({
	group,
	counts: [1, 2, 3, 4].map((l) => `${l}: ${list.filter((p) => p.level === l).length}`).join(', '),
	items: list.map((p) => `${p.level}${p.sub ? ' [' + p.sub + ']' : ''} ${p.key}`)
}))
const critic = await agent(
	`${RULES}
YOU ARE THE CROSS-SUBSECTION CRITIC. Read the WHOLE placement at once, which no assigner did: every group's items with their levels, as a bare list (the fixed tier 1 to 3 cocktails are not in it; they are 33 at I and 24 at II). The briefs with the signals are on disk in ${B.briefDir}/<group>-<n>.brief.json (one per chunk); open one when a placement looks wrong and check it against the standard there.

Look for DRIFT between groups: a question placed above the drinks or lessons it tests, a producer at III whose spirit questions sit at I, a flight below the producers it compares, an On Tap question at a different level from the styles it asks about. Look for SUPPLY, which the gate enforces per level: at least 8 cocktails (tier 1 to 3 give I 33 and II 24 already), 4 shots or zero-proof cards, 2 On Tap cards and 2 On Tap questions, 4 spirits questions, 2 technique questions, 6 Behind the Stick questions (service and wine), 2 Prep Room questions and 2 coffee or tea cards; and every subsection at least one met-able unit (a card, a question or a drill) at every level. Craft questions carry a [sub]; count them into their subsection. Look for the commonest error: everyday items placed high.

Propose MOVES (a move may only change the level, never the subsection), each with the fact that decides it, most important first: supply shortfalls first, then drift. At most a tenth of each group will be applied, in your order, and the rest recorded for the operator. ok is true only if you would move nothing.

THE PLACEMENT:
${JSON.stringify(summary, null, 1)}`,
	{ label: 'critic:all', phase: 'Critic', schema: CRITIC, effort: 'high' }
)

const criticChanges = []
const criticDropped = []
if (critic && critic.moves && critic.moves.length) {
	const budget = {}
	for (const [group, list] of Object.entries(placements)) budget[group] = Math.max(1, Math.floor(list.length / 10))
	for (const m of critic.moves) {
		const list = placements[m.group]
		const p = list && list.find((x) => x.key === m.key)
		if (!p) { criticDropped.push({ ...m, why: 'not an item of that group in this run' }); continue }
		if (p.level === m.to) { criticDropped.push({ ...m, why: 'already at that level' }); continue }
		if (m.group === 'cocktails' && m.to === 1) { criticDropped.push({ ...m, why: 'tiers 4 to 12 are never Level I' }); continue }
		if (budget[m.group] <= 0) { criticDropped.push({ ...m, why: 'over the tenth this repair may move' }); continue }
		budget[m.group]--
		criticChanges.push({ group: m.group, key: m.key, from: p.level, to: m.to, because: m.because })
		p.level = m.to
		p.reason = `${m.because} (moved by the cross-subsection critic from ${criticChanges[criticChanges.length - 1].from})`
	}
	log(`critic: ${criticChanges.length} move(s) applied, ${criticDropped.length} recorded and not applied`)
}

return { placements, challenges, dispositions, criticChanges, criticDropped, critic, unresolved }
