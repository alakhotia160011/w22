/* ========== GLOBAL CHART (for WEI, WEIF, FX, GLCO, HEAT) ========== */
let gChart=null, gTicker=null, gPeriod='3m', gPrevClose=null;

function openGlobalChart(ticker,name){
  gTicker=ticker;
  gPeriod='3m';
  gPrevClose=null;
  const overlay=document.getElementById('globalChartOverlay');
  overlay.style.display='flex';
  document.getElementById('gChartTicker').textContent=ticker.replace('^','').replace('=X','').replace('=F','');
  document.getElementById('gChartName').textContent=name;
  document.getElementById('gChartStats').innerHTML='';
  overlay.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  overlay.querySelectorAll('.period-btn')[4].classList.add('active');
  // fetch prev close, then render chart
  fetch(`${API}/quote/${encodeURIComponent(ticker)}`).then(r=>r.json()).then(q=>{
    if(q.pc)gPrevClose=q.pc;
  }).catch(()=>{}).finally(()=>{
    renderGlobalChart(ticker,gPeriod);
  });
}

function closeGlobalChart(){
  document.getElementById('globalChartOverlay').style.display='none';
  document.getElementById('gCustomRange').style.display='none';
  if(gChart){gChart.destroy();gChart=null;}
  gTicker=null;gPrevClose=null;
}

async function gChangePeriod(period,btn){
  gPeriod=period;
  document.getElementById('globalChartOverlay').querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('gCustomRange').style.display='none';
  document.getElementById('gCustomPeriodBtn').classList.remove('active');
  if(gTicker)await renderGlobalChart(gTicker,period);
}

function gToggleCustomRange(){
  const el=document.getElementById('gCustomRange');
  const btn=document.getElementById('gCustomPeriodBtn');
  const show=el.style.display==='none';
  el.style.display=show?'flex':'none';
  if(show){
    document.getElementById('globalChartOverlay').querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const now=new Date();
    const from=new Date(now);from.setMonth(from.getMonth()-6);
    document.getElementById('gCustomTo').value=now.toISOString().slice(0,10);
    document.getElementById('gCustomFrom').value=from.toISOString().slice(0,10);
  } else {
    btn.classList.remove('active');
  }
}

async function gApplyCustomRange(){
  const from=document.getElementById('gCustomFrom').value;
  const to=document.getElementById('gCustomTo').value;
  if(!from||!to||!gTicker)return;
  const loadingEl=document.getElementById('gChartLoading');
  loadingEl.style.display='flex';
  try{
    const res=await fetch(`${API}/candles/${encodeURIComponent(gTicker)}?start=${from}&end=${to}`);
    const data=await res.json();
    loadingEl.style.display='none';
    if(!data.c||data.s==='no_data'){
      document.getElementById('gChartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No data for this range</div></div>';
      return;
    }
    const span=(new Date(to)-new Date(from))/(86400000);
    let fakePeriod='3m';
    if(span<=5)fakePeriod='3d';
    else if(span<=10)fakePeriod='1w';
    else if(span<=45)fakePeriod='1m';
    else if(span<=120)fakePeriod='3m';
    else if(span<=250)fakePeriod='6m';
    else if(span<=500)fakePeriod='1y';
    else if(span<=2000)fakePeriod='5y';
    else fakePeriod='max';
    _drawGlobalChart(data,fakePeriod);
  }catch(e){loadingEl.style.display='none';}
}

async function renderGlobalChart(ticker,period){
  const loadingEl=document.getElementById('gChartLoading');
  loadingEl.style.display='flex';
  try{
    const res=await fetch(`${API}/candles/${encodeURIComponent(ticker)}?p=${period}`);
    const data=await res.json();
    loadingEl.style.display='none';
    if(!data.c||data.s==='no_data'){
      document.getElementById('gChartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No data</div></div>';
      return;
    }
    _drawGlobalChart(data,period);
  }catch(e){loadingEl.style.display='none';}
}

function renderGlobalChartWithData(data,period){
  _drawGlobalChart(data,period);
}

function _drawGlobalChart(data,period){
  const closes=data.c,highs=data.h,lows=data.l,volumes=data.v||[];
  const axis=buildAxisConfig(data.t,period);
  const current=closes[closes.length-1];
  const isUp=gPrevClose?(current>=gPrevClose):(current>=closes[0]);
  const color=isUp?'#00c853':'#ff3d3d';
  if(gChart)gChart.destroy();
  const ctx=document.getElementById('gPriceChart').getContext('2d');
  const tickSet=new Set(axis.tickIndices);
  gChart=new Chart(ctx,{
    type:'line',plugins:[daySepPlugin],
    data:{labels:axis.labels,datasets:[{data:closes,borderColor:color,borderWidth:1.5,pointRadius:0,fill:true,
      backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isUp?'rgba(0,200,83,.12)':'rgba(255,61,61,.12)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},tension:.2}]},
    options:{responsive:true,maintainAspectRatio:false,_dayBounds:axis.dayBounds,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
        titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
        callbacks:{title:tipCtx=>{const d=new Date(data.t[tipCtx[0].dataIndex]*1000);return axis.tooltip(d);},
          label:c=>` ${c.parsed.y.toFixed(closes[0]<10?4:2)}`}}},
      scales:{x:{grid:{color:i=>tickSet.has(i)?'#1e1e1e':'transparent'},
          ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},minRotation:45,maxRotation:45,autoSkip:false,
            callback:function(val,i){return tickSet.has(i)?axis.labels[i]:null;}},border:{color:'#222'}},
        y:{position:'right',grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9}},border:{color:'#222'}}}}
  });
  const high=Math.max(...highs.filter(v=>v));
  const low=Math.min(...lows.filter(v=>v));
  const dp=closes[0]<10?4:2;
  const dailyChg=gPrevClose?((current-gPrevClose)/gPrevClose)*100:null;
  const periodChg=((current-closes[0])/closes[0])*100;
  const dailyStr=dailyChg!=null?`${dailyChg>=0?'+':''}${dailyChg.toFixed(2)}%`:'--';
  const dailyCls=dailyChg!=null?(dailyChg>=0?'pos':'neg'):'neutral';
  const periodStr=`${periodChg>=0?'+':''}${periodChg.toFixed(2)}%`;
  const periodCls=periodChg>=0?'pos':'neg';
  document.getElementById('gChartStats').innerHTML=`
    <div class="stat"><div class="stat-label">CURRENT</div><div class="stat-value">${current.toFixed(dp)}</div></div>
    <div class="stat"><div class="stat-label">DAILY CHG</div><div class="stat-value ${dailyCls}">${dailyStr}</div></div>
    <div class="stat"><div class="stat-label">PERIOD CHG</div><div class="stat-value ${periodCls}">${periodStr}</div></div>
    <div class="stat"><div class="stat-label">PERIOD HIGH</div><div class="stat-value pos">${high.toFixed(dp)}</div></div>
    <div class="stat"><div class="stat-label">PERIOD LOW</div><div class="stat-value neg">${low.toFixed(dp)}</div></div>
    <div class="stat"><div class="stat-label">AVG VOL</div><div class="stat-value neutral">${volumes.length?fVol(volumes.reduce((a,b)=>a+b,0)/volumes.length):'--'}</div></div>`;
}
