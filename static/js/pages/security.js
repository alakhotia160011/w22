/* ========== CN (Company News) ========== */
async function loadCN(ticker){
  const el=document.getElementById('cnContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('cnLogo').innerHTML='W22 &#9654; CN: '+ticker;
  try{
    const res=await fetch(`${API}/cn/${ticker}`);
    const d=await res.json();
    if(d.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${d.error}</div>`;return;}
    document.getElementById('cnTagline').textContent=`${ticker} · Company News`;
    const articles=d.articles||[];
    if(!articles.length){el.innerHTML='<div style="padding:40px;color:var(--muted)">No news found</div>';return;}
    el.innerHTML='';
    articles.forEach(a=>{
      let dateStr='';
      if(a.date){
        try{
          const dt=new Date(a.date);
          dateStr=estFull(dt);
        }catch(e){dateStr=a.date;}
      }
      const div=document.createElement('div');
      div.className='news-item';
      div.innerHTML=`
        <div><span class="news-source news-source-default">${a.source}</span><span class="news-time">${dateStr}</span></div>
        <div class="news-title"><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></div>
        ${a.summary?`<div class="news-desc">${a.summary}</div>`:''}`;
      el.appendChild(div);
    });
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

/* ========== DES (Company Description) ========== */
async function loadDES(ticker){
  const el=document.getElementById('desContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('desLogo').innerHTML='W22 &#9654; DES: '+ticker;
  try{
    const res=await fetch(`${API}/des/${ticker}`);
    const d=await res.json();
    if(d.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${d.error}</div>`;return;}
    document.getElementById('desTagline').textContent=`${d.name} · ${d.sector||''} · ${d.industry||''}`;
    el.innerHTML=`
      <div class="fa-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px;">
        <div class="fa-card">
          <div class="fa-card-title">COMPANY INFO</div>
          <div class="fa-row"><span class="fa-label">Name</span><span class="fa-val">${d.name||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Sector</span><span class="fa-val">${d.sector||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Industry</span><span class="fa-val">${d.industry||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Exchange</span><span class="fa-val">${d.exchange||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Currency</span><span class="fa-val">${d.currency||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Type</span><span class="fa-val">${d.quoteType||'--'}</span></div>
        </div>
        <div class="fa-card">
          <div class="fa-card-title">DETAILS</div>
          <div class="fa-row"><span class="fa-label">Market Cap</span><span class="fa-val">${d.marketCap?fmtNum(d.marketCap):'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Employees</span><span class="fa-val">${d.employees?fmtNum(d.employees,0):'--'}</span></div>
          <div class="fa-row"><span class="fa-label">HQ</span><span class="fa-val">${[d.city,d.state,d.country].filter(Boolean).join(', ')||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Website</span><span class="fa-val">${d.website?'<a href="'+d.website+'" target="_blank" style="color:var(--blue)">'+d.website+'</a>':'--'}</span></div>
        </div>
      </div>
      <div class="fa-card">
        <div class="fa-card-title">BUSINESS DESCRIPTION</div>
        <p style="color:var(--text);font-size:12px;line-height:1.7;padding:8px 0;">${d.description||'No description available.'}</p>
      </div>`;
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

/* ========== EVT (Events & Earnings) ========== */
async function loadEVT(ticker){
  const el=document.getElementById('evtContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  document.getElementById('evtLogo').innerHTML='W22 &#9654; EVT: '+ticker;
  try{
    const res=await fetch(`${API}/evt/${ticker}`);
    const d=await res.json();
    if(d.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${d.error}</div>`;return;}
    document.getElementById('evtTagline').textContent=`${d.name} · Events & Earnings`;
    let html='<div style="display:flex;gap:16px;height:calc(100vh - 38px - 41px - 32px);">';
    // left: upcoming events
    html+=`<div class="fa-card" style="min-width:280px;"><div class="fa-card-title">UPCOMING EVENTS</div>`;
    if(d.earningsDate)html+=`<div class="fa-row"><span class="fa-label">Next Earnings</span><span class="fa-val">${d.earningsDate}</span></div>`;
    if(d.exDividendDate)html+=`<div class="fa-row"><span class="fa-label">Ex-Dividend</span><span class="fa-val">${d.exDividendDate}</span></div>`;
    if(d.dividendDate)html+=`<div class="fa-row"><span class="fa-label">Dividend Date</span><span class="fa-val">${d.dividendDate}</span></div>`;
    if(d.calendar){
      Object.entries(d.calendar).forEach(([k,v])=>{
        if(v&&v!=='None')html+=`<div class="fa-row"><span class="fa-label">${k}</span><span class="fa-val">${v}</span></div>`;
      });
    }
    html+=`</div>`;
    // right: earnings history
    html+=`<div class="fa-card" style="flex:1;"><div class="fa-card-title">EARNINGS HISTORY</div>`;
    if(d.earningsHistory&&d.earningsHistory.length){
      html+=`<table class="fa-stmt-table"><thead><tr><th>DATE</th><th>EPS EST</th><th>EPS ACTUAL</th><th>SURPRISE</th></tr></thead><tbody>`;
      d.earningsHistory.forEach(e=>{
        const surpCls=e.surprise!=null?(e.surprise>0?'pos':e.surprise<0?'neg':''):'';
        const dt=new Date(e.date+'T12:00:00');
        const dateStr=isNaN(dt)?e.date:fmt_dd_mmm_yy(dt);
        html+=`<tr>
          <td>${dateStr}</td>
          <td>${e.epsEstimate!=null?e.epsEstimate.toFixed(2):'--'}</td>
          <td>${e.epsActual!=null?e.epsActual.toFixed(2):'--'}</td>
          <td class="${surpCls}">${e.surprise!=null?(e.surprise>0?'+':'')+e.surprise.toFixed(1)+'%':'--'}</td>
        </tr>`;
      });
      html+=`</tbody></table>`;
    } else {
      html+=`<div style="color:var(--muted);padding:8px 0;">No earnings history available</div>`;
    }
    html+=`</div></div>`;
    el.innerHTML=html;
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}
