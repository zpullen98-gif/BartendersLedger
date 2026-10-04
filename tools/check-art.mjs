/* Source and worker contracts for reviewed teaching pictures. No browser,
   network, storage files, or dependencies are needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { loadWing } from './load-wing.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const moduleSource = read('js/teaching-images.js');
const swSource = read('sw.js');
const picture = readFileSync(new URL('../img/explorers-library-768-v1.webp', import.meta.url));
const entry = (src = 'img/plates/example-v1.webp') => ({src, width:1024, height:1024,
  alt:'A reviewed specimen in its complete vessel.', caption:'A representative study picture, not a house specification.'});

function storage() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const rows = stores.get(name), key = r => typeof r === 'string' ? r : r.url;
      return {
        async match(r) { return rows.get(key(r))?.clone(); },
        async put(r, response) { rows.set(key(r), response.clone()); },
        async delete(r) { return rows.delete(key(r)); },
        async keys() { return [...rows.keys()].map(url => new Request(url)); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
}
function harness({base='https://example.test/ledger/', manifest={example:entry()}, caches=storage(), fetcher,
  document, navigator, immediateTimeout=false, worker=false} = {}) {
  const requests = [], events = {};
  const context = { URL, Request, Response, Uint8Array, DataView, AbortController, Map, Set, Promise,
    LEDGER_TEACHING_IMAGES:manifest, caches, location:new URL(base + 'sw.js'), document, navigator,
    fetch: async (url, options) => { requests.push({url, options}); return fetcher ? fetcher(url, options) : new Response(picture, {headers:{'Content-Type':'image/webp'}}); },
    setTimeout: immediateTimeout ? (fn => setTimeout(fn, 5)) : setTimeout, clearTimeout,
    addEventListener(type, fn) { events[type] = fn; }, clients:{claim:async()=>{}}, skipWaiting(){} };
  context.self = context;
  vm.createContext(context);
  context.importScripts = (...paths) => paths.forEach(path => {
    if (path.endsWith('data-teaching-images.js')) return; // fixture stands in for the reviewed registry
    vm.runInContext(read(path.replace('./','')), context);
  });
  vm.runInContext(worker ? swSource : moduleSource, context);
  return { api:context.LedgerTeaching, context, requests, events, caches };
}
const request = (path='img/plates/example-v1.webp', base='https://example.test/ledger/') => new Request(new URL(path,base));

test('glass icons distinguish named vessels and honour the first printed alternative', () => {
  const source = read('js/ui-new.js');
  const start = source.indexOf('const GLASS_ICONS = {'), end = source.indexOf('/* ---------------- MY DATA', start);
  const {key,icon,shapes} = vm.runInNewContext(source.slice(start,end) + ';({key:glassIconKey,icon:glassIcon,shapes:GLASS_ICONS})');
  for (const [text,want] of [
    ['Pre-heated Irish coffee glass','irish'],['Footed mug, caramelized sugar rim','irish'],['Frozen Nick & Nora','nicknora'],
    ['Nick & Nora','nicknora'],['Coupe or Nick & Nora','coupe'],['Rocks or coupe','rocks'],['Pilsner or tiki','pilsner'],
    ['Tiki mug','tiki'],['Tall tiki','tiki'],['Lined copper mug or highball','copper'],['Punch cup or rocks','punch'],
    ['Brûlot or demitasse cup','demitasse'],['Demitasse','demitasse'],['Beer glass','pint'],['Pint, salt rim','pint'],
    ['Metal swizzle cup','metal'],['Clay cantarito (the cup flavors the drink)','clay'],['Clay cup','clay'],
    ['Julep cup or rocks','julep'],['Highball or pint','collins'],['Wine glass or highball','wine'],
    ['Scorpion bowl or tall','bowl'],['Shot or coupe','shot'],['Coupe + sidecar shot','coupe'],
    ['Sugar-rimmed, whole lemon peel inside',null],['not printed; confirm with the bar',null],['',null],[null,null]
  ]) { assert.equal(key(text),want,text); assert.equal(!!icon(text),!!want,text); }
  assert.notEqual(shapes.nicknora,shapes.coupe);
  assert.notEqual(shapes.irish,shapes.mug);
  assert.notEqual(shapes.tiki,shapes.hurricane);
  assert.match(icon('Nick & Nora'),/aria-hidden="true"/);
});

test('phone image preserves the composition and all shell dependencies are cached', () => {
  const html = read('index.html');
  assert.match(html,/<source media="\(max-width: 639px\)" srcset="img\/explorers-library-768-v1.webp">/);
  assert.match(html,/<img src="img\/explorers-library.webp" width="1536" height="1024" alt=""/);
  assert.ok(picture.length < readFileSync(new URL('../img/explorers-library.webp',import.meta.url)).length / 3);
  for (const file of ['img/explorers-library-768-v1.webp','js/data-teaching-images.js','js/teaching-images.js']) {
    assert.ok(swSource.includes("'./"+file+"'"),file);
  }
  assert.ok(html.indexOf('js/data-teaching-images.js') < html.indexOf('js/teaching-images.js'));
  assert.ok(html.indexOf('js/teaching-images.js') < html.indexOf('js/app.js'));
  assert.match(swSource,/importScripts\('\.\/js\/data-teaching-images.js', '\.\/js\/teaching-images.js'\)/);
  assert.match(read('js/app.js'),/register\('sw\.js',\s*\{\s*updateViaCache:\s*'none'\s*\}\)/);
});

test('shipped manifest is explicit, descriptive and closes over real versioned files', () => {
  const ctx = {}; vm.runInNewContext(read('js/data-teaching-images.js'),ctx);
  const {api} = harness({manifest:ctx.LEDGER_TEACHING_IMAGES});
  assert.equal(Object.keys(api.entries).length,Object.keys(ctx.LEDGER_TEACHING_IMAGES).length);
  for (const item of Object.values(api.entries)) {
    for (const file of [item.src,item.thumb?.src].filter(Boolean)) {
      assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
      assert.ok(!swSource.includes("'./"+file+"'"),'optional image must not enter shell precache');
      assert.ok(readFileSync(new URL('../'+file,import.meta.url)).length <= api.maxImageBytes,file);
    }
    assert.ok(item.alt.trim() && item.caption.trim());
  }
});

test('only exact registered GET paths are eligible, with no guessed remote or sibling request', () => {
  const {api,requests} = harness({manifest:{example:entry(),bad:entry('https://elsewhere.test/image-v1.webp'),traversal:entry('img/plates/../example-v1.webp'),unversioned:entry('img/cards/example.webp')}});
  assert.equal(Object.keys(api.entries).length,1);
  assert.ok(api.handles(request()));
  for (const path of ['img/cards/unregistered-v1.webp','img/plates/example-v1.webp?v=2','../codex/img/plates/example-v1.webp','https://elsewhere.test/ledger/img/plates/example-v1.webp']) assert.equal(api.handles(request(path)),false,path);
  assert.equal(api.handles(new Request(request().url,{method:'POST'})),false);
  assert.equal(requests.length,0,'loading the module must not download images');
});

test('real worker caches a requested picture and serves it offline without shell or sibling writes', async () => {
  let online = true;
  const {api,events,caches,requests} = harness({worker:true,fetcher:()=> { if(!online) throw Error('offline'); return new Response(picture,{headers:{'Content-Type':'image/webp'}}); }});
  const get = async () => { let reply; events.fetch({request:request(),respondWith(p){reply=p;}}); return reply; };
  assert.equal((await get()).status,200); online=false;
  assert.deepEqual(Buffer.from(await (await get()).arrayBuffer()),picture);
  assert.equal(requests.length,1);
  assert.deepEqual(await caches.keys(),[api.cacheName]);
  await caches.open('ledger-v1'); await caches.open('oot-ledger-v100'); await caches.open('codexmaps-v2-%2Fcodex%2F');
  let activation; events.activate({waitUntil(p){activation=p;}}); await activation;
  assert.ok((await caches.keys()).includes(api.cacheName));
  assert.ok(!(await caches.keys()).includes('ledger-v1'));
  assert.ok((await caches.keys()).includes('oot-ledger-v100'));
  assert.ok((await caches.keys()).includes('codexmaps-v2-%2Fcodex%2F'));
});

test('installations and revisions stay separate; removal preserves sibling and shell caches', async () => {
  const caches=storage(), one=harness({caches}), two=harness({caches,base:'https://example.test/BartendersLedger/'});
  await one.api.serve(request()); await two.api.serve(request('img/plates/example-v1.webp','https://example.test/BartendersLedger/'));
  await caches.open('ledger-v73');
  assert.notEqual(one.api.cacheName,two.api.cacheName);
  const revised=harness({caches,manifest:{example:entry('img/plates/example-v2.webp')}});
  assert.equal(revised.api.handles(request()),false);
  await revised.api.serve(request('img/plates/example-v2.webp'));
  assert.equal(revised.requests.length,1,'old saved art cannot satisfy a new version');
  await one.api.forget();
  assert.deepEqual((await caches.keys()).sort(),[two.api.cacheName,'ledger-v73'].sort());
});

test('unregistered teaching namespace requests bypass all cache lookups', async () => {
  const {api,events,caches,requests}=harness({worker:true});
  // Any fallthrough to the broad shell lookup is a test failure.
  caches.match=()=>{throw Error('unexpected shell lookup');};
  for (const path of ['img/cards/unregistered-v1.webp','img/plates/example-v1.webp?old=1']) {
    let reply; events.fetch({request:request(path),respondWith(p){reply=p;}});
    assert.equal((await reply).status,200);
  }
  assert.equal(requests.length,2);
  assert.deepEqual(await caches.keys(),[],'unknown artwork must not create any cache');
  assert.equal(api.owns(request('../codex/img/cards/unregistered-v1.webp')),false);
  assert.equal(api.owns(request('https://elsewhere.test/ledger/img/cards/unregistered-v1.webp')),false);
});

test('a damaged cached picture is evicted and replaced with a validated download', async () => {
  const {api,caches,requests}=harness(), cache=await caches.open(api.cacheName);
  await cache.put(request(),new Response('<html>not an image</html>',{headers:{'Content-Type':'image/webp'}}));
  const response=await api.serve(request());
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),picture);
  assert.equal(requests.length,1);
  assert.deepEqual(Buffer.from(await (await cache.match(request())).arrayBuffer()),picture);
});

test('failed or oversized downloads are rejected and can be retried, without losing good entries', async () => {
  let next=()=>new Response(picture,{headers:{'Content-Type':'image/webp'}});
  const {api,caches}=harness({manifest:{example:entry(),other:entry('img/cards/other-v1.webp')},fetcher:()=>next()});
  await api.serve(request());
  for (const response of [new Response('<html>fallback</html>',{headers:{'Content-Type':'text/html'}}),
    new Response('<html>not a picture</html>',{headers:{'Content-Type':'image/webp'}}),
    new Response(picture,{status:206,headers:{'Content-Type':'image/webp'}}),
    new Response(picture,{headers:{'Content-Type':'image/webp','Content-Length':String(api.maxImageBytes+1)}}),
    new Response(new Uint8Array(api.maxImageBytes+1),{headers:{'Content-Type':'image/webp'}})]) {
    next=()=>response;
    await assert.rejects(api.serve(request('img/cards/other-v1.webp')));
    assert.equal((await (await caches.open(api.cacheName)).keys()).length,1);
  }
  next=()=>new Response(picture,{headers:{'Content-Type':'image/webp'}});
  await api.serve(request('img/cards/other-v1.webp'));
  assert.equal((await (await caches.open(api.cacheName)).keys()).length,2);
});

test('requests time out and do not poison the retry slot', async () => {
  const {api,requests}=harness({immediateTimeout:true,fetcher:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))});
  await assert.rejects(api.serve(request()),/aborted/);
  await assert.rejects(api.serve(request()),/aborted/);
  assert.equal(requests.length,2);
});

test('bounded storage evicts oldest optional images and keeps current ones', async () => {
  const manifest=Object.fromEntries(Array.from({length:66},(_,i)=>['item-'+i,entry('img/cards/item-'+i+'-v1.webp')]));
  const {api,caches}=harness({manifest});
  for(let i=0;i<66;i++) await api.serve(request('img/cards/item-'+i+'-v1.webp'));
  const cache=await caches.open(api.cacheName), keys=await cache.keys();
  assert.equal(keys.length,api.maxEntries);
  assert.equal(await cache.match(request('img/cards/item-0-v1.webp')),undefined);
  assert.ok(await cache.match(request('img/cards/item-65-v1.webp')));
  assert.ok(keys.length*picture.length<=api.maxBytes);
});

test('the byte bound applies before the entry limit, even with parallel arrivals', async () => {
  // A legal RIFF padding chunk makes a full-size fixture without asking a
  // remote encoder or relying on a dishonest Content-Length header.
  const padded=Buffer.alloc(512*1024); picture.copy(padded);
  padded.write('JUNK',picture.length); padded.writeUInt32LE(padded.length-picture.length-8,picture.length+4);
  padded.writeUInt32LE(padded.length-8,4);
  const manifest=Object.fromEntries(Array.from({length:34},(_,i)=>['item-'+i,entry('img/cards/item-'+i+'-v1.webp')]));
  const {api,caches}=harness({manifest,fetcher:()=>new Response(padded,{headers:{'Content-Type':'image/webp'}})});
  await Promise.all(Array.from({length:34},(_,i)=>api.serve(request('img/cards/item-'+i+'-v1.webp'))));
  const keys=await (await caches.open(api.cacheName)).keys();
  assert.equal(keys.length,32);
  assert.equal(keys.length*padded.length,api.maxBytes);
});

test('first-claim warming touches only finished registered images and the owning worker', async () => {
  const listeners={}, changes={}, image={tagName:'IMG',complete:true,naturalWidth:1024,src:request().url};
  const nav={serviceWorker:{controller:null,addEventListener:(name,fn)=>{changes[name]=fn;}}};
  const doc={readyState:'complete',currentScript:{src:'https://example.test/ledger/js/teaching-images.js'},
    images:[image,{...image,complete:false},{...image,src:'https://example.test/codex/img/plates/example-v1.webp'}],
    addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const {requests}=harness({document:doc,navigator:nav});
  assert.equal(requests.length,0);
  nav.serviceWorker.controller={scriptURL:'https://example.test/sw.js'}; changes.controllerchange();
  assert.equal(requests.length,0,'a hub worker must not be mistaken for the Ledger worker');
  nav.serviceWorker.controller={scriptURL:'https://example.test/ledger/sw.js'}; changes.controllerchange();
  assert.equal(requests.length,1);
  listeners.load({target:image}); changes.controllerchange();
  assert.equal(requests.length,1,'one warm per URL per worker');
  nav.serviceWorker.controller={scriptURL:'https://example.test/ledger/sw.js'}; changes.controllerchange();
  assert.equal(requests.length,2,'a newly installed worker gets a fresh warm');
});

test('figure text is escaped; missing and unknown art do not invent a lesson', () => {
  const {api}=harness({manifest:{example:{...entry(),alt:'A <glass> & "rim"',caption:'Caption <script>alert(1)</script>'}}});
  assert.equal(api.figure('unknown'),'');
  assert.equal(api.figure('constructor'),'');
  assert.equal(api.figure('toString'),'');
  const html=api.figure('example');
  assert.ok(html.includes('alt="A &lt;glass&gt; &amp; &quot;rim&quot;"'));
  assert.ok(html.includes('Caption &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(html.includes('<a class="teaching-image-open" href="img/plates/example-v1.webp" target="_blank" rel="noopener">Open full illustration (new tab)</a>'));
  assert.ok(html.includes('The illustration is unavailable. The lesson remains below.'));
});

test('a closed teaching reference loads no picture; opening it renders the key and caption once', () => {
  const listeners={}, doc={readyState:'loading',currentScript:{src:'https://example.test/ledger/js/teaching-images.js'},
    addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const {api,requests}=harness({document:doc,manifest:{example:{...entry(),labels:['Rocks','Highball']}}});
  const html=api.disclosure('example','Glass shapes: a service reference');
  assert.ok(html.startsWith('<details'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('example-v1.webp'),'a closed reference contains no image or full-image URL');
  assert.ok(html.includes('<li>Rocks</li><li>Highball</li>'));
  let renders=0;
  const slot={firstChild:null,querySelector:()=>null,set innerHTML(value){this.firstChild={};this.html=value;renders++;}};
  const details={tagName:'DETAILS',open:false,getAttribute:()=> 'example',querySelector:()=>slot};
  listeners.toggle({target:details}); assert.equal(renders,0);
  details.open=true; listeners.toggle({target:details});
  assert.equal(renders,1); assert.ok(slot.html.includes('img/plates/example-v1.webp'));
  assert.ok(slot.html.includes(entry().caption));
  listeners.toggle({target:details}); assert.equal(renders,1);
  assert.equal(requests.length,0,'only the browser image request should trigger a download');
});

test('the shipped reading surfaces show vessel vocabulary without changing records or individual cards', () => {
  const files=[...read('index.html').matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]).filter(f=>f!=='storage-alarm.js');
  const wing=loadWing(files), run=code=>vm.runInContext(code,wing);
  const before=run('JSON.stringify(progress)');
  run('state.menu.view="menu"; state.svc.dom="glassware"');
  const title='Glass shapes: a service reference';
  assert.ok(wing.get('renderMenu')().includes(title));
  assert.ok(wing.get('renderService')().includes(title));
  assert.equal(wing.get('LedgerTeaching').entries['brennans-glassware'].labels.length,9);
  assert.equal(wing.get('LedgerTeaching').entries['brennans-glassware'].caption,'Learn these common shapes. Confirm the glass for each drink with the bar.');
  run('state.svc.dom="wine"'); assert.ok(!wing.get('renderService')().includes(title));
  assert.ok(!wing.get('renderFlashcards')().includes(title));
  assert.equal(run('JSON.stringify(progress)'),before);
  run('houseStudyOn=()=>true; hsState=()=>({open:"fixture"}); houseStudyHTML=()=>"OPEN HOUSE CARD"');
  assert.ok(!wing.get('renderMenu')().includes(title));
  run('hsState=()=>({open:null})'); assert.ok(wing.get('renderMenu')().includes(title));
});

test('an offline size change can use the other saved size before showing a readable fallback', () => {
  const listeners={}, doc={readyState:'loading',currentScript:{src:'https://example.test/ledger/js/teaching-images.js'},addEventListener:(name,fn)=>{listeners[name]=fn;}};
  harness({document:doc,manifest:{example:{...entry(),thumb:{src:'img/plates/example-v1.thumb.webp',width:512,height:512}}}});
  const attrs={}, fallback={hidden:true}, parent={getAttribute:()=> 'example',querySelector:()=>fallback};
  const image={tagName:'IMG',src:request().url,currentSrc:request().url,hidden:false,closest:()=>parent,
    getAttribute:key=>attrs[key],setAttribute:(key,value)=>{attrs[key]=value;},removeAttribute:key=>{delete attrs[key];}};
  listeners.error({target:image});
  assert.equal(image.src,'img/plates/example-v1.thumb.webp'); assert.equal(image.hidden,false);
  listeners.error({target:image});
  assert.equal(image.hidden,true); assert.equal(fallback.hidden,false);
});

test('reopening retries only a fully failed picture and retains a successful one', () => {
  const listeners={}, doc={readyState:'loading',currentScript:{src:'https://example.test/ledger/js/teaching-images.js'},addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const {requests}=harness({document:doc,manifest:{example:{...entry(),thumb:{src:'img/plates/example-v1.thumb.webp',width:512,height:512}}}});
  let image, fallback, renders=0;
  const slot={firstChild:null,querySelector:selector=>selector==='img[hidden]' && image?.hidden ? image : null,
    set innerHTML(value){
      assert.ok(value.includes('Open full illustration (new tab)'));
      renders++; this.firstChild={}; const attrs={}; fallback={hidden:true};
      const parent={getAttribute:()=> 'example',querySelector:()=>fallback};
      image={tagName:'IMG',src:request().url,currentSrc:request().url,hidden:false,closest:()=>parent,
        getAttribute:key=>attrs[key],setAttribute:(key,value)=>{attrs[key]=value;},removeAttribute:key=>{delete attrs[key];}};
    }};
  const details={tagName:'DETAILS',open:false,getAttribute:()=> 'example',querySelector:()=>slot};
  listeners.toggle({target:details}); assert.equal(renders,0);
  details.open=true; listeners.toggle({target:details}); assert.equal(renders,1);
  listeners.error({target:image}); assert.equal(image.hidden,false,'alternate size remains eligible');
  listeners.error({target:image}); assert.equal(image.hidden,true); assert.equal(fallback.hidden,false);
  details.open=false; listeners.toggle({target:details}); assert.equal(renders,1,'closing cannot retry');
  details.open=true; listeners.toggle({target:details}); assert.equal(renders,2);
  assert.equal(image.hidden,false); assert.equal(fallback.hidden,true);
  assert.equal(image.getAttribute('data-teaching-alternate'),undefined,'new attempt can try both sizes');
  details.open=false; listeners.toggle({target:details}); details.open=true; listeners.toggle({target:details});
  assert.equal(renders,2,'an image that has not failed must survive collapse and reopen');
  assert.equal(requests.length,0,'toggle never prefetches; only the inserted browser image makes its request');
});
