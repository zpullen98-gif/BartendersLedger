/* Data, exact joins, reveal boundaries and route semantics for the four
   unscored method studies. Uses the shipped rendering functions. */
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
test('four explicit studies have three live steps, honest provenance and real exact joins',()=>{
  const b=setup(), studies=b.get('methodStudies')(), cocktails=b.get('COCKTAILS');
  assert.deepEqual(Array.from(studies,s=>s.id),['stir-rinse','shake-texture','coffee-cream','build-bubbles']);
  for(const s of studies){
    assert.equal(s.steps.length,3,s.id);
    assert.ok(s.checks.length>=3 && s.recall && s.answer && s.guest && s.confirm,s.id);
    assert.equal(s.reviewedOn,'2026-10-10');
    assert.ok(s.sources.length>=2 && s.sources.every(x=>/^https:\/\//.test(x[1])));
    assert.equal(s.image,'img/studies/'+s.id+'-v1.svg');
    for(const name of s.canonNames)assert.ok(cocktails.some(c=>c.name===name),name);
    for(const id of s.references)assert.ok(b.get('LedgerTeaching').entries[id],id);
    assert.ok(!/\u2014/.test(JSON.stringify(s)),'no publication dash');
  }
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
  assert.match(b.get('renderLibrary')(),/Explore the methods of service/);
  assert.doesNotMatch(b.get('homeHTML')(),/method-door/);
  assert.match(read('js/ui-nav.js'),/methodStudyDoorHTML\(true\)/);
  assert.match(b.get('renderMethodStudies')(),/Four unscored studies/);
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
  assert.deepEqual(Array.from(ids('My Bar','b-olsmh04y','anything')),['stir-rinse']);
  assert.deepEqual(Array.from(ids('Components','c-9o8x4d6n','anything')),['stir-rinse']);
  assert.equal(b.get('methodFeedbackHTML')({src:'My Bar',name:'Unknown',ref:{id:'unknown'},glass:'',garnish:'',method:''},'service'),'');
});
function setCard(b,mode,src='Cocktails'){
  const state=b.get('state'),fc=state.fc;
  const c=src==='Components' ? {src,name:'What is the rinse?',back:'Aromatic coating.',group:'Techniques',ref:{id:'c-9o8x4d6n'}}
    : src==='My Bar' ? {src,name:'Classic Sazerac',spec:[],glass:'',garnish:'',method:'',ref:{id:'b-olsmh04y'}}
    : Object.assign({},b.get('allDrinks')().find(x=>x.src==='Cocktails'&&x.name==='Sazerac'));
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
