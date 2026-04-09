/* ========== DEFAULT WATCHLIST (no buy prices) ========== */
const DEFAULT_WATCHLIST = [
  {type:'group',name:"Mag 7"},
  {type:'ticker',ticker:"AAPL",name:"Apple",buy:null},
  {type:'ticker',ticker:"MSFT",name:"Microsoft",buy:null},
  {type:'ticker',ticker:"AMZN",name:"Amazon",buy:null},
  {type:'ticker',ticker:"GOOG",name:"Alphabet",buy:null},
  {type:'ticker',ticker:"META",name:"Meta",buy:null},
  {type:'ticker',ticker:"NVDA",name:"Nvidia",buy:null},
  {type:'ticker',ticker:"TSLA",name:"Tesla",buy:null},
  {type:'group',name:"AI & Infra"},
  {type:'ticker',ticker:"IREN",name:"IREN",buy:null},
  {type:'ticker',ticker:"BE",name:"Bloom Energy",buy:null},
  {type:'ticker',ticker:"ETN",name:"Eaton",buy:null},
  {type:'ticker',ticker:"CORZ",name:"Core Scientific",buy:null},
  {type:'ticker',ticker:"VRT",name:"Vertiv",buy:null},
  {type:'ticker',ticker:"AAOI",name:"Applied Optoelectronics",buy:null},
  {type:'ticker',ticker:"LITE",name:"Lumentum",buy:null},
  {type:'group',name:"Tech & Growth"},
  {type:'ticker',ticker:"AXON",name:"Axon",buy:null},
  {type:'ticker',ticker:"OKLO",name:"OKLO",buy:null},
  {type:'ticker',ticker:"ENPH",name:"Enphase Energy",buy:null},
  {type:'ticker',ticker:"CEG",name:"Constellation",buy:null},
  {type:'ticker',ticker:"TSLA",name:"Tesla",buy:null},
  {type:'ticker',ticker:"NVDA",name:"Nvidia",buy:null},
  {type:'ticker',ticker:"CRM",name:"Salesforce",buy:null},
  {type:'ticker',ticker:"RKLB",name:"Rocket Labs",buy:null},
  {type:'ticker',ticker:"LULU",name:"Lululemon",buy:null},
  {type:'group',name:"ETFs -- Thematic"},
  {type:'ticker',ticker:"KWEB",name:"China Tech",buy:null},
  {type:'ticker',ticker:"INDL",name:"India 2x",buy:null},
  {type:'ticker',ticker:"INDA",name:"India ETF",buy:null},
  {type:'ticker',ticker:"NNE",name:"Nano Nuclear",buy:null},
  {type:'ticker',ticker:"NLR",name:"Nuclear",buy:null},
  {type:'ticker',ticker:"IBIT",name:"Bitcoin ETF",buy:null},
  {type:'ticker',ticker:"BIZD",name:"BDCs",buy:null},
  {type:'ticker',ticker:"COPX",name:"Copper Miners",buy:null},
  {type:'ticker',ticker:"AFK",name:"Africa",buy:null},
  {type:'group',name:"ETFs -- Broad Market"},
  {type:'ticker',ticker:"SPY",name:"S&P 500",buy:null},
  {type:'ticker',ticker:"QQQ",name:"QQQ",buy:null},
  {type:'ticker',ticker:"TQQQ",name:"TQQQ",buy:null},
  {type:'ticker',ticker:"IWF",name:"Russell 1000 Growth",buy:null},
  {type:'ticker',ticker:"SCHG",name:"US Large Caps",buy:null},
  {type:'ticker',ticker:"XLG",name:"S&P Top 50",buy:null},
  {type:'ticker',ticker:"RSP",name:"Equal Weight S&P",buy:null},
  {type:'ticker',ticker:"VO",name:"Mid-Caps",buy:null},
  {type:'group',name:"ETFs -- Sector"},
  {type:'ticker',ticker:"XLY",name:"Consumer Disc.",buy:null},
  {type:'ticker',ticker:"XLV",name:"Healthcare",buy:null},
  {type:'ticker',ticker:"ITA",name:"US Defense",buy:null},
  {type:'ticker',ticker:"XLI",name:"Industrials",buy:null},
  {type:'ticker',ticker:"IEMG",name:"EM Stocks",buy:null},
  {type:'ticker',ticker:"EWY",name:"South Korea",buy:null},
  {type:'ticker',ticker:"EWG",name:"Germany",buy:null},
  {type:'ticker',ticker:"FXI",name:"China",buy:null},
  {type:'ticker',ticker:"EMB",name:"EM Bonds",buy:null},
  {type:'group',name:"Commodities & Alts"},
  {type:'ticker',ticker:"GLD",name:"Gold",buy:null},
  {type:'ticker',ticker:"SLV",name:"Silver",buy:null},
  {type:'ticker',ticker:"PPLT",name:"Platinum",buy:null},
  {type:'ticker',ticker:"PALL",name:"Palladium",buy:null},
  {type:'ticker',ticker:"UNG",name:"Nat Gas",buy:null},
  {type:'ticker',ticker:"CORN",name:"US Corn",buy:null},
  {type:'group',name:"Fixed Income"},
  {type:'ticker',ticker:"TLT",name:"TLT",buy:null},
  {type:'ticker',ticker:"IEF",name:"IEF",buy:null},
  {type:'ticker',ticker:"HYG",name:"HYG",buy:null},
  {type:'group',name:"Real Estate"},
  {type:'ticker',ticker:"SLG",name:"NYC Real Estate",buy:null},
];

