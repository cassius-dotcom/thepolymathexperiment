import {VIRTUES} from './state.js';
import {getVirtueState} from './virtue.js';

const AUDIT_QUESTIONS = [
  {key:'alignment', text:'Did you act in alignment with your values today?'},
  {key:'mission',   text:'Did you move your mission forward?'},
  {key:'pillars',   text:'Did you invest in at least one pillar?'},
];

const AUDIT_TAGS = ['Clear','Focused','Proud','Grateful','Restless','Drained','Heavy','Unsettled'];

let auditDraft = {alignment:null, mission:null, pillars:null, tag:null};

const CHECKLIST_ITEMS=[
  "Trained today",
  "No impulsive consumption",
  "Produced before consumed",
  "Acted with discipline",
  "Night audit complete"
];

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function getTodayKey(){
  const d=new Date();
  return `cos_daily_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getSaved(){
  return safeJson(localStorage.getItem(getTodayKey()), Array(CHECKLIST_ITEMS.length).fill(false));
}

function saveChecklist(checks){
  localStorage.setItem(getTodayKey(),JSON.stringify(checks));
}

export function renderToday(){
  renderVirtueCycle();
  renderChecklist();
  renderAudit();
}

function renderVirtueCycle(){
  const fillEl=document.getElementById('virtue-cycle-fill');
  const labelEl=document.getElementById('virtue-cycle-label');
  const nameEl=document.getElementById('today-virtue-name');
  const challengeEl=document.getElementById('today-virtue-challenge');
  if(!fillEl||!labelEl)return;

  const vs=getVirtueState();
  const v=VIRTUES[vs.index]||VIRTUES[0];
  const diff=Math.floor((new Date()-new Date(vs.startDate+'T00:00:00'))/(1000*60*60*24));
  const dayNumber=Math.max(1,Math.min(diff+1,14));
  const daysRemaining=14-dayNumber;

  if(nameEl) nameEl.textContent=v.name;
  if(challengeEl) challengeEl.textContent=v.challenge;
  fillEl.style.width=`${Math.round(dayNumber/14*100)}%`;
  labelEl.textContent=`Day ${dayNumber} of 14 · ${daysRemaining} day${daysRemaining!==1?'s':''} remaining`;
}

function renderChecklist(){
  const el=document.getElementById('daily-checklist');
  if(!el)return;
  const saved=getSaved();
  el.innerHTML=CHECKLIST_ITEMS.map((item,i)=>`
    <div class="daily-row" id="daily-row-${i}">
      <div class="t-check ${saved[i]?'done':''}" onclick="toggleDaily(${i})"></div>
      <span class="daily-label ${saved[i]?'checked':''}">${item}</span>
    </div>`).join('');
}

export function toggleDaily(i){
  const row=document.getElementById('daily-row-'+i);
  if(!row)return;
  const check=row.querySelector('.t-check');
  const label=row.querySelector('.daily-label');
  if(!check||!label)return;
  const wasComplete=check.classList.contains('done');
  check.classList.toggle('done');
  label.classList.toggle('checked');
  const saved=getSaved();
  saved[i]=!wasComplete;
  saveChecklist(saved);
  if(!wasComplete){
    setTimeout(()=>{
      row.classList.add('celebrating');
      setTimeout(()=>row.classList.remove('celebrating'),600);
    },10);
  }
}

/* ── NIGHT AUDIT ── */
function auditDateStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderAudit(){
  const card=document.getElementById('audit-card');
  if(!card)return;
  const saved=localStorage.getItem('cos_audit_'+auditDateStr());
  if(saved){const parsed=safeJson(saved,null);if(parsed)card.innerHTML=auditClosedHTML(parsed);return;}
  const locked=new Date().getHours()<20;
  card.innerHTML=locked?auditLockedHTML():auditFormHTML();
}

function auditLockedHTML(){
  return `<div class="audit-locked">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="audit-lock-icon">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <div class="audit-lock-text">Available after 8:00 PM</div>
  </div>`;
}

function auditFormHTML(){
  return `<div class="audit-form">
    ${AUDIT_QUESTIONS.map(q=>`
      <div class="audit-q-block">
        <div class="audit-q-text">${q.text}</div>
        <div class="audit-yn">
          <button class="audit-yn-btn" id="audit-yn-${q.key}-yes" onclick="setAuditYN('${q.key}','yes')">Yes</button>
          <button class="audit-yn-btn" id="audit-yn-${q.key}-no"  onclick="setAuditYN('${q.key}','no')">No</button>
        </div>
      </div>`).join('')}
    <div class="audit-q-block">
      <div class="audit-q-text">How do you feel closing today?</div>
      <div class="audit-tags">
        ${AUDIT_TAGS.map(t=>`<button class="audit-tag" onclick="setAuditTag('${t}')">${t}</button>`).join('')}
      </div>
    </div>
    <textarea class="audit-reflection" id="audit-reflection" placeholder="One honest sentence about today." rows="3"></textarea>
    <button class="audit-submit" onclick="submitAudit()">Close the day</button>
  </div>`;
}

function auditClosedHTML(data){
  return `<div class="audit-closed">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="audit-closed-icon">
      <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
      <path d="M6.5 10l2.5 2.5 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="audit-closed-label">Day closed</div>
    ${data.tag?`<div class="audit-closed-tag">${data.tag}</div>`:''}
    ${data.reflection?`<div class="audit-closed-reflection">"${data.reflection}"</div>`:''}
  </div>`;
}

export function setAuditYN(key, val){
  auditDraft[key]=val;
  ['yes','no'].forEach(v=>{
    const btn=document.getElementById(`audit-yn-${key}-${v}`);
    if(btn)btn.classList.toggle('selected',v===val);
  });
}

export function setAuditTag(tag){
  auditDraft.tag=tag;
  document.querySelectorAll('.audit-tag').forEach(b=>b.classList.toggle('selected',b.textContent===tag));
}

export function submitAudit(){
  const data={
    alignment: auditDraft.alignment,
    mission:   auditDraft.mission,
    pillars:   auditDraft.pillars,
    tag:       auditDraft.tag,
    reflection:(document.getElementById('audit-reflection')?.value||'').trim(),
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem('cos_audit_'+auditDateStr(), JSON.stringify(data));
  auditDraft={alignment:null,mission:null,pillars:null,tag:null};
  renderAudit();
}

window.setAuditYN=setAuditYN;
window.setAuditTag=setAuditTag;
window.submitAudit=submitAudit;
window.toggleDaily=toggleDaily;
