import {SOCIAL_MISSIONS} from './state.js';

const LADDER = [
  {title:'Eye contact',      desc:'Hold eye contact in every interaction today.'},
  {title:'Initiation',       desc:'Speak first in three situations.'},
  {title:'Directness',       desc:'Say what you mean. No qualifiers.'},
  {title:'Leadership',       desc:'Make one group decision.'},
  {title:'Presence',         desc:'Enter rooms without anxiety. Take up space.'},
  {title:'Conflict tolerance',desc:'Stay in one uncomfortable conversation.'}
];

let panelOpen = false;
let panelAnswers = {overexplained:null, posture:null, speech:null, eyeContact:null};
const expandedIds = new Set();

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* ── STORAGE ── */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getLevel() { return parseInt(localStorage.getItem('cos_exposure_level')||'1'); }
function getTodayChecks() {
  const raw = localStorage.getItem('cos_exposure_checks_'+todayKey());
  return safeJson(raw, [false,false,false,false,false,false]);
}
function saveTodayChecks(c) { localStorage.setItem('cos_exposure_checks_'+todayKey(), JSON.stringify(c)); }
function getInteractions() { return safeJson(localStorage.getItem('cos_interactions'), []); }
function saveInteractions(a) { localStorage.setItem('cos_interactions', JSON.stringify(a)); }

/* ── HELPERS ── */
function getMission(level) {
  const d = new Date();
  const seed = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  const idx = Math.max(0, Math.min(level - 1, SOCIAL_MISSIONS.length - 1));
  const missions = SOCIAL_MISSIONS[idx];
  return missions[seed % missions.length];
}

