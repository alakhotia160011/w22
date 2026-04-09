/* ========== FX ========== */
let fxPrevPrices={};

async function loadFX(){
  document.getElementById('fxStatus').textContent='Loading...';
  const tbody=document.getElementById('fxTableBody');
  if(!tbody.children.length)tbody.innerHTML='<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--muted)"><span class="spinner"></span></td></tr>';
  try{
    const res=await fetch(`${API}/fx`);
    const data=await res.json();
    if(data.error){tbody.innerHTML=`<tr><td colspan="11" style="padding:20px;color:var(--red)">${data.error}</td></tr>`;return;}
    renderFX(data.pairs);
    document.getElementById('fxStatus').textContent=`${data.pairs.length} pairs loaded`;
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="11" style="padding:20px;color:var(--red)">Error</td></tr>`;
  }
}

function renderFX(pairs){
  const tbody=document.getElementById('fxTableBody');
  const isRefresh=tbody.children.length>0;
  tbody.innerHTML='';
  let lastGroup='';
  pairs.forEach(p=>{
    if(p.group!==lastGroup){
      lastGroup=p.group;
      const count=pairs.filter(x=>x.group===p.group).length;
      const hdr=document.createElement('tr');
      hdr.className='group-header';
      hdr.innerHTML=`<td colspan="11">&#9654; ${p.group.toUpperCase()} (${count})</td>`;
      tbody.appendChild(hdr);
    }
    const tr=document.createElement('tr');
    tr.className='data-row';
    if(isRefresh){
      const prev=fxPrevPrices[p.ticker];
      if(prev!=null&&prev!==p.c){tr.classList.add(p.c>prev?'fg':'fr');setTimeout(()=>tr.classList.remove('fg','fr'),600);}
      else if(isRefresh){tr.classList.add('fu');setTimeout(()=>tr.classList.remove('fu'),800);}
    }
    fxPrevPrices[p.ticker]=p.c;
    const pc=p.d>0?'pos':p.d<0?'neg':'';
    const rsi14=p.rsi14;
    let sig='<span class="neutral">NEUTRAL</span>';
    if(rsi14!=null){
      if(rsi14>70)sig='<span class="neg">OVERBOUGHT</span>';
      else if(rsi14<30)sig='<span class="pos">OVERSOLD</span>';
      else if(rsi14>55)sig='<span class="pos">BULLISH</span>';
      else if(rsi14<45)sig='<span class="neg">BEARISH</span>';
    }
    // display ticker: strip =X suffix
    const dispTicker=p.ticker.replace('=X','');
    tr.innerHTML=`
      <td style="text-align:left;color:var(--blue);font-weight:500;cursor:pointer" onclick="openGlobalChart('${p.ticker}','${p.name}')">${dispTicker}</td>
      <td style="text-align:left;color:var(--muted)">${p.name}</td>
      <td class="price-cell ${pc}">${p.c}</td>
      <td>${fNet(p.d)}</td>
      <td>${fPct(p.dp)}</td>
      <td>${fPct(p.p5d)}</td>
      <td>${fPct(p.p1m)}</td>
      <td>${fPct(p.p3m)}</td>
      <td>${fRSI(p.rsi9)}</td>
      <td>${fRSI(p.rsi14)}</td>
      <td>${sig}</td>`;
    tbody.appendChild(tr);
  });
}
