/* ========== ECO ========== */
let ecoEvents=[];
let ecoImpactFilter='';
let currentEcoWeek='this';

function setEcoFilter(val,btn){
  ecoImpactFilter=val;
  document.querySelectorAll('.eco-imp-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderECO();
}

function switchEcoWeek(week){
  currentEcoWeek=week;
  document.querySelectorAll('.eco-week-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(week==='this'?'ecoBtnThis':'ecoBtnNext').classList.add('active');
  ecoInitialized=true;
  loadECO();
}

async function loadECO(){
  const tbody=document.getElementById('ecoTableBody');
  tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)"><span class="spinner"></span> Loading...</td></tr>';
  try{
    const res=await fetch(`${API}/eco?week=${currentEcoWeek}`);
    const data=await res.json();
    if(data.error){tbody.innerHTML=`<tr><td colspan="10" style="padding:20px;color:var(--red)">${data.error}</td></tr>`;return;}
    ecoEvents=data.events||[];
    renderECO();
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="10" style="padding:20px;color:var(--red)">Error fetching data</td></tr>`;
  }
}

function ecoSurprise(actual,forecast,higherPositive){
  // returns {cls, label, val, rawDiff} or null
  // higherPositive: 1 = higher is good (GDP), -1 = higher is bad (CPI), 0 = neutral
  if(!actual||!forecast)return null;
  const av=parseFloat(actual.replace(/[%KMB,]/g,''));
  const fv=parseFloat(forecast.replace(/[%KMB,]/g,''));
  if(isNaN(av)||isNaN(fv))return null;
  const diff=av-fv;
  if(diff===0)return {cls:'neutral',label:'INLINE',val:0,rawDiff:0};
  const hp=higherPositive||0;
  // if higherPositive is -1 (e.g. CPI), a higher actual is bad
  const isGood=hp===0?(diff>0):(hp>0?diff>0:diff<0);
  return {
    cls:isGood?'eco-beat':'eco-miss',
    label:isGood?'BEAT':'MISS',
    val:isGood?1:-1,
    rawDiff:diff
  };
}

function renderECO(){
  const tbody=document.getElementById('ecoTableBody');
  tbody.innerHTML='';
  const impactFilter=ecoImpactFilter;

  let filtered=ecoEvents.filter(e=>{
    if(impactFilter==='High'&&e.impact!=='High')return false;
    if(impactFilter==='Medium'&&e.impact!=='High'&&e.impact!=='Medium')return false;
    return true;
  });

  // compute surprise index from all events (not just filtered)
  let beats=0,misses=0,inline=0,released=0,pending=0;
  ecoEvents.forEach(e=>{
    if(e.impact==='Holiday')return;
    if(e.actual){
      released++;
      const s=ecoSurprise(e.actual,e.forecast,e.higherPositive);
      if(s){
        if(s.val>0)beats++;
        else if(s.val<0)misses++;
        else inline++;
      }
    } else if(e.impact!=='Holiday'){
      pending++;
    }
  });
  const total=beats+misses+inline;
  const surpriseIdx=total>0?((beats-misses)/total*100):0;
  document.getElementById('ecoReleased').textContent=released;
  document.getElementById('ecoPending').textContent=pending;
  document.getElementById('ecoBeats').textContent=beats;
  document.getElementById('ecoMisses').textContent=misses;
  document.getElementById('ecoInline').textContent=inline;
  const siEl=document.getElementById('ecoSurprise');
  siEl.textContent=total>0?`${surpriseIdx>=0?'+':''}${surpriseIdx.toFixed(0)}%`:'--';
  siEl.className='summary-value '+(surpriseIdx>0?'pos':surpriseIdx<0?'neg':'neutral');

  let lastDate='';
  filtered.forEach(e=>{
    if(e.date!==lastDate){
      lastDate=e.date;
      const d=new Date(e.date+'T12:00:00');
      const dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      const dateLabel=`${dayName} ${d.getDate()}-${MON[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
      const hdr=document.createElement('tr');
      hdr.className='eco-date-header';
      hdr.innerHTML=`<td colspan="10">${dateLabel}</td>`;
      tbody.appendChild(hdr);
    }

    const tr=document.createElement('tr');
    tr.className='data-row';

    let impactCls='impact-low';
    let impactLabel=e.impact||'';
    if(e.impact==='High')impactCls='impact-high';
    else if(e.impact==='Medium')impactCls='impact-medium';
    else if(e.impact==='Holiday'){impactCls='impact-holiday';impactLabel='Holiday';}

    // surprise (direction-aware: higherPositive=-1 for CPI means higher=bad)
    const s=ecoSurprise(e.actual,e.forecast,e.higherPositive);
    const actualCls=s?s.cls:'';
    const surpriseHtml=s?`<span class="${s.cls}">${s.label}</span>`:'<span class="neutral">--</span>';

    // delta: actual vs previous (shows trend)
    let deltaHtml='<span class="neutral">--</span>';
    if(e.actual&&e.previous){
      const av=parseFloat(e.actual.replace(/[%KMB,]/g,''));
      const pv=parseFloat(e.previous.replace(/[%KMB,]/g,''));
      if(!isNaN(av)&&!isNaN(pv)){
        const d=av-pv;
        if(d!==0){
          const hp=e.higherPositive||0;
          const good=hp===0?null:(hp>0?d>0:d<0);
          const cls=good===null?'neutral':good?'pos':'neg';
          deltaHtml=`<span class="${cls}">${d>0?'+':''}${d.toFixed(1)}</span>`;
        } else {
          deltaHtml='<span class="neutral">0</span>';
        }
      }
    }

    tr.innerHTML=`
      <td style="text-align:left;color:var(--muted)">${e.date?fmt_dd_mmm(new Date(e.date+'T12:00:00')):''}</td>
      <td style="color:var(--text)">${e.time||'--'}</td>
      <td style="text-align:left;color:var(--text)">${e.event||''}</td>
      <td style="color:var(--muted)">${e.reference||''}</td>
      <td><span class="${impactCls}">${impactLabel}</span></td>
      <td style="color:var(--muted)">${e.forecast||'--'}</td>
      <td class="${actualCls}">${e.actual||'--'}</td>
      <td style="color:var(--muted)">${e.previous||'--'}</td>
      <td>${deltaHtml}</td>
      <td>${surpriseHtml}</td>`;
    tbody.appendChild(tr);
  });

  if(!filtered.length){
    tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--muted)">No events match filters</td></tr>';
  }
}
