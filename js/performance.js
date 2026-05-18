import {SKILLS,WEEK_SEEDS,DAYS} from './state.js';

export const today=new Date();
export const todayIdx=today.getDay();
export let selectedDayOffset=0;

export function genDayData(seed,currentHour){
  const rand=(s)=>{let x=Math.sin(s)*10000;return x-Math.floor(x);};
  const hours=[];
  for(let h=0;h<24;h++){
    if(h>currentHour){hours.push({focused:0,distracted:0,future:true});continue;}
    const isFocused=rand(seed*31+h*7)>0.3;
    const total=40+Math.floor(rand(seed*13+h*11)*20);
    const focused=isFocused?Math.floor(total*(0.65+rand(seed*5+h)*0.3)):Math.floor(total*rand(seed*3+h)*0.35);
    const distracted=total-focused;
    hours.push({focused,distracted,future:false});
  }
  return hours;
}

export function getWeekCells(){
  const cells=[];
  for(let i=6;i>=0;i--){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const offset=-i;
    cells.push({
      date:d.getDate(),
      day:DAYS[d.getDay()],
      offset,
      isToday:i===0,
      hasFocus:i>0,
    });
  }
  return cells;
}

export function renderWeekStrip(){
  const el=document.getElementById('week-strip');
  if(!el)return;
  const cells=getWeekCells();
  el.innerHTML=cells.map(c=>`
    <div class="day-cell" onclick="selectDay(${c.offset})">
      <div class="day-name">${c.day}</div>
      <div class="day-bubble ${c.isToday?'today':''} ${c.offset===selectedDayOffset&&!c.isToday?'selected':''} ${c.hasFocus?'has-data':''}">${c.date}</div>
      ${c.hasFocus||c.isToday?`<div class="day-dot"></div>`:'<div style="height:4px"></div>'}
    </div>`).join('');
}

export function selectDay(offset){
  selectedDayOffset=offset;
  renderWeekStrip();
  renderBarChart();
  setTimeout(()=>{
    const bubble=document.querySelector('.day-cell .day-bubble.selected, .day-cell .day-bubble.today');
    if(bubble){
      bubble.classList.add('tapped');
      setTimeout(()=>bubble.classList.remove('tapped'),360);
    }
  },10);
}

export function renderBarChart(){
  const el=document.getElementById('bar-chart');
  const titleEl=document.getElementById('chart-title');
  const metaEl=document.getElementById('chart-meta');
  if(!el)return;

  const nowHour=today.getHours();
  const seed=WEEK_SEEDS[((todayIdx-selectedDayOffset)%7+7)%7];
  const currentHour=selectedDayOffset===0?nowHour:23;
  const data=genDayData(seed,currentHour);

  const dayLabel=selectedDayOffset===0?'Today':selectedDayOffset===-1?'Yesterday':
    (()=>{const d=new Date(today);d.setDate(today.getDate()+selectedDayOffset);return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});})();

  titleEl.textContent=`${dayLabel}'s focus`;

  const totalFocused=data.reduce((a,h)=>a+h.focused,0);
  const totalAll=data.reduce((a,h)=>a+h.focused+h.distracted,0);
  const score=totalAll>0?Math.round(totalFocused/totalAll*100):0;
  metaEl.textContent=`${score}% focus score`;

  const waking=data.slice(6,24);
  const HOUR_LABELS=['6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];
  const maxVal=Math.max(...waking.map(h=>h.focused+h.distracted),1);

  el.innerHTML=waking.map((h,i)=>{
    const hourIdx=i+6;
    const total=h.focused+h.distracted;
    const pct=h.future?0:Math.round(total/maxVal*100);
    const focusedPct=total>0?Math.round(h.focused/total*100):0;
    const showLabel=i%3===0;
    const bg=h.future
      ?'var(--bar-future)'
      :focusedPct>=60
        ?`rgba(255,255,255,${0.4+focusedPct/100*0.45})`
        :`rgba(255,255,255,${0.08+focusedPct/100*0.08})`;
    const hourStr=hourIdx<12?`${hourIdx}:00 AM`:hourIdx===12?'12:00 PM':`${hourIdx-12}:00 PM`;
    const focMin=Math.round(h.focused);
    const distMin=Math.round(h.distracted);
    const sc=total>0?Math.round(h.focused/total*100):0;
    const delay=i*22;
    return `
      <div class="bar-col" onmouseenter="showScrub('${hourStr}','${focMin} min','${distMin} min','${sc}%')" onmouseleave="hideScrub()" ontouchstart="showScrub('${hourStr}','${focMin} min','${distMin} min','${sc}%')">
        <div class="bar-tooltip">${hourStr} · ${sc}%</div>
        <div class="bar-inner animating" style="--bar-h:${Math.max(pct,h.future?8:3)}%;height:${Math.max(pct,h.future?8:3)}%;background:${bg};animation-delay:${delay}ms"></div>
        <div class="bar-label" style="opacity:${showLabel?1:0}">${HOUR_LABELS[i]}</div>
      </div>`;
  }).join('');
}

export function animateBars(){
  document.querySelectorAll('.bar-inner').forEach((bar,i)=>{
    bar.classList.remove('animating');
    void bar.offsetWidth;
    bar.style.animationDelay=(i*22)+'ms';
    bar.classList.add('animating');
  });
}

export function showScrub(hour,focused,distracted,score){
  const el=document.getElementById('scrub-detail');
  if(!el)return;
  el.style.display='block';
  document.getElementById('scrub-hour').textContent=hour;
  document.getElementById('scrub-focus').textContent=focused;
  document.getElementById('scrub-dist').textContent=distracted;
  document.getElementById('scrub-score').textContent=score;
}

export function hideScrub(){
  const el=document.getElementById('scrub-detail');
  if(el)el.style.display='none';
}

export function animateRollups(){
  document.querySelectorAll('.rollup').forEach(el=>{
    const target=parseInt(el.getAttribute('data-target'),10);
    if(isNaN(target))return;
    const duration=700;
    const start=performance.now();
    function tick(now){
      const t=Math.min((now-start)/duration,1);
      const eased=1-Math.pow(1-t,3);
      el.textContent=Math.round(target*eased);
      if(t<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

export function renderSkills(){
  const el=document.getElementById('skill-list');
  if(!el)return;
  el.innerHTML=SKILLS.map(s=>`
    <div class="skill-item">
      <div class="skill-gem" style="background:${s.gem}"></div>
      <div class="skill-info">
        <div class="skill-name">${s.name}</div>
        <div class="skill-domain">${s.domain}</div>
      </div>
      <div class="skill-right">
        <div class="skill-xp">${s.xp} XP</div>
        <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${s.xp}%"></div></div>
      </div>
    </div>`).join('');
}

window.selectDay=selectDay;
window.showScrub=showScrub;
window.hideScrub=hideScrub;
