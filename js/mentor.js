import {PILLARS,VIRTUES,ARCS} from './state.js';

let messages=[];
let busy=false;

/* ── API KEY ── */
function getApiKey(){return localStorage.getItem('anthropic_api_key')||'';}

/* ── CONTEXT ── */
function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getVirtueCtx(){
  const raw=localStorage.getItem('cos_virtue');
  if(!raw)return{name:'Discipline',day:1};
  const vs=JSON.parse(raw);
  const v=VIRTUES[vs.index]||VIRTUES[0];
  const diff=Math.floor((new Date()-new Date(vs.startDate+'T00:00:00'))/(1000*60*60*24));
  return{name:v.name,day:Math.max(1,Math.min(diff+1,14))};
}

function getChecklistPct(){
  const raw=localStorage.getItem('cos_daily_'+todayKey());
  if(!raw)return 0;
  const checks=JSON.parse(raw);
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}

function getNightAudit(){
  const raw=localStorage.getItem('cos_daily_'+todayKey());
  if(!raw)return false;
  return JSON.parse(raw)[4]===true;
}

function getArcCtx(){
  const raw=localStorage.getItem('cos_arc');
  if(!raw)return null;
  const {id,startDate}=JSON.parse(raw);
  const arc=ARCS.find(a=>a.id===id);
  if(!arc)return null;
  const week=Math.max(1,Math.min(Math.floor((new Date()-new Date(startDate+'T00:00:00'))/(1000*60*60*24*7))+1,arc.weeks));
  const phase=arc.phases[week-1]||arc.phases[arc.phases.length-1];
  return{name:arc.name,week,total:arc.weeks,phaseTitle:phase.title,phaseFocus:phase.focus};
}

function getRecentObsCtx(){
  const raw=localStorage.getItem('cos_observations');
  if(!raw)return null;
  const obs=JSON.parse(raw);
  if(!obs.length)return null;
  return obs.slice(-5).map(o=>o.observation).join(' · ');
}

function buildSystemPrompt(){
  const vc=getVirtueCtx();
  const pct=getChecklistPct();
  const audit=getNightAudit();
  const pillarStr=PILLARS.map(p=>`${p.name}: ${p.score}`).join(', ');
  const arc=getArcCtx();
  const arcLine=arc
    ?`- Active arc: ${arc.name} (Week ${arc.week} of ${arc.total}: ${arc.phaseTitle} — ${arc.phaseFocus})`
    :'- Active arc: none';
  const obsStr=getRecentObsCtx();
  const drifts=(window.drifts||[]).map(d=>d.text).join('; ');
  return `You are a Renaissance Mentor — a calm, intelligent, demanding philosophical guide. You speak with precision and restraint. No motivational clichés. No flattery. You respond like Marcus Aurelius would coach a young man — direct, grounded, honest.

Current user context:
- Active virtue: ${vc.name} (Day ${vc.day} of 14)
- Daily completion: ${pct}% of today's checklist done
- Night audit: ${audit?'complete':'not yet'}
${arcLine}
- Pillar scores — ${pillarStr}
${obsStr?`- Recent observations: ${obsStr}`:''}
${drifts?`- Active behavioral drifts: ${drifts}`:''}
- Identity: Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.

Respond in 3-6 sentences maximum. No bullet points. No headers. Prose only. Be honest even when uncomfortable.`;
}

/* ── API CALL ── */
async function callMentor(){
  const key=getApiKey();
  if(!key){showSetup();return null;}
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens:500,
      system:buildSystemPrompt(),
      messages
    })
  });
  if(!res.ok){
    const err=await res.json().catch(()=>({}));
    throw new Error(err.error?.message||`Error ${res.status}`);
  }
  const data=await res.json();
  return data.content[0].text;
}

