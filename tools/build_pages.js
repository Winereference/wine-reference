// Builds the static, search-engine-friendly pages from the data in index.html:
//   grapes/<slug>/, regions/<slug>/, spirits/<slug>/, stories/<slug>/  (one page per item)
//   grapes/, regions/, spirits/, stories/, wine-library/, food-pairing/, glossary/  (hub pages)
// then refreshes sitemap.xml (tools/make_sitemap.py).
// Run from the repo root after content changes:  node tools/build_pages.js
// Needs Playwright (preinstalled in the Claude cloud workspace). Never edit the generated folders by hand:
// they are deleted and rebuilt on every run. index.html stays the single source of truth.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const SITE='https://winereference.github.io/wine-reference/';
const OUT=['grapes','regions','spirits','stories','wine-library','food-pairing','glossary','careers','newsletter'];

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[·']/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const cut=(s,n)=>{s=String(s).replace(/\s+/g,' ').trim();return s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n-1)).replace(/[,;:.]$/,'')+'…'};
const uniq=a=>[...new Set(a.filter(Boolean))];
const T=m=>{const f=m+' | The Wine Reference';return f.length<=66?f:(m.length<=70?m:cut(m,70))};

async function loadData(){
  const b=await chromium.launch();const p=await b.newPage();
  await p.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await p.goto('file://'+path.join(ROOT,'index.html'));await p.waitForTimeout(500);
  const d=await p.evaluate(()=>{const g=n=>{try{return eval(n)}catch(e){return null}};
    const gl=[...document.querySelectorAll('#az dt')].map(dt=>{const dd=dt.nextElementSibling;return [dt.textContent.trim(),dd&&dd.tagName=='DD'?dd.textContent.trim():'']});
    return {R:g('R'),G:g('G'),G0:g('G0').map(x=>x[0]),GD:g('GD'),K:g('K'),SUB:g('SUB'),CI:g('CI'),AP:g('AP'),PH:g('PH'),WL:g('WL'),DP:g('DP'),PC:g('PC'),
      SPR:g('SPR'),SPB:g('SPB'),SPD:g('SPD')||{},SPH:g('SPH')||{},SPC:g('SPC'),ST:g('ST'),CG:g('CG')||[],NL:(window.MONEY||{}).newsletter||{},gl}});
  await b.close();return d}

let NL={};
function page({rel,title,desc,keywords,h1,crumbs,body,img,imgAlt,jsonld}){
  const depth=rel.split('/').filter(Boolean).length, up='../'.repeat(depth), url=SITE+rel;
  const og=img?SITE+img:SITE+'img/og-wine-reference-douro-vineyards.jpg';
  const bc={"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"The Wine Reference","item":SITE}].concat(crumbs.map((c,i)=>({"@type":"ListItem","position":i+2,"name":c[0],"item":SITE+c[1]})))};
  const ld={"@context":"https://schema.org","@graph":[bc].concat(jsonld?[jsonld]:[])};
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="icon" href="${up}assets/icon.svg" type="image/svg+xml"><link rel="icon" href="${up}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png"><meta name="theme-color" content="#7a1f3d">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(keywords.join(', '))}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Diego Muntoni">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Wine Reference">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}assets/pages.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});try{if(localStorage.getItem('wr-consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());gtag('config','G-7LNSJRE6G4',{anonymize_ip:true});var t=document.createElement('script');t.async=1;t.src='https://www.googletagmanager.com/gtag/js?id=G-7LNSJRE6G4';document.head.appendChild(t)}}catch(e){}</script>
</head>
<body>
<header class="top"><a class="logo" href="${up}"><img src="${up}assets/icon.svg" alt="" width="26" height="26" style="vertical-align:-6px;margin-right:8px">The Wine Reference</a><a class="tip" href="https://ko-fi.com/winereference" target="_blank" rel="noopener">🍷 Support</a></header>
<main class="wrap">
<p class="crumbs"><a href="${up}">Home</a>${crumbs.map((c,i)=>i<crumbs.length-1?` › <a href="${up}${c[1]}">${esc(c[0])}</a>`:` › ${esc(c[0])}`).join('')}</p>
<h1>${esc(h1)}</h1>
${body}
${/^https:\/\//.test(NL.action||'')?`<div class="support nl"><h2>The Wine Reference newsletter</h2><p>New wines, stories and career guides, one email a week at most.</p><form method="post" target="_blank" action="${esc(NL.action)}" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"><label for="nle" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Email address</label><input type="email" id="nle" name="${esc(NL.field||'email')}" required autocomplete="email" placeholder="Your email address" style="flex:1 1 200px;min-width:0;padding:11px 14px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit"><button class="btn" type="submit" style="border:0;margin:0;cursor:pointer;font:600 15px Inter,sans-serif">Subscribe</button></form><p class="muted" style="font-size:12px;margin:8px 0 0">Over 18s only. Unsubscribe any time with one click. Your email is stored securely by ${esc(NL.provider||'our newsletter provider')} and never shared.</p></div>`:''}
<div class="support"><h2>Support The Wine Reference</h2><p>This guide is free, with no paywall. If it helped you choose a bottle, you can buy me a glass and keep it growing.</p><a class="btn" href="https://ko-fi.com/winereference" target="_blank" rel="noopener">🍷 Buy me a glass</a></div>
</main>
<footer><div class="in"><nav aria-label="Browse"><a href="${up}">Interactive guide</a><a href="${up}grapes/">Grapes</a><a href="${up}regions/">Wine regions</a><a href="${up}wine-library/">Wine Library</a><a href="${up}spirits/">Spirits</a><a href="${up}food-pairing/">Food pairing</a><a href="${up}stories/">Wine stories</a><a href="${up}glossary/">Glossary</a><a href="${up}careers/">Sommelier careers</a><a href="${up}newsletter/">Newsletter</a></nav>
<p>By Diego Muntoni, head sommelier. For reference only. Please enjoy responsibly. Over 18s only (21 in the USA).</p></div></footer>
<div id="age" role="dialog" aria-modal="true" aria-labelledby="ageh"><div class="box"><div style="font-size:42px">🍷</div><h2 id="ageh" style="margin:6px 0 8px">Are you of legal drinking age?</h2><p class="muted" style="margin:0 0 12px">This guide is about alcohol and is for adults only: 18 or over in the UK, EU and most countries, 21 in the USA.</p><button id="agy" type="button">Yes, I am of legal drinking age</button><button id="agn" class="no" type="button">No</button><p id="agm" style="min-height:1.4em;color:var(--accent);font-size:14px;margin:8px 0 0"></p></div></div>
<script>(function(){var a=document.getElementById('age'),ok=false;try{ok=localStorage.getItem('ageOK')=='1'}catch(e){}if(ok)return;a.style.display='flex';document.body.style.overflow='hidden';
document.getElementById('agy').onclick=function(){try{localStorage.setItem('ageOK','1')}catch(e){}a.style.display='none';document.body.style.overflow=''};
document.getElementById('agn').onclick=function(){document.getElementById('agm').textContent='Sorry, you must be of legal drinking age to view this site.'}})();</script>
</body>
</html>
`}

function write(rel,html){const f=path.join(ROOT,rel,'index.html');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,html)}

(async()=>{
  const D=await loadData();NL=D.NL||{};
  for(const o of OUT)fs.rmSync(path.join(ROOT,o),{recursive:true,force:true});
  const {R,G,GD,K,SUB,CI,AP,PH,WL,DP,SPR,SPB,ST}=D;const SPD=D.SPD||{},SPH=D.SPH||{};
  const PHf=n=>PH&&PH[n];
  // grape name lookup incl. aliases ("Syrah / Shiraz" -> Syrah, Shiraz; "Prosecco (Glera)" -> Glera)
  const GS={},GA={};G.forEach(g=>{const s=slug(g[0]);GS[g[0]]=s;GA[g[0].toLowerCase()]=g[0];g[0].split(/\s*\/\s*|\s*\(\s*|\s*\)\s*|,\s*/).filter(x=>x.length>2).forEach(a=>{const k=a.toLowerCase();if(!GA[k])GA[k]=g[0]})});
  const gfind=t=>{t=String(t).trim().toLowerCase().replace(/\(.*?\)/g,'').trim();return GA[t]||null};
  const RS={};R.forEach(r=>RS[r[0]]=slug(r[0]));
  const glink=(t,up)=>{const n=gfind(t);return n?`<a href="${up}grapes/${GS[n]}/">${esc(t.trim())}</a>`:esc(t.trim())};
  const rlink=(t,up)=>RS[t]?`<a href="${up}regions/${RS[t]}/">${esc(t)}</a>`:esc(t);
  const wineList=(ws,up)=>`<div class="grid">${ws.map(w=>`<div class="card"><div class="meta">${esc(w.s)} · ${esc(w.c)}</div><h3>${esc(w.p)} ${esc(w.w)}</h3><p class="muted">${rlink(w.r,up)}${w.a&&w.a!=w.r?' · '+esc(w.a):''} · ${w.g.map(x=>glink(x,up)).join(', ')}</p><p>${esc(w.n)}</p>${w.f?`<p><b>Food:</b> ${esc(w.f)}</p>`:''}</div>`).join('')}</div>`;
  const photo=(n,up,cls)=>{const p=PHf(n);return p?`<img class="hero${cls?' '+cls:''}" src="${up}img/p/${esc(p[0])}" alt="${esc(p[3]||n)}" width="600" height="400"><p class="credit">Photo: <a href="https://unsplash.com/@${esc(p[2])}?utm_source=wine_reference&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer">${esc(p[1])}</a> on Unsplash</p>`:''};
  const pages=[];

  // ---------- GRAPES ----------
  const typeWord=t=>({Red:'red grape',White:'white grape',Sparkling:'sparkling wine style',Rosé:'rosé style'}[t]||'wine style');
  for(const g of G){
    const [n,t,body,,fl,rg,pair]=g,s=GS[n],d=(GD||{})[n]||{},up='../../',rel=`grapes/${s}/`;
    const isGrape=t=='Red'||t=='White';
    const ws=WL.filter(w=>w.g.includes(n));
    const regs=R.filter(r=>r[3].split(',').some(x=>gfind(x)==n));
    const same=G.filter(x=>x[1]==t&&x[0]!=n).slice(0,200);const rel6=same.sort((a,b)=>Math.abs(a[2]-body)-Math.abs(b[2]-body)).slice(0,8);
    const syn=d.k?d.k.split(/[,;]/).map(x=>x.replace(/\(.*?\)/g,'').trim()).filter(x=>x&&x.length<30):[];
    const kw=uniq([n,isGrape?`${n} grape`:`${n} wine`,`${n} wine`,`${n} tasting notes`,`${n} food pairing`,`what does ${n} taste like`,...syn.slice(0,4),...String(rg||'').split(',').map(x=>x.trim()).slice(0,3),`${t.toLowerCase()} wine`,'wine grape guide','sommelier']);
    const title=T(`${n}: ${isGrape?'Grape Guide':'Wine Guide'}, Taste & Food Pairing`);
    const desc=cut(`${n} is a ${typeWord(t)} with flavours of ${String(fl).toLowerCase()}. Where it grows (${rg}), how it tastes, ageing and food pairing, explained by a head sommelier.`,158);
    const sec=[['Origin and history',d.o],['Where it grows',d.w],['Structure',d.st],['Aromas, young and aged',d.y],['Ageing',d.a],['Also known as',d.k],['Good to know',d.x]].filter(x=>x[1]);
    const bodyH=`${photo(n,up)}<p class="meta">${esc(t)}${isGrape?' grape':''}</p>
<p class="lead">${esc(n)} is a ${typeWord(t)} known for ${esc(String(fl).toLowerCase())}.${rg?` Its best-known homes are ${esc(rg)}.`:''}</p>
<div class="facts"><div><b>Style</b>${esc(t)}</div><div><b>Body</b>${'●'.repeat(body)}${'○'.repeat(5-body)} (${body}/5)</div><div><b>Flavours</b>${esc(fl)}</div><div><b>Key regions</b>${esc(rg)}</div>${pair?`<div><b>Food pairing</b>${esc(pair)}</div>`:''}</div>
${sec.map(x=>`<h2>${esc(x[0])}</h2><p>${esc(x[1])}</p>`).join('\n')}
${regs.length?`<h2>Wine regions for ${esc(n)}</h2><div class="chips">${regs.map(r=>`<a class="chip" href="${up}regions/${RS[r[0]]}/">${esc(r[0])}</a>`).join('')}</div>`:''}
${ws.length?`<h2>${esc(n)} wines to try</h2><p class="muted">Real bottles from The Wine Library.</p>${wineList(ws,up)}`:''}
<h2>Similar ${t=='Red'||t=='White'?t.toLowerCase()+' grapes':'styles'}</h2><div class="chips">${rel6.map(x=>`<a class="chip" href="${up}grapes/${GS[x[0]]}/">${esc(x[0])}</a>`).join('')}</div>
<p><a class="btn" href="${up}#grapes">Explore all grapes in the interactive guide</a></p>`;
    pages.push([rel,page({rel,title,desc,keywords:kw,h1:isGrape?`${n} grape`:n,crumbs:[['Grapes','grapes/'],[n,rel]],body:bodyH,img:PHf(n)?'img/p/'+PHf(n)[0]:null,
      jsonld:{"@type":"Article","headline":`${n}: grape guide, taste and food pairing`,"description":desc,"author":{"@type":"Person","name":"Diego Muntoni"},"about":{"@type":"Thing","name":n},"mainEntityOfPage":SITE+rel,...(PHf(n)?{"image":SITE+'img/p/'+PHf(n)[0]}:{})}})]);
  }
  // grapes hub
  {const rel='grapes/',up='../';const by=t=>G.filter(g=>g[1]==t).sort((a,b)=>a[0].localeCompare(b[0],'en',{sensitivity:'base'}));
   const types=[...new Set(G.map(g=>g[1]))];
   const body=`<p class="lead">${G.length} grape varieties and wine styles, each with its flavours, key regions, structure, ageing and food pairing.</p>
${types.map(t=>`<h2>${esc(t)} ${t=='Red'||t=='White'?'grapes':'styles'} (${by(t).length})</h2><div class="chips">${by(t).map(g=>`<a class="chip" href="${up}grapes/${GS[g[0]]}/">${esc(g[0])}</a>`).join('')}</div>`).join('\n')}
<p><a class="btn" href="${up}#grapes">Open the interactive grape finder</a></p>`;
   pages.push([rel,page({rel,title:'Wine Grape Varieties A–Z: Flavours, Regions & Pairing | The Wine Reference',desc:cut(`A sommelier's guide to ${G.length} wine grape varieties, from Cabernet Sauvignon and Pinot Noir to Nebbiolo, Riesling and Assyrtiko: flavours, regions, ageing and food pairing.`,158),
     keywords:['wine grape varieties','grape varieties list','red wine grapes','white wine grapes','wine grapes A-Z','grape guide','sommelier'],h1:'Wine grape varieties',crumbs:[['Grapes',rel]],body,
     jsonld:{"@type":"CollectionPage","name":"Wine grape varieties","url":SITE+rel}})]);}

  // ---------- REGIONS ----------
  for(const r of R){
    const [n,c,cont,gr,ds]=r,s=RS[n],up='../../',rel=`regions/${s}/`;
    const prod=K&&K[n]?K[n].split('|'):[], sub=SUB&&SUB[n]?SUB[n].split(',').map(x=>x.trim()):[];
    const ap=(AP||[]).filter(a=>a.r==n), ws=WL.filter(w=>w.r==n), same=R.filter(x=>x[1]==c&&x[0]!=n);
    const sp=(SPR||[]).filter(x=>x.wr==n);
    const kw=uniq([`${n} wine`,`${n} wine region`,`${n} ${c}`,`${n} grapes`,`best ${n} wines`,`${n} producers`,...gr.split(',').map(x=>x.trim()).slice(0,3).map(x=>`${n} ${x}`),...sub.slice(0,4),`${c} wine`,'wine regions']);
    const title=T(`${n} Wine Region, ${c}: Grapes, Producers & Wines`);
    const desc=cut(`${n} (${c}): ${ds}. Key grapes ${gr}${prod.length?'; top producers include '+prod.slice(0,3).join(', '):''}. A sommelier's guide to the region.`,158);
    const body=`${photo(n,up)}<p class="meta">${esc(c)} · ${esc(cont)}</p><p class="lead">${esc(ds)}.</p>
${CI&&CI[c]?`<p class="muted">${esc(CI[c])}</p>`:''}
<div class="facts"><div><b>Country</b>${esc(c)}</div><div><b>Key grapes</b>${gr.split(',').map(x=>glink(x,up)).join(', ')}</div>${sub.length?`<div><b>Subregions</b>${esc(sub.join(', '))}</div>`:''}</div>
${prod.length?`<h2>Notable producers in ${esc(n)}</h2><ul class="list">${prod.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}
${ap.length?`<h2>Official appellations</h2><div class="tbl"><table><tr><th>Appellation</th><th>Status</th><th>Style</th><th>Grapes</th></tr>${ap.map(a=>`<tr><td><b>${esc(a.n)}</b>${a.y?` <span class="muted">(${esc(a.y)})</span>`:''}${a.d?`<br><span class="muted" style="font-size:14px">${esc(a.d)}</span>`:''}</td><td>${esc(a.t)}</td><td>${esc(a.s)}</td><td>${(a.g||[]).map(x=>glink(x,up)).join(', ')}</td></tr>`).join('')}</table></div>`:''}
${ws.length?`<h2>${esc(n)} wines to try</h2>${wineList(ws,up)}`:''}
${sp.length?`<h2>Spirits from ${esc(n)}</h2><div class="chips">${sp.map(x=>`<a class="chip" href="${up}spirits/${slug(x.n)}/">${esc(x.s)}</a>`).join('')}</div>`:''}
${same.length?`<h2>More wine regions in ${esc(c)}</h2><div class="chips">${same.map(x=>`<a class="chip" href="${up}regions/${RS[x[0]]}/">${esc(x[0])}</a>`).join('')}</div>`:''}
<p><a class="btn" href="${up}#regions">See ${esc(n)} on the wine map</a></p>`;
    pages.push([rel,page({rel,title,desc,keywords:kw,h1:`${n} wine region`,crumbs:[['Wine regions','regions/'],[n,rel]],body,img:PHf(n)?'img/p/'+PHf(n)[0]:null,
      jsonld:{"@type":"Place","name":`${n} wine region`,"description":desc,"containedInPlace":{"@type":"Country","name":c},"url":SITE+rel,...(PHf(n)?{"image":SITE+'img/p/'+PHf(n)[0]}:{})}})]);
  }
  {const rel='regions/',up='../';const conts=uniq(R.map(r=>r[2]));
   const body=`<p class="lead">${R.length} wine regions in ${uniq(R.map(r=>r[1])).length} countries, each with its key grapes, producers, appellations and wines to try.</p>
${conts.map(ct=>`<h2>${esc(ct)}</h2>${uniq(R.filter(r=>r[2]==ct).map(r=>r[1])).map(c=>`<h3 style="margin-top:14px">${esc(c)}</h3><div class="chips">${R.filter(r=>r[1]==c).map(r=>`<a class="chip" href="${up}regions/${RS[r[0]]}/">${esc(r[0])}</a>`).join('')}</div>`).join('')}`).join('\n')}
<p><a class="btn" href="${up}#winemap">Open the interactive wine map</a></p>`;
   pages.push([rel,page({rel,title:'Wine Regions of the World: Guide & Map | The Wine Reference',desc:cut(`Explore ${R.length} wine regions in Europe, the Americas, Australia, New Zealand and South Africa: grapes, producers, appellations and wines to try, by a head sommelier.`,158),
     keywords:['wine regions','wine regions of the world','French wine regions','Italian wine regions','Spanish wine regions','wine map','wine appellations'],h1:'Wine regions of the world',crumbs:[['Wine regions',rel]],body,jsonld:{"@type":"CollectionPage","name":"Wine regions of the world","url":SITE+rel}})]);}

  // ---------- SPIRITS ----------
  for(const x of SPR||[]){
    const s=slug(x.n),up='../../',rel=`spirits/${s}/`,bs=(SPB||[]).filter(b=>b.r==x.n),same=(SPR||[]).filter(y=>y.t==x.t&&y.n!=x.n);
    const kw=uniq([`${x.n} ${x.s}`,x.s,`${x.s} guide`,`how ${x.s} is made`,`best ${x.s}`,`${x.n} distilleries`,...x.p.slice(0,4),x.c,x.t.toLowerCase(),'spirits guide']);
    const title=T(`${x.n} ${x.s}: How It's Made, Taste & Bottles`);
    const desc=cut(`${x.n} (${x.c}) and its ${x.s}: ${x.d} How it is made, how it tastes and the bottles to try.`,158);
    const ph=SPH[x.n],dd=SPD[x.n]||{};
    const body=`${ph?`<img class="hero" src="${up}img/p/${esc(ph[0])}" alt="${esc(ph[3]||x.n)}" width="600" height="400"><p class="credit">Photo: <a href="https://unsplash.com/@${esc(ph[2])}?utm_source=wine_reference&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer">${esc(ph[1])}</a> on Unsplash</p>`:''}<p class="meta">${esc(x.t)} · ${esc(x.c)}</p><p class="lead">${esc(x.d)}</p>
<div class="facts"><div><b>Spirit</b>${esc(x.s)}</div><div><b>Made from</b>${esc(x.k)}</div><div><b>Taste</b>${esc(x.tl)}</div><div><b>How to drink</b>${esc(x.dr)}</div></div>
<h2>How it's made</h2><p>${esc(x.m)}</p>${dd.pr?`<p>${esc(dd.pr)}</p>`:''}
${[['History',dd.h],['Ageing and label terms',dd.ag],['Styles',dd.sy],['Rules and protected names',dd.ru],['How to serve and classic cocktails',dd.cx],['With food',dd.fx],['Good to know',dd.x]].filter(r=>r[1]).map(r=>`<h2>${r[0]}</h2><p>${esc(r[1])}</p>`).join('\n')}
<h2>Producers</h2><ul class="list">${x.p.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>
${bs.length?`<h2>Bottles to try</h2><div class="grid">${bs.map(b=>`<div class="card"><div class="meta">${esc(b.t)} · ${esc(b.c)}</div><h3>${esc(b.p)} ${esc(b.w)}</h3><p>${esc(b.n)}</p>${b.a||b.ag?`<p>${b.a?`<b>Strength:</b> ${esc(b.a)}`:''}${b.a&&b.ag?' · ':''}${b.ag?`<b>Age and cask:</b> ${esc(b.ag)}`:''}</p>`:''}${b.x?`<p>${esc(b.x)}</p>`:''}${b.dr?`<p><b>Serve:</b> ${esc(b.dr)}</p>`:''}</div>`).join('')}</div>`:''}
${x.wr&&RS[x.wr]?`<p>Also a wine region: <a href="${up}regions/${RS[x.wr]}/">${esc(x.wr)} wine guide</a>.</p>`:''}
${same.length?`<h2>More ${esc(x.t.toLowerCase())} regions</h2><div class="chips">${same.map(y=>`<a class="chip" href="${up}spirits/${slug(y.n)}/">${esc(y.n)}</a>`).join('')}</div>`:''}
<p><a class="btn" href="${up}#spirits">Explore all spirits in the interactive guide</a></p>`;
    pages.push([rel,page({rel,title,desc,keywords:kw,h1:`${x.n}: ${x.s}`,crumbs:[['Spirits','spirits/'],[x.n,rel]],body,jsonld:{"@type":"Article","headline":`${x.s} from ${x.n}`,"description":desc,"author":{"@type":"Person","name":"Diego Muntoni"},"mainEntityOfPage":SITE+rel}})]);
  }
  {const rel='spirits/',up='../';const cats=uniq((SPR||[]).map(x=>x.t));
   const body=`<p class="lead">The great spirit regions of the world: ${(SPR||[]).length} places, what they make, how it's made and ${(SPB||[]).length} bottles to try.</p>
${cats.map(t=>`<h2>${esc(t)}</h2><div class="grid">${SPR.filter(x=>x.t==t).map(x=>`<a class="card" href="${up}spirits/${slug(x.n)}/"><div class="meta">${esc(x.c)}</div><h3>${esc(x.n)}</h3><p>${esc(x.s)}</p></a>`).join('')}</div>`).join('\n')}
<p><a class="btn" href="${up}#spirits">Open the interactive spirits guide</a></p>`;
   pages.push([rel,page({rel,title:'Spirits Guide: Whisky, Cognac, Rum, Tequila & Gin Regions | The Wine Reference',desc:cut('A sommelier\'s guide to the world\'s spirit regions: Scotch whisky from Speyside and Islay, bourbon, Cognac, Armagnac, rum, tequila, mezcal, gin and more, with bottles to try.',158),
     keywords:['spirits guide','whisky regions','Scotch whisky regions','cognac','rum','tequila','mezcal','gin','bourbon','brandy'],h1:'Spirits guide',crumbs:[['Spirits',rel]],body,jsonld:{"@type":"CollectionPage","name":"Spirits guide","url":SITE+rel}})]);}

  // ---------- STORIES ----------
  for(const x of ST||[]){
    const s=slug(x.id),up='../../',rel=`stories/${s}/`;
    const img=x.img?`img/s/${x.img[0]}`:null;
    const kw=uniq([...x.t.split(/[:,–-]/).map(y=>y.trim()).filter(y=>y.length>3).slice(0,3),x.c+' of wine','wine story','wine history']);
    const body=`<p class="meta">${esc(x.c)} · ${esc(x.d)}</p>${img?`<img class="hero wide" src="${up}${esc(img)}" alt="${esc(x.img[3]||x.t)}" width="1200" height="675"><p class="credit">Photo: <a href="https://unsplash.com/@${esc(x.img[2])}?utm_source=wine_reference&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer">${esc(x.img[1])}</a> on Unsplash</p>`:''}
<p class="lead">${esc(x.s)}</p>${(x.b||[]).map(p=>`<p>${esc(p)}</p>`).join('\n')}
${x.r&&x.r.length?`<h2>Sources</h2><ul class="list">${x.r.map(r=>`<li><a href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a></li>`).join('')}</ul>`:''}
<p><a class="btn" href="${up}stories/">More wine stories</a></p>`;
    pages.push([rel,page({rel,title:T(x.t),desc:cut(x.s,158),keywords:kw,h1:x.t,crumbs:[['Wine stories','stories/'],[x.t,rel]],body,img,
      jsonld:{"@type":"Article","headline":x.t,"description":x.s,"datePublished":x.d,"author":{"@type":"Person","name":"Diego Muntoni"},"mainEntityOfPage":SITE+rel,...(img?{"image":SITE+img}:{})}})]);
  }
  {const rel='stories/',up='../';const body=`<p class="lead">A new story from the world of wine every day: history, people, places and curious facts, each with its sources.</p><div class="grid">${(ST||[]).map(x=>`<a class="card" href="${up}stories/${slug(x.id)}/"><div class="meta">${esc(x.c)} · ${esc(x.d)}</div><h3>${esc(x.t)}</h3><p>${esc(x.s)}</p></a>`).join('')}</div>`;
   pages.push([rel,page({rel,title:'Wine Stories: History, People & Places | The Wine Reference',desc:'A new wine story every day: wine history, famous bottles, people, regions and curious facts, each with its sources. By head sommelier Diego Muntoni.',keywords:['wine stories','wine history','wine facts','famous wines','wine blog'],h1:'Wine stories',crumbs:[['Wine stories',rel]],body,jsonld:{"@type":"CollectionPage","name":"Wine stories","url":SITE+rel}})]);}

  // ---------- WINE LIBRARY ----------
  {const rel='wine-library/',up='../';const cs=uniq(WL.map(w=>w.c)).sort();
   const body=`<p class="lead">${WL.length} real bottles from real producers, each linked to its region and grapes. New wines are added every day.</p><div class="chips">${cs.map(c=>`<a class="chip" href="#${slug(c)}">${esc(c)}</a>`).join('')}</div>
${cs.map(c=>`<h2 id="${slug(c)}">${esc(c)}</h2>${wineList(WL.filter(w=>w.c==c),up)}`).join('\n')}
<p><a class="btn" href="${up}#library">Search and filter the Wine Library</a></p>`;
   pages.push([rel,page({rel,title:'The Wine Library: Real Wines to Try by Region & Grape | The Wine Reference',desc:cut(`${WL.length} recommended wines from real producers, from classic Bordeaux and Barolo to great-value bottles, with tasting notes and food pairing, by a head sommelier.`,158),
     keywords:['wine recommendations','best wines to try','wine list','red wine recommendations','white wine recommendations','sommelier wine picks'],h1:'The Wine Library',crumbs:[['Wine Library',rel]],body,jsonld:{"@type":"CollectionPage","name":"The Wine Library","url":SITE+rel}})]);}

  // ---------- FOOD PAIRING ----------
  {const rel='food-pairing/',up='../';const cats=(D.PC||uniq(DP.map(x=>x.c)));
   const body=`<p class="lead">${DP.length} dishes with the grapes that suit them, real bottles to try and a recipe.</p><div class="chips">${cats.map(c=>`<a class="chip" href="#${slug(c)}">${esc(c)}</a>`).join('')}</div>
${cats.map(c=>{const xs=DP.filter(x=>x.c==c);return xs.length?`<h2 id="${slug(c)}">${esc(c)}</h2><div class="grid">${xs.map(x=>`<div class="card"><h3>${esc(x.d)}</h3><p><b>Wine:</b> ${x.g.map(y=>glink(y,up)).join(', ')}</p>${x.n?`<p>${esc(x.n)}</p>`:''}${x.b&&x.b.length?`<p class="muted">Try: ${x.b.map(b=>esc(b[0]+' '+b[1])).join('; ')}</p>`:''}${x.r?`<p><a href="${esc(x.r[1])}" target="_blank" rel="noopener">Recipe: ${esc(x.r[0])}</a></p>`:''}</div>`).join('')}</div>`:''}).join('\n')}
<p><a class="btn" href="${up}#pairing">Use the interactive food and wine matcher</a></p>`;
   pages.push([rel,page({rel,title:'Food and Wine Pairing Guide: What Wine With Dinner? | The Wine Reference',desc:cut(`What wine goes with steak, salmon, curry or pizza? ${DP.length} dishes matched with grapes, real bottles and recipes by a head sommelier.`,158),
     keywords:['food and wine pairing','wine pairing','what wine with steak','what wine with salmon','wine with curry','wine with pizza','wine pairing guide'],h1:'Food and wine pairing',crumbs:[['Food pairing',rel]],body,jsonld:{"@type":"CollectionPage","name":"Food and wine pairing","url":SITE+rel}})]);}

  // ---------- GLOSSARY ----------
  {const rel='glossary/',up='../';const L=uniq(D.gl.map(t=>t[0].normalize('NFD')[0].toUpperCase()).filter(x=>/[A-Z]/.test(x)));
   const body=`<p class="lead">${D.gl.length} wine words explained in plain English: tasting, winemaking, labels and service.</p><div class="az">${L.map(l=>`<a class="chip" href="#${l}">${l}</a>`).join('')}</div>
${L.map(l=>`<h2 id="${l}">${l}</h2><dl>${D.gl.filter(t=>t[0].normalize('NFD')[0].toUpperCase()==l).map(t=>`<dt id="${slug(t[0])}">${esc(t[0])}</dt><dd>${esc(t[1])}</dd>`).join('')}</dl>`).join('\n')}`;
   pages.push([rel,page({rel,title:'Wine Glossary A–Z: Wine Terms Explained | The Wine Reference',desc:cut(`${D.gl.length} wine terms explained in plain English, from acidity and appellation to tannin, terroir and vintage. A sommelier's A–Z glossary.`,158),
     keywords:['wine glossary','wine terms','wine terminology','wine vocabulary','tasting terms','what does tannin mean','wine words A-Z'],h1:'Wine glossary A–Z',crumbs:[['Glossary',rel]],body,
     jsonld:{"@type":"DefinedTermSet","name":"Wine glossary","url":SITE+rel,"hasDefinedTerm":D.gl.slice(0,400).map(t=>({"@type":"DefinedTerm","name":t[0],"description":t[1]}))}})]);}

  // ---------- CAREERS ----------
  const today=new Date().toISOString().slice(0,10);const CGv=(D.CG||[]).filter(x=>x.d<=today);
  for(const x of CGv){
    const up='../../',rel=`careers/${x.id}/`;
    const kw=uniq([...x.t.split(/[:,–-]/).map(y=>y.trim()).filter(y=>y.length>3).slice(0,3),'sommelier career','how to become a sommelier','sommelier jobs',x.c.toLowerCase()+' for sommeliers','wine career']);
    const body=`<p class="meta">${esc(x.c)} · ${esc(x.d)}</p><p class="lead">${esc(x.s)}</p>${x.b.map(p=>`<p>${esc(p)}</p>`).join('\n')}
${x.k&&x.k.length?`<h2>Key points</h2><ul class="list">${x.k.map(k=>`<li>${esc(k)}</li>`).join('')}</ul>`:''}
${x.r&&x.r.length?`<h2>Sources</h2><ul class="list">${x.r.map(r=>`<li><a href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a></li>`).join('')}</ul>`:''}
<p><a class="btn" href="${up}careers/">More sommelier career guides</a></p>`;
    pages.push([rel,page({rel,title:T(x.t),desc:cut(x.s,158),keywords:kw,h1:x.t,crumbs:[['Sommelier careers','careers/'],[x.t,rel]],body,
      jsonld:{"@type":"Article","headline":x.t,"description":x.s,"datePublished":x.d,"author":{"@type":"Person","name":"Diego Muntoni","jobTitle":"Head Sommelier"},"mainEntityOfPage":SITE+rel}})]);
  }
  {const rel='careers/',up='../';const body=`<p class="lead">In-depth guides to a career in wine by head sommelier Diego Muntoni: qualifications, roles, skills, interviews, pay and progression. A new guide every week.</p><div class="grid">${CGv.map(x=>`<a class="card" href="${up}careers/${x.id}/"><div class="meta">${esc(x.c)} · ${esc(x.d)}</div><h3>${esc(x.t)}</h3><p>${esc(x.s)}</p></a>`).join('')}</div>
<p><a class="btn" href="${up}#careers">Find sommelier jobs and use the job tracker</a></p>`;
   pages.push([rel,page({rel,title:'Sommelier Careers: How to Become a Sommelier | The Wine Reference',desc:'How to become a sommelier: qualifications (Court of Master Sommeliers, WSET), roles, skills, interviews, pay and career progression, explained by a head sommelier.',
     keywords:['sommelier career','how to become a sommelier','sommelier qualifications','sommelier jobs','wine career','Court of Master Sommeliers','WSET'],h1:'Sommelier careers',crumbs:[['Sommelier careers',rel]],body,jsonld:{"@type":"CollectionPage","name":"Sommelier careers","url":SITE+rel}})]);}

  // ---------- NEWSLETTER (data/newsletter.json) ----------
  {let NI=[];try{NI=JSON.parse(fs.readFileSync(path.join(ROOT,'data','newsletter.json'),'utf8')).issues||[]}catch(e){console.warn('newsletter.json not read:',e.message)}
   NI=NI.filter(x=>x.d<=today);const abs=u=>/^https?:/.test(u||'')?u:SITE+(u||'');
   for(const x of NI){const up='../../',rel=`newsletter/${x.id}/`;
     const body=`<p class="meta">Newsletter · ${esc(x.d)}</p><p class="lead">${esc(x.intro)}</p>
${x.items.map(it=>`<h2>${esc(it.h)}</h2><p>${esc(it.p)}</p><p><a class="btn" href="${esc(abs(it.u))}">${esc(it.cta||'Read more')}</a></p>`).join('\n')}
<p>${esc(x.outro)}</p>
<p class="muted" style="font-size:14px">Missed an issue? <a href="${up}newsletter/">See all newsletters</a>.</p>`;
     pages.push([rel,page({rel,title:T(x.subject),desc:cut(x.preview,158),keywords:['wine newsletter','The Wine Reference newsletter','wine recommendations','sommelier tips'],h1:x.subject,crumbs:[['Newsletter','newsletter/'],[x.d,rel]],body,
       jsonld:{"@type":"Article","headline":x.subject,"description":x.preview,"datePublished":x.d,"author":{"@type":"Person","name":"Diego Muntoni"},"mainEntityOfPage":SITE+rel}})]);}
   const rel='newsletter/',up='../';const body=`<p class="lead">A short weekly email from head sommelier Diego Muntoni: new wine stories, bottles worth opening, spirits and career advice. One email a week at most; unsubscribe any time.</p>
<h2>Past issues</h2><div class="grid">${NI.map(x=>`<a class="card" href="${up}newsletter/${x.id}/"><div class="meta">${esc(x.d)}</div><h3>${esc(x.subject)}</h3><p>${esc(x.preview)}</p></a>`).join('')||'<p class="muted">The first issue is on its way.</p>'}</div>`;
   pages.push([rel,page({rel,title:'The Wine Reference Newsletter: Weekly Wine Picks & Stories',desc:'Sign up for a short weekly email from a head sommelier: new wine stories, bottles worth opening, spirits and career advice. Read past issues here.',keywords:['wine newsletter','weekly wine email','wine recommendations','sommelier newsletter'],h1:'The Wine Reference newsletter',crumbs:[['Newsletter',rel]],body,jsonld:{"@type":"CollectionPage","name":"The Wine Reference newsletter","url":SITE+rel}})]);}

  const seen=new Set();for(const [rel,html] of pages){if(seen.has(rel))throw new Error('Duplicate page '+rel);seen.add(rel);write(rel,html)}
  console.log('pages written:',pages.length);
  execSync('python3 tools/make_sitemap.py',{cwd:ROOT,stdio:'inherit'});
})().catch(e=>{console.error(e);process.exit(1)});