/* ========== SECTOR MAP ========== */
const SECTOR_MAP = {
  // Mag 7
  AAPL:'Mag 7', MSFT:'Mag 7', AMZN:'Mag 7', GOOG:'Mag 7', META:'Mag 7',
  // Tech / Semis
  NVDA:'Mag 7', CRM:'Technology', AAOI:'Technology', LITE:'Technology',
  TSLA:'Mag 7', LULU:'Consumer Cyclical', AXON:'Industrials',
  RKLB:'Industrials', VRT:'Industrials', ETN:'Industrials', XLI:'Industrials',
  IREN:'Technology', CORZ:'Technology',
  BE:'Utilities', ENPH:'Utilities', CEG:'Utilities', OKLO:'Utilities', NNE:'Utilities', NLR:'Utilities',
  // ETFs
  SPY:'Broad Market ETF', QQQ:'Broad Market ETF', TQQQ:'Broad Market ETF',
  IWF:'Broad Market ETF', SCHG:'Broad Market ETF', XLG:'Broad Market ETF', RSP:'Broad Market ETF', VO:'Broad Market ETF',
  KWEB:'International ETF', INDL:'International ETF', INDA:'International ETF', AFK:'International ETF',
  IEMG:'International ETF', EWY:'International ETF', EWG:'International ETF', FXI:'International ETF', EMB:'International ETF',
  IBIT:'Crypto', BIZD:'Financials',
  COPX:'Commodities', GLD:'Commodities', SLV:'Commodities', PPLT:'Commodities', PALL:'Commodities', UNG:'Commodities', CORN:'Commodities',
  XLY:'Sector ETF', XLV:'Sector ETF', ITA:'Sector ETF',
  TLT:'Fixed Income', IEF:'Fixed Income', HYG:'Fixed Income',
  SLG:'Real Estate',
};

/* ========== STATE ========== */
let watchlist = loadWatchlist();
let priceData={}, rsiData={}, rsi9Data={}, selectedTicker=null, currentChart=null, currentPeriod='3m';
let countdown=15;
let sectorView=false;

function loadWatchlist(){
  try{
    const saved=localStorage.getItem('w22_watchlist');
    if(saved){return JSON.parse(saved);}
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_WATCHLIST));
}
function saveWatchlist(){
  localStorage.setItem('w22_watchlist',JSON.stringify(watchlist));
}
function resetWatchlist(){
  if(!confirm('Reset watchlist to defaults? All edits will be lost.'))return;
  localStorage.removeItem('w22_watchlist');
  watchlist=JSON.parse(JSON.stringify(DEFAULT_WATCHLIST));
  priceData={};rsiData={};rsi9Data={};
  buildTable();loadAll();
}
function getTickers(){return watchlist.filter(w=>w.type==='ticker').map(w=>w.ticker);}

/* ========== MARKET CLOCK ========== */
function updateClock(){
  const now=new Date();
  const et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
  const h=et.getHours(),m=et.getMinutes();
  const isOpen=et.getDay()>=1&&et.getDay()<=5&&((h===9&&m>=30)||h>=10)&&h<16;
  const timeStr=et.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('marketClock').textContent=`ET ${timeStr} ${isOpen?'MARKET OPEN':'MARKET CLOSED'}`;
  document.getElementById('marketClock').style.color=isOpen?'var(--green)':'var(--muted)';
}
setInterval(updateClock,1000);
updateClock();

