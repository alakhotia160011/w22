/* ========== WIRP ========== */
let currentWirpCB='fed';

function switchWIRP(cb){
  currentWirpCB=cb;
  document.querySelectorAll('.wirp-cb-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(cb==='fed'?'wirpBtnFed':'wirpBtnBoj').classList.add('active');
  loadWIRP(cb);
}

async function loadWIRP(cb){
  cb=cb||currentWirpCB;
  document.getElementById('wirpCurrentRate').textContent='Loading...';
  try{
    const res=await fetch(`${API}/wirp?cb=${cb}`);
    const data=await res.json();
    if(data.error){document.getElementById('wirpCurrentRate').textContent='Error: '+data.error;return;}
    document.getElementById('wirpTagline').textContent=data.name;
    const stepLabel=data.step_bp+'bp';
    document.getElementById('wirpCutsHeader').textContent=cb==='boj'?`HIKES (${stepLabel})`:`CUTS (${stepLabel})`;
    document.getElementById('wirpDateHeader').textContent=cb==='fed'?'FOMC DATE':'BoJ MPM DATE';
    renderWIRP(data);
  }catch(e){
    document.getElementById('wirpCurrentRate').textContent='Error fetching data';
  }
}

function renderWIRP(data){
  const cr=data.current_rate;
  const cb=data.cb||'fed';
  const stepBp=data.step_bp||25;
  document.getElementById('wirpCurrentRate').textContent=`${data.currency||''} CURRENT RATE: ${cr.toFixed(3)}%`;

  const meetings=data.meetings;
  function wirpDate(iso){const d=new Date(iso+'T12:00:00');return d.getDate()+'-'+MON[d.getMonth()]+'-'+String(d.getFullYear()).slice(2);}
  const labels=meetings.map(m=>wirpDate(m.date));
  const impliedRates=meetings.map(m=>m.implied_rate);
  const cuts=meetings.map(m=>m.cuts);

  // flip sign: negative = cuts, positive = hikes
  const barsData=cuts.map(c=>-c);
  const barColors=barsData.map(v=>v<0?'rgba(0,200,83,0.7)':v>0?'rgba(255,61,61,0.7)':'rgba(85,85,85,0.5)');

  // line dataset mirrors bar values so dots sit on bar edges, labels show the rate
  const lineDots=barsData.map(v=>v);
  const rateLabelPlugin={
    id:'rateLabels',
    afterDatasetsDraw(chart){
      const meta=chart.getDatasetMeta(1);
      const ctx2=chart.ctx;
      ctx2.save();
      ctx2.font='500 10px IBM Plex Mono';
      ctx2.fillStyle='#ffe066';
      ctx2.textAlign='center';
      meta.data.forEach((pt,i)=>{
        const barVal=barsData[i];
        const rate=impliedRates[i];
        // label above dot if bar positive (hike), below if negative (cut)
        const offset=barVal>0?-10:12;
        ctx2.fillText(rate.toFixed(2)+'%',pt.x,pt.y+offset);
      });
      ctx2.restore();
    }
  };

  if(wirpChart)wirpChart.destroy();
  const ctx=document.getElementById('wirpChart').getContext('2d');
  wirpChart=new Chart(ctx,{
    type:'bar',
    plugins:[rateLabelPlugin],
    data:{
      labels,
      datasets:[
        {
          label:`Cumulative Moves (${stepBp}bp)`,
          data:barsData,
          backgroundColor:barColors,
          borderColor:barColors.map(c=>c.replace('0.7','1').replace('0.5','0.8')),
          borderWidth:1,
          yAxisID:'y',
          order:2,
        },
        {
          label:'Implied Fed Funds Rate',
          data:lineDots,
          type:'line',
          borderColor:'#ffe066',
          backgroundColor:'transparent',
          borderWidth:2,
          pointBackgroundColor:'#ffe066',
          pointRadius:4,
          pointHoverRadius:6,
          tension:0.2,
          yAxisID:'y',
          order:1,
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{
          display:true,
          position:'top',
          labels:{color:'#888',font:{family:'IBM Plex Mono',size:10},boxWidth:12,padding:16}
        },
        tooltip:{
          backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
          titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
          callbacks:{
            afterBody:function(ctx){
              const i=ctx[0].dataIndex;
              const m=meetings[i];
              return `Implied Rate: ${m.implied_rate.toFixed(3)}%\nTicker: ${m.ticker}\nFOMC: ${wirpDate(m.date)}\nChange: ${((cr-m.implied_rate)*100).toFixed(1)} bp`;
            }
          }
        }
      },
      scales:{
        x:{
          grid:{color:'#1a1a1a'},
          ticks:{color:'#888',font:{family:'IBM Plex Mono',size:10},minRotation:45,maxRotation:45},
          border:{color:'#222'}
        },
        y:{
          position:'left',
          title:{display:true,text:`CUTS / HIKES (${stepBp}bp)`,color:'#555',font:{family:'IBM Plex Mono',size:9}},
          grid:{color:'#1a1a1a'},
          ticks:{color:'#00c853',font:{family:'IBM Plex Mono',size:10},callback:v=>v.toFixed(1)},
          border:{color:'#222'}
        }
      }
    }
  });

  // render table
  const tbody=document.getElementById('wirpTableBody');
  tbody.innerHTML='';
  meetings.forEach(m=>{
    const changeBp=((cr-m.implied_rate)*100).toFixed(1);
    const cutsCls=m.cuts>0?'pos':m.cuts<0?'neg':'neutral';
    const bpCls=changeBp>0?'pos':changeBp<0?'neg':'neutral';
    const tr=document.createElement('tr');
    tr.className='data-row';
    tr.innerHTML=`
      <td>${wirpDate(m.date)}</td>
      <td style="color:var(--blue)">${m.ticker}</td>
      <td>${m.implied_rate.toFixed(3)}%</td>
      <td class="${cutsCls}">${m.cuts>0?'+':''}${m.cuts.toFixed(2)}</td>
      <td class="${bpCls}">${changeBp>0?'+':''}${changeBp} bp</td>`;
    tbody.appendChild(tr);
  });
}
