/* ---------------- THE TASTING ROOM ---------------- */
const TASTE_CATS = {
  'Whiskey':{
    glass:"Glencairn or copita — the tulip shape concentrates aroma. Never a rocks glass for evaluation.",
    nose:['grain/cereal','vanilla','caramel','honey','baking spice','black pepper','dried fruit','fresh orchard fruit','citrus peel','oak/sawdust','char/ash','smoke/peat','leather','tobacco','floral','mint','dill/anise','nutty','chocolate','solvent/acetone'],
    markers:["Grain shows as cereal, biscuit, or corn sweetness — high-rye whiskeys read peppery and dill-like.","Wood shows as vanilla, coconut (American oak), or dried fruit and clove (European/sherry oak).","Solvent or acetone notes usually mean young spirit or a hot cut.","Peat is not one flavor: medicinal iodine (Laphroaig), clean campfire (Ardbeg), or heather-honey smoke (Highland Park)."],
    benchmarks:["Buffalo Trace — the neutral American reference","Heaven Hill's Rittenhouse BiB — what rye spice actually tastes like","Laphroaig 10 — the peat benchmark","Midleton's Redbreast 12 — single pot still texture"],
  },
  'Gin':{
    glass:"Copita, or a small wine glass. Add a few drops of water — gin opens dramatically.",
    nose:['juniper/pine','coriander','citrus peel','angelica/root','licorice','cardamom','cassia/cinnamon','floral','cucumber','herbal/grassy','pepper','earthy','almond','sweet/malty'],
    markers:["Juniper should be identifiable — if you can't find it, you may be tasting a contemporary style.","Coriander reads as lemony and slightly soapy; angelica as dry, woody, and earthy.","Steeped gins feel heavier and oilier; vapor-infused gins feel lighter and brighter.","Old Tom will register as noticeably sweeter; genever will read malty, almost like a light whiskey."],
    benchmarks:["Tanqueray — the London Dry reference","Plymouth — softer, root-forward","Hayman's Old Tom — the sweetened historical style","Monkey 47 — the contemporary/botanical extreme"],
  },
  'Rum':{
    glass:"Copita or Glencairn. Rum hides badly — heat and sugar both show fast.",
    nose:['molasses','fresh cane/grassy','banana','pineapple','overripe fruit','glue/ester funk','vanilla','caramel','coconut','baking spice','oak','smoke','brine/olive','nutty','burnt sugar'],
    markers:["Grassy and vegetal means cane juice (agricole); molasses reads darker and sweeter.","Banana, pineapple, and glue are esters — the Jamaican signature.","A syrupy, heavy mouthfeel with little aromatic complexity often means added sugar.","Tropical aging gives concentrated wood character at young ages; a tropical 8-year can taste like a continental 20."],
    benchmarks:["Foursquare Doorly's — honest Barbadian blend, no additives","Hampden — the ester extreme","Rhum J.M or Neisson — agricole's grassy signature","El Dorado — Demerara wooden-still richness"],
  },
  'Agave':{
    glass:"Copita or veladora (the traditional clay/glass cup). Never shoot it.",
    nose:['cooked agave','raw/green agave','citrus','white pepper','black pepper','minerality/wet stone','earth','smoke','herbal','floral','olive/brine','vanilla','caramel','tropical fruit','vegetal/bell pepper'],
    markers:["Cooked-agave sweetness means brick ovens; a flat, thin, faintly chemical profile can indicate a diffuser.","Highland (Los Altos) agave tends fruity and floral; valley agave tends earthy and peppery.","Tahona-crushed spirit often reads rounder and more mineral than roller-milled.","Vanilla and caramel in a blanco is a red flag for additives — that should come from wood, not a bottle."],
    benchmarks:["Fortaleza Blanco — traditional production, full stop","Tequila Ocho — terroir made legible","Cascahuín — valley style","Del Maguey Vida — the accessible mezcal reference"],
  },
  'Brandy':{
    glass:"Copita, not a balloon snifter — the wide bowl just concentrates alcohol vapor.",
    nose:['grape/wine','dried fruit','fig/raisin','apricot','floral','honey','vanilla','oak','rancio (mushroom/nutty)','baking spice','leather','tobacco','apple/pear','citrus'],
    markers:["Rancio — a savory, mushroomy, nutty note — is the mark of genuinely old brandy and considered a virtue.","Grande Champagne cognac reads chalky and floral; Borderies reads nuttier and rounder.","Armagnac is rustic and more aromatic because it's distilled once at lower proof.","Pisco should show bright, unaged grape character with no wood at all."],
    benchmarks:["Pierre Ferrand 1840 — cognac as the classics knew it","Château du Tariquet — armagnac's rusticity","Christian Drouin — calvados benchmark","Caravedo — proper Peruvian pisco"],
  },
  'Amaro & Vermouth':{
    glass:"Small wine glass, lightly chilled. Taste them the way you'd serve them.",
    nose:['gentian/root bitter','citrus peel','rhubarb','wormwood','mint/menthol','saffron','caramel','vanilla','dried herbs','cola/spice','cherry','wine/oxidized','floral','anise','chocolate'],
    markers:["Locate the bitterness first: root (gentian, rhubarb), peel (citrus pith), or herbal (wormwood, menthol).","Vermouth should taste like wine underneath — if it tastes flat and raisiny, the bottle is oxidized and dead.","Sweetness in amaro masks bitterness; taste for how quickly the sweetness fades and the bitter arrives.","A dead vermouth is the most common flaw on any back bar. Check yours weekly against a fresh bottle."],
    benchmarks:["Campari — the aperitivo bitterness standard","Fernet-Branca — the menthol/saffron extreme","Carpano Antica — rich sweet vermouth","Dolin Dry — light alpine dry vermouth"],
  },
};