/* ========== BUILD TABLE ========== */
function buildTable(){
  const tbody=document.getElementById('tableBody');
  tbody.innerHTML='';
  let groupIdx=-1;
  watchlist.forEach((item,idx)=>{
    if(item.type==='group'){
      groupIdx=idx;
      const tr=document.createElement('tr');
      tr.className='group-header';
      tr.dataset.idx=idx;
      tr.innerHTML=`<td colspan="17"><span class="grp-name" data-idx="${idx}">&#9654; ${item.name}</span><span class="grp-actions"><button onclick="renameGroup(${idx})" title="Rename">&#9998;</button><button onclick="deleteGroup(${idx})" title="Delete group">&times;</button></span></td>`;
      tbody.appendChild(tr);
    } else {
      const tr=document.createElement('tr');
      tr.className='data-row';
      tr.id=`row-${item.ticker}`;
      tr.dataset.idx=idx;
      buildRowCells(tr,item,idx);
      tbody.appendChild(tr);
    }
    // after last ticker in a group (or at end), insert add-row
    const next=watchlist[idx+1];
    if(item.type==='ticker'&&(!next||next.type==='group')){
      const addTr=document.createElement('tr');
      addTr.className='add-row';
      addTr.innerHTML=`<td></td><td colspan="17" style="position:relative;"><input class="add-ticker-input" placeholder="+ TICKER" data-insert-after="${idx}" onfocus="onAddFocus(this)" oninput="onAddInput(this)" onkeydown="onAddKeydown(event,this)" onblur="setTimeout(()=>hideTickerSuggest(),150)"/></td>`;
      tbody.appendChild(addTr);
    }
  });
  // if watchlist is empty or ends with a group, add an add-row
  if(watchlist.length===0||watchlist[watchlist.length-1].type==='group'){
    const addTr=document.createElement('tr');
    addTr.className='add-row';
    const insertIdx=watchlist.length-1;
    addTr.innerHTML=`<td></td><td colspan="17" style="position:relative;"><input class="add-ticker-input" placeholder="+ TICKER" data-insert-after="${insertIdx}" onfocus="onAddFocus(this)" oninput="onAddInput(this)" onkeydown="onAddKeydown(event,this)" onblur="setTimeout(()=>hideTickerSuggest(),150)"/></td>`;
    tbody.appendChild(addTr);
  }
}

function buildRowCells(tr,item,idx){
  const q=priceData[item.ticker];
  const rsi9=rsi9Data[item.ticker];
  const rsi=rsiData[item.ticker];
  const buyDisplay=item.buy!=null?Number(item.buy).toFixed(2):'';
  const hasData=q&&q.c;
  tr.innerHTML='';
  // col 0: delete button
  const tdDel=document.createElement('td');
  tdDel.className='row-ctrl';
  tdDel.innerHTML=`<button class="del-btn" onclick="event.stopPropagation();deleteRow(${idx})" title="Remove">&times;</button>`;
  tr.appendChild(tdDel);
  // col 1: ticker (clickable for chart)
  const tdTicker=document.createElement('td');
  tdTicker.className='ticker-cell';
  tdTicker.textContent=item.ticker;
  tdTicker.onclick=()=>openChart(item.ticker,item.name);
  tr.appendChild(tdTicker);
  // col 2: name
  const tdName=document.createElement('td');
  tdName.className='name-cell';
  tdName.textContent=item.name;
  tr.appendChild(tdName);
  // col 3: buy $ (editable)
  const tdBuy=document.createElement('td');
  tdBuy.className='buy-cell';
  tdBuy.textContent=buyDisplay||'--';
  if(!buyDisplay)tdBuy.classList.add('neutral');
  tdBuy.onclick=(e)=>{e.stopPropagation();startEditBuy(tdBuy,idx);};
  tr.appendChild(tdBuy);
  // cols 4-13: data cells
  if(hasData){
    const pc=q.d>0?'pos':q.d<0?'neg':'';
    appendCells(tr,[
      {html:`<span class="price-cell ${pc}">${fp(q.c)}</span>`},
      {html:fNet(q.d)},
      {html:fPct(q.dp)},
      {html:fPct(q.p5d)},
      {html:fPct(q.p1m)},
      {html:fPct(q.p3m)},
      {html:`<span class="pos">${fp(q.h)}</span>`},
      {html:`<span class="neg">${fp(q.l)}</span>`},
      {html:`<span class="neutral">${fp(q.pc)}</span>`},
      {html:fVol(q.v)},
      {html:fRSI(rsi9)},
      {html:fRSI(rsi)},
      {html:fSig(rsi)},
    ]);
  } else {
    appendCells(tr,[
      {html:'<span class="spinner"></span>'},
      {html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},{html:'--'},
    ]);
  }
}

