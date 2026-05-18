import {PILLARS,VIRTUES,ARCS} from './state.js';
import {appData, dbSaveMirror} from './db.js';

function getApiKey(){ return appData.apiKey || ''; }

const CHECKLIST_ITEMS=[
  "Trained today","No impulsive consumption","Produced before consumed",
  "Acted with discipline","Night audit complete"
];

/* ── DATA DUMP ── */
function buildDataDump(){
  const tasks=appData.tasks;
  const doneCount=tasks.filter(t=>t.done).length;
  const taskStr=tasks.length
    ?`${doneCount}/${tasks.length} complete. Open: ${tasks.filter(t=>!t.done).map(t=>t.text).join('; ')||'none'}`
    :'No tasks recorded.';

  const dailyLines=[];
  for(let i=0;i<14;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const checks=appData.checklists[key];
    if(checks){
      const completed=CHECKLIST_ITEMS.filter((_,j)=>checks[j]);
      const ds=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      dailyLines.push(`${ds}: ${completed.length}/5 — ${completed.join(', ')||'none'}`);
    }
  }

  let virtueStr='None set';
  const vData=appData.virtue;
  if(vData){
    const v=VIRTUES[vData.index]||VIRTUES[0];
    const day=Math.max(1,Math.min(Math.floor((new Date()-new Date(vData.startDate+'T00:00:00'))/(1000*60*60*24))+1,14));
    virtueStr=`${v.name} (Day ${day} of 14) — Challenge: ${v.challenge}`;
  }

  let arcStr='None active';
  const aData=appData.arc;
  if(aData){
    const{id,startDate}=aData;const arc=ARCS.find(a=>a.id===id);
    if(arc){
      const week=Math.max(1,Math.min(Math.floor((new Date()-new Date(startDate+'T00:00:00'))/(1000*60*60*24*7))+1,arc.weeks));
      const phase=arc.phases[week-1]||arc.phases[arc.phases.length-1];
      arcStr=`${arc.name}, Week ${week} of ${arc.weeks} — ${phase.title}: ${phase.focus}`;
    }
  }

  const obsArr=appData.observations;
  const obsStr=obsArr.length
    ?obsArr.map(o=>`[${o.tag}] ${o.observation}${o.meaning?' → '+o.meaning:''}`).join('\n')
    :'None recorded.';

  const driftLog=appData.driftLog||{};
  const driftHistory=Object.entries(driftLog)
    .sort(([a],[b])=>a.localeCompare(b))
    .slice(-7)
    .map(([date,types])=>`${date}: ${types.length?types.join(', '):'none'}`)
    .join('\n');

  return`BEHAVIORAL DATA
Tasks: ${taskStr}

Daily Checklist — last 14 days (${dailyLines.length} recorded):
${dailyLines.length?dailyLines.join('\n'):'No checklist data.'}

Current Virtue: ${virtueStr}
Current Arc: ${arcStr}
Pillar Scores: ${PILLARS.map(p=>`${p.name}: ${p.score}/100`).join(', ')}

Observations (${obsArr.length} total):
${obsStr}

Behavioral Drift Log (last 7 days):
${driftHistory||'No drift data recorded.'}

Identity: Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.`;
}

/* ── PROMPTS ── */
const SYSTEM_PROMPT=`You are generating The Mirror — a brutally honest psychological profile for a man building himself through structured behavioral practice. You write like a senior elder who has watched him closely. No flattery. No softening. No motivational language.

Structure the response in exactly 5 sections with these headers:

## Pattern
What is genuinely happening in his behavior. Specific. Evidence-based from the data provided.

## Strength
Where he is actually getting stronger. Be specific. No generic praise.

## Weakness
Where he is deceiving himself or avoiding. Direct. Surgical.

## Blindspot
What he is not seeing about himself. The thing he would resist hearing.

## Correction
One concrete behavioral adjustment for the next 14 days. Specific. Measurable. No platitudes.

Write each section as 2-4 sentences of dense prose. No bullet points. No hedging. No 'might' or 'perhaps'. Write with authority. The reader is a serious man — treat him as one.`;

