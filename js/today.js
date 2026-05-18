const CHECKLIST_ITEMS=[
  "Trained today",
  "No impulsive consumption",
  "Produced before consumed",
  "Acted with discipline",
  "Night audit complete"
];

function getTodayKey(){
  const d=new Date();
  return `cos_daily_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getSaved(){
  const raw=localStorage.getItem(getTodayKey());
  return raw?JSON.parse(raw):Array(CHECKLIST_ITEMS.length).fill(false);
}

function saveChecklist(checks){
  localStorage.setItem(getTodayKey(),JSON.stringify(checks));
}

export function renderToday(){
  renderVirtueCycle();
  renderChecklist();
}

function renderVirtueCycle(){
  const fillEl=document.getElementById('virtue-cycle-fill');
  const labelEl=document.getElementById('virtue-cycle-label');
  if(!fillEl||!labelEl)return;
  const now=new Date();
  const startOfYear=new Date(now.getFullYear(),0,1);
  const dayOfYear=Math.floor((now-startOfYear)/(1000*60*60*24));
  const dayInCycle=dayOfYear%14;
  const daysRemaining=14-dayInCycle;
  fillEl.style.width=`${Math.round(dayInCycle/14*100)}%`;
  labelEl.textContent=`${daysRemaining} day${daysRemaining!==1?'s':''} remaining in cycle`;
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

window.toggleDaily=toggleDaily;
