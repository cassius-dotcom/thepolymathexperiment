import {FILTERS} from './state.js';

export function renderCompass(){
  const el=document.getElementById('compass-marks');
  if(!el)return;
  let html='';
  for(let i=0;i<16;i++){
    const angle=(360/16)*i;
    const isCardinal=i%4===0;
    html+=`<div class="compass-mark${isCardinal?'':' minor'}" style="transform:translateX(-50%) rotate(${angle}deg)"></div>`;
  }
  el.innerHTML=html;
}

export function renderFilters(){
  const el=document.getElementById('filters');
  if(!el)return;
  el.innerHTML=FILTERS.map((f,i)=>`
    <div class="filter-item">
      <span class="f-num">${String(i+1).padStart(2,'0')}</span>
      <span class="f-text">${f}</span>
    </div>`).join('');
}
