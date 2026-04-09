let mostData=null;

async function loadMOST(){
  document.getElementById('mostStatus').textContent='Loading...';
  const el=document.getElementById('mostContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  try{
    const res=await fetch(`${API}/most`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    mostData=data;
    renderMOST();
    document.getElementById('mostStatus').textContent='';
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

function renderMOST(){
  const el=document.getElementById('mostContent');
  el.innerHTML='';
  const sections=[
    {key:'gainers',title:'TOP GAINERS',icon:'▲'},
    {key:'losers',title:'TOP LOSERS',icon:'▼'},
    {key:'active',title:'MOST ACTIVE',icon:'◆'},
  ];
  // 3-column layout
  el.innerHTML='<div style="display:flex;gap:12px;padding:12px;height:100%;">'+sections.map(s=>{
    const items=mostData[s.key]||[];
    let html=`<div style="flex:1;overflow-y:auto;background:var(--bg2);border:1px solid var(--border);">`;
    html+=`<div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--accent);font-size:10px;font-weight:600;letter-spacing:1px;">${s.icon} ${s.title} (${items.length})</div>`;
    items.forEach(q=>{
      const chgCls=(q.changePercent||0)>0?'pos':(q.changePercent||0)<0?'neg':'neutral';
      html+=`<div class="data-row" style="display:flex;padding:6px 12px;border-bottom:1px solid #161616;cursor:pointer;gap:8px;align-items:center;" onclick="openGlobalChart('${q.symbol}','${(q.name||'').replace(/'/g,"\\'")}')">`;
      html+=`<span style="color:var(--blue);font-weight:500;min-width:55px;">${q.symbol}</span>`;
      html+=`<span style="color:var(--muted);flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${q.name||''}</span>`;
      html+=`<span class="price-cell" style="min-width:60px;text-align:right;">${fp(q.price)}</span>`;
      html+=`<span class="${chgCls}" style="min-width:55px;text-align:right;">${q.changePercent!=null?(q.changePercent>0?'+':'')+q.changePercent.toFixed(1)+'%':'--'}</span>`;
      html+=`<span style="color:var(--muted);font-size:10px;min-width:55px;text-align:right;">${fVol(q.volume)}</span>`;
      html+=`</div>`;
    });
    html+=`</div>`;
    return html;
  }).join('')+'</div>';
}
