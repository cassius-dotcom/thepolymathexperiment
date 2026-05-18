import {renderConstitutionContent} from './constitution.js';
import {appData, dbAddPrinciple, dbUpdatePrinciple, dbDeletePrinciple, dbAddLetter, dbMarkLetterNotified, dbSaveConstitution} from './db.js';

const GEM_PALETTE = [
  'linear-gradient(135deg,#FFD6AA,#ECB8FF)',
  'linear-gradient(135deg,#A9CBFF,#B39AFF)',
  'linear-gradient(135deg,#D4FF9C,#9EF9FF)',
  'linear-gradient(135deg,#E2C9FF,#8CFFDD)',
  'linear-gradient(135deg,#ECB8FF,#A9CBFF)',
  'linear-gradient(135deg,#9EF9FF,#D4FF9C)',
  'linear-gradient(135deg,#B39AFF,#8CFFDD)',
  'linear-gradient(135deg,#FFD6AA,#9EF9FF)',
];

/* ── STATE ── */
let legacyTab = 'constitution';
let principlesOrder = 'newest';
let addingPrinciple = false;
let editingPrincipleId = null;
const tappedSealedIds = new Set();

/* ── DEFAULTS ── */
const DEFAULT_IDENTITY = 'Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.';
const DEFAULT_AXIOMS = [
  {gem:'linear-gradient(135deg,#FFD6AA,#ECB8FF)', title:'Coherence over image', body:'Embodies identity. Refuses hypocrisy.'},
  {gem:'linear-gradient(135deg,#A9CBFF,#B39AFF)', title:'Capacity over comfort', body:'Tolerates discomfort without drama.'},
  {gem:'linear-gradient(135deg,#D4FF9C,#9EF9FF)', title:'Discipline is freedom', body:'Deep routines reduce daily decisions.'}
];
const DEFAULT_FILTERS = [
  "Does this strengthen or weaken my foundation?",
  "Would my future self thank me for this?",
  "Does this align with my principles or feed my ego?",
  "Is this comfort-seeking or capacity-building?",
  "Does this increase or decrease self-respect?"
];

/* ── STORAGE ── */
function getIdentity() { return appData.constitution?.identity || DEFAULT_IDENTITY; }
function getAxioms() { return appData.constitution?.axioms || DEFAULT_AXIOMS; }
function getFilters() { return appData.constitution?.filters || DEFAULT_FILTERS; }
function getPrinciples() { return appData.principles; }
function getLetters() { return appData.letters; }

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

