let srchData=[];

async function loadSRCH(){
  const el=document.getElementById('srchContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  // collect filter params
  const params=new URLSearchParams();
  const minCap=document.getElementById('srchMinCap').value;
  const maxPE=document.getElementById('srchMaxPE').value;
  const sector=document.getElementById('srchSector').value;
  const sort=document.getElementById('srchSort').value;
  if(minCap)params.set('min_cap',minCap);
  if(maxPE)params.set('max_pe',maxPE);
  if(sector)params.set('sector',sector);
  if(sort)params.set('sort_by',sort);
  params.set('limit','50');
  try{
    const res=await fetch(`${API}/srch?${params}`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    srchData=data.stocks||[];
    document.getElementById('srchStatus').textContent=`${srchData.length} results`;
    renderSRCH();
  }catch(e){el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';}
}

function renderSRCH(){
  const el=document.getElementById('srchContent');
  if(!srchData.length){el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No results. Try different filters.</div>';return;}
  let html='<table style="min-width:900px;"><thead><tr>';
  html+='<th style="text-align:left">TICKER</th><th style="text-align:left">NAME</th><th>SECTOR</th><th>MKT CAP</th><th>P/E</th><th>PRICE</th><th>%CHG</th><th>VOLUME</th>';
  html+='</tr></thead><tbody>';
  srchData.forEach(s=>{
    const chgCls=(s.change||0)>0?'pos':(s.change||0)<0?'neg':'neutral';
    html+=`<tr class="data-row" style="cursor:pointer" onclick="openGlobalChart('${s.symbol}','${(s.name||'').replace(/'/g,"\\'")}')">`;
    html+=`<td style="text-align:left;color:var(--blue);font-weight:500">${s.symbol}</td>`;
    html+=`<td style="text-align:left;color:var(--muted)">${(s.name||'').substring(0,25)}</td>`;
    html+=`<td style="color:var(--muted);font-size:10px">${s.sector||'--'}</td>`;
    html+=`<td>${s.marketCap?fmtNum(s.marketCap):'--'}</td>`;
    html+=`<td>${s.pe!=null?s.pe.toFixed(1):'--'}</td>`;
    html+=`<td class="price-cell">${fp(s.price)}</td>`;
    html+=`<td class="${chgCls}">${s.change!=null?(s.change>0?'+':'')+s.change.toFixed(1)+'%':'--'}</td>`;
    html+=`<td style="color:var(--muted);font-size:10px">${fVol(s.volume)}</td>`;
    html+=`</tr>`;
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}
