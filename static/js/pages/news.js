/* ========== NEWS (Newsletters from email) ========== */
let newsData=[];
let activeNewsletter=null;

async function loadNEWS(){
  const el=document.getElementById('newsContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span> Fetching newsletters from inbox...</div>';
  document.getElementById('newsNavBtns').innerHTML='';
  try{
    const res=await fetch(`${API}/news`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    newsData=data.newsletters||[];
    if(!newsData.length){el.innerHTML='<div style="padding:40px;color:var(--muted)">No newsletters found</div>';return;}
    // build nav buttons
    const nav=document.getElementById('newsNavBtns');
    newsData.forEach((nl,i)=>{
      const btn=document.createElement('button');
      btn.className='tb-btn news-nl-btn'+(i===0?' active':'');
      btn.textContent=nl.name.toUpperCase();
      btn.onclick=()=>{
        document.querySelectorAll('.news-nl-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        showNewsletter(i);
      };
      nav.appendChild(btn);
    });
    showNewsletter(0);
  }catch(e){
    el.innerHTML='<div style="padding:40px;color:var(--red)">Error fetching newsletters</div>';
  }
}

function showNewsletter(idx){
  const nl=newsData[idx];
  if(!nl)return;
  activeNewsletter=idx;
  const el=document.getElementById('newsContent');
  // parse date
  let dateDisplay=nl.date||'';
  try{
    const d=new Date(nl.date);
    if(!isNaN(d))dateDisplay=estFull(d)+' ET';
  }catch(e){}

  // standardised formatter for all newsletters
  let raw=nl.body;
  let paragraphs=raw.split(/\n{2,}/);
  let html='';
  function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function classifyLine(text){
    if(!text)return 'body';
    // ALL CAPS section header
    if(/^[A-Z][A-Z\s&:,;'\u2018\u2019\u201C\u201D.?!\-]{3,}$/.test(text)&&text.length<100)return 'section';
    // TLDR article title
    if(/\d+\s+MINUTE READ\)/.test(text))return 'heading';
    // Title case short header (Brazil, More Regional, Culture Corner)
    if(/^[A-Z][a-z]+(\s[A-Z][a-z]*)*$/.test(text)&&text.length<30)return 'section';
    // Endpoints "by Author" line
    if(/^.*\b(by|BY)\s+[A-Z][a-z]+\s+[A-Z]/.test(text)&&text.length<120)return 'byline';
    // Author/credit line
    if(/^(Drew Armstrong|Max Bayer|Zachary Brennan|Reynald Castaneda|James Bosworth)/.test(text))return 'byline';
    if(/^\s*@\w+\s*$/.test(text))return 'byline';
    // Short standalone line that looks like a sub-headline
    if(text.length<80&&!text.endsWith('.')&&/^[A-Z""\u201C]/.test(text))return 'heading';
    return 'body';
  }
  paragraphs.forEach(para=>{
    para=para.trim();
    if(!para)return;
    const lines=para.split('\n');
    // bullet list?
    if(lines.every(l=>/^\s*[*\-]\*?\*?\s/.test(l.trim())||!l.trim())){
      lines.forEach(l=>{
        l=l.trim();if(!l)return;
        l=l.replace(/^[*\-]\s*/,'').replace(/^\*\*\s*/,'');
        html+=`<div class="nl-bullet"><span style="color:var(--accent)">&#9654;</span> ${esc(l)}</div>`;
      });
      return;
    }
    // check if first line is a header with body following
    const first=lines[0]?lines[0].trim():'';
    const firstType=classifyLine(first);
    if(firstType==='section'&&lines.length>1){
      html+=`<p class="nl-section">${esc(first)}</p>`;
      lines.shift();
    }
    // join remaining lines
    let text=lines.map(l=>l.trim()).filter(l=>l).join(' ');
    if(!text)return;
    const type=classifyLine(text);
    const t=esc(text);
    if(type==='section')html+=`<p class="nl-section">${t}</p>`;
    else if(type==='heading')html+=`<p class="nl-heading">${t}</p>`;
    else if(type==='byline')html+=`<p class="nl-byline">${t}</p>`;
    else html+=`<p>${t}</p>`;
  });
  html=html.replace(/<p[^>]*>M Tue W Th F.*?<\/p>/g,'');
  html=html.replace(/<p[^>]*>\d{1,3}<\/p>/g,'');

  el.innerHTML=`
    <div class="nl-header">
      <div class="nl-title">${nl.name}</div>
      <div class="nl-meta">${nl.author} &middot; ${dateDisplay} &middot; ${nl.subject}</div>
    </div>
    <div class="nl-body">${html}</div>`;
  el.scrollTop=0;
}