function relDate(iso) {
  const d = Math.floor((new Date() - new Date(iso)) / 864e5);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}yr ago`;
}

/* ── UNLOCK NOTIFICATIONS ── */
function checkUnlocked() {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const fresh = getLetters().filter(l =>
    l.unlockDate && new Date(l.unlockDate) <= today && !l.notified
  );
  fresh.forEach(l => dbMarkLetterNotified(l.id));
  return fresh;
}

/* ── CONSTITUTION TAB ── */
function buildConstitutionTab() {
  const identity = getIdentity();
  const axioms = getAxioms();
  const filters = getFilters();

  const axiomsHtml = axioms.map((a, i) => `
    <div class="leg-axiom-row" data-idx="${i}" data-gem="${escHtml(a.gem)}">
      <div class="leg-axiom-gem-btn" style="background:${a.gem}" onclick="legCycleGem(${i})" title="Cycle gem"></div>
      <div class="leg-axiom-fields">
        <input class="leg-axiom-title-input" type="text" value="${escHtml(a.title)}" placeholder="Axiom title" onblur="legSaveAxioms()">
        <input class="leg-axiom-body-input" type="text" value="${escHtml(a.body)}" placeholder="Body" onblur="legSaveAxioms()">
      </div>
      <button class="leg-delete-btn" onclick="legDeleteAxiom(${i})" aria-label="Delete">×</button>
    </div>`).join('');

  const filtersHtml = filters.map((f, i) => `
    <div class="leg-filter-row" data-idx="${i}">
      <input class="leg-filter-input" type="text" value="${escHtml(f)}" placeholder="Filter question" onblur="legSaveFilters()">
      <button class="leg-delete-btn" onclick="legDeleteFilter(${i})" aria-label="Delete">×</button>
    </div>`).join('');

  return `
    <div class="eyebrow">Identity</div>
    <textarea class="leg-identity-input" rows="4" placeholder="Define yourself." onblur="legSaveIdentity()">${escHtml(identity)}</textarea>

    <div class="eyebrow" style="margin-top:var(--s-6)">Axioms</div>
    <div id="leg-axioms-list">${axiomsHtml}</div>
    <button class="leg-add-btn" onclick="legAddAxiom()">+ Add axiom</button>

    <div class="eyebrow" style="margin-top:var(--s-6)">Filters</div>
    <div id="leg-filters-list">${filtersHtml}</div>
    <button class="leg-add-btn" onclick="legAddFilter()">+ Add filter</button>`;
}

/* ── PRINCIPLES TAB ── */
function buildPrinciplesTab() {
  const principles = getPrinciples();
  const ordered = principlesOrder === 'newest' ? [...principles].reverse() : principles;

  let listHtml = '';
  if (!ordered.length) {
    listHtml = `<div class="leg-empty">No principles yet. Add the first one.</div>`;
  } else {
    listHtml = ordered.map(p => {
      if (editingPrincipleId === p.id) {
        return `
          <div class="leg-principle-card leg-principle-editing">
            <textarea class="leg-edit-textarea" id="leg-edit-text-${p.id}" rows="2">${escHtml(p.text)}</textarea>
            <textarea class="leg-edit-textarea leg-edit-context-ta" id="leg-edit-ctx-${p.id}" rows="2" placeholder="Context (optional)">${escHtml(p.context||'')}</textarea>
            <div class="leg-edit-actions">
              <button class="leg-save-edit-btn" onclick="legSavePrincipleEdit(${p.id})">Save</button>
              <button class="leg-ghost-btn" onclick="legCancelEdit()">Cancel</button>
            </div>
          </div>`;
      }
      return `
        <div class="leg-principle-card">
          <div class="leg-principle-top">
            <span class="leg-principle-num">${String(p.number).padStart(2,'0')}</span>
            <div class="leg-principle-body">
              <div class="leg-principle-text">${escHtml(p.text)}</div>
              ${p.context ? `<div class="leg-principle-context">${escHtml(p.context)}</div>` : ''}
              <div class="leg-principle-date">${relDate(p.date)}</div>
            </div>
            <div class="leg-principle-actions">
              <button class="leg-icon-btn" onclick="legEditPrinciple(${p.id})" title="Edit">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="leg-icon-btn" onclick="legDeletePrinciple(${p.id})" title="Delete">×</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  const addPanelHtml = addingPrinciple ? `
    <div class="leg-add-panel">
      <textarea class="leg-edit-textarea" id="leg-new-text" rows="2" placeholder="Your principle:"></textarea>
      <textarea class="leg-edit-textarea leg-edit-context-ta" id="leg-new-ctx" rows="3" placeholder="Context (optional):"></textarea>
      <div class="leg-edit-actions">
        <button class="leg-save-edit-btn" onclick="legSaveNewPrinciple()">Save</button>
        <button class="leg-ghost-btn" onclick="legCancelAdd()">Cancel</button>
      </div>
    </div>` : '';

  return `
    <div class="eyebrow">Living principles</div>
    <div class="leg-subtitle">Rules you operate by. Add as you discover them.</div>
    <div class="leg-order-toggle">
      <button class="leg-order-btn${principlesOrder==='newest'?' active':''}" onclick="legSetOrder('newest')">Newest</button>
      <button class="leg-order-btn${principlesOrder==='numbered'?' active':''}" onclick="legSetOrder('numbered')">Numbered</button>
    </div>
    ${listHtml}
    ${addPanelHtml}
    ${!addingPrinciple ? `<button class="leg-fab-btn" onclick="legStartAdd()">Add principle</button>` : ''}`;
}

