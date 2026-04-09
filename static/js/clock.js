// command bar clock + NYSE bell
let prevMarketOpen=null;

// NYSE bell sound - warm brass bell tone
function playNYSEBell(){
  try{
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    const strikes=[0, 0.5, 1.0, 1.5, 2.0, 2.5];
    strikes.forEach(t=>{
      // fundamental - warm low tone
      const f1=ac.createOscillator();
      const g1=ac.createGain();
      f1.type='sine';
      f1.frequency.value=440;
      g1.gain.setValueAtTime(0.15,ac.currentTime+t);
      g1.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.8);
      f1.connect(g1);g1.connect(ac.destination);
      f1.start(ac.currentTime+t);f1.stop(ac.currentTime+t+0.9);
      // 2nd partial - gives it the bell shimmer
      const f2=ac.createOscillator();
      const g2=ac.createGain();
      f2.type='sine';
      f2.frequency.value=880;
      g2.gain.setValueAtTime(0.08,ac.currentTime+t);
      g2.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.6);
      f2.connect(g2);g2.connect(ac.destination);
      f2.start(ac.currentTime+t);f2.stop(ac.currentTime+t+0.7);
      // 3rd partial - brightness
      const f3=ac.createOscillator();
      const g3=ac.createGain();
      f3.type='sine';
      f3.frequency.value=1320;
      g3.gain.setValueAtTime(0.04,ac.currentTime+t);
      g3.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.4);
      f3.connect(g3);g3.connect(ac.destination);
      f3.start(ac.currentTime+t);f3.stop(ac.currentTime+t+0.5);
      // inharmonic partial - metallic bell character
      const f4=ac.createOscillator();
      const g4=ac.createGain();
      f4.type='sine';
      f4.frequency.value=1108;
      g4.gain.setValueAtTime(0.03,ac.currentTime+t);
      g4.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.5);
      f4.connect(g4);g4.connect(ac.destination);
      f4.start(ac.currentTime+t);f4.stop(ac.currentTime+t+0.6);
    });
  }catch(e){}
}

function updateCmdClock(){
  const now=new Date();
  const et=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
  const h=et.getHours(),m=et.getMinutes(),s=et.getSeconds();
  const isWeekday=et.getDay()>=1&&et.getDay()<=5;
  const isOpen=isWeekday&&((h===9&&m>=30)||h>=10)&&h<16;
  const etStr=et.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  document.getElementById('cmdClock').innerHTML=`${etStr} ET <span style="color:${isOpen?'var(--green)':'#333'}">${isOpen?'MKT OPEN':'MKT CLOSED'}</span>`;

  // detect market open/close transitions
  if(prevMarketOpen!==null&&prevMarketOpen!==isOpen&&isWeekday){
    // opening bell: 9:30:00 ET
    if(isOpen&&h===9&&m===30&&s<3) playNYSEBell();
    // closing bell: 16:00:00 ET
    if(!isOpen&&h===16&&m===0&&s<3) playNYSEBell();
  }
  prevMarketOpen=isOpen;
}
setInterval(updateCmdClock,1000);
updateCmdClock();

// auto-refresh based on active page
let refreshCountdown=15;
const refreshTargets={
  watchlist:{load:()=>loadAll(), status:'wStatusCountdown'},
  wei:{load:()=>loadWEI(), status:'weiStatus'},
  weif:{load:()=>loadWEIF(), status:'weifStatus'},
  wirp:{load:()=>loadWIRP(currentWirpCB), status:'wirpStatus'},
  fx:{load:()=>loadFX(), status:'fxStatus'},
  glco:{load:()=>loadGLCO(), status:'glcoStatus'},
  heat:{load:()=>loadHEAT(), status:'heatStatus'},
  fit:{load:()=>loadFIT(), status:'fitStatus'},
  pred:{load:()=>loadPRED(), status:'predStatus'},
};
setInterval(()=>{
  refreshCountdown--;
  if(refreshCountdown<=0){
    refreshCountdown=15;
    const t=refreshTargets[currentPage];
    if(t)t.load();
  }
  // update countdown on active page's status element
  const t=refreshTargets[currentPage];
  if(t){
    const el=document.getElementById(t.status);
    if(el) el.textContent=`${refreshCountdown}s`;
  }
},1000);

// keep cmd input focused when clicking anywhere (BBG style)
document.addEventListener('click',e=>{
  if(!e.target.closest('input,button,.buy-cell,.ticker-cell,.add-ticker-input,.period-btn,.home-cmd,.close-btn,.del-btn,.grp-actions,.ticker-ac'))
    document.getElementById('cmdInput').focus();
});
