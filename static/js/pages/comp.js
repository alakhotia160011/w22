async function loadCOMP(ticker){
  const el=document.getElementById('compContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('compLogo').innerHTML='W22 &#9654; COMP: '+ticker;
  try{
    const res=await fetch(`${API}/comp/${ticker}`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    document.getElementById('compTagline').textContent=`${data.industry||''} Comparables`;
    renderCOMP(data,ticker);
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

function renderCOMP(data,mainTicker){
  const el=document.getElementById('compContent');
  const peers=data.peers||[];
  if(!peers.length){el.innerHTML='<div style="padding:40px;color:var(--muted)">No comparable data</div>';return;}
  const metrics=[
    {key:'marketCap',label:'Mkt Cap',fmt:v=>fmtNum(v)},
    {key:'trailingPE',label:'P/E',fmt:v=>v!=null?v.toFixed(1):'--'},
    {key:'forwardPE',label:'Fwd P/E',fmt:v=>v!=null?v.toFixed(1):'--'},
    {key:'priceToBook',label:'P/B',fmt:v=>v!=null?v.toFixed(1):'--'},
    {key:'enterpriseToEbitda',label:'EV/EBITDA',fmt:v=>v!=null?v.toFixed(1):'--'},
    {key:'profitMargins',label:'Net Margin',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'operatingMargins',label:'Op Margin',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'grossMargins',label:'Gross Margin',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'returnOnEquity',label:'ROE',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'revenueGrowth',label:'Rev Growth',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'earningsGrowth',label:'Earn Growth',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'dividendYield',label:'Div Yield',fmt:v=>v!=null?(v*100).toFixed(1)+'%':'--'},
    {key:'debtToEquity',label:'D/E',fmt:v=>v!=null?v.toFixed(1):'--'},
    {key:'beta',label:'Beta',fmt:v=>v!=null?v.toFixed(2):'--'},
  ];
  let html='<table class="fa-stmt-table"><thead><tr><th>METRIC</th>';
  peers.forEach(p=>{
    const isMain=p.symbol===mainTicker;
    html+=`<th style="${isMain?'color:var(--accent);':''}">${p.symbol}</th>`;
  });
  html+='</tr></thead><tbody>';
  // company name row
  html+='<tr><td>Company</td>';
  peers.forEach(p=>html+=`<td style="color:var(--muted);font-size:10px;">${(p.name||'').substring(0,20)}</td>`);
  html+='</tr>';
  metrics.forEach(m=>{
    html+=`<tr><td>${m.label}</td>`;
    // find min/max for highlighting
    const vals=peers.map(p=>p[m.key]).filter(v=>v!=null&&!isNaN(v));
    peers.forEach(p=>{
      const v=p[m.key];
      const isMain=p.symbol===mainTicker;
      html+=`<td style="${isMain?'font-weight:600;':''}">${m.fmt(v)}</td>`;
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}
