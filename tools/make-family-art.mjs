/* Original ingredient-role plates for the second illustrated collection.
   The live A/B/C key carries the lesson. These are not measured house builds.
   Versioned files are immutable after publication. */
import {mkdirSync, writeFileSync} from 'node:fs';
const out=new URL('../img/studies/',import.meta.url);
mkdirSync(out,{recursive:true});
const p=(d,fill='none',stroke='#bfceb9',w=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const e=(x,y,rx,ry,fill='none',stroke='#bfceb9',w=2)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const g=(x,y,s,body)=>`<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
const defs=`<defs>
 <linearGradient id="room" x2="0" y2="1"><stop stop-color="#1c3530"/><stop offset="1" stop-color="#071710"/></linearGradient>
 <linearGradient id="brass"><stop stop-color="#806135"/><stop offset=".45" stop-color="#e9d299"/><stop offset=".8" stop-color="#9e7b40"/><stop offset="1" stop-color="#ecdcae"/></linearGradient>
 <linearGradient id="glass"><stop stop-color="#d6e9d7" stop-opacity=".28"/><stop offset=".22" stop-color="#f4fae7" stop-opacity=".4"/><stop offset=".4" stop-color="#759b91" stop-opacity=".08"/><stop offset=".85" stop-color="#3b6559" stop-opacity=".08"/><stop offset="1" stop-color="#e2e8d2" stop-opacity=".3"/></linearGradient>
 <linearGradient id="amber" x2="0" y2="1"><stop stop-color="#b98a47"/><stop offset="1" stop-color="#603722"/></linearGradient>
 <linearGradient id="ruby" x2="0" y2="1"><stop stop-color="#bd654a"/><stop offset="1" stop-color="#592928"/></linearGradient>
 <linearGradient id="citrus" x2="0" y2="1"><stop stop-color="#e8c96d"/><stop offset="1" stop-color="#a18a39"/></linearGradient>
 <radialGradient id="light"><stop stop-color="#b89756" stop-opacity=".2"/><stop offset="1" stop-color="#b89756" stop-opacity="0"/></radialGradient>
 <pattern id="paper" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L10 0" stroke="#ecd29c" stroke-width=".5" opacity=".09"/></pattern>
 <g id="compass"><circle r="18" fill="#122920" stroke="#ac8c51"/><path d="M0-12L3-3L12 0L3 3L0 12L-3 3L-12 0L-3-3Z" fill="url(#brass)"/><circle r="4" fill="#1a3024"/></g>
 <g id="ice">${p('M0 6L31 0L39 29L8 38Z','#cce8dd99','#cae2d2',1.3)}${p('M6 10L27 6M8 38L15 28L39 23','none','#e6f1e3',1)}</g>
 </defs>`;
function bottle(liquid='url(#amber)',narrow=false){
 const shape=narrow?'M-17-150H17V-103Q35-93 35-72V15Q0 29-35 15V-72Q-35-93-17-103Z':'M-19-150H19V-106Q49-99 54-70V15Q0 31-54 15V-70Q-49-99-19-106Z';
 return p(shape,'url(#glass)')+p(narrow?'M-30-69H30V12Q0 25-30 12Z':'M-49-69H49V12Q0 25-49 12Z',liquid,'none')+p(shape,'none')+p('M-21-166H21V-150H-21Z','url(#brass)','#a18b57',1)+p(narrow?'M-22-65V5':'M-39-65V5','none','#d5e6d0',2)+e(0,14,narrow?30:49,8,'none','#b1c3a5',1);
}
function sugar(){return p('M-29 0L-9-9L13 1L-7 13Z','#e9ddbc','#d3c49e',1)+p('M-29 0V25L-7 35V13Z','#bbaa85','#d3c49e',1)+p('M-7 13L13 1V24L-7 35Z','#ddd0ad','#d3c49e',1)+p('M8 19L28 10L47 21L27 32Z','#e8debb','#d3c49e',1)+p('M8 19V40L27 51V32Z','#bbab84','#d3c49e',1)+p('M27 32L47 21V43L27 51Z','#daccaa','#d3c49e',1);}
function citrus(radius=37,orange=false,lemon=false){
 let s=e(0,0,radius,radius,orange?'#bf8a3d':lemon?'#d4bf54':'#a4ad56','#d6ca83',2)+e(0,0,radius-5,radius-5,orange?'#e6b85f':lemon?'#e9d994':'#d8d994','#e5deb0',2);
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9; s+=p(`M${Math.cos(a)*5} ${Math.sin(a)*5}L${Math.cos(a)*(radius-8)} ${Math.sin(a)*(radius-8)}`,'none','#f2e9c2',2);}
 return s+e(0,0,4,4,'#f3edcf','none');
}
function peel(){return p('M-42 7C-25-27 13-20 26-3C44 22 8 39-4 24C-15 10 20 2 34 16','none','#dca353',10)+p('M-41 4C-24-25 13-20 26-3C44 22 8 37-4 24','none','#f1ce89',2);}
function branch(){return p('M-6 29Q5-15 18-42','none','#b8b17c',2)+[-20,0,18].map((y,i)=>p(`M${i*5} ${y}Q-24 ${y-27}-28 ${y-16}Q-23 ${y+1}${i*5} ${y}M${i*5} ${y-4}Q38 ${y-26}34 ${y-34}Q11 ${y-24}${i*5} ${y-4}`,'#547554','#9da874',1)).join('');}
function grape(){return [[-18,-29],[8,-32],[-29,-8],[0,-7],[27,-9],[-15,16],[12,17],[0,38]].map(([x,y],i)=>e(x,y,14,15,i%2?'#645461':'#46534c','#8e9280',1.3)+e(x-4,y-5,3,3,'#c5c9b7aa','none')).join('')+p('M-1-46Q3-62 22-63','none','#bba577',3);}
function bowl(content='sugar'){
 return e(0,0,50,12,'#d4c299','#a99768',1)+p('M-50 0Q-38 46 0 46Q38 46 50 0','#6d6848','#b6a675',2)+p('M-39 14Q0 34 39 14','none','#d2bb84',1)+(content==='sugar'?p('M-43-1Q-21-31 0-22Q20-30 43-1Z','#e0d2af','#bdaa7b',1):e(0,0,45,9,'url(#amber)','#bc9a65',1));
}
function tumbler(liquid='url(#amber)',foam=false,ice=false,tall=false){
 const h=tall?196:126, w=tall?48:63;
 let s=p(`M-${w} 0L-${w-9} ${h}Q0 ${h+18} ${w-9} ${h}L${w} 0`,'url(#glass)');
 s+=p(`M-${w-3} 36L-${w-10} ${h-4}Q0 ${h+10} ${w-10} ${h-4}L${w-3} 36Q0 48-${w-3} 36`,liquid,'none');
 if(ice)s+=g(-30,50,1,'<use href="#ice"/>')+g(3,92,1,'<use href="#ice"/>')+(tall?g(-18,139,1,'<use href="#ice"/>'):'');
 if(foam)s+=e(0,36,w-4,10,'#f0e3c5','#e5d9b8',1)+Array.from({length:12},(_,i)=>e(-43+i*7.7,35+(i%3),1.5,1.3,'none','#c7bb99',.6)).join('');
 s+=e(0,0,w,12,'none')+p(`M-${w-11} 13L-${w-19} ${h-10}`,'none','#d6e5d1',2);
 return s;
}
function bubbles(x=0,y=60,h=95){return Array.from({length:14},(_,i)=>e(x+(i*19%52)-26,y+(i*31%h),1.5+i%3,1.5+i%3,'none','#efe1b4',.9)).join('');}
function wine(){return p('M-62 0Q-99 106 0 114Q99 106 62 0','url(#glass)')+p('M-71 42Q-70 105 0 109Q70 105 71 42Q0 64-71 42','url(#ruby)','none')+g(-39,48,.85,'<use href="#ice"/>')+g(4,62,.83,'<use href="#ice"/>')+e(0,0,62,14)+p('M0 115V189M0 180Q-5 192-40 193Q0 209 40 193Q5 192 0 180','none','#cddccc',3)+p('M-51 15Q-70 84-30 97','none','#d6e5d1',2)+bubbles(0,58,42);}
function mug(){return p('M46 7Q85 2 82 37Q80 66 45 59','none','#d2cdb0',6)+p('M-49 0L-43 70Q0 91 43 70L49 0','#283f34','#d2cdb0',2)+e(0,0,49,13,'#795326','#d2cdb0',2)+p('M-38 20Q-20 27-2 27','none','#8fa288',1);}
const plus=(x,y)=>g(x,y,1,p('M-8 0H8M0-8V8','none','#c9ab70',1.5));
function plate(id,title,desc,scenes){
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${desc}</desc>${defs}<rect width="1200" height="600" rx="22" fill="url(#room)"/><rect width="1200" height="600" rx="22" fill="url(#paper)"/><rect x="17" y="17" width="1166" height="566" rx="16" fill="none" stroke="url(#brass)"/><path d="M45 53H549M651 53H1155M45 553H549M651 553H1155" stroke="#b59960" stroke-width=".8"/><use href="#compass" x="600" y="53"/><use href="#compass" x="600" y="553"/>`;
 scenes.forEach((scene,i)=>{s+=g(45+i*378,80,1,p('M10 395V112Q10 8 177 4Q344 8 344 112V395Z','#0d211b','url(#brass)',2)+p('M18 390V114Q18 18 177 12Q336 18 336 114V390Z','url(#light)','#796c46',.6)+p('M27 352Q177 343 327 352','none','#927c4c',1)+e(177,341,111,14,'#04110caa','none')+scene+e(177,416,20,20,'#11271e','url(#brass)',1)+`<text x="177" y="423" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="#f1d9a2">${'ABC'[i]}</text>`);});
 s+=p('M35 521Q63 491 33 458M42 506Q72 500 54 485M1165 521Q1137 491 1167 458M1158 506Q1128 500 1146 485','none','#9f8854',1.3)+'</svg>\n';
 writeFileSync(new URL(id+'-v1.svg',out),s);
}
plate('spirit-forward','Spirit-forward: three structures','Three generic ingredient groups, not proportions: A spirit with sugar and aromatic bitters; B spirit with aromatised wine; C spirit, bitter aperitif and aromatised wine. Bottles are unbranded role symbols, not Brennan’s products.',[
 g(136,293,1.07,bottle())+g(259,310,.67,bottle('url(#ruby)',true))+g(103,312,.8,sugar())+plus(218,266),
 g(112,288,.95,bottle())+g(247,288,.95,bottle('#8f6740',true))+g(214,312,.62,grape())+plus(184,225),
 g(91,293,.79,bottle())+g(181,293,.96,bottle('url(#ruby)',true))+g(269,293,.79,bottle('#947d4c',true))+g(186,321,.8,peel())
]);
plate('sour-structure','Sour structure and texture','Three general comparisons: A spirit, citrus and sugar; B citrus and a sweet liqueur; C a plain drink beside an optional foamed drink, with an egg as one possible foam ingredient. Foam does not identify its ingredient or establish safety.',[
 g(137,274,.95,bottle())+g(255,299,.85,bowl())+g(100,314,1,citrus())+plus(208,222),
 g(207,278,1,bottle('url(#amber)',true))+g(104,305,1,citrus(37,false,true))+g(236,319,.75,peel())+plus(124,199),
 g(98,223,.82,tumbler('#bdb073'))+g(247,223,.82,tumbler('#bdb073',true))+e(175,319,20,27,'#e4dac1','#bdb598',1.4)+p('M165 309Q160 322 169 330','none','#f0e9d7',2)
]);
plate('long-sparkling','Highball, fizz and spritz','Three representative examples, not house vessels: A a spirit and carbonated lengthener with serving ice; B a sour base and soda without serving ice; C an aperitif and sparkling-wine spritz with soda. Live captions explain variations and actual recipes govern.',[
 g(192,143,1,tumbler('#bdad70',false,true,true)+bubbles(0,63,104))+g(98,318,.49,bottle('#cfca9d',true)),
 g(192,143,1,tumbler('#c7ba86',false,false,true)+bubbles(0,57,111))+g(92,312,.75,citrus(32,false,true))+g(104,269,.38,bottle('#d0cea4',true)),
 g(187,146,1,wine())+g(94,312,.51,bottle('url(#ruby)',true))+g(281,311,.51,bottle('#c7bb83',true))
]);
plate('zero-proof','Zero-proof structure, equal hospitality','Three non-prescriptive ingredient-role studies: A tea and aromatic leaves; B fruit, citrus and sweetness; C a generic bitter alternative and sparkling water. The unbranded bottle is a concept, not a 0.0 percent or allergen claim. Read the actual product and house specification.',[
 g(147,266,1,mug())+g(254,299,.9,branch())+g(140,346,.75,branch())+e(147,349,88,8,'none','#9f8a57',1),
 g(215,273,.85,bowl('syrup'))+g(105,292,1,citrus(40,true))+g(190,327,.76,citrus(34))+g(280,327,.63,grape()),
 g(108,301,.82,bottle('url(#ruby)',true))+g(231,160,.9,tumbler('#c49557',false,false,true)+bubbles(0,62,110))+plus(167,224)
]);
console.log('Wrote four original family comparison plates.');
