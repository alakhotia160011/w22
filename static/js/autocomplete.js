/* ========== GLOBAL TICKER AUTOCOMPLETE ========== */
let acResults=[], acIdx=-1, acInput=null, acTimer=null, acCallback=null;

function initTickerAC(inputEl, onSelect){
  inputEl.addEventListener('input',()=>{
    clearTimeout(acTimer);
    acInput=inputEl;
    acCallback=onSelect;
    const q=inputEl.value.trim();
    if(q.length<1){hideAC();return;}
    acTimer=setTimeout(()=>fetchAC(q),200);
  });
  inputEl.addEventListener('keydown',e=>{
    const dd=document.getElementById('tickerAC');
    if(dd.style.display==='none')return;
    if(e.key==='ArrowDown'){e.preventDefault();acIdx=Math.min(acIdx+1,acResults.length-1);renderAC();}
    else if(e.key==='ArrowUp'){e.preventDefault();acIdx=Math.max(acIdx-1,0);renderAC();}
    else if(e.key==='Enter'&&acIdx>=0&&acResults[acIdx]){e.preventDefault();selectAC(acIdx);}
    else if(e.key==='Escape'){hideAC();}
  });
  inputEl.addEventListener('blur',()=>setTimeout(hideAC,150));
}

async function fetchAC(q){
  try{
    const res=await fetch(`${API}/search/${encodeURIComponent(q)}`);
    acResults=await res.json();
    acIdx=-1;
    if(acResults.length)showAC();else hideAC();
  }catch(e){hideAC();}
}

function showAC(){
  if(!acInput||acSuppressed)return;
  const dd=document.getElementById('tickerAC');
  const rect=acInput.getBoundingClientRect();
  dd.style.top=(rect.bottom+2)+'px';
  dd.style.left=rect.left+'px';
  dd.style.minWidth=Math.max(280,rect.width)+'px';
  dd.style.display='block';
  renderAC();
}

function renderAC(){
  const dd=document.getElementById('tickerAC');
  dd.innerHTML=acResults.map((s,i)=>
    `<div class="ticker-ac-item${i===acIdx?' active':''}" onmousedown="selectAC(${i})"><span class="ticker-ac-sym">${s.symbol}</span><span class="ticker-ac-name">${s.name}</span></div>`
  ).join('');
}

function selectAC(i){
  const s=acResults[i];
  if(!s)return;
  if(acCallback){
    acCallback(s.symbol,s.name);
  } else if(acInput){
    acInput.value=s.symbol;
  }
  hideAC();
}

function hideAC(){
  document.getElementById('tickerAC').style.display='none';
  acResults=[];acIdx=-1;
}
