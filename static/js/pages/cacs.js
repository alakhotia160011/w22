async function loadCACS(ticker){
  const el=document.getElementById('cacsContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('cacsLogo').innerHTML='W22 &#9654; CACS: '+ticker;
  try{
    const res=await fetch(`${API}/cacs/${ticker}`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    document.getElementById('cacsTagline').textContent=`${ticker} Corporate Actions`;
    renderCACS(data);
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

function renderCACS(data){
  const el=document.getElementById('cacsContent');
  let html='<div style="display:flex;gap:16px;height:calc(100vh - 38px - 41px - 32px);">';
  // Left: upcoming + dividend info
  html+='<div class="fa-card" style="min-width:300px;">';
  html+='<div class="fa-card-title">DIVIDEND INFO</div>';
  const up=data.upcoming||{};
  if(up.dividendYield)html+=`<div class="fa-row"><span class="fa-label">Yield</span><span class="fa-val">${(up.dividendYield*100).toFixed(2)}%</span></div>`;
  if(up.dividendRate)html+=`<div class="fa-row"><span class="fa-label">Annual Rate</span><span class="fa-val">$${up.dividendRate.toFixed(2)}</span></div>`;
  if(up.payoutRatio)html+=`<div class="fa-row"><span class="fa-label">Payout Ratio</span><span class="fa-val">${(up.payoutRatio*100).toFixed(1)}%</span></div>`;
  if(up.exDividendDate)html+=`<div class="fa-row"><span class="fa-label">Ex-Dividend</span><span class="fa-val">${up.exDividendDate}</span></div>`;
  if(up.dividendDate)html+=`<div class="fa-row"><span class="fa-label">Pay Date</span><span class="fa-val">${up.dividendDate}</span></div>`;
  // Splits
  html+='<div class="fa-card-title" style="margin-top:16px;">STOCK SPLITS</div>';
  const splits=data.splits||[];
  if(splits.length){
    splits.forEach(s=>html+=`<div class="fa-row"><span class="fa-label">${s.date}</span><span class="fa-val">${s.ratio}:1</span></div>`);
  } else {
    html+='<div style="color:var(--muted);padding:4px 0;">No splits on record</div>';
  }
  html+='</div>';
  // Right: dividend history table
  html+='<div class="fa-card" style="flex:1;">';
  html+='<div class="fa-card-title">DIVIDEND HISTORY</div>';
  const divs=data.dividends||[];
  if(divs.length){
    html+='<table class="fa-stmt-table"><thead><tr><th>DATE</th><th>AMOUNT</th></tr></thead><tbody>';
    divs.forEach(d=>html+=`<tr><td>${d.date}</td><td>$${d.amount.toFixed(4)}</td></tr>`);
    html+='</tbody></table>';
  } else {
    html+='<div style="color:var(--muted);padding:4px 0;">No dividends on record</div>';
  }
  html+='</div></div>';
  el.innerHTML=html;
}
