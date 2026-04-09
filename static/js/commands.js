/* ========== COMMAND BAR & NAVIGATION ========== */
let currentPage='home';
let watchlistInitialized=false;
let wirpInitialized=false;
let wirpChart=null;
let ecoInitialized=false;
let weiInitialized=false;
let weifInitialized=false;
let fxInitialized=false;
let glcoInitialized=false;
let heatInitialized=false;
let currentHeatIdx='sp500';
let currentHeatPeriod='dp';
let topInitialized=false;
let predInitialized=false;
let fitInitialized=false;
let newsInitialized=false;
let mostInitialized=false;
let srchInitialized=false;

const COMMANDS={
  'W':{page:'watchlist',label:'Watchlist'},
  'WIRP':{page:'wirp',label:'Fed Rates'},
  'ECO':{page:'eco',label:'Economic Calendar'},
  'WEI':{page:'wei',label:'World Equity Indices'},
  'WEIF':{page:'weif',label:'Equity Futures'},
  'FX':{page:'fx',label:'FX Monitor'},
  'GLCO':{page:'glco',label:'Commodities'},
  'HEAT':{page:'heat',label:'Heatmap'},
  'FIT':{page:'fit',label:'Fixed Income'},
  'PRED':{page:'pred',label:'Prediction Markets'},
  'CHAT':{page:'chat',label:'AI Chat'},
  'LEARN':{page:'learn',label:'Learn'},
  'TOP':{page:'top',label:'Top News'},
  'NEWS':{page:'news',label:'Newsletters'},
  'MOST':{page:'most',label:'Top Movers'},
  'SRCH':{page:'srch',label:'Equity Screener'},
};

let acSuppressed=false;
function handleCmd(e){
  if(e.key!=='Enter')return;
  acSuppressed=true;
  clearTimeout(acTimer);
  hideAC();
  const raw=document.getElementById('cmdInput').value.trim().toUpperCase();
  document.getElementById('cmdInput').value='';
  if(!raw)return;
  execCmd(raw);
  setTimeout(()=>{acSuppressed=false;},300);
}

let loadedTicker=null;

function execCmd(cmd){
  const upper=cmd.toUpperCase().trim();
  const parts=upper.split(/\s+/);

  // HS command
  if(parts[0]==='HS'){
    navigateTo('hs');
    if(parts.length>=3){
      document.getElementById('hsTicker1').value=parts[1];
      document.getElementById('hsTicker2').value=parts[2];
      loadHS([parts[1],parts[2]]);
    } else {
      document.getElementById('hsTicker1').focus();
    }
    return;
  }

  const securityCmds=['GP','DES','FA','EVT','CN','COMP','CACS','MEMB'];

  // "LOAD AAPL" or "AAPL" followed by sub-command
  if(parts[0]==='LOAD'&&parts[1]){
    loadedTicker=parts[1];
    document.getElementById('cmdHint').textContent=`${loadedTicker} loaded | GP DES FA EVT CN COMP CACS MEMB`;
    // default to GP (chart)
    execSecurityCmd(loadedTicker,'GP');
    return;
  }

  // if first word is a sub-command and we have a loaded ticker
  if(securityCmds.includes(parts[0])&&loadedTicker){
    execSecurityCmd(loadedTicker,parts[0]);
    return;
  }

  // "FA AAPL" style - load ticker + go to FA
  if(securityCmds.includes(parts[0])&&parts[1]){
    loadedTicker=parts[1];
    execSecurityCmd(loadedTicker,parts[0]);
    return;
  }

  // check known page commands
  const c=COMMANDS[upper];
  if(c){
    loadedTicker=null;
    navigateTo(c.page);
    return;
  }

  // if it looks like a ticker (short, alphanumeric), load it directly
  if(/^[A-Z0-9.\-=]{1,10}$/.test(upper)&&!upper.includes(' ')){
    loadedTicker=upper;
    execSecurityCmd(upper,'GP');
    return;
  }

  // otherwise, try searching for it as a company name
  if(upper.length>=2){
    searchAndLoad(cmd.trim());
    return;
  }

  const inp=document.getElementById('cmdInput');
  inp.style.color='var(--red)';
  inp.value=`Unknown: ${cmd}`;
  setTimeout(()=>{inp.style.color='';inp.value='';},800);
}

