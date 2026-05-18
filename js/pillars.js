import {PILLARS} from './state.js';

const CX=110,CY=110,R=78,LR=96,N=5;

function pt(r,i){
  const a=(-90+i*72)*Math.PI/180;
  return [+(CX+r*Math.cos(a)).toFixed(2),+(CY+r*Math.sin(a)).toFixed(2)];
}

function polyStr(r){
  return Array.from({length:N},(_,i)=>pt(r,i).join(',')).join(' ');
}

export function renderPillars(){
  renderChart();
  renderCallout();
  renderList();
}

function renderChart(){
  const wrap=document.getElementById('pillars-chart');
  if(!wrap)return;

  const ANCHORS=['middle','start','start','end','end'];
  const DY=[0,4,14,14,4];

  const rings=[0.33,0.66,1.0].map(f=>
    `<polygon class="radar-ring" points="${polyStr(R*f)}"/>`
  ).join('');

  const axes=Array.from({length:N},(_,i)=>{
    const [x,y]=pt(R,i);
    return `<line class="radar-axis" x1="${CX}" y1="${CY}" x2="${x}" y2="${y}"/>`;
  }).join('');

  const scorePts=PILLARS.map((p,i)=>pt(p.score/100*R,i).join(',')).join(' ');

  const labels=PILLARS.map((p,i)=>{
    const [x,y]=pt(LR,i);
    return `<text class="radar-label" x="${x}" y="${y}" text-anchor="${ANCHORS[i]}" dy="${DY[i]}">${p.name}</text>`;
  }).join('');

  wrap.innerHTML=`
    <svg class="radar-svg" width="220" height="220" viewBox="0 0 220 220">
      ${rings}
      ${axes}
      <polygon id="radar-fill" class="radar-fill radar-fill-anim" points="${scorePts}"/>
      ${labels}
    </svg>`;
}

function renderCallout(){
  const wrap=document.getElementById('pillar-callout');
  if(!wrap)return;
  const w=PILLARS.reduce((a,b)=>a.score<b.score?a:b);
  wrap.innerHTML=`
    <div class="pillar-callout" style="--pillar-gem:${w.gem}">
      <div class="pillar-callout-gem" style="background:${w.gem}"></div>
      <div style="flex:1">
        <div class="pillar-callout-label">Needs attention</div>
        <div class="pillar-callout-name">${w.name}</div>
      </div>
      <div class="pillar-callout-score">${w.score}</div>
    </div>`;
}

function renderList(){
  const wrap=document.getElementById('pillar-list');
  if(!wrap)return;
  wrap.innerHTML=PILLARS.map(p=>`
    <div class="pillar-row">
      <div class="pillar-gem" style="background:${p.gem}"></div>
      <div class="skill-info">
        <div class="skill-name">${p.name}</div>
        <div class="skill-domain">${p.descriptor}</div>
        <div class="skill-bar-wrap" style="width:100%;margin-top:4px">
          <div class="skill-bar-fill" style="width:${p.score}%"></div>
        </div>
      </div>
      <div class="skill-right">
        <div class="skill-xp">${p.score}</div>
      </div>
    </div>`).join('');
}

export function animatePillarsChart(){
  const el=document.getElementById('radar-fill');
  if(!el)return;
  el.classList.remove('radar-fill-anim');
  void el.getBoundingClientRect();
  el.classList.add('radar-fill-anim');
}
