const API = '/api';

/* ========== FORMATTERS ========== */
function fp(v,d=2){return v!=null&&!isNaN(v)?Number(v).toFixed(d):'--';}
function fPct(v){
  if(v==null||isNaN(v))return '<span class="neutral">--</span>';
  const cls=v>0?'pos':v<0?'neg':'neutral';
  return `<span class="${cls}">${v>0?'+':''}${Number(v).toFixed(2)}%</span>`;
}
function fNet(v){
  if(v==null||isNaN(v))return '<span class="neutral">--</span>';
  const cls=v>0?'pos':v<0?'neg':'neutral';
  return `<span class="${cls}">${v>0?'+':''}${Number(v).toFixed(2)}</span>`;
}
function fRSI(v){
  if(v==null)return '<span class="neutral">--</span>';
  const color=v>70?'#ff3d3d':v<30?'#00c853':'#f0a500';
  return `<span class="rsi-wrap">${Number(v).toFixed(1)}<span class="rsi-bar"><span class="rsi-fill" style="width:${Math.min(100,v)}%;background:${color}"></span></span></span>`;
}
function fSig(v){
  if(v==null)return '<span class="neutral">--</span>';
  if(v>70)return '<span class="neg">OVERBOUGHT</span>';
  if(v<30)return '<span class="pos">OVERSOLD</span>';
  if(v>55)return '<span class="pos">BULLISH</span>';
  if(v<45)return '<span class="neg">BEARISH</span>';
  return '<span class="neutral">NEUTRAL</span>';
}
function fVol(v){
  if(!v||isNaN(v)||v===0)return '<span class="neutral">--</span>';
  if(v>=1e9)return `<span class="vol-cell">${(v/1e9).toFixed(1)}B</span>`;
  if(v>=1e6)return `<span class="vol-cell">${(v/1e6).toFixed(1)}M</span>`;
  if(v>=1e3)return `<span class="vol-cell">${(v/1e3).toFixed(0)}K</span>`;
  return `<span class="vol-cell">${v}</span>`;
}
function calcRSI(closes,period=14){
  if(!closes||closes.length<period+1)return null;
  let g=0,l=0;
  for(let i=closes.length-period;i<closes.length;i++){
    const d=closes[i]-closes[i-1];if(d>0)g+=d;else l+=Math.abs(d);
  }
  const ag=g/period,al=l/period;
  if(al===0)return 100;
  return 100-(100/(1+ag/al));
}

function fmtNum(v,dec=2){
  if(v==null||isNaN(v))return '--';
  if(Math.abs(v)>=1e12)return (v/1e12).toFixed(1)+'T';
  if(Math.abs(v)>=1e9)return (v/1e9).toFixed(1)+'B';
  if(Math.abs(v)>=1e6)return (v/1e6).toFixed(1)+'M';
  if(Math.abs(v)>=1e3)return (v/1e3).toFixed(1)+'K';
  return Number(v).toFixed(dec);
}
function fmtPct(v){if(v==null)return '--';return (v*100).toFixed(1)+'%';}
function fmtRatio(v){if(v==null)return '--';return Number(v).toFixed(2);}
