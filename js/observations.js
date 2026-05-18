let activeFilter='All';
let activeTag='Self';

const TAG_COLORS={Self:'#A9CBFF',Social:'#D4FF9C',World:'#ECB8FF',Tactic:'#FFD6AA'};

/* ── STORAGE ── */
function getObs(){
  const raw=localStorage.getItem('cos_observations');
  return raw?JSON.parse(raw):[];
}
function saveObs(arr){localStorage.setItem('cos_observations',JSON.stringify(arr));}

/* ── HELPERS ── */
function relDate(iso){
  const diff=Math.floor((new Date()-new Date(iso))/(1000*60*60*24));
  if(diff===0)return'Today';
  if(diff===1)return'Yesterday';
  return`${diff}d ago`;
}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ── BUILD HTML ── */
function buildObsCard(o){
  const tagCls=o.tag.toLowerCase();
  return`
    <div class="obs-card">
      <button class="obs-delete" onclick="deleteObs(${o.id})" aria-label="Delete">×</button>
      <div class="obs-card-top">
        <span class="obs-tag-pill obs-tag-${tagCls}">${o.tag}</span>
        <span class="obs-card-date">${relDate(o.date)}</span>
      </div>
      <div class="obs-card-text">${escHtml(o.observation)}</div>
      ${o.meaning?`<div class="obs-card-meaning">${escHtml(o.meaning)}</div>`:''}
    </div>`;
}

function buildPatterns(obs){
  const tags=['Self','Social','World','Tactic'];
  const counts=Object.fromEntries(tags.map(t=>[t,obs.filter(o=>o.tag===t).length]));
  const total=obs.length;
  const max=Math.max(...Object.values(counts),1);
  const selfPct=counts.Self/total;
  const socialPct=counts.Social/total;
  const tacticPct=counts.Tactic/total;
  const worldPct=counts.World/total;
  let insight;
  if(selfPct>0.5)insight='You are studying yourself heavily. Apply what you find.';
  else if(socialPct>0.5)insight='You are reading people closely. Now lead them.';
  else if(tacticPct>selfPct&&tacticPct>socialPct&&tacticPct>worldPct)insight='You are building strategy. Execute it.';
  else insight='You are observing widely. Stay sharp.';
  return`
    <div class="obs-patterns">
      <div class="eyebrow" style="margin-top:28px">Patterns</div>
      <div class="obs-pattern-card">
        ${tags.map(t=>{
          const c=counts[t];const pct=Math.round(c/max*100);
          return`
            <div class="obs-pattern-row">
              <div class="obs-pattern-label">
                <span class="obs-tag-pill obs-tag-${t.toLowerCase()}">${t}</span>
                <span class="obs-pattern-count">${c}</span>
              </div>
              <div class="obs-pattern-bar-wrap">
                <div class="obs-pattern-bar" style="width:${pct}%;background:${TAG_COLORS[t]}"></div>
              </div>
            </div>`;
        }).join('')}
        <div class="obs-insight">${insight}</div>
      </div>
    </div>`;
}

/* ── MAIN RENDER ── */
export function renderObservations(){
  const wrap=document.getElementById('observation-section');
  if(!wrap)return;

  const obs=getObs();
  const filtered=activeFilter==='All'?obs:obs.filter(o=>o.tag===activeFilter);
  const sorted=[...filtered].reverse();

  wrap.innerHTML=`
    <div class="eyebrow">Observations</div>
    <div class="obs-subtitle">Patterns. People. Self. The world.</div>

    <div class="obs-filter-bar">
      ${['All','Self','Social','World','Tactic'].map(f=>
        `<button class="obs-filter-pill${f===activeFilter?' active':''}" onclick="setObsFilter('${f}')">${f}</button>`
      ).join('')}
    </div>

    <div class="obs-add-area">
      <button class="obs-fab" id="obs-fab" onclick="expandObsPanel()" aria-label="Add observation">+</button>
      <div class="obs-panel" id="obs-panel">
        <div class="obs-tags-row" id="obs-tags-row">
          ${['Self','Social','World','Tactic'].map(t=>
            `<button class="obs-tag-btn${t===activeTag?' active':''}" onclick="selectObsTag('${t}')">${t}</button>`
          ).join('')}
        </div>
        <textarea class="obs-textarea" id="obs-text" placeholder="What did you observe?" rows="4"></textarea>
        <textarea class="obs-textarea obs-textarea-sm" id="obs-meaning" placeholder="What does this mean?" rows="2"></textarea>
        <div class="obs-panel-actions">
          <button class="obs-save-btn" onclick="saveObservation()">Save</button>
          <button class="obs-cancel-btn" onclick="collapseObsPanel()">Cancel</button>
        </div>
      </div>
    </div>

    <div id="obs-list">
      ${sorted.length===0
        ?`<div class="empty-state"><div class="empty-icon">○</div><div class="empty-text">You have not observed. The unexamined world teaches nothing.</div></div>`
        :sorted.map(buildObsCard).join('')}
    </div>

    ${obs.length>=5?buildPatterns(obs):''}`;
}

/* ── PANEL ACTIONS ── */
export function expandObsPanel(){
  const panel=document.getElementById('obs-panel');
  const fab=document.getElementById('obs-fab');
  if(!panel)return;
  fab.style.display='none';
  panel.classList.add('visible');
  requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.add('open')));
  setTimeout(()=>document.getElementById('obs-text')?.focus(),200);
}

export function collapseObsPanel(){
  const panel=document.getElementById('obs-panel');
  const fab=document.getElementById('obs-fab');
  if(!panel)return;
  panel.classList.remove('open');
  setTimeout(()=>{
    panel.classList.remove('visible');
    if(fab)fab.style.display='';
    const t=document.getElementById('obs-text');
    const m=document.getElementById('obs-meaning');
    if(t)t.value='';
    if(m)m.value='';
    activeTag='Self';
    document.querySelectorAll('.obs-tag-btn').forEach(b=>b.classList.toggle('active',b.textContent==='Self'));
  },220);
}

export function selectObsTag(tag){
  activeTag=tag;
  document.querySelectorAll('.obs-tag-btn').forEach(b=>b.classList.toggle('active',b.textContent===tag));
}

/* ── DATA ACTIONS ── */
export function saveObservation(){
  const text=(document.getElementById('obs-text')?.value||'').trim();
  if(!text)return;
  const meaning=(document.getElementById('obs-meaning')?.value||'').trim();
  const obs=getObs();
  obs.push({id:Date.now(),date:new Date().toISOString(),tag:activeTag,observation:text,meaning});
  saveObs(obs);
  collapseObsPanel();
  setTimeout(()=>renderObservations(),240);
}

export function deleteObs(id){
  const obs=getObs().filter(o=>o.id!==id);
  saveObs(obs);
  renderObservations();
}

export function setObsFilter(f){
  activeFilter=f;
  renderObservations();
}

window.expandObsPanel=expandObsPanel;
window.collapseObsPanel=collapseObsPanel;
window.selectObsTag=selectObsTag;
window.saveObservation=saveObservation;
window.deleteObs=deleteObs;
window.setObsFilter=setObsFilter;
