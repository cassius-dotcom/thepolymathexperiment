import {FILTERS} from './state.js';

const DEFAULT_IDENTITY = 'Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.';
const DEFAULT_AXIOMS = [
  {gem:'linear-gradient(135deg,#FFD6AA,#ECB8FF)', title:'Coherence over image', body:'Embodies identity. Refuses hypocrisy.'},
  {gem:'linear-gradient(135deg,#A9CBFF,#B39AFF)', title:'Capacity over comfort', body:'Tolerates discomfort without drama.'},
  {gem:'linear-gradient(135deg,#D4FF9C,#9EF9FF)', title:'Discipline is freedom', body:'Deep routines reduce daily decisions.'}
];

function getStoredIdentity() {
  return localStorage.getItem('cos_constitution_identity') || DEFAULT_IDENTITY;
}
function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function getStoredAxioms() {
  const r = localStorage.getItem('cos_constitution_axioms');
  return safeJson(r, DEFAULT_AXIOMS).filter(a => a.title && a.title.trim());
}
function getStoredFilters() {
  const r = localStorage.getItem('cos_constitution_filters');
  return safeJson(r, FILTERS).filter(f => f && f.trim());
}

export function renderCompass() {
  const el = document.getElementById('compass-marks');
  if (!el) return;
  let html = '';
  for (let i = 0; i < 16; i++) {
    const angle = (360 / 16) * i;
    const isCardinal = i % 4 === 0;
    html += `<div class="compass-mark${isCardinal ? '' : ' minor'}" style="transform:translateX(-50%) rotate(${angle}deg)"></div>`;
  }
  el.innerHTML = html;
}

export function renderFilters() {
  const el = document.getElementById('filters');
  if (!el) return;
  const filters = getStoredFilters();
  el.innerHTML = filters.map((f, i) => `
    <div class="filter-item">
      <span class="f-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="f-text">${f}</span>
    </div>`).join('');
}

export function renderConstitutionContent() {
  const identity = getStoredIdentity();
  const axioms = getStoredAxioms();

  const identityEl = document.getElementById('constitution-identity-text');
  if (identityEl) identityEl.textContent = `"${identity}"`;

  const axiomsEl = document.getElementById('constitution-axioms-list');
  if (axiomsEl) {
    axiomsEl.innerHTML = axioms.map(a => `
      <div class="axiom-row">
        <div class="axiom-icon" style="background:${a.gem}"></div>
        <div>
          <div class="axiom-title">${a.title}</div>
          <div class="axiom-body">${a.body}</div>
        </div>
      </div>`).join('');
  }

  renderFilters();
}
