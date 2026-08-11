/* ---------------- RENDER & EVENTS ---------------- */
let prTick = null;   /* the practice-drill stopwatch interval */
const TABS = [['home','Ledger'],['families','Families'],['library','Library'],['shots','Shots'],['na','Zero Proof'],['service','Behind the Stick'],['prep','Prep'],['producers','Producers'],['notes','Notes'],['flashcards','Flashcards'],['quiz','Quiz'],['practice','Practice'],['riffs','Riffs'],['tools','Tools']];
/* Announce something to assistive tech. The region is outside #view so it
   survives the innerHTML swap below. */
function say(msg){
  const el = document.getElementById('live');
  if(!el || !msg) return;
  el.textContent = '';                 /* force a change even if the text repeats */
  setTimeout(() => { el.textContent = msg; }, 30);
}

/* Every control carries a unique data-act/data-i/data-tab signature, so we can
   find "the same button" again after the DOM is rebuilt. Without this, render()
   destroys the focused element and the next Tab restarts from the masthead —
   which on a 365-row library is hundreds of presses. */
function focusSignature(el){
  if(!el || el === document.body) return null;
  const d = el.dataset || {};
  if(!d.act && !d.tab && !d.cluster) return null;
  return ['act','tab','cluster','i','k','d','s','m','c','f','v','t','id','n']
    .filter(k => d[k] !== undefined)
    .map(k => '[data-' + k + '="' + String(d[k]).replace(/"/g, '\\"') + '"]')
    .join('');
}

function render(){
  const sig = focusSignature(document.activeElement);
  renderNav();
  syncRoute();
  const view = document.getElementById('view');
  view.innerHTML = ({home:renderHome, families:renderFamilies, library:renderLibrary,
    shots:renderShots, na:renderNA, service:renderService, producers:renderProducers, prep:renderPrep,
    flashcards:renderFlashcards, quiz:renderQuiz, riffs:renderRiffs,
    practice:renderPractice, tools:renderTools, notes:renderNotes})[state.tab]();
  if(sig){
    let back = null;
    try{ back = document.querySelector(sig); }catch(e){}
    if(back && back.focus) back.focus();
    else view.focus();                 /* the control is gone — land in the view, not at the top */
  }
  /* bring whatever the user just opened into sight */
  const opened = document.querySelector('[data-open="1"]');
  if(opened && opened.scrollIntoView) opened.scrollIntoView({ block:'center' });
  const tc = document.getElementById('tst-cat');
  if(tc) tc.addEventListener('change', e => {
    state.tast.cat = e.target.value; state.tast.nose = []; render();
  });
  [['conv-val','convVal'],['cost-price','bottlePrice'],['cost-ml','bottleMl'],['cost-target','targetPour']].forEach(function(o){
    const el2 = document.getElementById(o[0]);
    if(el2) el2.addEventListener('input', function(e){ state.tools[o[1]] = e.target.value; render(); });
  });
  const sd = document.getElementById('shot-drink');
  if(sd) sd.addEventListener('change', e => { state.shots.rDrink = Number(e.target.value); render(); });
  const sc = document.getElementById('shot-count');
  if(sc) sc.addEventListener('input', e => {
    state.shots.rCount = Math.max(1, Math.min(30, Number(e.target.value)||1));
    const out = document.getElementById('shot-round-out');
    if(out) out.innerHTML = shotRoundHTML();
  });
  const td = document.getElementById('tool-drink');
  if(td) td.addEventListener('change', e => { state.tools.drink = Number(e.target.value); render(); });
  const ts = document.getElementById('tool-serv');
  if(ts) ts.addEventListener('input', e => {
    state.tools.serv = Math.max(1, Math.min(200, Number(e.target.value)||1));
    const out = document.getElementById('batch-out');
    if(out) out.innerHTML = batchOutHTML();
  });
  [['fc-family','fc','family'],['fc-spirit','fc','spirit'],['fc-tier','fc','tier'],['lib-tier','lib','tier']].forEach(([id,obj,key]) => {
    const sel = document.getElementById(id);
    if(sel) sel.addEventListener('change', e => {
      state[obj][key] = e.target.value;
      if(obj==='lib') state.lib.open = null;
      render();
    });
  });
  const impF = document.getElementById('data-import-file');
  if(impF){
    impF.addEventListener('change', e => { if(e.target.files[0]) dataImport(e.target.files[0]); });
    fillStorageLine();
  }
  const search = document.getElementById('lib-search');
  if(search){
    search.addEventListener('input', e => {
      state.lib.q = e.target.value; state.lib.open = null;
      syncRoute();
      document.getElementById('lib-list').innerHTML = libListHTML();
      document.getElementById('lib-count').textContent = libList().length + ' drinks';
    });
  }
}

/* ---------------- NAV EVENTS (clusters, bottom nav, sheet, search) ---------------- */
function navClick(e){
  const sc = e.target.closest('[data-search]');
  if(sc){ openSearch(); return; }
  const cl = e.target.closest('[data-cluster]');
  if(cl){
    const ck = cl.dataset.cluster;
    const tabs = NAV_CLUSTERS.find(([k]) => k===ck)[2];
    if(tabs.length === 1){ state.tab = tabs[0]; state.sheet = null; }
    else if(window.matchMedia('(max-width: 639px)').matches){
      state.sheet = state.sheet===ck ? null : ck;
    } else {
      state.tab = (state.lastSub && state.lastSub[ck]) || tabs[0];
      state.sheet = null;
    }
    render(); return;
  }
  const b = e.target.closest('[data-tab]');
  if(b){
    state.tab = b.dataset.tab;
    state.sheet = null;
    if(!state.lastSub) state.lastSub = {};
    state.lastSub[clusterOf(state.tab)] = state.tab;
    render();
  }
}
document.getElementById('tabs').addEventListener('click', navClick);
document.getElementById('bnav').addEventListener('click', navClick);
document.getElementById('sheet').addEventListener('click', e => {
  if(e.target.closest('[data-sheet-close]')){ state.sheet = null; render(); return; }
  navClick(e);
});
document.getElementById('search-ol').addEventListener('click', e => {
  const row = e.target.closest('[data-hash]');
  if(row){ gotoHash(row.dataset.hash); return; }
  if(e.target.closest('[data-search-close]')) closeSearch();
});

window.addEventListener('hashchange', () => { if(applyRoute()) render(); });

/* ---------------- KEYBOARD SHORTCUTS ---------------- */
document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if(search.open){
    if(e.key === 'Escape'){ closeSearch(); e.preventDefault(); }
    else if(e.key === 'ArrowDown'){ search.sel++; renderSearch(); e.preventDefault(); }
    else if(e.key === 'ArrowUp'){ search.sel = Math.max(0, search.sel-1); renderSearch(); e.preventDefault(); }
    else if(e.key === 'Enter'){
      /* if the user tabbed to a row, honour THAT row — not the arrow highlight */
      const row = (e.target.closest && e.target.closest('.search-row')) || document.querySelector('.search-row.sel');
      if(row) gotoHash(row.dataset.hash);
      e.preventDefault();
    }
    return;
  }
  if(typing) return;
  if(e.key === '/'){ openSearch(); e.preventDefault(); return; }
  if(e.key === 'Escape' && state.sheet){ state.sheet = null; render(); return; }
  const click = sel => { const b = document.querySelector(sel); if(b){ b.click(); e.preventDefault(); return true; } return false; };
  if(state.tab==='flashcards' && state.fc.stage==='run'){
    if(e.key === ' ') { click('[data-act="fc-flip"]') || click('[data-act="fc-next"]'); e.preventDefault(); return; }
    if(e.key === 'ArrowRight'){ if(click('[data-act="fc-grade"][data-ok="1"]')) return; }
    if(e.key === 'ArrowLeft'){ if(click('[data-act="fc-grade"][data-ok="0"]')) return; }
  }
  if(state.tab==='quiz' && state.quiz.stage==='run'){
    if(/^[1-4]$/.test(e.key)){
      const opts = document.querySelectorAll('[data-act="quiz-pick"]');
      const b = opts[Number(e.key)-1]; if(b) b.click();
      e.preventDefault(); return;
    }
    if(e.key === 'Enter' || e.key === ' '){ click('[data-act="quiz-next"]'); e.preventDefault(); }
    return;
  }
  if(/^[1-4]$/.test(e.key)){
    const [ck,,tabs] = NAV_CLUSTERS[Number(e.key)-1];
    state.tab = (state.lastSub && state.lastSub[ck]) || tabs[0];
    state.sheet = null;
    render();
  }
});