/* ── LETTERS TAB ── */
function buildLettersTab() {
  const letters = getLetters().slice().reverse();
  const today = new Date(); today.setHours(23, 59, 59, 999);

  let lettersHtml = '';
  if (!letters.length) {
    lettersHtml = `<div class="leg-empty">You have written no letters. Legacy is built in reflection.</div>`;
  } else {
    lettersHtml = letters.map(l => {
      const isSealed = l.unlockDate && new Date(l.unlockDate) > today;
      const unlockFmt = l.unlockDate
        ? new Date(l.unlockDate).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
        : null;
      if (isSealed) {
        const wasTapped = tappedSealedIds.has(l.id);
        return `
          <div class="leg-letter-card leg-letter-sealed" data-id="${l.id}" onclick="legSealedTap(${l.id})">
            <div class="leg-letter-card-top">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="leg-seal-dot"></span>
                <span class="leg-letter-recipient">${escHtml(l.recipient||'To myself')}</span>
              </div>
            </div>
            <div class="leg-letter-sealed-label">${wasTapped ? `This letter is sealed until ${unlockFmt}.` : `Sealed · Opens ${unlockFmt}`}</div>
          </div>`;
      }
      const preview = l.content ? l.content.split('\n').filter(Boolean).slice(0,2).join(' ') : '';
      return `
        <div class="leg-letter-card" onclick="legViewLetter(${l.id})">
          <div class="leg-letter-card-top">
            <span class="leg-letter-recipient">${escHtml(l.recipient||'To myself')}</span>
            <span class="leg-letter-card-date">${fmtDate(l.date)}</span>
          </div>
          ${preview ? `<div class="leg-letter-preview">${escHtml(preview.slice(0,120))}${preview.length>120?'…':''}</div>` : ''}
        </div>`;
    }).join('');
  }

  return `
    <div class="eyebrow">Letters</div>
    <div class="leg-subtitle">To your future self. To your son. To the man you are becoming.</div>
    ${lettersHtml}
    <button class="leg-write-btn" onclick="legStartLetter()">Write a letter</button>`;
}

/* ── RENDER ── */
export function renderLegacy() {
  const view = document.getElementById('view-legacy');
  if (!view) return;

  const unlocked = checkUnlocked();
  const notifHtml = unlocked.map(l => `
    <div class="leg-unlock-notif">
      A letter has unlocked. From ${fmtDate(l.date)}, to ${escHtml(l.recipient||'yourself')}.
    </div>`).join('');

  let tabContent = '';
  if (legacyTab === 'constitution') tabContent = buildConstitutionTab();
  else if (legacyTab === 'principles') tabContent = buildPrinciplesTab();
  else tabContent = buildLettersTab();

  view.innerHTML = `
    ${notifHtml}
    <div class="leg-tab-bar">
      <button class="leg-tab${legacyTab==='constitution'?' active':''}" onclick="legSetTab('constitution')">Constitution</button>
      <button class="leg-tab${legacyTab==='principles'?' active':''}" onclick="legSetTab('principles')">Principles</button>
      <button class="leg-tab${legacyTab==='letters'?' active':''}" onclick="legSetTab('letters')">Letters</button>
    </div>
    <div class="leg-content">${tabContent}</div>`;
}

/* ── CONSTITUTION ACTIONS ── */
function legSaveIdentity() {
  const el = document.querySelector('.leg-identity-input');
  if (!el) return;
  const val = el.value.trim();
  dbSaveConstitution({ identity: val || DEFAULT_IDENTITY });
  renderConstitutionContent();
}

function legSaveAxioms() {
  const axioms = [];
  document.querySelectorAll('#leg-axioms-list .leg-axiom-row').forEach(row => {
    axioms.push({
      gem: row.dataset.gem,
      title: row.querySelector('.leg-axiom-title-input')?.value || '',
      body: row.querySelector('.leg-axiom-body-input')?.value || ''
    });
  });
  dbSaveConstitution({ axioms });
  renderConstitutionContent();
}

