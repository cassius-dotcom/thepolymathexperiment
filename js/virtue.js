import {VIRTUES} from './state.js';

function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getVirtueState(){
  const raw=localStorage.getItem('cos_virtue');
  if(raw) return JSON.parse(raw);
  const s={index:0,startDate:todayStr()};
  localStorage.setItem('cos_virtue',JSON.stringify(s));
  return s;
}

function dayInCycle(startDate){
  const start=new Date(startDate+'T00:00:00');
  const diff=Math.floor((new Date()-start)/(1000*60*60*24));
  return Math.max(1,Math.min(diff+1,14));
}

export function renderVirtue(){
  const wrap=document.getElementById('virtue-section');
  if(!wrap)return;
  const vs=getVirtueState();
  const v=VIRTUES[vs.index];
  const day=dayInCycle(vs.startDate);
  const pct=Math.round(day/14*100);
  wrap.innerHTML=`
    <div class="eyebrow">Virtue</div>
    <div class="virtue-card">
      <div class="virtue-name">${v.name}</div>
      <div class="virtue-challenge">${v.challenge}</div>
      <div class="virtue-day">Day ${day} of 14</div>
      <div class="virtue-bar"><div class="virtue-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <button class="virtue-rotate-btn" onclick="rotateVirtue()">Rotate virtue →</button>
    <div class="virtue-reflection">
      <div class="eyebrow">Tonight's question</div>
      <div class="virtue-reflection-q">${v.reflection}</div>
    </div>
    <div class="virtue-all-wrap">
      <button class="virtue-all-toggle" onclick="toggleVirtueList()">
        All virtues
        <span class="virtue-all-chevron" id="virtue-all-chevron">›</span>
      </button>
      <div class="virtue-all-list" id="virtue-all-list">
        ${VIRTUES.map(vv=>`
          <div class="virtue-all-item">
            <div class="virtue-all-name">${vv.name}</div>
            <div class="virtue-all-challenge">${vv.challenge}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

export function rotateVirtue(){
  const vs=getVirtueState();
  vs.index=(vs.index+1)%VIRTUES.length;
  vs.startDate=todayStr();
  localStorage.setItem('cos_virtue',JSON.stringify(vs));
  renderVirtue();
}

export function toggleVirtueList(){
  const list=document.getElementById('virtue-all-list');
  const chevron=document.getElementById('virtue-all-chevron');
  if(!list||!chevron)return;
  list.classList.toggle('open');
  chevron.classList.toggle('open');
}

window.rotateVirtue=rotateVirtue;
window.toggleVirtueList=toggleVirtueList;