const FLIGHTS = [
  { name:"Peat Is Not One Flavor", cat:"Whiskey", teaches:"That 'smoky' is a lazy word, and that phenol ppm doesn't predict taste.",
    pours:["Laphroaig 10 — Islay, ~40ppm, coastal peat","Ardbeg 10 — Islay, ~55ppm, purifier-equipped still","Highland Park 12 — Orkney, heather peat, sherry casks"],
    look:"Rank them by how smoky you expect from the numbers, then taste blind and rank by how smoky they actually seem.",
    lesson:"Ardbeg carries the highest phenol count and usually reads cleanest, because its purifier pipe strips the heaviest compounds. Laphroaig's peat is medicinal and iodine-driven; Highland Park's is floral and honeyed because Orkney's peat is heather rather than woodland. Peat level is a measurement of the malt, not a prediction of the glass." },
  { name:"Yeast Is an Ingredient", cat:"Whiskey", teaches:"That the same grain and the same warehouse can produce different whiskeys.",
    pours:["Four Roses Single Barrel (OBSV recipe)","Four Roses Small Batch (blend of four recipes)","Any second Four Roses single-barrel recipe you can find"],
    look:"Same distillery, same warehouses, same climate. Note fruit versus spice versus floral.",
    lesson:"Four Roses runs two mashbills against five proprietary yeast strains for ten distinct recipes. Most drinkers assume mashbill drives flavor; this flight shows yeast doing at least as much work." },
  { name:"Grain to Glass: The Bourbon Variables", cat:"Whiskey", teaches:"How mashbill and proof change texture, not just flavor.",
    pours:["Maker's Mark — wheated","Wild Turkey 101 — high rye, low barrel entry proof","Buffalo Trace — low rye, standard entry proof"],
    look:"Rank by sweetness, then by spice, then by mouthfeel weight. Note where heat appears on the palate.",
    lesson:"Wheat softens and rounds; rye sharpens and adds pepper and dill. Wild Turkey's lower barrel entry proof means less water added at bottling, which is why it feels denser than its price suggests." },
  { name:"Juniper Forward, Juniper Back", cat:"Gin", teaches:"The full range the word 'gin' covers.",
    pours:["Tanqueray — four botanicals, juniper-dominant","Plymouth — softer, root-forward","Monkey 47 or Hendrick's — contemporary style"],
    look:"Find juniper in each. Note how hard you have to hunt for it in the third.",
    lesson:"London Dry is a production method, not a flavor promise. Contemporary gins are legal as long as juniper dominates — but 'dominates' leaves enormous room. Knowing where a bottle sits on this spectrum tells you whether it will survive a Negroni." },
  { name:"Old Tom and the Missing Sweetness", cat:"Gin", teaches:"Why 19th-century recipes taste wrong with modern gin.",
    pours:["Hayman's London Dry","Hayman's Old Tom","Genever, if you can find it"],
    look:"Taste each neat, then make a small Martinez with each.",
    lesson:"Old Tom's light sweetening is the bridge between malty genever and bone-dry London Dry. The Martinez, the original Tom Collins, and much of the pre-1900 canon were written for it — which is why they taste thin and harsh when built with modern dry gin." },
  { name:"Molasses, Cane, and Funk", cat:"Rum", teaches:"That 'rum' describes at least three unrelated spirits.",
    pours:["A clean Spanish-style white (Havana Club 3 or Probitas)","A Jamaican pot still (Appleton Signature or Hampden)","A rhum agricole blanc (Rhum J.M or Neisson)"],
    look:"Nose all three before tasting. The agricole should smell like a cut lawn; the Jamaican like overripe fruit and glue.",
    lesson:"Base material and still type matter more than color or age. Once you can identify these three poles blind, you can reverse-engineer almost any rum cocktail — and you'll understand why swapping rums changes a Daiquiri completely." },
  { name:"Terroir in Agave", cat:"Agave", teaches:"That where the plant grew is legible in the glass.",
    pours:["A Los Altos highland blanco (Tequila Ocho or G4)","A valley blanco (Cascahuín or Fortaleza)","An espadín mezcal (Del Maguey Vida)"],
    look:"Rank by fruitiness, then by earthiness and pepper. Note where minerality appears.",
    lesson:"Highland agave grows in iron-rich red soil at altitude and tends fruity and floral; valley agave tends earthy, peppery, and mineral. The mezcal adds pit-roasting on top of both variables, which is why smoke is a production choice rather than an agave characteristic." },
  { name:"Additives and the Honest Blanco", cat:"Agave", teaches:"To recognize what shouldn't be there.",
    pours:["A verified additive-free blanco (Fortaleza, Ocho, G4, Siete Leguas)","A widely available mass-market blanco","A third of either kind, poured blind by a friend"],
    look:"Look specifically for vanilla, caramel, or a syrupy roundness in an unaged spirit. It has no legitimate source.",
    lesson:"Mexican regulations permit up to 1% undisclosed additives even in 100% agave tequila — glycerin for body, sweetener, oak extract, caramel color. None of it is illegal; all of it is invisible on the label. Your palate is the only detector you have." },
  { name:"Is Your Vermouth Dead?", cat:"Amaro & Vermouth", teaches:"The single most common flaw on any back bar.",
    pours:["A freshly opened bottle of sweet vermouth","The bottle currently on your back bar","The same fresh bottle after a week unrefrigerated, if you're patient"],
    look:"Nose both. Fresh vermouth smells like wine with herbs; oxidized vermouth smells like raisins, sherry, and dust.",
    lesson:"Vermouth is wine. An open bottle at room temperature is noticeably degraded within a week and undrinkable within a month. Refrigerate, date the bottle, buy smaller formats. This one habit improves more of your cocktails than any technique you can practice." },
  { name:"Where the Bitterness Lives", cat:"Amaro & Vermouth", teaches:"To place a bitter liqueur by its source, not its brand.",
    pours:["Campari — citrus-peel and root bitterness","Cynar — vegetal artichoke bitterness","Fernet-Branca — menthol, saffron, and aggressive root"],
    look:"Note when the bitterness arrives — immediately, mid-palate, or only at the finish — and how long it stays.",
    lesson:"Amari differ less in intensity than in the location and timing of their bitterness. Once you can identify that, substituting intelligently becomes possible: a Negroni made with Cynar isn't worse, it's a different drink with a known shape." },
  { name:"Proof, Water, and Texture", cat:"Whiskey", teaches:"That dilution is a tool, not a compromise.",
    pours:["Any cask-strength whiskey, poured three times","Glass one neat","Glass two with a few drops of water; glass three with roughly 20% water"],
    look:"Nose and taste each in order. Track when aromas open up and when they flatten out.",
    lesson:"Water breaks alcohol's surface tension and releases volatile aromatics — this is precisely what shaking and stirring do for a cocktail. Finding the point where a whiskey opens and the point where it collapses is the most direct lesson available in why dilution is an ingredient." },
  { name:"Pot Still Versus Column", cat:"Brandy", teaches:"How still design shapes a spirit before wood ever touches it.",
    pours:["A VSOP cognac (double pot distilled)","A Bas-Armagnac (single continuous column, lower proof)","A pisco (pot, distilled to proof, unaged)"],
    look:"Compare weight and aromatic intensity before judging the wood.",
    lesson:"Cognac's double pot distillation to a higher proof yields elegance and polish; armagnac's single low-proof column pass leaves more congeners and more rustic aroma. Pisco, distilled to final strength with no water added and no wood, shows what the still alone produces." },
];

const TASTE_METHOD = [
  ["Set up honestly","Use the same glass for every pour — a Glencairn or copita, never a rocks glass or balloon snifter. Pour equal, modest measures (half an ounce is plenty). Room temperature. Good light against a white background. If you're evaluating rather than enjoying, have a spit cup; a serious flight will otherwise end your usefulness for the evening."],
  ["Nose it properly","Keep your mouth slightly open and take short, gentle sniffs from just above the rim — jamming your nose into the glass anaesthetizes you with ethanol. Nose each pour before tasting any of them. Your first impression is the most honest one you'll get, so write it down before you start second-guessing."],
  ["Then taste","Take a small sip and let it coat your whole mouth before swallowing or spitting. The first sip mostly registers alcohol — it's the second that tells you anything. Note where flavors appear: front palate, mid, or only after you swallow. Finish length is a real quality signal; count the seconds it lingers."],
  ["Add water deliberately","A few drops opens most spirits above 45% ABV, releasing aromatics that alcohol was masking. Nose again after the water — it's often a different spirit. This is the clearest demonstration of why dilution belongs in a cocktail rather than being a necessary evil."],
  ["Manage palate fatigue","Taste light to heavy, unpeated before peated, low proof before high. Three to five pours is a real session; beyond six, you're guessing. Reset with plain water and unsalted crackers, not coffee. If everything starts tasting like alcohol, you're done — stop and come back tomorrow."],
  ["Write before you look","Always record your notes before you learn what you tasted. Knowing the label rewrites your perception instantly and permanently. Blind tasting isn't a party trick; it's the only way to know whether your palate or your expectations are doing the work."],
  ["Build the vocabulary","Use the same words consistently, even imprecise ones, so your notes are comparable over time. Aroma vocabulary is learned, not innate — smell your ingredients deliberately: crack a coriander seed, smell juniper berries, taste your syrups. Nearly all of what people call taste is smell, and smell is trainable."],
];

