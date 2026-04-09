/* ========== HS (Historical Spread) ========== */
let hsNormChart=null, hsSpreadChart=null;
let hsTickers=[], hsData=null, hsPeriod='1y', hsMode='subtract', hsTopMode='norm';
const hsColors=['#4fc3f7','#f0a500','#00c853','#ff3d3d','#bb86fc','#ff6e40','#26c6da','#ec407a'];

function hsGoFromInputs(){
  const t1=document.getElementById('hsTicker1').value.trim().toUpperCase();
  const t2=document.getElementById('hsTicker2').value.trim().toUpperCase();
  if(!t1||!t2)return;
  document.getElementById('hsTicker1').value=t1;
  document.getElementById('hsTicker2').value=t2;
  loadHS([t1,t2]);
}
function hsFlip(){
  const el1=document.getElementById('hsTicker1');
  const el2=document.getElementById('hsTicker2');
  const tmp=el1.value;
  el1.value=el2.value;
  el2.value=tmp;
  hsTickers=[el1.value.trim().toUpperCase(),el2.value.trim().toUpperCase()];
  if(hsData)renderHS();
}
function hsChangePeriod(period,btn){
  hsPeriod=period;
  document.querySelectorAll('#page-hs .period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(hsTickers.length)loadHS(hsTickers);
}
function hsChangeMode(mode,btn){
  hsMode=mode;
  document.querySelectorAll('.hs-mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(hsData)renderHS();
}
function hsChangeTop(mode,btn){
  hsTopMode=mode;
  document.querySelectorAll('.hs-top-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(hsData)renderHS();
}

async function loadHS(tickers){
  hsTickers=tickers;
  document.getElementById('hsTicker1').value=tickers[0]||'';
  document.getElementById('hsTicker2').value=tickers[1]||'';
  // clear charts
  if(hsNormChart){hsNormChart.destroy();hsNormChart=null;}
  if(hsSpreadChart){hsSpreadChart.destroy();hsSpreadChart=null;}
  try{
    const res=await fetch(`${API}/hs?tickers=${tickers.join(',')}&p=${hsPeriod}`);
    const data=await res.json();
    if(data.error){return;}
    hsData=data;
    renderHS();
  }catch(e){}
}

function renderHS(){
  const d=hsData;
  const tickers=hsTickers.filter(t=>d.series[t]);
  const timestamps=d.timestamps;
  const labels=timestamps.map(ts=>{
    const dt=new Date(ts*1000);
    return timestamps.length>500?fmt_mmm_yy(dt):fmt_dd_mmm(dt);
  });

  // --- top chart: normalized or actual price ---
  const useNorm=hsTopMode==='norm';
  const normDatasets=tickers.map((t,i)=>({
    label:t,
    data:useNorm?d.series[t].norm:d.series[t].raw,
    borderColor:hsColors[i%hsColors.length],
    borderWidth:1.5,
    pointRadius:0,
    tension:.2,
    fill:false,
  }));

  if(hsNormChart)hsNormChart.destroy();
  const ctx1=document.getElementById('hsNormChart').getContext('2d');
  hsNormChart=new Chart(ctx1,{
    type:'line',
    data:{labels,datasets:normDatasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:true,position:'top',labels:{color:'#888',font:{family:'IBM Plex Mono',size:10},boxWidth:12,padding:12}},
        tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,
          titleColor:'#888',bodyColor:'#e0e0e0',titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:11},
          callbacks:{
            title:ctx=>{const dt=new Date(timestamps[ctx[0].dataIndex]*1000);return fmt_dd_mmm_yy(dt);},
            label:ctx=>` ${ctx.dataset.label}: ${useNorm?ctx.parsed.y.toFixed(1):'$'+ctx.parsed.y.toFixed(2)}`
          }},
      },
      scales:{
        x:{grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},maxTicksLimit:10,minRotation:45,maxRotation:45},border:{color:'#222'}},
        y:{grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},callback:v=>useNorm?v.toFixed(0):'$'+v.toFixed(0)},border:{color:'#222'},
          title:{display:true,text:useNorm?'NORMALIZED (BASE 100)':'PRICE ($)',color:'#555',font:{family:'IBM Plex Mono',size:9}}}
      }
    }
  });

  // --- bottom chart: spread between first two tickers ---
  if(tickers.length<2){
    if(hsSpreadChart){hsSpreadChart.destroy();hsSpreadChart=null;}
    return;
  }
  const raw0=d.series[tickers[0]].raw;
  const raw1=d.series[tickers[1]].raw;
  let spreadData=[];
  let spreadLabel='';
  if(hsMode==='subtract'){
    spreadData=raw0.map((v,i)=>round4(v-raw1[i]));
    spreadLabel=`${tickers[0]} - ${tickers[1]}`;
  } else if(hsMode==='ratio'){
    spreadData=raw0.map((v,i)=>round4(v/raw1[i]));
    spreadLabel=`${tickers[0]} / ${tickers[1]}`;
  } else {
    // residual: normalized difference
    const n0=d.series[tickers[0]].norm;
    const n1=d.series[tickers[1]].norm;
    spreadData=n0.map((v,i)=>round4(v-n1[i]));
    spreadLabel=`${tickers[0]} - ${tickers[1]} (normalized)`;
  }

  function round4(v){return Math.round(v*10000)/10000;}

  const isUp=spreadData[spreadData.length-1]>=spreadData[0];
  const sColor=isUp?'#00c853':'#ff3d3d';

  if(hsSpreadChart)hsSpreadChart.destroy();
  const ctx2=document.getElementById('hsSpreadChart').getContext('2d');
  hsSpreadChart=new Chart(ctx2,{
    type:'line',
    data:{labels,datasets:[{
      label:spreadLabel,
      data:spreadData,
      borderColor:sColor,
      borderWidth:1.5,
      pointRadius:0,
      fill:true,
      backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isUp?'rgba(0,200,83,.1)':'rgba(255,61,61,.1)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},
      tension:.2,
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:true,position:'top',labels:{color:'#888',font:{family:'IBM Plex Mono',size:10},boxWidth:12}},
        tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,
          titleColor:'#888',bodyColor:'#e0e0e0',titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:11},
          callbacks:{
            title:ctx=>{const dt=new Date(timestamps[ctx[0].dataIndex]*1000);return fmt_dd_mmm_yy(dt);},
            label:ctx=>` ${ctx.parsed.y.toFixed(4)}`
          }},
      },
      scales:{
        x:{grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},maxTicksLimit:10,minRotation:45,maxRotation:45},border:{color:'#222'}},
        y:{grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9}},border:{color:'#222'},
          title:{display:true,text:spreadLabel.toUpperCase(),color:'#555',font:{family:'IBM Plex Mono',size:9}}}
      }
    }
  });
}