/* ── MARKDOWN RENDERER ── */
function renderMirrorMarkdown(md){
  const sections=md.split(/^##\s+/m).filter(s=>s.trim());
  const nums=['01','02','03','04','05'];
  return sections.map((section,i)=>{
    const nl=section.indexOf('\n');
    const title=nl>-1?section.substring(0,nl).trim():section.trim();
    const body=nl>-1?section.substring(nl+1).trim():'';
    const paras=body.split(/\n\n+/).filter(p=>p.trim());
    return`
      <div class="mirror-section">
        <div class="mirror-section-title">${title}</div>
        <div class="mirror-section-num">${nums[i]||String(i+1).padStart(2,'0')}</div>
        <div class="mirror-section-body">${paras.map(p=>`<p>${p.replace(/\n/g,' ').trim()}</p>`).join('')}</div>
      </div>`;
  }).join('');
}

/* ── HELPERS ── */
function daysLeft(dateStr){
  const next=new Date(dateStr);next.setDate(next.getDate()+7);
  return Math.max(0,Math.ceil((next-new Date())/(1000*60*60*24)));
}

function relDate(iso){
  const diff=Math.floor((new Date()-new Date(iso))/(1000*60*60*24));
  if(diff===0)return'Today';if(diff===1)return'Yesterday';
  return`${diff} days ago`;
}

/* ── RENDER ── */
export function renderMirror(){
  const pane=document.getElementById('mentor-mirror-pane');
  if(!pane)return;
  const mirror=appData.mirror;
  const days=mirror?daysLeft(mirror.date):0;
  const canGen=days===0;
  const hasKey=!!getApiKey();

  pane.innerHTML=`
    <div class="mirror-hero">
      <div class="mirror-title">The Mirror</div>
      <div class="mirror-subtitle">What the data sees in you.</div>
    </div>
    <div class="mirror-generate-wrap">
      <button class="mirror-gen-btn" id="mirror-gen-btn"
        ${(!canGen||!hasKey)?'disabled':''}
        onclick="${canGen&&hasKey?'generateMirror()':''}">
        ${mirror?'Regenerate':'Generate Mirror'}
      </button>
      <div class="mirror-gen-meta">
        ${!hasKey
          ?'Configure your API key in the Conversation tab first.'
          :mirror
            ?(canGen?`Last generated: ${relDate(mirror.date)}`:`Available again in ${days} day${days!==1?'s':''}`)
            :'Never generated'}
      </div>
    </div>
    <div id="mirror-doc">
      ${mirror?`<div class="mirror-card">${renderMirrorMarkdown(mirror.content)}</div>`:''}
    </div>`;
}

/* ── GENERATE ── */
export async function generateMirror(){
  const docEl=document.getElementById('mirror-doc');
  const btn=document.getElementById('mirror-gen-btn');
  if(btn)btn.disabled=true;
  if(docEl)docEl.innerHTML=`
    <div class="mirror-card mirror-loading">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <div class="mirror-loading-text">The Mirror is forming…</div>
    </div>`;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':getApiKey(),
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1500,
        system:SYSTEM_PROMPT,
        messages:[{role:'user',content:buildDataDump()}]
      })
    });
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Error ${res.status}`);}
    const content=(await res.json()).content[0].text;
    dbSaveMirror({date:new Date().toISOString(),content});
    renderMirror();
  }catch(err){
    if(docEl)docEl.innerHTML=`
      <div class="mirror-card mirror-error">
        <div class="mirror-error-text">The Mirror could not form. ${err.message||'Try again.'}</div>
        <button class="mirror-retry-btn" onclick="generateMirror()">Retry</button>
      </div>`;
    if(btn)btn.disabled=false;
  }
}

/* ── TAB SWITCHER ── */
export function switchMentorTab(tab){
  const conv=document.getElementById('mentor-conversation-pane');
  const mirror=document.getElementById('mentor-mirror-pane');
  if(!conv||!mirror)return;
  document.querySelectorAll('.mentor-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  conv.style.display=tab==='conversation'?'':'none';
  mirror.style.display=tab==='mirror'?'':'none';
  if(tab==='mirror')renderMirror();
}

window.generateMirror=generateMirror;
window.switchMentorTab=switchMentorTab;
