/* ---------------- SPACED REPETITION: SM-2-LITE ----------------
   Layers onto progress.cards records ({r, w}) without touching those
   fields. Added per card: ef (ease), ivl (days), reps (win streak),
   due (epoch ms), last (epoch ms). Binary grades — the flashcard UI
   is right/wrong, so no Hard/Good/Easy buttons. */

const SRS_DAY = 86400000;

/* Longest interval we will ever schedule. Uncapped SM-2 runs away fast —
   seven clean answers exile a spec for over a year, which for a working
   bartender is the same as forgetting it. Six months is the ceiling. */
const SRS_MAX_IVL = 180;

/* Midnight-local of the day `days` from now. Cards become due at the start of
   a day rather than at the clock time you happened to answer, so the scheduler
   and dateKey() agree about which day it is. */
function srsDueAt(days, now){
  const d = new Date(now || Date.now());
  d.setDate(d.getDate() + Math.round(days));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function scheduleCard(rec, ok, now){
  now = now || Date.now();
  if(rec.ef === undefined){ rec.ef = 2.5; rec.ivl = 0; rec.reps = 0; }
  if(ok){
    rec.reps = (rec.reps || 0) + 1;
    let ivl = rec.reps === 1 ? 1 : rec.reps === 2 ? 3 : Math.round((rec.ivl || 1) * rec.ef);
    /* ±10% jitter so a night's worth of cards learned together doesn't come
       back as one indigestible wall every time */
    if(ivl > 3) ivl = Math.round(ivl * (0.9 + Math.random() * 0.2));
    rec.ivl = Math.max(1, Math.min(SRS_MAX_IVL, ivl));
    rec.ef = Math.min(2.8, rec.ef + 0.05);
  } else {
    rec.reps = 0;
    rec.ivl = 0;
    rec.ef = Math.max(1.3, rec.ef - 0.2);
  }
  rec.due = rec.ivl === 0 ? now : srsDueAt(rec.ivl, now);
  rec.last = now;
  return rec;
}

/* Idempotent: seeds SRS fields on legacy {r,w} records, leaves complete records alone. */
function srsMigrate(cards, now){
  now = now || Date.now();
  Object.keys(cards || {}).forEach(k => {
    const s = cards[k];
    if(s && s.due === undefined){
      s.ef = 2.5;
      s.reps = Math.min(s.r || 0, 3);
      s.ivl = (s.r || 0) > (s.w || 0) ? 3 : 0;
      s.due = now;
    }
  });
}

function srsDueKeys(now){
  now = now || Date.now();
  return Object.keys(progress.cards || {}).filter(k => {
    const s = progress.cards[k];
    return s && s.due !== undefined && s.due <= now;
  });
}

/* Forecast: number of recorded cards coming due on each of the next n days.
   Day 0 = overdue or due within the next 24h. */
function srsForecast(days, now){
  now = now || Date.now();
  const out = new Array(days).fill(0);
  Object.values(progress.cards || {}).forEach(s => {
    if(!s || s.due === undefined) return;
    const d = Math.max(0, Math.floor((s.due - now) / SRS_DAY));
    if(d < days) out[d]++;
  });
  return out;
}
