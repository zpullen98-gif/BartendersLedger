/* Data, exact joins, reveal boundaries and route semantics for the two
   unscored teaching collections. Uses the shipped rendering functions. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {loadWing} from './load-wing.mjs';
const ROOT=process.env.LEDGER_JS ? dirname(process.env.LEDGER_JS) : join(dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(join(ROOT,f),'utf8');
const files=[...read('index.html').matchAll(/<script src="js\/([^?\"]+)/g)].map(x=>x[1]).filter(x=>!['oot-service.js','app.js','storage-alarm.js','oot-ledger.js','data-method-studies.js','ui-method-studies.js'].includes(x));
files.push('data-method-studies.js','ui-method-studies.js');
function setup(){
  const box=loadWing(files);
  vm.runInContext(read('js/app.js').match(/const TABS = .*;/)[0],box);
  return box;
}
const hasStudy=html=>/class="method-(?:inline|feedback)|data-teaching-reference=/.test(html);
const methodIds=['stir-rinse','shake-texture','coffee-cream','build-bubbles'];
const familyIds=['spirit-forward','sour-structure','long-sparkling','zero-proof'];
const studyIds=[...methodIds,...familyIds];
test('both collections have three live panels, honest provenance and real exact joins',()=>{
  const b=setup(), studies=b.get('methodStudies')(), cocktails=b.get('COCKTAILS');
  assert.deepEqual(Array.from(studies,s=>s.id),studyIds);
  assert.equal(new Set(studies.map(s=>s.id)).size,8,'addresses remain unique');
  for(const s of studies){
    assert.equal(s.steps.length,3,s.id);
    assert.ok(s.checks.length>=3 && s.recall && s.answer && s.guest && s.confirm,s.id);
    assert.match(s.reviewedOn,/^2026-10-\d{2}$/);
    assert.ok(s.sources.length>=2 && s.sources.every(x=>/^https:\/\//.test(x[1])));
    assert.equal(s.image,'img/studies/'+s.id+'-v1.svg');
    for(const name of s.canonNames)assert.ok(cocktails.some(c=>c.name===name),name);
    for(const name of s.zeroProofNames||[])assert.ok(b.get('NA_DRINKS').some(c=>c.name===name),name);
    for(const name of s.families||[])assert.ok(Object.hasOwn(b.get('FAMILIES'),name),name);
    for(const id of s.references)assert.ok(b.get('LedgerTeaching').entries[id],id);
    assert.ok(!/\u2014/.test(JSON.stringify(s)),'no publication dash');
    assert.ok(existsSync(join(ROOT,s.image)),s.id+' drawing exists');
    for(const [label,hash] of s.reading){
      assert.equal(b.get('applyRoute')(hash),true,s.id+' '+label+' route resolves');
      assert.equal(b.get('routeNow')().hash,hash,s.id+' '+label+' route is not a fallback');
    }
  }
  assert.deepEqual(Array.from(studies.filter(s=>s.collection==='families'),s=>s.id),familyIds);
  assert.deepEqual(Array.from(studies.find(s=>s.id==='spirit-forward').families),['Old Fashioned','Spirit & Vermouth']);
  assert.deepEqual(Array.from(studies.find(s=>s.id==='sour-structure').families),['Sour']);
  assert.deepEqual(Array.from(studies.find(s=>s.id==='long-sparkling').families),['Highball']);
  assert.equal(studies.find(s=>s.id==='zero-proof').families.length,0,'zero-proof is not assigned an alcoholic family');
  const optionalPack=process.env.OOT_SHARED ? join(process.env.OOT_SHARED,'packs/brennans-new-orleans.v1.oothouse.json') : 'C:/Users/zpull/OutsideOfTime/_release-merge/shared/packs/brennans-new-orleans.v1.oothouse.json';
  if(existsSync(optionalPack)){
    const h=JSON.parse(readFileSync(optionalPack,'utf8')).house;
    for(const s of studies){
      for(const id of s.houseIds)assert.ok(h.cocktails.some(x=>x.id===id),id);
      for(const id of s.componentIds)assert.ok(h.components.some(x=>x.id===id),id);
    }
  }
});
test('each cold lesson route has its own address and returns through collection to Library',()=>{
  const b=setup(), state=b.get('state');
  for(const s of b.get('methodStudies')()){
    const hash='#/notes/studies/'+s.id;
    assert.equal(b.get('applyRoute')(hash),true);
    assert.equal(b.get('routeNow')().hash,hash);
    assert.equal(b.get('screenKey')(),'notes/studies/'+s.id);
    const html=b.get('renderNotes')();
    assert.ok(html.includes(s.title) && html.includes(s.image));
    assert.equal((html.match(/class="method-step-mark"/g)||[]).length,3);
    assert.equal(b.get('parentTab')(),'notes');
    b.get('applyParent')();
    assert.equal(b.get('routeNow')().hash,'#/notes/studies');
    assert.equal(b.get('parentTab')(),'library');
    b.get('applyParent')();
    assert.equal(state.tab,'library');
  }
  b.get('applyRoute')('#/notes/studies/no-such-study');
  assert.equal(b.get('routeNow')().hash,'#/notes/studies');
  b.get('applyRoute')('#/notes/garnish');
  assert.equal(state.noteOpen,'__garnish');
  assert.equal(b.get('methodStudyActive')(),false);
});
test('collection and lesson changes push once; disclosure rendering changes no route or record',()=>{
  const b=setup(), entries=[];
  b.history={state:null,pushState(s,t,url){this.state=s;entries.push({kind:'push',url});b.location.hash=url;},replaceState(s,t,url){this.state=s;entries.push({kind:'replace',url});b.location.hash=url;},back(){entries.push({kind:'back'});}};
  b.get('applyRoute')('#/library'); b.get('navBoot')(); b.get('navSync')();
  b.get('applyRoute')('#/notes/studies'); b.get('navSync')();
  b.get('applyRoute')('#/notes/studies/stir-rinse'); b.get('navSync')();
  assert.equal(entries.filter(x=>x.kind==='push').length,2);
  const route=b.get('routeNow')().hash, before=JSON.stringify(b.get('progress'));
  b.get('methodInlineHTML')(['stir-rinse']);
  assert.equal(b.get('routeNow')().hash,route);
  assert.equal(JSON.stringify(b.get('progress')),before);
});
test('existing study door is in Library and restaurant section, never an extra home card',()=>{
  const b=setup();
  assert.match(b.get('renderLibrary')(),/class="method-door" href="#\/notes\/studies"/);
  assert.doesNotMatch(b.get('homeHTML')(),/method-door/);
  assert.match(read('js/ui-nav.js'),/methodStudyDoorHTML\(true\)/);
  const index=b.get('renderMethodStudies')();
  for(const id of studyIds)assert.ok(index.includes('#/notes/studies/'+id),id+' is discoverable');
});
test('both source and public Garnish headings get their intended direct reference',()=>{
  const b=setup(),state=b.get('state'),sec=b.get('STUDY').find(x=>x.title==='Technique: The Mechanics');
  const row=sec.rows.find(x=>/^Garnish/.test(x[0]));
  for(const heading of ['Garnish','Garnish (DeGroff doctrine)']){
    row[0]=heading;state.tab='notes';state.noteOpen=sec.title;
    assert.match(b.get('renderNotes')(),/href="#\/notes\/garnish">Citrus garnish cuts/);
  }
});
test('exact mappings do not infer a house build from a classic name or unrelated producer',()=>{
  const b=setup(), ids=b.get('methodIdsForRecord');
  assert.equal(ids('My Bar','unknown','Sazerac').length,0);
  assert.equal(ids('Producers','c-70rdihwo','Sazerac rye whiskey').length,0);
  assert.ok(ids('My Bar','b-olsmh04y','anything').includes('stir-rinse'));
  assert.ok(ids('Components','c-9o8x4d6n','anything').includes('stir-rinse'));
  assert.equal(ids('My Bar','unknown','Daiquiri').length,0,'classic family cannot guess a house recipe');
  assert.equal(ids('My Bar','unknown','Nojito').length,0,'zero-proof name cannot guess a house recipe');
  assert.equal(b.get('methodFeedbackHTML')({src:'My Bar',name:'Unknown',ref:{id:'unknown'},glass:'',garnish:'',method:''},'service'),'');
});
test('family connections require an actual family or canonical drink, never a supplied group or a house name',()=>{
  const b=setup(),ids=b.get('methodIdsForRecord'),familyIdsFor=b.get('methodIdsForFamily');
  assert.deepEqual(Array.from(familyIdsFor('Old Fashioned')),['spirit-forward']);
  assert.deepEqual(Array.from(familyIdsFor('Spirit & Vermouth')),['spirit-forward']);
  assert.deepEqual(Array.from(familyIdsFor('Sour')),['sour-structure']);
  assert.deepEqual(Array.from(familyIdsFor('Highball')),['long-sparkling']);
  assert.equal(familyIdsFor('Not a family').length,0);
  assert.equal(ids('Cocktails',null,'Invented Highball').length,0);
  assert.equal(ids('Zero Proof',null,'Invented Nojito').length,0);
  assert.equal(ids('Producers',null,'Daiquiri').length,0);
  const fake={src:'Cocktails',name:'Invented Sour',group:'Sour',family:'Sour',spec:[]};
  assert.equal(b.get('methodFeedbackHTML')(fake,'spec2name'),'');
  for(const family of ['Old Fashioned','Spirit & Vermouth','Sour','Highball']){
    b.get('state').famOpen=family;
    assert.match(b.get('renderFamilies')(),/class="method-inline"/);
  }
  for(const s of b.get('methodStudies')().filter(s=>s.collection==='families')){
    for(const name of s.canonNames)assert.ok(ids('Cocktails',null,name).includes(s.id),name+' canonical join');
    for(const name of s.zeroProofNames||[]){
      assert.ok(ids('Zero Proof',null,name).includes(s.id),name+' zero-proof join');
      assert.equal(ids('My Bar','unknown',name).length,0,name+' is not a house ID');
    }
  }
});
function setCard(b,mode,src='Cocktails',name='Sazerac'){
  const state=b.get('state'),fc=state.fc;
  const c=src==='Components' ? {src,name:'What is the rinse?',back:'Aromatic coating.',group:'Techniques',ref:{id:'c-9o8x4d6n'}}
    : src==='My Bar' ? {src,name:'Classic Sazerac',spec:[],glass:'',garnish:'',method:'',ref:{id:'b-olsmh04y'}}
    : Object.assign({},b.get('allDrinks')().find(x=>x.src===src&&x.name===name));
  assert.ok(c.name,'a real card exists for '+src+' '+name);
  Object.assign(fc,{stage:'run',mode,deck:[c],idx:0,flipped:false,checked:false,picked:null,deckId:'everything',right:0,wrong:0,missed:[],pool:[{l:c.spec?.[0]||'',ok:true}],sel:[],opts:c.spec?.slice(0,2)||[],clozeIdx:0,svc:{fields:['glass'],opts:{glass:[c.glass,'Other glass']},picked:{}}});
  state.tab='flashcards'; return {fc,c};
}
test('name/spec and component cards keep method art off the front and on revealed answers',()=>{
  for(const [mode,src] of [['name2spec','Cocktails'],['spec2name','Cocktails'],['component','Components'],['study','My Bar'],['line10','My Bar']]){
    const b=setup(),{fc}=setCard(b,mode,src),before=JSON.stringify(b.get('progress'));
    assert.equal(hasStudy(b.get('renderFlashcards')()),false,mode+' front');
    fc.flipped=true;
    const answer=b.get('renderFlashcards')();
    assert.equal(hasStudy(answer),true,mode+' answer');
    assert.match(answer,/data-act="fc-grade"/);
    assert.equal(JSON.stringify(b.get('progress')),before);
  }
});
test('build, cloze and service feedback wait until the answer is complete',()=>{
  for(const mode of ['build','cloze','service']){
    const b=setup(),{fc}=setCard(b,mode),before=JSON.stringify(b.get('progress'));
    assert.equal(hasStudy(b.get('renderFlashcards')()),false,mode+' uncompleted');
    fc.checked=true;fc.picked=0;fc.svc.picked.glass=0;
    const html=b.get('renderFlashcards')();
    assert.equal(hasStudy(html),true,mode+' feedback');
    assert.match(html,/data-act="fc-next"/);
    assert.equal(JSON.stringify(b.get('progress')),before);
  }
});
test('each new family lesson is absent from blind answers and appears only after reveal without changing the record',()=>{
  for(const id of familyIds){
    for(const mode of ['name2spec','spec2name']){
      const b=setup(),study=b.get('methodStudy')(id);
      const src=id==='zero-proof'?'Zero Proof':'Cocktails';
      const name=(id==='zero-proof'?study.zeroProofNames:study.canonNames)[0];
      assert.ok(name,id+' has a real teaching example');
      const {fc}=setCard(b,mode,src,name),before=JSON.stringify(b.get('progress'));
      const blind=b.get('renderFlashcards')();
      assert.equal(hasStudy(blind),false,id+' '+mode+' stays blind');
      assert.ok(!blind.includes(study.image),id+' has no image hint');
      fc.flipped=true;
      const revealed=b.get('renderFlashcards')();
      assert.ok(revealed.includes(study.title)&&revealed.includes(study.image),id+' illustration on revealed answer');
      assert.match(revealed,/data-act="fc-grade"/);
      assert.equal(JSON.stringify(b.get('progress')),before,id+' cannot alter learning record');
    }
  }
});
test('zero-proof teaching opens with a named reference entry and stays off the closed list and blind drill',()=>{
  const b=setup(),s=b.get('methodStudy')('zero-proof'),state=b.get('state');
  state.na.view='list';state.na.cat='All';state.na.open=null;state.na.drill=false;
  assert.equal(hasStudy(b.get('renderNA')()),false,'closed list reveals no teaching answer');
  for(const name of s.zeroProofNames){
    const idx=b.get('NA_DRINKS').findIndex(x=>x.name===name);
    state.na.open=idx;
    assert.ok(b.get('renderNA')().includes(s.title),name+' reference entry has study');
    state.na.drill=true;state.na.order=[idx];state.na.idx=0;state.na.revealed=false;
    assert.equal(hasStudy(b.get('renderNA')()),false,name+' blind drill');
    state.na.drill=false;
  }
});
test('unknown cards get no invented study; known component and drill references resolve',()=>{
  const b=setup();
  assert.equal(b.get('methodComponentStudyHTML')('unknown'),'');
  assert.match(b.get('methodComponentStudyHTML')('c-q898v0k9'),/Coffee, cream and texture/);
  assert.match(b.get('methodDrillReferencesHTML')('garnish'),/data-teaching-reference="garnish-citrus"/);
  assert.match(b.get('methodDrillReferencesHTML')('glassware'),/data-teaching-reference="brennans-glassware"/);
  assert.equal(b.get('methodDrillReferencesHTML')('unknown'),'');
  for(const x of b.get('methodStudySearchEntries')())assert.ok(x.h.startsWith('#/notes/studies/') && x.body);
});
test('native lesson controls can exclude global grading and navigation shortcuts',()=>{
  const b=setup(),owns=b.get('methodStudyOwnsKey');
  assert.equal(owns({target:{closest:()=>({})}}),true);
  assert.equal(owns({target:{closest:()=>null}}),false);
  assert.equal(owns({target:{}}),false);
  assert.equal(owns(null),false);
});