function appendCells(tr,cells){
  cells.forEach(c=>{
    const td=document.createElement('td');
    td.innerHTML=c.html;
    tr.appendChild(td);
  });
}

/* ========== SECTOR VIEW ========== */
function toggleSectorView(){
  sectorView=!sectorView;
  const btn=document.getElementById('sectorBtn');
  btn.style.background=sectorView?'var(--accent)':'';
  btn.style.color=sectorView?'#000':'';
  if(sectorView) buildSectorTable();
  else { buildTable(); getTickers().forEach(t=>{if(priceData[t])updateRow(t);}); }
}

function buildSectorTable(){
  const tbody=document.getElementById('tableBody');
  tbody.innerHTML='';
  // group tickers by sector
  const sectors={};
  watchlist.forEach((item,idx)=>{
    if(item.type!=='ticker')return;
    const sec=SECTOR_MAP[item.ticker]||'Other';
    if(!sectors[sec])sectors[sec]=[];
    sectors[sec].push({...item,_idx:idx});
  });
  // sort sector names, render
  Object.keys(sectors).sort().forEach(sec=>{
    const tr=document.createElement('tr');
    tr.className='group-header';
    tr.innerHTML=`<td colspan="17">&#9654; ${sec.toUpperCase()} (${sectors[sec].length})</td>`;
    tbody.appendChild(tr);
    sectors[sec].forEach(item=>{
      const tr=document.createElement('tr');
      tr.className='data-row';
      tr.id=`row-${item.ticker}`;
      tr.dataset.idx=item._idx;
      buildRowCells(tr,item,item._idx);
      tbody.appendChild(tr);
    });
  });
}

function updateRow(ticker){
  const row=document.getElementById(`row-${ticker}`);
  if(!row)return;
  const idx=parseInt(row.dataset.idx);
  const item=watchlist[idx];
  if(!item||item.ticker!==ticker)return;
  const q=priceData[ticker];
  if(!q||!q.c)return;
  const prev=row.getAttribute('data-price');
  const np=Number(q.c).toFixed(2);
  if(prev&&prev!==np){row.classList.add(parseFloat(np)>parseFloat(prev)?'fg':'fr');setTimeout(()=>row.classList.remove('fg','fr'),600);}
  row.setAttribute('data-price',np);
  buildRowCells(row,item,idx);
}

/* ========== EDIT BUY PRICE ========== */
function startEditBuy(td,idx){
  if(td.classList.contains('editing'))return;
  td.classList.add('editing');
  const current=watchlist[idx].buy;
  const input=document.createElement('input');
  input.type='text';
  input.className='buy-input';
  input.value=current!=null?Number(current).toFixed(2):'';
  input.placeholder='0.00';
  td.textContent='';
  td.appendChild(input);
  input.focus();
  input.select();
  input.onblur=()=>commitBuyEdit(td,input,idx);
  input.onkeydown=(e)=>{
    if(e.key==='Enter'){input.blur();}
    if(e.key==='Escape'){input.value=current!=null?Number(current).toFixed(2):'';input.blur();}
    if(e.key==='Tab'){
      e.preventDefault();
      input.blur();
      // move to next row's buy cell
      const nextRow=document.querySelector(`[data-idx="${idx+1}"]`);
      if(nextRow&&nextRow.classList.contains('data-row')){
        const nextBuy=nextRow.cells[3];
        if(nextBuy)nextBuy.click();
      }
    }
  };
}

function commitBuyEdit(td,input,idx){
  td.classList.remove('editing');
  const val=input.value.trim();
  if(val===''||isNaN(parseFloat(val))){
    watchlist[idx].buy=null;
  } else {
    watchlist[idx].buy=parseFloat(val);
  }
  saveWatchlist();
  // rebuild cell
  const buy=watchlist[idx].buy;
  td.textContent=buy!=null?Number(buy).toFixed(2):'--';
  td.className='buy-cell'+(buy==null?' neutral':'');
  td.onclick=(e)=>{e.stopPropagation();startEditBuy(td,idx);};
  // update P&L
  updateRow(watchlist[idx].ticker);
  updateSummary();
}

/* ========== ADD TICKER (with search) ========== */
let suggestData=[], suggestIdx=-1, activeSuggestInput=null;

function onAddFocus(input){activeSuggestInput=input;}

