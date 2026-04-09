/* ========== HEAT ========== */
let heatData=null;

function switchHeatIdx(idx,btn){
  currentHeatIdx=idx;
  document.querySelectorAll('.heat-idx-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadHEAT();
}

function switchHeatPeriod(period,btn){
  currentHeatPeriod=period;
  document.querySelectorAll('.heat-per-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(heatData)renderHEAT();
}

async function loadHEAT(){
  const el=document.getElementById('heatContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span> Loading heatmap...</div>';
  try{
    const res=await fetch(`${API}/heat?idx=${currentHeatIdx}`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    heatData=data;
    renderHEAT();
    const total=data.sectors.reduce((a,s)=>a+s.stocks.length,0);
    document.getElementById('heatStatus').textContent=`${total} stocks`;
  }catch(e){
    el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';
  }
}

function heatColor(pct){
  // green for positive, red for negative, intensity by magnitude
  if(pct==null)return '#222';
  const clamped=Math.max(-5,Math.min(5,pct));
  const intensity=Math.abs(clamped)/5;
  if(pct>0){
    const r=Math.round(10+20*intensity);
    const g=Math.round(40+160*intensity);
    const b=Math.round(10+20*intensity);
    return `rgb(${r},${g},${b})`;
  } else if(pct<0){
    const r=Math.round(40+180*intensity);
    const g=Math.round(10+15*intensity);
    const b=Math.round(10+15*intensity);
    return `rgb(${r},${g},${b})`;
  }
  return '#333';
}

function renderHEAT(){
  const el=document.getElementById('heatContent');
  el.innerHTML='';
  const p=currentHeatPeriod;
  const grid=document.createElement('div');
  grid.className='heat-grid';

  heatData.sectors.forEach(sector=>{
    const sDiv=document.createElement('div');
    sDiv.className='heat-sector';

    // sector avg for selected period
    const vals=sector.stocks.map(s=>s[p]).filter(v=>v!=null);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const avgCls=avg>0?'pos':avg<0?'neg':'neutral';

    const header=document.createElement('div');
    header.className='heat-sector-header';
    header.innerHTML=`<span>${sector.name}</span><span class="heat-sector-chg ${avgCls}">${avg>=0?'+':''}${avg.toFixed(2)}%</span>`;
    sDiv.appendChild(header);

    const stocksDiv=document.createElement('div');
    stocksDiv.className='heat-stocks';
    sector.stocks.forEach(s=>{
      const val=s[p];
      const cell=document.createElement('div');
      cell.className='heat-cell';
      cell.style.background=heatColor(val);
      cell.onclick=()=>openGlobalChart(s.ticker,s.ticker);
      const sign=val!=null&&val>0?'+':'';
      cell.innerHTML=`<span class="heat-ticker">${s.ticker}</span><span class="heat-pct">${val!=null?sign+val.toFixed(1)+'%':'--'}</span>`;
      stocksDiv.appendChild(cell);
    });
    sDiv.appendChild(stocksDiv);
    grid.appendChild(sDiv);
  });
  el.appendChild(grid);
}
