/* ---------------- COFFEE & TEA ---------------- */
/* renderOnTap with the identifiers swapped, which is deliberate: SERVICE_STUDY,
   ONTAP_STUDY and COFFEE_STUDY share a shape, so one renderer pattern and one
   gate cover all three, and serviceTicketHTML is reused rather than forked.

   It lives in its own file rather than beside the other two in ui-new.js
   because the video layer lands here next, and a video layer that grows inside
   the router file is a video layer nobody can find.

   Acts are cof-sec, cof-row and cof-ref. Distinct names rather than a shared
   prefix with a state.tab discriminator, which is the standing rule in app.js:
   that chain is a flat if/else on el.dataset.act and has never once read
   state.tab to decide what an action meant. */
function renderCoffee(){
  const s = state.coffee;
  const sec = COFFEE_STUDY.find(x => x.key === s.sec) || COFFEE_STUDY[0];
  const chips = COFFEE_STUDY.map(x =>
    '<button class="tab-btn'+(s.sec===x.key?' active':'')+'"'+(s.sec===x.key?' aria-current="true"':'')+' data-act="cof-sec" data-d="'+x.key+'">'
    + esc(x.title)+'</button>').join('');
  const rows = sec.rows.map((r,i) => {
    const open = s.rowOpen === i;
    return '<div class="panel" style="padding:0 16px">'
      + '<button class="accordion-btn'+(open?' open':'')+'" aria-expanded="'+(open?'true':'false')+'" data-act="cof-row" data-i="'+i+'">'
      + '<span>'+esc(r[0])+'</span><span style="color:var(--brass)">'+(open?'−':'+')+'</span></button>'
      + (open ? '<div class="accordion-body"><div class="small dim lh">'+esc(r[1])+'</div></div>' : '')+'</div>';
  }).join('');
  return '<div class="col">'
    + '<nav class="tabs" style="margin-bottom:4px">'+chips+'</nav>'
    + '<div class="panel p4"><div class="eyebrow mb1">'+esc(sec.title)+'</div>'
    + '<div class="small dim lh">Coffee and tea are the two things a bar sells all day and teaches nobody to make. Everything here is a technique a guest can taste before you can.</div></div>'
    + '<div class="col-sm">'+rows+'</div>'
    + cofRefsHTML(s)
    + '</div>';
}

/* Split out of renderCoffee because the cof-ref act repaints THIS alone rather
   than calling render(). Once a film is playing in an open lesson above, a
   full render would tear the iframe out of the page, and re-parenting an
   iframe reloads it in every browser. */
function cofRefsHTML(s){
  const refs = COFFEE_REF.filter(x => x.dom === s.sec);
  if(!refs.length) return '<div id="cof-refs"></div>';
  const cats = [...new Set(refs.map(x => x.cat))];
  return '<div id="cof-refs">' + cats.map(cat => {
    const items = refs.filter(x => x.cat === cat).map(x => {
      const open = s.refOpen === x.name;
      return '<div class="panel"><button class="drink-head" aria-expanded="'+(open?'true':'false')+'" data-act="cof-ref" data-n="'+esc(x.name)+'">'
        + '<span class="bold">'+esc(x.name)+'</span>'
        + '<span class="plusminus">'+(open?'−':'+')+'</span></button>'
        + (open ? '<div class="drink-body">'+serviceTicketHTML(x)+'</div>' : '')+'</div>';
    }).join('');
    return '<div class="eyebrow" style="padding:0 4px;margin-top:8px">'+esc(cat)+'</div><div class="col-sm">'+items+'</div>';
  }).join('') + '</div>';
}
