/* --- EST timezone helpers --- */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function toEST(d){
  if(!(d instanceof Date)||isNaN(d))return d;
  return new Date(d.toLocaleString('en-US',{timeZone:'America/New_York'}));
}
function estTime(d){const e=toEST(d);return e.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});}
function estDatetime(d){const e=toEST(d);return fmt_dd_mmm(e)+' '+estTime(d);}
function estFull(d){const e=toEST(d);return fmt_dd_mmm_yy(e)+' '+estTime(d);}

/* --- chart axis helpers --- */
function fmt_time(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});}
function fmt_dd_mmm(d){return d.getDate()+'-'+MON[d.getMonth()];}                        // 7-Apr
function fmt_dd_mmm_yy(d){return d.getDate()+'-'+MON[d.getMonth()]+'-'+String(d.getFullYear()).slice(2);}  // 7-Apr-26
function fmt_mmm_yy(d){return MON[d.getMonth()]+'-'+String(d.getFullYear()).slice(2);}    // Apr-26
function fmt_datetime(d){return fmt_dd_mmm(d)+' '+fmt_time(d);}                           // 7-Apr 14:30
function fmt_datetime_yy(d){return fmt_dd_mmm_yy(d)+' '+fmt_time(d);}                     // 7-Apr-26 14:30
function dayOfTS(ts){const d=new Date(ts*1000);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
