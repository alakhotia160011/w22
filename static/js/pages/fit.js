/* ========== FIT ========== */
let fitCurveChart=null;

async function loadFIT(){
  document.getElementById('fitStatus').textContent='Loading...';
  try{
    const res=await fetch(`${API}/fit`);
    const data=await res.json();
    if(data.error){document.getElementById('fitStatus').textContent='Error';return;}
    renderFIT(data);
    document.getElementById('fitStatus').textContent='';
  }catch(e){
    document.getElementById('fitStatus').textContent='Error';
  }
}

function renderFIT(data){
  // yield curve chart
  const curve=data.curve||[];
  if(curve.length&&fitCurveChart){fitCurveChart.destroy();}
  if(curve.length){
    const ctx=document.getElementById('fitCurveChart').getContext('2d');
    const labels=curve.map(c=>c.tenor);
    const values=curve.map(c=>c.yield);
    const isInverted=values[0]>values[values.length-1];
    const color=isInverted?'#ff3d3d':'#00c853';
    fitCurveChart=new Chart(ctx,{
      type:'line',
      data:{labels,datasets:[{
        label:'US Treasury Yield Curve',
        data:values,borderColor:color,borderWidth:2,pointBackgroundColor:color,pointRadius:5,pointHoverRadius:7,
        fill:true,tension:.3,
        backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isInverted?'rgba(255,61,61,.15)':'rgba(0,200,83,.15)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},
      }]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
            titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
            callbacks:{label:c=>`  ${c.parsed.y.toFixed(3)}%`}},
        },
        scales:{
          x:{grid:{color:'#1a1a1a'},ticks:{color:'#888',font:{family:'IBM Plex Mono',size:11,weight:'600'}},border:{color:'#222'}},
          y:{position:'right',grid:{color:'#1a1a1a'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:10},callback:v=>v.toFixed(1)+'%'},border:{color:'#222'}},
        }
      }
    });
  }

  // table
  const tbody=document.getElementById('fitTableBody');
  tbody.innerHTML='';
  const groups=[
    {name:'YIELDS',items:data.yields},
    {name:'TREASURY FUTURES',items:data.futures},
    {name:'TREASURY ETFs',items:data.etfs},
  ];
  groups.forEach(g=>{
    if(!g.items||!g.items.length)return;
    const hdr=document.createElement('tr');
    hdr.className='group-header';
    hdr.innerHTML=`<td colspan="8">&#9654; ${g.name} (${g.items.length})</td>`;
    tbody.appendChild(hdr);
    g.items.forEach(item=>{
      const tr=document.createElement('tr');
      tr.className='data-row';
      const pc=item.d>0?'pos':item.d<0?'neg':'';
      const isYield=item.group==='yields';
      // for yields: changes in bps, for futures/etfs: changes in price
      const fmtChg=v=>{
        if(v==null)return '<span class="neutral">--</span>';
        if(isYield){
          const bps=v*100;
          const cls=bps>0?'neg':bps<0?'pos':'neutral';
          return `<span class="${cls}">${bps>0?'+':''}${bps.toFixed(1)} bp</span>`;
        }
        const cls=v>0?'pos':v<0?'neg':'neutral';
        return `<span class="${cls}">${v>0?'+':''}${v.toFixed(2)}</span>`;
      };
      tr.innerHTML=`
        <td style="text-align:left;color:var(--accent);font-weight:600">${item.tenor}</td>
        <td style="text-align:left;color:var(--muted)">${item.name}</td>
        <td class="price-cell ${pc}">${isYield?item.c.toFixed(3)+'%':item.c.toFixed(3)}</td>
        <td>${fmtChg(item.d)}</td>
        <td>${fPct(item.dp)}</td>
        <td>${fmtChg(item.p5d)}</td>
        <td>${fmtChg(item.p1m)}</td>
        <td>${fmtChg(item.p3m)}</td>`;
      tr.style.cursor='pointer';
      tr.onclick=()=>openGlobalChart(item.ticker,item.name);
      tbody.appendChild(tr);
    });
  });
}