function legSaveFilters() {
  const filters = [];
  document.querySelectorAll('#leg-filters-list .leg-filter-row').forEach(row => {
    const v = row.querySelector('.leg-filter-input')?.value || '';
    filters.push(v);
  });
  dbSaveConstitution({ filters });
  renderConstitutionContent();
}

function legCycleGem(idx) {
  const rows = [...document.querySelectorAll('#leg-axioms-list .leg-axiom-row')];
  const row = rows[idx];
  if (!row) return;
  const cur = row.dataset.gem;
  const pi = GEM_PALETTE.indexOf(cur);
  const next = GEM_PALETTE[(Math.max(pi, 0) + 1) % GEM_PALETTE.length];
  row.dataset.gem = next;
  const btn = row.querySelector('.leg-axiom-gem-btn');
  if (btn) btn.style.background = next;
  legSaveAxioms();
}

function legDeleteAxiom(idx) {
  const axioms = [...getAxioms()];
  axioms.splice(idx, 1);
  dbSaveConstitution({ axioms });
  renderConstitutionContent();
  renderLegacy();
}

function legAddAxiom() {
  const axioms = [...getAxioms()];
  axioms.push({gem: GEM_PALETTE[axioms.length % GEM_PALETTE.length], title:'', body:''});
  dbSaveConstitution({ axioms });
  renderLegacy();
  setTimeout(() => {
    const rows = document.querySelectorAll('#leg-axioms-list .leg-axiom-row');
    rows[rows.length-1]?.querySelector('.leg-axiom-title-input')?.focus();
  }, 20);
}

function legDeleteFilter(idx) {
  const filters = [...getFilters()];
  filters.splice(idx, 1);
  dbSaveConstitution({ filters });
  renderConstitutionContent();
  renderLegacy();
}

function legAddFilter() {
  const filters = [...getFilters(), ''];
  dbSaveConstitution({ filters });
  renderLegacy();
  setTimeout(() => {
    const rows = document.querySelectorAll('#leg-filters-list .leg-filter-row');
    rows[rows.length-1]?.querySelector('.leg-filter-input')?.focus();
  }, 20);
}

/* ── PRINCIPLES ACTIONS ── */
function legSetOrder(order) { principlesOrder = order; renderLegacy(); }

function legStartAdd() {
  addingPrinciple = true;
  renderLegacy();
  setTimeout(() => document.getElementById('leg-new-text')?.focus(), 20);
}

function legCancelAdd() { addingPrinciple = false; renderLegacy(); }

function legSaveNewPrinciple() {
  const text = document.getElementById('leg-new-text')?.value.trim();
  if (!text) return;
  const context = document.getElementById('leg-new-ctx')?.value.trim() || '';
  const p = {id: Date.now(), number: getPrinciples().length+1, text, context, date: new Date().toISOString()};
  dbAddPrinciple(p);
  addingPrinciple = false;
  renderLegacy();
}

function legEditPrinciple(id) {
  editingPrincipleId = id;
  renderLegacy();
  setTimeout(() => document.getElementById(`leg-edit-text-${id}`)?.focus(), 20);
}

function legCancelEdit() { editingPrincipleId = null; renderLegacy(); }

function legSavePrincipleEdit(id) {
  const text = document.getElementById(`leg-edit-text-${id}`)?.value.trim();
  if (!text) return;
  const context = document.getElementById(`leg-edit-ctx-${id}`)?.value.trim() || '';
  dbUpdatePrinciple(id, { text, context });
  editingPrincipleId = null;
  renderLegacy();
}

function legDeletePrinciple(id) {
  dbDeletePrinciple(id);
  renderLegacy();
}

