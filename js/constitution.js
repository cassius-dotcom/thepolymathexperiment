import {FILTERS} from './state.js';
import {appData} from './db.js';

const DEFAULT_IDENTITY = 'Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.';
const DEFAULT_AXIOMS = [
  {gem:'linear-gradient(135deg,#FFD6AA,#ECB8FF)', title:'Coherence over image', body:'Embodies identity. Refuses hypocrisy.'},
  {gem:'linear-gradient(135deg,#A9CBFF,#B39AFF)', title:'Capacity over comfort', body:'Tolerates discomfort without drama.'},
  {gem:'linear-gradient(135deg,#D4FF9C,#9EF9FF)', title:'Discipline is freedom', body:'Deep routines reduce daily decisions.'}
];

function getStoredIdentity() {
  return appData.constitution?.identity || DEFAULT_IDENTITY;
}
function getStoredAxioms() {
  return (appData.constitution?.axioms || DEFAULT_AXIOMS).filter(a => a.title && a.title.trim());
}
function getStoredFilters() {
  return (appData.constitution?.filters || FILTERS).filter(f => f && f.trim());
}

export function renderCompass() {
  const el = document.getElementById('compass-marks');
  if (!el) return;
  const identity = getStoredIdentity();
  const filters = getStoredFilters();
  let html = '';
  html += `<div class="compass-identity">${identity}</div>`;
  html += `<div class="compass-filters-label eyebrow">Filters</div>`;
  html += filters.map(f => `<div class="compass-filter-item">— ${f}</div>`).join('');
  el.innerHTML = html;
}

export function renderConstitutionContent() {
  const el = document.getElementById('view-constitution');
  if (!el) return;
  const identity = getStoredIdentity();
  const axioms = getStoredAxioms();
  const filters = getStoredFilters();

  el.innerHTML = `
    <div class="const-hero">
      <div class="eyebrow">Identity</div>
      <div class="const-identity-text">${identity}</div>
    </div>
    <div class="eyebrow" style="margin-top:var(--s-7)">Axioms</div>
    <div class="const-axioms">
      ${axioms.map(a => `
        <div class="const-axiom-card" style="background:${a.gem}">
          <div class="const-axiom-title">${a.title}</div>
          <div class="const-axiom-body">${a.body}</div>
        </div>`).join('')}
    </div>
    <div class="eyebrow" style="margin-top:var(--s-7)">Decision filters</div>
    <div class="const-filters">
      ${filters.map(f => `<div class="const-filter-item">— ${f}</div>`).join('')}
    </div>`;
}