async function searchAndLoad(query){
  try{
    const res=await fetch(`${API}/search/${encodeURIComponent(query)}`);
    const results=await res.json();
    if(results.length>0){
      const sym=results[0].symbol;
      loadedTicker=sym;
      execSecurityCmd(sym,'GP');
    } else {
      const inp=document.getElementById('cmdInput');
      inp.style.color='var(--red)';
      inp.value=`No results for: ${query}`;
      setTimeout(()=>{inp.style.color='';inp.value='';},1000);
    }
  }catch(e){}
}

function execSecurityCmd(ticker,cmd){
  document.getElementById('cmdHint').textContent=`${ticker} | GP DES FA EVT CN COMP CACS | W22: Home`;
  if(cmd==='GP'){
    navigateTo('gp');
    loadGP(ticker);
  } else if(cmd==='DES'){
    navigateTo('des');
    loadDES(ticker);
  } else if(cmd==='FA'){
    navigateTo('fa');
    loadFA(ticker);
  } else if(cmd==='EVT'){
    navigateTo('evt');
    loadEVT(ticker);
  } else if(cmd==='CN'){
    navigateTo('cn');
    loadCN(ticker);
  } else if(cmd==='COMP'){
    navigateTo('comp');
    loadCOMP(ticker);
  } else if(cmd==='CACS'){
    navigateTo('cacs');
    loadCACS(ticker);
  } else if(cmd==='MEMB'){
    navigateTo('memb');
    loadMEMB(ticker);
  }
}

function navigateTo(page){
  currentPage=page;
  closeGlobalChart();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(`page-${page}`);
  if(el)el.classList.add('active');
  // update hint
  if(page==='home'){
    document.getElementById('cmdHint').textContent='W: Watchlist';
  } else if(page==='watchlist'){
    document.getElementById('cmdHint').textContent='W22: Home | WIRP: Fed Rates';
    if(!watchlistInitialized){
      watchlistInitialized=true;
      buildTable();
      loadAll();
    }
  } else if(page==='wirp'){
    document.getElementById('cmdHint').textContent='W22: Home | W | ECO';
    if(!wirpInitialized){
      wirpInitialized=true;
      loadWIRP(currentWirpCB);
    }
  } else if(page==='wei'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WIRP | ECO | WEIF';
    if(!weiInitialized){weiInitialized=true;loadWEI();}
  } else if(page==='weif'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI | FX';
    if(!weifInitialized){weifInitialized=true;loadWEIF();}
  } else if(page==='fx'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI | GLCO';
    if(!fxInitialized){fxInitialized=true;loadFX();}
  } else if(page==='hs'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI | HEAT';
  } else if(page==='fa'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI';
  } else if(page==='heat'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI | GLCO';
    if(!heatInitialized){heatInitialized=true;loadHEAT();}
  } else if(page==='glco'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WEI | FX';
    if(!glcoInitialized){glcoInitialized=true;loadGLCO();}
  } else if(page==='fit'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WIRP | WEI';
    if(!fitInitialized){fitInitialized=true;loadFIT();}
  } else if(page==='pred'){
    document.getElementById('cmdHint').textContent='W22: Home | W | TOP | CHAT';
    if(!predInitialized){predInitialized=true;loadPRED();}
  } else if(page==='learn'){
    document.getElementById('cmdHint').textContent='W22: Home';
  } else if(page==='chat'){
    document.getElementById('cmdHint').textContent='W22: Home | W | TOP';
    setTimeout(()=>document.getElementById('chatInput').focus(),100);
  } else if(page==='top'){
    document.getElementById('cmdHint').textContent='W22: Home | W | NEWS | ECO';
    if(!topInitialized){topInitialized=true;loadTOP();}
  } else if(page==='news'){
    document.getElementById('cmdHint').textContent='W22: Home | W | TOP | ECO';
    if(!newsInitialized){newsInitialized=true;loadNEWS();}
  } else if(page==='eco'){
    document.getElementById('cmdHint').textContent='W22: Home | W | WIRP | WEI';
    if(!ecoInitialized){
      ecoInitialized=true;
      loadECO();
    }
  } else if(page==='most'){
    document.getElementById('cmdHint').textContent='W22: Home | W | SRCH | HEAT';
    if(!mostInitialized){mostInitialized=true;loadMOST();}
  } else if(page==='srch'){
    document.getElementById('cmdHint').textContent='W22: Home | W | MOST | HEAT';
    if(!srchInitialized){srchInitialized=true;loadSRCH();}
  } else if(page==='comp'){
    document.getElementById('cmdHint').textContent='W22: Home | W | GP DES FA EVT CN CACS';
  } else if(page==='cacs'){
    document.getElementById('cmdHint').textContent='W22: Home | W | GP DES FA EVT CN COMP MEMB';
  } else if(page==='memb'){
    document.getElementById('cmdHint').textContent='W22: Home | W | GP DES FA EVT CN COMP CACS';
  }
  // refocus command input
  document.getElementById('cmdInput').focus();
}

