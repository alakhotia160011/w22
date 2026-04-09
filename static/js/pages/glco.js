/* ========== GLCO ========== */
let glcoPrevPrices={};

async function loadGLCO(){
  document.getElementById('glcoStatus').textContent='Loading...';
  const tbody=document.getElementById('glcoTableBody');
  if(!tbody.children.length)tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--muted)"><span class="spinner"></span></td></tr>';
  try{
    const res=await fetch(`${API}/glco`);
    const data=await res.json();
    if(data.error){tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">${data.error}</td></tr>`;return;}
    renderGLCO(data.commodities);
    document.getElementById('glcoStatus').textContent=`${data.commodities.length} contracts loaded`;
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">Error</td></tr>`;
  }
}

function renderGLCO(items){
  const tbody=document.getElementById('glcoTableBody');
  const isRefresh=tbody.children.length>0;
  tbody.innerHTML='';
  let lastGroup='';
  items.forEach(c=>{
    if(c.group!==lastGroup){
      lastGroup=c.group;
      const count=items.filter(x=>x.group===c.group).length;
      const hdr=document.createElement('tr');
      hdr.className='group-header';
      hdr.innerHTML=`<td colspan="14">&#9654; ${c.group.toUpperCase()} (${count})</td>`;
      tbody.appendChild(hdr);
    }
    const tr=document.createElement('tr');
    tr.className='data-row';
    if(isRefresh){
      const prev=glcoPrevPrices[c.ticker];
      if(prev!=null&&prev!==c.c){tr.classList.add(c.c>prev?'fg':'fr');setTimeout(()=>tr.classList.remove('fg','fr'),600);}
      else{tr.classList.add('fu');setTimeout(()=>tr.classList.remove('fu'),800);}
    }
    glcoPrevPrices[c.ticker]=c.c;
    const pc=c.d>0?'pos':c.d<0?'neg':'';
    const rsi14=c.rsi14;
    let sig='<span class="neutral">NEUTRAL</span>';
    if(rsi14!=null){
      if(rsi14>70)sig='<span class="neg">OVERBOUGHT</span>';
      else if(rsi14<30)sig='<span class="pos">OVERSOLD</span>';
      else if(rsi14>55)sig='<span class="pos">BULLISH</span>';
      else if(rsi14<45)sig='<span class="neg">BEARISH</span>';
    }
    tr.innerHTML=`
      <td style="text-align:left;color:var(--blue);font-weight:500;cursor:pointer" onclick="openGlobalChart('${c.ticker}','${c.name}')">${c.ticker.replace('=F','')}</td>
      <td style="text-align:left;color:var(--muted)">${c.name}</td>
      <td class="price-cell ${pc}">${fp(c.c)}</td>
      <td>${fNet(c.d)}</td>
      <td>${fPct(c.dp)}</td>
      <td>${fPct(c.p5d)}</td>
      <td>${fPct(c.p1m)}</td>
      <td>${fPct(c.p3m)}</td>
      <td>${fPct(c.ytd)}</td>
      <td class="pos">${c.ytd_high!=null?fp(c.ytd_high):'--'}</td>
      <td class="neg">${c.ytd_low!=null?fp(c.ytd_low):'--'}</td>
      <td>${fRSI(c.rsi9)}</td>
      <td>${fRSI(c.rsi14)}</td>
      <td>${sig}</td>`;
    tbody.appendChild(tr);
  });
}
