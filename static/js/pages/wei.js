/* ========== WEI ========== */
async function loadWEI(){
  document.getElementById('weiStatus').textContent='Loading...';
  const tbody=document.getElementById('weiTableBody');
  tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--muted)"><span class="spinner"></span> Loading indices...</td></tr>';
  try{
    const res=await fetch(`${API}/wei`);
    const data=await res.json();
    if(data.error){tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">${data.error}</td></tr>`;return;}
    renderWEI(data.indices);
    document.getElementById('weiStatus').textContent=`${data.indices.length} indices loaded`;
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">Error fetching data</td></tr>`;
  }
}

let weiPrevPrices={};
function renderWEI(indices){
  const tbody=document.getElementById('weiTableBody');
  const isRefresh=tbody.children.length>0;
  tbody.innerHTML='';
  let lastRegion='';
  indices.forEach(idx=>{
    if(idx.region!==lastRegion){
      lastRegion=idx.region;
      const hdr=document.createElement('tr');
      hdr.className='group-header';
      const count=indices.filter(i=>i.region===idx.region).length;
      hdr.innerHTML=`<td colspan="14">&#9654; ${idx.region.toUpperCase()} (${count})</td>`;
      tbody.appendChild(hdr);
    }
    const tr=document.createElement('tr');
    tr.className='data-row';
    tr.id=`wei-${idx.ticker}`;
    // flash on refresh
    if(isRefresh){
      const prev=weiPrevPrices[idx.ticker];
      if(prev!=null&&prev!==idx.c){
        tr.classList.add(idx.c>prev?'fg':'fr');
        setTimeout(()=>tr.classList.remove('fg','fr'),600);
      } else if(isRefresh){
        tr.classList.add('fu');
        setTimeout(()=>tr.classList.remove('fu'),800);
      }
    }
    weiPrevPrices[idx.ticker]=idx.c;
    const pc=idx.d>0?'pos':idx.d<0?'neg':'';
    const rsi14=idx.rsi14;
    let sig='<span class="neutral">NEUTRAL</span>';
    if(rsi14!=null){
      if(rsi14>70)sig='<span class="neg">OVERBOUGHT</span>';
      else if(rsi14<30)sig='<span class="pos">OVERSOLD</span>';
      else if(rsi14>55)sig='<span class="pos">BULLISH</span>';
      else if(rsi14<45)sig='<span class="neg">BEARISH</span>';
    }
    tr.innerHTML=`
      <td style="text-align:left;color:var(--blue);font-weight:500;cursor:pointer" onclick="openGlobalChart('${idx.ticker}','${idx.name}')">${idx.ticker.replace('^','')}</td>
      <td style="text-align:left;color:var(--muted)">${idx.name}</td>
      <td class="price-cell ${pc}">${fp(idx.c)}</td>
      <td>${fNet(idx.d)}</td>
      <td>${fPct(idx.dp)}</td>
      <td>${fPct(idx.p5d)}</td>
      <td>${fPct(idx.p1m)}</td>
      <td>${fPct(idx.p3m)}</td>
      <td>${fPct(idx.ytd)}</td>
      <td class="pos">${idx.ytd_high!=null?fp(idx.ytd_high):'--'}</td>
      <td class="neg">${idx.ytd_low!=null?fp(idx.ytd_low):'--'}</td>
      <td>${fRSI(idx.rsi9)}</td>
      <td>${fRSI(idx.rsi14)}</td>
      <td>${sig}</td>`;
    tbody.appendChild(tr);
  });
}