// command bar autocomplete - custom handler (not initTickerAC)
const knownCmds=new Set(Object.keys(COMMANDS).concat(['HS','FA','GP','DES','EVT','CN','COMP','CACS','MEMB','LOAD']));
const cmdInputEl=document.getElementById('cmdInput');
cmdInputEl.addEventListener('input',function(){
  if(acSuppressed){hideAC();return;}
  const val=this.value.trim().toUpperCase();
  const parts=val.split(/\s+/);
  const firstWord=parts[0];
  // known command with no argument - hide AC
  if(knownCmds.has(firstWord)&&parts.length===1){hideAC();return;}
  // too short
  if(val.length<2){hideAC();return;}
  // command + partial ticker (e.g. "FA app") - search the second part
  if(parts.length>1&&['FA','GP','DES','EVT','CN','COMP','CACS','MEMB','LOAD'].includes(firstWord)){
    const query=parts.slice(1).join(' ');
    if(query.length<2){hideAC();return;}
    clearTimeout(acTimer);
    acInput=this;
    acCallback=(sym)=>{this.value=firstWord+' '+sym;hideAC();};
    acTimer=setTimeout(()=>fetchAC(query),200);
    return;
  }
  // not a known command - search as ticker/company name
  if(!knownCmds.has(firstWord)){
    clearTimeout(acTimer);
    acInput=this;
    acCallback=(sym)=>{this.value='';hideAC();execCmd(sym);};
    acTimer=setTimeout(()=>fetchAC(val),200);
  }
});
cmdInputEl.addEventListener('keydown',e=>{
  const dd=document.getElementById('tickerAC');
  if(dd.style.display==='none')return;
  if(e.key==='ArrowDown'){e.preventDefault();acIdx=Math.min(acIdx+1,acResults.length-1);renderAC();}
  else if(e.key==='ArrowUp'){e.preventDefault();acIdx=Math.max(acIdx-1,0);renderAC();}
  else if(e.key==='Enter'&&acIdx>=0&&acResults[acIdx]){e.preventDefault();selectAC(acIdx);}
  else if(e.key==='Escape'){hideAC();}
});
// HS inputs
initTickerAC(document.getElementById('hsTicker1'),(sym)=>{document.getElementById('hsTicker1').value=sym;});
initTickerAC(document.getElementById('hsTicker2'),(sym)=>{document.getElementById('hsTicker2').value=sym;});
// GP compare input
initTickerAC(document.getElementById('gpCompareInput'),(sym)=>{
  document.getElementById('gpCompareInput').value=sym;
  gpAddCompare();
});