document.getElementById('view').addEventListener('click', e => {
  if(e.target.closest('[data-search]')){ openSearch(); return; }
  const el = e.target.closest('[data-act]'); if(!el) return;
  const act = el.dataset.act;
  const _tn = document.getElementById('tst-notes'); if(_tn) state.tast.notes = _tn.value;
  const _tl = document.getElementById('tst-label'); if(_tl) state.tast.label = _tl.value;
  const fc = state.fc, z = state.quiz;
  if(act==='go'){ state.tab = el.dataset.tab; }
  else if(act==='fam-open'){ state.famOpen = state.famOpen===el.dataset.fam ? null : el.dataset.fam; }
  else if(act==='fam-goto'){ state.lib = { q:'', fam:el.dataset.fam, tier:'All', open:null }; state.tab='library'; }
  else if(act==='lib-fam'){ state.lib.fam = el.dataset.fam; state.lib.open=null; }
  else if(act==='lib-toggle'){ const i=Number(el.dataset.i); state.lib.open = state.lib.open===i ? null : i; }
  else if(act==='lib-print'){ state.lib.print = true; }
  else if(act==='lib-print-go'){ window.print(); return; }
  else if(act==='lib-print-close'){ state.lib.print = false; }
  else if(act==='fc-src'){
    fc.src = el.dataset.s; fc.family = 'All'; fc.spirit = 'All';
    if(fc.src!=='Cocktails' && fc.src!=='All') fc.tier = 'All'; }
  else if(act==='fc-board-src'){ fc.boardSrc = el.dataset.s; fc.boardOpen = null; }
  else if(act==='fc-special'){ fc.special = el.dataset.s; }
  else if(act==='fc-smart'){ fc.smart = !fc.smart; }
  else if(act==='fc-board'){ fc.stage='board'; fc.boardOpen=null; }
  else if(act==='fc-board-open'){ const i=Number(el.dataset.i); fc.boardOpen = fc.boardOpen===i ? null : i; }
  else if(act==='fc-reset'){
    if(confirm('Reset all flashcard records? Your quiz history will be kept.')){
      progress.cards = {}; saveProgress();
    } }
  else if(act==='fc-start'){
    const pool = fcPool(); if(!pool.length) return;
    const deck = fc.smart ? pool.slice().sort(function(a,b){ return weakScore(cardKey(b))-weakScore(cardKey(a)); }) : shuffle(pool);
    Object.assign(fc, { stage:'run', mode:el.dataset.mode, deck:deck, idx:0, right:0, wrong:0, missed:[] });
    prepCard(); }
  else if(act==='fc-rerun-miss'){
    const all = allDrinks();
    const deck = shuffle(fc.missed.map(function(k){
      return all.filter(function(d){ return cardKey(d)===k; })[0];
    }).filter(Boolean));
    if(!deck.length) return;
    Object.assign(fc, { stage:'run', deck:deck, idx:0, right:0, wrong:0, missed:[] });
    prepCard(); }
  else if(act==='fc-flip'){ fc.flipped = true; }
  else if(act==='fc-grade'){
    say(el.dataset.ok==='1' ? 'Marked correct.' : 'Marked missed.');
    recordCard(el.dataset.ok==='1');
    fc.idx++; prepCard(); }
  else if(act==='fc-toggle-line'){
    if(!fc.checked){ const i=Number(el.dataset.i); const p=fc.sel.indexOf(i);
      if(p>=0) fc.sel.splice(p,1); else fc.sel.push(i); } }
  else if(act==='fc-check'){
    if(!fc.checked && fc.sel.length){
      const required = fc.pool.map((p,i)=>(p.ok && !p.opt)?i:-1).filter(i=>i>=0);
      const decoys   = fc.pool.map((p,i)=>p.ok?-1:i).filter(i=>i>=0);
      const ok = required.every(i=>fc.sel.includes(i)) && !decoys.some(i=>fc.sel.includes(i));
      recordCard(ok); fc.lastOk = ok; fc.checked = true; } }
  else if(act==='fc-cloze-pick'){
    if(fc.picked===null){
      fc.picked = Number(el.dataset.i);
      const ok = fc.opts[fc.picked] === fc.deck[fc.idx].spec[fc.clozeIdx];
      recordCard(ok); fc.lastOk = ok; } }
  else if(act==='fc-svc-pick'){
    const s = fc.svc;
    if(s && s.picked[el.dataset.f] === undefined){
      s.picked[el.dataset.f] = Number(el.dataset.i);
      if(s.fields.every(f => s.picked[f] !== undefined)){
        const c = fc.deck[fc.idx];
        const ok = s.fields.every(f => s.opts[f][s.picked[f]] === (s.keyed && s.keyed[f] ? s.keyed[f](c[f]) : c[f]));
        recordCard(ok); fc.lastOk = ok;
        say(ok ? 'All three correct.' : 'Not clean — check the reveal.');
      }
    } }
  else if(act==='fc-next'){ fc.idx++; prepCard(); }
  else if(act==='fc-quit'){ fc.stage='setup'; if(state.sess) state.sess.active = false; }
  else if(act==='sess-start'){ startSession(); }
  else if(act==='sess-quiz'){
    state.sess.step = 'quiz';
    state.tab = 'quiz';
    /* quiz the deck you just drilled, not the whole 365-drink canon */
    Object.assign(state.quiz, { stage:'run', mode:'mixed', round:buildRound('mixed', state.fc.deck), idx:0, picked:null, score:0, missedQ:[], replay:false });
  }
  else if(act==='sess-resume'){
    const st = state.sess.step;
    state.tab = st==='cards' ? 'flashcards' : st==='quiz' ? 'quiz' : 'practice';
    if(st==='drill') state.practice.view = 'drills'; }
  else if(act==='sess-drill'){
    say('Quiz done. Last step: the drill.');
    state.sess.step = 'drill';
    state.quiz.stage = 'setup';
    state.tab = 'practice';
    state.practice.view = 'drills';
  }
  else if(act==='sess-nobar'){
    recordSessionComplete(false);
    state.sess.active = false;
    state.tab = 'home';
  }
  else if(act==='sess-hands'){
    state.sess = { active:true, step:'drill' };
    state.tab = 'practice';
    state.practice.view = 'drills';
  }
  else if(act==='sess-end'){
    state.sess.active = false;
    state.fc.stage = 'setup';
    state.tab = 'home';
  }
  else if(act==='quiz-mode'){ z.mode = el.dataset.m; }
  else if(act==='quiz-start'){ Object.assign(z, { stage:'run', round:buildRound(z.mode), idx:0, picked:null, score:0, missedQ:[], replay:false }); }
  else if(act==='quiz-pick'){
    if(z.picked!==null) return;
    z.picked = Number(el.dataset.i);
    const q = z.round[z.idx];
    const right = q.options[z.picked]===q.answer;
    if(right) z.score++;
    else z.missedQ.push(q);
    say((right ? 'Correct. ' : 'Not quite. The answer is ' + q.answer + '. ') + (q.explain||'')); }
  else if(act==='quiz-next'){
    if(z.idx+1 >= z.round.length){
      /* replays re-ask only the questions you already missed, so logging them
         as ordinary rounds inflates the dashboard trend most for the learner
         who is struggling most */
      progress.quizzes = [...(progress.quizzes||[]), { date:new Date().toLocaleDateString(), ts:Date.now(),
        score:z.score, total:z.round.length, mode:z.mode||'mixed', replay: !!z.replay }].slice(-20);
      saveProgress();
      /* cards + quiz banks the night even if the drill never happens — without
         this, closing the tab here loses the streak entirely */
      if(state.sess && state.sess.active && state.sess.step==='quiz') recordSessionComplete(false);
      z.stage = 'done';
    } else { z.idx++; z.picked = null; } }
  else if(act==='quiz-replay'){
    if(z.missedQ.length){
      Object.assign(z, { stage:'run', round:shuffle(z.missedQ), idx:0, picked:null, score:0, missedQ:[], replay:true });
    } }
  else if(act==='riff-frame'){ state.riff.frame = RIFFS[Number(el.dataset.f)]; state.riff.critique = false; dealRiff(); }
  else if(act==='riff-deal'){ state.riff.critique = false; dealRiff(); }
  else if(act==='riff-reveal'){ state.riff.revealed = true; }
  else if(act==='riff-back'){ state.riff.frame = null; state.riff.deal = null; state.riff.critique = false; }
  else if(act==='riff-critique'){ state.riff.critique = true; }
  else if(act==='pr-view'){ state.practice.view = el.dataset.v; }
  else if(act==='pr-flight'){ const i=Number(el.dataset.i); state.practice.flightOpen = state.practice.flightOpen===i ? null : i; }
  else if(act==='pr-method'){ state.practice.methodOpen = state.practice.methodOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='tst-app'){ state.tast.appearance = state.tast.appearance===el.dataset.v ? null : el.dataset.v; }
  else if(act==='tst-nose'){
    const v = el.dataset.v; const i = state.tast.nose.indexOf(v);
    if(i>=0) state.tast.nose.splice(i,1); else state.tast.nose.push(v); }
  else if(act==='tst-axis'){
    const k = el.dataset.k, v = Number(el.dataset.v);
    state.tast.palate[k] = state.tast.palate[k]===v ? null : v; }
  else if(act==='tst-finish'){ state.tast.finish = state.tast.finish===el.dataset.v ? null : el.dataset.v; }
  else if(act==='tst-clear'){
    state.tast = { cat:state.tast.cat, label:'', appearance:null, nose:[], palate:{}, finish:null, notes:'' }; }
  else if(act==='tst-save'){
    const t = state.tast;
    if(!t.nose.length && !t.notes && !t.appearance) return;
    if(!progress.tastings) progress.tastings = [];
    progress.tastings.push({ date:new Date().toLocaleDateString(), ts:Date.now(), cat:t.cat, label:t.label||'(unnamed)',
      appearance:t.appearance, nose:[...t.nose], palate:{...t.palate}, finish:t.finish, notes:t.notes });
    progress.tastings = progress.tastings.slice(-100);
    saveProgress();
    state.tast = { cat:t.cat, label:'', appearance:null, nose:[], palate:{}, finish:null, notes:'' }; }
  else if(act==='tst-open'){ const i=Number(el.dataset.i); state.practice.noteOpen = state.practice.noteOpen===i ? null : i; }
  else if(act==='tst-del'){
    const i=Number(el.dataset.i);
    if(progress.tastings && progress.tastings[i]){ progress.tastings.splice(i,1); saveProgress(); }
    state.practice.noteOpen = null; }
  else if(act==='rail-deal'){ state.practice.rail = { deck: railDeal(), revealed:false }; }
  else if(act==='rail-reveal'){ if(state.practice.rail) state.practice.rail.revealed = true; }
  else if(act==='pr-deal'){
    const id = el.dataset.id;
    const d = DRILLS.find(x => x.id===id);
    if(d && d.pick){
      /* one per family first, so a Speed Round can't be four sours you like */
      const byFam = {};
      shuffle(COCKTAILS.filter(c => c.tier<=4)).forEach(c => { if(!byFam[c.family]) byFam[c.family]=c; });
      const spread = shuffle(Object.values(byFam));
      const picks = spread.slice(0, d.pick);
      while(picks.length < d.pick){
        const extra = sample(COCKTAILS.filter(c => c.tier<=4 && !picks.some(p=>p.name===c.name)),1)[0];
        if(!extra) break;
        picks.push(extra);
      }
      if(!state.practice.subjects) state.practice.subjects = {};
      state.practice.subjects[id] = picks.map(c => c.name);
    } }
  else if(act==='pr-timer'){
    const id = el.dataset.id;
    if(!state.practice.timers) state.practice.timers = {};
    const t = state.practice.timers;
    if(t[id]){
      const secs = Math.round((Date.now() - t[id]) / 100) / 10;
      delete t[id];
      const input = document.getElementById('pr-in-'+id);
      if(input) input.value = secs;
      if(prTick){ clearInterval(prTick); prTick = null; }
      el.textContent = 'Start';
      const disp = document.getElementById('pr-timer-'+id);
      if(disp) disp.classList.remove('running');
      return;
    }
    t[id] = Date.now();
    el.textContent = '0.0 — Stop';
    el.classList.add('running');
    if(prTick) clearInterval(prTick);
    prTick = setInterval(() => {
      const btn = document.getElementById('pr-timer-'+id);
      if(!btn || !state.practice.timers[id]){ clearInterval(prTick); prTick=null; return; }
      btn.textContent = ((Date.now()-state.practice.timers[id])/1000).toFixed(1) + ' — Stop';
    }, 100);
    return; }
  else if(act==='pr-log'){
    const id = el.dataset.id;
    const input = document.getElementById('pr-in-'+id);
    const v = parseFloat(input && input.value);
    if(isNaN(v)) return;
    if(!progress.practice) progress.practice = {};
    const arr = progress.practice[id] || [];
    arr.push({ d:new Date().toLocaleDateString(), ts:Date.now(), v:v });
    progress.practice[id] = arr.slice(-20);
    saveProgress();
    /* a logged drill is what upgrades tonight from recitation to hands */
    if(state.sess && state.sess.active && state.sess.step==='drill'){
      recordSessionComplete(true);
      state.sess.active = false;
      state.tab = 'home';
    } }
  else if(act==='tool-view'){ state.tools.view = el.dataset.v; }
  else if(act==='data-export'){ dataExport(); return; }
  else if(act==='data-persist'){ requestPersistence(); return; }
  else if(act==='shelf-src'){ state.tools.shelfSrc = el.dataset.s; }
  else if(act==='shelf-mode'){ state.tools.eightySix = el.dataset.m==='86' ? '' : null; }
  else if(act==='shelf-86'){ state.tools.eightySix = state.tools.eightySix===el.dataset.k ? '' : el.dataset.k; }
  else if(act==='conv-unit'){ state.tools.convFrom = el.dataset.u; }
  else if(act==='dil-pct'){ state.tools.dilPct = Number(el.dataset.v); }
  else if(act==='tool-dilute'){ state.tools.dilute = !state.tools.dilute; }
  else if(act==='tool-preset'){
    const p = SHELF_PRESETS[Number(el.dataset.i)] || SHELF_PRESETS[0];
    state.tools.shelf = p[1].slice();
    progress.shelf = state.tools.shelf.slice(); saveProgress(); }
  else if(act==='tool-clear'){ state.tools.shelf = []; progress.shelf = []; saveProgress(); }
  else if(act==='shelf-toggle'){
    const k = el.dataset.k; const s = state.tools.shelf;
    const p = s.indexOf(k); if(p>=0) s.splice(p,1); else s.push(k);
    progress.shelf = s.slice(); saveProgress(); }
  else if(act==='tool-open'){
    const i = Number(el.dataset.i);
    state.lib = { q:'', fam:'All', tier:'All', open:i };
    state.tab = 'library'; }
  else if(act==='prep-cat'){ state.prep.cat = el.dataset.c; state.prep.open = null; }
  else if(act==='prep-open'){ const i=Number(el.dataset.i); state.prep.open = state.prep.open===i ? null : i; }
  else if(act==='prep-list'){ state.prep.listOpen = state.prep.listOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='prep-safe'){ state.prep.safeOpen = state.prep.safeOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='prod-cat'){ state.prod.cat = el.dataset.c; state.prod.open = null; state.prod.primerOpen = null; }
  else if(act==='prod-open'){ const i=Number(el.dataset.i); state.prod.open = state.prod.open===i ? null : i; }
  else if(act==='prod-primer'){ state.prod.primerOpen = state.prod.primerOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='na-view'){ state.na.view = el.dataset.v; state.na.open = null; }
  else if(act==='na-cat'){ state.na.cat = el.dataset.c; state.na.open = null; }
  else if(act==='na-toggle'){ const i=Number(el.dataset.i); state.na.open = state.na.open===i ? null : i; }
  else if(act==='na-pantry'){ state.na.pOpen = state.na.pOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='na-theory'){ state.na.tOpen = state.na.tOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='na-service'){ state.na.sOpen = state.na.sOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='na-drill'){
    const pool = NA_DRINKS.map((d,i)=>({d,i})).filter(({d}) => state.na.cat==='All' || d.cat===state.na.cat).map(o=>o.i);
    Object.assign(state.na, { drill:true, order:shuffle(pool), idx:0, revealed:false }); }
  else if(act==='na-flip'){ state.na.revealed = true; }
  else if(act==='na-next'){
    const nn = state.na;
    if(nn.idx+1 >= nn.order.length){ nn.drill=false; } else { nn.idx++; nn.revealed=false; } }
  else if(act==='na-exit'){ state.na.drill = false; }
  else if(act==='shots-view'){ state.shots.view = el.dataset.v; state.shots.open = null; }
  else if(act==='lay-start'){
    const i = Math.floor(Math.random()*LAYERED_BUILDS.length);
    state.shots.lay = { i:i, pool:shuffle(LAYERED_BUILDS[i].layers.map((_,n)=>n)), picks:[] }; }
  else if(act==='lay-pick'){
    const l = state.shots.lay; const i = Number(el.dataset.i);
    if(l && !l.picks.includes(i)) l.picks.push(i); }
  else if(act==='lay-reset'){ if(state.shots.lay) state.shots.lay.picks = []; }
  else if(act==='lay-quit'){ state.shots.lay = null; }
  else if(act==='shots-cat'){ state.shots.cat = el.dataset.c; state.shots.open = null; }
  else if(act==='shots-toggle'){ const i=Number(el.dataset.i); state.shots.open = state.shots.open===i ? null : i; }
  else if(act==='shots-svc'){ state.shots.svc = state.shots.svc===el.dataset.t ? null : el.dataset.t; }
  else if(act==='shots-drill'){
    const pool = SHOTS.map((s,i)=>({s,i})).filter(({s}) => state.shots.cat==='All' || s.cat===state.shots.cat).map(o=>o.i);
    Object.assign(state.shots, { drill:true, order:shuffle(pool), idx:0, revealed:false }); }
  else if(act==='shots-flip'){ state.shots.revealed = true; }
  else if(act==='shots-next'){
    const sh = state.shots;
    if(sh.idx+1 >= sh.order.length){ sh.drill=false; }
    else { sh.idx++; sh.revealed=false; } }
  else if(act==='shots-exit'){ state.shots.drill = false; }
  else if(act==='vid-chan'){
    if(!progress.vidPrefs) progress.vidPrefs = {};
    progress.vidPrefs.channel = el.dataset.c; saveProgress(); }
  else if(act==='vid-len'){
    if(!progress.vidPrefs) progress.vidPrefs = {};
    progress.vidPrefs.longform = el.dataset.v==='long'; saveProgress(); }
  else if(act==='note-open'){ state.noteOpen = state.noteOpen===el.dataset.t ? null : el.dataset.t; }
  else if(act==='svc-dom'){ state.svc.dom = el.dataset.d; state.svc.rowOpen = null; state.svc.refOpen = null; }
  else if(act==='svc-row'){ const i=Number(el.dataset.i); state.svc.rowOpen = state.svc.rowOpen===i ? null : i; }
  else if(act==='svc-ref'){ const n=el.dataset.n; state.svc.refOpen = state.svc.refOpen===n ? null : n; }
  render();
});