/* ── LETTER ACTIONS ── */
function legStartLetter() {
  const overlay = document.createElement('div');
  overlay.id = 'leg-letter-overlay';
  overlay.className = 'leg-letter-overlay';
  overlay.innerHTML = `
    <div class="leg-letter-inner">
      <div class="leg-letter-editor-hdr">
        <div class="leg-letter-eyebrow">A letter</div>
        <button class="leg-overlay-close" onclick="legCloseLetterOverlay()">×</button>
      </div>
      <input class="leg-recipient-input" id="leg-recipient" type="text" placeholder="To…">
      <div class="leg-unlock-row">
        <span class="leg-unlock-label">Sealed until</span>
        <input class="leg-unlock-input" id="leg-unlock" type="date">
      </div>
      <div class="leg-letter-paper">
        <textarea class="leg-letter-textarea" id="leg-body" placeholder="Begin here…" rows="14"></textarea>
      </div>
      <button class="leg-save-btn-full" onclick="legSaveLetter()">Save letter</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  setTimeout(() => document.getElementById('leg-recipient')?.focus(), 100);
}

function legCloseLetterOverlay() {
  const overlay = document.getElementById('leg-letter-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 200);
}

function legSaveLetter() {
  const recipient = document.getElementById('leg-recipient')?.value.trim() || 'To myself';
  const unlockDate = document.getElementById('leg-unlock')?.value || null;
  const content = document.getElementById('leg-body')?.value || '';
  if (!content.trim()) return;
  dbAddLetter({id: Date.now(), recipient, date: new Date().toISOString(), unlockDate: unlockDate||null, content});
  legCloseLetterOverlay();
  setTimeout(() => renderLegacy(), 220);
}

function legViewLetter(id) {
  const letter = getLetters().find(l => l.id === id);
  if (!letter) return;
  const bodyHtml = letter.content.split('\n').map(line => `<p>${escHtml(line)||'&nbsp;'}</p>`).join('');
  const overlay = document.createElement('div');
  overlay.id = 'leg-view-overlay';
  overlay.className = 'leg-letter-overlay';
  overlay.innerHTML = `
    <div class="leg-letter-inner">
      <div class="leg-letter-editor-hdr">
        <div class="leg-letter-view-title">${escHtml(letter.recipient||'To myself')}</div>
        <button class="leg-overlay-close" onclick="legCloseViewOverlay()">×</button>
      </div>
      <div class="leg-view-meta">${fmtDate(letter.date)}</div>
      <div class="leg-letter-paper leg-letter-view-paper">
        <div class="leg-letter-view-body">${bodyHtml}</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function legCloseViewOverlay() {
  const overlay = document.getElementById('leg-view-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 200);
}

function legSealedTap(id) {
  tappedSealedIds.add(id);
  renderLegacy();
}

/* ── TAB SWITCH ── */
function legSetTab(tab) {
  legacyTab = tab;
  editingPrincipleId = null;
  addingPrinciple = false;
  renderLegacy();
}

/* ── EXPOSE ── */
window.legSetTab = legSetTab;
window.legSaveIdentity = legSaveIdentity;
window.legSaveAxioms = legSaveAxioms;
window.legSaveFilters = legSaveFilters;
window.legCycleGem = legCycleGem;
window.legDeleteAxiom = legDeleteAxiom;
window.legAddAxiom = legAddAxiom;
window.legDeleteFilter = legDeleteFilter;
window.legAddFilter = legAddFilter;
window.legSetOrder = legSetOrder;
window.legStartAdd = legStartAdd;
window.legCancelAdd = legCancelAdd;
window.legSaveNewPrinciple = legSaveNewPrinciple;
window.legEditPrinciple = legEditPrinciple;
window.legCancelEdit = legCancelEdit;
window.legSavePrincipleEdit = legSavePrincipleEdit;
window.legDeletePrinciple = legDeletePrinciple;
window.legStartLetter = legStartLetter;
window.legCloseLetterOverlay = legCloseLetterOverlay;
window.legSaveLetter = legSaveLetter;
window.legViewLetter = legViewLetter;
window.legCloseViewOverlay = legCloseViewOverlay;
window.legSealedTap = legSealedTap;
