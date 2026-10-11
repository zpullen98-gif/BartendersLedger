/* Original vector studies. Labels and teaching steps are live HTML beside the art.
   Run from any directory; released versions must not be overwritten for a correction. */
import fs from 'node:fs';
const out = new URL('../img/studies/', import.meta.url);
fs.mkdirSync(out, {recursive:true});
const defs = `<defs>
 <linearGradient id="room" x2="0" y2="1"><stop stop-color="#172e2a"/><stop offset="1" stop-color="#071512"/></linearGradient>
 <linearGradient id="gold"><stop stop-color="#8c6030"/><stop offset=".4" stop-color="#f3d799"/><stop offset=".7" stop-color="#b88b47"/><stop offset="1" stop-color="#edcd8c"/></linearGradient>
 <linearGradient id="steel"><stop stop-color="#324949"/><stop offset=".24" stop-color="#819994"/><stop offset=".39" stop-color="#d5ded0"/><stop offset=".5" stop-color="#68837d"/><stop offset=".8" stop-color="#17332f"/><stop offset="1" stop-color="#afbbb0"/></linearGradient>
 <linearGradient id="glass"><stop stop-color="#cce6d4" stop-opacity=".14"/><stop offset=".2" stop-color="#f5f5df" stop-opacity=".25"/><stop offset=".4" stop-color="#819e95" stop-opacity=".05"/><stop offset="1" stop-color="#dde9d9" stop-opacity=".25"/></linearGradient>
 <linearGradient id="amber" x2="0" y2="1"><stop stop-color="#bf873e"/><stop offset="1" stop-color="#66371d"/></linearGradient>
 <radialGradient id="halo"><stop stop-color="#b79453" stop-opacity=".13"/><stop offset="1" stop-color="#b79453" stop-opacity="0"/></radialGradient>
 <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#eed19b" stroke-width=".4" opacity=".14"/></pattern>
 <marker id="arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0 0L5 3L0 6" fill="none" stroke="#ead09a" stroke-width="1"/></marker>
 <g id="star"><path d="M0-13L3-3L13 0L3 3L0 13L-3 3L-13 0L-3-3Z" fill="url(#gold)"/><circle r="19" fill="none" stroke="#a88950" stroke-width=".6"/></g>
 <g id="ice"><path d="M0 5L38 0L43 37L5 42Z" fill="#c1e2de" fill-opacity=".23" stroke="#b1d2cb" stroke-width="1.6"/><path d="M6 10L32 7M9 15L12 34M5 42L14 30L43 27" fill="none" stroke="#d6eeeb" stroke-opacity=".55"/></g>
 </defs>`;
