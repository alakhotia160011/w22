/* ========== MEMB (ETF Members) ========== */

async function loadMEMB(ticker){
  const el=document.getElementById('membContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('membLogo').innerHTML='W22 &#9654; MEMB: '+ticker;
  try{
    const res=await fetch(`${API}/memb/${ticker}`);
    const d=await res.json();
    if(d.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${d.error}</div>`;return;}
    document.getElementById('membTagline').textContent=`${d.name} · ${d.family||''} · ${d.category||''}`;
    renderMEMB(d,ticker);
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

function renderMEMB(d,ticker){
  const el=document.getElementById('membContent');
  let html='';

  // top row: fund info + asset classes + expense ratio
  html+='<div class="fa-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:12px;">';
  // fund info card
  html+='<div class="fa-card">';
  html+='<div class="fa-card-title">FUND INFO</div>';
  html+=`<div class="fa-row"><span class="fa-label">Name</span><span class="fa-val">${d.name||'--'}</span></div>`;
  if(d.family)html+=`<div class="fa-row"><span class="fa-label">Family</span><span class="fa-val">${d.family}</span></div>`;
  if(d.category)html+=`<div class="fa-row"><span class="fa-label">Category</span><span class="fa-val">${d.category}</span></div>`;
  if(d.expenseRatio!=null)html+=`<div class="fa-row"><span class="fa-label">Expense Ratio</span><span class="fa-val">${d.expenseRatio.toFixed(2)}%</span></div>`;
  html+='</div>';
  // asset classes card
  html+='<div class="fa-card">';
  html+='<div class="fa-card-title">ASSET ALLOCATION</div>';
  const ac=d.assetClasses||{};
  if(ac.stock)html+=`<div class="fa-row"><span class="fa-label">Stocks</span><span class="fa-val">${ac.stock.toFixed(1)}%</span></div>`;
  if(ac.bond)html+=`<div class="fa-row"><span class="fa-label">Bonds</span><span class="fa-val">${ac.bond.toFixed(1)}%</span></div>`;
  if(ac.cash)html+=`<div class="fa-row"><span class="fa-label">Cash</span><span class="fa-val">${ac.cash.toFixed(1)}%</span></div>`;
  if(ac.other)html+=`<div class="fa-row"><span class="fa-label">Other</span><span class="fa-val">${ac.other.toFixed(1)}%</span></div>`;
  html+='</div>';
  // equity stats card
  const es=d.equityStats||{};
  html+='<div class="fa-card">';
  html+='<div class="fa-card-title">EQUITY STATS</div>';
  if(Object.keys(es).length){
    for(const[k,v]of Object.entries(es)){
      html+=`<div class="fa-row"><span class="fa-label">${k}</span><span class="fa-val">${v}</span></div>`;
    }
  } else {
    html+='<div style="color:var(--muted);padding:4px 0;">N/A</div>';
  }
  html+='</div>';
  html+='</div>';

  // main content: holdings table + sector breakdown side by side
  html+='<div style="display:flex;gap:12px;">';

  // holdings table
  html+='<div style="flex:2;">';
  html+='<table style="width:100%;min-width:400px;">';
  html+='<thead><tr><th style="text-align:left;">TICKER</th><th style="text-align:left;">HOLDING</th><th>WEIGHT</th><th style="width:120px;"></th></tr></thead>';
  html+='<tbody>';
  if(d.holdings.length){
    d.holdings.forEach(h=>{
      const name=(h.name||'').replace(/'/g,"\\'");
      html+=`<tr class="data-row" style="cursor:pointer" onclick="openGlobalChart('${h.symbol}','${name}')">`;
      html+=`<td style="text-align:left;color:var(--blue);font-weight:500">${h.symbol}</td>`;
      html+=`<td style="text-align:left;color:var(--muted);font-size:11px;">${(h.name||'').substring(0,35)}</td>`;
      html+=`<td style="font-weight:500">${h.weight.toFixed(2)}%</td>`;
      html+=`<td><span class="rsi-bar" style="width:100px;height:4px;"><span class="rsi-fill" style="width:${Math.min(100,h.weight*5)}%;background:var(--accent);"></span></span></td>`;
      html+=`</tr>`;
    });
  } else {
    html+='<tr><td colspan="4" style="color:var(--muted);padding:8px;">No holdings data</td></tr>';
  }
  html+='</tbody></table></div>';

  // sector breakdown
  html+='<div style="flex:1;">';
  html+='<div class="fa-card">';
  html+='<div class="fa-card-title">SECTOR BREAKDOWN</div>';
  if(d.sectors.length){
    d.sectors.forEach(s=>{
      html+=`<div class="fa-row"><span class="fa-label">${s.sector}</span><span class="fa-val">${s.weight.toFixed(1)}%</span></div>`;
      html+=`<div style="margin:2px 0 6px;"><span class="rsi-bar" style="width:100%;height:4px;"><span class="rsi-fill" style="width:${s.weight}%;background:var(--accent);"></span></span></div>`;
    });
  } else {
    html+='<div style="color:var(--muted);padding:4px 0;">No sector data</div>';
  }
  html+='</div>';

  // description
  if(d.description){
    html+='<div class="fa-card" style="margin-top:12px;">';
    html+='<div class="fa-card-title">DESCRIPTION</div>';
    html+=`<p style="color:var(--text);font-size:11px;line-height:1.6;padding:4px 0;">${d.description}</p>`;
    html+='</div>';
  }
  html+='</div>';

  html+='</div>';
  el.innerHTML=html;
}
