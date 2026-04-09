/* ========== WEIF ========== */
async function loadWEIF(){
  document.getElementById('weifStatus').textContent='Loading...';
  const tbody=document.getElementById('weifTableBody');
  tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--muted)"><span class="spinner"></span> Loading futures...</td></tr>';
  try{
    const res=await fetch(`${API}/weif`);
    const data=await res.json();
    if(data.error){tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">${data.error}</td></tr>`;return;}
    renderWEIF(data.futures);
    document.getElementById('weifStatus').textContent=`${data.futures.length} contracts loaded`;
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="14" style="padding:20px;color:var(--red)">Error fetching data</td></tr>`;
  }
}

let weifPrevPrices={};
function renderWEIF(futures){
  const tbody=document.getElementById('weifTableBody');
  const isRefresh=tbody.children.length>0;
  tbody.innerHTML='';
  let lastRegion='';
  futures.forEach(f=>{
    if(f.region!==lastRegion){
      lastRegion=f.region;
      const count=futures.filter(x=>x.region===f.region).length;
      const hdr=document.createElement('tr');
      hdr.className='group-header';
      hdr.innerHTML=`<td colspan="14">&#9654; ${f.region.toUpperCase()} (${count})</td>`;
      tbody.appendChild(hdr);
    }
    const tr=document.createElement('tr');
    tr.className='data-row';
    if(isRefresh){
      const prev=weifPrevPrices[f.ticker];
      if(prev!=null&&prev!==f.c){
        tr.classList.add(f.c>prev?'fg':'fr');
        setTimeout(()=>tr.classList.remove('fg','fr'),600);
      } else if(isRefresh){
        tr.classList.add('fu');
        setTimeout(()=>tr.classList.remove('fu'),800);
      }
    }
    weifPrevPrices[f.ticker]=f.c;
    const pc=f.d>0?'pos':f.d<0?'neg':'';
    const rsi14=f.rsi14;
    let sig='<span class="neutral">NEUTRAL</span>';
    if(rsi14!=null){
      if(rsi14>70)sig='<span class="neg">OVERBOUGHT</span>';
      else if(rsi14<30)sig='<span class="pos">OVERSOLD</span>';
      else if(rsi14>55)sig='<span class="pos">BULLISH</span>';
      else if(rsi14<45)sig='<span class="neg">BEARISH</span>';
    }
    tr.innerHTML=`
      <td style="text-align:left;color:var(--blue);font-weight:500;cursor:pointer" onclick="openGlobalChart('${f.ticker}','${f.name}')">${f.ticker.replace('=F','')}</td>
      <td style="text-align:left;color:var(--muted)">${f.name}</td>
      <td class="price-cell ${pc}">${fp(f.c)}</td>
      <td>${fNet(f.d)}</td>
      <td>${fPct(f.dp)}</td>
      <td>${fPct(f.p5d)}</td>
      <td>${fPct(f.p1m)}</td>
      <td>${fPct(f.p3m)}</td>
      <td>${fPct(f.ytd)}</td>
      <td class="pos">${f.ytd_high!=null?fp(f.ytd_high):'--'}</td>
      <td class="neg">${f.ytd_low!=null?fp(f.ytd_low):'--'}</td>
      <td>${fRSI(f.rsi9)}</td>
      <td>${fRSI(f.rsi14)}</td>
      <td>${sig}</td>`;
    tbody.appendChild(tr);
  });
}