function renderTastingForm(){
  const t = state.tast;
  const cat = TASTE_CATS[t.cat];
  const catOpts = Object.keys(TASTE_CATS).map(c => '<option value="'+esc(c)+'"'+(t.cat===c?' selected':'')+'>'+esc(c)+'</option>').join('');
  const appearance = ['water white','straw','pale gold','gold','amber','copper','mahogany'].map(a =>
    '<button class="chip'+(t.appearance===a?' on':'')+'" data-act="tst-app" data-v="'+esc(a)+'">'+esc(a)+'</button>').join(' ');
  const noseChips = cat.nose.map(n =>
    '<button class="chip'+(t.nose.includes(n)?' on':'')+'" data-act="tst-nose" data-v="'+esc(n)+'">'+esc(n)+'</button>').join(' ');
  const axes = [['sweet','Sweet'],['acid','Acid/Bright'],['bitter','Bitter'],['body','Body/Weight'],['heat','Heat']].map(([k,label]) => {
    const dots = [1,2,3,4,5].map(v =>
      '<button class="chip'+(t.palate[k]===v?' on':'')+'" data-act="tst-axis" data-k="'+k+'" data-v="'+v+'" style="min-width:30px">'+v+'</button>').join('');
    return '<div class="row" style="gap:6px"><span class="tiny dim" style="width:92px;flex-shrink:0">'+label+'</span>'+dots+'</div>';
  }).join('');
  const finish = ['short','medium','long','very long'].map(f =>
    '<button class="chip'+(t.finish===f?' on':'')+'" data-act="tst-finish" data-v="'+esc(f)+'">'+esc(f)+'</button>').join(' ');
  const markers = cat.markers.map(m => '<li class="small dim lh" style="margin-bottom:5px">'+esc(m)+'</li>').join('');
  const benches = cat.benchmarks.map(b => '<div class="tiny dim">· '+esc(b)+'</div>').join('');
  return '<div class="panel p5 col" style="gap:14px">'
    + '<div class="row" style="gap:10px">'
    + '<select class="input" id="tst-cat" style="flex:1;min-width:150px">'+catOpts+'</select>'
    + '<input class="input" id="tst-label" placeholder="What is it? (or Blind #1)" value="'+esc(t.label||'')+'" style="flex:2;min-width:160px">'
    + '</div>'
    + '<div class="tiny dim lh"><span class="brass2">Glass · </span>'+esc(cat.glass)+'</div>'
    + '<div><div class="eyebrow mb1">Appearance</div><div class="row" style="gap:6px">'+appearance+'</div></div>'
    + '<div><div class="eyebrow mb1">Nose — tap everything you find</div><div class="row" style="gap:6px">'+noseChips+'</div></div>'
    + '<div><div class="eyebrow mb1">Palate structure (1 low – 5 high)</div><div class="col-sm" style="gap:5px">'+axes+'</div></div>'
    + '<div><div class="eyebrow mb1">Finish</div><div class="row" style="gap:6px">'+finish+'</div></div>'
    + '<div><div class="eyebrow mb1">Your notes</div>'
    + '<textarea class="input" id="tst-notes" rows="3" placeholder="Write before you look at the label.">'+esc(t.notes||'')+'</textarea></div>'
    + '<div class="row"><button class="btn btn-brass" data-act="tst-save">Save this note</button>'
    + '<button class="chip" data-act="tst-clear">Clear the card</button></div>'
    + '<div class="tix-rule" style="border-color:var(--felt-3)"></div>'
    + '<div><div class="eyebrow mb1">What to look for in '+esc(t.cat)+'</div><ul style="padding-left:18px;margin:0">'+markers+'</ul></div>'
    + '<div><div class="eyebrow mb1">Benchmarks worth knowing</div>'+benches+'</div>'
    + '</div>';
}

/* ---------------- THE TICKET RAIL: sequencing under the clock ---------------- */
/* Three tickets up is not three times one ticket. Build order is derivable from
   data already on every cocktail: method, carbonation, egg, and glassware. */
const RAIL_STAGES = [
  /* rank 0 is the dry-shake station, so it must key off the METHOD, not the word
     "cream" in a spec — coconut cream and a cream float are not dry-shaken */
  { rank:0, test:c => /dry shake/i.test(c.method) || (/\begg\b/i.test(c.spec.join(' ')) && /shake/i.test(c.method)),
    why:'Egg takes the longest — dry shake it first while everything else waits.' },
  /* anchored: "Build over ice, stir" is a built drink, not a stirred one */
  { rank:1, test:c => /^\s*stir/i.test(c.method),
    why:'Stirred goes into the mixing glass early. It chills and dilutes while your hands are elsewhere.' },
  /* affirmative shake verb only — Bloody Mary's "never shake" must not match */
  { rank:2, test:c => /^\s*(dry\s+|whip\s+|hard\s+)?shake|,\s*shake/i.test(c.method),
    why:'Shaken next — and if two drinks share a tin size, they share a shake.' },
  { rank:3, test:c => /soda|tonic|ginger beer|cola|champagne|prosecco|sparkling|beer/i.test(c.spec.join(' ')) || /build/i.test(c.method),
    why:'Carbonated and built go last. Every second a highball waits, it goes flatter.' },
];
function railStage(c){
  for(const s of RAIL_STAGES) if(s.test(c)) return s;
  /* rolled, thrown, muddled — hand-built but not shaken. Don't tell the learner
     to shake something whose own method says never to. */
  return { rank:2, why:'Rolled or hand-built — sits mid-rail, after the stirred and before anything carbonated.' };
}
/* Deck entries are {src,name} PAIRS, not bare names. A bare name resolved
   against COCKTAILS, so a house drink called Margarita would have graded
   against the canon spec — the exact wrong answer for the person drilling
   their own menu. */
