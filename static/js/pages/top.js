/* ========== TOP ========== */
let topArticles=[];
let topSourceFilter='';

function setTopFilter(val,btn){
  topSourceFilter=val;
  document.querySelectorAll('.top-src-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTOP();
}

async function loadTOP(){
  const el=document.getElementById('topContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span> Loading news...</div>';
  try{
    const res=await fetch(`${API}/top`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    topArticles=data.articles||[];
    renderTOP();
  }catch(e){
    el.innerHTML='<div style="padding:40px;color:var(--red)">Error fetching news</div>';
  }
}

function renderTOP(){
  const el=document.getElementById('topContent');
  el.innerHTML='';
  let filtered=topArticles;
  if(topSourceFilter)filtered=filtered.filter(a=>a.source===topSourceFilter);

  if(!filtered.length){
    el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No articles</div>';
    return;
  }

  let lastDate='';
  filtered.forEach(a=>{
    // convert to EST
    const rawDate=a.date?new Date(a.date):null;
    const estD=rawDate?toEST(rawDate):null;
    const dateKey=estD?`${estD.getFullYear()}-${estD.getMonth()}-${estD.getDate()}`:'';
    if(dateKey&&dateKey!==lastDate){
      lastDate=dateKey;
      const dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][estD.getDay()];
      const hdr=document.createElement('div');
      hdr.style.cssText='padding:10px 0 4px;color:var(--accent);font-size:10px;letter-spacing:2px;font-weight:600;border-bottom:1px solid var(--border);margin-top:8px;';
      hdr.textContent=`${dayName} ${estD.getDate()}-${MON[estD.getMonth()]}-${String(estD.getFullYear()).slice(2)}`;
      el.appendChild(hdr);
    }

    const srcMap={'DealBook':'dealbook','FT':'ft','WSJ':'wsj','Economist':'economist','CNBC':'cnbc','BBC':'bbc','Axios':'axios','MarketWatch':'marketwatch'};
    const srcCls='news-source-'+(srcMap[a.source]||'default');
    const timeStr=estD?estTime(rawDate):'';

    const div=document.createElement('div');
    div.className='news-item';
    div.innerHTML=`
      <div><span class="news-source ${srcCls}">${a.source}</span><span class="news-time">${timeStr?timeStr+' ET':''}</span></div>
      <div class="news-title"><a href="${a.link}" target="_blank" rel="noopener">${a.title}</a></div>
      ${a.desc?`<div class="news-desc">${a.desc}</div>`:''}`;
    el.appendChild(div);
  });
}