async function onAddInput(input){
  const q=input.value.trim().toUpperCase();
  if(q.length<1){hideTickerSuggest();return;}
  try{
    const res=await fetch(`${API}/search/${encodeURIComponent(q)}`);
    suggestData=await res.json();
    suggestIdx=-1;
    showTickerSuggest(input);
  }catch(e){hideTickerSuggest();}
}

function showTickerSuggest(input){
  const dd=document.getElementById('tickerSuggest');
  if(!suggestData.length){dd.style.display='none';return;}
  const rect=input.getBoundingClientRect();
  dd.style.top=(rect.bottom+2)+'px';
  dd.style.left=rect.left+'px';
  dd.style.display='block';
  dd.innerHTML=suggestData.map((s,i)=>`<div class="ticker-suggest-item${i===suggestIdx?' active':''}" onmousedown="selectSuggestion(${i})"><span class="sym">${s.symbol}</span><span class="desc">${s.name}</span></div>`).join('');
}

function hideTickerSuggest(){
  document.getElementById('tickerSuggest').style.display='none';
  suggestData=[];suggestIdx=-1;
}

function onAddKeydown(e,input){
  if(e.key==='ArrowDown'){e.preventDefault();suggestIdx=Math.min(suggestIdx+1,suggestData.length-1);showTickerSuggest(input);}
  else if(e.key==='ArrowUp'){e.preventDefault();suggestIdx=Math.max(suggestIdx-1,0);showTickerSuggest(input);}
  else if(e.key==='Enter'){
    e.preventDefault();
    if(suggestIdx>=0&&suggestData[suggestIdx]){selectSuggestion(suggestIdx);}
    else if(input.value.trim()){addTickerDirect(input,input.value.trim().toUpperCase(),input.value.trim().toUpperCase());}
  }
  else if(e.key==='Escape'){hideTickerSuggest();input.blur();}
}

function selectSuggestion(i){
  const s=suggestData[i];
  if(!s)return;
  hideTickerSuggest();
  addTickerDirect(activeSuggestInput,s.symbol,s.name);
}

function addTickerDirect(input,symbol,name){
  const insertAfter=parseInt(input.dataset.insertAfter);
  // check duplicate
  if(watchlist.some(w=>w.ticker===symbol)){
    input.value='';input.style.borderBottomColor='var(--red)';
    setTimeout(()=>input.style.borderBottomColor='',800);
    return;
  }
  const newItem={type:'ticker',ticker:symbol,name:name,buy:null};
  watchlist.splice(insertAfter+1,0,newItem);
  saveWatchlist();
  buildTable();
  // fetch quote for new ticker
  fetchSingleQuote(symbol);
}

async function fetchSingleQuote(ticker){
  try{
    const res=await fetch(`${API}/quote/${ticker}`);
    const q=await res.json();
    priceData[ticker]=q;
    updateRow(ticker);
    updateSummary();
  }catch(e){}
  // fetch RSI
  try{
    const res=await fetch(`${API}/candles/${ticker}?p=1m`);
    const data=await res.json();
    if(data.c&&data.s!=='no_data'){rsiData[ticker]=calcRSI(data.c,14);rsi9Data[ticker]=calcRSI(data.c,9);updateRow(ticker);}
  }catch(e){}
}

/* ========== DELETE ROW ========== */
function deleteRow(idx){
  const item=watchlist[idx];
  if(!item)return;
  watchlist.splice(idx,1);
  saveWatchlist();
  if(item.ticker)delete priceData[item.ticker];
  buildTable();
  // re-render existing data
  getTickers().forEach(t=>{if(priceData[t])updateRow(t);});
  updateSummary();
}

/* ========== GROUP MANAGEMENT ========== */
function addGroup(){
  const name=prompt('Group name:');
  if(!name)return;
  watchlist.push({type:'group',name:name.toUpperCase()});
  saveWatchlist();
  buildTable();
}

function renameGroup(idx){
  const item=watchlist[idx];
  if(!item||item.type!=='group')return;
  const name=prompt('Rename group:',item.name);
  if(!name)return;
  item.name=name.toUpperCase();
  saveWatchlist();
  buildTable();
  getTickers().forEach(t=>{if(priceData[t])updateRow(t);});
}

function deleteGroup(idx){
  // delete group header and all tickers until next group
  let end=idx+1;
  while(end<watchlist.length&&watchlist[end].type!=='group')end++;
  const removed=watchlist.splice(idx,end-idx);
  removed.forEach(r=>{if(r.ticker)delete priceData[r.ticker];});
  saveWatchlist();
  buildTable();
  getTickers().forEach(t=>{if(priceData[t])updateRow(t);});
  updateSummary();
}

