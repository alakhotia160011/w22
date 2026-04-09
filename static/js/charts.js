// returns {labels[], tickIndices[], dayBoundaries[], tooltipFmt(d)}
function buildAxisConfig(timestamps, period){
  const N=timestamps.length;
  const dates=timestamps.map(ts=>new Date(ts*1000));
  const labels=[];
  const tickIndices=[];
  const dayBounds=[];

  if(period==='1d'){
    // 1min bars, label every 30min
    dates.forEach((d,i)=>{
      labels.push(fmt_time(d));
      if(d.getMinutes()===0&&d.getHours()%1===0&&i>0&&(d.getMinutes()===0)&&(d.getHours()*60+d.getMinutes())%30===0) tickIndices.push(i);
      else if(i===0) tickIndices.push(i);
    });
    // recalculate: every 30 bars (1min each)
    tickIndices.length=0;
    for(let i=0;i<N;i++){const m=dates[i].getMinutes();const h=dates[i].getHours();if(m===0||m===30)tickIndices.push(i);}
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm(d)+' '+fmt_time(d)};
  }
  if(period==='3d'){
    // 5min bars, label every 2hrs, day separators
    for(let i=0;i<N;i++){
      const d=dates[i];
      labels.push(fmt_time(d));
      if(d.getMinutes()===0&&d.getHours()%2===0)tickIndices.push(i);
      if(i>0&&dayOfTS(timestamps[i])!==dayOfTS(timestamps[i-1]))dayBounds.push(i);
    }
    const dayFirstTick={};
    tickIndices.forEach(i=>{const dk=dayOfTS(timestamps[i]);if(!dayFirstTick[dk])dayFirstTick[dk]=i;});
    const labelsFinal=labels.map(()=>'');
    tickIndices.forEach(i=>{
      const dk=dayOfTS(timestamps[i]);
      labelsFinal[i]=(dayFirstTick[dk]===i)?fmt_dd_mmm(dates[i])+' '+fmt_time(dates[i]):fmt_time(dates[i]);
    });
    return {labels:labelsFinal,tickIndices,dayBounds,tooltip:d=>fmt_datetime(d)};
  }
  if(period==='1w'){
    // 5min bars, label every 3hrs, day separators
    for(let i=0;i<N;i++){
      const d=dates[i];
      labels.push('');
      if(d.getMinutes()===0&&d.getHours()%3===0)tickIndices.push(i);
      if(i>0&&dayOfTS(timestamps[i])!==dayOfTS(timestamps[i-1]))dayBounds.push(i);
    }
    const dayFirstTick={};
    tickIndices.forEach(i=>{const dk=dayOfTS(timestamps[i]);if(!dayFirstTick[dk])dayFirstTick[dk]=i;});
    tickIndices.forEach(i=>{
      const dk=dayOfTS(timestamps[i]);
      labels[i]=(dayFirstTick[dk]===i)?fmt_dd_mmm(dates[i])+' '+fmt_time(dates[i]):fmt_time(dates[i]);
    });
    return {labels,tickIndices,dayBounds,tooltip:d=>fmt_datetime(d)};
  }
  if(period==='1m'){
    // hourly bars, label every ~2 trading days
    for(let i=0;i<N;i++)labels.push('');
    let lastShown=-Infinity;
    for(let i=0;i<N;i++){
      if(i-lastShown>=16||i===0){tickIndices.push(i);labels[i]=fmt_dd_mmm(dates[i]);lastShown=i;}
    }
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_datetime(d)};
  }
  if(period==='3m'){
    // daily bars, label every ~2 weeks (~10 trading days)
    for(let i=0;i<N;i++)labels.push('');
    let lastShown=-Infinity;
    for(let i=0;i<N;i++){
      if(i-lastShown>=10||i===0){tickIndices.push(i);labels[i]=fmt_dd_mmm(dates[i]);lastShown=i;}
    }
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm_yy(d)};
  }
  if(period==='6m'){
    // daily bars, label every ~1 month (~21 trading days)
    for(let i=0;i<N;i++)labels.push('');
    let lastShown=-Infinity;
    for(let i=0;i<N;i++){
      if(i-lastShown>=21||i===0){tickIndices.push(i);labels[i]=fmt_dd_mmm(dates[i]);lastShown=i;}
    }
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm_yy(d)};
  }
  if(period==='1y'){
    // daily bars, label every ~2 months
    for(let i=0;i<N;i++)labels.push('');
    let lastMon=-1;
    for(let i=0;i<N;i++){
      const m=dates[i].getMonth();
      if(m!==lastMon&&(lastMon===-1||((m-lastMon+12)%12)>=2||i===0)){
        tickIndices.push(i);labels[i]=fmt_mmm_yy(dates[i]);lastMon=m;
      }
    }
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm_yy(d)};
  }
  if(period==='5y'){
    // weekly bars, label every ~6 months
    for(let i=0;i<N;i++)labels.push('');
    let lastLabel=-1;
    for(let i=0;i<N;i++){
      const half=dates[i].getFullYear()*2+(dates[i].getMonth()>=6?1:0);
      if(half!==lastLabel){tickIndices.push(i);labels[i]=fmt_mmm_yy(dates[i]);lastLabel=half;}
    }
    return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm_yy(d)};
  }
  // max: weekly bars, label every ~2-3 years
  for(let i=0;i<N;i++)labels.push('');
  let lastYr=-1;
  const yrStep=N>800?5:N>400?3:2;
  for(let i=0;i<N;i++){
    const y=dates[i].getFullYear();
    if(y!==lastYr&&y%yrStep===0){tickIndices.push(i);labels[i]=fmt_mmm_yy(dates[i]);lastYr=y;}
  }
  return {labels,tickIndices,dayBounds:[],tooltip:d=>fmt_dd_mmm_yy(d)};
}

// Chart.js plugin: dotted vertical day separators
const daySepPlugin={
  id:'daySep',
  afterDatasetsDraw(chart){
    const bounds=chart.options._dayBounds;
    if(!bounds||!bounds.length)return;
    const ctx=chart.ctx;
    const xAxis=chart.scales.x;
    const yAxis=chart.scales.y;
    ctx.save();
    ctx.setLineDash([3,3]);
    ctx.strokeStyle='#333';
    ctx.lineWidth=1;
    bounds.forEach(i=>{
      const x=xAxis.getPixelForValue(i);
      ctx.beginPath();
      ctx.moveTo(x,yAxis.top);
      ctx.lineTo(x,yAxis.bottom);
      ctx.stroke();
    });
    ctx.restore();
  }
};