function relDate(iso) {
  const diff = Math.floor((new Date() - new Date(iso)) / (1000*60*60*24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getWeeklyPattern() {
  const all = getInteractions();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-7);
  const week = all.filter(i => new Date(i.date) >= cutoff);
  if (week.length < 5) return null;
  const n = week.length;
  const noOverexplain = week.filter(i => !i.overexplained).length / n;
  const posture = week.filter(i => i.posture).length / n;
  const speech = week.filter(i => i.speech).length / n;
  const eyeContact = week.filter(i => i.eyeContact).length / n;
  const overexplainRate = 1 - noOverexplain;
  let insight;
  if (overexplainRate > 0.5) insight = 'You are explaining yourself too much. State, do not justify.';
  else if (posture < 0.5) insight = 'Your body is collapsing in social settings. Train it deliberately.';
  else if (speech < 0.5) insight = 'You are rushing your speech. Slow down — authority lives in pace.';
  else if (eyeContact >= 0.8) insight = 'You are holding presence well. Now lead with it.';
  else insight = 'Consistent practice. Maintain the standard.';
  return {n, noOverexplain, posture, speech, eyeContact, insight};
}

/* ── BUILD HTML HELPERS ── */
function buildQuestion(key, text) {
  const v = panelAnswers[key];
  return `
    <div class="social-panel-question">
      <span class="social-q-text">${text}</span>
      <div class="social-yn-group">
        <button class="social-yn-btn${v===true?' active':''}" onclick="socialSetAnswer('${key}',true)">Yes</button>
        <button class="social-yn-btn${v===false?' active':''}" onclick="socialSetAnswer('${key}',false)">No</button>
      </div>
    </div>`;
}

function buildPanel() {
  if (!panelOpen) return '';
  return `
    <div class="social-panel">
      <div class="social-panel-questions" id="social-panel-questions">
        ${buildQuestion('overexplained','Did you overexplain?')}
        ${buildQuestion('posture','Did you hold posture?')}
        ${buildQuestion('speech','Did you slow your speech?')}
        ${buildQuestion('eyeContact','Did you maintain eye contact?')}
      </div>
      <textarea class="social-notes-input" id="social-notes" placeholder="What happened? (optional)" rows="2"></textarea>
      <button class="social-save-btn" onclick="socialSaveInteraction()">Save</button>
    </div>`;
}

/* ── RENDER ── */
export function renderSocial() {
  const section = document.getElementById('social-section');
  if (!section) return;

  const level = getLevel();
  const checks = getTodayChecks();
  const interactions = getInteractions();
  const recent = interactions.slice(-5).reverse();
  const pattern = getWeeklyPattern();
  const mission = getMission(level);

  /* ladder */
  let ladderHtml = '';
  LADDER.forEach((rung, i) => {
    const n = i+1;
    const dimmed = n < level;
    const active = n === level;
    const checked = checks[i];
    ladderHtml += `
      <div class="social-rung${dimmed?' social-rung-dimmed':''}${active?' social-rung-active':''}">
        <div class="social-rung-num">${n}</div>
        <div class="social-rung-info">
          <div class="social-rung-title">${rung.title}</div>
          <div class="social-rung-desc">${rung.desc}</div>
        </div>
        <button class="social-rung-check${checked?' checked':''}" onclick="socialToggleCheck(${i})" aria-label="Toggle">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <polyline points="1.5 6.5 5 10 11.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>`;
  });

  /* history */
  let historyHtml = '';
  if (recent.length) {
    historyHtml = recent.map(i => {
      const dots = [
        {good: !i.overexplained},
        {good: i.posture},
        {good: i.speech},
        {good: i.eyeContact}
      ];
      const exp = expandedIds.has(i.id);
      return `
        <div class="social-history-row" onclick="socialToggleExpand(${i.id})">
          <div class="social-history-main">
            <span class="social-history-date">${relDate(i.date)}</span>
            <div class="social-history-dots">${dots.map(d=>`<span class="social-dot${d.good?' social-dot-good':''}"></span>`).join('')}</div>
            ${i.notes?`<span class="social-history-notes">${escHtml(i.notes.slice(0,40))}${i.notes.length>40?'…':''}</span>`:''}
          </div>
          ${exp?`
            <div class="social-history-detail">
              <span class="social-detail-item${!i.overexplained?' good':''}">Overexplain: ${i.overexplained?'Yes':'No'}</span>
              <span class="social-detail-item${i.posture?' good':''}">Posture: ${i.posture?'Yes':'No'}</span>
              <span class="social-detail-item${i.speech?' good':''}">Speech: ${i.speech?'Yes':'No'}</span>
              <span class="social-detail-item${i.eyeContact?' good':''}">Eye contact: ${i.eyeContact?'Yes':'No'}</span>
              ${i.notes?`<div class="social-detail-notes">${escHtml(i.notes)}</div>`:''}
            </div>`:''}
        </div>`;
    }).join('');
  }

  /* weekly pattern */
  let weeklyHtml = '';
  if (pattern) {
    const metrics = [
      {label:'No overexplain', pct: pattern.noOverexplain},
      {label:'Posture',        pct: pattern.posture},
      {label:'Slow speech',    pct: pattern.speech},
      {label:'Eye contact',    pct: pattern.eyeContact}
    ];
    weeklyHtml = `
      <div class="social-weekly-card">
        <div class="eyebrow">This week's pattern</div>
        <div class="social-bars">
          ${metrics.map(m=>`
            <div class="social-bar-row">
              <div class="social-bar-label">${m.label}</div>
              <div class="social-bar-track"><div class="social-bar-fill" style="--pct:${Math.round(m.pct*100)}%"></div></div>
              <div class="social-bar-pct">${Math.round(m.pct*100)}%</div>
            </div>`).join('')}
        </div>
        <div class="social-insight">${pattern.insight}</div>
      </div>`;
  }

  section.innerHTML = `
    <div class="eyebrow">Exposure ladder</div>
    <div class="social-subtitle">Climb deliberately. Skip nothing.</div>

    <div class="social-level-header">
      <span class="social-level-label">Focus level</span>
      <div class="social-level-pills">
        ${[1,2,3,4,5,6].map(n=>`<button class="social-level-btn${level===n?' active':''}" onclick="socialSetLevel(${n})">${n}</button>`).join('')}
      </div>
    </div>

    <div class="social-ladder">${ladderHtml}</div>

    <div class="social-mission-card">
      <div class="eyebrow">Today's social mission</div>
      <div class="social-mission-text">${escHtml(mission)}</div>
    </div>

    <button class="social-log-btn" onclick="socialOpenPanel()">${panelOpen?'Close':'Log an interaction'}</button>
    ${buildPanel()}

    ${recent.length
      ?`<div class="social-history">${historyHtml}</div>`
      :`<div class="empty-state"><div class="empty-icon">○</div><div class="empty-text">No social data. You are invisible by choice or by avoidance.</div></div>`}
    ${weeklyHtml}`;
}

/* ── WINDOW FUNCTIONS ── */
function socialSetLevel(n) {
  localStorage.setItem('cos_exposure_level', String(n));
  renderSocial();
}

function socialToggleCheck(idx) {
  const checks = getTodayChecks();
  checks[idx] = !checks[idx];
  saveTodayChecks(checks);
  renderSocial();
}

function socialOpenPanel() {
  panelOpen = !panelOpen;
  if (!panelOpen) panelAnswers = {overexplained:null, posture:null, speech:null, eyeContact:null};
  renderSocial();
}

function socialSetAnswer(key, val) {
  panelAnswers[key] = val;
  const container = document.getElementById('social-panel-questions');
  if (!container) return;
  container.innerHTML =
    buildQuestion('overexplained','Did you overexplain?') +
    buildQuestion('posture','Did you hold posture?') +
    buildQuestion('speech','Did you slow your speech?') +
    buildQuestion('eyeContact','Did you maintain eye contact?');
}

function socialSaveInteraction() {
  const {overexplained, posture, speech, eyeContact} = panelAnswers;
  if (overexplained===null||posture===null||speech===null||eyeContact===null) return;
  const notes = document.getElementById('social-notes')?.value.trim()||'';
  const all = getInteractions();
  all.push({id:Date.now(), date:new Date().toISOString(), level:getLevel(), overexplained, posture, speech, eyeContact, notes});
  saveInteractions(all);
  panelOpen = false;
  panelAnswers = {overexplained:null, posture:null, speech:null, eyeContact:null};
  renderSocial();
}

function socialToggleExpand(id) {
  if (expandedIds.has(id)) expandedIds.delete(id);
  else expandedIds.add(id);
  renderSocial();
}

window.socialSetLevel = socialSetLevel;
window.socialToggleCheck = socialToggleCheck;
window.socialOpenPanel = socialOpenPanel;
window.socialSetAnswer = socialSetAnswer;
window.socialSaveInteraction = socialSaveInteraction;
window.socialToggleExpand = socialToggleExpand;