function railResolve(e){
  if(!e) return null;
  const name = e.name !== undefined ? e.name : e;   /* tolerate a pre-pair deck */
  if(e.src === 'My Bar') return (progress.bar||[]).find(b => b.name === name) || null;
  return COCKTAILS.find(c => c.name === name) || null;
}
function railDeal(){
  const pool = COCKTAILS.filter(c => c.tier <= 6);
  const picks = [];
  /* one from each station type where possible, so a rail is never four sours */
  RAIL_STAGES.forEach(s => {
    const cand = shuffle(pool.filter(c => railStage(c).rank === s.rank && !picks.some(p => p.name === c.name)));
    if(cand.length) picks.push(cand[0]);
  });
  while(picks.length < 4){
    const extra = sample(pool.filter(c => !picks.some(p => p.name === c.name)), 1)[0];
    if(!extra) break;
    picks.push(extra);
  }
  let deck = shuffle(picks).slice(0, 4).map(c => ({ src:'Cocktails', name:c.name }));
  /* one ticket from the venue's own menu rides every rail once a list exists —
     the order skill matters most on the drinks you will actually be fired.
     No method requirement: railStage's default rank places a method-less
     drink mid-rail, the honest answer for a spec-only entry — requiring it
     silently broke the tab's "one of yours on the rail" promise. */
  const bar = (progress.bar||[]).filter(b => (b.spec||[]).length);
  if(bar.length && deck.length){
    const b = sample(bar, 1)[0];
    deck[Math.floor(Math.random()*deck.length)] = { src:'My Bar', name:b.name };
    deck = shuffle(deck);
  }
  return deck;   /* called in random order, as they would be */
}
function railHTML(){
  const r = state.practice.rail || {};
  const names = r.deck || [];
  if(!names.length){
    return '<div class="panel p5 col tc" style="align-items:center;gap:12px">'
      + '<div class="eyebrow">The ticket rail</div>'
      + '<div class="small dim lh" style="max-width:460px">Four tickets land at once. You have drilled 365 specs one at a time — this is the other skill: which one starts, which one finishes last, which two share a tin. '
      + 'Deal the rail, start the clock, build all four for real, then check your order against the answer.</div>'
      + '<button class="btn btn-brass" data-act="rail-deal">Deal a rail</button></div>';
  }
  const drinks = names.map(railResolve).filter(Boolean);
  const ticket = '<div class="ticket"><div class="ticket-inner">'
    + '<div class="tc"><div class="tix-label">Table 12 · all day</div></div><div class="tix-rule"></div>'
    + drinks.map((c,i) => '<div class="spec-line"><span>'+(i+1)+'</span><span class="bold">'+esc(c.name.toUpperCase())+'</span></div>').join('')
    + '<div class="tix-rule"></div><div class="tix-note">Fired '+drinks.length+' · one guest waiting on all of them</div></div></div>';
  const answer = r.revealed
    ? '<div class="panel p4 col-sm" style="width:100%;max-width:460px">'
      + '<div class="eyebrow mb1">The rail order</div>'
      + drinks.slice().sort((a,b) => railStage(a).rank - railStage(b).rank)
        .map((c,i) => '<div class="small lh" style="border-bottom:1px solid var(--felt-3);padding:7px 0">'
          + '<span class="brass2 bold">'+(i+1)+'. '+esc(c.name)+'</span> <span class="tiny dim">'+esc(c.method)+'</span><br>'
          + '<span class="tiny dim">'+esc(railStage(c).why)+'</span></div>').join('')
      + '<div class="tiny dim lh mt1">Glassware pulls in one trip: '+esc([...new Set(drinks.map(c=>c.glass))].join(' · '))+'.</div></div>'
    : '';
  const log = (progress.practice && progress.practice.rail) || [];
  const hist = log.slice(-5).reverse().map(e =>
    '<div class="hist-row"><span>'+esc(e.d)+(e.ok===false?' <span style="color:var(--oxblood)">wrong order</span>':e.ok?' <span class="brass2">order right</span>':'')
    + '</span><span class="font-tix brass2">'+e.v+' sec</span></div>').join('');
  return '<div class="col" style="align-items:center">'
    + ticket
    + '<div class="row center" style="gap:10px">'
    + '<button class="btn btn-ghost" data-act="pr-timer" data-id="rail" id="pr-timer-rail">Start</button>'
    + '<input class="input" type="number" step="any" inputmode="decimal" id="pr-in-rail" placeholder="seconds" style="max-width:130px">'
    /* speed alone measures nothing — you can be fast in the wrong order forever.
       The log stays shut until you have checked the order and said how you did. */
    + (r.revealed
        ? '<button class="btn btn-brass" data-act="pr-log" data-id="rail"'+(r.called===undefined?' disabled':'')+'>Log</button>'
        : '<button class="btn btn-brass" disabled title="Check your order first">Log</button>')
    + '</div>'
    + (r.revealed
        ? '<div class="row center" style="gap:10px">'
          + '<button class="btn'+(r.called===true?' btn-brass':' btn-ghost')+'" data-act="rail-called" data-ok="1">I called it right</button>'
          + '<button class="btn'+(r.called===false?' btn-ox':' btn-ghost')+'" data-act="rail-called" data-ok="0">I got it wrong</button></div>'
        : '')
    + '<div class="row center" style="gap:10px">'
    + (r.revealed ? '' : '<button class="btn btn-ox" data-act="rail-reveal">Check my order</button>')
    + '<button class="btn btn-ghost" data-act="rail-deal">Deal another</button></div>'
    + answer
    + (hist ? '<div class="panel p4" style="width:100%;max-width:460px"><div class="eyebrow mb2">Recent rails</div>'+hist+'</div>' : '')
    + '</div>';
}

function renderPractice(){
  const p = state.practice;
  const nav = [['drills','Drills'],['rail','Ticket Rail'],['tasting','Tasting Room'],['flights','Flights'],['method','How to Taste']]
    .map(([k,l]) => '<button class="tab-btn'+(p.view===k?' active':'')+'" data-act="pr-view" data-v="'+k+'">'+l+'</button>').join('');
  const wrap = (inner) => '<div class="col"><nav class="tabs" style="margin-bottom:4px">'+nav+'</nav>'+inner+'</div>';

  if(p.view==='rail') return wrap(railHTML());

  if(p.view==='tasting'){
    const log = progress.tastings || [];
    const recent = log.slice(-8).reverse().map((e,idx) => {
      const realIdx = log.length-1-idx;
      const open = p.noteOpen===realIdx;
      return '<div class="panel"><button class="drink-head" aria-expanded="'+(open?'true':'false')+'" data-act="tst-open" data-i="'+realIdx+'">'
        + '<span class="bold">'+esc(e.label||'(unnamed)')+'</span><span class="chip">'+esc(e.cat)+'</span>'
        + '<span class="tiny dim push">'+esc(e.date)+'</span>'
        + '<span class="plusminus">'+(open?'−':'+')+'</span></button>'
        + (open ? '<div class="drink-body"><div class="small dim lh" style="max-width:440px">'
            + '<span class="brass2">Appearance · </span>'+esc(e.appearance||'—')+'<br>'
            + '<span class="brass2">Nose · </span>'+esc((e.nose||[]).join(', ')||'—')+'<br>'
            + '<span class="brass2">Palate · </span>sweet '+(e.palate.sweet||'—')+' · acid '+(e.palate.acid||'—')+' · bitter '+(e.palate.bitter||'—')+' · body '+(e.palate.body||'—')+' · heat '+(e.palate.heat||'—')+'<br>'
            + '<span class="brass2">Finish · </span>'+esc(e.finish||'—')
            + (e.notes ? '<br><br>'+esc(e.notes) : '')+'</div>'
            + '<button class="chip" data-act="tst-del" data-i="'+realIdx+'">Delete this note</button></div>' : '')
        + '</div>';
    }).join('');
    const byCat = {};
    log.forEach(e => byCat[e.cat] = (byCat[e.cat]||0)+1);
    const stats = Object.keys(TASTE_CATS).map(c =>
      '<div class="hist-row"><span class="small">'+esc(c)+'</span><span class="font-tix brass2">'+(byCat[c]||0)+'</span></div>').join('');
    return wrap('<div class="small dim lh" style="padding:0 4px">A structured card forces you to look for things you\'d otherwise skip. Fill it in <span class="brass2">before</span> you check the label — knowing what you\'re drinking rewrites your perception permanently.</div>'
      + renderTastingForm()
      + '<div class="panel p4 col-sm"><div class="eyebrow">Pours logged by category</div>'+stats
      + '<div class="tiny dim">'+log.length+' notes total. Twenty pours in one category is where patterns start appearing.</div></div>'
      + (recent ? '<div class="eyebrow" style="padding:0 4px">Recent notes</div><div class="col-sm">'+recent+'</div>' : ''));
  }

  if(p.view==='flights'){
    const list = FLIGHTS.map((f,i) => {
      const open = p.flightOpen===i;
      const pours = f.pours.map((x,n) => '<div class="spec-line"><span>'+(n+1)+'.</span><span>'+esc(x)+'</span></div>').join('');
      const body = open ? '<div class="drink-body" style="gap:12px">'
        + '<div class="ticket"><div class="ticket-inner">'
        + '<div class="tc"><div class="tix-label">Guided flight · '+esc(f.cat)+'</div><div class="tix-name">'+esc(f.name.toUpperCase())+'</div></div>'
        + '<div class="tix-rule"></div>'+pours+'<div class="tix-rule"></div>'
        + '<div><span class="tix-label">Look for </span>'+esc(f.look)+'</div></div></div>'
        + '<div style="max-width:440px"><div class="eyebrow mb1">The lesson</div><div class="small dim lh">'+esc(f.lesson)+'</div></div>'
        + '<a class="btn btn-ghost tiny" href="'+ytSearch(f.name+' '+f.cat+' tasting comparison')+'" target="_blank" rel="noopener noreferrer">▶ Search related tastings</a>'
        + '</div>' : '';
      return '<div class="panel"><button class="drink-head" aria-expanded="'+(open?'true':'false')+'" data-act="pr-flight" data-i="'+i+'">'
        + '<span class="bold">'+esc(f.name)+'</span><span class="chip brass">'+esc(f.cat)+'</span>'
        + '<span class="plusminus">'+(open?'−':'+')+'</span></button>'+body
        + (open ? '' : '<div class="tiny dim lh" style="padding:0 16px 12px">'+esc(f.teaches)+'</div>')+'</div>';
    }).join('');
    return wrap('<div class="small dim lh" style="padding:0 4px">Twelve comparative flights, each built to teach one specific thing. Three pours, side by side, blind where possible. This is how a palate actually develops — not by drinking more, but by drinking things next to each other.</div>'
      + '<div class="col-sm">'+list+'</div>');
  }

  if(p.view==='method'){
    const rows = TASTE_METHOD.map(([t,txt]) => {
      const open = p.methodOpen===t;
      return '<div class="panel" style="padding:0 16px">'
        + '<button class="accordion-btn'+(open?' open':'')+'" aria-expanded="'+(open?'true':'false')+'" data-act="pr-method" data-t="'+esc(t)+'">'
        + '<span>'+esc(t)+'</span><span style="color:var(--brass)">'+(open?'−':'+')+'</span></button>'
        + (open ? '<div class="accordion-body"><div class="small dim lh">'+esc(txt)+'</div></div>' : '')+'</div>';
    }).join('');
    return wrap('<div class="small dim lh" style="padding:0 4px">Tasting is a skill with a technique, and most people never learn it. Seven habits separate evaluating a spirit from simply drinking one.</div>'+rows);
  }

  const tonight = (typeof tonightDrill === 'function') ? tonightDrill().id : null;
  const ordered = DRILLS.filter(d => !d.hidden).sort((a,b) => (a.id===tonight?-1:0) - (b.id===tonight?-1:0));
  const panels = ordered.map(d => {
    const log = (progress.practice && progress.practice[d.id]) || [];
    let bestStr='—', lastStr='—';
    if(log.length){
      const vals=log.map(e=>e.v);
      const best = d.dir==='low' ? Math.min(...vals) : Math.max(...vals);
      bestStr = best+' '+d.unit; lastStr = log[log.length-1].v+' '+d.unit;
    }
    const rows = log.slice(-5).reverse().map(e =>
      '<div class="hist-row"><span>'+esc(e.d)+'</span><span class="font-tix brass2">'+e.v+' '+esc(d.unit)+'</span></div>').join('');
    /* pinned subject: the drill picks the drinks, so difficulty can't drift downward */
    const subj = p.subjects && p.subjects[d.id];
    const subjHTML = d.pick
      ? '<div class="row" style="gap:8px;align-items:center">'
        + '<button class="chip" data-act="pr-deal" data-id="'+d.id+'">'+(subj?'Deal again':'Deal the drinks')+'</button>'
        + (subj ? '<span class="tiny font-tix brass2">'+esc(subj.join(' · '))+'</span>'
                : '<span class="tiny dim">the drill picks, not you</span>')+'</div>'
      : '';
    const timed = d.unit.indexOf('sec') >= 0;
    const timerHTML = timed
      ? '<button class="btn btn-ghost" data-act="pr-timer" data-id="'+d.id+'" id="pr-timer-'+d.id+'">Start</button>' : '';
    return '<div class="panel p4 col-sm"'+(d.id===tonight?' style="border-color:var(--brass)"':'')+'>'
      + '<div class="row between"><span class="bold">'+esc(d.name)+(d.id===tonight?' <span class="chip brass">tonight</span>':'')+'</span>'
      + '<span class="tiny font-tix dim">best <span class="brass2">'+bestStr+'</span> · last '+lastStr+'</span></div>'
      + '<div class="small dim lh">'+esc(d.desc)+'</div>'
      + subjHTML
      + '<div class="row" style="gap:10px">'+timerHTML
      + '<input class="input" type="number" step="any" inputmode="decimal" id="pr-in-'+d.id+'" placeholder="'+esc(d.unit)+'" style="max-width:150px">'
      + '<button class="btn btn-brass" data-act="pr-log" data-id="'+d.id+'">Log result</button></div>'
      + (rows ? '<div>'+rows+'</div>' : '')+'</div>';
  }).join('');
  return wrap((typeof sessionDrillHTML==='function' ? sessionDrillHTML() : '')
    + '<div class="small dim lh" style="padding:0 4px">Jerry Thomas\'s correction: knowledge lives in the head, craft lives in the hands. These drills only count if you actually run them — bottles, tins, scale, timer. Log every attempt and watch the numbers move.</div>'+panels);
}