/* ========== SUMMARY BAR ========== */
function updateSummary(){
  const items=watchlist.filter(w=>w.type==='ticker');
  let up=0,down=0,cnt=0;
  items.forEach(item=>{
    const q=priceData[item.ticker];
    if(!q||!q.c)return;
    cnt++;
    const dp=q.dp||0;
    if(dp>0)up++;else if(dp<0)down++;
  });
  document.getElementById('sumTickers').textContent=cnt;
  document.getElementById('sumUp').textContent=up;
  document.getElementById('sumDown').textContent=down;
}

/* ========== DATA LOADING ========== */
async function loadAll(){
  const tickers=getTickers();
  if(!tickers.length){document.getElementById('statusText').textContent='No tickers. Add some!';return;}
  document.getElementById('statusText').textContent='Fetching quotes...';
  try{
    const res=await fetch(`${API}/quotes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tickers})});
    const data=await res.json();
    Object.entries(data).forEach(([ticker,q])=>{
      priceData[ticker]=q;
      updateRow(ticker);
    });
    updateSummary();
    countdown=15;
    document.getElementById('statusText').textContent=`${Object.keys(data).length} tickers loaded`;
  }catch(e){
    document.getElementById('statusText').textContent=`Error: ${e.message} -- is Flask running?`;
  }
  loadAllRSI();
}

async function loadAllRSI(){
  const tickers=getTickers();
  for(const ticker of tickers){
    if(rsiData[ticker]!=null)continue;
    try{
      const res=await fetch(`${API}/candles/${ticker}?p=1m`);
      const data=await res.json();
      if(data.c&&data.s!=='no_data'){
        rsiData[ticker]=calcRSI(data.c,14);
        rsi9Data[ticker]=calcRSI(data.c,9);
        updateRow(ticker);
      }
    }catch(e){}
  }
}

/* ========== CHART ========== */
async function openChart(ticker,name){
  selectedTicker=ticker;
  document.querySelectorAll('.data-row').forEach(r=>r.classList.remove('selected'));
  document.getElementById(`row-${ticker}`)?.classList.add('selected');
  document.getElementById('chartPanel').classList.remove('hidden');
  document.getElementById('chartTicker').textContent=ticker;
  document.getElementById('chartName').textContent=name;
  document.getElementById('chartStats').innerHTML='';
  await renderChart(ticker,currentPeriod);
}

async function renderChart(ticker,period){
  const loadingEl=document.getElementById('chartLoading');
  loadingEl.style.display='flex';
  try{
    const res=await fetch(`${API}/candles/${ticker}?p=${period}`);
    const data=await res.json();
    loadingEl.style.display='none';
    if(!data.c||data.s==='no_data'){
      document.getElementById('chartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No data for this period</div></div>';
      return;
    }
    const closes=data.c,highs=data.h,lows=data.l,volumes=data.v||[];
    const axis=buildAxisConfig(data.t,period);
    rsiData[ticker]=calcRSI(closes,14);
    rsi9Data[ticker]=calcRSI(closes,9);
    updateRow(ticker);
    const isUp=closes[closes.length-1]>=closes[0];
    const color=isUp?'#00c853':'#ff3d3d';
    if(currentChart)currentChart.destroy();
    const ctx=document.getElementById('priceChart').getContext('2d');
    // build tick visibility set
    const tickSet=new Set(axis.tickIndices);
    currentChart=new Chart(ctx,{
      type:'line',
      plugins:[daySepPlugin],
      data:{labels:axis.labels,datasets:[{data:closes,borderColor:color,borderWidth:1.5,pointRadius:0,fill:true,
        backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isUp?'rgba(0,200,83,.12)':'rgba(255,61,61,.12)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},tension:.2}]},
      options:{responsive:true,maintainAspectRatio:false,
        _dayBounds:axis.dayBounds,
        plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
          titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
          callbacks:{
            title:tipCtx=>{const d=new Date(data.t[tipCtx[0].dataIndex]*1000);return axis.tooltip(d);},
            label:c=>` $${c.parsed.y.toFixed(2)}`
          }}},
        scales:{
          x:{
            grid:{color:i=>tickSet.has(i)?'#1e1e1e':'transparent'},
            ticks:{
              color:'#555',font:{family:'IBM Plex Mono',size:9},minRotation:45,maxRotation:45,autoSkip:false,
              callback:function(val,i){return tickSet.has(i)?axis.labels[i]:null;}
            },
            border:{color:'#222'}
          },
          y:{position:'right',grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9}},border:{color:'#222'}}
        }
      }
    });
    const high=Math.max(...highs.filter(v=>v));
    const low=Math.min(...lows.filter(v=>v));
    const chg=(closes[closes.length-1]-closes[0])/closes[0]*100;
    const rsi9=rsi9Data[ticker],rsi14=rsiData[ticker];
    document.getElementById('chartStats').innerHTML=`
      <div class="stat"><div class="stat-label">CURRENT</div><div class="stat-value">${fp(closes[closes.length-1])}</div></div>
      <div class="stat"><div class="stat-label">PERIOD CHG</div><div class="stat-value ${chg>=0?'pos':'neg'}">${chg>=0?'+':''}${chg.toFixed(2)}%</div></div>
      <div class="stat"><div class="stat-label">RSI 9 / 14</div><div class="stat-value">${rsi9!=null?rsi9.toFixed(1):'--'} / ${rsi14!=null?rsi14.toFixed(1):'--'}</div></div>
      <div class="stat"><div class="stat-label">PERIOD HIGH</div><div class="stat-value pos">${fp(high)}</div></div>
      <div class="stat"><div class="stat-label">PERIOD LOW</div><div class="stat-value neg">${fp(low)}</div></div>
      <div class="stat"><div class="stat-label">AVG VOL</div><div class="stat-value neutral">${volumes.length?fVol(volumes.reduce((a,b)=>a+b,0)/volumes.length):'--'}</div></div>`;
  }catch(e){loadingEl.style.display='none';}
}

async function changePeriod(period,btn){
  currentPeriod=period;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('customRange').style.display='none';
  document.getElementById('customPeriodBtn').classList.remove('active');
  if(selectedTicker)await renderChart(selectedTicker,period);
}

function toggleCustomRange(){
  const el=document.getElementById('customRange');
  const btn=document.getElementById('customPeriodBtn');
  const show=el.style.display==='none';
  el.style.display=show?'flex':'none';
  if(show){
    document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    // default: last 6 months
    const now=new Date();
    const from=new Date(now);from.setMonth(from.getMonth()-6);
    document.getElementById('customTo').value=now.toISOString().slice(0,10);
    document.getElementById('customFrom').value=from.toISOString().slice(0,10);
  } else {
    btn.classList.remove('active');
  }
}

async function applyCustomRange(){
  const from=document.getElementById('customFrom').value;
  const to=document.getElementById('customTo').value;
  if(!from||!to||!selectedTicker)return;
  currentPeriod='custom';
  const loadingEl=document.getElementById('chartLoading');
  loadingEl.style.display='flex';
  try{
    const res=await fetch(`${API}/candles/${selectedTicker}?start=${from}&end=${to}`);
    const data=await res.json();
    loadingEl.style.display='none';
    if(!data.c||data.s==='no_data'){
      document.getElementById('chartStats').innerHTML='<div class="stat" style="grid-column:span 3"><div class="stat-label" style="color:var(--red)">No data for this range</div></div>';
      return;
    }
    // figure out best period key for axis formatting based on span
    const span=(new Date(to)-new Date(from))/(86400000);
    let fakePeriod='3m';
    if(span<=5)fakePeriod='3d';
    else if(span<=10)fakePeriod='1w';
    else if(span<=45)fakePeriod='1m';
    else if(span<=120)fakePeriod='3m';
    else if(span<=250)fakePeriod='6m';
    else if(span<=500)fakePeriod='1y';
    else if(span<=2000)fakePeriod='5y';
    else fakePeriod='max';
    // reuse renderChart's drawing logic with this data
    renderChartWithData(selectedTicker,data,fakePeriod);
  }catch(e){loadingEl.style.display='none';}
}

function renderChartWithData(ticker,data,period){
  const closes=data.c,highs=data.h,lows=data.l,volumes=data.v||[];
  const axis=buildAxisConfig(data.t,period);
  rsiData[ticker]=calcRSI(closes);
  updateRow(ticker);
  const isUp=closes[closes.length-1]>=closes[0];
  const color=isUp?'#00c853':'#ff3d3d';
  if(currentChart)currentChart.destroy();
  const ctx=document.getElementById('priceChart').getContext('2d');
  const tickSet=new Set(axis.tickIndices);
  currentChart=new Chart(ctx,{
    type:'line',
    plugins:[daySepPlugin],
    data:{labels:axis.labels,datasets:[{data:closes,borderColor:color,borderWidth:1.5,pointRadius:0,fill:true,
      backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,isUp?'rgba(0,200,83,.12)':'rgba(255,61,61,.12)');g.addColorStop(1,'rgba(0,0,0,0)');return g;},tension:.2}]},
    options:{responsive:true,maintainAspectRatio:false,
      _dayBounds:axis.dayBounds,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a1a',borderColor:'#333',borderWidth:1,titleColor:'#888',bodyColor:'#e0e0e0',
        titleFont:{family:'IBM Plex Mono',size:10},bodyFont:{family:'IBM Plex Mono',size:12},
        callbacks:{
          title:tipCtx=>{const d=new Date(data.t[tipCtx[0].dataIndex]*1000);return axis.tooltip(d);},
          label:c=>` $${c.parsed.y.toFixed(2)}`
        }}},
      scales:{
        x:{grid:{color:i=>tickSet.has(i)?'#1e1e1e':'transparent'},
          ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9},minRotation:45,maxRotation:45,autoSkip:false,
            callback:function(val,i){return tickSet.has(i)?axis.labels[i]:null;}},
          border:{color:'#222'}},
        y:{position:'right',grid:{color:'#161616'},ticks:{color:'#555',font:{family:'IBM Plex Mono',size:9}},border:{color:'#222'}}
      }}
  });
  const high=Math.max(...highs.filter(v=>v));
  const low=Math.min(...lows.filter(v=>v));
  const chg=(closes[closes.length-1]-closes[0])/closes[0]*100;
  const rsi=rsiData[ticker];
  document.getElementById('chartStats').innerHTML=`
    <div class="stat"><div class="stat-label">CURRENT</div><div class="stat-value">${fp(closes[closes.length-1])}</div></div>
    <div class="stat"><div class="stat-label">PERIOD CHG</div><div class="stat-value ${chg>=0?'pos':'neg'}">${chg>=0?'+':''}${chg.toFixed(2)}%</div></div>
    <div class="stat"><div class="stat-label">RSI (14)</div><div class="stat-value">${rsi!=null?rsi.toFixed(1):'--'}</div></div>
    <div class="stat"><div class="stat-label">PERIOD HIGH</div><div class="stat-value pos">${fp(high)}</div></div>
    <div class="stat"><div class="stat-label">PERIOD LOW</div><div class="stat-value neg">${fp(low)}</div></div>
    <div class="stat"><div class="stat-label">AVG VOL</div><div class="stat-value neutral">${volumes.length?fVol(volumes.reduce((a,b)=>a+b,0)/volumes.length):'--'}</div></div>`;
}

function closeChart(){
  document.getElementById('chartPanel').classList.add('hidden');
  document.getElementById('customRange').style.display='none';
  document.querySelectorAll('.data-row').forEach(r=>r.classList.remove('selected'));
  if(currentChart){currentChart.destroy();currentChart=null;}
  selectedTicker=null;
}

/* ========== SORT ========== */
let sortCol=-1,sortAsc=true;
function sortTable(col){
  if(sortCol===col)sortAsc=!sortAsc;else{sortCol=col;sortAsc=true;}
  // update header indicators
  document.querySelectorAll('th').forEach(th=>{th.classList.remove('sort-asc','sort-desc');});
  const ths=document.querySelectorAll('th');
  if(ths[col])ths[col].classList.add(sortAsc?'sort-asc':'sort-desc');
  const tbody=document.getElementById('tableBody');
  const rows=Array.from(tbody.querySelectorAll('tr.data-row'));
  rows.sort((a,b)=>{
    let va=a.cells[col]?.textContent||'';
    let vb=b.cells[col]?.textContent||'';
    const na=parseFloat(va.replace(/[+%,KMB]/g,''));
    const nb=parseFloat(vb.replace(/[+%,KMB]/g,''));
    if(!isNaN(na)&&!isNaN(nb))return sortAsc?na-nb:nb-na;
    return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
  });
  tbody.innerHTML='';
  rows.forEach(r=>tbody.appendChild(r));
}

/* ========== FILTER ========== */
function filterTable(){
  const q=document.getElementById('searchBox').value.toUpperCase();
  document.querySelectorAll('.data-row').forEach(row=>{
    row.style.display=row.textContent.toUpperCase().includes(q)?'':'none';
  });
  document.querySelectorAll('.group-header,.add-row').forEach(row=>{
    row.style.display=q?'none':'';
  });
}
