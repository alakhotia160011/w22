/* ========== GP (full-page chart) ========== */
let gpChart=null, gpTicker=null, gpPeriod='3m', gpMode='price', gpLastData=null;
let gpCompareTickers=[], gpCompareData={};
let gpPrevClose=null; // previous day's close for daily change calc

function loadGP(ticker){
  gpTicker=ticker;gpPeriod='3m';
  gpCompareTickers=[];gpCompareData={};gpPrevClose=null;
  document.getElementById('gpLogo').innerHTML='W22 &#9654; GP: '+ticker;
  document.getElementById('gpChartStats').innerHTML='';
  document.getElementById('gpCompareInput').value='';
  document.querySelectorAll('#page-gp .period-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-gp .period-btn')[4].classList.add('active');
  // fetch prev close
  fetch(`${API}/quote/${encodeURIComponent(ticker)}`).then(r=>r.json()).then(q=>{
    if(q.pc)gpPrevClose=q.pc;
  }).catch(()=>{});
  renderGPChart(ticker,gpPeriod);
}

async function gpAddCompare(){
  const inp=document.getElementById('gpCompareInput');
  const t=inp.value.trim().toUpperCase();
  inp.value='';
  if(!t||t===gpTicker||gpCompareTickers.includes(t))return;
  gpCompareTickers.push(t);
  try{
    const res=await fetch(`${API}/candles/${encodeURIComponent(t)}?p=${gpPeriod}`);
    const data=await res.json();
    if(data.c&&data.s!=='no_data'){
      gpCompareData[t]=data;
      drawGPChart(gpLastData);
    } else {
      gpCompareTickers=gpCompareTickers.filter(x=>x!==t);
    }
  }catch(e){gpCompareTickers=gpCompareTickers.filter(x=>x!==t);}
}

function gpClearCompare(){
  gpCompareTickers=[];gpCompareData={};
  if(gpLastData)drawGPChart(gpLastData);
}