/* ── DOM HELPERS ── */
function escHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function appendMsg(role,text){
  const chat=document.getElementById('mentor-chat');
  if(!chat)return;
  const div=document.createElement('div');
  div.className=`mentor-msg mentor-msg-${role}`;
  if(role==='user'){
    div.innerHTML=`<div class="mentor-user-bubble">${escHtml(text)}</div>`;
  }else if(role==='assistant'){
    div.innerHTML=`<div class="mentor-row"><div class="mentor-avatar">M</div><div class="mentor-mentor-text">${escHtml(text)}</div></div>`;
  }else{
    div.innerHTML=`<div class="mentor-error">${escHtml(text)}</div>`;
  }
  chat.appendChild(div);
  div.scrollIntoView({behavior:'smooth',block:'end'});
}

function setTyping(on){
  const chat=document.getElementById('mentor-chat');
  if(!chat)return;
  let el=document.getElementById('mentor-typing');
  if(on){
    if(!el){
      el=document.createElement('div');
      el.id='mentor-typing';
      el.className='mentor-msg mentor-typing';
      el.innerHTML=`<div class="mentor-avatar">M</div><div class="mentor-dots"><span></span><span></span><span></span></div>`;
      chat.appendChild(el);
    }
    el.scrollIntoView({behavior:'smooth',block:'end'});
  }else{
    if(el)el.remove();
  }
}

function setSendDisabled(on){
  const btn=document.getElementById('mentor-send');
  if(btn)btn.disabled=on;
}

function hidePrompts(){
  const el=document.getElementById('mentor-prompts');
  if(el)el.style.display='none';
}

function showSetup(){
  const chat=document.getElementById('mentor-chat');
  if(!chat||document.getElementById('mentor-setup'))return;
  const div=document.createElement('div');
  div.id='mentor-setup';
  div.className='mentor-setup';
  div.innerHTML=`
    <div class="mentor-setup-label">API key required</div>
    <div class="mentor-setup-hint">Paste your Anthropic API key to activate the Mentor. It is stored only in your browser.</div>
    <div class="mentor-setup-row">
      <input id="mentor-key-input" type="password" class="mentor-key-input" placeholder="sk-ant-…">
      <button class="mentor-key-save" onclick="saveMentorKey()">Save</button>
    </div>`;
  chat.appendChild(div);
}

/* ── PUBLIC ── */
export function renderMentor(){
  const textarea=document.getElementById('mentor-input');
  if(!textarea||textarea.dataset.init)return;
  textarea.dataset.init='1';

  textarea.addEventListener('input',()=>{
    textarea.style.height='auto';
    textarea.style.height=Math.min(textarea.scrollHeight,72)+'px';
  });
  textarea.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMentorMessage();}
  });

  if(!getApiKey())showSetup();
}

export function saveMentorKey(){
  const val=document.getElementById('mentor-key-input')?.value.trim();
  if(!val)return;
  localStorage.setItem('anthropic_api_key',val);
  const setup=document.getElementById('mentor-setup');
  if(setup)setup.remove();
}

export async function sendMentorMessage(){
  const textarea=document.getElementById('mentor-input');
  const text=(textarea?.value||'').trim();
  if(!text||busy)return;

  hidePrompts();
  textarea.value='';
  textarea.style.height='auto';
  busy=true;
  setSendDisabled(true);

  messages.push({role:'user',content:text});
  appendMsg('user',text);
  setTyping(true);

  try{
    const reply=await callMentor();
    setTyping(false);
    if(reply){
      messages.push({role:'assistant',content:reply});
      appendMsg('assistant',reply);
    }
  }catch(err){
    setTyping(false);
    appendMsg('error',err.message||'Something went wrong. Try again.');
  }finally{
    busy=false;
    setSendDisabled(false);
    textarea?.focus();
  }
}

export function sendPrompt(text){
  const textarea=document.getElementById('mentor-input');
  if(textarea){textarea.value=text;textarea.style.height='auto';textarea.style.height=Math.min(textarea.scrollHeight,72)+'px';}
  sendMentorMessage();
}

window.sendMentorMessage=sendMentorMessage;
window.sendPrompt=sendPrompt;
window.saveMentorKey=saveMentorKey;
