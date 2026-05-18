import {animateRollups} from './performance.js';
import {appData, dbAddTask, dbUpdateTask, dbDeleteTask} from './db.js';

export function updateOpsHero(){
  const total=appData.tasks.length;
  const done=appData.tasks.filter(t=>t.done).length;
  const open=total-done;
  const hero=document.getElementById('ops-hero');
  const heroLabel=document.getElementById('ops-hero-label');
  const doneEl=document.getElementById('ops-done');
  const openEl=document.getElementById('ops-open');
  if(hero){hero.setAttribute('data-target',total);hero.textContent=total;}
  if(doneEl){doneEl.setAttribute('data-target',done);doneEl.textContent=done;}
  if(openEl){openEl.setAttribute('data-target',open);openEl.textContent=open;}
  if(heroLabel)heroLabel.textContent=total===1?'Task today':'Tasks today';
  animateRollups();
}

export function renderTasks(){
  const el=document.getElementById('task-list');
  if(!el)return;
  if(!appData.tasks.length){
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">○</div><div class="empty-text">The queue is empty. This is mastery, not laziness.</div><div class="empty-sub">Add a task to build.</div></div>`;
    return;
  }
  el.innerHTML=appData.tasks.map(t=>`
    <div class="task-item" data-id="${t.id}" style="opacity:${t.done?0.4:1}">
      <div class="t-check ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div>
      <span class="t-text ${t.done?'done':''}">${t.text}</span>
      <button class="t-del" onclick="deleteTask(${t.id})">&times;</button>
    </div>`).join('');
}

export function addTask(){
  const inp=document.getElementById('task-input');
  const t=inp.value.trim();if(!t)return;
  dbAddTask({id:Date.now(),text:t,done:false});
  inp.value='';renderTasks();updateOpsHero();
  collapseAdd();
}

export function toggleTask(id){
  const task=appData.tasks.find(t=>t.id===id);
  if(!task)return;
  const wasComplete=task.done;
  dbUpdateTask(id,{done:!task.done});
  renderTasks();updateOpsHero();
  if(!wasComplete){
    const row=document.querySelector(`.task-item[data-id="${id}"]`);
    if(row){
      void row.offsetWidth;
      row.classList.add('celebrating');
      setTimeout(()=>{if(row.isConnected)row.classList.remove('celebrating');},600);
    }
  }
}

export function deleteTask(id){dbDeleteTask(id);renderTasks();updateOpsHero();}

export function expandAdd(){
  const wrap=document.getElementById('add-fab-wrap');
  if(!wrap)return;
  wrap.classList.add('expanded');
  setTimeout(()=>{
    const inp=document.getElementById('task-input');
    if(!inp)return;
    inp.focus();
    inp.scrollIntoView({behavior:'smooth',block:'center'});
  },200);
}

export function collapseAdd(){
  const wrap=document.getElementById('add-fab-wrap');
  if(!wrap)return;
  wrap.classList.remove('expanded');
  const inp=document.getElementById('task-input');
  if(inp)inp.value='';
}

window.addTask=addTask;
window.toggleTask=toggleTask;
window.deleteTask=deleteTask;
window.expandAdd=expandAdd;
window.collapseAdd=collapseAdd;