function trimNum(x){ const r = Math.round(x*100)/100; return String(r); }
/* Scale only genuine quantities. Product names and proofs (151, 43, 1608,
   No. 6, 100 proof) and ratios (3:1) must never be multiplied. */
function scaleLine(l, f){
  const UNIT = '(?:oz|ml|cl|l\\b|tsp|tbsp|dash(?:es)?|drops?|pinch(?:es)?|barspoons?|leaves|leaf|sprigs?|cubes?|slices?|wedges?|wheels?|scoops?|parts?|cups?|bottles?|cans?|shots?|pints?|handfuls?|sticks?|cloves?|berries|beans?|strawberr\\w*|grapes?)';
  // a number is scalable only when followed by a unit, or when the line is a
  // bare "N thing" count (2 limes) and the number isn't part of a name
  const re = new RegExp('(\\d+\\/\\d+|\\d+(?:\\.\\d+)?)(\\s*[–-]\\s*(?:\\d+\\/\\d+|\\d+(?:\\.\\d+)?))?(\\s*)('+UNIT+')?', 'gi');
  return l.replace(re, function(match, n1, range, sp, unit, off, whole){
    const after = whole.slice(off + match.length);
    const before = whole.slice(0, off);
    if(before.slice(-1)===':' || after.slice(0,1)===':') return match;   // ratio 3:1
    if(/(No\.|#|proof|%|ABV)\s*$/i.test(before)) return match;           // No. 6, 100 proof
    if(/^\s*proof/i.test(after)) return match;
    if(!unit){
      // no unit: only scale if what follows looks like a countable ingredient
      if(!sp) return match;
      if(!/^[a-zà-ÿ]/i.test(after)) return match;
      if(/^(oz|ml)\b/i.test(after)) return match;
      // guard against product names: 151 rum, Licor 43, Angostura 1824
      if(Number(n1) >= 100) return match;
      if(/(rum|whisky|whiskey|licor|liqueur|gin|vodka|brand|bitters|amaro|cachaça|tequila|mezcal|absinthe|vermouth)/i.test(after.slice(0,24))) return match;
    }
    const conv = function(t){ return t.indexOf('/')>=0 ? Number(t.split('/')[0])/Number(t.split('/')[1]) : parseFloat(t); };
    let out = trimNum(conv(n1) * f);
    if(range){
      const r2 = range.replace(/[\s–-]/g,'');
      out += (range.indexOf('–')>=0 ? '–' : '-') + trimNum(conv(r2) * f);
    }
    return out + (sp||'') + (unit||'');
  });
}
/* "4 sugar cube" reads wrong — pluralize scaled countables, including when a
   modifier sits between the number and the noun ("4 sugar cube" -> "cubes"). */
/* UNITS pluralize even when an ingredient follows ("5 dashes Angostura").
   HEADS are the ingredient itself, so they only pluralize when nothing
   follows them — "1 lime disc" must not become "4 limes disc". */
const UNIT_WORDS = 'cube|sprig|slice|wedge|wheel|scoop|dash|drop|clove|stick|part|shot|can|bottle|pint|handful|cup|pinch|sheet|strip';
const HEAD_WORDS = 'leaf|berry|bean|egg|lime|lemon|orange|strawberry|peach|banana|onion|olive|cherry';
function pluralize(l){
  // units: modifier may sit between ("4 sugar cubes"), ingredient may follow
  l = l.replace(new RegExp('(\\d+(?:\\.\\d+)?)(\\s+(?:[a-zà-ÿ]+\\s+)?)('+UNIT_WORDS+')\\b','gi'), function(m,n,mid,w){
    return Number(n)<=1 ? m : n + mid + plural(w);
  });
  // heads: only when the word ends the phrase or is followed by punctuation
  l = l.replace(new RegExp('(\\d+(?:\\.\\d+)?)(\\s+(?:[a-zà-ÿ]+\\s+)?)('+HEAD_WORDS+')(?=$|[,.;)]|\\s*$)','gi'), function(m,n,mid,w){
    return Number(n)<=1 ? m : n + mid + plural(w);
  });
  return l.replace(new RegExp('(\\d+(?:\\.\\d+)?)(\\s+)(leaves|berries)\\b','gi'),
    function(m, n, sp, w){
      if(Number(n) <= 1) return m;
      return n + sp + w;
    });
}
function plural(w){
  const irregular = { leaf:'leaves', berry:'berries', dash:'dashes', pinch:'pinches',
                      cherry:'cherries', strawberry:'strawberries' };
  const lw = w.toLowerCase();
  let out = irregular[lw] || (w + (/(s|x|ch|sh)$/i.test(w) ? 'es' : 's'));
  if(/^[A-Z]/.test(w)) out = out.charAt(0).toUpperCase()+out.slice(1);
  return out;
}
function batchOutHTML(){
  const t = state.tools;
  const c = COCKTAILS[t.drink];
  const f = t.serv;
  const lines = c.spec.map(l => '<div class="spec-line"><span>·</span><span>'+esc(pluralize(scaleLine(l,f)))+'</span></div>').join('');
  const perDrink = c.spec.reduce((s,l)=>s+lineOz(l),0);
  const totalOz = perDrink * f;
  const water = t.dilute ? totalOz * 0.25 : 0;
  const finalOz = totalOz + water;
  const carb = c.spec.some(l => /soda|tonic|ginger beer|ginger ale|champagne|prosecco|cola/i.test(l));
  const citrus = c.spec.some(l => /juice|lemon|lime|grapefruit/i.test(l));
  const egg = c.spec.some(function(l){ return /egg|aquafaba/i.test(l); });
  const dairy = c.spec.some(function(l){ return /cream|milk|coconut cream/i.test(l); });
  const muddle = /muddle|swizzle|press/i.test(c.method);
  const layered = /layer|float/i.test(c.method);
  let warn = [];
  if(citrus) warn.push('batch everything EXCEPT the citrus — juice it the day you serve and add à la minute');
  if(carb) warn.push('never bottle the carbonated component; top each glass to order');
  if(egg) warn.push('egg and aquafaba cannot be batched ahead — they must be shaken per drink');
  if(dairy) warn.push('dairy batches keep only 2–3 days refrigerated and will separate; shake before pouring');
  if(muddle) warn.push('muddled fruit and herbs go in per drink, not in the batch');
  if(layered) warn.push('layered builds cannot be batched — the pour order is the recipe');
  // bottle math on the batchable portion
  const bottles750 = finalOz / 25.36;
  const containerL = finalOz * 0.02957;
  const per = finalOz / f;
  return '<div class="ticket"><div class="ticket-inner">'
    + '<div class="tc"><div class="tix-label">Batch sheet · ×'+f+'</div>'
    + '<div class="tix-name">'+esc(c.name.toUpperCase())+'</div></div>'
    + '<div class="tix-rule"></div>' + lines + '<div class="tix-rule"></div>'
    + '<div><span class="tix-label">Yield ≈ </span>'+trimNum(totalOz)+' oz / '+Math.round(totalOz*29.57)+' ml</div>'
    + (t.dilute ? '<div><span class="tix-label">+ Water </span>'+trimNum(water)+' oz / '+Math.round(water*29.57)+' ml (25% pre-dilution)</div>'
      + '<div><span class="tix-label">Bottled </span>'+trimNum(finalOz)+' oz / '+Math.round(finalOz*29.57)+' ml — serve chilled straight from the fridge</div>' : '')
    + '<div><span class="tix-label">Per serve </span>'+trimNum(per)+' oz poured into the glass</div>'
    + '<div><span class="tix-label">Container </span>'+(bottles750>=1 ? trimNum(bottles750)+' × 750ml bottle'+(bottles750>=2?'s':'') : 'a single 750ml bottle is plenty')
      + ' · needs at least a '+(containerL<1?'1':Math.ceil(containerL*1.15))+'L vessel</div>'
    + (warn.length ? '<div class="tix-rule"></div><div class="tix-note">'+esc(warn.join('; '))+'.</div>' : '')
    + '</div></div>';
}
/* ---- ABV / dilution estimator ---- */
const ABV_TABLE = [
  [/overproof|151|cask.strength/i, 0.62],[/absinthe/i,0.62],[/chartreuse/i,0.52],
  [/fernet/i,0.39],[/rye|bourbon|whisk|scotch|irish/i,0.45],[/gin/i,0.44],
  [/vodka|tequila|mezcal|rum|cacha|pisco|cognac|brandy|calvados|applejack|soju|shochu/i,0.40],
  [/cointreau|curaçao|curacao|triple sec|grand marnier|maraschino|dictine|falernum|allspice/i,0.35],
  [/amaro|averna|nonino|montenegro|suze|licor 43|drambuie|amaretto|frangelico|sambuca|schnapps|liqueur|cassis|violette|menthe|cacao|heering|elder|st-germain/i,0.25],
  [/campari/i,0.24],[/aperol|cynar/i,0.13],[/vermouth|lillet|cocchi|dubonnet|sherry|port|advocaat/i,0.17],
  [/champagne|prosecco|cava|sparkling|wine|sake/i,0.12],[/beer|lager|stout|cider/i,0.05],
  [/bitters|dash/i,0.44],
];
function lineABV(l){
  for(let i=0;i<ABV_TABLE.length;i++) if(ABV_TABLE[i][0].test(l)) return ABV_TABLE[i][1];
  return 0;
}
function estimateABV(c, dilutionPct){
  let alc=0, vol=0;
  (c.spec||[]).forEach(function(l){
    const oz = lineOz(l);
    if(!oz) return;
    vol += oz;
    alc += oz * lineABV(l);
  });
  if(!vol) return null;
  const withWater = vol * (1 + dilutionPct/100);
  return { pour: vol, abvNeat: alc/vol*100, abvServed: alc/withWater*100, served: withWater, alcOz: alc };
}

/* ---- unit conversion ---- */
const UNITS = [['oz',29.5735],['ml',1],['cl',10],['tsp',4.92892],['tbsp',14.7868],['cup',236.588],['dash',0.92],['barspoon',5],['part',0]];
function convertHTML(){
  const t = state.tools;
  const v = Number(t.convVal)||0;
  const from = UNITS.filter(function(u){ return u[0]===t.convFrom; })[0] || UNITS[0];
  const ml = v * from[1];
  const rows = UNITS.filter(function(u){ return u[1]>0; }).map(function(u){
    const out = ml / u[1];
    const bold = u[0]===t.convFrom ? ' style="color:var(--brass-2)"' : '';
    return '<div class="hist-row"'+bold+'><span class="small">'+esc(u[0])+'</span><span class="font-tix">'+trimNum(Math.round(out*1000)/1000)+'</span></div>';
  }).join('');
  const fromChips = UNITS.filter(function(u){ return u[1]>0; }).map(function(u){
    return '<button class="chip'+(t.convFrom===u[0]?' on':'')+'" data-act="conv-unit" data-u="'+esc(u[0])+'">'+esc(u[0])+'</button>';
  }).join(' ');
  return '<div class="panel p5 col" style="gap:14px">'
    + '<div class="eyebrow">Unit converter</div>'
    + '<div class="small dim lh">Most of the world specs in ml; American bar books spec in ounces. A jigger marked 1 oz is 29.6ml, not 30 — the 30ml jiggers sold as "1 oz" run about 1.5% over on every pour.</div>'
    + '<div class="row" style="gap:10px"><input class="input" type="number" step="any" id="conv-val" value="'+esc(String(t.convVal))+'" style="max-width:140px"><div class="row" style="gap:6px">'+fromChips+'</div></div>'
    + '<div>'+rows+'</div>'
    + '<div class="tiny dim lh">Handy anchors: 1 oz = 29.6ml · 1.5 oz = 44ml · 2 oz = 59ml · 750ml bottle = 25.4 oz = about 16 two-ounce pours.</div>'
    + '</div>';
}

/* ---- pour cost / pricing ---- */
function costHTML(){
  const t = state.tools;
  const c = COCKTAILS[t.drink];
  const bottle = Number(t.bottlePrice)||0;
  const bottleMl = Number(t.bottleMl)||750;
  const target = Number(t.targetPour)||20;
  const spiritOz = (c.spec||[]).reduce(function(s,l){
    return s + (classifyLine(l)==='strong'||classifyLine(l)==='modifier' ? lineOz(l) : 0);
  }, 0);
  const costPerOz = bottleMl>0 ? bottle / (bottleMl/29.5735) : 0;
  const spiritCost = spiritOz * costPerOz;
  const modifierCost = spiritCost * 0.25;   // rough allowance for juice, syrup, garnish, ice
  const totalCost = spiritCost + modifierCost;
  const price = target>0 ? totalCost / (target/100) : 0;
  const menu = Math.ceil(price);
  return '<div class="panel p5 col" style="gap:14px">'
    + '<div class="eyebrow">Pour cost &amp; menu price</div>'
    + '<div class="small dim lh">Pour cost = cost of goods ÷ selling price. Most programs target 18–24%. This uses your base-spirit price plus a 25% allowance for juice, syrup, garnish, and ice.</div>'
    + '<div class="row" style="gap:10px">'
    + '<input class="input" type="number" step="any" id="cost-price" value="'+esc(String(t.bottlePrice))+'" placeholder="bottle $" style="max-width:110px">'
    + '<input class="input" type="number" step="any" id="cost-ml" value="'+esc(String(t.bottleMl))+'" placeholder="bottle ml" style="max-width:110px">'
    + '<input class="input" type="number" step="any" id="cost-target" value="'+esc(String(t.targetPour))+'" placeholder="target %" style="max-width:100px"></div>'
    + '<div class="ticket"><div class="ticket-inner">'
    + '<div class="tc"><div class="tix-label">Costing</div><div class="tix-name">'+esc(c.name.toUpperCase())+'</div></div>'
    + '<div class="tix-rule"></div>'
    + '<div><span class="tix-label">Spirit per drink </span>'+trimNum(spiritOz)+' oz</div>'
    + '<div><span class="tix-label">Cost per oz </span>$'+costPerOz.toFixed(2)+'</div>'
    + '<div><span class="tix-label">Spirit cost </span>$'+spiritCost.toFixed(2)+'</div>'
    + '<div><span class="tix-label">+ modifiers </span>$'+modifierCost.toFixed(2)+' (25% allowance)</div>'
    + '<div class="tix-rule"></div>'
    + '<div><span class="tix-label">Total cost </span>$'+totalCost.toFixed(2)+'</div>'
    + '<div><span class="tix-label">At '+trimNum(target)+'% pour cost </span>$'+price.toFixed(2)+'</div>'
    + '<div class="tix-name" style="font-size:1.1rem">MENU PRICE $'+menu+'</div>'
    + '<div class="tix-rule"></div>'
    + '<div class="tix-note">A rough model, not a P&amp;L. Real costing also carries labour, spillage, comps, and the batch yield loss you never quite recover.</div>'
    + '</div></div></div>';
}

/* ---- strength estimator ---- */
function strengthHTML(){
  const t = state.tools;
  const c = COCKTAILS[t.drink];
  const dil = Number(t.dilPct)||25;
  const e = estimateABV(c, dil);
  const chips = [0,15,20,25,30,35].map(function(d){
    return '<button class="chip'+(dil===d?' on':'')+'" data-act="dil-pct" data-v="'+d+'">'+(d===0?'neat':d+'%')+'</button>';
  }).join(' ');
  let body;
  if(!e){ body = '<div class="small dim">This spec is written in parts or counts rather than ounces, so it cannot be estimated.</div>'; }
  else {
    const band = e.abvServed>=30 ? 'Very strong — a sipping drink, and one you pace a guest on.'
      : e.abvServed>=22 ? 'Spirit-forward. Standard for a stirred classic served up.'
      : e.abvServed>=14 ? 'Moderate — a sour or a short highball.'
      : e.abvServed>=8 ? 'Sessionable. This is the strength most long drinks land at.'
      : 'Low-ABV. Aperitivo territory — you can serve two.';
    body = '<div class="ticket"><div class="ticket-inner">'
      + '<div class="tc"><div class="tix-label">Strength estimate</div><div class="tix-name">'+esc(c.name.toUpperCase())+'</div></div>'
      + '<div class="tix-rule"></div>'
      + '<div><span class="tix-label">Pour before ice </span>'+trimNum(e.pour)+' oz at '+e.abvNeat.toFixed(1)+'% ABV</div>'
      + '<div><span class="tix-label">With '+dil+'% dilution </span>'+trimNum(Math.round(e.served*100)/100)+' oz at '+e.abvServed.toFixed(1)+'% ABV</div>'
      + '<div><span class="tix-label">Pure alcohol </span>'+trimNum(Math.round(e.alcOz*100)/100)+' oz — about '+trimNum(Math.round(e.alcOz/0.6*10)/10)+' US standard drinks</div>'
      + '<div class="tix-rule"></div><div class="tix-note">'+esc(band)+'</div>'
      + '</div></div>';
  }
  return '<div class="panel p5 col" style="gap:14px">'
    + '<div class="eyebrow">Strength &amp; dilution</div>'
    + '<div class="small dim lh">Shaking adds roughly 25% water, stirring 20–25%, and building over ice keeps adding it in the glass. Knowing where a drink lands is how you pace a guest honestly — and it is the number behind responsible service.</div>'
    + '<div class="row"><span class="tiny dim" style="width:70px">Dilution</span>'+chips+'</div>'
    + body
    + '<div class="tiny dim lh">Estimates use category averages, not label proof, so treat them as a guide. A US standard drink is 0.6 oz of pure alcohol.</div>'
    + '</div>';
}

function renderTools(){
  const t = state.tools;
  const nav = [['batch','Batching'],['shelf','My Shelf'],['strength','Strength'],['cost','Pour Cost'],['convert','Convert'],['data','My Data']]
    .map(function(o){ return '<button class="tab-btn'+(t.view===o[0]?' active':'')+'" data-act="tool-view" data-v="'+o[0]+'">'+o[1]+'</button>'; }).join('');
  const wrap = function(inner){ return '<div class="col"><nav class="tabs" style="margin-bottom:4px">'+nav+'</nav>'+inner+'</div>'; };
  const drinkSel = function(id){
    const opts = COCKTAILS.map(function(c,i){ return '<option value="'+i+'"'+(t.drink===i?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('');
    return '<select class="input" id="'+id+'" style="flex:2;min-width:170px">'+opts+'</select>';
  };

  if(t.view==='data') return wrap(dataToolHTML());
  if(t.view==='convert') return wrap(convertHTML());
  if(t.view==='cost') return wrap('<div class="row" style="gap:10px">'+drinkSel('tool-drink')+'</div>'+costHTML());
  if(t.view==='strength') return wrap('<div class="row" style="gap:10px">'+drinkSel('tool-drink')+'</div>'+strengthHTML());

  if(t.view==='shelf'){
    const shelfChips = SHELF.map(function(s){
      return '<button class="chip'+(t.shelf.indexOf(s[0])>=0?' on':'')+'" data-act="shelf-toggle" data-k="'+s[0]+'">'+esc(s[1])+'</button>';
    }).join(' ');
    const presets = SHELF_PRESETS.map(function(p,i){
      return '<button class="btn btn-ghost tiny" data-act="tool-preset" data-i="'+i+'">'+esc(p[0])+'</button>';
    }).join(' ');
    const srcChips = ['Cocktails','Shots','Zero Proof'].map(function(s){
      return '<button class="chip'+(t.shelfSrc===s?' on':'')+'" data-act="shelf-src" data-s="'+esc(s)+'">'+esc(s)+'</button>';
    }).join(' ');
    const pool = allDrinks().filter(function(d){ return d.src===t.shelfSrc; });
    let ready=[], close=[];
    if(t.shelf.length){
      pool.forEach(function(d){
        const miss = missingFor(d);
        if(miss.length===0) ready.push(d);
        else if(miss.length===1) close.push({d:d, miss:miss[0]});
      });
      ready.sort(function(a,b){ return a.name.localeCompare(b.name); });
      close.sort(function(a,b){ return a.d.name.localeCompare(b.d.name); });
    }
    const readyChips = ready.map(function(d){
      return '<span class="chip brass">'+esc(d.name)+'</span>';
    }).join(' ');
    const next = t.shelf.length ? bestNextBottles(pool) : [];
    const nextRows = next.map(function(n){
      return '<div class="panel p3 col-sm" style="gap:4px"><div class="row between">'
        + '<span class="bold small">'+esc(shelfLabel(n.id))+'</span>'
        + '<span class="font-tix brass2">+'+n.n+' drinks</span></div>'
        + '<div class="tiny dim">'+esc(n.drinks.join(', '))+(n.n>n.drinks.length?', …':'')+'</div>'
        + '<button class="chip" data-act="shelf-toggle" data-k="'+n.id+'">Add to shelf</button></div>';
    }).join('');
    /* 86 mode: the same engine, pointed at triage instead of shopping */
    const dead = t.eightySix ? eightySixReport(t.eightySix, pool) : null;
    /* '' means "86 mode, nothing picked yet" — truthiness would read that as OFF
       and render Stocking as active while the 86 panel is on screen */
    const in86 = t.eightySix !== null && t.eightySix !== undefined;
    const modeChips = '<button class="chip'+(in86?'':' on')+'" data-act="shelf-mode" data-m="stock">Stocking</button> '
      + '<button class="chip'+(in86?' on':'')+'" data-act="shelf-mode" data-m="86">86 drill</button>';
    if(in86){
      const owned = t.shelf.map(function(k){
        return '<button class="chip'+(t.eightySix===k?' on':'')+'" data-act="shelf-86" data-k="'+k+'">'+esc(shelfLabel(k))+'</button>';
      }).join(' ');
      return wrap('<div class="panel p5 col" style="gap:14px">'
        + '<div class="row between"><div class="eyebrow">86 drill</div><div class="row" style="gap:6px">'+modeChips+'</div></div>'
        + '<div class="small dim lh">The guest is standing there and the bottle is empty. Tap what just died and the ledger shows you what died with it — and the closest thing you can still pour. Answer out loud before you read the substitutes.</div>'
        + (t.shelf.length ? '<div class="row" style="gap:6px">'+owned+'</div>'
            : '<div class="row"><button class="btn btn-ghost tiny" data-act="shelf-mode" data-m="stock">Stock a shelf first →</button></div>')
        + '</div>'
        + (dead ? '<div class="panel p5 col" style="gap:12px">'
            + '<div class="eyebrow">'+esc(shelfLabel(t.eightySix))+' is 86\'d</div>'
            + '<div class="small lh">'+(dead.lostCount
                ? '<span class="brass2 bold">'+dead.lostCount+' drink'+(dead.lostCount===1?'':'s')+' just died.</span>'
                  + (dead.lostCount > dead.lost.length ? ' <span class="tiny dim">Showing the first '+dead.lost.length+'.</span>' : '')
                : '<span class="brass2 bold">Nothing on your shelf depended on it.</span>')+'</div>'
            + (dead.lost.length ? '<div class="col-sm">'+dead.lost.map(function(x){
                return '<div class="panel p3 col-sm" style="gap:4px"><div class="row between">'
                  + '<span class="bold small">'+esc(x.name)+'</span>'
                  + '<span class="tiny dim">'+esc(x.family)+' · '+esc(x.spirit)+'</span></div>'
                  + '<div class="tiny dim">'+(x.sub
                    ? 'Closest survivor: <span class="brass2">'+esc(x.sub)+'</span>'
                      + (x.why ? ' — '+esc(x.why)+'.' : '.')
                    : 'Nothing close on this shelf. Take it to the riff builder and improvise.')+'</div></div>';
              }).join('')+'</div>' : '')
            + '<div class="tiny dim lh">'+dead.stillReady+' drinks still pour without it.</div>'
            + '</div>' : ''));
    }
    return wrap('<div class="panel p5 col" style="gap:14px">'
      + '<div class="row between"><div class="eyebrow">What can my shelf make?</div><div class="row" style="gap:6px">'+modeChips+'</div></div>'
      + '<div class="small dim lh">Tap what you own. The ledger shows everything you can pour right now — and, more usefully, which single bottle would unlock the most new drinks. Your shelf saves between sessions.</div>'
      + '<div class="row" style="gap:6px">'+presets+'<button class="chip" data-act="tool-clear">Clear</button>'
      + '<span class="tiny dim push">'+t.shelf.length+' items</span></div>'
      + '<div class="row" style="gap:6px">'+shelfChips+'</div></div>'
      + (t.shelf.length ? '<div class="panel p5 col" style="gap:12px">'
          + '<div class="row">'+srcChips+'</div>'
          + '<div><div class="eyebrow mb1">Ready to pour — '+ready.length+' of '+pool.length+'</div>'
          + '<div class="row" style="gap:6px">'+(readyChips||'<span class="tiny dim">nothing yet — keep stocking</span>')+'</div></div>'
          + (next.length ? '<div><div class="eyebrow mb1">Best next bottle</div>'
              + '<div class="small dim lh mb2">Each of these unlocks the listed drinks on its own.</div>'
              + '<div class="col-sm">'+nextRows+'</div></div>' : '')
          + (close.length ? '<div class="tiny dim">'+close.length+' more are a single ingredient away.</div>' : '')
          + '</div>' : ''));
  }

  const opts = COCKTAILS.map(function(c,i){ return '<option value="'+i+'"'+(t.drink===i?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('');
  return wrap('<div class="panel p5 col" style="gap:14px">'
    + '<div class="eyebrow">Batching calculator</div>'
    + '<div class="small dim lh">Scale any spec to a bottle, a pitcher, or a party. For stirred drinks bottled ahead, add the 25% water — it replaces the dilution the ice would have given.</div>'
    + '<div class="row" style="gap:10px">'
    + '<select class="input" id="tool-drink" style="flex:2;min-width:170px">'+opts+'</select>'
    + '<input class="input" type="number" min="1" max="500" id="tool-serv" value="'+t.serv+'" style="flex:1;min-width:80px" title="servings">'
    + '<button class="chip'+(t.dilute?' on':'')+'" data-act="tool-dilute">+25% water</button></div>'
    + '<div id="batch-out" style="display:flex;justify-content:center">'+batchOutHTML()+'</div>'
    + '<div class="row"><a class="btn btn-ghost tiny" href="'+ytSearch('how to batch cocktails pre dilution bottled'+scopeSuffix())+'" target="_blank" rel="noopener noreferrer">▶ Watch batching explained</a></div>'
    + '</div>');
}

