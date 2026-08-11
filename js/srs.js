/* ---------------- SPACED REPETITION: SM-2-LITE ----------------
   Layers onto progress.cards records ({r, w}) without touching those
   fields. Added per card: ef (ease), ivl (days), reps (win streak),
   due (epoch ms), last (epoch ms). Binary grades — the flashcard UI
   is right/wrong, so no Hard/Good/Easy buttons. */

const SRS_DAY = 86400000;

function scheduleCard(rec, ok, now){
  now = now || Date.now();
  if(rec.ef === undefined){ rec.ef = 2.5; rec.ivl = 0; rec.reps = 0; }
  if(ok){
    rec.reps = (rec.reps || 0) + 1;
    rec.ivl = rec.reps === 1 ? 1 : rec.reps === 2 ? 3 : Math.round((rec.ivl || 1) * rec.ef);
    rec.ef = Math.min(2.8, rec.ef + 0.05);
  } else {
    rec.reps = 0;
    rec.ivl = 0;
    rec.ef = Math.max(1.3, rec.ef - 0.2);
  }
  rec.due = now + rec.ivl * SRS_DAY;
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
