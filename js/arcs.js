import {ARCS} from './state.js';

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* ── STATE ── */
function getArcState() {
  return safeJson(localStorage.getItem('cos_arc'), null);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function computeWeek(startDate) {
  const diff = Math.floor((new Date() - new Date(startDate+'T00:00:00')) / (1000*60*60*24*7));
  return diff + 1;
}

function daysRemainingInPhase(startDate, week) {
  const start = new Date(startDate+'T00:00:00');
  const phaseEnd = new Date(start);
  phaseEnd.setDate(start.getDate() + week * 7);
  return Math.max(0, Math.floor((phaseEnd - new Date()) / (1000*60*60*24)));
}

/* ── RENDER ── */
export function renderArcs() {
  renderActiveArc();
  renderArcLibrary();
}

function renderActiveArc() {
  const wrap = document.getElementById('arc-active-wrap');
  if (!wrap) return;
  const s = getArcState();

  if (!s) {
    wrap.innerHTML = `
      <div class="arc-empty">
        <div class="empty-icon">○</div>
        <div class="empty-text">No active arc. Choose one below to begin.</div>
      </div>`;
    const tw = document.getElementById('arc-timeline-wrap');
    if (tw) tw.innerHTML = '';
    return;
  }

  const arc = ARCS.find(a => a.id === s.id);
  if (!arc) { wrap.innerHTML = ''; return; }

  const week = Math.min(computeWeek(s.startDate), arc.weeks);
  const done = computeWeek(s.startDate) > arc.weeks;
  const phase = arc.phases[week - 1];
  if (!phase) { wrap.innerHTML = ''; return; }
  const daysLeft = done ? 0 : daysRemainingInPhase(s.startDate, week);

  wrap.innerHTML = `
    <div class="arc-active-card arc-fade-in">
      <div class="eyebrow">${done ? 'Arc complete' : 'Active arc · Week ' + week + ' of ' + arc.weeks}</div>
      <div class="arc-active-name">${arc.name}</div>
      <div class="arc-active-desc">${arc.descriptor}</div>
      <div class="arc-phase-highlight">
        <div class="arc-phase-hl-title">${phase.title}</div>
        <div class="arc-phase-hl-focus">${phase.focus}</div>
      </div>
      <div class="arc-week-dots">
        ${arc.phases.map((_, i) => {
          const w = i + 1;
          const cls = w < week ? 'done' : w === week ? 'current' : 'future';
          return `<div class="arc-dot arc-dot-${cls}" title="Week ${w}"></div>`;
        }).join('')}
      </div>
      ${done
        ? '<div class="arc-days-left">Arc complete — start a new one below.</div>'
        : `<div class="arc-days-left">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining in this phase</div>`}
    </div>`;

  renderArcTimeline(arc, week);
}

function renderArcTimeline(arc, currentWeek) {
  const wrap = document.getElementById('arc-timeline-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="eyebrow" style="margin-top:28px">Phases</div>
    <div class="arc-timeline">
      ${arc.phases.map(p => {
        const state = p.week < currentWeek ? 'done' : p.week === currentWeek ? 'current' : 'future';
        return `
          <div class="arc-phase-row arc-phase-${state}">
            <div class="arc-phase-badge">${state === 'done' ? '✓' : 'W' + p.week}</div>
            <div class="arc-phase-info">
              <div class="arc-phase-title">${p.title}</div>
              <div class="arc-phase-focus">${p.focus}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderArcLibrary() {
  const wrap = document.getElementById('arc-library-wrap');
  if (!wrap) return;
  const active = getArcState();
  wrap.innerHTML = `
    <div class="eyebrow" style="margin-top:32px">Available arcs</div>
    <div class="arc-library-grid">
      ${ARCS.map(arc => {
        const isActive = active && active.id === arc.id;
        return `
          <div class="arc-library-card ${isActive ? 'arc-library-active' : ''}" onclick="${isActive ? '' : `showArcModal('${arc.id}')`}">
            <div class="arc-card-top">
              <div class="arc-gem" style="background:${arc.gem}"></div>
              <span class="arc-weeks-badge">${arc.weeks}w</span>
            </div>
            <div class="arc-card-name">${arc.name}</div>
            <div class="arc-card-desc">${arc.descriptor}</div>
            ${isActive ? '<div class="arc-card-active-pill">Active</div>' : ''}
          </div>`;
      }).join('')}
    </div>`;
}

/* ── MODAL ── */
export function showArcModal(arcId) {
  const arc = ARCS.find(a => a.id === arcId);
  if (!arc) return;
  let modal = document.getElementById('arc-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'arc-modal';
    modal.className = 'arc-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeArcModal(); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="arc-modal-card">
      <div class="arc-gem arc-modal-gem" style="background:${arc.gem}"></div>
      <div class="arc-modal-name">Start ${arc.name}?</div>
      <div class="arc-modal-body">${arc.weeks}-week arc. ${arc.descriptor}</div>
      <div class="arc-modal-warn">This will replace your current arc.</div>
      <div class="arc-modal-actions">
        <button class="arc-modal-cancel" onclick="closeArcModal()">Cancel</button>
        <button class="arc-modal-begin" onclick="confirmStartArc('${arcId}')">Begin</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}

export function closeArcModal() {
  const modal = document.getElementById('arc-modal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
}

export function confirmStartArc(arcId) {
  localStorage.setItem('cos_arc', JSON.stringify({id: arcId, startDate: todayStr()}));
  closeArcModal();
  renderArcs();
}

window.showArcModal = showArcModal;
window.closeArcModal = closeArcModal;
window.confirmStartArc = confirmStartArc;