const path = (d, fill='none', stroke='#cbd9c9', w=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ellipse=(cx,cy,rx,ry,fill,stroke='#cbd9c9',w=2)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
function rocks(x,y,liquid='#88612f',level=65){return `<g transform="translate(${x} ${y})">${path('M-66 0L-57 119Q0 140 57 119L66 0','url(#glass)')}${path(`M-61 ${level}L-56 115Q0 135 56 115L61 ${level}Q0 ${level+15} -61 ${level}`,liquid,'none')}${ellipse(0,0,66,16,'#102722')}${path('M-57 8L-49 109M49 11L45 102','none','#d9e8d3',1.3)}${ellipse(0,119,56,12,'none','#aec5b4',1)}<path d="M-40 42V110M-20 45V115M0 48V119M20 45V115M40 42V110" stroke="#c8d9ba" opacity=".22"/></g>`;}
function mixing(x,y){return `<g transform="translate(${x} ${y})">${path('M-65 0L-47 166Q0 181 47 166L65 0L78-8L53-13','url(#glass)')}${path('M-59 69L-46 163Q0 177 46 163L58 69Q0 83-59 69','url(#amber)','none')}${ellipse(0,0,64,15,'none')}
 <use href="#ice" x="-38" y="78"/><use href="#ice" x="6" y="113"/><use href="#ice" x="-19" y="28" transform="rotate(14)"/>${path('M-51 12L-36 153','none','#e2eadb',2)}</g>`;}
function spoon(x,y,angle=0){return `<g transform="translate(${x} ${y}) rotate(${angle})">${path('M0-88V86','none','#c4a468',5)}${Array.from({length:15},(_,i)=>path(`M-3 ${i*7-72}L3 ${i*7-68}`,'none','#496056',1)).join('')}${ellipse(0,94,9,18,'url(#gold)','#a78745',1)}</g>`;}
function strainer(x,y,angle=0){return `<g transform="translate(${x} ${y}) rotate(${angle})">${ellipse(0,0,55,19,'url(#steel)')}${path('M8-14L16-70L24-69L23-11','url(#steel)')}${Array.from({length:18},(_,i)=>{const a=i*Math.PI/17;return ellipse(52*Math.cos(a),18*Math.sin(a)+5,4,5,'none','#becbbb',1)}).join('')}${[-24,-8,8,24].map(a=>ellipse(a,0,3,2,'#102722','none')).join('')}</g>`;}
function tin(x,y,angle=0,closed=false){return `<g transform="translate(${x} ${y}) rotate(${angle})">${path('M-63 0L-46 146Q0 157 46 146L63 0','url(#steel)')}${ellipse(0,0,63,13,'#203c36')}${path('M-46 12L-33 134','none','#e2e5cb',1)}${closed?path('M-61-3L-40-108Q-2-124 38-108L55-3Q0 10-61-3','url(#steel)'):''}${closed?ellipse(-1,-107,39,9,'url(#steel)'):''}</g>`;}
function cream(x,y,whipped=false){return `<g transform="translate(${x} ${y})">${ellipse(0,25,62,15,'#eee3c6','#d3c8a6',1)}${whipped?path('M-60 22Q-42 0-23 8Q-26-10-7-8Q-9-27 5-35Q0-12 25-9Q46-7 37 7Q57 7 61 24Q0 42-60 22','#f2e7cf','#d9ccaa',1.5):path('M-59 22Q-31 13 0 21Q33 30 60 21','none','#fff2cf',2)}${whipped?path('M-20 18Q12 23 37 7M-8-7Q8 1 25-9','none','#cbb997',1):''}</g>`;}
function cup(x,y,whipped=false){return `<g transform="translate(${x} ${y})">${path('M60 23Q108 17 105 61Q100 94 56 82','none','#b9caba',7)}${rocks(0,0,'#422b1c',8)}${ellipse(0,7,61,14,'#563b22','#ad9260',1)}${whipped?cream(0,-18,true):ellipse(0,7,59,13,'#ebdfc6','#decaa2',1)}</g>`;}
function highball(x,y,stage){return `<g transform="translate(${x} ${y})">${path('M-48 0L-39 185Q0 199 39 185L48 0','url(#glass)')}${path(`M-44 ${stage?55:136}L-38 182Q0 193 38 182L44 ${stage?55:136}Q0 ${stage?66:145}-44 ${stage?55:136}`,stage?'#b99953':'#917031','none')}${ellipse(0,0,48,12,'#17302a')}${path('M-38 8L-29 175','none','#e5ead6',2)}${stage?Array.from({length:17},(_,i)=>{let x=(i*23%60)-30,y=68+(i*37%106);return `<circle cx="${x}" cy="${y}" r="${i%3+1.5}" fill="none" stroke="#f4e6b7" stroke-width="1" opacity=".8"/>`}).join(''):''}</g>`;}
const arrow=(d)=>`<path d="${d}" fill="none" stroke="#ead09a" stroke-width="2" marker-end="url(#arrow)" stroke-linecap="round"/>`;
function frame(id,title,desc,scenes){
 let frame=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${desc}</desc>${defs}<rect width="1200" height="600" rx="22" fill="url(#room)"/><rect width="1200" height="600" rx="22" fill="url(#hatch)"/><rect x="17" y="17" width="1166" height="566" rx="16" fill="none" stroke="url(#gold)"/><path d="M45 54H548M652 54H1155M45 552H548M652 552H1155" stroke="#aa8746" stroke-width=".8"/><use href="#star" x="600" y="54"/><use href="#star" x="600" y="552"/>`;
 scenes.forEach((scene,i)=>{let x=45+i*378;frame+=`<g transform="translate(${x} 80)"><path d="M10 395V112Q10 8 177 4Q344 8 344 112V395Z" fill="#0c211b" stroke="url(#gold)" stroke-width="2"/><path d="M18 390V114Q18 18 177 12Q336 18 336 114V390Z" fill="url(#halo)" stroke="#aa8746" stroke-opacity=".45" stroke-width=".6"/><path d="M25 352Q177 343 329 352" stroke="#957744" stroke-width="1"/><ellipse cx="177" cy="346" rx="108" ry="16" fill="#020c09" opacity=".6"/>${scene}<circle cx="177" cy="414" r="20" fill="#0d211b" stroke="url(#gold)"/><text x="177" y="421" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="#f1d9a2">${'ABC'[i]}</text></g>`;});
 frame+=`<path d="M25 520Q61 480 27 456M27 500Q48 503 46 485M1175 520Q1139 480 1173 456M1173 500Q1152 503 1154 485" fill="none" stroke="#9a7c42" stroke-width="1.4"/></svg>`;
 fs.writeFileSync(new URL(id+'-v1.svg',out),frame+'\n');
}
frame('stir-rinse','Stir, strain and rinse','Three general method panels: a serving vessel coated with a rinse; stirring liquid with ice in a separate mixing glass; straining into a prepared vessel while retaining the mixing ice.',[
 `${rocks(177,208,'#a59656',102)}${arrow('M107 171C111 130 235 130 245 174')}${path('M126 227Q129 265 135 297M229 229Q224 270 222 298','none','#d5c382',4)}${ellipse(176,312,44,7,'none','#e6d693',1)}`,
 `${mixing(177,177)}${spoon(192,212,-9)}${arrow('M108 126C127 104 207 96 237 125')}`,
 `<g transform="translate(115 185) rotate(42)">${mixing(0,-62)}${strainer(0,-68)}</g>${path('M185 179Q217 202 212 242','none','#d1a34d',4)}${rocks(221,233,'url(#amber)',72)}`
]);
frame('shake-texture','Shake for the requested texture','Three general method panels: secure two tins; move the closed shaker; choose the specified straining method and assess the result. The illustration does not show a universal grip or duration.',[
 `${tin(181,193,0,false)}<g transform="translate(171 117) rotate(-8)">${path('M-48 0L-33-85Q0-96 33-85L48 0','url(#steel)')}${ellipse(0,0,48,10,'#152e29')}</g>${arrow('M258 124V175')}`,
 `${tin(176,212,28,true)}${arrow('M92 140L121 103')}${arrow('M232 309L205 346')}`,
 `<g transform="translate(112 190) rotate(43)">${tin(0,-80)}${strainer(0,-82)}</g>${path('M185 158Q228 207 217 244','none','#eadbc0',4)}${rocks(220,235,'#c8b48d',73)}${ellipse(220,307,58,10,'#e9dbbc','#ebdec4',1)}`
]);
frame('coffee-cream','Coffee, cream and texture','Three concept panels: pourable and whipped cream textures; a generic controlled cream float over a spoon; whipped cream with coffee as an ingredient concept. No panel specifies Brennan\'s vessel or finished presentation.',[
 `${cream(110,216)}${cream(245,207,true)}${path('M56 251Q109 283 164 251M192 251Q243 283 298 251','none','#aebea7',2)}${path('M177 149V308','none','#8f774b',1)}`,
 `${cup(177,225)}${path('M195 208H286','none','#c4a468',4)}${ellipse(177,208,20,5,'url(#gold)','#d6bd80',1)}${path('M104 91Q72 96 82 119L111 141L155 118L148 77Q122 63 98 79Z','url(#steel)')}${path('M157 120Q190 128 186 151Q181 175 177 203M160 210Q156 221 167 229','none','#f2e4c7',4)}`,
 `${cup(162,220,true)}${path('M137 149Q118 128 136 111M166 141Q145 120 165 100M194 153Q179 136 197 117','none','#b6bfa3',1)}`
]);
frame('build-bubbles','Build gently with bubbles','Three general open-vessel panels: prepare the non-carbonated base; introduce the sparkling addition; combine gently only as the recipe requires. Never shake a sealed vessel containing the carbonated addition.',[
 `${highball(177,156,0)}${path('M111 115L122 74L158 79L158 127Q135 138 111 115','url(#steel)')}${path('M156 122Q183 137 176 185','none','#d5b05f',3)}`,
 `${highball(184,156,1)}<g transform="translate(89 112) rotate(32)">${path('M-22-56L17-56L19-27Q38-10 36 17L33 73Q0 84-33 73L-34 15Q-36-8-20-27Z','#1e4730','#a09b62',2)}${path('M-22-57H17V-38H-22Z','url(#gold)')}${path('M-26 20H27V48H-26Z','#cbb985','#876e36',1)}</g>${path('M126 81Q166 94 184 158','none','#f1d995',3)}`,
 `${highball(177,156,1)}${spoon(198,188,-8)}${arrow('M109 233C88 208 90 177 106 160')}`
]);
console.log('Wrote four original method sequences.');
