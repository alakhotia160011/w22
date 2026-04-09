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
  let html='<div style="display:flex;gap:16px;height:100%;">';

  // Left: holdings table
  html+='<div style="flex:2;overflow-y:auto;">';
  html+='<div class="fa-card" style="margin-bottom:12px;">';
  html+='<div class="fa-card-title">TOP HOLDINGS</div>';
  if(d.holdings.length){
    html+='<table class="fa-stmt-table"><thead><tr><th style="text-align:left">TICKER</th><th style="text-align:left">NAME</th><th>WEIGHT</th></tr></thead><tbody>';
    d.holdings.forEach(h=>{
      html+=`<tr class="data-row" style="cursor:pointer" onclick="openGlobalChart('${h.symbol}','${(h.name||'').replace(/'/g,"\\'")}')">`;
      html+=`<td style="text-align:left;color:var(--blue);font-weight:500">${h.symbol}</td>`;
      html+=`<td style="text-align:left;color:var(--muted)">${(h.name||'').substring(0,40)}</td>`;
      html+=`<td><span style="color:var(--text);font-weight:500">${h.weight.toFixed(2)}%</span>`;
      html+=`<span class="pred-bar" style="margin-left:8px;width:80px;"><span class="pred-bar-fill" style="width:${Math.min(100,h.weight*5)}%;background:var(--accent);"></span></span></td>`;
      html+=`</tr>`;
    });
    html+='</tbody></table>';
  } else {
    html+='<div style="color:var(--muted);padding:8px 0;">No holdings data available</div>';
  }
  html+='</div>';

  // Description
  if(d.description){
    html+='<div class="fa-card">';
    html+='<div class="fa-card-title">DESCRIPTION</div>';
    html+=`<p style="color:var(--muted);font-size:11px;line-height:1.6;">${d.description}</p>`;
    html+='</div>';
  }
  html+='</div>';

  // Right: sector weights + fund info
  html+='<div style="flex:1;overflow-y:auto;">';

  // Fund info
  html+='<div class="fa-card" style="margin-bottom:12px;">';
  html+='<div class="fa-card-title">FUND INFO</div>';
  if(d.family)html+=`<div class="fa-row"><span class="fa-label">Family</span><span class="fa-val">${d.family}</span></div>`;
  if(d.category)html+=`<div class="fa-row"><span class="fa-label">Category</span><span class="fa-val">${d.category}</span></div>`;
  if(d.expenseRatio!=null)html+=`<div class="fa-row"><span class="fa-label">Expense Ratio</span><span class="fa-val">${d.expenseRatio.toFixed(2)}%</span></div>`;
  const ac=d.assetClasses||{};
  if(ac.stock)html+=`<div class="fa-row"><span class="fa-label">Stocks</span><span class="fa-val">${ac.stock.toFixed(1)}%</span></div>`;
  if(ac.bond)html+=`<div class="fa-row"><span class="fa-label">Bonds</span><span class="fa-val">${ac.bond.toFixed(1)}%</span></div>`;
  if(ac.cash)html+=`<div class="fa-row"><span class="fa-label">Cash</span><span class="fa-val">${ac.cash.toFixed(1)}%</span></div>`;
  html+='</div>';

  // Sector weights
  if(d.sectors.length){
    html+='<div class="fa-card" style="margin-bottom:12px;">';
    html+='<div class="fa-card-title">SECTOR BREAKDOWN</div>';
    d.sectors.forEach(s=>{
      html+=`<div class="fa-row"><span class="fa-label">${s.sector}</span><span class="fa-val">${s.weight.toFixed(1)}%</span></div>`;
      html+=`<div style="margin:2px 0 6px;"><span class="pred-bar" style="width:100%;"><span class="pred-bar-fill" style="width:${s.weight}%;background:var(--accent);"></span></span></div>`;
    });
    html+='</div>';
  }

  // Equity stats
  const es=d.equityStats||{};
  if(Object.keys(es).length){
    html+='<div class="fa-card">';
    html+='<div class="fa-card-title">EQUITY STATS</div>';
    for(const[k,v]of Object.entries(es)){
      html+=`<div class="fa-row"><span class="fa-label">${k}</span><span class="fa-val">${v}</span></div>`;
    }
    html+='</div>';
  }

  html+='</div></div>';
  el.innerHTML=html;
}