(async () => {
  try{ const raw = await store.get(KEY); if(raw) progress = JSON.parse(raw); }catch(e){}
  if(!progress.cards) progress.cards = {};
  if(!progress.quizzes) progress.quizzes = [];
  if(!progress.practice) progress.practice = {};
  if(!progress.tastings) progress.tastings = [];
  if(!progress.vidPrefs) progress.vidPrefs = { channel:'auto', longform:false };
  if(Array.isArray(progress.shelf)) state.tools.shelf = progress.shelf.slice();
  srsMigrate(progress.cards);
  applyRoute();
  render();
})();

/* ---------------- SERVICE WORKER & UPDATE TOAST ---------------- */
/* ?nosw = dev escape hatch: skips registration AND unregisters any active SW
   (takes effect on the next reload) so stale caches can't mask edits. */
let swWantReload = false;
if('serviceWorker' in navigator){
  if(location.search.includes('nosw')){
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  } else {
    window.addEventListener('load', async () => {
      try{
        const reg = await navigator.serviceWorker.register('sw.js');
        /* an update that reached "waiting" on a previous visit */
        if(reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if(!nw) return;
          nw.addEventListener('statechange', () => {
            if(nw.state === 'installed' && navigator.serviceWorker.controller){
              showUpdateToast(nw);
            }
          });
        });
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          /* only reload when the user tapped the toast — first-install claim()
             also fires controllerchange and must NOT reload mid-session */
          if(!swWantReload || reloading) return;
          reloading = true; location.reload();
        });
      }catch(e){ /* offline first load or unsupported — fine */ }
    });
  }
}

function showUpdateToast(worker){
  if(document.getElementById('sw-toast')) return;
  const t = document.createElement('button');
  t.id = 'sw-toast';
  t.className = 'sw-toast';
  t.innerHTML = '<span class="font-display">A new edition is pressed</span><span class="tiny dim"> — tap to refresh</span>';
  t.addEventListener('click', () => { swWantReload = true; worker.postMessage('SKIP_WAITING'); });
  document.body.appendChild(t);
}