async function gpChangePeriod(period,btn){
  gpPeriod=period;
  document.querySelectorAll('#page-gp .period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(gpTicker)await renderGPChart(gpTicker,period);
  for(const t of gpCompareTickers){
    try{
      const res=await fetch(`${API}/candles/${encodeURIComponent(t)}?p=${period}`);
      const data=await res.json();
      if(data.c&&data.s!=='no_data')gpCompareData[t]=data;
    }catch(e){}
  }
  if(gpCompareTickers.length&&gpLastData)drawGPChart(gpLastData);
}
function gpChangeMode(mode,btn){
  gpMode=mode;
  document.querySelectorAll('.gp-mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(gpLastData)drawGPChart(gpLastData);
}

async function renderGPChart(ticker,period){
  const loadingEl=document.getElementById('gpChartLoading');
  loadingEl.style.display='flex';
  try{
    const res=await fetch(`${API}/candles/${encodeURIComponent(ticker)}?p=${period}`);
    const data=await res.json();
    loadingEl.style.display='none';
    if(!data.c||data.s==='no_data'){
      document.getElementById('gpChartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No data</div></div>';
      return;
    }
    data._period=period;
    gpLastData=data;
    drawGPChart(data);
  }catch(e){loadingEl.style.display='none';}
}

function drawGPChart(data){
  const period=data._period||gpPeriod;
  const rawCloses=data.c,highs=data.h,lows=data.l,volumes=data.v||[];
  const useNorm=gpMode==='norm';
  const hasCompare=gpCompareTickers.length>0;
  const current=rawCloses[rawCloses.length-1];
  const base=rawCloses[0];

  // daily change from prev close (the standard way)
  const dailyChg=gpPrevClose?((current-gpPrevClose)/gpPrevClose)*100:null;
  // period change from first bar
  const periodChg=((current-base)/base)*100;
  // use prev close for color if available, otherwise period
  const isUp=gpPrevClose?(current>=gpPrevClose):(current>=base);

  const closes=useNorm?rawCloses.map(v=>(v/base)*100):rawCloses;
  const axis=buildAxisConfig(data.t,period);
  const mainColor=hasCompare?'#4fc3f7':(isUp?'#00c853':'#ff3d3d');
  if(gpChart)gpChart.destroy();
  const ctx=document.getElementById('gpPriceChart').getContext('2d');
  const tickSet=new Set(axis.tickIndices);

  const datasets=[{
    label:gpTicker,data:closes,borderColor:mainColor,borderWidth:1.5,pointRadius:0,tension:.2,
    fill:!hasCompare,
    backgroundColor:hasCompare?'transparent':c=>{
      const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);
      g.addColorStop(0,isUp?'rgba(0,200,83,.12)':'rgba(255,61,61,.12)');
      g.addColorStop(1,'rgba(0,0,0,0)');return g;},
  }];
  const compColors=['#f0a500','#00c853','#ff3d3d','#bb86fc','#ff6e40','#26c6da','#ec407a'];
  gpCompareTickers.forEach((t,i)=>{
    const cd=gpCompareData[t];
    if(!cd||!cd.c)return;
    const rc=cd.c;
    let aligned=rc;
    if(rc.length>rawCloses.length) aligned=rc.slice(rc.length-rawCloses.length);
    else if(rc.length<rawCloses.length) aligned=[...Array(rawCloses.length-rc.length).fill(null),...rc];
    const cBase=aligned.find(v=>v!=null);
    const vals=useNorm?aligned.map(v=>v!=null?(v/cBase)*100:null):aligned;
    datasets.push({
      label:t,data:vals,borderColor:compColors[i%compColors.length],borderWidth:1.5,pointRadius:0,
      tension:.2,fill:false,
    });
  });

  gpChart=new Chart(ctx,{
    type:'line',plugins:[daySepPlugin],
    data:{labels:axis.labels,datasets},
    options:{responsive:true,maintainAspectRatio:false,_dayBounds:axis.dayBounds,
      plugins:{
        legend:{display:hasCompare,position:'top',labels:{color:'#888',font:{family:'IBM Plex Mono',size:10},boxWidth:12,padding:12}},
        tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
        titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:11},
        callbacks:{title:tipCtx=>{const d=new Date(data.t[tipCtx[0].dataIndex]*1000);return axis.tooltip(d);},
          label:c=>c.parsed.y!=null?(useNorm?` ${c.dataset.label}: ${c.parsed.y.toFixed(1)}`:` ${c.dataset.label}: $${c.parsed.y.toFixed(2)}`):''}
      }},
      scales:{x:{grid:{color:i=>tickSet.has(i)?'#1e1e1e':'transparent'},
          ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},minRotation:45,maxRotation:45,autoSkip:false,
            callback:function(val,i){return tickSet.has(i)?axis.labels[i]:null;}},border:{color:'#222'}},
        y:{position:'right',grid:{color:'#161616'},
          ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},callback:v=>useNorm?v.toFixed(0):'$'+v.toFixed(0)},
          border:{color:'#222'}}}}
  });
  const high=Math.max(...highs.filter(v=>v));
  const low=Math.min(...lows.filter(v=>v));
  const rsi14=calcRSI(rawCloses,14);
  const rsi9=calcRSI(rawCloses,9);
  // daily change (prev close based) + period change
  const dailyStr=dailyChg!=null?`${dailyChg>=0?'+':''}${dailyChg.toFixed(2)}%`:'--';
  const dailyCls=dailyChg!=null?(dailyChg>=0?'pos':'neg'):'neutral';
  const periodStr=`${periodChg>=0?'+':''}${periodChg.toFixed(2)}%`;
  const periodCls=periodChg>=0?'pos':'neg';
  const periodLabel={'1d':'1D','3d':'3D','1w':'1W','1m':'1M','3m':'3M','6m':'6M','1y':'1Y','5y':'5Y','max':'MAX'}[period]||period;
  document.getElementById('gpChartStats').innerHTML=`
    <div class="stat"><div class="stat-label">CURRENT</div><div class="stat-value">${fp(current)}</div></div>
    <div class="stat"><div class="stat-label">PREV CLOSE</div><div class="stat-value neutral">${gpPrevClose?fp(gpPrevClose):'--'}</div></div>
    <div class="stat"><div class="stat-label">DAILY CHG</div><div class="stat-value ${dailyCls}">${dailyStr}</div></div>
    <div class="stat"><div class="stat-label">${periodLabel} CHG</div><div class="stat-value ${periodCls}">${periodStr}</div></div>
    <div class="stat"><div class="stat-label">RSI 9 / 14</div><div class="stat-value">${rsi9!=null?rsi9.toFixed(1):'--'} / ${rsi14!=null?rsi14.toFixed(1):'--'}</div></div>
    <div class="stat"><div class="stat-label">${periodLabel} HIGH</div><div class="stat-value pos">${fp(high)}</div></div>
    <div class="stat"><div class="stat-label">${periodLabel} LOW</div><div class="stat-value neg">${fp(low)}</div></div>
    <div class="stat"><div class="stat-label">AVG VOL</div><div class="stat-value neutral">${volumes.length?fVol(volumes.reduce((a,b)=>a+b,0)/volumes.length):'--'}</div></div>`;
  const compareStr=gpCompareTickers.length?` vs ${gpCompareTickers.join(', ')}`:'';
  const tagChg=dailyChg!=null?dailyChg:periodChg;
  document.getElementById('gpTagline').textContent=`${gpTicker}${compareStr} · ${tagChg>=0?'+':''}${tagChg.toFixed(2)}%`;
}
