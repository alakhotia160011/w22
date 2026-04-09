/* ========== CHAT ========== */
let chatHistory=[];
let chatStreaming=false;

function clearChat(){
  chatHistory=[];
  document.getElementById('chatMessages').innerHTML='<div style="color:var(--muted);padding:40px;text-align:center;">Ask anything.</div>';
}
clearChat();

async function sendChat(){
  if(chatStreaming)return;
  const inp=document.getElementById('chatInput');
  const msg=inp.value.trim();
  if(!msg)return;
  inp.value='';

  chatHistory.push({role:'user',content:msg});

  const container=document.getElementById('chatMessages');
  if(chatHistory.length===1)container.innerHTML='';

  const userDiv=document.createElement('div');
  userDiv.className='chat-msg';
  userDiv.innerHTML=`<div class="chat-role chat-role-user">YOU</div><div class="chat-text">${msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
  container.appendChild(userDiv);

  const asstDiv=document.createElement('div');
  asstDiv.className='chat-msg';
  asstDiv.innerHTML=`<div class="chat-role chat-role-assistant">W22</div><div class="chat-text" id="chatStreamTarget"><span class="chat-cursor"></span></div>`;
  container.appendChild(asstDiv);
  container.scrollTop=container.scrollHeight;

  chatStreaming=true;
  const target=document.getElementById('chatStreamTarget');
  let fullText='';

  // try streaming first
  let streamWorked=false;
  try{
    const res=await fetch(`${API}/chat`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:chatHistory}),
    });
    if(!res.ok){
      const err=await res.text();
      target.innerHTML=`<span style="color:var(--red)">HTTP ${res.status}: ${err.substring(0,200)}</span>`;
      chatStreaming=false;return;
    }

    const contentType=res.headers.get('content-type')||'';
    if(contentType.includes('event-stream')){
      // SSE streaming
      const reader=res.body.getReader();
      const decoder=new TextDecoder();
      let buffer='';
      while(true){
        const{done,value}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        let nlIdx;
        while((nlIdx=buffer.indexOf('\n'))!==-1){
          const line=buffer.substring(0,nlIdx);
          buffer=buffer.substring(nlIdx+1);
          if(line.startsWith('data: ')){
            const data=line.slice(6);
            if(data==='[DONE]'||data==='...'||data==='')continue;
            if(data.startsWith('Error:')){
              // streaming returned an error - fall back to sync
              break;
            }
            fullText+=data.replace(/\\n/g,'\n');
            target.innerHTML=formatChat(fullText)+'<span class="chat-cursor"></span>';
            container.scrollTop=container.scrollHeight;
            streamWorked=true;
          }
        }
      }
      if(buffer.startsWith('data: ')){
        const data=buffer.slice(6);
        if(data!=='[DONE]'&&data!=='...'&&data!==''){
          fullText+=data.replace(/\\n/g,'\n');
          streamWorked=true;
        }
      }
    }
  }catch(e){
    // streaming failed entirely
  }

  // if streaming didn't produce output, fall back to sync
  if(!streamWorked||!fullText){
    target.innerHTML='<span class="chat-cursor"></span>';
    try{
      const res2=await fetch(`${API}/chat?mode=sync`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:chatHistory}),
      });
      const data=await res2.json();
      if(data.error){
        target.innerHTML=`<span style="color:var(--red)">${data.error}</span>`;
      } else {
        fullText=data.response||'';
      }
    }catch(e2){
      target.innerHTML=`<span style="color:var(--red)">Error: ${e2.message}</span>`;
    }
  }

  target.innerHTML=formatChat(fullText)||target.innerHTML||'<span style="color:var(--muted)">No response</span>';
  if(fullText)chatHistory.push({role:'assistant',content:fullText});
  chatStreaming=false;
  target.removeAttribute('id');
  container.scrollTop=container.scrollHeight;
  inp.focus();
}

function formatChat(text){
  if(!text)return '';
  let h=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h=h.replace(/```([\s\S]*?)```/g,'<code style="display:block;background:var(--bg3);padding:8px;margin:4px 0;white-space:pre;">$1</code>');
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/^### (.+)$/gm,'<strong style="color:var(--accent);">$1</strong>');
  h=h.replace(/^## (.+)$/gm,'<strong style="color:var(--accent);font-size:13px;">$1</strong>');
  h=h.replace(/^# (.+)$/gm,'<strong style="color:var(--accent);font-size:14px;">$1</strong>');
  h=h.replace(/^- (.+)$/gm,'<span style="color:var(--accent)">&#9654;</span> $1');
  return h;
}
