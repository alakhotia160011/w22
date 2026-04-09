let srchData=[];
let srchMinCap='', srchMaxPE='', srchSector='';

function setSrchCap(val,btn){
  srchMinCap=val;
  document.querySelectorAll('.srch-cap-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function setSrchPE(val,btn){
  srchMaxPE=val;
  document.querySelectorAll('.srch-pe-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function setSrchSector(val,btn){
  srchSector=val;
  document.querySelectorAll('.srch-sec-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

async function loadSRCH(){
  const el=document.getElementById('srchContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  const params=new URLSearchParams();
  if(srchMinCap)params.set('min_cap',srchMinCap);
  if(srchMaxPE)params.set('max_pe',srchMaxPE);
  if(srchSector)params.set('sector',srchSector);
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
  if(!srchData.length){el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No results. Adjust filters and press SCREEN.</div>';return;}
  let html='<table style="min-width:900px;"><thead><tr>';
  html+='<th style="text-align:left">TICKER</th><th style="text-align:left">NAME</th><th>SECTOR</th><th>MKT CAP</th><th>P/E</th><th>PRICE</th><th>%CHG</th><th>VOLUME</th>';
  html+='</tr></thead><tbody>';
  srchData.forEach(s=>{
    const chgStr=s.change||'0%';
    const chgNum=parseFloat(chgStr);
    const chgCls=chgNum>0?'pos':chgNum<0?'neg':'neutral';
    const name=(s.name||'').replace(/'/g,"\\'");
    html+=`<tr class="data-row" style="cursor:pointer" onclick="openGlobalChart('${s.symbol}','${name}')">`;
    html+=`<td style="text-align:left;color:var(--blue);font-weight:500">${s.symbol}</td>`;
    html+=`<td style="text-align:left;color:var(--muted)">${(s.name||'').substring(0,30)}</td>`;
    html+=`<td style="color:var(--muted);font-size:10px">${s.sector||'--'}</td>`;
    html+=`<td>${s.marketCap||'--'}</td>`;
    html+=`<td>${s.pe||'--'}</td>`;
    html+=`<td class="price-cell">${s.price||'--'}</td>`;
    html+=`<td class="${chgCls}">${chgStr}</td>`;
    html+=`<td style="color:var(--muted);font-size:10px">${s.volume||'--'}</td>`;
    html+=`</tr>`;
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}
