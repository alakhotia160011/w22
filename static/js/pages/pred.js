/* ========== PRED ========== */
let predChart2=null, predMarkets=[], predCatFilter='', predCurrentMarket=null, predFullHistory=[];
let predCollapsed={};

function setPredCat(cat,btn){
  predCatFilter=cat;
  document.querySelectorAll('.pred-cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderPRED();
}

async function loadPRED(){
  document.getElementById('predStatus').textContent='Loading...';
  const el=document.getElementById('predList');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span></div>';
  try{
    const res=await fetch(`${API}/pred?limit=50`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    predMarkets=data.markets;
    renderPRED();
    document.getElementById('predStatus').textContent=`${data.markets.length} markets`;
  }catch(e){
    el.innerHTML='<div style="padding:40px;color:var(--red)">Error</div>';
  }
}

function renderPRED(){
  const el=document.getElementById('predList');
  el.innerHTML='';
  let filtered=predMarkets;
  if(predCatFilter)filtered=filtered.filter(m=>m.category===predCatFilter);

  // group by category
  const groups={};
  filtered.forEach(m=>{
    const cat=m.category||'Other';
    if(!groups[cat])groups[cat]=[];
    groups[cat].push(m);
  });

  const catOrder=['Geopolitics','Politics','Rates & Macro','Crypto','Commodities','Sports','Other'];
  catOrder.forEach(cat=>{
    const items=groups[cat];
    if(!items)return;
    const isCollapsed=predCollapsed[cat]||false;
    const hdr=document.createElement('div');
    hdr.className='pred-group-hdr';
    hdr.innerHTML=`<span><span class="pred-group-arrow${isCollapsed?' collapsed':''}">&#9654;</span> ${cat.toUpperCase()} (${items.length})</span><span style="color:var(--muted);font-size:9px;">${isCollapsed?'CLICK TO EXPAND':'CLICK TO COLLAPSE'}</span>`;
    hdr.onclick=()=>{predCollapsed[cat]=!predCollapsed[cat];renderPRED();};
    el.appendChild(hdr);

    if(isCollapsed)return;
    items.forEach(m=>{
      const yesPrice=m.prices[0]||0;
      const noPrice=m.prices[1]||0;
      const yesPct=(yesPrice*100).toFixed(1);
      const noPct=(noPrice*100).toFixed(1);
      const chg1d=m.oneDayChange;
      const chgCls=chg1d>0?'pos':chg1d<0?'neg':'neutral';

      const row=document.createElement('div');
      row.className='pred-row';
      row.onclick=function(){openPredChart(m,this);};
      row.innerHTML=`
        <span class="pred-q">${m.question}</span>
        <span class="pred-pct pred-yes">${yesPct}%</span>
        <span><span class="pred-bar"><span class="pred-bar-fill" style="width:${yesPct}%;background:var(--green);"></span></span></span>
        <span class="pred-pct pred-no">${noPct}%</span>
        <span style="min-width:80px;text-align:right;color:var(--muted);font-size:10px;">${fmtVol24(m.volume24h)}</span>
        <span style="min-width:60px;text-align:right;font-size:11px;" class="${chgCls}">${chg1d!=null?(chg1d>0?'+':'')+chg1d.toFixed(1)+'c':'--'}</span>`;
      el.appendChild(row);
    });
  });

  if(!filtered.length){
    el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No markets in this category</div>';
  }
}

function fmtVol24(v){
  if(!v)return '--';
  if(v>=1e6)return '$'+(v/1e6).toFixed(1)+'M';
  if(v>=1e3)return '$'+(v/1e3).toFixed(0)+'K';
  return '$'+v.toFixed(0);
}

async function openPredChart(market,rowEl){
  document.querySelectorAll('.pred-row').forEach(r=>r.classList.remove('selected'));
  if(rowEl)rowEl.classList.add('selected');
  predCurrentMarket=market;

  const panel=document.getElementById('predChart');
  panel.style.display='flex';
  panel.classList.remove('hidden');
  document.getElementById('predChartTitle').textContent=market.question;
  const yesPct=(market.prices[0]*100).toFixed(1);
  document.getElementById('predChartSub').textContent=`YES ${yesPct}% | Vol ${fmtVol24(market.volume24h)}`;
  document.getElementById('predChartStats').innerHTML='';
  // reset period to ALL
  document.querySelectorAll('#predChart .period-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#predChart .period-btn').forEach(b=>{if(b.textContent==='ALL')b.classList.add('active');});

  const loadingEl=document.getElementById('predChartLoading');
  loadingEl.style.display='flex';

  const tokenId=market.tokenIds[0];
  if(!tokenId){loadingEl.style.display='none';return;}
  try{
    const res=await fetch(`${API}/pred/history/${tokenId}`);
    const data=await res.json();
    loadingEl.style.display='none';
    predFullHistory=data.history||[];
    drawPredChart(predFullHistory,market);
  }catch(e){loadingEl.style.display='none';}
}

function predChangeFidelity(hours,btn){
  document.querySelectorAll('#predChart .period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(!predFullHistory.length||!predCurrentMarket)return;
  let filtered=predFullHistory;
  if(hours>0){
    const cutoff=Date.now()/1000 - hours*3600;
    filtered=predFullHistory.filter(h=>h.t>=cutoff);
  }
  drawPredChart(filtered,predCurrentMarket);
}

function drawPredChart(history,market){
  if(!history.length){
    document.getElementById('predChartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No history</div></div>';
    return;
  }
  const timestamps=history.map(h=>h.t);
  const prices=history.map(h=>h.p*100);
  const labels=timestamps.map(ts=>{
    const d=toEST(new Date(ts*1000));
    if(history.length>200)return fmt_mmm_yy(d);
    if(history.length>50)return fmt_dd_mmm(d);
    return fmt_dd_mmm(d)+' '+estTime(new Date(ts*1000));
  });

  if(predChart2)predChart2.destroy();
  const ctx=document.getElementById('predPriceChart').getContext('2d');
  const lastP=prices[prices.length-1];
  const firstP=prices[0];
  const isUp=lastP>=firstP;
  const color=isUp?'#00c853':'#ff3d3d';

  predChart2=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{data:prices,borderColor:color,borderWidth:1.5,pointRadius:0,fill:true,
      backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isUp?'rgba(0,200,83,.12)':'rgba(255,61,61,.12)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},tension:.2}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,
        titleColor:'#888',bodyColor:'#e0e0e0',titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
        callbacks:{
          title:ctx=>{const d=toEST(new Date(timestamps[ctx[0].dataIndex]*1000));return estFull(new Date(timestamps[ctx[0].dataIndex]*1000));},
          label:c=>`  YES: ${c.parsed.y.toFixed(1)}%`
        }}},
      scales:{
        x:{grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},maxTicksLimit:8,minRotation:45,maxRotation:45},border:{color:'#222'}},
        y:{position:'right',grid:{color:'#161616'},
          ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},callback:v=>v.toFixed(0)+'%'},
          min:0,max:100,border:{color:'#222'}}
      }}
  });

  const chg=lastP-firstP;
  const high=Math.max(...prices);
  const low=Math.min(...prices);
  document.getElementById('predChartStats').innerHTML=`
    <div class="stat"><div class="stat-label">CURRENT (YES)</div><div class="stat-value">${lastP.toFixed(1)}%</div></div>
    <div class="stat"><div class="stat-label">CHANGE</div><div class="stat-value ${chg>=0?'pos':'neg'}">${chg>=0?'+':''}${chg.toFixed(1)}pp</div></div>
    <div class="stat"><div class="stat-label">DATAPOINTS</div><div class="stat-value neutral">${history.length}</div></div>
    <div class="stat"><div class="stat-label">HIGH</div><div class="stat-value pos">${high.toFixed(1)}%</div></div>
    <div class="stat"><div class="stat-label">LOW</div><div class="stat-value neg">${low.toFixed(1)}%</div></div>
    <div class="stat"><div class="stat-label">VOL 24H</div><div class="stat-value neutral">${fmtVol24(market.volume24h)}</div></div>`;
}

function closePredChart(){
  document.getElementById('predChart').style.display='none';
  document.getElementById('predChart').classList.add('hidden');
  document.querySelectorAll('.pred-row').forEach(r=>r.classList.remove('selected'));
  if(predChart2){predChart2.destroy();predChart2=null;}
  predCurrentMarket=null;predFullHistory=[];
}
